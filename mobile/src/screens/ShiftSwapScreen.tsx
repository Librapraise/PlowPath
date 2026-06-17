import AppText from '../components/AppText';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Clipboard,
} from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop, Line, Polyline } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList } from '../services/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ShiftSwap'>;

// Premium Svg icons
const OutgoingIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="12" y1="19" x2="12" y2="5" />
    <Polyline points="5 12 12 5 19 12" />
  </Svg>
);

const IncomingIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Polyline points="19 12 12 19 5 12" />
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
        <AppText style={[styles.gradientBtnText, { marginLeft: icon ? 8 : 0 }]}>{text}</AppText>
      </View>
    </TouchableOpacity>
  );
};

export default function ShiftSwapScreen({ navigation }: Props) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // 10-minute active countdown timer
  const [countdown, setCountdown] = useState(600);

  useEffect(() => {
    if (!qrToken) return;
    setCountdown(600);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setQrToken(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrToken]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

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

  const copyToClipboard = () => {
    if (qrToken) {
      Clipboard.setString(qrToken);
      Alert.alert(
        'Copied! 📋',
        'Handover key copied to clipboard. You can send it to the incoming driver.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    setScanInput(text);
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

  const resolvedStyles = isDark ? darkStyles : lightStyles;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#0F141E' : '#F4F6FA' }}
      contentContainerStyle={resolvedStyles.container}
    >
      {/* Sub-page Header Pattern (Inline Back Button + Title + Bottom Divider) */}
      <View style={resolvedStyles.headerRow}>
        <TouchableOpacity
          style={resolvedStyles.headerBackBtn}
          onPress={() => navigation.goBack()}
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
        <AppText style={resolvedStyles.headerTitle}>Shift Handover</AppText>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <AppText style={styles.securityBadgeText}>🔒 Encrypted</AppText>
        </View>
      </View>

      <AppText style={resolvedStyles.subtitle}>
        Transfer routes between drivers securely.
      </AppText>

      {/* OUTGOING DRIVER SEGMENT */}
      <View style={resolvedStyles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.circleIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <OutgoingIcon color="#F59E0B" />
          </View>
          <AppText style={resolvedStyles.cardHeader}>Leaving Shift? (Outgoing Driver)</AppText>
        </View>

        <AppText style={resolvedStyles.cardMuted}>
          Generate a secure, short-lived handover token to transfer your current active routes.
        </AppText>

        {qrToken ? (
          <View style={resolvedStyles.qrContainer}>
            <AppText style={resolvedStyles.qrLabel}>SECURE HANDOVER KEY (ACTIVE 10M):</AppText>
            <View style={resolvedStyles.qrBlockRow}>
              <View style={resolvedStyles.qrClickable}>
                <AppText style={resolvedStyles.qrTextDisplay}>{qrToken}</AppText>
              </View>
              <TouchableOpacity onPress={copyToClipboard} activeOpacity={0.7} style={resolvedStyles.copyBtn}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </Svg>
                <AppText style={resolvedStyles.copyBtnText}>Copy</AppText>
              </TouchableOpacity>
            </View>
            <AppText style={resolvedStyles.countdownText}>
              Expires in {formatTime(countdown)}
            </AppText>
          </View>
        ) : (
          <GradientButton
            disabled={isLoading}
            onPress={generateHandoverToken}
            text={isLoading ? 'Generating...' : 'Generate Handover Token'}
            colors={['#1D4ED8', '#3B82F6']}
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx="12" cy="12" r="10" />
                <Polyline points="12 6 12 12 16 14" />
              </Svg>
            }
          />
        )}
      </View>

      {/* INCOMING DRIVER SEGMENT */}
      <View style={resolvedStyles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.circleIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <IncomingIcon color="#22C55E" />
          </View>
          <AppText style={resolvedStyles.cardHeader}>Starting Shift? (Incoming Driver)</AppText>
        </View>

        <AppText style={resolvedStyles.cardMuted}>
          Enter the outgoing driver's secure handover token to immediately assume their route queue and end their active shift timer.
        </AppText>

        <View style={resolvedStyles.inputContainer}>
          <TextInput
            placeholder="Enter secure key here..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,20,30,0.4)'}
            value={scanInput}
            onChangeText={setScanInput}
            style={resolvedStyles.textInput}
          />
          <TouchableOpacity onPress={handlePaste} activeOpacity={0.7} style={resolvedStyles.pasteBtn}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#3B82F6' : '#1D4ED8'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.marginTop8}>
          <GradientButton
            disabled={isLoading}
            onPress={processHandover}
            text="Accept Shift & Routes"
            colors={['#10B981', '#22C55E']}
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 6L9 17l-5-5" />
              </Svg>
            }
          />
        </View>

        {/* Warning strip */}
        <View style={resolvedStyles.warningStrip}>
          <AppText style={resolvedStyles.warningStripText}>
            ⚠ This will immediately end the outgoing driver's active shift timer.
          </AppText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  securityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  circleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtnContainer: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  gradientBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradientBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  marginTop8: {
    marginTop: 8,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0F141E',
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(15,20,30,0.5)',
    marginBottom: 24,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F141E',
  },
  cardMuted: {
    fontSize: 12,
    color: 'rgba(15,20,30,0.5)',
    marginBottom: 16,
    lineHeight: 18,
  },
  qrContainer: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F4F6FA',
    borderColor: 'rgba(15,20,30,0.06)',
    borderWidth: 1,
    marginTop: 4,
  },
  qrLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  qrBlockRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qrClickable: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(15,20,30,0.1)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrTextDisplay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F141E',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(15,20,30,0.1)',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    height: 52,
    marginBottom: 12,
    paddingLeft: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F141E',
    height: '100%',
  },
  pasteBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningStrip: {
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.07)',
    padding: 12,
    marginTop: 14,
  },
  warningStripText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
    lineHeight: 16,
  },
} as any);

const darkStyles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 24,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#161C29',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardMuted: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 16,
    lineHeight: 18,
  },
  qrContainer: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0F141E',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    marginTop: 4,
  },
  qrLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  qrBlockRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qrClickable: {
    flex: 1,
    backgroundColor: '#161C29',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrTextDisplay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    backgroundColor: '#0F141E',
    height: 52,
    marginBottom: 12,
    paddingLeft: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    height: '100%',
  },
  pasteBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningStrip: {
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.07)',
    padding: 12,
    marginTop: 14,
  },
  warningStripText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    lineHeight: 16,
  },
} as any);
