export const FontFamily = {
  // Serif — headings, display numbers, milestones
  serifRegular: 'CormorantGaramond-Regular',
  serifMedium: 'CormorantGaramond-Medium',
  serifSemiBold: 'CormorantGaramond-SemiBold',
  // Sans — all UI text, body, labels
  sansRegular: 'Inter-Regular',
  sansMedium: 'Inter-Medium',
  sansSemiBold: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
  // Arabic — Quran text
  arabic: 'Amiri-Regular',
  arabicBold: 'Amiri-Bold',
} as const;

export const FontSize = {
  display: 34,
  h1: 28,
  h2: 22,
  bodyLarge: 17,
  body: 15,
  caption: 12,
  arabic: 22, // Quran text — slightly larger for readability
  arabicLarge: 26,
} as const;

export const LineHeight = {
  display: 42,
  h1: 36,
  h2: 28,
  bodyLarge: 26,
  body: 22,
  caption: 18,
  arabic: 40, // Arabic needs generous line height
  arabicLarge: 48,
} as const;
