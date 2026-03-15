import { Colors, ThemeColors } from '../constants/colors';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Returns the active color palette based on:
 * 1. User's explicit preference (from settings store)
 * 2. System color scheme
 * 3. Falls back to dark mode (app default)
 */
export function useTheme(): ThemeColors {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.themePreference);

  // systemScheme can be null or 'unspecified' on some Android versions
  const systemResolved: 'dark' | 'light' =
    systemScheme === 'light' ? 'light' : 'dark';

  const resolved: 'dark' | 'light' =
    preference === 'system' ? systemResolved : (preference ?? 'dark');

  return Colors[resolved];
}
