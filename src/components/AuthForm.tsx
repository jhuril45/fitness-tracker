import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

/** Shared shell for the sign-in and register screens. */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>Fitness Tracker</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  header: { marginBottom: spacing.xl },
  brand: { color: colors.primary, fontWeight: '700', fontSize: 15, marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: spacing.xs },
});
