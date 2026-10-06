import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthScreen } from '../components/AuthForm';
import { Button, ErrorBanner, TextField } from '../components/ui';
import { useAuth } from '../lib/auth/AuthContext';
import { MIN_PASSWORD_LENGTH } from '../lib/auth/back4appAuth';
import { colors, spacing } from '../theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit() {
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({ name, email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account.');
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen title="Create account" subtitle="Track workouts, weights and your weekly plan.">
      <ErrorBanner message={error} />
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
      />
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
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={mismatch ? 'Passwords do not match.' : undefined}
        onSubmitEditing={onSubmit}
      />
      <Button
        title="Create account"
        onPress={onSubmit}
        loading={submitting}
        disabled={!name || !email || !password || !confirm}
      />
      <Text style={styles.footer}>
        Already have an account?{' '}
        <Link href="/sign-in" replace style={styles.link}>
          Sign in
        </Link>
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: spacing.xl, color: colors.muted, fontSize: 15 },
  link: { color: colors.primary, fontWeight: '600' },
});
