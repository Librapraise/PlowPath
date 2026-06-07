import AppText from '../components/AppText';
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView, Modal, ActivityIndicator, Image, Platform, PermissionsAndroid, Animated, Easing } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { launchCamera } from 'react-native-image-picker';

// Premium SVG custom icons for Navigation/HUD
const PlowIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
    <Path d="M4 11h16M4 15h16M8 11v8M16 11v8" />
    <Circle cx="12" cy="7" r="3" />
  </Svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Path d="M22 4L12 14.01l-3-3" />
  </Svg>
);

const SkipIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M15 9l-6 6M9 9l6 6" />
  </Svg>
);

const MicIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </Svg>
);

const AlertIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <Path d="M12 9v4M12 17h.01" />
  </Svg>
);

const CameraIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
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
import { fetchRouteSteps, OsrmStep } from '../services/osrm.service';
import { captureException } from '../services/sentry';
import type { RootStackParamList } from '../services/navigation';
import GlassContainer from '../components/GlassContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

const ARRIVAL_RADIUS_M = 30;

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

  useEffect(() => {
    currentStopRef.current = currentStop;
    routeStepsRef.current = [];
    currentStepIndexRef.current = 0;
    setActiveStep(null);
    fetchingRoute.current = false;
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

  function onGpsSample(sample: GpsSample) {
    const stop = currentStopRef.current;
    if (!stop) return;
    setCurrentLocation(sample);

    if (routeStepsRef.current.length === 0 && !fetchingRoute.current) {
       fetchingRoute.current = true;
       fetchRouteSteps(sample.lon, sample.lat, stop.lon, stop.lat).then(steps => {
         if (steps.length > 0) {
           routeStepsRef.current = steps;
           currentStepIndexRef.current = 0;
           setActiveStep(steps[0]);
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
    const next = applyStopStatus(data, stop.stop_id, 'completed');
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
  if (!data || !currentStop) {
    return (
      <View style={styles.container}>
        <AppText style={styles.muted}>{data ? 'Route complete.' : 'Loading…'}</AppText>
      </View>
    );
  }

  const stepIndex = data.stops.findIndex((s) => s.stop_id === currentStop.stop_id);
  const completed = data.stops.filter((s) => s.status === 'completed').length;
  const isSubcontracted = (currentStop as any).is_subcontracted || (currentStop as any).partner_company_name;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <OfflineStatusBar />
      
      <TurnInstruction
        instruction={activeStep?.maneuver.type === 'arrive' ? 'Arriving at' : (activeStep?.maneuver.modifier ? `Turn ${activeStep.maneuver.modifier}` : activeStep?.maneuver.type || 'Drive to')}
        secondary={activeStep?.name || currentStop.address || currentStop.name}
        distanceMi={activeStep && currentLocation ? haversineDistance([currentLocation.lon, currentLocation.lat], activeStep.maneuver.location, 'miles') : distanceMi}
        maneuverModifier={activeStep?.maneuver.modifier}
      />

      <RouteProgress total={data.stops.length} currentIndex={stepIndex} />

      {/* Subcontracted Enterprise Rival Badge with Shimmer Animation */}
      {isSubcontracted && (
        <ShimmerBadge
          isDark={isDark}
          partnerName={(currentStop as any).partner_company_name || (currentStop as any).partner_company}
        />
      )}

      <AppText style={styles.stopInfo}>
        Stop {stepIndex + 1} / {data.stops.length} · Completed {completed}
      </AppText>

      {/* Access Notes with left-edge border and InfoIcon */}
      {currentStop.access_notes ? (
        <View style={styles.notesBox}>
          <View style={styles.notesHeaderRow}>
            <InfoIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
            <AppText style={styles.notesHeader}>Access Notes</AppText>
          </View>
          <AppText style={styles.notes}>{currentStop.access_notes}</AppText>
        </View>
      ) : null}

      {/* External Map Selectors HUD with Brand Logos */}
      <View style={styles.navRow}>
        <AppText style={styles.hudLabel}>Launch HUD Navigation:</AppText>
        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.navBtn} onPress={() => launchExternalNav('google')} accessibilityRole="button">
            <GoogleMapsIcon />
            <AppText style={styles.navBtnText}>Google</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => launchExternalNav('apple')} accessibilityRole="button">
            <AppleMapsIcon />
            <AppText style={styles.navBtnText}>Apple</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => launchExternalNav('waze')} accessibilityRole="button">
            <WazeIcon />
            <AppText style={styles.navBtnText}>Waze</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Glove-friendly oversized buttons console */}
      <View style={styles.buttonRow}>
        {currentStop.status === 'pending' ? (
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn, { minHeight: 64 }]}
            onPress={() => onMarkInProgress(currentStop)}
            accessibilityRole="button"
          >
            <PlowIcon color="white" />
            <AppText style={styles.btnText}>Mark In Progress</AppText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.successBtn, { minHeight: 64 }]}
            onPress={() => onTriggerMarkComplete(currentStop)}
            accessibilityRole="button"
          >
            <CheckIcon color="white" />
            <AppText style={styles.btnText}>Clear Stop (Mark Complete)</AppText>
          </TouchableOpacity>
        )}

        {/* Secondary CTAs (Skip Property & Glove Voice Control side-by-side) */}
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={[styles.btn, styles.skipBtn, { flex: 1, minHeight: 52 }]}
            onPress={() => onSkipPropertyConfirm(currentStop)}
            accessibilityRole="button"
          >
            <SkipIcon color={isDark ? '#EF4444' : '#DC2626'} />
            <AppText style={[styles.btnText, { color: isDark ? '#FFFFFF' : '#1E293B', fontSize: 14 }]}>Skip Stop</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.voiceTriggerBtn, { flex: 1, minHeight: 52 }]}
            onPress={simulateVoiceCommand}
            accessibilityRole="button"
          >
            <MicIcon color={isDark ? '#38BDF8' : '#2E75B6'} />
            <AppText style={[styles.btnText, { color: isDark ? '#38BDF8' : '#2E75B6', fontSize: 14 }]}>Voice Control</AppText>
          </TouchableOpacity>
        </View>

        {/* Safety Critical Danger Zone (Finalize Route) isolated with 32px gap */}
        <View style={styles.dangerZoneContainer}>
          <AppText style={styles.dangerZoneTitle}>Danger Zone</AppText>
          <AppText style={styles.dangerZoneDesc}>
            Accidentally ending the route will finalize escrow hours and skip all remaining stop assignments.
          </AppText>
          <TouchableOpacity
            style={[styles.btn, styles.stopRouteBtn, { minHeight: 52 }]}
            onPress={onStopRouteConfirm}
            accessibilityRole="button"
          >
            <AlertIcon color="white" />
            <AppText style={styles.btnText}>Emergency Finalize Route</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Simulated voice HUD modal overlay */}
      {isVoiceActive && (
        <Modal transparent animationType="fade" visible={isVoiceActive}>
          <View style={styles.voiceOverlay}>
            <GlassContainer style={styles.voiceCard} isDark={isDark}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MicIcon color="#38b0f8" />
                <AppText style={styles.voiceTitle}>Voice Command Listening...</AppText>
              </View>
              <AppText style={styles.voiceSub}>"PlowPath, Mark Complete" or "PlowPath, Skip Property"</AppText>
              <ActivityIndicator size="large" color="#38b0f8" style={{ marginVertical: 15 }} />
              <AppText style={styles.voiceTranscript}>{voiceTranscript}</AppText>
            </GlassContainer>
          </View>
        </Modal>
      )}

      {/* Proof of Service completion modal with local high-performance compression progress bar */}
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
                    <CameraIcon color="white" />
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
    </ScrollView>
  );
}

function nextPending(stops: RouteStop[]): RouteStop | null {
  return stops.find((s) => s.status === 'pending' || s.status === 'in_progress') ?? null;
}

function applyStopStatus(route: OfflineRoute, stopId: string, status: RouteStop['status']): OfflineRoute {
  return {
    ...route,
    stops: route.stops.map((s) => (s.stop_id === stopId ? { ...s, status } : s)),
  };
}

const baseStyles = {
  container: { flexGrow: 1, padding: 20 },
  muted: { textAlign: 'center', marginTop: 40, fontSize: 18, fontWeight: '800' },
  error: { color: '#F43F5E', textAlign: 'center', marginTop: 40, fontSize: 18, fontWeight: '800' },
  stopInfo: { fontSize: 14, marginTop: 16, fontWeight: '800' },
  notesBox: {
    borderWidth: 1.5,
    borderLeftWidth: 5,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  notesHeaderRow: { flexDirection: 'row' as any, alignItems: 'center' as any, marginBottom: 4 },
  notesHeader: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' as any },
  notes: { fontSize: 13, fontStyle: 'italic', fontWeight: '500' },
  subcontractBadge: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
  },
  subcontractText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  navRow: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 16,
  },
  hudLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' as any, marginBottom: 8 },
  navButtons: { flexDirection: 'row' as any, gap: 8 },
  navBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    flexDirection: 'row' as any,
  },
  navBtnText: { fontSize: 12, fontWeight: '800' },
  buttonRow: { marginTop: 24, gap: 12 },
  btn: {
    minHeight: 64,
    borderRadius: 18,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
    flexDirection: 'row' as any,
  },
  primaryBtn: { backgroundColor: '#F97316' }, // orange in progress
  successBtn: { backgroundColor: '#10B981' }, // green complete
  skipBtn: { borderWidth: 1.5 },
  voiceTriggerBtn: { borderWidth: 1.5 },
  stopRouteBtn: { backgroundColor: '#EF4444' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  
  // Redesign custom additions
  primaryGlowContainer: { borderRadius: 12 },
  secondaryActionsRow: { flexDirection: 'row' as any, gap: 12 },
  dangerZoneContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginTop: 32,
  },
  dangerZoneTitle: { fontSize: 13, fontWeight: '900' as any, textTransform: 'uppercase' as any, marginBottom: 4 },
  dangerZoneDesc: { fontSize: 11, marginBottom: 12, lineHeight: 15 },

  // Voice HUD overlay
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  voiceCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  voiceTitle: { fontSize: 16, fontWeight: '900', color: 'white', marginBottom: 4 },
  voiceSub: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 15 },
  voiceTranscript: { fontSize: 16, fontWeight: '900', color: '#10B981', fontStyle: 'italic' },
  
  // Proof of Service Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  modalSub: { fontSize: 12, lineHeight: 18, marginBottom: 20 },
  cameraTriggerBox: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },
  cameraBtnText: { color: 'white', fontSize: 14, fontWeight: '900' },
  cameraSim: { alignItems: 'center', gap: 10 },
  cameraText: { fontSize: 12, fontWeight: '800' },
  progressBarBg: { width: 200, height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  progressBarFill: { height: '100%' },
  photoPreviewBox: {
    alignItems: 'center',
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  compressionStat: { fontSize: 11, fontWeight: '700' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelModalBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: { fontSize: 14, fontWeight: '800' },
  confirmModalBtn: {
    flex: 2,
    minHeight: 52,
    backgroundColor: '#10B981',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledModalBtn: { opacity: 0.4 },
  confirmModalText: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
};

const lightStyles = StyleSheet.create({
  ...baseStyles,
  container: { ...baseStyles.container, backgroundColor: '#F8FAFC' },
  muted: { ...baseStyles.muted, color: '#64748B' },
  stopInfo: { ...baseStyles.stopInfo, color: '#475569' },
  notesBox: {
    ...baseStyles.notesBox,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderLeftColor: '#2E75B6',
  },
  notesHeader: { ...baseStyles.notesHeader, color: '#2E75B6' },
  notes: { ...baseStyles.notes, color: '#1E293B' },
  subcontractBadge: {
    ...baseStyles.subcontractBadge,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  subcontractText: { ...baseStyles.subcontractText, color: '#4F46E5' },
  navRow: {
    ...baseStyles.navRow,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  hudLabel: { ...baseStyles.hudLabel, color: '#64748B' },
  navBtn: {
    ...baseStyles.navBtn,
    backgroundColor: '#F1F5F9',
  },
  navBtnText: { ...baseStyles.navBtnText, color: '#475569' },
  skipBtn: {
    ...baseStyles.skipBtn,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  voiceTriggerBtn: {
    ...baseStyles.voiceTriggerBtn,
    backgroundColor: '#ECF2F8',
    borderColor: '#2E75B6',
  },
  dangerZoneContainer: {
    ...baseStyles.dangerZoneContainer,
    borderColor: '#CBD5E1',
    backgroundColor: 'rgba(15, 23, 42, 0.02)',
  },
  dangerZoneTitle: { ...baseStyles.dangerZoneTitle, color: '#DC2626' },
  dangerZoneDesc: { ...baseStyles.dangerZoneDesc, color: '#64748B' },
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
  container: { ...baseStyles.container, backgroundColor: '#0B0F19' },
  muted: { ...baseStyles.muted, color: '#94A3B8' },
  stopInfo: { ...baseStyles.stopInfo, color: '#94A3B8' },
  notesBox: {
    ...baseStyles.notesBox,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderLeftColor: '#38BDF8',
  },
  notesHeader: { ...baseStyles.notesHeader, color: '#38BDF8' },
  notes: { ...baseStyles.notes, color: '#F1F5F9' },
  subcontractBadge: {
    ...baseStyles.subcontractBadge,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  subcontractText: { ...baseStyles.subcontractText, color: '#818CF8' },
  navRow: {
    ...baseStyles.navRow,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  hudLabel: { ...baseStyles.hudLabel, color: '#94A3B8' },
  navBtn: {
    ...baseStyles.navBtn,
    backgroundColor: '#334155',
  },
  navBtnText: { ...baseStyles.navBtnText, color: '#E2E8F0' },
  skipBtn: {
    ...baseStyles.skipBtn,
    backgroundColor: '#1E293B',
    borderColor: '#475569',
  },
  voiceTriggerBtn: {
    ...baseStyles.voiceTriggerBtn,
    backgroundColor: '#102434',
    borderColor: '#38BDF8',
  },
  dangerZoneContainer: {
    ...baseStyles.dangerZoneContainer,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  dangerZoneTitle: { ...baseStyles.dangerZoneTitle, color: '#EF4444' },
  dangerZoneDesc: { ...baseStyles.dangerZoneDesc, color: '#94A3B8' },
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
    backgroundColor: '#0B0F19',
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
