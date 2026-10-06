import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keeps the Back4App session token. Phones use the OS secure store; SecureStore
// has no web implementation, so the browser falls back to localStorage.

export async function getSession(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function setSession(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') return localStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function deleteSession(key: string): Promise<void> {
  if (Platform.OS === 'web') return localStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
