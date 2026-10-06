import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { parseDayString, toDayString } from '../../../lib/dates';
import { formatSetsReps, formatWeight } from '../../../lib/format';
import { getDayPlan, markDone, markNotDone, type PlannedWorkout } from '../../../lib/schedule';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { colors, radius, spacing } from '../../../theme';

function shiftDay(day: string, by: number): string {
  const d = parseDayString(day);
  d.setDate(d.getDate() + by);
  return toDayString(d);
}

function dayTitle(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  if (day === shiftDay(today, 1)) return 'Tomorrow';
  return parseDayString(day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function describe(item: PlannedWorkout): string {
  const weight = item.done ? item.doneWeight : item.currentWeight;
  return [formatSetsReps(item.sets, item.reps), weight !== null ? formatWeight(weight, item.unit) : null]
    .filter(Boolean)
    .join(' · ');
}

export default function TodayScreen() {
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const today = toDayString();
  const [date, setDate] = useState(today);
  const { data: plan, reload } = useLoadOnFocus(() => getDayPlan(db, user.id, date), [db, user.id, date]);

  const isFuture = date > today;
  const doneCount = plan?.filter((p) => p.done).length ?? 0;
  const total = plan?.length ?? 0;
  const next = plan?.find((p) => !p.done);

  async function toggle(item: PlannedWorkout) {
    if (isFuture) return;
    if (item.done) await markNotDone(db, item, date);
    else await markDone(db, item, date);
    reload();
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hi {user.name.split(' ')[0]}</Text>

      <View style={styles.dayNav}>
        <Pressable accessibilityLabel="Previous day" onPress={() => setDate(shiftDay(date, -1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setDate(today)} disabled={date === today}>
          <Text style={styles.dayTitle}>{dayTitle(date, today)}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Next day" onPress={() => setDate(shiftDay(date, 1))} hitSlop={10}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {plan && total === 0 ? (
        <>
          <EmptyState title="Rest day" message="Nothing is scheduled for this day." />
          <Link
            href={{ pathname: '/schedule/add', params: { day: String(parseDayString(date).getDay()) } }}
            asChild>
            <Button title="Schedule a workout" variant="secondary" />
          </Link>
        </>
      ) : null}

      {plan && total > 0 ? (
        <>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {doneCount} of {total} done
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(doneCount / total) * 100}%` }]} />
          </View>

          {next ? (
            <Card style={styles.nextCard}>
              <Text style={styles.nextCaption}>{doneCount === 0 ? 'Start with' : 'Up next'}</Text>
              <Text style={styles.nextName}>{next.workoutName}</Text>
              {describe(next) ? <Text style={styles.nextDetail}>{describe(next)}</Text> : null}
              {isFuture ? (
                <Text style={styles.muted}>You can check this off on the day.</Text>
              ) : (
                <Button title="Mark as done" onPress={() => toggle(next)} style={styles.nextButton} />
              )}
            </Card>
          ) : (
            <Card style={[styles.nextCard, styles.allDone]}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
              <Text style={styles.nextName}>All done</Text>
              <Text style={styles.muted}>Every workout for this day is checked off.</Text>
            </Card>
          )}

          <Text style={styles.heading}>Plan</Text>
          {plan.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.done, disabled: isFuture }}
              onPress={() => toggle(item)}
              disabled={isFuture}
              style={[styles.item, item === next && styles.itemNext]}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={item.done ? colors.success : colors.muted}
              />
              <View style={styles.flex}>
                <Text style={[styles.itemName, item.done && styles.itemDone]}>
                  {index + 1}. {item.workoutName}
                </Text>
                {describe(item) ? <Text style={styles.muted}>{describe(item)}</Text> : null}
              </View>
              <Link href={{ pathname: '/workout/[id]', params: { id: String(item.workoutId) } }} asChild>
                <Pressable accessibilityLabel={`Open ${item.workoutName}`} hitSlop={8}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.muted} />
                </Pressable>
              </Link>
            </Pressable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  greeting: { fontSize: 15, color: colors.muted },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success },
  nextCard: { gap: spacing.xs, borderColor: colors.primary, borderWidth: 2 },
  allDone: { alignItems: 'center', borderColor: colors.success },
  nextCaption: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  nextName: { fontSize: 24, fontWeight: '800', color: colors.text },
  nextDetail: { fontSize: 16, color: colors.text },
  nextButton: { marginTop: spacing.md },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  itemNext: { borderColor: colors.primary },
  flex: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemDone: { color: colors.muted, textDecorationLine: 'line-through' },
  muted: { fontSize: 14, color: colors.muted },
});
