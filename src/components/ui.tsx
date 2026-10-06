import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius, spacing } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerSoft' | 'ghost';

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: Omit<PressableProps, 'style'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        buttonVariants[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={spinnerColors[variant]} />
      ) : (
        <Text style={[styles.buttonText, buttonTextVariants[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

/** A small up/down reorder button that shows a spinner while its move is saving. */
export function ArrowButton({
  direction,
  label,
  disabled,
  loading,
  onPress,
}: {
  direction: 'up' | 'down';
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      hitSlop={6}
      style={styles.arrow}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={direction === 'up' ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={disabled ? colors.border : colors.muted}
        />
      )}
    </Pressable>
  );
}

/**
 * A filled text input. `label` is optional (the sign-in screens use the
 * placeholder alone); password fields get a show/hide toggle.
 */
export function TextField({
  label,
  error,
  style,
  secureTextEntry,
  ...rest
}: TextInputProps & { label?: string; error?: string }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View>
        <TextInput
          placeholderTextColor={colors.muted}
          accessibilityLabel={label ?? rest.placeholder}
          secureTextEntry={secureTextEntry && hidden}
          style={[styles.input, secureTextEntry && styles.inputWithToggle, error ? styles.inputError : null, style]}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.toggle}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

/** The rounded-square back button at the top of the sign-in screens. */
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress} hitSlop={8} style={styles.back}>
      <Ionicons name="chevron-back" size={18} color={colors.text} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: '#FFFFFF' },
  secondary: { backgroundColor: colors.raised },
  danger: { backgroundColor: colors.danger },
  dangerSoft: { backgroundColor: colors.dangerSoft },
  ghost: { backgroundColor: 'transparent' },
});

const spinnerColors: Record<ButtonVariant, string> = {
  primary: colors.onLight,
  secondary: colors.text,
  danger: colors.onLight,
  dangerSoft: colors.danger,
  ghost: colors.primary,
};

const buttonTextVariants = StyleSheet.create({
  primary: { color: colors.onLight },
  secondary: { color: colors.text },
  danger: { color: colors.onLight },
  dangerSoft: { color: colors.danger },
  ghost: { color: colors.primary },
});

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontFamily: fonts.medium },
  pressed: { opacity: 0.8 },
  arrow: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  field: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.raised,
  },
  inputWithToggle: { paddingRight: 48 },
  toggle: { position: 'absolute', right: spacing.lg, top: 0, bottom: 0, justifyContent: 'center' },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, marginTop: spacing.xs, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.raised,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: colors.onLight, fontWeight: '700' },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.text },
  emptyMessage: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.danger },
});
