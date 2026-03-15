import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { FontFamily, FontSize, LineHeight } from '../../constants/typography';

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'bodyLarge'
  | 'body'
  | 'caption'
  | 'arabic'
  | 'arabicLarge';

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  semiBold?: boolean;
  bold?: boolean;
  secondary?: boolean;
  gold?: boolean;
}

export function Text({
  variant = 'body',
  color,
  semiBold,
  bold,
  secondary,
  gold,
  style,
  ...props
}: TextProps) {
  const theme = useTheme();

  const isArabic = variant === 'arabic' || variant === 'arabicLarge';
  const isSerif = variant === 'display' || variant === 'h1' || variant === 'h2';

  const fontFamily = isArabic
    ? bold ? FontFamily.arabicBold : FontFamily.arabic
    : isSerif
    ? bold || semiBold ? FontFamily.serifSemiBold : FontFamily.serifRegular
    : bold
    ? FontFamily.sansBold
    : semiBold
    ? FontFamily.sansSemiBold
    : FontFamily.sansRegular;

  const resolvedColor = color
    ?? (gold ? theme.gold : secondary ? theme.textSecondary : theme.textPrimary);

  return (
    <RNText
      style={[
        {
          fontFamily,
          fontSize: FontSize[variant],
          lineHeight: LineHeight[variant],
          color: resolvedColor,
          writingDirection: isArabic ? 'rtl' : 'ltr',
        },
        style,
      ]}
      {...props}
    />
  );
}
