import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

interface Props {
  total: number;
  currentIndex: number;
  width?: number;
  height?: number;
}

interface DotProps {
  index: number;
  currentIndex: number;
  dotX: number;
  height: number;
  isDark: boolean;
}

function ProgressDot({ index, currentIndex, dotX, height, isDark }: DotProps) {
  // status: 0 = pending, 1 = active, 2 = done
  const status = index < currentIndex ? 2 : index === currentIndex ? 1 : 0;

  const scaleAnim = useRef(new Animated.Value(status === 1 ? 1.25 : 1)).current;
  const colorAnim = useRef(new Animated.Value(status)).current;

  useEffect(() => {
    // When the status of this dot changes, trigger a bounce and color transition
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.45,
          duration: 180,
          useNativeDriver: false, // background/border animations don't support native driver in standard Animated
        }),
        Animated.spring(scaleAnim, {
          toValue: status === 1 ? 1.25 : 1,
          friction: 4,
          tension: 40,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(colorAnim, {
        toValue: status,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
  }, [status, scaleAnim, colorAnim]);

  // Color mappings based on design system
  const pendingColor = isDark ? '#1E293B' : '#FFFFFF';
  const activeColor = isDark ? '#38BDF8' : '#2E75B6';
  const doneColor = '#10B981';

  const pendingBorderColor = isDark ? '#475569' : '#CBD5E1';

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [pendingColor, activeColor, doneColor],
  });

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [pendingBorderColor, activeColor, doneColor],
  });

  const baseSize = 14;

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: dotX - baseSize / 2,
          top: height / 2 - baseSize / 2,
          width: baseSize,
          height: baseSize,
          borderRadius: baseSize / 2,
          backgroundColor,
          borderColor,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    />
  );
}

export default function RouteProgress({ total, currentIndex, width = 320, height = 40 }: Props) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  if (total <= 0) return null;

  const padding = 16;
  const usable = width - padding * 2;
  const step = total === 1 ? 0 : usable / (total - 1);

  const trackColor = isDark ? '#334155' : '#CBD5E1';

  return (
    <View
      style={[styles.container, { width, height }]}
      accessibilityLabel={`Progress: stop ${currentIndex + 1} of ${total}`}
    >
      {/* Background track line */}
      <View
        style={[
          styles.track,
          {
            left: padding,
            right: padding,
            top: height / 2 - 2,
            backgroundColor: trackColor,
          },
        ]}
      />

      {/* Render dots */}
      {Array.from({ length: total }, (_, i) => {
        const x = padding + step * i;
        return (
          <ProgressDot
            key={i}
            index={i}
            currentIndex={currentIndex}
            dotX={x}
            height={height}
            isDark={isDark}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    marginVertical: 8,
  },
  track: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  dot: {
    position: 'absolute',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
