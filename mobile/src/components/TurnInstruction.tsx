import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      <Text
        style={[styles.main, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
        accessibilityRole="header"
      >
        {instruction}
      </Text>
      {distanceMi != null && (
        <Text style={[styles.distance, { color: isDark ? '#94A3B8' : '#475569' }]}>
          in {formatDistance(distanceMi)}
        </Text>
      )}
      {secondary ? (
        <Text style={[styles.secondary, { color: isDark ? '#64748B' : '#64748B' }]}>
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  // 32pt bold — contrast meets WCAG AA in both themes.
  main: { fontSize: 32, fontWeight: '700' },
  distance: { fontSize: 24, marginTop: 6, fontWeight: '600' },
  secondary: { fontSize: 18, marginTop: 8, fontWeight: '500' },
});
