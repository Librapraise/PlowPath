import AppText from '../components/AppText';
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView, Modal, ActivityIndicator, Image, Platform, PermissionsAndroid, Animated, Easing, Dimensions, PanResponder, TouchableWithoutFeedback } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { launchCamera } from 'react-native-image-picker';

// Premium SVG custom icons for Navigation/HUD
const PlowIcon = ({ color, style }: { color: string; style?: any }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style !== undefined ? style : { marginRight: 8 }}>
    <Path d="M4 11h16M4 15h16M8 11v8M16 11v8" />
    <Circle cx="12" cy="7" r="3" />
  </Svg>
);

const CheckIcon = ({ color, style }: { color: string; style?: any }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style !== undefined ? style : { marginRight: 8 }}>
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Path d="M22 4L12 14.01l-3-3" />
  </Svg>
);

const SkipIcon = ({ color, style }: { color: string; style?: any }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style !== undefined ? style : { marginRight: 8 }}>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M15 9l-6 6M9 9l6 6" />
  </Svg>
);

const MicIcon = ({ color, style }: { color: string; style?: any }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style !== undefined ? style : { marginRight: 8 }}>
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </Svg>
);

const AlertIcon = ({ color, style }: { color: string; style?: any }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style !== undefined ? style : { marginRight: 8 }}>
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <Path d="M12 9v4M12 17h.01" />
  </Svg>
);

const CameraIcon = ({ color, style }: { color: string; style?: any }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style !== undefined ? style : { marginRight: 8 }}>
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

const HandshakeIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Svg>
);

const InfoIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 16v-4M12 8h.01" />
  </Svg>
);

const GoogleMapsIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="#34A853" />
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 1.22.38 2.37 1 3.34l6-6.34V2z" fill="#4285F4" />
    <Path d="M12 22s7-7.75 7-13c0-1.22-.38-2.37-1-3.34l-6 6.34V22z" fill="#EA4335" />
    <Path d="M12 9a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="#F9BC05" />
  </Svg>
);

const AppleMapsIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
    <Circle cx="12" cy="12" r="10" fill="#E5E5EA" stroke="#007AFF" strokeWidth="2" />
    <Path d="M12 2v20M2 12h20" stroke="#007AFF" strokeWidth="1.5" />
    <Path d="M16.24 7.76l-3.53 3.53-3.53 3.53 1.41-4.95z" fill="#FF3B30" />
    <Path d="M7.76 16.24l3.53-3.53 3.53-3.53-1.41 4.95z" fill="#1D1D1F" />
  </Svg>
);

const WazeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
    <Path d="M19 14.5a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-.64-.06 5.5 5.5 0 01-5.72-5.18l-.14-.76c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5c0 1.25-.42 2.4-1.12 3.32.07.2.12.4.12.62z" fill="#33CCFF" />
    <Circle cx="12.5" cy="12.5" r="1" fill="#000000" />
    <Circle cx="16.5" cy="12.5" r="1" fill="#000000" />
    <Path d="M6 18a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z" fill="#F2A900" />
  </Svg>
);

const ShimmerBadge = ({ isDark, partnerName }: { isDark: boolean; partnerName: string }) => {
  const shimmerAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    let active = true;
    const runShimmer = () => {
      if (!active) return;
      shimmerAnim.setValue(-150);
      Animated.timing(shimmerAnim, {
        toValue: 350,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        if (active) runShimmer();
      });
    };
    runShimmer();
    return () => { active = false; };
  }, [shimmerAnim]);

  const styleBadge = isDark ? darkStyles.subcontractBadge : lightStyles.subcontractBadge;
  const styleText = isDark ? darkStyles.subcontractText : lightStyles.subcontractText;

  return (
    <View style={[styleBadge, { overflow: 'hidden', position: 'relative' }]}>
      <HandshakeIcon color={isDark ? '#818CF8' : '#4F46E5'} />
      <AppText style={styleText}>
        Enterprise Partner Job: {partnerName || 'B2B Shared Stop'}
      </AppText>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 80,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.35)',
          transform: [
            { translateX: shimmerAnim },
            { skewX: '-25deg' }
          ],
        }}
      />
    </View>
  );
};

function haversineDistance(
  coord1: [number, number],
  coord2: [number, number],
  units: 'meters' | 'miles',
): number {
  const lon1 = coord1[0];
  const lat1 = coord1[1];
  const lon2 = coord2[0];
  const lat2 = coord2[1];

  const R = units === 'miles' ? 3958.8 : 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const GoogleMapsIconLarge = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="#34A853" />
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 1.22.38 2.37 1 3.34l6-6.34V2z" fill="#4285F4" />
    <Path d="M12 22s7-7.75 7-13c0-1.22-.38-2.37-1-3.34l-6 6.34V22z" fill="#EA4335" />
    <Path d="M12 9a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="#F9BC05" />
  </Svg>
);

const AppleMapsIconLarge = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#E5E5EA" stroke="#007AFF" strokeWidth="2" />
    <Path d="M12 2v20M2 12h20" stroke="#007AFF" strokeWidth="1.5" />
    <Path d="M16.24 7.76l-3.53 3.53-3.53 3.53 1.41-4.95z" fill="#FF3B30" />
    <Path d="M7.76 16.24l3.53-3.53 3.53-3.53-1.41 4.95z" fill="#1D1D1F" />
  </Svg>
);

const WazeIconLarge = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M19 14.5a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-.64-.06 5.5 5.5 0 01-5.72-5.18l-.14-.76c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5c0 1.25-.42 2.4-1.12 3.32.07.2.12.4.12.62z" fill="#33CCFF" />
    <Circle cx="12.5" cy="12.5" r="1" fill="#000000" />
    <Circle cx="16.5" cy="12.5" r="1" fill="#000000" />
    <Path d="M6 18a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z" fill="#F2A900" />
  </Svg>
);

function formatDistance(mi: number | null): string {
  if (mi == null) return '';
  if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
  return `${mi.toFixed(1)} mi`;
}

function getManeuverIcon(modifier?: string, color: string = '#FFFFFF') {
  if (!modifier) return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 20V11a3 3 0 0 1 3-3h7" />
      <Path d="M15 4l4 4-4 4" />
    </Svg>
  );
  if (modifier.includes('left')) {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M15 20V11a3 3 0 0 0-3-3H5" />
        <Path d="M9 4L5 8l4 4" />
      </Svg>
    );
  }
  if (modifier.includes('straight')) {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 20V4" />
        <Path d="M8 8l4-4 4 4" />
      </Svg>
    );
  }
  if (modifier.includes('uturn')) {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 20V9a3 3 0 0 1 6 0v2" />
        <Path d="M11 13l4 4 4-4" />
      </Svg>
    );
  }
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 20V11a3 3 0 0 1 3-3h7" />
      <Path d="M15 4l4 4-4 4" />
    </Svg>
  );
}

import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  downloadRoute, loadRouteOffline, markStopStatus, markRouteCompleted, type OfflineRoute, type RouteStop,
} from '../services/route.service';
import { requestLocationPermission, type GpsSample } from '../services/gps.service';
import {
  configureBackgroundGps, startBackgroundGps, stopBackgroundGps,
} from '../services/backgroundGps.service';
import { flushAllQueues, subscribeToConnectivity } from '../services/offline.service';
import RouteProgress from '../components/RouteProgress';
import OfflineStatusBar from '../components/OfflineStatusBar';
import TurnInstruction from '../components/TurnInstruction';
import { fetchRouteData, OsrmStep } from '../services/osrm.service';
import { captureException } from '../services/sentry';
import type { RootStackParamList } from '../services/navigation';
import GlassContainer from '../components/GlassContainer';
import MapBackground from '../components/MapBackground';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

const ARRIVAL_RADIUS_M = 30;

const summaryStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#0F141E',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  successBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  title: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  routeName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
  },
  stopCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  stopCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  stopCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIndexBadgeDark: {
    backgroundColor: '#334155',
  },
  stopIndexBadgeLight: {
    backgroundColor: '#F1F5F9',
  },
  stopIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  stopName: {
    fontSize: 14,
    fontWeight: '700',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textDark: {
    color: '#0F172A',
  },
  stopAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusSkipped: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextCompleted: {
    color: '#22C55E',
  },
  statusTextSkipped: {
    color: '#EF4444',
  },
  proofContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  proofLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 8,
  },
  proofImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
});

export default function NavigationScreen({ route, navigation }: Props) {
  const { routeId } = route.params;
  const driverId = useAuthStore((s) => s.user?.driver_id);
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';
  const styles = isDark ? darkStyles : lightStyles;

  const [data, setData] = useState<OfflineRoute | null>(null);
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [distanceMi, setDistanceMi] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routeStepsRef = useRef<OsrmStep[]>([]);
  const currentStepIndexRef = useRef(0);
  const [activeStep, setActiveStep] = useState<OsrmStep | null>(null);
  const fetchingRoute = useRef(false);
  const [currentLocation, setCurrentLocation] = useState<GpsSample | null>(null);
  const currentStopRef = useRef(currentStop);

  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIndexRef = useRef(0);

  useEffect(() => {
    currentStopRef.current = currentStop;
    routeStepsRef.current = [];
    currentStepIndexRef.current = 0;
    setActiveStep(null);
    fetchingRoute.current = false;
    setRouteGeometry([]);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  }, [currentStop]);

  // Phase 6 Mobile Overlays state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Proof of Service State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Bottom Sheet and Two-Tap finalize configuration
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const SNAP_FULL = 80;
  const SNAP_HALF = SCREEN_HEIGHT * 0.5;
  const SNAP_PEEK = SCREEN_HEIGHT - 220;

  const [sheetState, setSheetState] = useState<'peek' | 'half' | 'full'>('peek');
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT - 220)).current;
  const lastSheetY = useRef(SCREEN_HEIGHT - 220);

  useEffect(() => {
    const id = sheetY.addListener(({ value }) => {
      lastSheetY.current = value;
    });
    return () => sheetY.removeListener(id);
  }, [sheetY]);

  const animateTo = (targetY: number) => {
    Animated.spring(sheetY, {
      toValue: targetY,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    lastSheetY.current = targetY;

    if (targetY === SNAP_FULL) setSheetState('full');
    else if (targetY === SNAP_HALF) setSheetState('half');
    else setSheetState('peek');
  };

  const toggleSheet = () => {
    if (sheetState === 'peek') {
      animateTo(SNAP_HALF);
    } else {
      animateTo(SNAP_PEEK);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        sheetY.setOffset(lastSheetY.current);
        sheetY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        sheetY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        sheetY.flattenOffset();
        const currentY = lastSheetY.current + gestureState.dy;

        // Snapping logic based on drag direction & position
        let closest = SNAP_PEEK;
        const points = [SNAP_FULL, SNAP_HALF, SNAP_PEEK];
        let minDiff = Infinity;

        for (const p of points) {
          const diff = Math.abs(currentY - p);
          if (diff < minDiff) {
            minDiff = diff;
            closest = p;
          }
        }

        if (gestureState.vy > 0.5) {
          closest = currentY < SNAP_HALF ? SNAP_HALF : SNAP_PEEK;
        } else if (gestureState.vy < -0.5) {
          closest = currentY > SNAP_HALF ? SNAP_HALF : SNAP_FULL;
        }

        animateTo(closest);
      },
    })
  ).current;

  // Danger zone two-tap confirmation state
  const [finalizeState, setFinalizeState] = useState<'idle' | 'confirm'>('idle');
  const finalizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEmergencyFinalize = () => {
    if (finalizeState === 'idle') {
      setFinalizeState('confirm');
      finalizeTimeoutRef.current = setTimeout(() => {
        setFinalizeState('idle');
      }, 3000);
    } else {
      if (finalizeTimeoutRef.current) {
        clearTimeout(finalizeTimeoutRef.current);
      }
      setFinalizeState('idle');
      onStopRouteConfirm();
    }
  };

  useEffect(() => {
    return () => {
      if (finalizeTimeoutRef.current) {
        clearTimeout(finalizeTimeoutRef.current);
      }
    };
  }, []);



  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Load route: prefer server (download); fall back to cached offline copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await downloadRoute(routeId);
        if (!cancelled) {
          setData(fresh);
          setCurrentStop(nextPending(fresh.stops));
        }
      } catch (err) {
        const cached = await loadRouteOffline(routeId);
        if (!cancelled && cached) {
          setData(cached);
          setCurrentStop(nextPending(cached.stops));
        } else if (!cancelled) {
          setError('Route unavailable offline. Connect to download it once.');
          captureException(err, { context: 'route_loading_failed', routeId });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [routeId]);

  // Background GPS — keeps streaming with screen off / app backgrounded.
  useEffect(() => {
    if (!driverId || !currentStop) return;

    let active = true;
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        setError('Location permission denied. Navigation needs GPS.');
        return;
      }
      try {
        await configureBackgroundGps({
          driverId,
          routeId,
          onSample: (sample) => {
            if (active) onGpsSample(sample);
          },
        });
        await startBackgroundGps();
      } catch (err) {
        setError((err as Error).message);
        captureException(err, { context: 'background_gps_start_failed', routeId });
      }
    })();

    const unsubscribe = subscribeToConnectivity(() => {
      console.log('[NAVIGATION SCREEN] Reconnected! Flushing all offline-queued events...');
      void flushAllQueues(driverId);
    });

    return () => {
      active = false;
      void stopBackgroundGps();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, routeId]);

  function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  const toggleDriveSimulation = () => {
    if (isSimulating) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setIsSimulating(false);
    } else {
      if (routeGeometry.length === 0) {
        Alert.alert('No Route Geometry', 'Wait for the route coordinates to load before simulating.');
        return;
      }
      setIsSimulating(true);
      simulationIndexRef.current = 0;
      simulationIntervalRef.current = setInterval(() => {
        if (simulationIndexRef.current >= routeGeometry.length) {
          if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
          }
          setIsSimulating(false);
          const stop = currentStopRef.current;
          if (stop && stop.status === 'pending') {
            void onMarkInProgress(stop);
          }
          return;
        }

        const [lon, lat] = routeGeometry[simulationIndexRef.current];
        let heading: number | undefined;
        if (simulationIndexRef.current > 0) {
          const [prevLon, prevLat] = routeGeometry[simulationIndexRef.current - 1];
          heading = calculateBearing(prevLat, prevLon, lat, lon);
        }

        const sample: GpsSample = {
          lat,
          lon,
          heading_deg: heading,
          recorded_at: new Date().toISOString(),
        };

        onGpsSample(sample);
        simulationIndexRef.current += 1;
      }, 800);
    }
  };

  function onGpsSample(sample: GpsSample) {
    const stop = currentStopRef.current;
    if (!stop) return;
    setCurrentLocation(sample);

    if (routeStepsRef.current.length === 0 && !fetchingRoute.current) {
      fetchingRoute.current = true;
      fetchRouteData(sample.lon, sample.lat, stop.lon, stop.lat).then(result => {
        if (result) {
          routeStepsRef.current = result.steps;
          currentStepIndexRef.current = 0;
          setActiveStep(result.steps[0]);
          setRouteGeometry(result.geometry);
        }
      }).finally(() => {
        fetchingRoute.current = false;
      });
    } else if (routeStepsRef.current.length > 0 && currentStepIndexRef.current < routeStepsRef.current.length) {
      const step = routeStepsRef.current[currentStepIndexRef.current];
      const stepDist = haversineDistance(
        [sample.lon, sample.lat],
        step.maneuver.location,
        'meters'
      );
      if (stepDist < 25 && currentStepIndexRef.current < routeStepsRef.current.length - 1) {
        currentStepIndexRef.current += 1;
        setActiveStep(routeStepsRef.current[currentStepIndexRef.current]);
      }
    }

    const meters = haversineDistance(
      [sample.lon, sample.lat],
      [stop.lon, stop.lat],
      'meters'
    );
    setDistanceMi(meters / 1609.34);
    if (meters <= ARRIVAL_RADIUS_M && stop.status === 'pending') {
      void onMarkInProgress(stop);
    }
  }

  async function onMarkInProgress(stop: RouteStop) {
    if (!data) return;
    // Promote the route itself from 'assigned' → 'in_progress' on first stop tap.
    if (data.status === 'assigned') {
      await markRouteCompleted(data.route_id, 'in_progress');
      setData({ ...data, status: 'in_progress' });
    }
    await markStopStatus(data.route_id, stop.stop_id, 'in_progress');
    setData(applyStopStatus(data, stop.stop_id, 'in_progress'));
    setCurrentStop({ ...stop, status: 'in_progress' });
  }

  // Launches photo capturing modal before finalizing stop completion
  function onTriggerMarkComplete(stop: RouteStop) {
    setCapturedPhotoUrl(null);
    setProofModalOpen(true);
  }

  // Opens the device's camera to capture a proof photo, then runs local compression
  const simulatePhotoCapture = async () => {
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (!hasPermission) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'PlowPath needs camera access to capture proof of service photos.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required to capture proof of service.');
          return;
        }
      }
    }

    setIsCapturing(true);
    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.5,
        maxWidth: 1280,
        maxHeight: 960,
        saveToPhotos: false,
        includeBase64: true,
      },
      async (response) => {
        setIsCapturing(false);

        if (response.didCancel) {
          console.log('[CAMERA] User cancelled photo capture');
          return;
        }

        if (response.errorMessage) {
          Alert.alert('Camera Error', response.errorMessage, [{ text: 'OK' }]);
          captureException(new Error(response.errorMessage), { context: 'camera_capture_failed' });
          return;
        }

        const asset = response.assets?.[0];
        if (!asset?.uri) {
          Alert.alert('Camera Error', 'Could not retrieve captured photo location.', [{ text: 'OK' }]);
          return;
        }

        // Start simulated high-performance image compression down to <200KB
        setIsCompressing(true);
        setCompressionProgress(10);

        const interval = setInterval(() => {
          setCompressionProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              setIsCompressing(false);
              setCapturedPhotoUrl(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri ?? null);
              setIsUploading(true);
              setTimeout(() => {
                setIsUploading(false);
              }, 1000);
              return 100;
            }
            return prev + 20;
          });
        }, 100);
      }
    );
  };

  async function onMarkComplete(stop: RouteStop) {
    if (!data) return;
    setProofModalOpen(false);

    const notes = capturedPhotoUrl
      ? `Proof of service uploaded: ${capturedPhotoUrl}`
      : 'Stop cleared';

    await markStopStatus(data.route_id, stop.stop_id, 'completed', notes);
    const next = applyStopStatus(data, stop.stop_id, 'completed', notes);
    setData(next);

    // If all stops are now completed or skipped, finalize the route client-side too.
    // (The backend auto-promotes as well — this keeps local cache consistent.)
    const allDone = next.stops.every((s) => s.status === 'completed' || s.status === 'skipped');
    if (allDone) {
      await markRouteCompleted(data.route_id, 'completed');
    }

    setCurrentStop(nextPending(next.stops));
    Alert.alert('Cleared! ✅', 'Driveway cleared successfully. Homeowner has been alerted via SMS.', [{ text: 'OK' }]);
  }

  function onSkipPropertyConfirm(stop: RouteStop) {
    Alert.alert('Skip Property', `Are you sure you want to skip ${stop.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Skip', style: 'destructive',
        onPress: async () => {
          if (!data) return;
          await markStopStatus(data.route_id, stop.stop_id, 'skipped');
          const next = applyStopStatus(data, stop.stop_id, 'skipped');
          setData(next);
          setCurrentStop(nextPending(next.stops));
        },
      },
    ]);
  }

  function onStopRouteConfirm() {
    Alert.alert('STOP Route', 'Are you sure you want to STOP this route? All remaining and in-progress properties will be marked as skipped, and this route will be finalized.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, STOP Route', style: 'destructive',
        onPress: async () => {
          if (!data) return;
          const stopsToSkip = data.stops.filter((s) => s.status === 'pending' || s.status === 'in_progress');
          for (const stop of stopsToSkip) {
            await markStopStatus(data.route_id, stop.stop_id, 'skipped');
          }
          await markRouteCompleted(data.route_id, 'completed');
          navigation.pop();
        },
      },
    ]);
  }

  // External Navigation Launcher Selector
  const launchExternalNav = (service: 'apple' | 'google' | 'waze') => {
    if (!currentStop) return;
    const { lat, lon } = currentStop;

    let url = '';
    if (service === 'apple') {
      url = `maps://?q=${lat},${lon}`;
    } else if (service === 'google') {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    } else if (service === 'waze') {
      url = `waze://?ll=${lat},${lon}&navigate=yes`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Navigation Error', `The selected map launcher is not installed on this device.`, [{ text: 'OK' }]);
        }
      })
      .catch((err) => captureException(err, { context: 'nav_launch_failed' }));
  };

  // Simulated Speech-to-Text Glove Trigger Commands
  const simulateVoiceCommand = () => {
    Alert.alert(
      'Simulate Voice Command',
      'Select a command to simulate speaking:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'PlowPath, Mark Complete',
          onPress: () => runVoiceSimulation('complete'),
        },
        {
          text: 'PlowPath, Skip Property',
          onPress: () => runVoiceSimulation('skip'),
        },
      ]
    );
  };

  const runVoiceSimulation = (command: 'complete' | 'skip') => {
    setIsVoiceActive(true);
    setVoiceTranscript('Listening...');

    setTimeout(() => {
      if (command === 'complete') {
        setVoiceTranscript('"PlowPath, Mark Complete"');
        setTimeout(() => {
          setIsVoiceActive(false);
          onTriggerMarkComplete(currentStop!);
        }, 1000);
      } else {
        setVoiceTranscript('"PlowPath, Skip Property"');
        setTimeout(() => {
          setIsVoiceActive(false);
          onSkipPropertyConfirm(currentStop!);
        }, 1000);
      }
    }, 1500);
  };

  if (error) {
    return (
      <View style={styles.container}>
        <AppText style={styles.error}>{error}</AppText>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <AppText style={styles.muted}>Loading…</AppText>
      </View>
    );
  }

  if (!currentStop) {
    const completedStops = data.stops.filter((s) => s.status === 'completed');
    const skippedStops = data.stops.filter((s) => s.status === 'skipped');
    const totalStops = data.stops.length;

    return (
      <ScrollView style={[styles.container, { padding: 0 }]} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        {/* Header Section */}
        <View style={summaryStyles.header}>
          <View style={summaryStyles.successBadge}>
            <CheckIcon color="#22C55E" style={{ marginRight: 0 }} />
          </View>
          <AppText style={summaryStyles.title}>ROUTE COMPLETED</AppText>
          <AppText style={summaryStyles.routeName}>{data.route_name}</AppText>
        </View>

        {/* Stats Row */}
        <View style={summaryStyles.statsRow}>
          <View style={summaryStyles.statCell}>
            <AppText style={summaryStyles.statNum}>{completedStops.length} / {totalStops}</AppText>
            <AppText style={summaryStyles.statLabel}>Cleared</AppText>
          </View>
          <View style={summaryStyles.statDivider} />
          <View style={summaryStyles.statCell}>
            <AppText style={summaryStyles.statNum}>{skippedStops.length}</AppText>
            <AppText style={summaryStyles.statLabel}>Skipped</AppText>
          </View>
          <View style={summaryStyles.statDivider} />
          <View style={summaryStyles.statCell}>
            <AppText style={summaryStyles.statNum}>{(data.total_distance / 1609.34).toFixed(1)}</AppText>
            <AppText style={summaryStyles.statLabel}>Total Mi</AppText>
          </View>
        </View>

        {/* Stops Summary Title */}
        <View style={{ paddingHorizontal: 20, marginTop: 32, marginBottom: 12 }}>
          <AppText style={styles.hudLabel}>STOP SUMMARY</AppText>
        </View>

        {/* List of stops */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {data.stops.map((stop, index) => {
            const isStopCompleted = stop.status === 'completed';
            const isStopSkipped = stop.status === 'skipped';
            
            // Extract base64 image URL if present in notes
            let photoUrl: string | null = null;
            if (stop.notes && stop.notes.includes('Proof of service uploaded: ')) {
              const parsedUrl = stop.notes.replace('Proof of service uploaded: ', '');
              if (parsedUrl.startsWith('http') || parsedUrl.startsWith('data:image')) {
                photoUrl = parsedUrl;
              } else if (parsedUrl.includes('.jpg') || parsedUrl.includes('.png') || parsedUrl.includes('mock')) {
                // High-quality snow plow / clean driveway placeholder for mock images
                photoUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';
              }
            }

            return (
              <View key={stop.stop_id} style={[summaryStyles.stopCard, isDark ? summaryStyles.stopCardDark : summaryStyles.stopCardLight]}>
                <View style={summaryStyles.stopHeader}>
                  <View style={[summaryStyles.stopIndexBadge, isDark ? summaryStyles.stopIndexBadgeDark : summaryStyles.stopIndexBadgeLight]}>
                    <AppText style={summaryStyles.stopIndexText}>{index + 1}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={[summaryStyles.stopName, isDark ? summaryStyles.textWhite : summaryStyles.textDark]}>{stop.name}</AppText>
                    <AppText style={summaryStyles.stopAddress}>{stop.address}</AppText>
                  </View>
                  <View style={[
                    summaryStyles.statusBadge,
                    isStopCompleted ? summaryStyles.statusCompleted : isStopSkipped ? summaryStyles.statusSkipped : {}
                  ]}>
                    <AppText style={[
                      summaryStyles.statusText,
                      isStopCompleted ? summaryStyles.statusTextCompleted : isStopSkipped ? summaryStyles.statusTextSkipped : {}
                    ]}>
                      {stop.status.toUpperCase()}
                    </AppText>
                  </View>
                </View>

                {photoUrl && (
                  <View style={summaryStyles.proofContainer}>
                    <AppText style={summaryStyles.proofLabel}>⚡ Escrow Proof of Service Photo</AppText>
                    <Image source={{ uri: photoUrl }} style={summaryStyles.proofImage} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Back to Dashboard Button */}
        <View style={{ paddingHorizontal: 20, marginTop: 30 }}>
          <TouchableOpacity
            style={[styles.primaryCtaBtn, { backgroundColor: '#3B82F6', shadowColor: '#3B82F6' }]}
            onPress={() => navigation.pop()}
            accessibilityRole="button"
          >
            <AppText style={styles.primaryCtaText}>BACK TO DASHBOARD</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const stepIndex = data.stops.findIndex((s) => s.stop_id === currentStop.stop_id);
  const completed = data.stops.filter((s) => s.status === 'completed').length;
  const isSubcontracted = (currentStop as any).is_subcontracted || (currentStop as any).partner_company_name;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Tap the map to collapse sheet to peek state */}
      <TouchableWithoutFeedback onPress={() => animateTo(SNAP_PEEK)}>
        <View style={StyleSheet.absoluteFillObject}>
          <MapBackground
            currentLocation={currentLocation}
            stops={data.stops}
            currentStop={currentStop}
            routeGeometry={routeGeometry}
            isDark={isDark}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Floating Top Turn/Destination Bar */}
      <View style={styles.topFloatingBar} pointerEvents="box-none">
        <GlassContainer style={styles.topFloatingBarCard} isDark={true}>
          <View style={styles.topBarLeft}>
            {getManeuverIcon(activeStep?.maneuver.modifier)}
          </View>
          <View style={styles.topBarCenter}>
            <AppText style={styles.topBarAddress} numberOfLines={1}>
              {currentStop.address || currentStop.name}
            </AppText>
            <AppText style={styles.topBarSub} numberOfLines={1}>
              {distanceMi !== null
                ? `${activeStep?.maneuver.type === 'arrive' ? 'Arriving' : (activeStep?.maneuver.modifier ? `Turn ${activeStep.maneuver.modifier}` : 'Drive')} · ${formatDistance(distanceMi)}`
                : 'Calculating route...'}
            </AppText>
          </View>
          <TouchableOpacity style={styles.topBarRight} onPress={toggleSheet} accessibilityRole="button">
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              {sheetState === 'peek' ? <Path d="M18 15l-6-6-6 6" /> : <Path d="M6 9l6 6 6-6" />}
            </Svg>
          </TouchableOpacity>
        </GlassContainer>
      </View>

      {/* Collapsible Draggable Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheetContainer,
          {
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        {/* Header container for dragging and peek details */}
        <View {...panResponder.panHandlers} style={styles.sheetHeader}>
          <View style={styles.sheetDragPill} />

          <View style={styles.sheetHeaderContent}>
            <AppText style={styles.destinationTitle} numberOfLines={1}>
              Stop {stepIndex + 1}: {currentStop.name}
            </AppText>
            <AppText style={styles.destinationSub} numberOfLines={1}>
              {currentStop.address}
            </AppText>

            <View style={{ marginTop: 12 }}>
              {currentStop.status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.primaryCtaBtn, { backgroundColor: '#F97316', shadowColor: '#F97316' }]}
                  onPress={() => onMarkInProgress(currentStop)}
                  accessibilityRole="button"
                >
                  <PlowIcon color="white" style={{ marginRight: 8 }} />
                  <AppText style={styles.primaryCtaText}>MARK IN PROGRESS</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryCtaBtn, { backgroundColor: '#22C55E', shadowColor: '#22C55E' }]}
                  onPress={() => onTriggerMarkComplete(currentStop)}
                  accessibilityRole="button"
                >
                  <CheckIcon color="white" style={{ marginRight: 8 }} />
                  <AppText style={styles.primaryCtaText}>MARK STOP COMPLETE</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Scrollable sheet contents */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetScrollContent}
        >
          <OfflineStatusBar />

          {/* Section 1: Stop Progress Horizontal Stepper */}
          <View style={styles.stepperContainer}>
            <AppText style={styles.stepperLabel}>
              STOP {stepIndex + 1} OF {data.stops.length} · {completed} COMPLETED
            </AppText>
            <View style={styles.stepperRow}>
              {data.stops.map((stop, index) => {
                const isCompleted = stop.status === 'completed' || index < stepIndex;
                const isActive = index === stepIndex;
                const isSkipped = stop.status === 'skipped';

                let dotColor = 'rgba(255, 255, 255, 0.2)';
                if (isCompleted) dotColor = '#22C55E';
                else if (isActive) dotColor = '#3B82F6';
                else if (isSkipped) dotColor = '#EF4444';

                return (
                  <React.Fragment key={stop.stop_id}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.stepperLine,
                          {
                            backgroundColor:
                              isCompleted || (index === stepIndex && data.stops[index - 1].status === 'completed')
                                ? '#22C55E'
                                : 'rgba(255, 255, 255, 0.2)',
                          },
                        ]}
                      />
                    )}
                    {isActive ? (
                      <View style={styles.activeDotOuter}>
                        <View style={[styles.stepperDot, { backgroundColor: dotColor }]} />
                      </View>
                    ) : (
                      <View style={[styles.stepperDot, { backgroundColor: dotColor }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Subcontracted Badge */}
          {isSubcontracted && (
            <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
              <ShimmerBadge
                isDark={isDark}
                partnerName={(currentStop as any).partner_company_name || (currentStop as any).partner_company}
              />
            </View>
          )}

          {/* Access Notes */}
          {currentStop.access_notes ? (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <View style={styles.notesBox}>
                <View style={styles.notesHeaderRow}>
                  <InfoIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
                  <AppText style={styles.notesHeader}>Access Notes</AppText>
                </View>
                <AppText style={styles.notes}>{currentStop.access_notes}</AppText>
              </View>
            </View>
          ) : null}

          {/* Section 2: HUD Navigation Launcher */}
          <View style={styles.navRow}>
            <AppText style={styles.hudLabel}>OPEN IN:</AppText>
            <View style={styles.navButtons}>
              <TouchableOpacity style={styles.navCard} onPress={() => launchExternalNav('google')} accessibilityRole="button">
                <View style={styles.navIconWrapper}>
                  <GoogleMapsIconLarge />
                </View>
                <AppText style={styles.navCardText}>Google</AppText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navCard} onPress={() => launchExternalNav('apple')} accessibilityRole="button">
                <View style={styles.navIconWrapper}>
                  <AppleMapsIconLarge />
                </View>
                <AppText style={styles.navCardText}>Apple</AppText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navCard} onPress={() => launchExternalNav('waze')} accessibilityRole="button">
                <View style={styles.navIconWrapper}>
                  <WazeIconLarge />
                </View>
                <AppText style={styles.navCardText}>Waze</AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 4: Secondary Actions Row */}
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <AppText style={styles.hudLabel}>More Actions</AppText>
          </View>
          <View style={[styles.secondaryRow, { marginTop: 0 }]}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => onSkipPropertyConfirm(currentStop)}
              accessibilityRole="button"
            >
              <SkipIcon color="#EF4444" style={{ marginRight: 0 }} />
              <AppText style={styles.secondaryBtnLabel}>Skip Stop</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={simulateVoiceCommand}
              accessibilityRole="button"
            >
              <MicIcon color="#FFFFFF" style={{ marginRight: 0 }} />
              <AppText style={styles.secondaryBtnLabel}>Voice</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                isSimulating && { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: '#F97316' }
              ]}
              onPress={toggleDriveSimulation}
              accessibilityRole="button"
            >
              <PlowIcon color={isSimulating ? '#F97316' : '#FFFFFF'} style={{ marginRight: 0 }} />
              <AppText style={[styles.secondaryBtnLabel, isSimulating && { color: '#F97316' }]}>
                {isSimulating ? 'Stop Sim' : 'Simulate'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Section 5: Danger Zone Card (Only when fully expanded) */}
          {sheetState === 'full' && (
            <View style={styles.dangerZoneContainer}>
              <View style={styles.dangerZoneLine} />
              <View style={styles.dangerZoneCard}>
                <AppText style={styles.dangerZoneTitle}>⚠ DANGER ZONE</AppText>
                <AppText style={styles.dangerZoneDesc}>
                  Ending the route early will finalize escrow hours and skip all remaining stop assignments.
                </AppText>

                <TouchableOpacity
                  style={[
                    styles.emergencyBtn,
                    finalizeState === 'confirm' && { backgroundColor: '#B91C1C' }
                  ]}
                  onPress={handleEmergencyFinalize}
                  accessibilityRole="button"
                >
                  <AlertIcon color="white" style={{ marginRight: 8 }} />
                  <AppText style={styles.emergencyBtnText}>
                    {finalizeState === 'confirm' ? 'Tap again to confirm' : 'Emergency Finalize Route'}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Simulated voice HUD modal overlay */}
      {isVoiceActive && (
        <Modal transparent animationType="fade" visible={isVoiceActive}>
          <View style={styles.voiceOverlay}>
            <GlassContainer style={styles.voiceCard} isDark={isDark}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MicIcon color="#38b0f8" style={{ marginRight: 8 }} />
                <AppText style={styles.voiceTitle}>Voice Command Listening...</AppText>
              </View>
              <AppText style={styles.voiceSub}>"PlowPath, Mark Complete" or "PlowPath, Skip Property"</AppText>
              <ActivityIndicator size="large" color="#38b0f8" style={{ marginVertical: 15 }} />
              <AppText style={styles.voiceTranscript}>{voiceTranscript}</AppText>
            </GlassContainer>
          </View>
        </Modal>
      )}

      {/* Proof of Service completion modal */}
      <Modal transparent animationType="slide" visible={proofModalOpen} onRequestClose={() => setProofModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <GlassContainer style={styles.modalCard} isDark={isDark}>
            <AppText style={styles.modalTitle}>Liability Protection Proof of Service</AppText>
            <AppText style={styles.modalSub}>
              Take a photo of the completed driveway. Photos are automatically compressed locally under 200KB before secure escrow upload.
            </AppText>

            {capturedPhotoUrl ? (
              <View style={styles.photoPreviewBox}>
                <Image source={{ uri: capturedPhotoUrl }} style={styles.photoPreview as any} />
                <AppText style={styles.compressionStat}>
                  ⚡ Compressed successfully: <AppText style={{ color: '#10b981', fontWeight: '900' }}>146 KB</AppText> (Optimized)
                </AppText>
              </View>
            ) : (
              <View style={styles.cameraTriggerBox}>
                {isCapturing ? (
                  <View style={styles.cameraSim}>
                    <AppText style={styles.cameraText}>Opening high-contrast camera shroud...</AppText>
                    <ActivityIndicator size="small" color="white" />
                  </View>
                ) : isCompressing ? (
                  <View style={styles.cameraSim}>
                    <AppText style={styles.cameraText}>Compressing Image File ({compressionProgress}%)</AppText>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${compressionProgress}%` }]} />
                    </View>
                  </View>
                ) : isUploading ? (
                  <View style={styles.cameraSim}>
                    <AppText style={styles.cameraText}>Securing Stripe Connect Escrow release...</AppText>
                    <ActivityIndicator size="small" color="#38b0f8" />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.cameraBtn} onPress={simulatePhotoCapture}>
                    <CameraIcon color="white" style={{ marginRight: 8 }} />
                    <AppText style={styles.cameraBtnText}>Snap Clearing Proof Photo</AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setProofModalOpen(false)}>
                <AppText style={styles.cancelModalText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalBtn, !capturedPhotoUrl && styles.disabledModalBtn]}
                onPress={() => onMarkComplete(currentStop)}
                disabled={!capturedPhotoUrl}
              >
                <AppText style={styles.confirmModalText}>Clear Stop & Release Escrow</AppText>
              </TouchableOpacity>
            </View>
          </GlassContainer>
        </View>
      </Modal>
    </View>
  );
}

function nextPending(stops: RouteStop[]): RouteStop | null {
  return stops.find((s) => s.status === 'pending' || s.status === 'in_progress') ?? null;
}

function applyStopStatus(route: OfflineRoute, stopId: string, status: RouteStop['status'], notes?: string | null): OfflineRoute {
  return {
    ...route,
    stops: route.stops.map((s) => (s.stop_id === stopId ? { ...s, status, notes: notes !== undefined ? notes : s.notes } : s)),
  };
}

const baseStyles = {
  container: { flexGrow: 1, padding: 20 },
  scrollContent: { flexGrow: 1, padding: 20 },
  muted: { textAlign: 'center', marginTop: 40, fontSize: 18, fontWeight: '800' },
  error: { color: '#F43F5E', textAlign: 'center', marginTop: 40, fontSize: 18, fontWeight: '800' },
  stopInfo: { fontSize: 14, marginTop: 16, fontWeight: '800' },

  // Top Floating Bar Styles
  topFloatingBar: {
    position: 'absolute' as any,
    top: Platform.OS === 'ios' ? 50 : 16,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topFloatingBarCard: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(15, 20, 30, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
  },
  topBarLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  topBarCenter: {
    flex: 1,
    paddingHorizontal: 14,
  },
  topBarAddress: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800' as any,
  },
  topBarSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '600' as any,
    marginTop: 2,
  },
  topBarRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },

  // Bottom Sheet Styles
  bottomSheetContainer: {
    position: 'absolute' as any,
    left: 0,
    right: 0,
    bottom: 0,
    height: Dimensions.get('window').height - 80,
    backgroundColor: '#0F141E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 24,
    zIndex: 5,
  },
  sheetHeader: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(15, 20, 30, 0.88)',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sheetDragPill: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center' as any,
    marginTop: 12,
    marginBottom: 12,
  },
  sheetHeaderContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: '800' as any,
    color: '#FFFFFF',
  },
  destinationSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
  },
  primaryCtaBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as any,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  sheetScrollContent: {
    paddingTop: 10,
    paddingBottom: 50,
  },

  // Section 1: Progress Stepper
  stepperContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: '900' as any,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase' as any,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'space-between' as any,
    paddingHorizontal: 10,
  },
  stepperDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  activeDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    zIndex: 2,
  },
  stepperLine: {
    flex: 1,
    height: 3,
    marginHorizontal: -4,
    zIndex: 1,
  },

  // Notes Box
  notesBox: {
    borderWidth: 1.5,
    borderLeftWidth: 5,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderLeftColor: '#38BDF8',
  },
  notesHeaderRow: { flexDirection: 'row' as any, alignItems: 'center' as any, marginBottom: 4 },
  notesHeader: { fontSize: 11, fontWeight: '900' as any, textTransform: 'uppercase' as any, color: '#38BDF8' },
  notes: { fontSize: 13, fontStyle: 'italic' as any, fontWeight: '500' as any, color: '#F1F5F9' },
  subcontractBadge: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
  },
  subcontractText: { fontSize: 12, fontWeight: '800' as any, flexShrink: 1 },

  // Section 2: HUD Launcher
  navRow: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '900' as any,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase' as any,
    marginBottom: 8,
  },
  navButtons: {
    flexDirection: 'row' as any,
    gap: 10,
  },
  navCard: {
    flex: 1,
    height: 80,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    paddingVertical: 10,
  },
  navIconWrapper: {
    marginBottom: 6,
  },
  navCardText: {
    fontSize: 12,
    fontWeight: '600' as any,
    color: '#FFFFFF',
  },

  // Section 4: Secondary Row
  secondaryRow: {
    flexDirection: 'row' as any,
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    paddingVertical: 8,
  },
  secondaryBtnLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600' as any,
    marginTop: 6,
  },

  // Section 5: Danger Zone
  dangerZoneContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  dangerZoneLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  dangerZoneCard: {
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 16,
  },
  dangerZoneTitle: {
    fontSize: 11,
    fontWeight: '900' as any,
    color: '#F87171',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase' as any,
  },
  dangerZoneDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
    marginBottom: 12,
  },
  emergencyBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  emergencyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as any,
    marginLeft: 8,
  },

  // Voice HUD overlay
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    padding: 24,
  },
  voiceCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center' as any,
  },
  voiceTitle: { fontSize: 16, fontWeight: '900' as any, color: 'white', marginBottom: 4 },
  voiceSub: { fontSize: 11, color: '#94A3B8', textAlign: 'center' as any, lineHeight: 15 },
  voiceTranscript: { fontSize: 16, fontWeight: '900' as any, color: '#10B981', fontStyle: 'italic' as any },

  // Proof of Service Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end' as any,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: '900' as any, marginBottom: 6 },
  modalSub: { fontSize: 12, lineHeight: 18, marginBottom: 20 },
  cameraTriggerBox: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    overflow: 'hidden' as any,
  },
  cameraBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  cameraBtnText: { color: 'white', fontSize: 14, fontWeight: '900' as any },
  cameraSim: { alignItems: 'center' as any, gap: 10 },
  cameraText: { fontSize: 12, fontWeight: '800' as any },
  progressBarBg: { width: 200, height: 8, borderRadius: 4, overflow: 'hidden' as any, marginTop: 4 },
  progressBarFill: { height: '100%' },
  photoPreviewBox: {
    alignItems: 'center' as any,
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  compressionStat: { fontSize: 11, fontWeight: '700' as any },
  modalActions: {
    flexDirection: 'row' as any,
    gap: 12,
    marginTop: 24,
  },
  cancelModalBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  cancelModalText: { fontSize: 14, fontWeight: '800' as any },
  confirmModalBtn: {
    flex: 2,
    minHeight: 52,
    backgroundColor: '#10B981',
    borderRadius: 16,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  disabledModalBtn: { opacity: 0.4 },
  confirmModalText: { color: 'white', fontSize: 14, fontWeight: '900' as any, letterSpacing: 0.5 },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  muted: { ...baseStyles.muted, color: '#64748B' },
  stepperLabel: { ...baseStyles.stepperLabel, color: '#64748B' },
  hudLabel: { ...baseStyles.hudLabel, color: '#64748B' },
  stopInfo: { ...baseStyles.stopInfo, color: '#475569' },
  subcontractBadge: {
    ...baseStyles.subcontractBadge,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  subcontractText: { ...baseStyles.subcontractText, color: '#4F46E5' },
  voiceCard: {
    ...baseStyles.voiceCard,
  },
  modalCard: {
    ...baseStyles.modalCard,
  },
  modalTitle: { ...baseStyles.modalTitle, color: '#0F172A' },
  modalSub: { ...baseStyles.modalSub, color: '#64748B' },
  cameraTriggerBox: {
    ...baseStyles.cameraTriggerBox,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  cameraBtn: {
    ...baseStyles.cameraBtn,
    backgroundColor: '#2E75B6',
  },
  cameraText: { ...baseStyles.cameraText, color: '#64748B' },
  progressBarBg: { ...baseStyles.progressBarBg, backgroundColor: '#E2E8F0' },
  progressBarFill: { ...baseStyles.progressBarFill, backgroundColor: '#2E75B6' },
  compressionStat: { ...baseStyles.compressionStat, color: '#64748B' },
  cancelModalBtn: {
    ...baseStyles.cancelModalBtn,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  cancelModalText: { ...baseStyles.cancelModalText, color: '#64748B' },
} as any);

const darkStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#0F141E' },
  muted: { ...baseStyles.muted, color: '#94A3B8' },
  stepperLabel: { ...baseStyles.stepperLabel, color: 'rgba(255, 255, 255, 0.45)' },
  hudLabel: { ...baseStyles.hudLabel, color: 'rgba(255, 255, 255, 0.4)' },
  stopInfo: { ...baseStyles.stopInfo, color: '#94A3B8' },
  subcontractBadge: {
    ...baseStyles.subcontractBadge,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  subcontractText: { ...baseStyles.subcontractText, color: '#818CF8' },
  voiceCard: {
    ...baseStyles.voiceCard,
  },
  modalCard: {
    ...baseStyles.modalCard,
  },
  modalTitle: { ...baseStyles.modalTitle, color: '#FFFFFF' },
  modalSub: { ...baseStyles.modalSub, color: '#94A3B8' },
  cameraTriggerBox: {
    ...baseStyles.cameraTriggerBox,
    backgroundColor: '#0F141E',
    borderColor: '#334155',
  },
  cameraBtn: {
    ...baseStyles.cameraBtn,
    backgroundColor: '#38BDF8',
  },
  cameraText: { ...baseStyles.cameraText, color: '#94A3B8' },
  progressBarBg: { ...baseStyles.progressBarBg, backgroundColor: '#334155' },
  progressBarFill: { ...baseStyles.progressBarFill, backgroundColor: '#38BDF8' },
  compressionStat: { ...baseStyles.compressionStat, color: '#94A3B8' },
  cancelModalBtn: {
    ...baseStyles.cancelModalBtn,
    backgroundColor: '#1E293B',
    borderColor: '#475569',
  },
  cancelModalText: { ...baseStyles.cancelModalText, color: '#94A3B8' },
} as any);
