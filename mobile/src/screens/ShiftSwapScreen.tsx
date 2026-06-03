import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList } from '../services/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ShiftSwap'>;

export default function ShiftSwapScreen({ navigation }: Props) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanInput, setScanInput] = useState('');

  const generateHandoverToken = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ qrToken: string }>('/shifts/handover-token');
      setQrToken(data.qrToken);
      Alert.alert(
        'Handover Code Generated',
        'Show this secure token/code to the incoming driver to take over your shift and routes.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Make sure you have an active shift and an in-progress route.';
      Alert.alert('Generation Failed', msg, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processHandover = async () => {
    if (!scanInput.trim()) {
      Alert.alert('Input Error', 'Please paste the outgoing driver\'s secure handover token.', [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post('/shifts/handover', { qrToken: scanInput.trim() });
      Alert.alert(
        'Handover Successful! 🎉',
        'You have successfully taken over this route and active shift sequence. Drive safely!',
        [
          {
            text: 'Let\'s Go! 🚜',
            onPress: () => {
              if (data.routeId) {
                navigation.navigate('Navigation', { routeId: data.routeId });
              } else {
                navigation.navigate('Route');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'The token may be expired or invalid.';
      Alert.alert('Handover Failed', msg, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = isDark ? darkStyles : lightStyles;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Part-Time Shift Handover Console</Text>
      <Text style={styles.subtitle}>
        Seamlessly transition active plowing routes and lock escrow hours securely between drivers.
      </Text>

      {/* OUTGOING DRIVER SEGMENT */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>1. Leaving Shift? (Outgoing Driver)</Text>
        <Text style={styles.cardMuted}>
          Generate a secure, short-lived handover token to transfer your current active routes.
        </Text>
        {qrToken ? (
          <View style={styles.qrContainer}>
            <Text style={styles.qrLabel}>SECURE HANDOVER KEY (ACTIVE 15M):</Text>
            <TextInput
              style={styles.qrText}
              value={qrToken}
              editable={false}
              selectTextOnFocus
              multiline
            />
            <Text style={styles.qrInstruction}>
              Tap text to select and copy. The next driver can paste this on their device!
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn, isLoading && styles.disabledBtn]}
            onPress={generateHandoverToken}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Generate Handover Token</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* INCOMING DRIVER SEGMENT */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>2. Starting Shift? (Incoming Driver)</Text>
        <Text style={styles.cardMuted}>
          Enter the outgoing driver's secure handover token to immediately assume their route queue and end their active shift timer.
        </Text>
        <TextInput
          placeholder="Paste outgoing driver's secure key here..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={scanInput}
          onChangeText={setScanInput}
          style={styles.textInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.btn, styles.successBtn, isLoading && styles.disabledBtn]}
          onPress={processHandover}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Accept Shift & Routes</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Route')}>
        <Text style={styles.backBtnText}>Return to Today's Route</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const baseStyles = {
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardMuted: { fontSize: 12, marginBottom: 16, lineHeight: 18 },
  btn: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  primaryBtn: { backgroundColor: '#38BDF8' },
  successBtn: { backgroundColor: '#10B981' },
  disabledBtn: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  qrContainer: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  qrLabel: { fontSize: 10, fontWeight: '900', marginBottom: 6 },
  qrText: { fontSize: 12, fontFamily: 'monospace', minHeight: 60, textAlignVertical: 'top' },
  qrInstruction: { fontSize: 9, fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 4,
  },
  backBtnText: { fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  title: { ...baseStyles.title, color: '#0F172A' },
  subtitle: { ...baseStyles.subtitle, color: '#64748B' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
  },
  cardHeader: { ...baseStyles.cardHeader, color: '#0F172A' },
  cardMuted: { ...baseStyles.cardMuted, color: '#64748B' },
  primaryBtn: { ...baseStyles.primaryBtn, backgroundColor: '#2E75B6' },
  btnText: { ...baseStyles.btnText, color: 'white' },
  qrContainer: {
    ...baseStyles.qrContainer,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  qrLabel: { ...baseStyles.qrLabel, color: '#2E75B6' },
  qrText: { ...baseStyles.qrText, color: '#0F172A' },
  qrInstruction: { ...baseStyles.qrInstruction, color: '#64748B' },
  textInput: {
    ...baseStyles.textInput,
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    color: '#0F172A',
  },
  backBtnText: { ...baseStyles.backBtnText, color: '#64748B' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
  title: { ...baseStyles.title, color: '#FFFFFF' },
  subtitle: { ...baseStyles.subtitle, color: '#94A3B8' },
  card: {
    ...baseStyles.card,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  cardHeader: { ...baseStyles.cardHeader, color: '#FFFFFF' },
  cardMuted: { ...baseStyles.cardMuted, color: '#94A3B8' },
  btnText: { ...baseStyles.btnText, color: '#0B0F19' },
  qrContainer: {
    ...baseStyles.qrContainer,
    backgroundColor: '#0B0F19',
    borderColor: '#475569',
  },
  qrLabel: { ...baseStyles.qrLabel, color: '#38BDF8' },
  qrText: { ...baseStyles.qrText, color: '#E2E8F0' },
  qrInstruction: { ...baseStyles.qrInstruction, color: '#64748B' },
  textInput: {
    ...baseStyles.textInput,
    backgroundColor: '#0B0F19',
    borderColor: '#475569',
    color: '#E2E8F0',
  },
  backBtnText: { ...baseStyles.backBtnText, color: '#94A3B8' },
} as any);
