/**
 * Web counterpart to secureStorage.ts — expo-secure-store has no working
 * web backend (its own .web.js is an empty stub), so this is the browser
 * preview's storage: localStorage. Not encrypted at rest like the native
 * Keychain/Keystore path, which is expected and fine for a dev preview,
 * not the production security model.
 */
export const secureStorage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    globalThis.localStorage?.setItem(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    globalThis.localStorage?.removeItem(key);
  },
};
