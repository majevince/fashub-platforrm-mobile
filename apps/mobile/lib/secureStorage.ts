import * as SecureStore from 'expo-secure-store';

/**
 * Native (iOS/Android): backed by the platform Keychain/Keystore via
 * expo-secure-store — genuinely secure at-rest storage.
 *
 * See secureStorage.web.ts for the web counterpart — expo-secure-store's
 * own .web.js is an empty stub (`export default {}`), so this same API
 * needs a real implementation there rather than delegating to it.
 */
export const secureStorage = {
  getItemAsync: (key: string) => SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
};
