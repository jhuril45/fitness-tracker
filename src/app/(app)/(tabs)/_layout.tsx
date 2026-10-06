import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { backgroundLayout } from '../../../components/ScreenBackground';
import { colors, fonts } from '../../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenLayout={backgroundLayout}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: '#1D1627', borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        headerStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('today-outline') }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen name="workouts" options={{ title: 'Workouts', tabBarIcon: tabIcon('barbell-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }} />
    </Tabs>
  );
}
