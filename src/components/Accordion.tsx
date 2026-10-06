import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** A card with a tappable header that shows or hides its body. */
export function Accordion({
  icon,
  title,
  tag,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  icon: IconName;
  title: string;
  /** Small highlighted label after the title, e.g. "Today". */
  tag?: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <Ionicons name={icon} size={22} color={expanded ? colors.primary : colors.muted} />
        <View style={styles.flex}>
          <Text style={[styles.title, expanded && styles.titleExpanded]}>
            {title}
            {tag ? <Text style={styles.tag}> {tag}</Text> : null}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

/** The row of links along the bottom of an open accordion. */
export function AccordionActions({ children }: { children: React.ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

export function AccordionAction({ href, icon, label }: { href: Href; icon: IconName; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" style={styles.action} hitSlop={6}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  containerExpanded: { borderColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
  title: { fontSize: 17, fontFamily: fonts.medium, color: colors.text },
  titleExpanded: { color: colors.primary },
  tag: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  body: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
