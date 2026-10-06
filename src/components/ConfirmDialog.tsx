import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Button } from './ui';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button and warning icon, for deletes and removals. */
  destructive?: boolean;
  /**
   * The work to do once confirmed. The dialog stays open with a spinner on the
   * confirm button until it finishes, and shows the error if it fails.
   */
  onConfirm?: () => Promise<void>;
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Hosts the app's confirmation dialog. Screens call `useConfirm()` and await
 * the answer: `if (await confirm({...})) { ... }`.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  // Kept after closing so the dialog's text doesn't vanish mid fade-out.
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise((resolve) => {
        setRequest({ ...options, resolve });
        setError(null);
        setBusy(false);
        setOpen(true);
      }),
    [],
  );

  function close(ok: boolean) {
    if (!open || busy) return;
    setOpen(false);
    request?.resolve(ok);
  }

  async function accept() {
    if (!request?.onConfirm) return close(true);
    setBusy(true);
    setError(null);
    try {
      await request.onConfirm();
      setOpen(false);
      request.resolve(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          {/* Tapping outside the dialog cancels. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} accessibilityLabel="Cancel" />
          {request ? (
            <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
              <View style={[styles.icon, request.destructive && styles.iconDanger]}>
                <Ionicons
                  name={request.destructive ? 'trash-outline' : 'help-circle-outline'}
                  size={26}
                  color={request.destructive ? colors.danger : colors.primary}
                />
              </View>
              <Text style={styles.title}>{request.title}</Text>
              {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.buttons}>
                <Button
                  title={request.cancelLabel ?? 'Cancel'}
                  variant="secondary"
                  onPress={() => close(false)}
                  disabled={busy}
                  style={styles.button}
                />
                <Button
                  title={request.confirmLabel}
                  variant={request.destructive ? 'danger' : 'primary'}
                  onPress={accept}
                  loading={busy}
                  style={styles.button}
                />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.xs,
  },
  iconDanger: { backgroundColor: colors.dangerSoft },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  message: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
  button: { flex: 1 },
});
