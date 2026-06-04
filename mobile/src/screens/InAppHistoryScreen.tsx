import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../services/navigation';
import { useSettingsStore } from '../store/settingsStore';

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
            <Text style={styles.badgeText}>{item.category?.toUpperCase() || 'INFO'}</Text>
          </View>
          <Text style={styles.timestamp}>{new Date(item.receivedAt).toLocaleTimeString()}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#38BDF8', '#2E75B6']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notifications logged yet.</Text>
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
    marginTop: 64,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
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
  emptyText: { ...baseStyles.emptyText, color: '#64748B' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
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
  emptyText: { ...baseStyles.emptyText, color: '#94A3B8' },
} as any);


