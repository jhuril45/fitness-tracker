import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthFooter, AuthScreen, authStyles } from '../components/AuthForm';
import { SuccessBadge } from '../components/SuccessBadge';
import { Button, ErrorBanner, TextField } from '../components/ui';
import { useAuth } from '../lib/auth/AuthContext';
import { colors, fonts, spacing } from '../theme';

/**
 * Asks Back4App to email a link for choosing a new password, then confirms
 * it was sent. The new password is set on Back4App's reset page.
 */
export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit() {
    if (!email.trim()) return;
    setError(null);
    setSending(true);
    try {
      await requestPasswordReset(email);
      setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <AuthScreen showLogo={false}>
        <View style={styles.sent}>
          <SuccessBadge />
          <Text style={styles.sentTitle}>Check your email</Text>
          <Text style={styles.sentText}>
            If an account uses {sentTo}, we&apos;ve sent it a link to choose a new password. Then log in with
            the new one.
          </Text>
          <Button title="Back to Login" onPress={() => router.dismissTo('/sign-in')} style={styles.sentButton} />
          <Button title="Use a different email" variant="ghost" onPress={() => setSentTo(null)} />
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      showLogo={false}
      title="Forgot Password?"
      subtitle="Don't worry! It occurs. Please enter the email address linked with your account."
      footer={
        <AuthFooter>
          Remember Password?{' '}
          <Link href="/sign-in" dismissTo style={authStyles.link}>
            Login
          </Link>
        </AuthFooter>
      }>
      <ErrorBanner message={error} />
      <TextField
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="Email"
        onSubmitEditing={onSubmit}
      />
      <Button
        title="Send Reset Link"
        onPress={onSubmit}
        loading={sending}
        disabled={!email.trim()}
        style={styles.submit}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: spacing.md },
  sent: { alignItems: 'center', marginTop: spacing.xl * 3, gap: spacing.sm },
  sentTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, marginTop: spacing.lg },
  sentText: { fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  sentButton: { alignSelf: 'stretch', marginTop: spacing.xl },
});
