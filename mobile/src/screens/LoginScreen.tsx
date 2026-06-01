import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle } from 'react-native-svg';
import { api } from '../services/api';
import { useAuthStore, type AuthUser } from '../store/authStore';
import { pushService } from '../services/push.service';

const EyeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
    <Circle cx={12} cy={12} r={3} />
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

const VEHICLE_OPTIONS = [
  'Light Duty Pickup',
  'Medium Duty Plow',
  'Heavy Duty Salt Spreader',
  'Tractor/Loader',
];

// Copy is locked per Copy Requirements doc — drivers operate this in gloves.
export default function LoginScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('Light Duty Pickup');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forgot Password State
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    // Load last chosen vehicle from storage
    AsyncStorage.getItem('plowpath.activeVehicle').then((val) => {
      if (val) {
        setSelectedVehicle(val);
      }
    });
  }, []);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<{ token: string; refresh_token: string; user: AuthUser }>(
        '/auth/login',
        { identifier, password },
      );

      // Save chosen vehicle to local storage
      await AsyncStorage.setItem('plowpath.activeVehicle', selectedVehicle);

      // If logging in as a driver, update vehicle type on backend
      if (data.user.driver_id) {
        try {
          // Temporarily attach authorization header manually as store isn't populated yet
          await api.put(`/drivers/${data.user.driver_id}`, 
            { vehicle_type: selectedVehicle },
            { headers: { Authorization: `Bearer ${data.token}` } }
          );
        } catch (backendErr) {
          console.warn('[LOGIN] Failed to update vehicle on backend:', backendErr);
        }
      }

      setSession({ token: data.token, refreshToken: data.refresh_token, user: data.user });
      
      // Request FCM permissions and register token with backend in the background
      pushService.requestUserPermission().catch((pushErr) => {
        console.warn('[PUSH] Failed to trigger push permissions on login:', pushErr);
      });
    } catch {
      setError('Incorrect phone or password. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestCode() {
    if (!resetIdentifier) {
      setResetError('Phone number or email is required.');
      return;
    }
    setResetError(null);
    setSendingCode(true);
    try {
      await api.post('/auth/forgot-password', { identifier: resetIdentifier });
      setView('reset');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Failed to send verification code.';
      setResetError(message);
    } finally {
      setSendingCode(false);
    }
  }

  async function handleResetPassword() {
    setResetError(null);
    if (!resetCode) {
      setResetError('Verification code is required.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Confirm password does not match new password.');
      return;
    }
    setResettingPassword(true);
    try {
      await api.post('/auth/reset-password', {
        identifier: resetIdentifier,
        token: resetCode,
        newPassword,
      });
      setView('login');
      setResetIdentifier('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetError(null);
      Alert.alert('Success', 'Password updated successfully! Please log in with your new password.');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Failed to reset password.';
      setResetError(message);
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {view === 'login' ? 'Start Shift' : view === 'forgot' ? 'Forgot Password' : 'Reset Password'}
      </Text>

      {view === 'login' && (
        <>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            style={styles.input}
            accessibilityLabel="Phone number or email"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.textInputStyle}
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon color="#666" /> : <EyeIcon color="#666" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              setView('forgot');
              setError(null);
            }}
            style={styles.forgotBtn}
            accessibilityRole="button"
            accessibilityLabel="Forgot Password"
          >
            <Text style={styles.forgotBtnText}>Forgot password?</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Active Vehicle</Text>
          <TouchableOpacity
            onPress={() => setShowVehicleDropdown((prev) => !prev)}
            style={styles.dropdownHeader}
            accessibilityRole="button"
            accessibilityLabel={`Selected vehicle: ${selectedVehicle}. Double tap to change.`}
          >
            <Text style={styles.dropdownHeaderText}>{selectedVehicle}</Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={2.5}>
              {showVehicleDropdown ? (
                <Path d="M18 15l-6-6-6 6" />
              ) : (
                <Path d="M6 9l6 6 6-6" />
              )}
            </Svg>
          </TouchableOpacity>

          {showVehicleDropdown && (
            <View style={styles.dropdownList}>
              {VEHICLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownOption,
                    selectedVehicle === option && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedVehicle(option);
                    setShowVehicleDropdown(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${option}`}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selectedVehicle === option && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={submitting}
            style={[styles.button, submitting && styles.buttonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Log In</Text>}
          </TouchableOpacity>
        </>
      )}

      {view === 'forgot' && (
        <>
          <Text style={styles.subTitle}>
            Enter your phone number or email to receive a 6-digit verification code.
          </Text>

          <Text style={styles.label}>Phone number or Email</Text>
          <TextInput
            value={resetIdentifier}
            onChangeText={setResetIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            style={styles.input}
            placeholder="e.g. +15551110001"
            accessibilityLabel="Reset identifier"
          />

          {resetError ? <Text style={styles.error}>{resetError}</Text> : null}

          <TouchableOpacity
            onPress={handleRequestCode}
            disabled={sendingCode}
            style={[styles.button, sendingCode && styles.buttonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Request reset code"
          >
            {sendingCode ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Request Verification Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setView('login');
              setResetError(null);
            }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
          >
            <Text style={styles.backBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </>
      )}

      {view === 'reset' && (
        <>
          <Text style={styles.subTitle}>
            We have sent a verification code to your email or phone number.
          </Text>

          <Text style={styles.label}>6-Digit Verification Code</Text>
          <TextInput
            value={resetCode}
            onChangeText={setResetCode}
            maxLength={6}
            keyboardType="number-pad"
            style={[styles.input, styles.codeInput]}
            placeholder="e.g. 123456"
            accessibilityLabel="Verification Code"
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={true}
            style={styles.input}
            placeholder="Min. 6 characters"
            accessibilityLabel="New Password"
          />

          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry={true}
            style={styles.input}
            placeholder="Confirm password"
            accessibilityLabel="Confirm Password"
          />

          {resetError ? <Text style={styles.error}>{resetError}</Text> : null}

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={resettingPassword}
            style={[styles.button, resettingPassword && styles.buttonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Reset password"
          >
            {resettingPassword ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Set New Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setView('forgot');
              setResetError(null);
            }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to request code"
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: 'white', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#000', marginBottom: 32 },
  label: { fontSize: 16, color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#000',
    backgroundColor: 'white',
  },
  inputContainer: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  textInputStyle: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    color: '#000',
  },
  eyeButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownHeader: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  dropdownHeaderText: {
    fontSize: 18,
    color: '#000',
    fontWeight: '500',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    marginTop: 4,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dropdownOption: {
    minHeight: 50,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#E6F0FA',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    color: '#2E75B6',
    fontWeight: '700',
  },
  error: { color: '#DC3545', marginTop: 16, fontSize: 16 },
  button: {
    marginTop: 32,
    minHeight: 60,
    backgroundColor: '#2E75B6',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotBtnText: {
    color: '#2E75B6',
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    marginTop: 16,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  backBtnText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
  subTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
  },
});
