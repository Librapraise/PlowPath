import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  return (
    <View style={styles.container}>
      <Text style={styles.main} accessibilityRole="header">{instruction}</Text>
      {distanceMi != null && <Text style={styles.distance}>in {formatDistance(distanceMi)}</Text>}
      {secondary ? <Text style={styles.secondary}>{secondary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  // 32pt bold on black-on-white for 7:1+ contrast per accessibility spec.
  main: { fontSize: 32, fontWeight: '700', color: '#000' },
  distance: { fontSize: 24, color: '#333', marginTop: 6 },
  secondary: { fontSize: 18, color: '#555', marginTop: 8 },
});
