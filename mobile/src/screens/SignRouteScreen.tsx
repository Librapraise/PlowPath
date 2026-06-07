import AppText from '../components/AppText';
import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSettingsStore } from '../store/settingsStore';
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
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

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
      await fetchSignRoute();
    } catch (err) {
      setError('Failed to update sign status. Try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const styles = isDark ? darkStyles : lightStyles;

  return (
    <View style={styles.container}>
      <OfflineStatusBar />

      <AppText style={styles.header}>Sign Crew</AppText>

      {/* Header Controls */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, action === 'install' && styles.activeTab]}
          onPress={() => setAction('install')}
        >
          <AppText style={[styles.tabText, action === 'install' && styles.activeTabText]}>
            Install Signs
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, action === 'remove' && styles.activeTab]}
          onPress={() => setAction('remove')}
        >
          <AppText style={[styles.tabText, action === 'remove' && styles.activeTabText]}>
            Remove Signs
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Route Info Dashboard */}
      {routeData && (
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <AppText style={styles.statLabel}>STOPS TO GO</AppText>
              <AppText style={styles.statVal}>{routeData.stops.length}</AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <AppText style={styles.statLabel}>DISTANCE</AppText>
              <AppText style={styles.statVal}>{routeData.total_miles} mi</AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <AppText style={styles.statLabel}>PROGRESS</AppText>
              <AppText style={styles.statVal}>{routeData.progress}%</AppText>
            </View>
          </View>
        </View>
      )}

      {error && <AppText style={styles.errorText}>{error}</AppText>}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={isDark ? '#38BDF8' : '#2E75B6'} />
          <AppText style={styles.loadingText}>Calculating optimized TSP route...</AppText>
        </View>
      ) : (
        <FlatList
          data={routeData?.stops ?? []}
          keyExtractor={(s) => s.customer_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <AppText style={styles.emptyText}>
              All properties are completed for this off-season sign operation!
            </AppText>
          }
          renderItem={({ item }) => (
            <View style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.seqBadge}>
                  <AppText style={styles.seqText}>{item.sequence_number}</AppText>
                </View>
                <View style={styles.metaCol}>
                  <AppText style={styles.stopName}>{item.name}</AppText>
                  <AppText style={styles.stopAddr}>{item.address}</AppText>
                </View>
              </View>

              <View style={styles.actionRow}>
                <AppText style={styles.statusLabel}>
                  Status:{' '}
                  <AppText
                    style={[
                      styles.statusVal,
                      {
                        color:
                          item.sign_status === 'installed'
                            ? '#10B981'
                            : item.sign_status === 'needs_service'
                            ? '#F59E0B'
                            : isDark
                            ? '#94A3B8'
                            : '#64748B',
                      },
                    ]}
                  >
                    {item.sign_status.replace('_', ' ').toUpperCase()}
                  </AppText>
                </AppText>

                {action === 'install' ? (
                  <TouchableOpacity
                    disabled={updatingId === item.customer_id}
                    style={[styles.btn, styles.installBtn]}
                    onPress={() => handleUpdateStatus(item.customer_id, 'installed')}
                  >
                    {updatingId === item.customer_id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <AppText style={styles.btnText}>Mark Installed</AppText>
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
                      <AppText style={styles.btnText}>Mark Removed</AppText>
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

const baseStyles = {
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    fontSize: 26,
    fontWeight: '900',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
    height: 56, // glove-friendly height
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    height: 46, // inner segment height
    justifyContent: 'center',
  },
  activeTab: {},
  tabText: { fontSize: 14, fontWeight: '800' },
  activeTabText: { color: 'white' },
  statsCard: {
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  statVal: { fontSize: 16, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  divider: { width: 1.5, height: 32 },
  errorText: { color: '#EF4444', marginBottom: 12, textAlign: 'center', fontWeight: '700' },
  emptyText: { marginTop: 32, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  stopCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  stopHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  seqBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: { fontWeight: '900', fontSize: 13 },
  metaCol: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: '800' },
  stopAddr: { fontSize: 13, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  statusVal: { fontWeight: '900' },
  btn: {
    paddingHorizontal: 16,
    height: 46, // glove-friendly actions in cards
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installBtn: { backgroundColor: '#10B981' },
  removeBtn: { backgroundColor: '#3B82F6' },
  btnText: { color: 'white', fontSize: 13, fontWeight: '900' },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  header: { ...baseStyles.header, color: '#0F172A' },
  loadingText: { ...baseStyles.loadingText, color: '#475569' },
  tabContainer: {
    ...baseStyles.tabContainer,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  activeTab: {
    ...baseStyles.activeTab,
    backgroundColor: '#FFFFFF',
  },
  tabText: { ...baseStyles.tabText, color: '#475569' },
  activeTabText: { color: '#2E75B6' },
  statsCard: {
    ...baseStyles.statsCard,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
  },
  statLabel: { ...baseStyles.statLabel, color: '#64748B' },
  statVal: { ...baseStyles.statVal, color: '#0F172A' },
  divider: { ...baseStyles.divider, backgroundColor: '#E2E8F0' },
  emptyText: { ...baseStyles.emptyText, color: '#64748B' },
  stopCard: {
    ...baseStyles.stopCard,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
  },
  seqBadge: {
    ...baseStyles.seqBadge,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  seqText: { ...baseStyles.seqText, color: '#475569' },
  stopName: { ...baseStyles.stopName, color: '#0F172A' },
  stopAddr: { ...baseStyles.stopAddr, color: '#64748B' },
  actionRow: { ...baseStyles.actionRow, borderTopColor: '#F1F5F9' },
  statusLabel: { ...baseStyles.statusLabel, color: '#64748B' },
  statusVal: { ...baseStyles.statusVal, color: '#0F172A' },
  removeBtn: { backgroundColor: '#475569' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
  header: { ...baseStyles.header, color: '#FFFFFF' },
  loadingText: { ...baseStyles.loadingText, color: '#94A3B8' },
  tabContainer: {
    ...baseStyles.tabContainer,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  activeTab: {
    ...baseStyles.activeTab,
    backgroundColor: '#0B0F19',
  },
  tabText: { ...baseStyles.tabText, color: '#94A3B8' },
  activeTabText: { color: '#38BDF8' },
  statsCard: {
    ...baseStyles.statsCard,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.15,
  },
  statLabel: { ...baseStyles.statLabel, color: '#94A3B8' },
  statVal: { ...baseStyles.statVal, color: '#FFFFFF' },
  divider: { ...baseStyles.divider, backgroundColor: '#334155' },
  emptyText: { ...baseStyles.emptyText, color: '#94A3B8' },
  stopCard: {
    ...baseStyles.stopCard,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.15,
  },
  seqBadge: {
    ...baseStyles.seqBadge,
    backgroundColor: '#0B0F19',
    borderColor: '#334155',
  },
  seqText: { ...baseStyles.seqText, color: '#38BDF8' },
  stopName: { ...baseStyles.stopName, color: '#FFFFFF' },
  stopAddr: { ...baseStyles.stopAddr, color: '#94A3B8' },
  actionRow: { ...baseStyles.actionRow, borderTopColor: '#334155' },
  statusLabel: { ...baseStyles.statusLabel, color: '#94A3B8' },
  statusVal: { ...baseStyles.statusVal, color: '#FFFFFF' },
  removeBtn: { backgroundColor: '#475569' },
} as any);
