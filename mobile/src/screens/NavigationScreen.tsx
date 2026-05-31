import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView, Modal, ActivityIndicator, Image } from 'react-native';
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
import type { RootStackParamList } from '../services/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

const ARRIVAL_RADIUS_M = 30;

export default function NavigationScreen({ route, navigation }: Props) {
  const { routeId } = route.params;
  const driverId = useAuthStore((s) => s.user?.driver_id);
  const [data, setData] = useState<OfflineRoute | null>(null);
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [distanceMi, setDistanceMi] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Phase 6 Mobile Overlays state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  
  // Proof of Service State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  // Launches photo capturing modal before finalizing stop completion
  function onTriggerMarkComplete(stop: RouteStop) {
    setCapturedPhotoUrl(null);
    setProofModalOpen(true);
  }

  // Simulates extreme high-performance local image compression down to <200KB
  const simulatePhotoCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      setIsCompressing(true);
      setCompressionProgress(10);
      
      const interval = setInterval(() => {
        setCompressionProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsCompressing(false);
            // Captured photo mockup - clean cleared snow driveway
            setCapturedPhotoUrl('https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=350');
            setIsUploading(true);
            setTimeout(() => {
              setIsUploading(false);
            }, 1000);
            return 100;
          }
          return prev + 15;
        });
      }, 150);
    }, 1200);
  };

  async function onMarkComplete(stop: RouteStop) {
    if (!data) return;
    setProofModalOpen(false);
    
    const notes = capturedPhotoUrl 
      ? `Proof of service uploaded: mock_s3_compressed_146kb.jpg` 
      : 'Stop cleared';
      
    await markStopStatus(data.route_id, stop.stop_id, 'completed', notes);
    const next = applyStopStatus(data, stop.stop_id, 'completed');
    setData(next);
    setCurrentStop(nextPending(next.stops));
    Alert.alert('Cleared! ✅', 'Driveway cleared successfully. Homeowner has been alerted via SMS.', [{ text: 'OK' }]);
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

  // External Navigation Launcher Selector
  const launchExternalNav = (service: 'apple' | 'google' | 'waze') => {
    if (!currentStop) return;
    const { lat, lon } = currentStop;
    
    let url = '';
    if (service === 'apple') {
      url = `maps://?q=${lat},${lon}`;
    } else if (service === 'google') {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    } else if (service === 'waze') {
      url = `waze://?ll=${lat},${lon}&navigate=yes`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Navigation Error', `The selected map launcher is not installed on this device.`, [{ text: 'OK' }]);
        }
      })
      .catch((err) => captureException(err, { context: 'nav_launch_failed' }));
  };

  // Simulated Speech-to-Text Glove Trigger Commands
  const simulateVoiceCommand = (command: 'complete' | 'skip') => {
    setIsVoiceActive(true);
    setVoiceTranscript('Listening...');
    
    setTimeout(() => {
      if (command === 'complete') {
        setVoiceTranscript('"PlowPath, Mark Complete"');
        setTimeout(() => {
          setIsVoiceActive(false);
          onTriggerMarkComplete(currentStop!);
        }, 1000);
      } else {
        setVoiceTranscript('"PlowPath, Skip Property"');
        setTimeout(() => {
          setIsVoiceActive(false);
          onSkipPropertyConfirm(currentStop!);
        }, 1000);
      }
    }, 1500);
  };

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
  const isSubcontracted = (currentStop as any).is_subcontracted || (currentStop as any).partner_company_name;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <OfflineStatusBar />
      
      <TurnInstruction
        instruction={`Drive to ${currentStop.name}`}
        secondary={currentStop.address}
        distanceMi={distanceMi}
      />

      <RouteProgress total={data.stops.length} currentIndex={stepIndex} />

      {/* Subcontracted Enterprise Rival Badge indicator */}
      {isSubcontracted && (
        <View style={styles.subcontractBadge}>
          <Text style={styles.subcontractText}>
            🤝 Enterprise Partner Job: {(currentStop as any).partner_company_name || 'B2B Shared Stop'}
          </Text>
        </View>
      )}

      <Text style={styles.stopInfo}>
        Stop {stepIndex + 1} / {data.stops.length} · Completed {completed}
      </Text>
      {currentStop.access_notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesHeader}>Access Notes:</Text>
          <Text style={styles.notes}>{currentStop.access_notes}</Text>
        </View>
      ) : null}

      {/* External Map Selectors HUD */}
      <View style={styles.navRow}>
        <Text style={styles.hudLabel}>Launch HUD Navigation:</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.navBtn} onPress={() => launchExternalNav('google')}>
            <Text style={styles.navBtnText}>Google Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => launchExternalNav('apple')}>
            <Text style={styles.navBtnText}>Apple Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => launchExternalNav('waze')}>
            <Text style={styles.navBtnText}>Waze Launcher</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Glove-friendly oversized buttons console */}
      <View style={styles.buttonRow}>
        {currentStop.status === 'pending' ? (
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn]}
            onPress={() => onMarkInProgress(currentStop)}
          >
            <Text style={styles.btnText}>🚜 Mark In Progress</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.successBtn]}
            onPress={() => onTriggerMarkComplete(currentStop)}
          >
            <Text style={styles.btnText}>✅ Clear Stop (Mark Complete)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.btn, styles.skipBtn]} onPress={() => onSkipPropertyConfirm(currentStop)}>
          <Text style={[styles.btnText, { color: '#ffffff' }]}>❌ Skip Property</Text>
        </TouchableOpacity>

        {/* Hands-Free Voice Glove simulator Trigger panel */}
        <TouchableOpacity style={[styles.btn, styles.voiceTriggerBtn]} onPress={() => simulateVoiceCommand('complete')}>
          <Text style={styles.btnText}>🎙️ Glove Voice Simulation Control</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.stopRouteBtn]} onPress={onStopRouteConfirm}>
          <Text style={styles.btnText}>⚠️ Emergency Finalize Route</Text>
        </TouchableOpacity>
      </View>

      {/* Simulated voice HUD modal overlay */}
      {isVoiceActive && (
        <Modal transparent animationType="fade" visible={isVoiceActive}>
          <View style={styles.voiceOverlay}>
            <View style={styles.voiceCard}>
              <Text style={styles.voiceTitle}>🎙️ Voice Command Listening...</Text>
              <Text style={styles.voiceSub}>"PlowPath, Mark Complete" or "PlowPath, Skip Property"</Text>
              <ActivityIndicator size="large" color="#38b0f8" style={{ marginVertical: 15 }} />
              <Text style={styles.voiceTranscript}>{voiceTranscript}</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Proof of Service completion modal with local high-performance compression progress bar */}
      <Modal transparent animationType="slide" visible={proofModalOpen} onRequestClose={() => setProofModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Liability Protection Proof of Service</Text>
            <Text style={styles.modalSub}>
              Take a photo of the completed driveway. Photos are automatically compressed locally under 200KB before secure escrow upload.
            </Text>

            {capturedPhotoUrl ? (
              <View style={styles.photoPreviewBox}>
                <Image source={{ uri: capturedPhotoUrl }} style={styles.photoPreview as any} />
                <Text style={styles.compressionStat}>
                  ⚡ Compressed successfully: <Text style={{ color: '#10b981', fontWeight: '900' }}>146 KB</Text> (Optimized)
                </Text>
              </View>
            ) : (
              <View style={styles.cameraTriggerBox}>
                {isCapturing ? (
                  <View style={styles.cameraSim}>
                    <Text style={styles.cameraText}>Opening high-contrast camera shroud...</Text>
                    <ActivityIndicator size="small" color="white" />
                  </View>
                ) : isCompressing ? (
                  <View style={styles.cameraSim}>
                    <Text style={styles.cameraText}>Compressing Image File ({compressionProgress}%)</Text>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${compressionProgress}%` }]} />
                    </View>
                  </View>
                ) : isUploading ? (
                  <View style={styles.cameraSim}>
                    <Text style={styles.cameraText}>Securing Stripe Connect Escrow release...</Text>
                    <ActivityIndicator size="small" color="#38b0f8" />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.cameraBtn} onPress={simulatePhotoCapture}>
                    <Text style={styles.cameraBtnText}>📸 Snap Clearing Proof Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setProofModalOpen(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalBtn, !capturedPhotoUrl && styles.disabledModalBtn]}
                onPress={() => onMarkComplete(currentStop)}
                disabled={!capturedPhotoUrl}
              >
                <Text style={styles.confirmModalText}>Clear Stop & Release Escrow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  container: { flexGrow: 1, padding: 20, backgroundColor: '#0f172a' },
  muted: { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 18, fontWeight: '800' },
  error: { color: '#DC3545', textAlign: 'center', marginTop: 40, fontSize: 18, fontWeight: '800' },
  stopInfo: { fontSize: 14, color: '#94a3b8', marginTop: 12, fontWeight: '800' },
  notesBox: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  notesHeader: { fontSize: 11, fontWeight: '900', color: '#38b0f8', textTransform: 'uppercase' as any },
  notes: { fontSize: 13, color: '#f1f5f9', marginTop: 4, fontStyle: 'italic', fontWeight: '500' },
  subcontractBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  subcontractText: { fontSize: 12, fontWeight: '800', color: '#818cf8' },
  navRow: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginTop: 16,
  },
  hudLabel: { fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as any, marginBottom: 8 },
  navButtons: { flexDirection: 'row', gap: 8 },
  navBtn: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },
  buttonRow: { marginTop: 24, gap: 12 },
  btn: { minHeight: 68, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#f97316' }, // orange in progress
  successBtn: { backgroundColor: '#10b981' }, // green complete
  skipBtn: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#475569' },
  voiceTriggerBtn: { backgroundColor: 'rgba(56, 176, 248, 0.12)', borderWidth: 1.5, borderColor: '#38b0f8' },
  stopRouteBtn: { backgroundColor: '#ef4444' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '900' },
  
  // Voice HUD overlay
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  voiceCard: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  voiceTitle: { fontSize: 15, fontWeight: '900', color: 'white', marginBottom: 4 },
  voiceSub: { fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 14 },
  voiceTranscript: { fontSize: 16, fontWeight: '900', color: '#10b981', fontStyle: 'italic' },
  
  // Proof of Service Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    borderBottomWidth: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: 'white', marginBottom: 6 },
  modalSub: { fontSize: 11, color: '#94a3b8', lineHeight: 16, marginBottom: 20 },
  cameraTriggerBox: {
    minHeight: 180,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#38b0f8',
    borderRadius: 12,
  },
  cameraBtnText: { color: 'white', fontSize: 14, fontWeight: '900' },
  cameraSim: { alignItems: 'center', gap: 10 },
  cameraText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  progressBarBg: { width: 200, height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  progressBarFill: { height: '100%', backgroundColor: '#38b0f8' },
  photoPreviewBox: {
    alignItems: 'center',
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  compressionStat: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelModalBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: { color: '#94a3b8', fontSize: 14, fontWeight: '800' },
  confirmModalBtn: {
    flex: 2,
    minHeight: 52,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledModalBtn: { opacity: 0.4 },
  confirmModalText: { color: 'white', fontSize: 14, fontWeight: '900' },
});
