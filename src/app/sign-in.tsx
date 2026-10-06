import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthScreen } from '../components/AuthForm';
import { Button, ErrorBanner, TextField } from '../components/ui';
import { useAuth } from '../lib/auth/AuthContext';
import { colors, spacing } from '../theme';

export default function SignInScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
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
    <AuthScreen title="Welcome back" subtitle="Sign in to see today's workouts.">
      <ErrorBanner message={error} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={onSubmit}
      />
      <Button title="Sign in" onPress={onSubmit} loading={submitting} disabled={!email || !password} />
      <Text style={styles.footer}>
        New here?{' '}
        <Link href="/register" replace style={styles.link}>
          Create an account
        </Link>
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: spacing.xl, color: colors.muted, fontSize: 15 },
  link: { color: colors.primary, fontWeight: '600' },
});
