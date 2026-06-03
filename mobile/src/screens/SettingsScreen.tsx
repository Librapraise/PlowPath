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
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, type DriverSettings } from '../store/settingsStore';
import { flushAllQueues, getQueueDepths } from '../services/offline.service';
import { api } from '../services/api';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { settings, loading, error, fetchSettings, updateSettings } = useSettingsStore();

  const [gpsCount, setGpsCount] = useState(0);
  const [stopCount, setStopCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Confirm password does not match new password.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      Alert.alert('Success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to update password. Please check your current password and try again.';
      Alert.alert('Error', msg);
    } finally {
      setUpdatingPassword(false);
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

      {/* --- Account Security --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Security</Text>
        <Text style={styles.sublabel}>Change your password to keep your account secure</Text>
        
        <Text style={styles.inputLabel}>Current Password</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={true}
          style={styles.input}
          placeholder="Enter current password"
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          accessibilityLabel="Current Password"
        />

        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={true}
          style={styles.input}
          placeholder="Min. 6 characters"
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          accessibilityLabel="New Password"
        />

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={true}
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          accessibilityLabel="Confirm New Password"
        />

        <TouchableOpacity
          style={[styles.submitBtn, updatingPassword && styles.disabledBtn]}
          onPress={handleChangePassword}
          disabled={updatingPassword}
          accessibilityRole="button"
          accessibilityLabel="Change Password"
        >
          {updatingPassword ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Change Password</Text>
          )}
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
  header: { fontSize: 26, fontWeight: '900', marginBottom: 20 },
  errorText: { color: '#EF4444', marginBottom: 12, fontSize: 14, fontWeight: '600' },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelContainer: { flex: 1, paddingRight: 10 },
  label: { fontSize: 15, fontWeight: '700' },
  sublabel: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  navButtonGroup: { flexDirection: 'row', gap: 8, marginTop: 4 },
  segmentBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {},
  segmentText: { fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: 'white' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  stepperBtn: {
    height: 46,
    width: 76,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  freqValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
  },
  freqValueText: { fontSize: 22, fontWeight: '900' },
  queueStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  queueStatusText: { fontSize: 13, fontWeight: '600' },
  boldText: { fontWeight: '800' },
  btn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  syncBtn: { backgroundColor: '#10B981' },
  clearBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#F43F5E' },
  btnText: { fontSize: 15, fontWeight: '800', color: 'white' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  disabledBtn: {
    opacity: 0.6,
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
  segmentBtnActive: { backgroundColor: '#2E75B6', borderColor: '#2E75B6' },
  segmentText: { ...baseStyles.segmentText, color: '#475569' },
  freqValueText: { ...baseStyles.freqValueText, color: '#0F172A' },
  queueStatusText: { ...baseStyles.queueStatusText, color: '#334155' },
  inputLabel: { ...baseStyles.inputLabel, color: '#475569' },
  input: {
    ...baseStyles.input,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  stepperBtn: { ...baseStyles.stepperBtn, backgroundColor: '#2E75B6' },
  submitBtn: {
    ...baseStyles.submitBtn,
    backgroundColor: '#2E75B6',
  },
  disabledBtn: {
    ...baseStyles.disabledBtn,
  },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
  header: { ...baseStyles.header, color: '#FFFFFF' },
  section: {
    ...baseStyles.section,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  sectionTitle: { ...baseStyles.sectionTitle, color: '#FFFFFF' },
  label: { ...baseStyles.label, color: '#E2E8F0' },
  sublabel: { ...baseStyles.sublabel, color: '#94A3B8' },
  segmentBtn: { ...baseStyles.segmentBtn, borderColor: '#475569', backgroundColor: '#0B0F19' },
  segmentBtnActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  segmentText: { ...baseStyles.segmentText, color: '#94A3B8' },
  segmentTextActive: { ...baseStyles.segmentTextActive, color: '#0B0F19' },
  freqValueText: { ...baseStyles.freqValueText, color: '#FFFFFF' },
  queueStatusText: { ...baseStyles.queueStatusText, color: '#CBD5E1' },
  inputLabel: { ...baseStyles.inputLabel, color: '#94A3B8' },
  input: {
    ...baseStyles.input,
    borderColor: '#475569',
    backgroundColor: '#0B0F19',
    color: '#FFFFFF',
  },
  stepperBtn: { ...baseStyles.stepperBtn, backgroundColor: '#334155' },
  stepperBtnText: { ...baseStyles.stepperBtnText, color: '#E2E8F0' },
  submitBtn: {
    ...baseStyles.submitBtn,
    backgroundColor: '#38BDF8',
  },
  btnText: { ...baseStyles.btnText, color: '#0B0F19' },
  syncBtn: { ...baseStyles.syncBtn },
  clearBtn: { ...baseStyles.clearBtn },
  disabledBtn: {
    ...baseStyles.disabledBtn,
  },
} as any);
