import AppText from '../components/AppText';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Rect, Line, LinearGradient } from 'react-native-svg';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import OfflineStatusBar from '../components/OfflineStatusBar';
import { subscribeToConnectivity, flushAllQueues } from '../services/offline.service';
import { useTranslation } from '../services/i18n';

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

const CalendarIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
    <Line x1={16} y1={2} x2={16} y2={6} />
    <Line x1={8} y1={2} x2={8} y2={6} />
    <Line x1={3} y1={10} x2={21} y2={10} />
  </Svg>
);

const CheckIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M9 12l2 2 4-4" />
  </Svg>
);

const PinIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const DistanceIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 17l4-10 4 6 4-4 4 8" />
  </Svg>
);

const ClockIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 6v6l4 2" />
  </Svg>
);

const RouteCard = ({
  item,
  index,
  navigation,
  isDark,
  styles,
}: {
  item: RouteSummary;
  index: number;
  navigation: any;
  isDark: boolean;
  styles: any;
}) => {
  const { t } = useTranslation();
  const isCompleted = item.status === 'completed';
  const isInProgress = item.status === 'in_progress';

  // Staggered FadeInUp Animation
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  // Active CTA Button Arrow Nudge Animation (Once on load)
  const arrowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isCompleted) {
      Animated.sequence([
        Animated.delay(500 + index * 80),
        Animated.timing(arrowAnim, {
          toValue: 4,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCompleted, index]);

  // Card press scale animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  let statusColor = '#3B82F6';
  let statusBg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
  let statusBorder = isDark ? 'rgba(59, 130, 246, 0.3)' : '#3B82F633';

  if (isCompleted) {
    statusColor = '#22C55E';
    statusBg = isDark ? 'rgba(34, 197, 94, 0.15)' : '#ECFDF5';
    statusBorder = isDark ? 'rgba(34, 197, 94, 0.3)' : '#22C55E33';
  } else if (isInProgress) {
    statusColor = '#F59E0B';
    statusBg = isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF4E5';
    statusBorder = isDark ? 'rgba(245, 158, 11, 0.3)' : '#F59E0B33';
  }

  const stopsVal = item.stop_count || '0';
  const milesVal = item.total_distance != null ? Number(item.total_distance).toFixed(1) : '0.0';
  const stopsNum = parseInt(stopsVal, 10) || 0;
  const milesNum = parseFloat(milesVal) || 0;
  const estVal = Math.max(15, Math.round(stopsNum * 12 + milesNum * 3));

  return (
    <Animated.View
      style={{
        opacity: cardFade,
        transform: [{ translateY: cardTranslateY }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        onPress={() => navigation.navigate('Navigation', { routeId: item.route_id })}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <CalendarIcon color={statusColor} />
            <AppText style={styles.cardTitle} numberOfLines={1}>
              {item.route_name}
            </AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <AppText style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.status === 'assigned'
                ? t('assignedFilter').toUpperCase()
                : item.status === 'in_progress'
                ? t('inProgressFilter').toUpperCase()
                : t('completedFilter').toUpperCase()}
            </AppText>
          </View>
        </View>

        {/* Stats inline strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <View style={styles.statHeader}>
              <PinIcon color={statusColor} size={16} />
              <AppText style={styles.statNumber}>{stopsVal}</AppText>
            </View>
            <AppText style={styles.statLabel}>{t('stops')}</AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCell}>
            <View style={styles.statHeader}>
              <DistanceIcon color={statusColor} size={16} />
              <AppText style={styles.statNumber}>{milesVal}</AppText>
            </View>
            <AppText style={styles.statLabel}>{t('miles')}</AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCell}>
            <View style={styles.statHeader}>
              <ClockIcon color={statusColor} size={16} />
              <AppText style={styles.statNumber}>{estVal}m</AppText>
            </View>
            <AppText style={styles.statLabel}>{t('estTime')}</AppText>
          </View>
        </View>

        {/* Actions CTA Section */}
        {isCompleted ? (
          <View style={styles.completedStrip}>
            <View style={styles.completedLeft}>
              <CheckIcon color="#22C55E" size={18} />
              <AppText style={styles.completedText}>{t('completed')}</AppText>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Navigation', { routeId: item.route_id })}
              accessibilityRole="button"
            >
              <AppText style={styles.viewSummaryLink}>{t('viewSummary')}</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Navigation', { routeId: item.route_id })}
            accessibilityRole="button"
          >
            <View style={StyleSheet.absoluteFill}>
              <Svg height="100%" width="100%">
                <Defs>
                  <LinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#1D4ED8" />
                    <Stop offset="100%" stopColor="#3B82F6" />
                  </LinearGradient>
                </Defs>
                <Rect height="100%" width="100%" rx={14} fill="url(#btnGrad)" />
              </Svg>
            </View>
            <View style={styles.buttonContent}>
              <AppText style={styles.primaryText}>
                {isInProgress ? t('resumeRoute') : t('startRoute')}
              </AppText>
              <Animated.View style={{ transform: [{ translateX: arrowAnim }] }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={styles.arrowIcon}>
                  <Path d="M5 12h14M12 5l7 7-7 7" />
                </Svg>
              </Animated.View>
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function RouteScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'assigned' | 'completed'>('all');

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
      .catch(() => setError(locale === 'fr-QC' ? 'Impossible de charger les trajets. Es-tu hors ligne?' : 'Could not load routes. Working offline?'))
      .finally(() => setLoading(false));
  };

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

  const filteredRoutes = routes
    ? routes.filter((r) => {
      if (filter === 'all') return true;
      return r.status === filter;
    })
    : [];

  const styles = isDark ? darkStyles : lightStyles;

  if (!user?.driver_id) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? '#0F141E' : '#F4F6FA' }]}>
        <AppText style={[styles.heading, { color: isDark ? '#FFF' : '#0F172A' }]}>{t('notAssignedDriver')}</AppText>
        <TouchableOpacity onPress={handleEndShift} style={styles.secondaryBtn}>
          <AppText style={styles.secondaryText}>{t('signOut')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const renderRouteItem = ({ item, index }: { item: RouteSummary; index: number }) => {
    return (
      <RouteCard
        item={item}
        index={index}
        navigation={navigation}
        isDark={isDark}
        styles={styles}
      />
    );
  };

  const activeCount = routes ? routes.filter((r) => r.status === 'in_progress').length : 0;
  const routeCountText = routes
    ? routes.length === 1
      ? t('routesTodaySingle', { count: routes.length })
      : t('routesToday', { count: routes.length })
    : t('routesToday', { count: 0 });

  return (
    <View style={styles.container}>
      <OfflineStatusBar />

      {/* Header Section (Dark Zone — #0F141E) */}
      <View style={styles.headerArea}>
        <View style={styles.headerTopRow}>
          <View>
            <AppText style={styles.welcomeText}>{t('welcomeBack')}</AppText>
            <AppText style={styles.driverName}>{user?.name || 'Mike Plowman'}</AppText>
          </View>
          <View style={styles.activeIndicatorBox}>
            <Animated.View style={[styles.greenPulseDot, { opacity: pulseAnim }]} />
            <AppText style={styles.activeText}>{t('activeShift')}</AppText>
          </View>
        </View>

        <AppText style={[styles.summaryStrip, { marginTop: 12 }]}>
          {routeCountText} · {t('activeRoutes', { count: activeCount })}
        </AppText>

        <View style={styles.headerActionsRow}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => navigation.navigate('ShiftSwap')}
            accessibilityRole="button"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <Path d="M17 1l4 4-4 4M3 23l-4-4 4-4" />
              <Path d="M21 5H9a5 5 0 0 0-5 5v3M3 19h12a5 5 0 0 0 5-5v-3" />
            </Svg>
            <AppText style={styles.headerActionBtnText}>{t('shiftHandover')}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, styles.headerActionBtnEnd]}
            onPress={handleEndShift}
            accessibilityRole="button"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <Path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
            </Svg>
            <AppText style={[styles.headerActionBtnText, { color: '#FCA5A5' }]}>{t('endShift')}</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Curved Container Zone */}
      <View style={styles.contentZone}>
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
            contentContainerStyle={styles.filterContainer}
          >
            {(['all', 'in_progress', 'assigned', 'completed'] as const).map((filterType) => {
              const isActive = filter === filterType;
              let displayLabel = '';
              if (filterType === 'all') displayLabel = t('allFilter');
              else if (filterType === 'in_progress') displayLabel = t('inProgressFilter');
              else if (filterType === 'assigned') displayLabel = t('assignedFilter');
              else if (filterType === 'completed') displayLabel = t('completedFilter');

              return (
                <TouchableOpacity
                  key={filterType}
                  style={[
                    styles.filterPill,
                    isActive ? styles.filterPillActive : styles.filterPillInactive
                  ]}
                  onPress={() => setFilter(filterType)}
                  accessibilityRole="button"
                >
                  <AppText
                    style={[
                      styles.filterText,
                      isActive ? styles.filterTextActive : styles.filterTextInactive
                    ]}
                  >
                    {displayLabel}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredRoutes}
          keyExtractor={(r) => r.route_id}
          contentContainerStyle={styles.listContainer}
          onRefresh={fetchRoutes}
          refreshing={loading}
          ListEmptyComponent={
            (loading && !routes) ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={isDark ? '#38BDF8' : '#1D4ED8'} />
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#475569' : '#CBD5E1'} strokeWidth={2}>
                  <Path d="M9 20L3 17V4L9 7M9 20L15 17M9 20V7M15 17L21 20V7L15 4M15 17V4M9 7L15 4" />
                </Svg>
                <AppText style={styles.muted}>
                  {routes && routes.length > 0 ? t('noRoutesMatch') : t('noRoutesAssigned')}
                </AppText>
              </View>
            )
          }
          renderItem={renderRouteItem}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      </View>
    </View>
  );
}

const baseStyles = {
  container: { flex: 1, backgroundColor: '#0F141E' },
  contentZone: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -32,
    paddingTop: 16,
  },
  listContainer: { paddingBottom: 24 },
  filterWrapper: {
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  filterScrollView: {
    maxHeight: 48,
  },
  filterContainer: {
    paddingHorizontal: 20,
    alignItems: 'center' as any,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center' as any,
    alignItems: 'center' as any,
  },
  filterPillActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700' as any,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  error: { color: '#F43F5E', textAlign: 'center', marginVertical: 12, fontWeight: '700' },
  muted: { fontSize: 16, marginTop: 12, textAlign: 'center' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 48 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
    backgroundColor: '#0F141E',
  },
  headerTopRow: {
    flexDirection: 'row' as any,
    justifyContent: 'space-between' as any,
    alignItems: 'center' as any,
  },
  headerActionsRow: {
    flexDirection: 'row' as any,
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  headerActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerActionBtnEnd: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  headerActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800' as any,
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '700' as any,
    textTransform: 'uppercase' as any,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  driverName: {
    fontSize: 26,
    fontWeight: '900' as any,
    color: '#FFFFFF',
    marginTop: 4,
  },
  activeIndicatorBox: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  activeText: { fontSize: 11, fontWeight: '900' as any, textTransform: 'uppercase' as any, letterSpacing: 0.5, color: '#22C55E' },
  summaryStrip: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 8,
    fontWeight: '600' as any,
  },
  card: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row' as any,
    justifyContent: 'space-between' as any,
    alignItems: 'center' as any,
  },
  cardTitleContainer: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '600' as any },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' as any, letterSpacing: 0.8, textTransform: 'uppercase' as any },
  statsRow: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'space-between' as any,
    marginVertical: 20,
  },
  statCell: {
    flex: 1,
    alignItems: 'center' as any,
  },
  statHeader: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: 6,
  },
  statNumber: { fontSize: 18, fontWeight: '700' as any },
  statLabel: { fontSize: 10, fontWeight: '500' as any, textTransform: 'uppercase' as any, marginTop: 4 },
  divider: { width: 1, height: 24 },
  buttonContent: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    overflow: 'hidden' as any,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryText: { color: 'white', fontSize: 14, fontWeight: '800' as any, letterSpacing: 1 },
  completedStrip: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'space-between' as any,
    paddingVertical: 8,
  },
  completedLeft: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: 6,
  },
  completedText: { fontSize: 13, fontWeight: '500' as any, color: '#22C55E' },
  viewSummaryLink: { fontSize: 12, fontWeight: '700' as any, color: '#3B82F6' },
  handoverPanel: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'space-between' as any,
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  handoverInfo: { flex: 1, marginRight: 16 },
  handoverTitle: { fontSize: 16, fontWeight: '900' as any, letterSpacing: 0.5 },
  handoverDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  handoverBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center' as any,
    alignItems: 'center' as any,
  },
  handoverBtnText: { fontSize: 13, fontWeight: '900' as any, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  secondaryText: { fontSize: 15, fontWeight: '800' as any, textTransform: 'uppercase' as any, letterSpacing: 1 },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  contentZone: {
    ...baseStyles.contentZone,
    backgroundColor: '#F4F6FA',
  },
  muted: { ...baseStyles.muted, color: '#64748B' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.07)',
  },
  cardTitle: { ...baseStyles.cardTitle, color: '#1A1A2E' },
  statNumber: { ...baseStyles.statNumber, color: '#0F141E' },
  statLabel: { ...baseStyles.statLabel, color: 'rgba(0, 0, 0, 0.4)' },
  divider: { ...baseStyles.divider, backgroundColor: 'rgba(0,0,0,0.08)' },
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
  filterWrapper: {
    ...baseStyles.filterWrapper,
    borderBottomColor: '#E2E8F0',
  },
  filterPillInactive: {
    backgroundColor: '#E2E8F0',
  },
  filterTextInactive: {
    color: '#64748B',
  },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  contentZone: {
    ...baseStyles.contentZone,
    backgroundColor: '#131820',
  },
  muted: { ...baseStyles.muted, color: '#94A3B8' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#1C2333',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  cardTitle: { ...baseStyles.cardTitle, color: '#FFFFFF' },
  statNumber: { ...baseStyles.statNumber, color: '#FFFFFF' },
  statLabel: { ...baseStyles.statLabel, color: 'rgba(255, 255, 255, 0.35)' },
  divider: { ...baseStyles.divider, backgroundColor: 'rgba(255,255,255,0.08)' },
  handoverPanel: {
    ...baseStyles.handoverPanel,
    backgroundColor: '#1C2333',
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
  filterWrapper: {
    ...baseStyles.filterWrapper,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterTextInactive: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
} as any);
