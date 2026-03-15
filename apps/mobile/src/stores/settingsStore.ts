import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'dark' | 'light' | 'system';

export const QURAN_FONT_MIN = 20;
export const QURAN_FONT_MAX = 48;
export const QURAN_FONT_DEFAULT = 28;
export const QURAN_FONT_STEP = 2;

interface SettingsState {
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
  dailyReminderTime: string; // "HH:MM" 24h format, e.g. "07:30"
  quranFontSize: number;
  setThemePreference: (pref: ThemePreference) => void;
  setNotificationsEnabled: (val: boolean) => void;
  setDailyReminderTime: (time: string) => void;
  setQuranFontSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'dark',
      notificationsEnabled: true,
      dailyReminderTime: '08:00',
      quranFontSize: QURAN_FONT_DEFAULT,
      setThemePreference: (themePreference) => set({ themePreference }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDailyReminderTime: (dailyReminderTime) => set({ dailyReminderTime }),
      setQuranFontSize: (quranFontSize) => set({ quranFontSize }),
    }),
    {
      name: 'youssouf-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
