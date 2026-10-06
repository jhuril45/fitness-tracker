import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Accordion, AccordionAction, AccordionActions } from '../../../components/Accordion';
import { Button, ErrorBanner } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { confirmAction } from '../../../lib/confirm';
import { DAY_NAMES_LONG } from '../../../lib/dates';
import { countLabel } from '../../../lib/format';
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

function daySummary(items: ScheduleItem[]): string {
  if (items.length === 0) return 'Rest day';
  return `${countLabel(items.length, 'workout')} · ${items.map((i) => i.workoutName).join(', ')}`;
}

export default function ScheduleScreen() {
  const user = useCurrentUser();
  const { data: week, reload } = useLoadOnFocus(() => getWeeklySchedule(user.id), [user.id]);
  const today = new Date().getDay();
  // Today starts open.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([today]));
  const [error, setError] = useState<string | null>(null);

  function toggle(day: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function run(action: () => Promise<void>, failure: string) {
    setError(null);
    try {
      await action();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : failure);
    }
  }

  async function remove(item: ScheduleItem) {
    const ok = await confirmAction(
      `Remove ${item.workoutName} from ${DAY_NAMES_LONG[item.dayOfWeek]}?`,
      undefined,
      'Remove',
    );
    if (ok) await run(() => removeFromSchedule(item.id), 'Could not remove the workout.');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Link href="/schedule/add" asChild>
        <Button title="Add workout to schedule" />
      </Link>
      <ErrorBanner message={error} />

      {WEEK_ORDER.map((day) => {
        const items = week?.[day] ?? [];
        return (
          <Accordion
            key={day}
            icon={items.length === 0 ? 'bed-outline' : 'calendar-outline'}
            title={DAY_NAMES_LONG[day]}
            tag={day === today ? 'Today' : undefined}
            subtitle={week ? daySummary(items) : ''}
            expanded={expanded.has(day)}
            onToggle={() => toggle(day)}>
            {items.length === 0 ? (
              <Text style={styles.empty}>Nothing planned. Enjoy the rest.</Text>
            ) : (
              items.map((item, index) => {
                const detail =
                  item.exercises.length === 0
                    ? 'No exercises yet'
                    : `${countLabel(item.exercises.length, 'exercise')}: ${item.exercises.map((e) => e.name).join(', ')}`;
                return (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.order}>{index + 1}</Text>
                    <Link href={{ pathname: '/workout/[id]', params: { id: item.workoutId } }} asChild>
                      <Pressable style={styles.flex}>
                        <Text style={styles.itemName}>{item.workoutName}</Text>
                        <Text style={styles.detail} numberOfLines={2}>
                          {detail}
                        </Text>
                      </Pressable>
                    </Link>
                    <Pressable
                      accessibilityLabel={`Move ${item.workoutName} up`}
                      disabled={index === 0}
                      onPress={() => run(() => moveScheduleItem(user.id, item.id, -1), 'Could not reorder.')}
                      hitSlop={6}>
                      <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.muted} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Move ${item.workoutName} down`}
                      disabled={index === items.length - 1}
                      onPress={() => run(() => moveScheduleItem(user.id, item.id, 1), 'Could not reorder.')}
                      hitSlop={6}>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={index === items.length - 1 ? colors.border : colors.muted}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remove ${item.workoutName}`}
                      onPress={() => remove(item)}
                      hitSlop={6}>
                      <Ionicons name="close" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                );
              })
            )}
            <AccordionActions>
              <AccordionAction
                href={{ pathname: '/schedule/add', params: { day: String(day) } }}
                icon="add-circle-outline"
                label="Add workout"
              />
            </AccordionActions>
          </Accordion>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  order: { width: 20, color: colors.muted, fontWeight: '600' },
  flex: { flex: 1 },
  itemName: { fontSize: 16, color: colors.text, fontWeight: '500' },
  detail: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
