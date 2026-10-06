import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../theme';

/** The dark plum ground with a soft glow in the top-left corner, drawn behind every screen. */
export function ScreenBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="glow" cx="22%" cy="8%" rx="85%" ry="45%" fx="22%" fy="8%">
            <Stop offset="0" stopColor={colors.glow} stopOpacity={0.95} />
            <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

/**
 * Pass as a navigator's `screenLayout` so each screen draws its own background.
 * Screens stay opaque, so a pushed screen never shows the one beneath it.
 */
export function backgroundLayout({ children }: { children: React.ReactNode }) {
  return <ScreenBackground>{children}</ScreenBackground>;
}
