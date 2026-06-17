import AppText from '../components/AppText';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
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

const windowWidth = Dimensions.get('window').width;

// Gradient Button Helper using Svg
const GradientButton = ({
  onPress,
  text,
  disabled,
  icon,
  colors = ['#10B981', '#22C55E'],
}: {
  onPress: () => void;
  text: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  colors?: string[];
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.gradientBtnContainer, disabled && { opacity: 0.45 }]}
      activeOpacity={0.8}
    >
      <Svg style={StyleSheet.absoluteFillObject}>
        <Defs>
          <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#btnGrad)" />
      </Svg>
      <View style={styles.gradientBtnContent}>
        {icon}
        <AppText style={[styles.gradientBtnText, { marginLeft: icon ? 8 : 0 }]}>{text}</AppText>
      </View>
    </TouchableOpacity>
  );
};

export default function SignRouteScreen() {
  const navigation = useNavigation<any>();
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const [action, setAction] = useState<'install' | 'remove'>('install');
  const [routeData, setRouteData] = useState<SignRouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Tab slider width tracking
  const [tabWidth, setTabWidth] = useState(windowWidth - 40);
  const slidingAnim = useRef(new Animated.Value(action === 'install' ? 0 : 1)).current;

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

  useEffect(() => {
    Animated.timing(slidingAnim, {
      toValue: action === 'install' ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
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

  const resolvedStyles = isDark ? darkStyles : lightStyles;

  const activePillLeft = slidingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, tabWidth / 2],
  });

  return (
    <View style={resolvedStyles.container}>
      <OfflineStatusBar />

      {/* Sub-page Header Pattern (Inline Back Button + Title + Bottom Divider) */}
      <View style={resolvedStyles.headerRow}>
        <TouchableOpacity
          style={resolvedStyles.headerBackBtn}
          onPress={() => navigation.navigate('Route')}
          accessibilityRole="button"
          accessibilityLabel="Back to route"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
            stroke={isDark ? '#FFFFFF' : '#0F141E'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M19 12H5M12 5l-7 7 7 7" />
          </Svg>
        </TouchableOpacity>
        <AppText style={resolvedStyles.headerTitle}>Sign Crew</AppText>
      </View>

      {/* Redesigned Sliding Tab Selector */}
      <View
        style={resolvedStyles.tabContainer}
        onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            styles.slidingPill,
            {
              left: activePillLeft,
              width: tabWidth / 2 - 4,
              backgroundColor: isDark ? '#0F141E' : '#FFFFFF',
            },
          ]}
        />
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setAction('install')}
          activeOpacity={0.9}
        >
          <AppText
            style={[
              resolvedStyles.tabText,
              action === 'install' && resolvedStyles.activeTabText,
            ]}
          >
            Install Signs
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setAction('remove')}
          activeOpacity={0.9}
        >
          <AppText
            style={[
              resolvedStyles.tabText,
              action === 'remove' && resolvedStyles.activeTabText,
            ]}
          >
            Remove Signs
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Redesigned Route Info Dashboard (3 side-by-side cards) */}
      {routeData && (
        <View style={styles.dashboardRow}>
          {/* Stops Left Card */}
          <View style={resolvedStyles.statCard}>
            <View style={styles.statIconBadge}>
              <AppText style={{ fontSize: 16 }}>🔴</AppText>
            </View>
            <AppText style={resolvedStyles.statVal}>{routeData.stops.length}</AppText>
            <AppText style={resolvedStyles.statLabel}>Stops Left</AppText>
          </View>

          {/* Distance Card */}
          <View style={resolvedStyles.statCard}>
            <View style={styles.statIconBadge}>
              <AppText style={{ fontSize: 16 }}>📏</AppText>
            </View>
            <AppText style={resolvedStyles.statVal}>{routeData.total_miles}mi</AppText>
            <AppText style={resolvedStyles.statLabel}>Distance</AppText>
          </View>

          {/* Progress Card (with custom vector arc) */}
          <View style={resolvedStyles.statCard}>
            <View style={styles.progressRingWrapper}>
              <Svg width={32} height={32} viewBox="0 0 36 36">
                <Circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,20,30,0.06)'}
                  strokeWidth="3.5"
                />
                <Circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="3.5"
                  strokeDasharray="88"
                  strokeDashoffset={88 - (88 * routeData.progress) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </Svg>
            </View>
            <AppText style={resolvedStyles.statVal}>{routeData.progress}%</AppText>
            <AppText style={resolvedStyles.statLabel}>Done</AppText>
          </View>
        </View>
      )}

      {error && <AppText style={resolvedStyles.errorText}>{error}</AppText>}

      {isLoading ? (
        <View style={resolvedStyles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <AppText style={resolvedStyles.loadingText}>Calculating optimized TSP route...</AppText>
        </View>
      ) : (
        <FlatList
          data={routeData?.stops ?? []}
          keyExtractor={(s) => s.customer_id}
          contentContainerStyle={resolvedStyles.listContent}
          ListEmptyComponent={
            <AppText style={resolvedStyles.emptyText}>
              All properties are completed for this off-season sign operation!
            </AppText>
          }
          renderItem={({ item }) => {
            const isInstalled = item.sign_status === 'installed';
            const isRemoved = item.sign_status === 'removed';

            let accentColor = '#3B82F6'; // Pending blue
            if (isInstalled) accentColor = '#22C55E'; // Success green
            if (isRemoved) accentColor = '#F59E0B'; // Warning amber

            // Mock date string for Removed stops
            const removedDate = 'Jun 17, 2026';

            return (
              <View
                style={resolvedStyles.stopCard}
              >
                <View style={styles.stopHeader}>
                  {/* Status dot + sequence number */}
                  <View style={[styles.seqContainer, { borderColor: accentColor }]}>
                    <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
                    <AppText style={[resolvedStyles.seqText, { color: isDark ? '#FFFFFF' : '#0F141E' }]}>
                      {item.sequence_number}
                    </AppText>
                  </View>

                  <View style={styles.metaCol}>
                    <AppText style={resolvedStyles.stopName}>{item.name}</AppText>
                    <AppText style={resolvedStyles.stopAddr}>{item.address}</AppText>
                    {isRemoved && (
                      <AppText style={resolvedStyles.removedNote}>
                        ℹ Sign was last removed on {removedDate}
                      </AppText>
                    )}
                  </View>
                </View>

                <View style={resolvedStyles.cardFooterRow}>
                  <View style={resolvedStyles.badgeContainer}>
                    <View style={[styles.pillBadge, { backgroundColor: `${accentColor}1A` }]}>
                      <AppText style={[styles.pillBadgeText, { color: accentColor }]}>
                        {isInstalled ? 'INSTALLED' : isRemoved ? 'REMOVED' : 'PENDING'}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.flex1}>
                    {action === 'install' ? (
                      <GradientButton
                        disabled={updatingId === item.customer_id}
                        onPress={() => handleUpdateStatus(item.customer_id, 'installed')}
                        text="Mark Installed"
                        colors={['#10B981', '#22C55E']}
                        icon={
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M20 6L9 17l-5-5" />
                          </Svg>
                        }
                      />
                    ) : (
                      <GradientButton
                        disabled={updatingId === item.customer_id}
                        onPress={() => handleUpdateStatus(item.customer_id, 'removed')}
                        text="Mark Removed"
                        colors={['#F59E0B', '#D97706']}
                        icon={
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M18 6L6 18M6 6l12 12" />
                          </Svg>
                        }
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statIconBadge: {
    marginBottom: 6,
  },
  progressRingWrapper: {
    marginBottom: 4,
  },
  stopHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  seqContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaCol: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  gradientBtnContainer: {
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradientBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
    paddingBottom: 12,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,20,30,0.06)',
  },
  headerBackBtn: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F141E',
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
    height: 52,
    backgroundColor: '#E2E8F0',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(15,20,30,0.5)',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F141E',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(15,20,30,0.4)',
    fontWeight: '600',
    marginTop: 2,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(15,20,30,0.5)',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyText: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(15,20,30,0.5)',
    fontWeight: '600',
  },
  stopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  seqText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F141E',
  },
  stopAddr: {
    fontSize: 12,
    color: 'rgba(15,20,30,0.5)',
    marginTop: 2,
  },
  removedNote: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
    marginTop: 4,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,20,30,0.06)',
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
} as any);

const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F141E',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
    paddingBottom: 12,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBackBtn: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
    height: 52,
    backgroundColor: '#161C29',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#161C29',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
    marginTop: 2,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyText: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  stopCard: {
    backgroundColor: '#161C29',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  seqText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stopAddr: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  removedNote: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
    marginTop: 4,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
} as any);
