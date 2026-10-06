import { Stack } from 'expo-router';

import { backgroundLayout } from '../../components/ScreenBackground';
import { colors, fonts } from '../../theme';

export default function AppLayout() {
  return (
    <Stack
      screenLayout={backgroundLayout}
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.heading },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workout/new" options={{ title: 'New workout', presentation: 'modal' }} />
      <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
      <Stack.Screen name="workout/edit/[id]" options={{ title: 'Edit workout', presentation: 'modal' }} />
      <Stack.Screen name="exercise/new" options={{ title: 'Add exercise', presentation: 'modal' }} />
      <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
      <Stack.Screen name="exercise/edit/[id]" options={{ title: 'Edit exercise', presentation: 'modal' }} />
      <Stack.Screen name="schedule/add" options={{ title: 'Add to schedule', presentation: 'modal' }} />
    </Stack>
  );
}
