import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * The sign-in token is a credential, so on a phone it goes in the OS keychain (iOS) or
 * keystore (Android) rather than plain storage. SecureStore has no web implementation,
 * so the browser build keeps using AsyncStorage, which is localStorage there.
 */
const useSecureStore = Platform.OS !== 'web';

export const tokenStorage = {
  get: (key: string) => (useSecureStore ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key)),
  set: (key: string, value: string) =>
    useSecureStore ? SecureStore.setItemAsync(key, value) : AsyncStorage.setItem(key, value),
  remove: (key: string) => (useSecureStore ? SecureStore.deleteItemAsync(key) : AsyncStorage.removeItem(key)),
};
