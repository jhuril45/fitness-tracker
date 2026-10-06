import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { ConfirmProvider } from '../components/ConfirmDialog';
import { Logo } from '../components/Logo';
import { backgroundLayout, ScreenBackground } from '../components/ScreenBackground';
import { AuthProvider, useAuth } from '../lib/auth/AuthContext';
import { colors } from '../theme';

/** On a wide browser window the app is shown as a phone-sized column. */
const WEB_MAX_WIDTH = 480;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold });

  return (
    <AuthProvider>
      <ConfirmProvider>
        <StatusBar style="light" />
        <View style={styles.page}>
          <View style={styles.app}>
            <ScreenBackground>
              {/* If the fonts fail to load, carry on with the system font. */}
              {fontsLoaded || fontError ? <RootNavigator /> : <LaunchScreen />}
            </ScreenBackground>
          </View>
        </View>
      </ConfirmProvider>
    </AuthProvider>
  );
}

/** Shown while fonts load and the previous session is restored. */
function LaunchScreen() {
  return (
    <View style={styles.launch}>
      <Logo size={72} />
    </View>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LaunchScreen />;

  // Signed-out users can only reach the welcome and sign-in screens; signed-in users only the app.
  return (
    <Stack
      screenLayout={backgroundLayout}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' ? { alignItems: 'center', backgroundColor: '#17111F' } : null),
  },
  app: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web'
      ? {
          maxWidth: WEB_MAX_WIDTH,
          overflow: 'hidden',
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.45)',
        }
      : null),
  },
  launch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
