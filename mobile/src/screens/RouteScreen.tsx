import AppText from '../components/AppText';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList } from '../services/navigation';
import OfflineStatusBar from '../components/OfflineStatusBar';
import { subscribeToConnectivity, flushAllQueues } from '../services/offline.service';
import GlassContainer from '../components/GlassContainer';

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
        <AppText style={[styles.heading, { color: isDark ? '#FFF' : '#0F172A' }]}>You are not assigned as a driver.</AppText>
        <TouchableOpacity onPress={handleEndShift} style={styles.secondaryBtn}>
          <AppText style={styles.secondaryText}>Sign out</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const renderRouteItem = ({ item }: { item: RouteSummary }) => {
    const isCompleted = item.status === 'completed';
    const isInProgress = item.status === 'in_progress';

    let statusColor = isDark ? '#38BDF8' : '#0284C7';
    let statusBg = isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.08)';
    let statusBorder = isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)';

    if (isCompleted) {
      statusColor = '#10B981';
      statusBg = isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)';
      statusBorder = 'rgba(16, 185, 129, 0.3)';
    } else if (isInProgress) {
      statusColor = '#F97316';
      statusBg = isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.08)';
      statusBorder = 'rgba(249, 115, 22, 0.3)';
    }

    // Button gradient definitions
    const startColor = isDark ? '#06B6D4' : '#3B82F6';
    const endColor = isDark ? '#3B82F6' : '#1D4ED8';

    return (
      <GlassContainer style={styles.card} isDark={isDark}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#38BDF8' : '#2E75B6'} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={styles.cardHeaderIcon}>
              <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
              <Line x1={16} y1={2} x2={16} y2={6} />
              <Line x1={8} y1={2} x2={8} y2={6} />
              <Line x1={3} y1={10} x2={21} y2={10} />
            </Svg>
            <AppText style={styles.cardTitle}>{item.route_name}</AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder, borderWidth: 1 }]}>
            <AppText style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </AppText>
          </View>
        </View>

        <View style={styles.statsRow}>
          {/* Stops Pod */}
          <View style={[styles.statPod, { marginRight: 12 }]}>
            <View style={[styles.statIconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(46, 117, 182, 0.1)' }]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#38BDF8' : '#2E75B6'} strokeWidth={2.5}>
                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <Circle cx={12} cy={10} r={3} />
              </Svg>
            </View>
            <View style={styles.statInfo}>
              <AppText style={styles.statValue}>{item.stop_count}</AppText>
              <AppText style={styles.statLabel}>STOPS</AppText>
            </View>
          </View>

          {/* Distance Pod */}
          <View style={styles.statPod}>
            <View style={[styles.statIconBox, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.12)' : 'rgba(99, 102, 241, 0.1)' }]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#818CF8' : '#6366F1'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 17l4-10 4 6 4-4 4 8" />
              </Svg>
            </View>
            <View style={styles.statInfo}>
              <AppText style={styles.statValue}>{item.total_distance?.toFixed?.(1) ?? '0.0'}</AppText>
              <AppText style={styles.statLabel}>MILES</AppText>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isCompleted && styles.completedBtn]}
          onPress={() => navigation.navigate('Navigation', { routeId: item.route_id })}
          disabled={isCompleted}
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <AppText style={[styles.primaryText, isCompleted && styles.completedText]}>
              {isCompleted ? 'Route Completed' : isInProgress ? 'Resume Route' : 'Start Route'}
            </AppText>
            {!isCompleted && (
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={styles.arrowIcon}>
                <Path d="M5 12h14M12 5l7 7-7 7" />
              </Svg>
            )}
          </View>
        </TouchableOpacity>
      </GlassContainer>
    );
  };

  return (
    <View style={styles.container}>
      <OfflineStatusBar />

      {/* Ambient glassmorphism blobs */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient id="grad1" cx="90%" cy="10%" rx="75%" ry="75%">
            <Stop offset="0%" stopColor={isDark ? '#00D2FF' : '#0EA5E9'} stopOpacity={isDark ? 0.35 : 0.22} />
            <Stop offset="100%" stopColor={isDark ? '#00D2FF' : '#0EA5E9'} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="grad2" cx="10%" cy="80%" rx="80%" ry="80%">
            <Stop offset="0%" stopColor={isDark ? '#7928CA' : '#C084FC'} stopOpacity={isDark ? 0.30 : 0.18} />
            <Stop offset="100%" stopColor={isDark ? '#7928CA' : '#C084FC'} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="grad3" cx="80%" cy="45%" rx="65%" ry="65%">
            <Stop offset="0%" stopColor={isDark ? '#FF007A' : '#FDA4AF'} stopOpacity={isDark ? 0.16 : 0.12} />
            <Stop offset="100%" stopColor={isDark ? '#FF007A' : '#FDA4AF'} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
      </Svg>

      {/* Branded Profile Header Area */}
      <View style={styles.headerArea}>
        <View>
          <AppText style={styles.welcomeText}>Welcome back,</AppText>
          <AppText style={styles.driverName}>{user.name}</AppText>
        </View>
        <View style={styles.activeIndicatorBox}>
          <Animated.View style={[styles.greenPulseDot, { opacity: pulseAnim }]} />
          <AppText style={styles.activeText}>Active Shift</AppText>
        </View>
      </View>

      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      <FlatList
        data={routes ?? []}
        keyExtractor={(r) => r.route_id}
        contentContainerStyle={styles.listContainer}
        onRefresh={fetchRoutes}
        refreshing={loading}
        ListEmptyComponent={
          (loading && !routes) ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={isDark ? '#38BDF8' : '#2E75B6'} />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={2}>
                <Path d="M9 20L3 17V4L9 7M9 20L15 17M9 20V7M15 17L21 20V7L15 4M15 17V4M9 7L15 4" />
              </Svg>
              <AppText style={styles.muted}>No routes assigned to you today.</AppText>
            </View>
          )
        }
        renderItem={renderRouteItem}
        ListFooterComponent={
          <View style={{ marginTop: 24 }}>
            {/* Elegant Shift Handover Entry */}
            <View style={styles.handoverPanel}>
              <View style={styles.handoverInfo}>
                <AppText style={styles.handoverTitle}>Shift Handover Console</AppText>
                <AppText style={styles.handoverDesc}>Transition route control to another crew driver</AppText>
              </View>
              <TouchableOpacity
                style={styles.handoverBtn}
                onPress={() => navigation.navigate('ShiftSwap')}
                accessibilityRole="button"
              >
                <AppText style={styles.handoverBtnText}>Open</AppText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleEndShift} style={styles.secondaryBtn} accessibilityRole="button">
              <AppText style={styles.secondaryText}>End Shift</AppText>
            </TouchableOpacity>
          </View>
        }
      />
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
  welcomeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  activeIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
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
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '900', flex: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  statPod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statInfo: {
    flexDirection: 'column',
  },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 12,
  },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  handoverPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  handoverInfo: { flex: 1, marginRight: 16 },
  handoverTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  handoverDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  handoverBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoverBtnText: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  secondaryText: { fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
};
const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  welcomeText: { ...baseStyles.welcomeText, color: '#64748B' },
  driverName: { ...baseStyles.driverName, color: '#0F172A' },
  activeIndicatorBox: {
    ...baseStyles.activeIndicatorBox,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  muted: { ...baseStyles.muted, color: '#64748B' },
  card: {
    ...baseStyles.card,
  },
  cardTitle: { ...baseStyles.cardTitle, color: '#0F172A' },
  statValue: { ...baseStyles.statValue, color: '#0F172A' },
  statLabel: { ...baseStyles.statLabel, color: '#64748B' },
  statPod: {
    ...baseStyles.statPod,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  primaryBtn: {
    ...baseStyles.primaryBtn,
    backgroundColor: '#2E75B6',
  },
  completedBtn: {
    backgroundColor: '#E2E8F0',
  },
  completedText: {
    color: '#94A3B8',
  },
  handoverPanel: {
    ...baseStyles.handoverPanel,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  handoverTitle: { ...baseStyles.handoverTitle, color: '#0F172A' },
  handoverDesc: { ...baseStyles.handoverDesc, color: '#64748B' },
  handoverBtn: {
    ...baseStyles.handoverBtn,
    backgroundColor: '#0F172A',
  },
  handoverBtnText: { ...baseStyles.handoverBtnText, color: '#FFFFFF' },
  secondaryBtn: {
    ...baseStyles.secondaryBtn,
    backgroundColor: 'rgba(225, 29, 72, 0.05)',
    borderColor: 'rgba(225, 29, 72, 0.2)',
  },
  secondaryText: { ...baseStyles.secondaryText, color: '#E11D48' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
  welcomeText: { ...baseStyles.welcomeText, color: '#94A3B8' },
  driverName: { ...baseStyles.driverName, color: '#FFFFFF' },
  activeIndicatorBox: {
    ...baseStyles.activeIndicatorBox,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  muted: { ...baseStyles.muted, color: '#94A3B8' },
  card: {
    ...baseStyles.card,
  },
  cardTitle: { ...baseStyles.cardTitle, color: '#FFFFFF' },
  statValue: { ...baseStyles.statValue, color: '#FFFFFF' },
  statLabel: { ...baseStyles.statLabel, color: '#94A3B8' },
  statPod: {
    ...baseStyles.statPod,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  primaryBtn: {
    ...baseStyles.primaryBtn,
    backgroundColor: '#0284C7',
  },
  primaryText: { ...baseStyles.primaryText, color: 'white' },
  completedBtn: {
    backgroundColor: '#334155',
  },
  completedText: {
    color: '#64748B',
  },
  handoverPanel: {
    ...baseStyles.handoverPanel,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  handoverTitle: { ...baseStyles.handoverTitle, color: '#FFFFFF' },
  handoverDesc: { ...baseStyles.handoverDesc, color: '#94A3B8' },
  handoverBtn: {
    ...baseStyles.handoverBtn,
    backgroundColor: '#334155',
  },
  handoverBtnText: { ...baseStyles.handoverBtnText, color: 'white' },
  secondaryBtn: {
    ...baseStyles.secondaryBtn,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  secondaryText: { ...baseStyles.secondaryText, color: '#FB7185' },
} as any);
