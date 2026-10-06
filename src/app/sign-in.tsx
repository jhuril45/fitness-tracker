import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthFooter, AuthScreen, authStyles } from '../components/AuthForm';
import { Button, ErrorBanner, TextField } from '../components/ui';
import { useAuth } from '../lib/auth/AuthContext';
import { colors, fonts, spacing } from '../theme';

export default function SignInScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!email || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      // On success the root layout's guard swaps to the app automatically.
      await login({ email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back! Glad to see you, Again!"
      footer={
        <AuthFooter>
          Don&apos;t have an account?{' '}
          <Link href="/register" replace style={authStyles.link}>
            Register Now
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
        placeholder="Enter your email"
      />
      <TextField
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        placeholder="Enter your password"
        onSubmitEditing={onSubmit}
      />
      <Link href="/forgot-password" style={styles.forgot}>
        Forgot Password?
      </Link>
      <Button title="Login" onPress={onSubmit} loading={submitting} disabled={!email || !password} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: -spacing.xs,
    marginBottom: spacing.xl,
  },
});
