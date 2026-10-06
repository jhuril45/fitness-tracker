import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { goBack } from '../lib/navigation';
import { colors, fonts, spacing } from '../theme';
import { Logo } from './Logo';
import { BackButton } from './ui';

/**
 * Shared layout for the sign-in, register and forgot-password screens: back
 * button, logo and heading at the top, the form, and a footer link at the bottom.
 */
export function AuthScreen({
  title,
  subtitle,
  showLogo = true,
  footer,
  children,
}: {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton onPress={() => goBack('/welcome')} />
          <View style={styles.body}>
            {showLogo ? <Logo size={44} /> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.form}>{children}</View>
          </View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** "Don't have an account? Register Now" style line under the form. */
export function AuthFooter({ children }: { children: React.ReactNode }) {
  return <Text style={styles.footerText}>{children}</Text>;
}

export const authStyles = StyleSheet.create({
  link: { color: colors.text, fontFamily: fonts.heading },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.lg },
  body: { marginTop: spacing.xl * 1.5 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text,
    marginTop: spacing.xl,
  },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: spacing.sm },
  form: { marginTop: spacing.xl },
  footer: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: spacing.xl },
  footerText: { textAlign: 'center', color: colors.muted, fontSize: 14 },
});
