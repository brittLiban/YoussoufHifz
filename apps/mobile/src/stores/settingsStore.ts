import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'dark' | 'light' | 'system';

interface SettingsState {
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
  dailyReminderTime: string; // "HH:MM" 24h format, e.g. "07:30"
  setThemePreference: (pref: ThemePreference) => void;
  setNotificationsEnabled: (val: boolean) => void;
  setDailyReminderTime: (time: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'dark',
      notificationsEnabled: true,
      dailyReminderTime: '08:00',
      setThemePreference: (themePreference) => set({ themePreference }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDailyReminderTime: (dailyReminderTime) => set({ dailyReminderTime }),
    }),
    {
      name: 'youssouf-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
