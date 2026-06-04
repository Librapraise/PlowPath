import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  instruction: string;
  secondary?: string | null;
  distanceMi: number | null;
  maneuverModifier?: string;
}

function getManeuverIcon(modifier?: string) {
  if (!modifier) return (
     <>
       <Path d="M9 20V11a3 3 0 0 1 3-3h7" />
       <Path d="M15 4l4 4-4 4" />
     </>
  );
  if (modifier.includes('left')) {
     return (
       <>
         <Path d="M15 20V11a3 3 0 0 0-3-3H5" />
         <Path d="M9 4L5 8l4 4" />
       </>
     );
  }
  if (modifier.includes('straight')) {
     return (
       <>
         <Path d="M12 20V4" />
         <Path d="M8 8l4-4 4 4" />
       </>
     );
  }
  if (modifier.includes('uturn')) {
     return (
       <>
         <Path d="M9 20V9a3 3 0 0 1 6 0v2" />
         <Path d="M11 13l4 4 4-4" />
       </>
     );
  }
  return (
     <>
       <Path d="M9 20V11a3 3 0 0 1 3-3h7" />
       <Path d="M15 4l4 4-4 4" />
     </>
  );
}

function formatDistance(mi: number | null): string {
  if (mi == null) return '';
  if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
  return `${mi.toFixed(1)} mi`;
}

export default function TurnInstruction({ instruction, secondary, distanceMi, maneuverModifier }: Props) {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (distanceMi !== null) {
      opacityAnim.setValue(0.5);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [distanceMi, opacityAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.textStack}>
          <Text style={styles.instructionText}>{instruction}</Text>
          {secondary ? (
            <Text style={styles.secondaryText} numberOfLines={1} adjustsFontSizeToFit>
              {secondary}
            </Text>
          ) : null}
          {distanceMi != null && (
            <Animated.Text style={[styles.distanceText, { opacity: opacityAnim }]}>
              {formatDistance(distanceMi)}
            </Animated.Text>
          )}
        </View>

        <View style={styles.iconContainer}>
          <Svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
            {getManeuverIcon(maneuverModifier)}
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C212A', // Dark sleek background mimicking glassmorphism
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)', // Translucent border stroke
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textStack: {
    flex: 1,
    paddingRight: 16,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  distanceText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#94A3B8', // Muted slate gray
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
