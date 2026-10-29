import AppText from '../components/AppText';
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, StatusBar, Image } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import { useAuthStore } from '../store/authStore';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const [hydrated, setHydrated] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Animation values
  const introFade = useRef(new Animated.Value(0)).current;      // Overall intro fade
  const logoScale = useRef(new Animated.Value(0.7)).current;    // Logo intro scale
  const logoPulse = useRef(new Animated.Value(1)).current;      // Logo breathing pulse
  const progressScale = useRef(new Animated.Value(0)).current;  // Progress bar scaleX
  const exitOpacity = useRef(new Animated.Value(1)).current;    // Overall exit opacity
  const exitScale = useRef(new Animated.Value(1)).current;      // Overall exit scale

  // Track Zustand store hydration status
  useEffect(() => {
    const checkHydration = () => {
      if (useAuthStore.persist.hasHydrated()) {
        setHydrated(true);
        return true;
      }
      return false;
    };

    if (checkHydration()) return;

    // Listen for hydration completion
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsub;
  }, []);

  // Trigger intro and loading bar animations
  useEffect(() => {
    // 1. Fade in the UI components
    Animated.parallel([
      Animated.timing(introFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1.0,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Start the infinite breathing pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, {
            toValue: 1.05,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoPulse, {
            toValue: 0.96,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 3. Animate loading progress bar over a minimum of 2000ms
    Animated.timing(progressScale, {
      toValue: 1,
      duration: 2000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setMinTimeElapsed(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle exiting when store is hydrated AND minimum screen display time is met
  useEffect(() => {
    if (hydrated && minTimeElapsed) {
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(exitScale, {
          toValue: 1.08,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, minTimeElapsed]);

  // Combine scaling values (intro scaling, pulse breathing, and exit scaling)
  const combinedLogoScale = Animated.multiply(
    Animated.multiply(logoScale, logoPulse),
    exitScale
  );

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: exitOpacity, transform: [{ scale: exitScale }] }
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B192C" />

      {/* Deep Space / Winter Night Gradient Background */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0B192C" stopOpacity={1} />
            <Stop offset="100%" stopColor="#0F141E" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bgGrad)" />
      </Svg>

      {/* Decorative background shapes for a premium glassmorphic feel */}
      <View style={[styles.bgCircle, styles.circleLeft]} pointerEvents="none" />
      <View style={[styles.bgCircle, styles.circleRight]} pointerEvents="none" />

      <Animated.View style={[styles.content, { opacity: introFade }]}>
        {/* Animated Brand Emblem */}
        <Animated.View style={{ transform: [{ scale: combinedLogoScale }] }}>
          <View style={styles.logoShadowWrapper}>
            <Image 
              source={require('../assets/app_icon.png')} 
              style={{ width: 180, height: 180, borderRadius: 36 }} 
            />
          </View>
        </Animated.View>

        {/* Branding Typography */}
        <AppText style={styles.title}>PLOWPATH</AppText>
        <AppText style={styles.subtitle}>Smart Winter Operations</AppText>

        {/* Custom Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarTrack}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { transform: [{ scaleX: progressScale }, { translateX: 0 }] }
              ]} 
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F141E',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoShadowWrapper: {
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    borderRadius: 90,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  progressContainer: {
    marginTop: 64,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarTrack: {
    width: 180,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
    // Setting transformOrigin to left to animate from left to right
    transform: [{ scaleX: 0 }],
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.05,
    backgroundColor: '#38BDF8',
  },
  circleLeft: {
    width: 250,
    height: 250,
    top: '15%',
    left: '-20%',
  },
  circleRight: {
    width: 300,
    height: 300,
    bottom: '10%',
    right: '-25%',
  },
});
