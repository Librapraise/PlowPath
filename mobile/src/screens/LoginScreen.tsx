import AppText from '../components/AppText';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  Easing,
  Modal,
  TouchableWithoutFeedback,
  KeyboardTypeOptions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Rect, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { api } from '../services/api';
import { useAuthStore, type AuthUser } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTranslation } from '../services/i18n';
import { pushService } from '../services/push.service';

// Icons
const ShieldCheckIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="M9 11l2 2 4-4" />
  </Svg>
);

const LockIcon = ({ color, size = 28, strokeWidth = 2.5 }: { color: string; size?: number; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <Circle cx="12" cy="16" r="1.5" fill={color} />
  </Svg>
);

const ChevronDownIcon = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 9l6 6 6-6" />
  </Svg>
);

const PhoneIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <Path d="M12 18h.01" />
  </Svg>
);

const MailIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
);

const BackChevron = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5M12 5l-7 7 7 7" />
  </Svg>
);

const EyeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const EyeOffIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <Path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <Path d="M2 2l20 20" />
  </Svg>
);

const TruckIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8M14 2v16M20 8l3 3v7h-9M16 18h-2" />
    <Circle cx="7.5" cy="18.5" r="2.5" />
    <Circle cx="18.5" cy="18.5" r="2.5" />
  </Svg>
);

const LogoMark = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 19L20 5M4 5l16 14" />
    <Circle cx="4" cy="5" r="2" fill="#FFFFFF" />
    <Circle cx="20" cy="5" r="2" fill="#FFFFFF" />
    <Circle cx="4" cy="19" r="2" fill="#FFFFFF" />
    <Circle cx="20" cy="19" r="2" fill="#FFFFFF" />
  </Svg>
);

const GlobeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Svg>
);

const VEHICLE_OPTIONS = [
  'Light Duty Pickup',
  'Medium Duty Plow',
  'Heavy Duty Salt Spreader',
  'Tractor/Loader',
];

const COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', code: '+1' },
  { name: 'Canada', flag: '🇨🇦', code: '+1' },
  { name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
  { name: 'Australia', flag: '🇦🇺', code: '+61' },
];

// Custom Premium Gradient Button with Touch-scale interaction
const PremiumGradientButton = ({
  onPress,
  text,
  disabled,
  loading,
  icon,
}: {
  onPress: () => void;
  text: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}) => {
  const scaleVal = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleVal, {
      toValue: 0.97,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleVal, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleVal }], opacity: disabled ? 0.6 : 1 }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.gradientBtn}
        activeOpacity={0.9}
        accessibilityRole="button"
      >
        <Svg style={StyleSheet.absoluteFillObject}>
          <Defs>
            <SvgLinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1D4ED8" />
              <Stop offset="100%" stopColor="#3B82F6" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={14} fill="url(#btnGrad)" />
        </Svg>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <View style={styles.gradientBtnContent}>
            {icon && <View style={styles.gradientBtnIcon}>{icon}</View>}
            <AppText style={styles.gradientBtnText}>{text}</AppText>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Custom Premium Outlined Secondary Button
const OutlinedSecondaryButton = ({
  onPress,
  text,
}: {
  onPress: () => void;
  text: string;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.outlinedBtn}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <AppText style={styles.outlinedBtnText}>{text}</AppText>
    </TouchableOpacity>
  );
};

// Reusable Custom Styled TextInput Component with dynamic focus states and uppercase label
const RefinedInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  rightAction,
  leftAction,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
}) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.10)', '#3B82F6'],
  });

  const backgroundColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.05)', 'rgba(59,130,246,0.06)'],
  });

  return (
    <View style={styles.inputWrapper}>
      <AppText style={styles.inputLabel}>{label}</AppText>
      <Animated.View
        style={[
          styles.refinedInputContainer,
          {
            borderColor,
            backgroundColor,
          },
        ]}
      >
        {leftAction}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={styles.refinedTextInput}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.30)"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightAction}
      </Animated.View>
    </View>
  );
};

export default function LoginScreen() {
  const { t, locale } = useTranslation();
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const setSession = useAuthStore((s) => s.setSession);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('Light Duty Pickup');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Flow State
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  // Forgot / Reset Password States
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Countdown timer for code resend
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Bottom sheets
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // Screen layout animation fade-ins
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  const triggerScreenTransition = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(15);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    triggerScreenTransition();
  }, [view, forgotSuccess, triggerScreenTransition]);

  useEffect(() => {
    AsyncStorage.getItem('plowpath.activeVehicle').then((val) => {
      if (val) {
        setSelectedVehicle(val);
      }
    });
  }, []);

  // Timer runner for resend countdown
  useEffect(() => {
    if (forgotSuccess) {
      setCountdown(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [forgotSuccess]);

  // Mask Phone / Email securely
  function getMaskedDestination(val: string) {
    if (!val) return '';
    if (val.includes('@')) {
      const [user, domain] = val.split('@');
      if (user.length <= 2) return `${user}•••@${domain}`;
      return `${user.substring(0, 2)}••••@${domain}`;
    }
    // Clean code if prepended
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 10) {
      const country = val.startsWith('+') ? val.substring(0, val.length - 10) : '+1';
      return `${country} ${clean.substring(clean.length - 10, clean.length - 7)} •••• ${clean.substring(clean.length - 4)}`;
    }
    return val;
  }

  // Prepend selected dial prefix if not typed explicitly
  function getFinalPhoneOrEmail(inputVal: string, isPhoneOnly: boolean) {
    const trimmed = inputVal.trim();
    if (isPhoneOnly && !trimmed.startsWith('+') && !trimmed.includes('@')) {
      const cleaned = trimmed.replace(/^0+/, '');
      return `${selectedCountry.code}${cleaned}`;
    }
    return trimmed;
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const finalIdentifier = getFinalPhoneOrEmail(identifier, true);
    try {
      const { data } = await api.post<{ token: string; refresh_token: string; user: AuthUser }>(
        '/auth/login',
        { identifier: finalIdentifier, password },
      );

      await AsyncStorage.setItem('plowpath.activeVehicle', selectedVehicle);

      if (data.user.driver_id) {
        try {
          await api.put(`/drivers/${data.user.driver_id}`,
            { vehicle_type: selectedVehicle },
            { headers: { Authorization: `Bearer ${data.token}` } }
          );
        } catch (backendErr) {
          console.warn('[LOGIN] Failed to update vehicle on backend:', backendErr);
        }
      }

      setSession({ token: data.token, refreshToken: data.refresh_token, user: data.user });

      pushService.requestUserPermission().catch((pushErr) => {
        console.warn('[PUSH] Failed to trigger push permissions on login:', pushErr);
      });
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number } };
      if (apiErr.response?.status === 401) {
        setError(t('incorrectCredentials'));
      } else {
        setError(t('networkError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestCode() {
    if (!resetIdentifier) {
      setResetError(t('validationAllRequired'));
      return;
    }
    setResetError(null);
    setSendingCode(true);

    const isEmail = resetIdentifier.includes('@');
    const finalResetIdentifier = getFinalPhoneOrEmail(resetIdentifier, !isEmail);

    try {
      await api.post('/auth/forgot-password', { identifier: finalResetIdentifier });
      setForgotSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      const message = apiErr?.response?.data?.error?.message ?? 'Failed to send verification code.';
      setResetError(message);
    } finally {
      setSendingCode(false);
    }
  }

  async function handleResetPassword() {
    setResetError(null);
    if (!resetCode) {
      setResetError(t('validationAllRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setResetError(t('validationLength'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError(t('validationMatch'));
      return;
    }
    setResettingPassword(true);
    const isEmail = resetIdentifier.includes('@');
    const finalResetIdentifier = getFinalPhoneOrEmail(resetIdentifier, !isEmail);
    try {
      await api.post('/auth/reset-password', {
        value: finalResetIdentifier,
        identifier: finalResetIdentifier,
        token: resetCode,
        newPassword,
      });
      setView('login');
      setForgotSuccess(false);
      setResetIdentifier('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetError(null);
      Alert.alert(t('success'), t('successPasswordUpdated'));
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      const message = apiErr?.response?.data?.error?.message ?? 'Failed to reset password.';
      setResetError(message);
    } finally {
      setResettingPassword(false);
    }
  }

  // Dynamic Switcher Icon based on "@" typing
  const getIdentifierIcon = () => {
    return resetIdentifier.includes('@') ? (
      <MailIcon color="rgba(255,255,255,0.40)" />
    ) : (
      <PhoneIcon color="rgba(255,255,255,0.40)" />
    );
  };

  return (
    <View style={styles.container}>
      {/* Subtle radial glow centering behind logo header */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient id="radialGlow" cx="50%" cy="0%" rx="60%" ry="40%">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.08} />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#radialGlow)" />
      </Svg>

      {/* Floating Language Switcher */}
      <TouchableOpacity
        style={styles.languageSwitcherBtn}
        onPress={() => setLanguagePickerOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Change Language"
      >
        <GlobeIcon color="rgba(255,255,255,0.6)" />
        <AppText style={styles.languageSwitcherText}>{locale.toUpperCase()}</AppText>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Navigation Chevron (Forgot/Reset flows) */}
        {view !== 'login' && (
          <TouchableOpacity
            style={styles.backChevronBtn}
            onPress={() => {
              if (view === 'reset') {
                setView('forgot');
              } else {
                setView('login');
                setForgotSuccess(false);
              }
              setResetError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <BackChevron color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        )}

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Brand Header Zone */}
          {view === 'login' && (
            <View style={styles.brandHeader}>
              <View style={styles.logoCircle}>
                <LogoMark />
              </View>
              <AppText style={styles.brandSubtitle}>DRIVEOPS</AppText>
              <AppText style={styles.brandTitle}>{t('startShiftTitle')}</AppText>
              <AppText style={styles.brandDesc}>{t('startShiftDesc')}</AppText>
            </View>
          )}

          {/* Form Content - Screen 1: Start Shift */}
          {view === 'login' && (
            <View style={styles.formZone}>
              {/* Phone Input with Dial-Code prefix selector */}
              <RefinedInput
                label={t('phone')}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="555 111 0001"
                keyboardType="phone-pad"
                leftAction={
                  <TouchableOpacity
                    style={styles.flagSelector}
                    onPress={() => setCountryPickerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <AppText style={styles.flagText}>
                      {selectedCountry.flag} {selectedCountry.code}
                    </AppText>
                    <View style={{ marginLeft: 6, marginRight: 12 }}>
                      <ChevronDownIcon color="rgba(255,255,255,0.4)" />
                    </View>
                    <View style={styles.flagDivider} />
                  </TouchableOpacity>
                }
              />

              {/* Password Input with eye toggle action */}
              <RefinedInput
                label={t('password')}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                rightAction={
                  <TouchableOpacity
                    onPress={() => setShowPassword((p) => !p)}
                    style={styles.eyeBtn}
                    activeOpacity={0.7}
                  >
                    {showPassword ? <EyeOffIcon color="rgba(255,255,255,0.40)" /> : <EyeIcon color="rgba(255,255,255,0.40)" />}
                  </TouchableOpacity>
                }
              />

              <TouchableOpacity
                onPress={() => {
                  setView('forgot');
                  setError(null);
                }}
                style={styles.forgotPassLink}
                activeOpacity={0.7}
              >
                <AppText style={styles.forgotPassText}>{t('forgotPasswordLink')}</AppText>
              </TouchableOpacity>

              {/* Styled selector card for Active Vehicle */}
              <View style={styles.vehicleWrapper}>
                <AppText style={styles.inputLabel}>{t('activeVehicle')}</AppText>
                <TouchableOpacity
                  onPress={() => setVehiclePickerOpen(true)}
                  style={styles.vehicleSelectorCard}
                  activeOpacity={0.8}
                >
                  <View style={styles.row}>
                    <TruckIcon color="rgba(255,255,255,0.40)" />
                    <AppText style={styles.vehicleText}>{selectedVehicle}</AppText>
                  </View>
                  <ChevronDownIcon color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
              </View>

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

              <View style={styles.marginTop24}>
                <PremiumGradientButton
                  text={t('startShift')}
                  onPress={onSubmit}
                  disabled={submitting || !identifier || !password}
                  loading={submitting}
                  icon={<ShieldCheckIcon color="#FFFFFF" />}
                />
              </View>
            </View>
          )}

          {/* Form Content - Screen 2: Forgot Password Recovery */}
          {view === 'forgot' && !forgotSuccess && (
            <View style={styles.forgotFlowZone}>
              <View style={styles.forgotHeader}>
                <View style={styles.lockContainer}>
                  <LockIcon color="#F59E0B" />
                </View>
                <AppText style={styles.forgotTitle}>{t('forgotHeaderTitle')}</AppText>
                <AppText style={styles.forgotDesc}>{t('forgotHeaderDesc')}</AppText>
              </View>

              <View style={styles.formZone}>
                <RefinedInput
                  label={t('phoneOrEmail')}
                  value={resetIdentifier}
                  onChangeText={setResetIdentifier}
                  placeholder="e.g. +1 555 111 0001"
                  leftAction={
                    <View style={styles.switcherIconWrapper}>
                      {getIdentifierIcon()}
                      <View style={styles.flagDivider} />
                    </View>
                  }
                />

                {resetError ? <AppText style={styles.errorText}>{resetError}</AppText> : null}

                <View style={styles.marginTop24}>
                  <PremiumGradientButton
                    text={t('requestCode')}
                    onPress={handleRequestCode}
                    disabled={sendingCode || !resetIdentifier}
                    loading={sendingCode}
                  />
                  <View style={styles.expiryRow}>
                    <LockIcon color="rgba(255,255,255,0.35)" size={14} strokeWidth={2} />
                    <AppText style={styles.expiryNote}>{t('codeExpires')}</AppText>
                  </View>
                </View>

                {/* Secondary link */}
                <TouchableOpacity
                  onPress={() => {
                    setView('login');
                    setResetError(null);
                  }}
                  style={styles.backToLoginCenterBtn}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.backToLoginText}>{t('backToLogin')}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Inline Success State after requesting code */}
          {view === 'forgot' && forgotSuccess && (
            <View style={styles.successStateZone}>
              <View style={styles.successIconWrapper}>
                <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx="12" cy="12" r="10" />
                  <Path d="M9 12l2 2 4-4" />
                </Svg>
              </View>

              <AppText style={styles.successTitle}>{t('codeSentTitle')}</AppText>
              <AppText style={styles.successBody}>
                {t('codeSentBody', { destination: getMaskedDestination(resetIdentifier) })}
              </AppText>

              <View style={styles.successActions}>
                <PremiumGradientButton
                  text={t('enterVerificationCode')}
                  onPress={() => setView('reset')}
                />

                <TouchableOpacity
                  disabled={countdown > 0}
                  onPress={handleRequestCode}
                  style={[styles.resendBtn, countdown > 0 && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.resendText}>
                    {countdown > 0 ? t('resendCodeSeconds', { seconds: countdown }) : t('resendCode')}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setView('login');
                    setForgotSuccess(false);
                  }}
                  style={styles.backToLoginCenterBtn}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.backToLoginText}>{t('backToLogin')}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Form Content - Screen 3: Verify Code / Reset Password */}
          {view === 'reset' && (
            <View style={styles.formZone}>
              <View style={styles.forgotHeader}>
                <AppText style={styles.forgotTitle}>{t('resetPasswordTitle')}</AppText>
                <AppText style={styles.forgotDesc}>{t('resetPasswordDesc')}</AppText>
              </View>

              <RefinedInput
                label={t('verificationCodeLabel')}
                value={resetCode}
                onChangeText={setResetCode}
                placeholder="123456"
                keyboardType="number-pad"
              />

              <RefinedInput
                label={t('newPasswordLabel')}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min. 6 characters"
                secureTextEntry={true}
              />

              <RefinedInput
                label={t('confirmPasswordLabel')}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Confirm new password"
                secureTextEntry={true}
              />

              {resetError ? <AppText style={styles.errorText}>{resetError}</AppText> : null}

              <View style={styles.marginTop24}>
                <PremiumGradientButton
                  text={t('setNewPassword')}
                  onPress={handleResetPassword}
                  disabled={resettingPassword || !resetCode || !newPassword || !confirmNewPassword}
                  loading={resettingPassword}
                />
              </View>

              <View style={styles.marginTop16}>
                <OutlinedSecondaryButton
                  text={t('cancel')}
                  onPress={() => {
                    setView('login');
                    setForgotSuccess(false);
                  }}
                />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Footer agreement */}
        {view === 'login' && (
          <View style={styles.footerAgreement}>
            <AppText style={styles.footerText}>
              {t('termsText')}
            </AppText>
          </View>
        )}
      </ScrollView>

      {/* Language Picker Bottom Sheet Modal */}
      <Modal
        visible={languagePickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguagePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setLanguagePickerOpen(false)}>
            <View style={styles.modalDismissBg} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalDragBar} />
            <AppText style={styles.modalTitle}>Sélectionner la langue / Select Language</AppText>
            {[
              { code: 'fr-QC', name: 'Français (Québec)', flag: '🇨🇦' },
              { code: 'en-CA', name: 'English (Canada)', flag: '🇨🇦' },
              { code: 'en-US', name: 'English (United States)', flag: '🇺🇸' },
              { code: 'en-GB', name: 'English (United Kingdom)', flag: '🇬🇧' },
            ].map((lang) => {
              const selected = locale === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    updateSettings({ language: lang.code as any });
                    setLanguagePickerOpen(false);
                  }}
                >
                  <AppText style={styles.modalOptionFlag}>{lang.flag}</AppText>
                  <AppText style={[styles.modalOptionName, { color: selected ? '#3B82F6' : '#FFFFFF' }]}>
                    {lang.name}
                  </AppText>
                  <View style={[styles.radioOutline, selected && styles.radioOutlineSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Country Picker Bottom Sheet Modal */}
      <Modal
        visible={countryPickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setCountryPickerOpen(false)}>
            <View style={styles.modalDismissBg} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalDragBar} />
            <AppText style={styles.modalTitle}>Select Country Code</AppText>
            {COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={styles.modalOptionRow}
                onPress={() => {
                  setSelectedCountry(c);
                  setCountryPickerOpen(false);
                }}
              >
                <AppText style={styles.modalOptionFlag}>{c.flag}</AppText>
                <AppText style={styles.modalOptionName}>{c.name}</AppText>
                <AppText style={styles.modalOptionCode}>{c.code}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Vehicle Picker Bottom Sheet Modal */}
      <Modal
        visible={vehiclePickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVehiclePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setVehiclePickerOpen(false)}>
            <View style={styles.modalDismissBg} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalDragBar} />
            <AppText style={styles.modalTitle}>Choose Active Vehicle</AppText>
            {VEHICLE_OPTIONS.map((option) => {
              const selected = selectedVehicle === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setSelectedVehicle(option);
                    setVehiclePickerOpen(false);
                  }}
                >
                  <TruckIcon color={selected ? '#3B82F6' : 'rgba(255,255,255,0.40)'} />
                  <AppText style={[styles.modalOptionName, { marginLeft: 12, color: selected ? '#3B82F6' : '#FFFFFF' }]}>
                    {option}
                  </AppText>
                  <View style={[styles.radioOutline, selected && styles.radioOutlineSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Terms of Service Bottom Sheet Modal */}
      <Modal
        visible={termsModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTermsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setTermsModalOpen(false)}>
            <View style={styles.modalDismissBg} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalDragBar} />
            <AppText style={styles.modalTitle}>Terms of Service</AppText>
            <ScrollView style={styles.docScrollView} showsVerticalScrollIndicator={true}>
              <AppText style={styles.docSectionTitle}>1. Acceptance of Terms</AppText>
              <AppText style={styles.docText}>
                By accessing or using the PlowPath Driver Operations Platform, you agree to comply with and be bound by these Terms of Service. These terms govern your active participation in driver dispatch activities.
              </AppText>

              <AppText style={styles.docSectionTitle}>2. GPS Tracking & Telemetry</AppText>
              <AppText style={styles.docText}>
                PlowPath requires continuous GPS location updates and telemetry transmission while your shift is active. This data is essential for optimizing municipality snow-plow routing, shift handovers, and coordinator operations.
              </AppText>

              <AppText style={styles.docSectionTitle}>3. Operator Responsibility</AppText>
              <AppText style={styles.docText}>
                As a professional vehicle operator, you agree to use this mobile application safely. Do NOT interact with the interface while the vehicle is in motion. Keep the mobile device secured in a mounted, hands-free position.
              </AppText>

              <AppText style={styles.docSectionTitle}>4. Platform Operations</AppText>
              <AppText style={styles.docText}>
                We reserve the right to audit route telemetry logs, vehicle identification, and performance records to ensure compliance with municipal snow plowing contracts and dispatch regulations.
              </AppText>
            </ScrollView>
            <View style={styles.marginTop24}>
              <PremiumGradientButton
                text="I AGREE"
                onPress={() => setTermsModalOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Bottom Sheet Modal */}
      <Modal
        visible={privacyModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setPrivacyModalOpen(false)}>
            <View style={styles.modalDismissBg} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalDragBar} />
            <AppText style={styles.modalTitle}>Privacy Policy</AppText>
            <ScrollView style={styles.docScrollView} showsVerticalScrollIndicator={true}>
              <AppText style={styles.docSectionTitle}>1. Data Collection</AppText>
              <AppText style={styles.docText}>
                We collect your name, phone number, vehicle type, and location telemetry coordinates while the application runs during active plowing shifts. This information is required for operational synchronization.
              </AppText>

              <AppText style={styles.docSectionTitle}>2. Location Utilization</AppText>
              <AppText style={styles.docText}>
                Your precise GPS coordinates are transmitted to municipal dispatchers to coordinate plowing coverage, update road completion statuses, and verify service completion for shift route payouts.
              </AppText>

              <AppText style={styles.docSectionTitle}>3. Information Sharing</AppText>
              <AppText style={styles.docText}>
                PlowPath does not sell or share driver location data or phone numbers with third-party advertising companies. Telemetry reports are shared only with designated city officials and dispatch teams.
              </AppText>

              <AppText style={styles.docSectionTitle}>4. Data Security & Retention</AppText>
              <AppText style={styles.docText}>
                All location and profile transmissions are encrypted via secure transport layer protocols. Shift history records are securely archived according to dispatch compliance retention timelines.
              </AppText>
            </ScrollView>
            <View style={styles.marginTop24}>
              <PremiumGradientButton
                text="CLOSE"
                onPress={() => setPrivacyModalOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F141E',
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 80,
    flexGrow: 1,
  },
  backChevronBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: -8,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  brandDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  formZone: {
    gap: 16,
  },
  inputWrapper: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.40)',
    marginBottom: 8,
  },
  refinedInputContainer: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  refinedTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#FFFFFF',
  },
  flagSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    height: '100%',
  },
  flagText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chevronDownText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 4,
    marginRight: 12,
    marginTop: -4,
  },
  flagDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  eyeBtn: {
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  forgotPassLink: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 8,
  },
  forgotPassText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  vehicleWrapper: {
    marginBottom: 12,
  },
  vehicleSelectorCard: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 17,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  chevronDownChevron: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    marginTop: -4,
  },
  gradientBtn: {
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 24,
    elevation: 8,
  },
  gradientBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradientBtnIcon: {
    marginRight: 8,
  },
  gradientBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  outlinedBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  marginTop24: {
    marginTop: 24,
  },
  marginTop16: {
    marginTop: 16,
  },
  footerAgreement: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.30)',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  forgotFlowZone: {
    marginTop: 12,
  },
  forgotHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  lockContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  forgotTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  forgotDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    width: '85%',
  },
  switcherIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    gap: 12,
    height: '100%',
  },
  expiryNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 12,
  },
  backToLoginCenterBtn: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '500',
  },
  successStateZone: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  successIconWrapper: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successBody: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successActions: {
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  resendBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissBg: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#161C29',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
  },
  modalDragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalOptionRow: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalOptionFlag: {
    fontSize: 22,
  },
  modalOptionName: {
    flex: 1,
    fontSize: 17,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  modalOptionCode: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOutlineSelected: {
    borderColor: '#3B82F6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  docScrollView: {
    marginVertical: 12,
    flexShrink: 1,
  },
  docSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 6,
  },
  docText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
    marginBottom: 8,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  languageSwitcherBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  languageSwitcherText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
});
