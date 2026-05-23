import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getQueueDepths } from '../services/offline.service';

export default function OfflineStatusBar() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [gpsCount, setGpsCount] = useState<number>(0);
  const [stopCount, setStopCount] = useState<number>(0);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // 1. Connection status listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return unsubscribe;
  }, []);

  // 2. Dynamic queue depths checker (runs periodically when queue has items or when offline)
  useEffect(() => {
    let active = true;

    async function checkDepths() {
      try {
        const depths = await getQueueDepths();
        if (active) {
          setGpsCount(depths.gpsCount);
          setStopCount(depths.stopCount);
        }
      } catch (err) {
        console.warn('[OFFLINE STATUS] Failed to read queue depths:', err);
      }
    }

    // Run immediately
    void checkDepths();

    // Check periodically
    const interval = setInterval(checkDepths, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // 3. Warning pulse animation for premium feel
  useEffect(() => {
    if (isConnected === false || gpsCount > 0 || stopCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.75,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected, gpsCount, stopCount, pulseAnim]);

  // Hide the bar if we are online and have absolutely no pending items in the queues
  const hasPendingItems = gpsCount > 0 || stopCount > 0;
  if (isConnected !== false && !hasPendingItems) {
    return null;
  }

  // Premium winter storm warning theme: warm amber/orange with dark glassmorphic backgrounds
  const containerStyle = [
    styles.container,
    isConnected === false ? styles.offlineBg : styles.syncingBg,
  ];

  return (
    <Animated.View style={[containerStyle, { opacity: pulseAnim }]} accessibilityRole="summary">
      <View style={styles.contentRow}>
        <View style={styles.statusDotRow}>
          <View style={[styles.statusDot, isConnected === false ? styles.offlineDot : styles.syncingDot]} />
          <Text style={styles.statusText}>
            {isConnected === false ? 'Working Offline' : 'Syncing Data…'}
          </Text>
        </View>
        <Text style={styles.queueText}>
          {stopCount > 0 ? `⚡ ${stopCount} stop change${stopCount > 1 ? 's' : ''}` : ''}
          {stopCount > 0 && gpsCount > 0 ? ' · ' : ''}
          {gpsCount > 0 ? `📍 ${gpsCount} GPS point${gpsCount > 1 ? 's' : ''}` : ''}
          {!hasPendingItems && isConnected === false ? 'All progress saved locally' : ''}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  offlineBg: {
    backgroundColor: '#3E2A10', // dark warm chocolate/bronze for deep contrast
    borderWidth: 1.5,
    borderColor: '#E65100', // high-visibility neon amber orange
  },
  syncingBg: {
    backgroundColor: '#1E2D3D', // dark slate blue
    borderWidth: 1.5,
    borderColor: '#0288D1', // vivid sync blue
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  offlineDot: {
    backgroundColor: '#FF9800',
  },
  syncingDot: {
    backgroundColor: '#29B6F6',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  queueText: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '600',
  },
});
