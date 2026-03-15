/**
 * Revision Quiz — cold-start hifz test.
 *
 * Picks a random ayah from the student's memorized surahs
 * (weighted: critical/weak surahs appear more often).
 * Shows the first few words as a prompt — student recites from there.
 * Reveal shows the full ayah + 4 following ayahs for self-check.
 * Self-rating updates the surah's revision record.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/lib/theme';
import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Spacing, Radius } from '../src/constants/spacing';
import { useSurahRevisions, useLogSurahRevisions, type SurahRevisionEntry } from '../src/hooks/useRevision';
import { QuranService } from '../src/lib/quran-service';
import { useSettingsStore } from '../src/stores/settingsStore';
import type { RevisionStrength } from '../src/types/api';

const QURAN_FONT = 'ScheherazadeNew_400Regular';

// Weight by weakness — critical gets picked 6×, weak 4×, review 2×, others 1×
const STRENGTH_WEIGHT: Record<RevisionStrength, number> = {
  critical: 6, weak: 4, review: 2, good: 1, strong: 1,
};

const RATE_CONFIG: { strength: RevisionStrength; label: string; color: string; bg: string }[] = [
  { strength: 'strong',   label: 'Strong',      color: '#52B788', bg: '#1A3329' },
  { strength: 'good',     label: 'Good',        color: '#7EC8A0', bg: '#1A2E23' },
  { strength: 'review',   label: 'Needs Review',color: '#C9A84C', bg: '#2C2410' },
  { strength: 'weak',     label: 'Weak',        color: '#E07070', bg: '#2C1010' },
];

function toArabicNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

/** Pick the first N Arabic words from text */
function firstWords(text: string, n: number): string {
  return text.split(' ').slice(0, n).join(' ');
}

/** Weighted random pick from memorized surahs */
function pickWeightedSurah(memorized: SurahRevisionEntry[]): SurahRevisionEntry {
  const weights = memorized.map((s) => STRENGTH_WEIGHT[s.strength]);
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < memorized.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return memorized[i];
  }
  return memorized[memorized.length - 1];
}

type Phase = 'prompt' | 'revealed' | 'rated';

interface QuizState {
  surahId: number;
  surahName: string;
  startAyahIdx: number;   // index within surah ayahs array
  promptWords: string;    // first N words shown as cue
}

export default function QuizScreen() {
  const theme = useTheme();
  const router = useRouter();
  const fontSize = useSettingsStore((s) => s.quranFontSize);
  const { data, isLoading } = useSurahRevisions();
  const { mutateAsync: logRevisions } = useLogSurahRevisions();

  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [phase, setPhase] = useState<Phase>('prompt');
  const [sessionCount, setSessionCount] = useState(0);

  const memorized = data?.memorized ?? [];
  const lh = Math.round(fontSize * 2.15);

  // Build a new quiz question
  const generateQuiz = useCallback(() => {
    if (memorized.length === 0) return;
    const entry = pickWeightedSurah(memorized);
    const ayahs = QuranService.getSurahAyahs(entry.surahId);
    if (!ayahs.length) return;

    // Pick random starting ayah — not the very last one (so there's context after)
    const maxStart = Math.max(0, ayahs.length - 2);
    const startIdx = Math.floor(Math.random() * (maxStart + 1));
    const surah = QuranService.getSurah(entry.surahId);

    setQuiz({
      surahId: entry.surahId,
      surahName: surah?.nameTranslit ?? `Surah ${entry.surahId}`,
      startAyahIdx: startIdx,
      promptWords: firstWords(ayahs[startIdx].textUthmani, 4),
    });
    setPhase('prompt');
  }, [memorized]);

  // Auto-generate on first load
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (!initialized.current && memorized.length > 0) {
      initialized.current = true;
      generateQuiz();
    }
  }, [memorized.length, generateQuiz]);

  async function handleRate(strength: RevisionStrength) {
    if (!quiz) return;
    // Log as revised (the rating itself is handled by the revision system)
    await logRevisions([quiz.surahId]);
    setPhase('rated');
    setSessionCount((n) => n + 1);
  }

  // ── Loading / empty ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accentGreenLight} />
      </View>
    );
  }

  if (memorized.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text variant="body" color={theme.textSecondary}>← Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Card style={{ padding: Spacing.lg }}>
            <Text variant="h2">No surahs memorized yet</Text>
            <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
              Log your hifz progress on the Murajaah tab first — the quiz will use your memorized surahs.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  // ── Active quiz ────────────────────────────────────────────────────

  const ayahs = quiz ? QuranService.getSurahAyahs(quiz.surahId) : [];
  const startAyah = quiz ? ayahs[quiz.startAyahIdx] : null;
  // Show up to 5 ayahs starting from the prompt ayah for the reveal
  const revealAyahs = quiz ? ayahs.slice(quiz.startAyahIdx, quiz.startAyahIdx + 5) : [];
  const surahEntry = quiz ? memorized.find((m) => m.surahId === quiz.surahId) : null;
  const spanStyle = { fontFamily: QURAN_FONT, fontSize, lineHeight: lh };

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" color={theme.textSecondary}>← Back</Text>
          </TouchableOpacity>
          <Text variant="caption" secondary style={{ flex: 1, textAlign: 'center' }}>
            QUIZ {sessionCount > 0 ? `· ${sessionCount} done` : ''}
          </Text>
          <TouchableOpacity
            onPress={generateQuiz}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="caption" style={{ color: theme.accentGreenLight }}>Skip ›</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Surah label */}
        {quiz && (
          <View style={styles.surahLabel}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>
              {quiz.surahName.toUpperCase()} · AYAH {startAyah?.ayahNum}
            </Text>
            {surahEntry && (
              <View style={[styles.strengthPill, {
                backgroundColor:
                  surahEntry.strength === 'critical' ? '#2C1010' :
                  surahEntry.strength === 'weak' ? '#2C1C0A' :
                  surahEntry.strength === 'review' ? '#2C2410' : theme.bgSubtle,
              }]}>
                <Text variant="caption" style={{
                  color:
                    surahEntry.strength === 'critical' ? '#E07070' :
                    surahEntry.strength === 'weak' ? '#E0974A' :
                    surahEntry.strength === 'review' ? '#C9A84C' : theme.accentGreenLight,
                  fontSize: 10,
                }}>
                  {surahEntry.strength.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Instruction */}
        <Text variant="body" secondary style={styles.instruction}>
          Continue reciting from this ayah:
        </Text>

        {/* Prompt — first few words */}
        {quiz && (
          <Card style={styles.promptCard}>
            <RNText
              style={{
                fontFamily: QURAN_FONT,
                fontSize: fontSize + 4,
                lineHeight: lh + 8,
                textAlign: 'center',
                writingDirection: 'rtl',
                color: theme.gold,
              }}
              allowFontScaling={false}
            >
              {quiz.promptWords}
              <RNText style={{ color: theme.textDisabled, fontSize: fontSize - 2 }}> ...</RNText>
            </RNText>
            <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: Spacing.sm }}>
              Recite from here to the end of the ayah
            </Text>
          </Card>
        )}

        {/* REVEAL */}
        {phase === 'prompt' && (
          <TouchableOpacity
            onPress={() => setPhase('revealed')}
            style={[styles.revealBtn, { backgroundColor: theme.accentGreen }]}
            activeOpacity={0.8}
          >
            <Text variant="body" semiBold color="#F5F0E8">Reveal answer</Text>
          </TouchableOpacity>
        )}

        {/* Revealed ayahs */}
        {(phase === 'revealed' || phase === 'rated') && (
          <Card style={styles.revealCard}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8, marginBottom: Spacing.md }}>
              FULL AYAH + CONTEXT
            </Text>
            {revealAyahs.map((ayah, i) => (
              <View key={ayah.verseKey} style={[
                styles.revealAyah,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, paddingTop: Spacing.md, marginTop: Spacing.md },
              ]}>
                <RNText
                  style={{ fontFamily: QURAN_FONT, fontSize, lineHeight: lh, textAlign: 'right', writingDirection: 'rtl', color: i === 0 ? theme.textPrimary : theme.textSecondary }}
                  allowFontScaling={false}
                >
                  {ayah.textUthmani}
                  <RNText style={[spanStyle, { color: theme.gold }]}>{`  ﴿${toArabicNum(ayah.ayahNum)}﴾`}</RNText>
                </RNText>
              </View>
            ))}
          </Card>
        )}

        {/* Self-rating */}
        {phase === 'revealed' && (
          <View style={styles.ratingSection}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8, textAlign: 'center', marginBottom: Spacing.md }}>
              HOW DID YOU DO?
            </Text>
            <View style={styles.ratingGrid}>
              {RATE_CONFIG.map((r) => (
                <TouchableOpacity
                  key={r.strength}
                  onPress={() => handleRate(r.strength)}
                  style={[styles.rateBtn, { backgroundColor: r.bg, borderColor: r.color }]}
                  activeOpacity={0.8}
                >
                  <Text variant="body" semiBold style={{ color: r.color }}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* After rating — next question */}
        {phase === 'rated' && (
          <View style={styles.ratedSection}>
            <Text variant="body" secondary style={{ textAlign: 'center', marginBottom: Spacing.lg }}>
              Logged. Keep going.
            </Text>
            <TouchableOpacity
              onPress={generateQuiz}
              style={[styles.nextBtn, { backgroundColor: theme.accentGreen }]}
              activeOpacity={0.8}
            >
              <Text variant="body" semiBold color="#F5F0E8">Next question ›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md, alignItems: 'center' }} activeOpacity={0.7}>
              <Text variant="body" color={theme.textSecondary}>Finish session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  surahLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  strengthPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  instruction: { marginTop: Spacing.xs },
  promptCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  revealBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  revealCard: { gap: 0 },
  revealAyah: {},
  ratingSection: { marginTop: Spacing.sm },
  ratingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rateBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  ratedSection: { marginTop: Spacing.sm, alignItems: 'center' },
  nextBtn: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
