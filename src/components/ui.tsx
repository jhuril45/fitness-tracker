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

import { colors, radius, spacing } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

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
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, buttonTextVariants[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
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
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
});

const buttonTextVariants = StyleSheet.create({
  primary: { color: '#fff' },
  secondary: { color: colors.primary },
  danger: { color: '#fff' },
  ghost: { color: colors.primary },
});

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  field: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyMessage: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.danger },
});
