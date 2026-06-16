import AppText from '../components/AppText';
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../services/navigation';
import { useSettingsStore } from '../store/settingsStore';
import Svg, { Path, Circle, Ellipse, Defs, RadialGradient, LinearGradient, Stop, Rect, G } from 'react-native-svg';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'urgent' | 'route_update' | 'alert' | string;
  data?: Record<string, string>;
  receivedAt: string;
}

export default function InAppHistoryScreen() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const [history, setHistory] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const historyStr = await AsyncStorage.getItem('plowpath.notificationHistory.v1');
      if (historyStr) {
        setHistory(JSON.parse(historyStr));
      }
    } catch (err) {
      console.warn('[HISTORY] Failed to load notification history', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePressItem = (item: NotificationItem) => {
    const data = item.data || {};
    if (item.category === 'urgent' && data.routeId) {
      navigate('Navigation', { routeId: data.routeId });
    } else {
      navigate('Route');
    }
  };

  const styles = isDark ? darkStyles : lightStyles;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    let categoryColor = '#64748B'; // default Slate
    if (item.category === 'urgent') categoryColor = '#EF4444'; // Red
    if (item.category === 'route_update') categoryColor = '#3B82F6'; // Blue
    if (item.category === 'alert') categoryColor = '#F59E0B'; // Amber

    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePressItem(item)} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: categoryColor }]}>
            <AppText style={styles.badgeText}>{item.category?.toUpperCase() || 'INFO'}</AppText>
          </View>
          <AppText style={styles.timestamp}>{new Date(item.receivedAt).toLocaleTimeString()}</AppText>
        </View>
        <AppText style={styles.title}>{item.title}</AppText>
        <AppText style={styles.body}>{item.body}</AppText>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppText style={styles.header}>Notifications</AppText>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#38BDF8', '#2E75B6']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {/* Fancy empty-state bell illustration */}
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Defs>
                <RadialGradient id="bgGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor={isDark ? '#38BDF8' : '#3B82F6'} stopOpacity={isDark ? 0.18 : 0.12} />
                  <Stop offset="100%" stopColor={isDark ? '#0F141E' : '#F8FAFC'} stopOpacity="0" />
                </RadialGradient>
                <LinearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={isDark ? '#7DD3FC' : '#60A5FA'} />
                  <Stop offset="100%" stopColor={isDark ? '#2563EB' : '#1D4ED8'} />
                </LinearGradient>
                <RadialGradient id="shine" cx="35%" cy="28%" rx="30%" ry="30%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </RadialGradient>
              </Defs>

              {/* Ambient glow circle */}
              <Circle cx="80" cy="80" r="72" fill="url(#bgGlow)" />

              {/* Outer ring pulse */}
              <Circle cx="80" cy="80" r="64" fill="none"
                stroke={isDark ? '#38BDF8' : '#3B82F6'}
                strokeWidth="1"
                strokeDasharray="6 6"
                strokeOpacity={isDark ? 0.25 : 0.2}
              />

              {/* Inner ring */}
              <Circle cx="80" cy="80" r="52" fill="none"
                stroke={isDark ? '#38BDF8' : '#3B82F6'}
                strokeWidth="1.5"
                strokeOpacity={isDark ? 0.18 : 0.15}
              />

              {/* Bell body */}
              <G>
                {/* Bell dome */}
                <Path
                  d="M80 32 C57 32 42 50 42 72 L42 92 C42 96 38 99 38 103 L122 103 C122 99 118 96 118 92 L118 72 C118 50 103 32 80 32 Z"
                  fill="url(#bellGrad)"
                />
                {/* Glass shine on bell */}
                <Path
                  d="M80 32 C57 32 42 50 42 72 L42 92 C42 96 38 99 38 103 L122 103 C122 99 118 96 118 92 L118 72 C118 50 103 32 80 32 Z"
                  fill="url(#shine)"
                />
                {/* Bell rim */}
                <Rect x="34" y="100" width="92" height="8" rx="4" fill="url(#bellGrad)" />
                {/* Bell clapper */}
                <Circle cx="80" cy="116" r="8" fill="url(#bellGrad)" />
                {/* Bell clapper stem */}
                <Rect x="78" y="107" width="4" height="9" rx="2" fill={isDark ? '#7DD3FC' : '#60A5FA'} />
                {/* Notification dot */}
                <Circle cx="112" cy="36" r="10" fill="#EF4444" />
                <Path d="M109 36 L112 39 L116 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </G>

              {/* Sound wave arcs (left) */}
              <Path d="M50 58 C44 65 44 79 50 86" stroke={isDark ? '#38BDF8' : '#3B82F6'} strokeWidth="3" strokeLinecap="round" fill="none" strokeOpacity="0.6" />
              <Path d="M42 50 C32 62 32 82 42 94" stroke={isDark ? '#38BDF8' : '#3B82F6'} strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.3" />

              {/* Sound wave arcs (right) */}
              <Path d="M110 58 C116 65 116 79 110 86" stroke={isDark ? '#38BDF8' : '#3B82F6'} strokeWidth="3" strokeLinecap="round" fill="none" strokeOpacity="0.6" />
              <Path d="M118 50 C128 62 128 82 118 94" stroke={isDark ? '#38BDF8' : '#3B82F6'} strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.3" />
            </Svg>

            <AppText style={styles.emptyText}>No notifications logged yet.</AppText>
            <AppText style={styles.emptySubText}>Push alerts from your dispatcher{`\n`}will appear here.</AppText>
          </View>
        }
      />
    </View>
  );
}

const baseStyles = {
  container: {
    flex: 1,
  },
  header: {
    fontSize: 26,
    fontWeight: '900',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  header: { ...baseStyles.header, color: '#0F172A' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  timestamp: { ...baseStyles.timestamp, color: '#64748B' },
  title: { ...baseStyles.title, color: '#0F172A' },
  body: { ...baseStyles.body, color: '#475569' },
  emptyText: { ...baseStyles.emptyText, color: '#0F172A' },
  emptySubText: { ...baseStyles.emptySubText, color: '#64748B' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0F141E' },
  header: { ...baseStyles.header, color: '#FFFFFF' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  timestamp: { ...baseStyles.timestamp, color: '#94A3B8' },
  title: { ...baseStyles.title, color: '#FFFFFF' },
  body: { ...baseStyles.body, color: '#CBD5E1' },
  emptyText: { ...baseStyles.emptyText, color: '#E2E8F0' },
  emptySubText: { ...baseStyles.emptySubText, color: '#94A3B8' },
} as any);


