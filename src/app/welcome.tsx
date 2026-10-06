import { Link } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '../components/Logo';
import { Button } from '../components/ui';
import { colors, fonts, spacing } from '../theme';

const useNativeDriver = Platform.OS !== 'web';

/**
 * First screen for signed-out visitors. Plays the splash in three steps: the
 * logo, then the tagline, then the Login and Register buttons.
 */
export default function WelcomeScreen() {
  const logo = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const actions = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const appear = (value: Animated.Value) =>
      Animated.timing(value, { toValue: 1, duration: 500, useNativeDriver });
    Animated.sequence([appear(logo), Animated.delay(250), appear(tagline), Animated.delay(350), appear(actions)]).start();
  }, [logo, tagline, actions]);

  const rise = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Animated.View style={{ opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
          <Logo size={64} />
        </Animated.View>
        <Animated.Text style={[styles.title, rise(tagline)]} accessibilityRole="header">
          Start your{'\n'}
          <Text style={styles.accent}>Fitness</Text> Journey
        </Animated.Text>
      </View>

      <Animated.View style={[styles.actions, rise(actions)]}>
        <Link href="/sign-in" asChild>
          <Button title="Login" variant="secondary" />
        </Link>
        <Link href="/register" asChild>
          <Button title="Register" />
        </Link>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.xl * 3 },
  title: {
    fontFamily: fonts.headingHeavy,
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
    textAlign: 'center',
  },
  accent: { color: colors.primary },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
});
