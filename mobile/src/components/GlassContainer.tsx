import React, { ComponentProps, useState, useEffect } from 'react';
import { StyleSheet, View, ViewProps, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';

interface Props extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurAmount?: number;
  blurType?: ComponentProps<typeof BlurView>['blurType'];
  /** Pass isDark to get theme-appropriate background tint, border, and shadow */
  isDark?: boolean;
}

export default function GlassContainer({
  children,
  style,
  blurAmount = 15,
  blurType,
  isDark = true,
  ...rest
}: Props) {
  const [isReady, setIsReady] = useState(Platform.OS !== 'android');

  useEffect(() => {
    if (Platform.OS === 'android') {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Resolve blurType from isDark if not explicitly provided
  const resolvedBlurType: ComponentProps<typeof BlurView>['blurType'] =
    blurType ?? (isDark ? 'dark' : 'light');

  const containerStyle = isDark ? styles.containerDark : styles.containerLight;

  return (
    <View style={[containerStyle, style]} {...rest}>
      {isReady && (
        <BlurView
          style={styles.absolute}
          blurType={resolvedBlurType}
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor={
            isDark ? 'rgba(28, 33, 42, 0.95)' : 'rgba(255, 255, 255, 0.92)'
          }
        />
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerDark: {
    overflow: 'hidden',
    backgroundColor: 'rgba(28, 33, 42, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  containerLight: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.07)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  content: {
    // Content container can expand as needed
  },
});
