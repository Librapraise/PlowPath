import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import OfflineStatusBar from '../components/OfflineStatusBar';

interface SignStop {
  sequence_number: number;
  customer_id: string;
  name: string;
  address: string;
  sign_status: 'installed' | 'removed' | 'needs_service';
  lat: number;
  lon: number;
}

interface SignRouteResponse {
  action: 'install' | 'remove';
  progress: number;
  total_miles: number;
  stops: SignStop[];
}

export default function SignRouteScreen() {
  const [action, setAction] = useState<'install' | 'remove'>('install');
  const [routeData, setRouteData] = useState<SignRouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchSignRoute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SignRouteResponse>('/signs/route', {
        params: { action },
      });
      setRouteData(data);
    } catch (err) {
      setError('Could not load sign crew route. Working offline?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignRoute();
  }, [action]);

  const handleUpdateStatus = async (customerId: string, targetStatus: 'installed' | 'removed') => {
    setUpdatingId(customerId);
    try {
      await api.put(`/signs/customers/${customerId}/sign`, {
        sign_status: targetStatus,
      });
      // Refresh local list
      await fetchSignRoute();
    } catch (err) {
      setError('Failed to update sign status. Try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <OfflineStatusBar />

      {/* Header Controls */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, action === 'install' && styles.activeTab]}
          onPress={() => setAction('install')}
        >
          <Text style={[styles.tabText, action === 'install' && styles.activeTabText]}>
            Install Signs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, action === 'remove' && styles.activeTab]}
          onPress={() => setAction('remove')}
        >
          <Text style={[styles.tabText, action === 'remove' && styles.activeTabText]}>
            Remove Signs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Route Info Dashboard */}
      {routeData && (
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>STOPS TO GO</Text>
              <Text style={styles.statVal}>{routeData.stops.length}</Text>
            </View>
            <View style={styles.divider} />
            <View>
              <Text style={styles.statLabel}>TOTAL DISTANCE</Text>
              <Text style={styles.statVal}>{routeData.total_miles} mi</Text>
            </View>
            <View style={styles.divider} />
            <View>
              <Text style={styles.statLabel}>PROGRESS</Text>
              <Text style={styles.statVal}>{routeData.progress}%</Text>
            </View>
          </View>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Calculating optimized TSP route...</Text>
        </View>
      ) : (
        <FlatList
          data={routeData?.stops ?? []}
          keyExtractor={(s) => s.customer_id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              All properties are completed for this off-season sign operation!
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.seqBadge}>
                  <Text style={styles.seqText}>{item.sequence_number}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.stopName}>{item.name}</Text>
                  <Text style={styles.stopAddr}>{item.address}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Text style={styles.statusLabel}>
                  Current Status: <Text style={styles.statusVal}>{item.sign_status}</Text>
                </Text>

                {action === 'install' ? (
                  <TouchableOpacity
                    disabled={updatingId === item.customer_id}
                    style={[styles.btn, styles.installBtn]}
                    onPress={() => handleUpdateStatus(item.customer_id, 'installed')}
                  >
                    {updatingId === item.customer_id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.btnText}>Mark Installed</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    disabled={updatingId === item.customer_id}
                    style={[styles.btn, styles.removeBtn]}
                    onPress={() => handleUpdateStatus(item.customer_id, 'removed')}
                  >
                    {updatingId === item.customer_id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.btnText}>Mark Removed</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f6f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#555', marginTop: 12, fontSize: 14, fontWeight: '600' },
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8,
    padding: 4, marginBottom: 16,
  },
  tabButton: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6,
    height: 44, justifyContent: 'center',
  },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#4f46e5' },
  statsCard: {
    backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  statVal: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginTop: 2, textAlign: 'center' },
  divider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },
  errorText: { color: '#ef4444', marginBottom: 12, textAlign: 'center', fontWeight: '600' },
  emptyText: { color: '#64748b', marginTop: 32, textAlign: 'center', fontSize: 14, fontWeight: '500' },
  stopCard: {
    backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  stopHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  seqBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#e0e7ff',
    alignItems: 'center', justifyContent: 'center',
  },
  seqText: { color: '#4f46e5', fontWeight: '900', fontSize: 12 },
  metaCol: { flex: 1 },
  stopName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  stopAddr: { fontSize: 12, color: '#64748b', marginTop: 2 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, paddingTop: 12,
  },
  statusLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statusVal: { color: '#1e293b', fontWeight: '800' },
  btn: {
    paddingHorizontal: 16, height: 36, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  installBtn: { backgroundColor: '#10b981' },
  removeBtn: { backgroundColor: '#64748b' },
  btnText: { color: 'white', fontSize: 12, fontWeight: '800' },
});
