import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { DAY_NAMES_LONG } from '../../../lib/dates';
import { formatSetsReps, formatWeight } from '../../../lib/format';
import {
  getWeeklySchedule,
  moveScheduleItem,
  removeFromSchedule,
  type ScheduleItem,
} from '../../../lib/schedule';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { colors, spacing } from '../../../theme';

// Show the week starting Monday.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function ScheduleScreen() {
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const { data: week, reload } = useLoadOnFocus(() => getWeeklySchedule(db, user.id), [db, user.id]);
  const today = new Date().getDay();

  async function move(item: ScheduleItem, direction: -1 | 1) {
    await moveScheduleItem(db, user.id, item.id, direction);
    reload();
  }

  function remove(item: ScheduleItem) {
    Alert.alert(`Remove ${item.workoutName} from ${DAY_NAMES_LONG[item.dayOfWeek]}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeFromSchedule(db, user.id, item.id);
          reload();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Link href="/schedule/add" asChild>
        <Button title="Add workout to schedule" />
      </Link>

      {WEEK_ORDER.map((day) => {
        const items = week?.[day] ?? [];
        return (
          <Card key={day} style={day === today ? styles.todayCard : undefined}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>
                {DAY_NAMES_LONG[day]}
                {day === today ? <Text style={styles.todayTag}> Today</Text> : null}
              </Text>
              <Link href={{ pathname: '/schedule/add', params: { day: String(day) } }} asChild>
                <Pressable accessibilityLabel={`Add workout on ${DAY_NAMES_LONG[day]}`} hitSlop={8}>
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </Pressable>
              </Link>
            </View>
            {items.length === 0 ? (
              <Text style={styles.rest}>Rest day</Text>
            ) : (
              items.map((item, index) => {
                const detail = [
                  formatSetsReps(item.sets, item.reps),
                  item.currentWeight !== null ? formatWeight(item.currentWeight, item.unit) : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.order}>{index + 1}</Text>
                    <View style={styles.flex}>
                      <Text style={styles.itemName}>{item.workoutName}</Text>
                      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
                    </View>
                    <Pressable
                      accessibilityLabel="Move up"
                      disabled={index === 0}
                      onPress={() => move(item, -1)}
                      hitSlop={6}>
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={index === 0 ? colors.border : colors.muted}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Move down"
                      disabled={index === items.length - 1}
                      onPress={() => move(item, 1)}
                      hitSlop={6}>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={index === items.length - 1 ? colors.border : colors.muted}
                      />
                    </Pressable>
                    <Pressable accessibilityLabel="Remove" onPress={() => remove(item)} hitSlop={6}>
                      <Ionicons name="close" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  todayCard: { borderColor: colors.primary },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: 17, fontWeight: '700', color: colors.text },
  todayTag: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  rest: { color: colors.muted, marginTop: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  order: { width: 20, color: colors.muted, fontWeight: '600' },
  flex: { flex: 1 },
  itemName: { fontSize: 16, color: colors.text, fontWeight: '500' },
  detail: { fontSize: 13, color: colors.muted },
});
