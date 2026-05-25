import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../services/navigation';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'urgent' | 'route_update' | 'alert' | string;
  data?: Record<string, string>;
  receivedAt: string;
}

export default function InAppHistoryScreen() {
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
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notifications logged yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
    padding: 12,
  },
  card: {
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#94A3B8',
    fontSize: 11,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  body: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 64,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
  },
});
