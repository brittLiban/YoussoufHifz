import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { getTajweedSegments, getTajweedColor, isTajweedAvailable } from '../lib/tajweed';
import type { VerseKey } from '../types/quran';

interface Props {
  verseKey: VerseKey;
  plainText: string;
  fontSize?: number;
  lineHeight?: number;
  defaultColor: string;
  fontFamily: string;
  /** Whether tajweed coloring is active */
  tajweedMode: boolean;
}

/**
 * Renders Uthmani Arabic text, optionally with tajweed coloring.
 *
 * In plain mode: renders a single Text with the Uthmani text.
 * In tajweed mode: renders colored inline spans from pre-built segments.
 * If tajweed data isn't downloaded yet, falls back to plain mode gracefully.
 */
export function TajweedText({
  verseKey,
  plainText,
  fontSize = 26,
  lineHeight,
  defaultColor,
  fontFamily,
  tajweedMode,
}: Props) {
  const effectiveLH = lineHeight ?? fontSize * 2;

  const textStyle = {
    fontSize,
    lineHeight: effectiveLH,
    color: defaultColor,
    fontFamily,
    writingDirection: 'rtl' as const,
    textAlign: 'right' as const,
  };

  if (!tajweedMode || !isTajweedAvailable()) {
    return (
      <Text style={textStyle} allowFontScaling={false}>
        {plainText}
      </Text>
    );
  }

  const segments = getTajweedSegments(verseKey);
  if (!segments || segments.length === 0) {
    return (
      <Text style={textStyle} allowFontScaling={false}>
        {plainText}
      </Text>
    );
  }

  return (
    <Text style={textStyle} allowFontScaling={false}>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={{ color: getTajweedColor(seg.rule, defaultColor) }}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}
