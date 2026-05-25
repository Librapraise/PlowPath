import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../services/navigation';
import OfflineStatusBar from '../components/OfflineStatusBar';
import { subscribeToConnectivity, flushAllQueues } from '../services/offline.service';

interface RouteSummary {
  route_id: string;
  route_name: string;
  status: 'assigned' | 'in_progress' | 'completed';
  total_distance: number;
  stop_count: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;

export default function RouteScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.driver_id) return;
    api
      .get<{ data: RouteSummary[] }>('/routes', { params: { driver_id: user.driver_id } })
      .then(({ data }) => setRoutes(data.data))
      .catch(() => setError('Could not load routes. Working offline?'));
  }, [user?.driver_id]);

  // Set up automatic reconnect queue flushing loop
  useEffect(() => {
    if (!user?.driver_id) return;

    // Trigger an immediate flush in case there's leftover queue from before
    void flushAllQueues(user.driver_id);

    const unsubscribe = subscribeToConnectivity(() => {
      if (user?.driver_id) {
        console.log('[ROUTE SCREEN] Reconnected! Flushing all offline-queued events...');
        void flushAllQueues(user.driver_id);
      }
    });

    return unsubscribe;
  }, [user?.driver_id]);

  if (!user?.driver_id) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>You are not assigned as a driver.</Text>
        <TouchableOpacity onPress={logout} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineStatusBar />
      <Text style={styles.heading}>{user.name}'s Route</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={routes ?? []}
        keyExtractor={(r) => r.route_id}
        ListEmptyComponent={
          <Text style={styles.muted}>{routes === null ? 'Loading…' : 'No routes assigned yet.'}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.route_name}</Text>
            <Text style={styles.cardMeta}>
              {item.stop_count} stops · {item.total_distance?.toFixed?.(1) ?? '?'} mi · {item.status}
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Navigation', { routeId: item.route_id })}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Start Route</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.signBtn}
        onPress={() => navigation.navigate('SignRoute')}
        accessibilityRole="button"
      >
        <Text style={styles.signText}>Sign Crew Operations</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>End Shift</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f6f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'white' },
  heading: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 16 },
  error: { color: '#DC3545', marginBottom: 12 },
  muted: { color: '#666', marginTop: 24, textAlign: 'center' },
  card: {
    backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  cardMeta: { color: '#555', marginTop: 4, marginBottom: 12 },
  primaryBtn: {
    minHeight: 60, backgroundColor: '#2E75B6', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { color: 'white', fontSize: 18, fontWeight: '600' },
  signBtn: {
    minHeight: 60, backgroundColor: '#6366F1', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  signText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    minHeight: 60, borderWidth: 1, borderColor: '#ccc', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  secondaryText: { color: '#333', fontSize: 16 },
});
