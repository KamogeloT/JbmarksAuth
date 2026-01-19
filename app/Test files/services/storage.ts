import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Unified storage API using Keychain for secure storage and AsyncStorage as fallback
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Use Keychain for sensitive data, AsyncStorage for non-sensitive
      if (key.includes('token') || key.includes('secret') || key.includes('password')) {
        const credentials = await Keychain.getGenericPassword({ service: key });
        return credentials ? credentials.password : null;
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (key.includes('token') || key.includes('secret') || key.includes('password')) {
        await Keychain.setGenericPassword(key, value, { service: key });
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },

  deleteItem: async (key: string): Promise<void> => {
    try {
      if (key.includes('token') || key.includes('secret') || key.includes('password')) {
        await Keychain.resetGenericPassword({ service: key });
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage deleteItem error:', error);
    }
  },
};

export default storage;

