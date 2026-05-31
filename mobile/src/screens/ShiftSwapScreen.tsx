import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import type { RootStackParamList } from '../services/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ShiftSwap'>;

export default function ShiftSwapScreen({ navigation }: Props) {
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
            <Text style={styles.btnText}>{isLoading ? 'Generating...' : 'Generate Handover Token'}</Text>
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
          placeholderTextColor="#778899"
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
          <Text style={styles.btnText}>{isLoading ? 'Processing Swap...' : 'Accept Shift & Routes'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Route')}>
        <Text style={styles.backBtnText}>Return to Today's Route</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#0f172a' },
  title: { fontSize: 24, fontWeight: '900', color: 'white', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { fontSize: 16, fontWeight: '800', color: 'white', marginBottom: 4 },
  cardMuted: { fontSize: 11, color: '#94a3b8', marginBottom: 16, lineHeight: 16 },
  btn: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryBtn: { backgroundColor: '#38b0f8' },
  successBtn: { backgroundColor: '#10b981' },
  disabledBtn: { opacity: 0.5 },
  btnText: { color: 'white', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  qrContainer: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    marginTop: 4,
  },
  qrLabel: { fontSize: 10, fontWeight: '800', color: '#38b0f8', marginBottom: 4 },
  qrText: { color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', minHeight: 60, textAlignVertical: 'top' },
  qrInstruction: { fontSize: 9, color: '#64748b', fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  textInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    padding: 12,
    color: 'white',
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
  backBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
