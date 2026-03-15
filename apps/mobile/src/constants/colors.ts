export const Colors = {
  dark: {
    bgPrimary: '#0D0F0E',
    bgElevated: '#161A18',
    bgSubtle: '#1E2420',
    accentGreen: '#2D6A4F',
    accentGreenLight: '#52B788',
    gold: '#C9A84C',
    goldSoft: '#E8D5A3',
    textPrimary: '#F5F0E8',
    textSecondary: '#9A9A8A',
    textDisabled: '#4A4A42',
    error: '#C0392B',
    success: '#52B788',
    border: '#2A2E2C',
  },
  light: {
    bgPrimary: '#FAF8F4',
    bgElevated: '#F2EFE9',
    bgSubtle: '#E8E4DC',
    accentGreen: '#2D6A4F',
    accentGreenLight: '#40916C',
    gold: '#C9A84C',
    goldSoft: '#8B6914',
    textPrimary: '#1A1A16',
    textSecondary: '#5A5A52',
    textDisabled: '#ABABAB',
    error: '#C0392B',
    success: '#40916C',
    border: '#D8D4CC',
  },
} as const;

export type ColorScheme = 'dark' | 'light';

// Structural type that both dark and light satisfy — use string not literal hex
export type ThemeColors = {
  bgPrimary: string;
  bgElevated: string;
  bgSubtle: string;
  accentGreen: string;
  accentGreenLight: string;
  gold: string;
  goldSoft: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  error: string;
  success: string;
  border: string;
};
