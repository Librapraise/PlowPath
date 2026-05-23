import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as turf from '@turf/turf';
import { useAuthStore } from '../store/authStore';
import {
  downloadRoute, loadRouteOffline, markStopStatus, type OfflineRoute, type RouteStop,
} from '../services/route.service';
import { requestLocationPermission, type GpsSample } from '../services/gps.service';
import {
  configureBackgroundGps, startBackgroundGps, stopBackgroundGps,
} from '../services/backgroundGps.service';
import { flushAllQueues, subscribeToConnectivity } from '../services/offline.service';
import RouteProgress from '../components/RouteProgress';
import OfflineStatusBar from '../components/OfflineStatusBar';
import TurnInstruction from '../components/TurnInstruction';
import { captureException } from '../services/sentry';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

const ARRIVAL_RADIUS_M = 30;

export default function NavigationScreen({ route, navigation }: Props) {
  const { routeId } = route.params;
  const driverId = useAuthStore((s) => s.user?.driver_id);
  const [data, setData] = useState<OfflineRoute | null>(null);
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [distanceMi, setDistanceMi] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load route: prefer server (download); fall back to cached offline copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await downloadRoute(routeId);
        if (!cancelled) {
          setData(fresh);
          setCurrentStop(nextPending(fresh.stops));
        }
      } catch (err) {
        const cached = await loadRouteOffline(routeId);
        if (!cancelled && cached) {
          setData(cached);
          setCurrentStop(nextPending(cached.stops));
        } else if (!cancelled) {
          setError('Route unavailable offline. Connect to download it once.');
          captureException(err, { context: 'route_loading_failed', routeId });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [routeId]);

  // Background GPS — keeps streaming with screen off / app backgrounded.
  // Permission grant + sample enqueue + offline flush are owned by the service.
  useEffect(() => {
    if (!driverId || !currentStop) return;

    let active = true;
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        setError('Location permission denied. Navigation needs GPS.');
        return;
      }
      try {
        await configureBackgroundGps({
          driverId,
          routeId,
          onSample: (sample) => {
            if (active) onGpsSample(sample);
          },
        });
        await startBackgroundGps();
      } catch (err) {
        setError((err as Error).message);
        captureException(err, { context: 'background_gps_start_failed', routeId });
      }
    })();

    const unsubscribe = subscribeToConnectivity(() => {
      console.log('[NAVIGATION SCREEN] Reconnected! Flushing all offline-queued events...');
      void flushAllQueues(driverId);
    });

    return () => {
      active = false;
      void stopBackgroundGps();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, currentStop?.stop_id]);

  function onGpsSample(sample: GpsSample) {
    if (!currentStop) return;
    const meters = turf.distance(
      turf.point([sample.lon, sample.lat]),
      turf.point([currentStop.lon, currentStop.lat]),
      { units: 'meters' },
    );
    setDistanceMi(meters / 1609.34);
    if (meters <= ARRIVAL_RADIUS_M && currentStop.status === 'pending') {
      // Auto-mark in progress on arrival. Driver explicitly taps Mark Complete.
      void onMarkInProgress(currentStop);
    }
  }

  async function onMarkInProgress(stop: RouteStop) {
    if (!data) return;
    await markStopStatus(data.route_id, stop.stop_id, 'in_progress');
    setData(applyStopStatus(data, stop.stop_id, 'in_progress'));
    setCurrentStop({ ...stop, status: 'in_progress' });
  }

  async function onMarkComplete(stop: RouteStop) {
    if (!data) return;
    await markStopStatus(data.route_id, stop.stop_id, 'completed');
    const next = applyStopStatus(data, stop.stop_id, 'completed');
    setData(next);
    setCurrentStop(nextPending(next.stops));
  }

  function onSkipPropertyConfirm(stop: RouteStop) {
    Alert.alert('Skip Property', `Are you sure you want to skip ${stop.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Skip', style: 'destructive',
        onPress: async () => {
          if (!data) return;
          await markStopStatus(data.route_id, stop.stop_id, 'skipped');
          const next = applyStopStatus(data, stop.stop_id, 'skipped');
          setData(next);
          setCurrentStop(nextPending(next.stops));
        },
      },
    ]);
  }

  function onStopRouteConfirm() {
    Alert.alert('STOP Route', 'Are you sure you want to STOP this route? All remaining and in-progress properties will be marked as skipped, and this route will be finalized.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, STOP Route', style: 'destructive',
        onPress: async () => {
          if (!data) return;
          const stopsToSkip = data.stops.filter((s) => s.status === 'pending' || s.status === 'in_progress');
          for (const stop of stopsToSkip) {
            await markStopStatus(data.route_id, stop.stop_id, 'skipped');
          }
          const { markRouteCompleted } = require('../services/route.service');
          await markRouteCompleted(data.route_id, 'completed');
          navigation.pop();
        },
      },
    ]);
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!data || !currentStop) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>{data ? 'Route complete.' : 'Loading…'}</Text>
      </View>
    );
  }

  const stepIndex = data.stops.findIndex((s) => s.stop_id === currentStop.stop_id);
  const completed = data.stops.filter((s) => s.status === 'completed').length;

  return (
    <View style={styles.container}>
      <OfflineStatusBar />
      <TurnInstruction
        instruction={`Drive to ${currentStop.name}`}
        secondary={currentStop.address}
        distanceMi={distanceMi}
      />

      <RouteProgress total={data.stops.length} currentIndex={stepIndex} />

      <Text style={styles.stopInfo}>
        Stop {stepIndex + 1} / {data.stops.length} · Completed {completed}
      </Text>
      {currentStop.access_notes ? (
        <Text style={styles.notes}>Access: {currentStop.access_notes}</Text>
      ) : null}

      <View style={styles.buttonRow}>
        {currentStop.status === 'pending' ? (
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn]}
            onPress={() => onMarkInProgress(currentStop)}
          >
            <Text style={styles.btnText}>Mark In Progress</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.successBtn]}
            onPress={() => onMarkComplete(currentStop)}
          >
            <Text style={styles.btnText}>Mark Complete</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.btn, styles.skipBtn]} onPress={() => onSkipPropertyConfirm(currentStop)}>
          <Text style={[styles.btnText, { color: '#333' }]}>Skip Property</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.stopRouteBtn]} onPress={onStopRouteConfirm}>
          <Text style={styles.btnText}>STOP Route</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function nextPending(stops: RouteStop[]): RouteStop | null {
  return stops.find((s) => s.status === 'pending' || s.status === 'in_progress') ?? null;
}

function applyStopStatus(route: OfflineRoute, stopId: string, status: RouteStop['status']): OfflineRoute {
  return {
    ...route,
    stops: route.stops.map((s) => (s.stop_id === stopId ? { ...s, status } : s)),
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  muted: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 18 },
  error: { color: '#DC3545', textAlign: 'center', marginTop: 40, fontSize: 18 },
  stopInfo: { fontSize: 16, color: '#555', marginTop: 16 },
  notes: { fontSize: 16, color: '#333', marginTop: 8, fontStyle: 'italic' },
  buttonRow: { marginTop: 'auto', gap: 12 },
  btn: { minHeight: 70, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#2E75B6' },
  successBtn: { backgroundColor: '#28A745' },
  skipBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  stopRouteBtn: { backgroundColor: '#DC3545' },
  btnText: { color: 'white', fontSize: 20, fontWeight: '700' },
});
