import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { flush, startCheckOffSync, stopCheckOffSync } from './checkOffQueue';

/**
 * Keeps queued Today check-offs flowing to the server while the user is signed
 * in: on sign-in, when the browser reports the connection is back, and when the
 * app returns to the foreground (plus the queue's own retry timer).
 */
export function useCheckOffSync(userId: string): void {
  useEffect(() => {
    startCheckOffSync(userId);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush();
    });
    const onOnline = () => void flush();
    if (Platform.OS === 'web') window.addEventListener('online', onOnline);
    return () => {
      appState.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', onOnline);
      stopCheckOffSync();
    };
  }, [userId]);
}
