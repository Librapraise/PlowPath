import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, type DriverSettings } from '../store/settingsStore';
import { flushAllQueues, getQueueDepths } from '../services/offline.service';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { settings, loading, error, fetchSettings, updateSettings } = useSettingsStore();

  const [gpsCount, setGpsCount] = useState(0);
  const [stopCount, setStopCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Fetch settings on load
    fetchSettings();
    updateQueueDepths();
  }, []);

  const updateQueueDepths = async () => {
    try {
      const depths = await getQueueDepths();
      setGpsCount(depths.gpsCount);
      setStopCount(depths.stopCount);
    } catch (err) {
      console.warn('[SETTINGS] Failed to get queue depths', err);
    }
  };

  const handleToggleTheme = (value: boolean) => {
    updateSettings({ theme: value ? 'dark' : 'light' });
  };

  const handleSelectNavApp = (app: DriverSettings['navigation_app']) => {
    updateSettings({ navigation_app: app });
  };

  const handleToggleAccuracy = (accuracy: DriverSettings['tracking_accuracy']) => {
    updateSettings({ tracking_accuracy: accuracy });
  };

  const handleAdjustFrequency = (delta: number) => {
    let nextFreq = settings.upload_frequency_seconds + delta;
    if (nextFreq < 10) nextFreq = 10;
    if (nextFreq > 120) nextFreq = 120;
    updateSettings({ upload_frequency_seconds: nextFreq });
  };

  const handleForceSync = async () => {
    if (!user?.driver_id) {
      Alert.alert('Error', 'No driver ID associated with this account.');
      return;
    }
    setSyncing(true);
    try {
      await flushAllQueues(user.driver_id);
      await updateQueueDepths();
      Alert.alert('Sync Complete', 'Offline database queues have been flushed successfully.');
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.message || 'Failed to sync. Are you still offline?');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearRouteCache = () => {
    Alert.alert(
      'Clear Cached Routes',
      'Are you sure you want to clear all cached routes? This will remove offline data for routes. You will need network access to download them again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const routeKeys = allKeys.filter((key) => key.startsWith('plowpath.route.'));
              if (routeKeys.length > 0) {
                await AsyncStorage.multiRemove(routeKeys);
                Alert.alert('Cache Cleared', `Successfully removed ${routeKeys.length} cached route(s).`);
              } else {
                Alert.alert('Cache Clean', 'No cached routes found.');
              }
            } catch (err: any) {
              Alert.alert('Error', 'Failed to clear cache: ' + err?.message);
            }
          },
        },
      ]
    );
  };

  const isDark = settings.theme === 'dark';
  const styles = isDark ? darkStyles : lightStyles;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Settings</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* --- Visual Styling --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visual Preference</Text>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Night Mode / Dark Glare</Text>
            <Text style={styles.sublabel}>High-contrast dark mode for night operations</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleToggleTheme}
            trackColor={{ false: '#767577', true: '#2E75B6' }}
            thumbColor={isDark ? '#FFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* --- External Navigation --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Navigation App</Text>
        <Text style={styles.sublabel}>Select your preferred navigation redirect tool:</Text>
        <View style={styles.navButtonGroup}>
          {(['google_maps', 'apple_maps', 'waze'] as const).map((app) => {
            const isSelected = settings.navigation_app === app;
            const appLabel = app === 'google_maps' ? 'Google Maps' : app === 'apple_maps' ? 'Apple Maps' : 'Waze';
            return (
              <TouchableOpacity
                key={app}
                style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                onPress={() => handleSelectNavApp(app)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${appLabel}`}
              >
                <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                  {appLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* --- GPS Telemetry Settings --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GPS Telemetry & Battery</Text>
        
        {/* Tracking Accuracy toggle */}
        <Text style={styles.label}>Location Accuracy</Text>
        <View style={styles.navButtonGroup}>
          {(['high', 'power_saver'] as const).map((acc) => {
            const isSelected = settings.tracking_accuracy === acc;
            const label = acc === 'high' ? 'High Precision' : 'Power Saver';
            return (
              <TouchableOpacity
                key={acc}
                style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                onPress={() => handleToggleAccuracy(acc)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${label}`}
              >
                <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Upload Frequency Stepper - Highly glove friendly */}
        <Text style={[styles.label, { marginTop: 16 }]}>Coordinate Upload Frequency</Text>
        <Text style={styles.sublabel}>Seconds between route tracking updates to the server</Text>
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => handleAdjustFrequency(-10)}
            accessibilityRole="button"
            accessibilityLabel="Decrease interval by 10 seconds"
          >
            <Text style={styles.stepperBtnText}>- 10s</Text>
          </TouchableOpacity>
          
          <View style={styles.freqValueContainer}>
            <Text style={styles.freqValueText}>{settings.upload_frequency_seconds}s</Text>
          </View>

          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => handleAdjustFrequency(10)}
            accessibilityRole="button"
            accessibilityLabel="Increase interval by 10 seconds"
          >
            <Text style={styles.stepperBtnText}>+ 10s</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Queue Operations Console --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Queue & Cache Operations</Text>
        <View style={styles.queueStatusRow}>
          <Text style={styles.queueStatusText}>
            Queued GPS: <Text style={styles.boldText}>{gpsCount}</Text> samples
          </Text>
          <Text style={styles.queueStatusText}>
            Queued Stops: <Text style={styles.boldText}>{stopCount}</Text> updates
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, styles.syncBtn]}
          onPress={handleForceSync}
          disabled={syncing || loading}
          accessibilityRole="button"
          accessibilityLabel="Force Sync Queues"
        >
          {syncing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Force Sync Queues</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.clearBtn]}
          onPress={handleClearRouteCache}
          accessibilityRole="button"
          accessibilityLabel="Clear Cached Routes"
        >
          <Text style={[styles.btnText, { color: '#E11D48' }]}>Clear Cached Routes</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#2E75B6" />
        </View>
      ) : null}
    </ScrollView>
  );
}

const baseStyles = {
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  errorText: { color: '#EF4444', marginBottom: 12, fontSize: 14, fontWeight: '600' },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelContainer: { flex: 1, paddingRight: 10 },
  label: { fontSize: 16, fontWeight: '600' },
  sublabel: { fontSize: 13, marginTop: 2, marginBottom: 8 },
  navButtonGroup: { flexDirection: 'row', gap: 8, marginTop: 4 },
  segmentBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#2E75B6',
    borderColor: '#2E75B6',
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: 'white' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  stepperBtn: {
    backgroundColor: '#2E75B6',
    height: 50,
    width: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  freqValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  freqValueText: { fontSize: 24, fontWeight: '800' },
  queueStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  queueStatusText: { fontSize: 14 },
  boldText: { fontWeight: '700' },
  btn: {
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  syncBtn: { backgroundColor: '#10B981' },
  clearBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E11D48' },
  btnText: { fontSize: 16, fontWeight: '700', color: 'white' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  header: { ...baseStyles.header, color: '#0F172A' },
  section: {
    ...baseStyles.section,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  sectionTitle: { ...baseStyles.sectionTitle, color: '#0F172A' },
  label: { ...baseStyles.label, color: '#1E293B' },
  sublabel: { ...baseStyles.sublabel, color: '#64748B' },
  segmentBtn: { ...baseStyles.segmentBtn, borderColor: '#CBD5E1', backgroundColor: '#F1F5F9' },
  segmentText: { ...baseStyles.segmentText, color: '#475569' },
  freqValueText: { ...baseStyles.freqValueText, color: '#0F172A' },
  queueStatusText: { ...baseStyles.queueStatusText, color: '#334155' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0F172A' },
  header: { ...baseStyles.header, color: '#F8FAFC' },
  section: {
    ...baseStyles.section,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  sectionTitle: { ...baseStyles.sectionTitle, color: '#F8FAFC' },
  label: { ...baseStyles.label, color: '#E2E8F0' },
  sublabel: { ...baseStyles.sublabel, color: '#94A3B8' },
  segmentBtn: { ...baseStyles.segmentBtn, borderColor: '#475569', backgroundColor: '#0F172A' },
  segmentText: { ...baseStyles.segmentText, color: '#94A3B8' },
  freqValueText: { ...baseStyles.freqValueText, color: '#F8FAFC' },
  queueStatusText: { ...baseStyles.queueStatusText, color: '#CBD5E1' },
} as any);
