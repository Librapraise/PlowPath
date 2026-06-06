import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

export default function AppText(props: TextProps) {
  // If the user specifies a custom font weight, we ideally map it to the correct Inter variant
  // But for now, we just apply the Inter-Medium font family as the baseline.
  return (
    <RNText {...props} style={[styles.defaultText, props.style]}>
      {props.children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'Inter-Medium',
  },
});
