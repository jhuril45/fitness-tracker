import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ConfirmProvider } from '../components/ConfirmDialog';
import { AuthProvider, useAuth } from '../lib/auth/AuthContext';
import { colors } from '../theme';

/** On a wide browser window the app is shown as a phone-sized column. */
const WEB_MAX_WIDTH = 480;

export default function RootLayout() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <StatusBar style="dark" />
        <View style={styles.page}>
          <View style={styles.app}>
            <RootNavigator />
          </View>
        </View>
      </ConfirmProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Signed-out users can only reach sign-in/register; signed-in users only the app.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    ...(Platform.OS === 'web' ? { alignItems: 'center', backgroundColor: '#E2E6EE' } : null),
  },
  app: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: WEB_MAX_WIDTH,
          overflow: 'hidden',
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          boxShadow: '0 0 24px rgba(17, 24, 39, 0.08)',
        }
      : null),
  },
});
