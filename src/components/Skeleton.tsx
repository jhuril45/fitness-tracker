import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

/** A grey placeholder block that gently pulses while content loads. */
export function Skeleton({
  width = '100%',
  height = 14,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { width, height, opacity }, style]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border, borderRadius: radius.md },
});
