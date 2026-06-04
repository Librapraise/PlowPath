import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
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

type Props = {
  navigation: any;
};

export default function RouteScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let active = true;
    const runPulse = () => {
      if (!active) return;
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (active) runPulse();
      });
    };
    runPulse();
    return () => {
      active = false;
    };
  }, [pulseAnim]);

  const fetchRoutes = () => {
    if (!user?.driver_id) return;
    setLoading(true);
    api
      .get<{ data: RouteSummary[] }>('/routes', { params: { driver_id: user.driver_id } })
      .then(({ data }) => {
        setRoutes(data.data);
        setError(null);
      })
      .catch(() => setError('Could not load routes. Working offline?'))
      .finally(() => setLoading(false));
  };

  // Re-fetch every time this screen gains focus so statuses stay current
  // after a driver completes or starts a route and navigates back.
  useFocusEffect(
    useCallback(() => {
      fetchRoutes();
    }, [user?.driver_id])
  );

  const handleEndShift = async () => {
    try {
      await api.post('/shifts/end');
    } catch (err) {
      console.warn('[ROUTE SCREEN] Failed to end shift:', err);
    } finally {
      logout();
    }
  };

  useEffect(() => {
    if (!user?.driver_id) return;

    void flushAllQueues(user.driver_id);

    // Auto-ensure active shift exists on the backend
    api.get('/shifts/active')
      .then(({ data }) => {
        if (!data) {
          console.log('[ROUTE SCREEN] No active shift found, starting a new shift...');
          return api.post('/shifts/start');
        }
      })
      .catch((err) => {
        console.warn('[ROUTE SCREEN] Failed to check/start shift:', err);
      });

    const unsubscribe = subscribeToConnectivity(() => {
      if (user?.driver_id) {
        console.log('[ROUTE SCREEN] Reconnected! Flushing all offline-queued events...');
        void flushAllQueues(user.driver_id);
        fetchRoutes();
      }
    });

    return unsubscribe;
  }, [user?.driver_id]);

  const styles = isDark ? darkStyles : lightStyles;

  if (!user?.driver_id) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <Text style={[styles.heading, { color: isDark ? '#FFF' : '#0F172A' }]}>You are not assigned as a driver.</Text>
        <TouchableOpacity onPress={handleEndShift} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderRouteItem = ({ item }: { item: RouteSummary }) => {
    const isCompleted = item.status === 'completed';
    const isInProgress = item.status === 'in_progress';

    let statusColor = isDark ? '#64748B' : '#94A3B8';
    let statusBg = isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(148, 163, 184, 0.15)';
    if (isCompleted) {
      statusColor = '#10B981';
      statusBg = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)';
    } else if (isInProgress) {
      statusColor = '#F97316';
      statusBg = isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)';
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.route_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{item.stop_count}</Text>
            <Text style={styles.statLabel}>STOPS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{item.total_distance?.toFixed?.(1) ?? '0.0'}</Text>
            <Text style={styles.statLabel}>MILES</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isCompleted && styles.completedBtn]}
          onPress={() => navigation.navigate('Navigation', { routeId: item.route_id })}
          disabled={isCompleted}
          accessibilityRole="button"
        >
          <Text style={[styles.primaryText, isCompleted && styles.completedText]}>
            {isCompleted ? 'Route Completed' : isInProgress ? 'Resume Route' : 'Start Route'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <OfflineStatusBar />

      {/* Branded Profile Header Area */}
      <View style={styles.headerArea}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.driverName}>{user.name}</Text>
        </View>
        <View style={styles.activeIndicatorBox}>
          <Animated.View style={[styles.greenPulseDot, { opacity: pulseAnim }]} />
          <Text style={styles.activeText}>Active Shift</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && !routes ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={isDark ? '#38BDF8' : '#2E75B6'} />
        </View>
      ) : (
        <FlatList
          data={routes ?? []}
          keyExtractor={(r) => r.route_id}
          contentContainerStyle={styles.listContainer}
          onRefresh={fetchRoutes}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={2}>
                <Path d="M9 20L3 17V4L9 7M9 20L15 17M9 20V7M15 17L21 20V7L15 4M15 17V4M9 7L15 4" />
              </Svg>
              <Text style={styles.muted}>No routes assigned to you today.</Text>
            </View>
          }
          renderItem={renderRouteItem}
        />
      )}

      {/* Elegant Shift Handover Entry */}
      <View style={styles.handoverPanel}>
        <View style={styles.handoverInfo}>
          <Text style={styles.handoverTitle}>Shift Handover Console</Text>
          <Text style={styles.handoverDesc}>Transition route control to another crew driver</Text>
        </View>
        <TouchableOpacity
          style={styles.handoverBtn}
          onPress={() => navigation.navigate('ShiftSwap')}
          accessibilityRole="button"
        >
          <Text style={styles.handoverBtnText}>Open</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleEndShift} style={styles.secondaryBtn} accessibilityRole="button">
        <Text style={styles.secondaryText}>End Shift</Text>
      </TouchableOpacity>
    </View>
  );
}

const baseStyles = {
  container: { flex: 1 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  error: { color: '#F43F5E', textAlign: 'center', marginVertical: 12, fontWeight: '700' },
  muted: { fontSize: 16, marginTop: 12, textAlign: 'center' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  headerArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  welcomeText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  driverName: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  activeIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, color: '#10B981' },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 20, fontWeight: '900', flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  statDivider: { width: 1, height: 28 },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  primaryText: { color: 'white', fontSize: 17, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  handoverPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  handoverInfo: { flex: 1, marginRight: 12 },
  handoverTitle: { fontSize: 15, fontWeight: '800' },
  handoverDesc: { fontSize: 12, marginTop: 2 },
  handoverBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoverBtnText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  secondaryBtn: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  secondaryText: { fontSize: 16, fontWeight: '700' },
};
const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  welcomeText: { ...baseStyles.welcomeText, color: '#64748B' },
  driverName: { ...baseStyles.driverName, color: '#0F172A' },
  activeIndicatorBox: { ...baseStyles.activeIndicatorBox, backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  muted: { ...baseStyles.muted, color: '#64748B' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { ...baseStyles.cardTitle, color: '#0F172A' },
  statValue: { ...baseStyles.statValue, color: '#0F172A' },
  statLabel: { ...baseStyles.statLabel, color: '#64748B' },
  statDivider: { ...baseStyles.statDivider, backgroundColor: '#E2E8F0' },
  primaryBtn: {
    ...baseStyles.primaryBtn,
    backgroundColor: '#2E75B6',
    shadowColor: '#2E75B6',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  completedBtn: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  completedText: {
    color: '#94A3B8',
  },
  handoverPanel: {
    ...baseStyles.handoverPanel,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  handoverTitle: { ...baseStyles.handoverTitle, color: '#0F172A' },
  handoverDesc: { ...baseStyles.handoverDesc, color: '#64748B' },
  handoverBtn: {
    ...baseStyles.handoverBtn,
    backgroundColor: '#F1F5F9',
  },
  handoverBtnText: { ...baseStyles.handoverBtnText, color: '#475569' },
  secondaryBtn: {
    ...baseStyles.secondaryBtn,
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  secondaryText: { ...baseStyles.secondaryText, color: '#475569' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
  welcomeText: { ...baseStyles.welcomeText, color: '#94A3B8' },
  driverName: { ...baseStyles.driverName, color: '#FFFFFF' },
  activeIndicatorBox: { ...baseStyles.activeIndicatorBox, backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  muted: { ...baseStyles.muted, color: '#94A3B8' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { ...baseStyles.cardTitle, color: '#FFFFFF' },
  statValue: { ...baseStyles.statValue, color: '#FFFFFF' },
  statLabel: { ...baseStyles.statLabel, color: '#94A3B8' },
  statDivider: { ...baseStyles.statDivider, backgroundColor: '#334155' },
  primaryBtn: {
    ...baseStyles.primaryBtn,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryText: { ...baseStyles.primaryText, color: '#0B0F19' },
  completedBtn: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  completedText: {
    color: '#64748B',
  },
  handoverPanel: {
    ...baseStyles.handoverPanel,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  handoverTitle: { ...baseStyles.handoverTitle, color: '#FFFFFF' },
  handoverDesc: { ...baseStyles.handoverDesc, color: '#94A3B8' },
  handoverBtn: {
    ...baseStyles.handoverBtn,
    backgroundColor: '#334155',
  },
  handoverBtnText: { ...baseStyles.handoverBtnText, color: '#E2E8F0' },
  secondaryBtn: {
    ...baseStyles.secondaryBtn,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  secondaryText: { ...baseStyles.secondaryText, color: '#94A3B8' },
} as any);
