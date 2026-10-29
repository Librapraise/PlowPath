import React, { useEffect, useState, useRef } from 'react';
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
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Circle,
  Path,
  Rect,
  Stop,
  RadialGradient,
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
} from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, type DriverSettings } from '../store/settingsStore';
import { useTranslation } from '../services/i18n';
import { flushAllQueues, getQueueDepths } from '../services/offline.service';
import { api } from '../services/api';

// Premium SVG Icons (2px stroke weight)
const VisualIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="5" />
    <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </Svg>
);

const NavIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const GpsIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const QueueIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
  </Svg>
);

const SecurityIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const ChevronRight = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

// Gradient Button Helper using Svg
const GradientButton = ({
  onPress,
  text,
  disabled,
  icon,
  colors = ['#1D4ED8', '#3B82F6'],
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
        <Text style={[styles.gradientBtnText, { marginLeft: icon ? 8 : 0 }]}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Custom Slider component using PanResponder
const CustomSlider = ({
  value,
  onChange,
  min = 10,
  max = 120,
  step = 10,
  isDark,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isDark: boolean;
}) => {
  const [sliderWidth, setSliderWidth] = useState(250);

  const handleTouch = (x: number) => {
    const percentage = Math.max(0, Math.min(1, x / sliderWidth));
    const rawVal = min + percentage * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    onChange(Math.max(min, Math.min(max, steppedVal)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX),
    })
  ).current;

  const percentage = (value - min) / (max - min);

  return (
    <View
      style={styles.sliderOuterContainer}
      onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.sliderTrack,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,20,30,0.08)' },
        ]}
      >
        <View style={[styles.sliderTrackFilled, { width: `${percentage * 100}%` }]} />
      </View>
      <View
        style={[
          styles.sliderThumb,
          {
            left: `${percentage * 100}%`,
            borderColor: isDark ? '#1C2438' : 'rgba(0,0,0,0.15)',
          },
        ]}
      />
    </View>
  );
};

// Animated Floating Label Input
const FloatingLabelInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  isDark,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  isDark: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const focusAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: 'absolute' as const,
    left: 16,
    top: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -12],
    }),
    fontSize: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 13],
    }),
    fontWeight: '600' as any,
    color: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,20,30,0.4)',
        '#3B82F6',
      ],
    }),
    backgroundColor: isFocused || value ? (isDark ? '#161C29' : '#FFFFFF') : 'transparent',
    paddingHorizontal: 6,
    zIndex: 1,
  };

  return (
    <View style={styles.floatingInputWrapper}>
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <TextInput
        style={[
          styles.floatingTextInput,
          {
            borderColor: isFocused
              ? '#3B82F6'
              : isDark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(15,20,30,0.1)',
            color: isDark ? '#FFFFFF' : '#0F141E',
            backgroundColor: isDark ? '#161C29' : '#FFFFFF',
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPassword}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {secureTextEntry && (
        <TouchableOpacity
          style={styles.eyeToggleBtn}
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
        >
          {showPassword ? (
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#FFF' : '#0F141E'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
            </Svg>
          ) : (
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#FFF' : '#0F141E'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <Circle cx="12" cy="12" r="3" />
            </Svg>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

type SubScreen = 'menu' | 'visual' | 'navigation' | 'gps' | 'queue' | 'security' | 'language';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const navigation = useNavigation<any>();
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

  // Clear cache countdown safety state
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearCountdown, setClearCountdown] = useState(3);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchSettings();
    updateQueueDepths();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  const getInitials = (name: string) => {
    if (!name) return 'MP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Password strength logic
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    if (pwd.length < 6) return 1; // weak
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    if (pwd.length >= 8 && hasUpper && hasNumber && hasSpecial) return 4; // very strong
    if (pwd.length >= 6 && hasUpper && hasNumber) return 3; // strong
    return 2; // medium
  };

  const handleClearCacheCountdown = () => {
    if (confirmClear) {
      // Execute Cache Clear
      if (timerRef.current) clearInterval(timerRef.current);
      setConfirmClear(false);
      setClearCountdown(3);
      executeCacheClear();
    } else {
      setConfirmClear(true);
      setClearCountdown(3);
      timerRef.current = setInterval(() => {
        setClearCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setConfirmClear(false);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const executeCacheClear = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const routeKeys = allKeys.filter((key) => key.startsWith('plowpath.route.'));
      if (routeKeys.length > 0) {
        await AsyncStorage.multiRemove(routeKeys);
        Alert.alert(
          locale === 'fr-QC' ? 'Cache vidée' : 'Cache Cleared',
          locale === 'fr-QC'
            ? `Réussite de la suppression de ${routeKeys.length} trajet(s) en cache.`
            : `Successfully removed ${routeKeys.length} cached route(s).`
        );
      } else {
        Alert.alert(
          locale === 'fr-QC' ? 'Nettoyage de cache' : 'Cache Clean',
          locale === 'fr-QC' ? 'Aucun trajet en cache trouvé.' : 'No cached routes found.'
        );
      }
    } catch (err: any) {
      Alert.alert(
        locale === 'fr-QC' ? 'Erreur' : 'Error',
        (locale === 'fr-QC' ? 'Échec du vidage de cache : ' : 'Failed to clear cache: ') + err?.message
      );
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        locale === 'fr-QC' ? 'Erreur de validation' : 'Validation Error',
        locale === 'fr-QC' ? 'Tous les champs de mot de passe sont requis.' : 'All password fields are required.'
      );
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        locale === 'fr-QC' ? 'Erreur de validation' : 'Validation Error',
        locale === 'fr-QC' ? 'Le nouveau mot de passe doit faire au moins 6 caractères.' : 'New password must be at least 6 characters.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        locale === 'fr-QC' ? 'Erreur de validation' : 'Validation Error',
        locale === 'fr-QC' ? 'Le mot de passe de confirmation correspond pas, t\'sais.' : 'Confirm password does not match new password.'
      );
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      Alert.alert(
        locale === 'fr-QC' ? 'Succès' : 'Success',
        locale === 'fr-QC' ? 'Mot de passe mis à jour avec succès!' : 'Password updated successfully!'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveScreen('menu');
    } catch (err: any) {
      const defaultMsg = locale === 'fr-QC'
        ? 'Échec de la modification du mot de passe. Réessaie, t\'sais.'
        : 'Failed to update password. Please check your current password and try again.';
      const msg = err?.response?.data?.error?.message ?? defaultMsg;
      Alert.alert(locale === 'fr-QC' ? 'Erreur' : 'Error', msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSelectThemeMode = (mode: 'light' | 'dark' | 'auto') => {
    updateSettings({ theme_mode: mode });
  };

  const handleSelectNavApp = (app: DriverSettings['navigation_app']) => {
    updateSettings({ navigation_app: app });
  };

  const handleSelectAccuracy = (accuracy: DriverSettings['tracking_accuracy']) => {
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
      Alert.alert(
        locale === 'fr-QC' ? 'Erreur' : 'Error',
        locale === 'fr-QC' ? 'Aucun identifiant de chauffeur associé.' : 'No driver ID associated with this account.'
      );
      return;
    }
    setSyncing(true);
    try {
      await flushAllQueues(user.driver_id);
      await updateQueueDepths();
      Alert.alert(
        locale === 'fr-QC' ? 'Synchro terminée' : 'Sync Complete',
        locale === 'fr-QC'
          ? 'Les files d\'attente locales ont été synchronisées avec succès.'
          : 'Offline database queues have been flushed successfully.'
      );
    } catch (err: any) {
      Alert.alert(
        locale === 'fr-QC' ? 'Synchro échouée' : 'Sync Failed',
        err?.message || (locale === 'fr-QC' ? 'Échec de la synchro. Es-tu hors ligne?' : 'Failed to sync. Are you still offline?')
      );
    } finally {
      setSyncing(false);
    }
  };

  const isDark = settings.theme === 'dark';
  const resolvedStyles = isDark ? darkStyles : lightStyles;
  const currentThemeMode = settings.theme_mode || 'light';

  // Sub-page Back + Title Header Pattern
  const renderSubHeader = (title: string) => (
    <View style={[resolvedStyles.headerRow, { paddingTop: Math.max(insets.top + 8, 12) }]}>
      <TouchableOpacity
        style={resolvedStyles.headerBackBtn}
        onPress={() => setActiveScreen('menu')}
        accessibilityRole="button"
        accessibilityLabel="Back to settings menu"
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
      <Text style={resolvedStyles.headerTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F141E' : '#F4F6FA' }}>
      {/* Background SVG mesh gradient */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient id="grad1" cx="90%" cy="10%" rx="75%" ry="75%">
            <Stop offset="0%" stopColor={isDark ? '#00D2FF' : '#0EA5E9'} stopOpacity={isDark ? 0.25 : 0.12} />
            <Stop offset="100%" stopColor={isDark ? '#00D2FF' : '#0EA5E9'} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="grad2" cx="10%" cy="80%" rx="80%" ry="80%">
            <Stop offset="0%" stopColor={isDark ? '#7928CA' : '#C084FC'} stopOpacity={isDark ? 0.20 : 0.10} />
            <Stop offset="100%" stopColor={isDark ? '#7928CA' : '#C084FC'} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
      </Svg>

      <ScrollView style={resolvedStyles.container} contentContainerStyle={resolvedStyles.contentContainer}>
        {activeScreen === 'menu' ? (
          <View style={[resolvedStyles.headerRow, { paddingTop: Math.max(insets.top + 8, 12) }]}>
            {/* Added back button for the main Settings screen as requested */}
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
             <Text style={resolvedStyles.headerTitle}>{t('settingsTitle')}</Text>
            {/* Driver initials avatar top-right */}
            <View style={[styles.avatarCircle, { backgroundColor: '#1D4ED8' }]}>
              <Text style={styles.avatarText}>{getInitials(user?.name || '')}</Text>
            </View>
          </View>
        ) : (
          renderSubHeader(
            activeScreen === 'visual'
              ? t('displayAppearance')
              : activeScreen === 'navigation'
                ? t('defaultNav')
                : activeScreen === 'gps'
                  ? t('gpsBattery')
                  : activeScreen === 'queue'
                    ? t('syncCache')
                    : activeScreen === 'language'
                      ? t('languageLabel')
                      : t('accountSecurity')
          )
        )}

        {error ? <Text style={resolvedStyles.errorText}>{error}</Text> : null}

        {/* --- SCREEN 1: Settings Main List --- */}
        {activeScreen === 'menu' && (
          <View style={resolvedStyles.menuCard}>
            <TouchableOpacity style={resolvedStyles.menuItem} onPress={() => setActiveScreen('visual')}>
              <View style={[styles.menuIconWrapper, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <VisualIcon color="#F59E0B" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={resolvedStyles.menuItemTitle}>{t('displayAppearance')}</Text>
                <Text style={resolvedStyles.menuItemSubtitle}>{t('displayAppearanceDesc')}</Text>
              </View>
              <ChevronRight color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,20,30,0.25)'} />
            </TouchableOpacity>
            <View style={resolvedStyles.menuDivider} />

            <TouchableOpacity style={resolvedStyles.menuItem} onPress={() => setActiveScreen('navigation')}>
              <View style={[styles.menuIconWrapper, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <NavIcon color="#3B82F6" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={resolvedStyles.menuItemTitle}>{t('defaultNav')}</Text>
                <Text style={resolvedStyles.menuItemSubtitle}>{t('defaultNavDesc')}</Text>
              </View>
              <ChevronRight color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,20,30,0.25)'} />
            </TouchableOpacity>
            <View style={resolvedStyles.menuDivider} />

            <TouchableOpacity style={resolvedStyles.menuItem} onPress={() => setActiveScreen('gps')}>
              <View style={[styles.menuIconWrapper, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <GpsIcon color="#22C55E" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={resolvedStyles.menuItemTitle}>{t('gpsBattery')}</Text>
                <Text style={resolvedStyles.menuItemSubtitle}>{t('gpsBatteryDesc')}</Text>
              </View>
              <ChevronRight color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,20,30,0.25)'} />
            </TouchableOpacity>
            <View style={resolvedStyles.menuDivider} />

            <TouchableOpacity style={resolvedStyles.menuItem} onPress={() => setActiveScreen('queue')}>
              <View style={[styles.menuIconWrapper, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                <QueueIcon color="#8B5CF6" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={resolvedStyles.menuItemTitle}>{t('syncCache')}</Text>
                <Text style={resolvedStyles.menuItemSubtitle}>{t('syncCacheDesc')}</Text>
              </View>
              <ChevronRight color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,20,30,0.25)'} />
            </TouchableOpacity>
            <View style={resolvedStyles.menuDivider} />

            <TouchableOpacity style={resolvedStyles.menuItem} onPress={() => setActiveScreen('language')}>
              <View style={[styles.menuIconWrapper, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx="12" cy="12" r="10" />
                  <Path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </Svg>
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={resolvedStyles.menuItemTitle}>{t('languageLabel')}</Text>
                <Text style={resolvedStyles.menuItemSubtitle}>{t('languageDesc')}</Text>
              </View>
              <ChevronRight color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,20,30,0.25)'} />
            </TouchableOpacity>
            <View style={resolvedStyles.menuDivider} />

            <TouchableOpacity style={resolvedStyles.menuItem} onPress={() => setActiveScreen('security')}>
              <View style={[styles.menuIconWrapper, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <SecurityIcon color="#EF4444" />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={resolvedStyles.menuItemTitle}>{t('accountSecurity')}</Text>
                <Text style={resolvedStyles.menuItemSubtitle}>{t('accountSecurityDesc')}</Text>
              </View>
              <ChevronRight color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,20,30,0.25)'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={resolvedStyles.logoutBtn}
              onPress={() => {
                Alert.alert(
                  t('logoutConfirmTitle'),
                  t('logoutConfirmDesc'),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('signOut'),
                      style: 'destructive',
                      onPress: () => useAuthStore.getState().logout(),
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </Svg>
              <Text style={resolvedStyles.logoutBtnText}>{t('signOut')}</Text>
            </TouchableOpacity>

            <Text style={resolvedStyles.versionText}>{t('version')} 0.1.0</Text>
          </View>
        )}

        {/* --- SCREEN 2: Display & Appearance --- */}
        {activeScreen === 'visual' && (
          <View style={styles.gap16}>
            <View style={resolvedStyles.card}>
              {/* Theme Selector */}
              <View style={styles.marginBottom20}>
                <Text style={resolvedStyles.label}>{t('themeLabel')}</Text>
                <Text style={resolvedStyles.sublabel}>{t('themeDesc')}</Text>
                <View style={[styles.pillSegmentTrack, { backgroundColor: isDark ? '#0F141E' : '#E2E8F0' }]}>
                  {(['light', 'dark', 'auto'] as const).map((m) => {
                    const active = currentThemeMode === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.pillSegmentBtn, active && styles.pillSegmentBtnActive]}
                        onPress={() => handleSelectThemeMode(m)}
                      >
                        <Text style={[
                          styles.pillSegmentText,
                          { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,20,30,0.4)' },
                          active && styles.pillSegmentTextActive
                        ]}>
                          {m.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Night Mode Glare Toggle */}
              <View style={[resolvedStyles.row, styles.paddingVertical12]}>
                <View style={styles.flex1}>
                  <Text style={resolvedStyles.label}>{t('nightMode')}</Text>
                  <Text style={resolvedStyles.sublabel}>{t('nightModeDesc')}</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={(val) => handleSelectThemeMode(val ? 'dark' : 'light')}
                  trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Map Contrast Toggle */}
              <View style={[resolvedStyles.row, styles.paddingVertical12]}>
                <View style={styles.flex1}>
                  <Text style={resolvedStyles.label}>{t('highContrast')}</Text>
                  <Text style={resolvedStyles.sublabel}>{t('highContrastDesc')}</Text>
                </View>
                <Switch
                  value={settings.high_contrast_map || false}
                  onValueChange={(val) => updateSettings({ high_contrast_map: val })}
                  trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Live Preview Swatch */}
            <View style={resolvedStyles.card}>
              <Text style={resolvedStyles.labelCaps}>{t('livePreview')}</Text>
              <View style={[styles.previewSwatch, { backgroundColor: isDark ? '#0F141E' : '#F4F6FA' }]}>
                <View style={[styles.previewMockCard, { backgroundColor: isDark ? '#161C29' : '#FFFFFF' }]}>
                  <Text style={[styles.previewText, { color: isDark ? '#FFFFFF' : '#0F141E', fontSize: 15, fontWeight: '700' }]}>
                    {locale === 'fr-QC' ? 'Trajet #42 — Arrêt actif' : 'Route #42 — Active Stop'}
                  </Text>
                  <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,20,30,0.5)', fontSize: 12, marginTop: 4 }}>
                    {locale === 'fr-QC' ? '42 ch. Plowman (En attente)' : '42 Plowman Way (Pending)'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* --- SCREEN 3: Default Navigation App --- */}
        {activeScreen === 'navigation' && (
          <View style={resolvedStyles.card}>
            <Text style={resolvedStyles.label}>{t('navToolLabel')}</Text>
            <Text style={resolvedStyles.sublabel}>{t('navToolDesc')}</Text>

            <View style={styles.gap12}>
              {(['google_maps', 'apple_maps', 'waze'] as const).map((app) => {
                const selected = settings.navigation_app === app;
                const appName = app === 'google_maps' ? 'Google Maps' : app === 'apple_maps' ? 'Apple Maps' : 'Waze';
                const appSub =
                  app === 'google_maps'
                    ? (locale === 'fr-QC' ? 'Recommandé pour le trafic en direct' : 'Best for live traffic')
                    : app === 'apple_maps'
                    ? (locale === 'fr-QC' ? 'Recommandé pour les appareils Apple' : 'Best for Apple devices')
                    : (locale === 'fr-QC' ? 'Recommandé pour les alertes de danger' : 'Best for hazard alerts');

                return (
                  <TouchableOpacity
                    key={app}
                    style={[
                      resolvedStyles.appNavCard,
                      selected && resolvedStyles.appNavCardSelected,
                    ]}
                    onPress={() => handleSelectNavApp(app)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.appIconContainer}>
                      {app === 'google_maps' && (
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                          <Circle cx="12" cy="10" r="3" />
                        </Svg>
                      )}
                      {app === 'apple_maps' && (
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
                          <Circle cx="12" cy="12" r="3" />
                        </Svg>
                      )}
                      {app === 'waze' && (
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M18 10a6 6 0 1 0-12 0c0 4.97 4 9 9 9h3" />
                          <Circle cx={8} cy={16} r={1.5} />
                          <Circle cx={16} cy={16} r={1.5} />
                        </Svg>
                      )}
                    </View>

                    <View style={styles.flex1}>
                      <Text style={resolvedStyles.appNavTitle}>{appName}</Text>
                      <Text style={resolvedStyles.appNavSub}>{appSub}</Text>
                    </View>

                    <View style={styles.radioContainer}>
                      <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={resolvedStyles.infoStrip}>
              <Text style={resolvedStyles.infoStripText}>
                ℹ {t('navToolInfo')}
              </Text>
            </View>
          </View>
        )}

        {/* --- SCREEN 4: GPS & Battery --- */}
        {activeScreen === 'gps' && (
          <View style={styles.gap16}>
            {/* Accuracy Modes */}
            <View style={resolvedStyles.card}>
              <Text style={resolvedStyles.label}>{t('locationAccuracy')}</Text>
              <Text style={resolvedStyles.sublabel}>
                {t('locationAccuracyDesc')}
              </Text>

              <View style={resolvedStyles.accuracyRow}>
                {/* High Precision Card */}
                <TouchableOpacity
                  style={[
                    resolvedStyles.accuracyCard,
                    settings.tracking_accuracy === 'high' && resolvedStyles.accuracyCardSelectedBlue,
                  ]}
                  onPress={() => handleSelectAccuracy('high')}
                  activeOpacity={0.8}
                >
                  <View style={styles.accuracyCardHeader}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx="12" cy="12" r="10" />
                      <Path d="M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10" />
                    </Svg>
                    <View style={[styles.dotIndicator, { backgroundColor: '#3B82F6' }]} />
                  </View>
                  <Text style={resolvedStyles.accuracyTitle}>{t('highPrecision')}</Text>
                  <Text style={resolvedStyles.accuracySub}>{t('highPrecisionDesc')}</Text>
                </TouchableOpacity>

                {/* Power Saver Card */}
                <TouchableOpacity
                  style={[
                    resolvedStyles.accuracyCard,
                    settings.tracking_accuracy === 'power_saver' && resolvedStyles.accuracyCardSelectedGreen,
                  ]}
                  onPress={() => handleSelectAccuracy('power_saver')}
                  activeOpacity={0.8}
                >
                  <View style={styles.accuracyCardHeader}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
                      <Line x1="22" y1="11" x2="22" y2="13" />
                    </Svg>
                    <View style={[styles.dotIndicator, { backgroundColor: '#22C55E' }]} />
                  </View>
                  <Text style={resolvedStyles.accuracyTitle}>{t('powerSaver')}</Text>
                  <Text style={resolvedStyles.accuracySub}>{t('powerSaverDesc')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Upload Frequency Slider */}
            <View style={resolvedStyles.card}>
              <Text style={resolvedStyles.label}>{t('telemetryLabel')}</Text>
              <Text style={resolvedStyles.sublabel}>{t('uploadFreq', { seconds: settings.upload_frequency_seconds })}</Text>

              <View style={styles.center}>
                <Text style={resolvedStyles.labelCaps}>{locale === 'fr-QC' ? 'INTERVALLE' : 'UPDATE EVERY'}</Text>
                <Text style={resolvedStyles.statNumber}>{settings.upload_frequency_seconds}s</Text>
              </View>

              <CustomSlider
                value={settings.upload_frequency_seconds}
                onChange={(val) => updateSettings({ upload_frequency_seconds: val })}
                isDark={isDark}
              />

              <View style={[resolvedStyles.row, styles.stepperWrap]}>
                <TouchableOpacity
                  style={resolvedStyles.stepperOutlinedBtn}
                  onPress={() => handleAdjustFrequency(-10)}
                  activeOpacity={0.7}
                >
                  <Text style={resolvedStyles.stepperBtnText}>- 10s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={resolvedStyles.stepperOutlinedBtn}
                  onPress={() => handleAdjustFrequency(10)}
                  activeOpacity={0.7}
                >
                  <Text style={resolvedStyles.stepperBtnText}>+ 10s</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* --- SCREEN 5: Sync & Cache --- */}
        {activeScreen === 'queue' && (
          <View style={styles.gap16}>
            <View style={resolvedStyles.card}>
              <View style={resolvedStyles.row}>
                <Text style={resolvedStyles.label}>{t('syncStatus')}</Text>
                <View style={[
                  styles.syncBadge,
                  { backgroundColor: (gpsCount + stopCount > 0) ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)' }
                ]}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '900',
                    color: (gpsCount + stopCount > 0) ? '#F59E0B' : '#22C55E',
                  }}>
                    {(gpsCount + stopCount > 0)
                      ? ('● ' + (locale === 'fr-QC' ? 'EN ATTENTE' : 'PENDING'))
                      : ('● ' + (locale === 'fr-QC' ? 'SYNCHRONISÉ' : 'SYNCED'))}
                  </Text>
                </View>
              </View>
              <Text style={resolvedStyles.sublabel}>
                {t('syncCacheDesc')}
              </Text>

              {/* GPS and Stop Update stats as chips - premium icons updated */}
              <View style={resolvedStyles.statsChipsRow}>
                <View style={resolvedStyles.statChip}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4" />
                  </Svg>
                  <View style={styles.statChipCol}>
                    <Text style={resolvedStyles.statChipVal}>{gpsCount}</Text>
                    <Text style={resolvedStyles.statChipLabel}>{t('queuedGps')}</Text>
                  </View>
                </View>

                <View style={resolvedStyles.statChip}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <Circle cx="12" cy="10" r="3" />
                  </Svg>
                  <View style={styles.statChipCol}>
                    <Text style={resolvedStyles.statChipVal}>{stopCount}</Text>
                    <Text style={resolvedStyles.statChipLabel}>{t('queuedStops')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.marginTop16}>
                <GradientButton
                  text={syncing ? (locale === 'fr-QC' ? 'Synchro...' : 'Syncing...') : t('syncNow')}
                  onPress={handleForceSync}
                  disabled={syncing || (gpsCount + stopCount === 0)}
                  colors={['#10B981', '#22C55E']}
                  icon={
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                    </Svg>
                  }
                />
              </View>
            </View>

            {/* Local Route Storage */}
            <View style={resolvedStyles.card}>
              <Text style={resolvedStyles.label}>{t('clearCache')}</Text>
              <Text style={resolvedStyles.sublabel}>
                {t('clearCacheDesc')}
              </Text>

              {/* Progress Storage Bar */}
              <View style={styles.marginBottom20}>
                <View style={[resolvedStyles.row, styles.marginBottom6]}>
                  <Text style={resolvedStyles.labelCaps}>{locale === 'fr-QC' ? 'ESPACE UTILISÉ' : 'STORAGE USED'}</Text>
                  <Text style={resolvedStyles.appNavSub}>4.2 MB / 50.0 MB</Text>
                </View>
                <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,20,30,0.06)' }]}>
                  <View style={[styles.progressBarFilled, { width: '8.4%' }]} />
                </View>
              </View>

              {/* Outlined Danger Button with 3s Countdown Confirm */}
               <TouchableOpacity
                 style={[
                   resolvedStyles.clearCacheBtn,
                   confirmClear && { backgroundColor: 'rgba(239,68,68,0.1)' },
                 ]}
                 onPress={handleClearCacheCountdown}
                 activeOpacity={0.7}
               >
                 <Text style={resolvedStyles.clearCacheBtnText}>
                   {confirmClear ? t('confirmClearCacheBtn', { count: clearCountdown }) : t('clearCacheBtn')}
                 </Text>
               </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- SCREEN 6: Account Security --- */}
        {activeScreen === 'security' && (
          <View style={styles.gap16}>
            {/* Identity Strip */}
            <View style={[resolvedStyles.row, styles.identityStrip]}>
              <View style={[styles.avatarCircle, { backgroundColor: '#1D4ED8', width: 40, height: 40 }]}>
                <Text style={[styles.avatarText, { fontSize: 14 }]}>{getInitials(user?.name || '')}</Text>
              </View>
              <View style={styles.identityDetails}>
                <Text style={resolvedStyles.identityName}>{user?.name || 'Mike Plowman'}</Text>
                <Text style={resolvedStyles.identityEmail}>{user?.email || 'mike@domain.com'}</Text>
              </View>
            </View>

            {/* Password Update Form Card */}
            <View style={resolvedStyles.card}>
              <Text style={resolvedStyles.label}>{t('securityLabel')}</Text>
              <Text style={resolvedStyles.sublabel}>{t('accountSecurityDesc')}</Text>

              <View style={styles.formContainer}>
                <FloatingLabelInput
                  label={t('currentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={true}
                  isDark={isDark}
                />

                <FloatingLabelInput
                  label={t('newPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={true}
                  isDark={isDark}
                />

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarsRow}>
                      {[1, 2, 3, 4].map((index) => {
                        const strength = getPasswordStrength(newPassword);
                        let barColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,20,30,0.06)';
                        if (index <= strength) {
                          if (strength === 1) barColor = '#EF4444'; // Red
                          else if (strength === 2) barColor = '#F59E0B'; // Amber
                          else barColor = '#22C55E'; // Green
                        }
                        return <View key={index} style={[styles.strengthBar, { backgroundColor: barColor }]} />;
                      })}
                    </View>
                    <Text style={[resolvedStyles.appNavSub, { marginTop: 4, fontWeight: '700' }]}>
                      {getPasswordStrength(newPassword) === 1 && (locale === 'fr-QC' ? 'Mot de passe faible' : 'Weak password')}
                      {getPasswordStrength(newPassword) === 2 && (locale === 'fr-QC' ? 'Force moyenne' : 'Medium strength')}
                      {getPasswordStrength(newPassword) === 3 && (locale === 'fr-QC' ? 'Mot de passe fort' : 'Strong password')}
                      {getPasswordStrength(newPassword) === 4 && (locale === 'fr-QC' ? 'Très sécuritaire!' : 'Very secure!')}
                    </Text>
                  </View>
                )}

                <FloatingLabelInput
                  label={t('confirmPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={true}
                  isDark={isDark}
                />
              </View>

              <View style={styles.marginTop20}>
                <GradientButton
                  text={updatingPassword ? t('updatingPassword') : t('changePasswordBtn')}
                  onPress={handleChangePassword}
                  disabled={updatingPassword}
                  icon={
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </Svg>
                  }
                />
              </View>
            </View>

            {/* DANGER ZONE Card */}
            <View style={resolvedStyles.dangerCard}>
              <Text style={resolvedStyles.dangerLabel}>{locale === 'fr-QC' ? '⚠ ZONE DE DANGER' : '⚠ DANGER ZONE'}</Text>
              <Text style={resolvedStyles.dangerSub}>
                {locale === 'fr-QC'
                  ? 'Supprimer ton compte va effacer définitivement tous tes trajets assignés et tes journaux de télémétrie. Cette action est irréversible.'
                  : 'Deleting your account will purge all active route assignments and historical telemetry logs permanently. This cannot be undone.'}
              </Text>
              <TouchableOpacity
                style={resolvedStyles.deleteBtn}
                onPress={() => {
                  Alert.alert(
                    locale === 'fr-QC' ? 'Supprimer le compte et les données' : 'Delete Account & Data',
                    locale === 'fr-QC'
                      ? 'Pour supprimer ton compte et toutes tes données de télémétrie, envoie une demande par courriel à notre équipe de soutien.'
                      : 'To delete your account and all telemetry data, send an email request to our support team.',
                    [
                      { text: t('cancel'), style: 'cancel' },
                      {
                        text: locale === 'fr-QC' ? 'Envoyer un courriel au soutien' : 'Email Support',
                        onPress: () => {
                          Linking.openURL(
                            'mailto:support@plowpath.ca?subject=PlowPath%20Data%2520Deletion%2520Request&body=Please%2520delete%2520my%2520PlowPath%2520account%2520and%2520all%2520associated%2520data.%250A%250ARegistered%2520Email%253A%2520' + encodeURIComponent(user?.email || '')
                          );
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={resolvedStyles.deleteBtnText}>{locale === 'fr-QC' ? 'Supprimer le compte et les données' : 'Delete Account & Data'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- SCREEN 7: Language Selection --- */}
        {activeScreen === 'language' && (
          <View style={resolvedStyles.card}>
            <Text style={resolvedStyles.label}>{t('languageLabel')}</Text>
            <Text style={resolvedStyles.sublabel}>{t('languageDesc')}</Text>

            <View style={styles.gap12}>
              {(['fr-QC', 'en-CA', 'en-US', 'en-GB'] as const).map((lang) => {
                const selected = settings.language === lang;
                const langName =
                  lang === 'fr-QC'
                    ? 'Français (Québec)'
                    : lang === 'en-CA'
                    ? 'English (Canada)'
                    : lang === 'en-US'
                    ? 'English (United States)'
                    : 'English (United Kingdom)';
                const langRegion =
                  lang === 'fr-QC'
                    ? 'Par défaut'
                    : lang === 'en-CA'
                    ? 'Canadian spelling'
                    : lang === 'en-US'
                    ? 'US spelling'
                    : 'UK spelling';

                return (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      resolvedStyles.appNavCard,
                      selected && resolvedStyles.appNavCardSelected,
                    ]}
                    onPress={() => updateSettings({ language: lang })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.appIconContainer}>
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#FFF' : '#0F141E'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </Svg>
                    </View>

                    <View style={styles.flex1}>
                      <Text style={resolvedStyles.appNavTitle}>{langName}</Text>
                      <Text style={resolvedStyles.appNavSub}>{langRegion}</Text>
                    </View>

                    <View style={styles.radioContainer}>
                      <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {loading ? (
        <View style={resolvedStyles.overlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : null}
    </View>
  );
}

// Styling tokens shared across modes
const styles = StyleSheet.create({
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  gap16: {
    gap: 16,
  },
  gap12: {
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marginBottom20: {
    marginBottom: 20,
  },
  marginBottom6: {
    marginBottom: 6,
  },
  paddingVertical12: {
    paddingVertical: 12,
  },
  pillSegmentTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  pillSegmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSegmentBtnActive: {
    backgroundColor: '#3B82F6',
  },
  pillSegmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  pillSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewSwatch: {
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  previewMockCard: {
    borderRadius: 10,
    padding: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  previewText: {
    fontSize: 14,
  },
  appIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 14,
  },
  radioContainer: {
    paddingLeft: 12,
    justifyContent: 'center',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3B82F6',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accuracyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  sliderOuterContainer: {
    marginVertical: 18,
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    flexDirection: 'row',
  },
  sliderTrackFilled: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  sliderThumb: {
    position: 'absolute',
    marginLeft: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  stepperWrap: {
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statChipCol: {
    marginLeft: 10,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
  },
  progressBarFilled: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  identityStrip: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  identityDetails: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  floatingInputWrapper: {
    position: 'relative',
    marginVertical: 10,
    justifyContent: 'center',
  },
  floatingTextInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingRight: 44,
    fontSize: 16,
  },
  eyeToggleBtn: {
    position: 'absolute',
    right: 14,
    height: 52,
    justifyContent: 'center',
  },
  strengthContainer: {
    marginVertical: 6,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  formContainer: {
    marginVertical: 8,
  },
  gradientBtnContainer: {
    height: 52,
    borderRadius: 14,
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
    fontSize: 16,
  },
  marginTop16: {
    marginTop: 16,
  },
  marginTop20: {
    marginTop: 20,
  },
  marginTop8: {
    marginTop: 8,
  },
  marginBottom24: {
    marginBottom: 24,
  },
  marginTop32: {
    marginTop: 32,
  },
  marginRight16: {
    marginRight: 16,
  },
});

// Styling for Light Mode
const lightStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
    paddingBottom: 12,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#0F141E',
    flex: 1,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#0F141E',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    height: 72,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F141E',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: 'rgba(15,20,30,0.5)',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(15,20,30,0.05)',
    marginHorizontal: 16,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(15,20,30,0.3)',
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F141E',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F141E',
  },
  sublabel: {
    fontSize: 14,
    color: 'rgba(15,20,30,0.5)',
    marginTop: 4,
    lineHeight: 20,
    marginBottom: 12,
  },
  labelCaps: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(15,20,30,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 76,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,20,30,0.08)',
  },
  appNavCardSelected: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  appNavTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F141E',
  },
  appNavSub: {
    fontSize: 13,
    color: 'rgba(15,20,30,0.5)',
    marginTop: 2,
  },
  infoStrip: {
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.07)',
    padding: 12,
    marginTop: 16,
  },
  infoStripText: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '500',
    lineHeight: 18,
  },
  accuracyRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  accuracyCard: {
    flex: 1,
    borderRadius: 14,
    minHeight: 110,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,20,30,0.08)',
  },
  accuracyCardSelectedBlue: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  accuracyCardSelectedGreen: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  accuracyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F141E',
    marginTop: 4,
  },
  accuracySub: {
    fontSize: 12,
    color: 'rgba(15,20,30,0.5)',
    marginTop: 2,
  },
  statNumber: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0F141E',
    marginVertical: 4,
  },
  stepperOutlinedBtn: {
    height: 38,
    width: 68,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(15,20,30,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F141E',
  },
  statsChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(15,20,30,0.04)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statChipVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F141E',
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(15,20,30,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearCacheBtn: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  clearCacheBtnText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  identityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F141E',
  },
  identityEmail: {
    fontSize: 14,
    color: 'rgba(15,20,30,0.5)',
  },
  dangerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  dangerSub: {
    fontSize: 13,
    color: 'rgba(15,20,30,0.5)',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  deleteBtnText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    backgroundColor: 'transparent',
    marginTop: 8,
    marginHorizontal: 16,
  },
  logoutBtnText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
} as any);

// Styling for Dark Mode
const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
    paddingBottom: 12,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: '#161C29',
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    height: 72,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#161C29',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sublabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    lineHeight: 20,
    marginBottom: 12,
  },
  labelCaps: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 76,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  appNavCardSelected: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  appNavTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appNavSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  infoStrip: {
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.07)',
    padding: 12,
    marginTop: 16,
  },
  infoStripText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    lineHeight: 18,
  },
  accuracyRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  accuracyCard: {
    flex: 1,
    borderRadius: 14,
    minHeight: 110,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accuracyCardSelectedBlue: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  accuracyCardSelectedGreen: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  accuracyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  accuracySub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  statNumber: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  stepperOutlinedBtn: {
    height: 38,
    width: 68,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statChipVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearCacheBtn: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  clearCacheBtnText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  identityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  identityEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
  dangerCard: {
    backgroundColor: '#161C29',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  dangerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  deleteBtnText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    backgroundColor: 'transparent',
    marginTop: 8,
    marginHorizontal: 16,
  },
  logoutBtnText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
} as any);
