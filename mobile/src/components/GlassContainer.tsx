import React from 'react';
import { StyleSheet, View, ViewProps, StyleProp, ViewStyle } from 'react-native';

interface Props extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  isDark?: boolean;
  blurAmount?: number;
  blurType?: any;
}

export default function GlassContainer({
  children,
  style,
  isDark = true,
  ...rest
}: Props) {
  const containerStyle = isDark ? styles.containerDark : styles.containerLight;

  return (
    <View style={[containerStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  containerDark: {
    backgroundColor: '#1E293B', // Solid Slate 800
  },
  containerLight: {
    backgroundColor: '#FFFFFF', // Solid White
  },
});
