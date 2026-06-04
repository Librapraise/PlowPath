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
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, type DriverSettings } from '../store/settingsStore';
import { flushAllQueues, getQueueDepths } from '../services/offline.service';
import { api } from '../services/api';

// Premium SVG icon helpers for menu settings
const VisualIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="5" />
    <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </Svg>
);

const NavIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const GpsIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const QueueIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
  </Svg>
);

const SecurityIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const ChevronRight = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

type SubScreen = 'menu' | 'visual' | 'navigation' | 'gps' | 'queue' | 'security';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { settings, loading, error, fetchSettings, updateSettings } = useSettingsStore();

  const [activeScreen, setActiveScreen] = useState<SubScreen>('menu');

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
      setActiveScreen('menu');
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

  const renderBackButton = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => setActiveScreen('menu')}
      accessibilityRole="button"
      accessibilityLabel="Back to settings menu"
    >
      <Text style={styles.backButtonText}>← Back to Settings</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Settings</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {activeScreen === 'menu' && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveScreen('visual')}
          >
            <View style={styles.menuIconWrapper}>
              <VisualIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Visual Preference</Text>
              <Text style={styles.menuItemSubtitle}>Dark mode & glare preferences</Text>
            </View>
            <ChevronRight color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveScreen('navigation')}
          >
            <View style={styles.menuIconWrapper}>
              <NavIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Default Navigation App</Text>
              <Text style={styles.menuItemSubtitle}>Choose Google Maps, Waze, etc.</Text>
            </View>
            <ChevronRight color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveScreen('gps')}
          >
            <View style={styles.menuIconWrapper}>
              <GpsIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>GPS Telemetry & Battery</Text>
              <Text style={styles.menuItemSubtitle}>Accuracy and sync frequencies</Text>
            </View>
            <ChevronRight color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveScreen('queue')}
          >
            <View style={styles.menuIconWrapper}>
              <QueueIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Queue & Cache Operations</Text>
              <Text style={styles.menuItemSubtitle}>Offline sync & route cleanups</Text>
            </View>
            <ChevronRight color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveScreen('security')}
          >
            <View style={styles.menuIconWrapper}>
              <SecurityIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
            </View>
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Account Security</Text>
              <Text style={styles.menuItemSubtitle}>Update account password</Text>
            </View>
            <ChevronRight color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>

          <Text style={styles.versionText}>PlowPath Version 0.1.0</Text>
        </View>
      )}

      {/* --- Visual Styling --- */}
      {activeScreen === 'visual' && (
        <View style={styles.section}>
          {renderBackButton()}
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
      )}

      {/* --- External Navigation --- */}
      {activeScreen === 'navigation' && (
        <View style={styles.section}>
          {renderBackButton()}
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
      )}

      {/* --- GPS Telemetry Settings --- */}
      {activeScreen === 'gps' && (
        <View style={styles.section}>
          {renderBackButton()}
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
      )}

      {/* --- Queue Operations Console --- */}
      {activeScreen === 'queue' && (
        <View style={styles.section}>
          {renderBackButton()}
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
      )}

      {/* --- Account Security --- */}
      {activeScreen === 'security' && (
        <View style={styles.section}>
          {renderBackButton()}
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
      )}

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
  menuContainer: { gap: 16 },
  menuItem: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  menuIconWrapper: {
    marginRight: 16,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  menuItemTextContainer: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '800' as any },
  menuItemSubtitle: { fontSize: 12, marginTop: 2 },
  backButton: {
    alignSelf: 'flex-start' as any,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  backButtonText: { fontSize: 13, fontWeight: '700' as any },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' as any, marginBottom: 12 },
  row: { flexDirection: 'row' as any, justifyContent: 'space-between' as any, alignItems: 'center' as any },
  labelContainer: { flex: 1, paddingRight: 10 },
  label: { fontSize: 15, fontWeight: '700' as any },
  sublabel: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  navButtonGroup: { flexDirection: 'row' as any, gap: 8, marginTop: 4 },
  segmentBtn: {
    flex: 1,
    height: 56, // glove-friendly segment heights
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  segmentBtnActive: {},
  segmentText: { fontSize: 14, fontWeight: '700' as any },
  segmentTextActive: { color: 'white' },
  stepperContainer: { flexDirection: 'row' as any, alignItems: 'center' as any, marginTop: 10 },
  stepperBtn: {
    height: 56, // glove-friendly stepper height
    width: 90,
    borderRadius: 12,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  stepperBtnText: { color: 'white', fontSize: 16, fontWeight: '800' as any },
  freqValueContainer: {
    flex: 1,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    height: 56,
  },
  freqValueText: { fontSize: 24, fontWeight: '900' as any },
  queueStatusRow: { flexDirection: 'row' as any, justifyContent: 'space-between' as any, marginBottom: 16 },
  queueStatusText: { fontSize: 13, fontWeight: '600' as any },
  boldText: { fontWeight: '800' as any },
  btn: {
    height: 56, // glove-friendly buttons
    borderRadius: 12,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    marginBottom: 12,
  },
  syncBtn: { backgroundColor: '#10B981' },
  clearBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#F43F5E' },
  btnText: { fontSize: 15, fontWeight: '800' as any, color: 'white' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center' as any,
    alignItems: 'center' as any,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700' as any,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  submitBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    marginTop: 12,
    marginBottom: 12,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  versionText: {
    textAlign: 'center' as any,
    fontSize: 12,
    marginTop: 32,
    fontWeight: '600' as any,
  },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  header: { ...baseStyles.header, color: '#0F172A' },
  menuItem: {
    ...baseStyles.menuItem,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  menuItemTitle: { ...baseStyles.menuItemTitle, color: '#0F172A' },
  menuItemSubtitle: { ...baseStyles.menuItemSubtitle, color: '#64748B' },
  menuIconWrapper: { ...baseStyles.menuIconWrapper, backgroundColor: '#E6F0FA' },
  backButton: {
    ...baseStyles.backButton,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  backButtonText: { ...baseStyles.backButtonText, color: '#475569' },
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
  versionText: {
    ...baseStyles.versionText,
    color: '#94A3B8',
  },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
  header: { ...baseStyles.header, color: '#FFFFFF' },
  menuItem: {
    ...baseStyles.menuItem,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  menuItemTitle: { ...baseStyles.menuItemTitle, color: '#FFFFFF' },
  menuItemSubtitle: { ...baseStyles.menuItemSubtitle, color: '#94A3B8' },
  menuIconWrapper: { ...baseStyles.menuIconWrapper, backgroundColor: '#0F172A' },
  backButton: {
    ...baseStyles.backButton,
    borderColor: '#475569',
    backgroundColor: '#0B0F19',
  },
  backButtonText: { ...baseStyles.backButtonText, color: '#94A3B8' },
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
  versionText: {
    ...baseStyles.versionText,
    color: '#475569',
  },
} as any);
