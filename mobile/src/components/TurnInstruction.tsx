import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

interface Props {
  instruction: string;
  secondary?: string | null;
  distanceMi: number | null;
}

function formatDistance(mi: number | null): string {
  if (mi == null) return '';
  if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
  return `${mi.toFixed(1)} mi`;
}

export default function TurnInstruction({ instruction, secondary, distanceMi }: Props) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (distanceMi !== null) {
      // Trigger a subtle scale bounce and opacity flash whenever the distance changes
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0.7);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [distanceMi, scaleAnim, opacityAnim]);

  // Style helper mapping to the design system tokens
  const containerStyle = [
    styles.container,
    isDark ? styles.containerDark : styles.containerLight,
  ];

  const mainTextColor = isDark ? '#FFFFFF' : '#0B0F19';
  const secondaryTextColor = isDark ? '#E2E8F0' : '#475569';
  const labelTextColor = isDark ? '#94A3B8' : '#64748B';
  const unitColor = isDark ? '#38BDF8' : '#2E75B6';

  let distVal = '';
  let distUnit = '';
  if (distanceMi != null) {
    const formatted = formatDistance(distanceMi);
    const parts = formatted.split(' ');
    distVal = parts[0] || '';
    distUnit = parts[1] || '';
  }

  return (
    <View style={containerStyle}>
      {/* Top accent highlight line representing '--accent-ice' */}
      <View style={styles.topAccentBar} />

      <Text
        style={[styles.main, { color: mainTextColor }]}
        accessibilityRole="header"
      >
        {instruction}
      </Text>

      {distanceMi != null && (
        <View style={styles.distanceWrapper}>
          <Text style={[styles.distanceLabel, { color: labelTextColor }]}>
            In
          </Text>
          <Animated.View
            style={[
              styles.distanceContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Text style={[styles.distanceValue, { color: mainTextColor }]}>
              {distVal}
            </Text>
            <Text style={[styles.distanceUnit, { color: unitColor }]}>
              {distUnit}
            </Text>
          </Animated.View>
        </View>
      )}

      {secondary ? (
        <Text style={[styles.secondary, { color: secondaryTextColor }]}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    marginVertical: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  containerDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)', // semi-transparent deep void
    borderColor: '#334155', // --border-subtle
    shadowColor: '#000000',
  },
  containerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // semi-transparent light surface
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#38BDF8', // --accent-ice
  },
  main: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  distanceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
    gap: 8,
  },
  distanceLabel: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  distanceValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  distanceUnit: {
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  secondary: {
    fontSize: 15,
    marginTop: 8,
    fontWeight: '600',
  },
});
