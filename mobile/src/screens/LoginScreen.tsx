import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useAuthStore, type AuthUser } from '../store/authStore';
import { pushService } from '../services/push.service';

// Copy is locked per Copy Requirements doc — drivers operate this in gloves.
export default function LoginScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<{ token: string; refresh_token: string; user: AuthUser }>(
        '/auth/login',
        { identifier, password },
      );
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start Shift</Text>

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
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        accessibilityLabel="Password"
      />

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
});
