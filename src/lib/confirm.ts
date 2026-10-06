import { Alert, Platform } from 'react-native';

/**
 * Asks the user to confirm a destructive action. React Native Web ignores
 * Alert buttons, so the browser uses its own confirm dialog instead.
 */
export function confirmAction(title: string, message: string | undefined, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
