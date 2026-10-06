import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '../lib/auth/AuthContext';
import { DATABASE_NAME, migrateDatabase } from '../lib/db';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SQLiteProvider>
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
