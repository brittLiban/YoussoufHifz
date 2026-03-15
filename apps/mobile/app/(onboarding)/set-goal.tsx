import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Spacing, Radius } from '../../src/constants/spacing';
import { FontFamily } from '../../src/constants/typography';
import { useActiveGoal, useCreateGoal, useUpdateGoal } from '../../src/hooks/useGoal';
import { useSetPosition } from '../../src/hooks/useProgress';
import { QuranService } from '../../src/lib/quran-service';
import type { MemUnit } from '../../src/types/api';

const UNITS: { value: MemUnit; label: string; example: string }[] = [
  { value: 'page', label: 'Pages', example: 'Madinah Mushaf (604 pages)' },
  { value: 'juz', label: 'Juz', example: '30 juz in the Quran' },
  { value: 'surah', label: 'Surahs', example: '114 surahs total' },
  { value: 'ayah', label: 'Ayahs', example: '6,236 ayahs total' },
];

const DAILY_SUGGESTIONS: Record<MemUnit, number[]> = {
  page: [0.5, 1, 2, 3],
  juz: [0.5, 1, 2],
  surah: [1, 2, 3, 5],
  ayah: [5, 10, 15, 20],
  line: [5, 10, 15, 20],
};

const UNIT_TOTALS: Record<MemUnit, number> = {
  page: 604,
  juz: 30,
  surah: 114,
  ayah: 6236,
  line: 3760,
};

const FRACTION_STEPS: Record<MemUnit, number[]> = {
  page: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5],
  juz: [0.5, 1, 2, 3, 5],
  surah: [1, 2, 3, 5, 7, 10],
  ayah: [5, 10, 15, 20, 30],
  line: [5, 10, 15, 20],
};

function formatAmount(n: number): string {
  if (n === Math.floor(n)) return String(n);
  if (n % 0.25 === 0) {
    const whole = Math.floor(n);
    const frac = n - whole;
    const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : '¾';
    return whole > 0 ? `${whole}${fracStr}` : fracStr;
  }
  return n.toFixed(2);
}

function calcDays(total: number, daily: number): number | null {
  if (daily <= 0 || total <= 0) return null;
  return Math.ceil(total / daily);
}

function projDate(days: number): string {
  return new Date(Date.now() + days * 86400000).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Convert a selected surah (last memorized, Nas→Baqarah direction) to units logged. */
function surahToUnits(surahId: number, unit: MemUnit): number {
  switch (unit) {
    case 'surah':
      return 114 - surahId + 1;
    case 'page': {
      const s = QuranService.getSurah(surahId);
      // Pages memorized = from surah's first page to the last page of the Quran
      return s ? Math.max(0, 604 - s.pageStart + 1) : 0;
    }
    case 'juz': {
      const s = QuranService.getSurah(surahId);
      return s ? Math.max(0, 30 - s.juzStart + 1) : 0;
    }
    case 'ayah': {
      let total = 0;
      for (let id = surahId; id <= 114; id++) {
        const s = QuranService.getSurah(id);
        if (s) total += s.ayahCount;
      }
      return total;
    }
    default:
      return 0;
  }
}

const ALL_SURAHS = QuranService.getAllSurahs();
// Reversed: Nas (114) → Al-Fatiha (1) — the hifz direction
const SURAHS_REVERSED = [...ALL_SURAHS].reverse();

export default function SetGoalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === '1';

  const { data: existingGoal } = useActiveGoal();
  const { mutateAsync: createGoal, isPending: isCreating } = useCreateGoal();
  const { mutateAsync: updateGoal, isPending: isUpdating } = useUpdateGoal();
  const { mutateAsync: setPosition } = useSetPosition();
  const isPending = isCreating || isUpdating;

  const [step, setStep] = useState(0);
  const [unit, setUnit] = useState<MemUnit>('page');
  const [dailyTarget, setDailyTarget] = useState<number>(1);
  // The surah the user picked as their current position (null = starting fresh)
  const [startingSurahId, setStartingSurahId] = useState<number | null>(null);
  const [populated, setPopulated] = useState(false);

  // Auto-derive totalUnits from unit (goal is always full Quran)
  const totalUnits = UNIT_TOTALS[unit];

  // Steps: edit = 2 (unit + daily), new = 3 (unit + daily + position)
  const TOTAL_STEPS = isEdit ? 2 : 3;

  // How many units the starting surah corresponds to in the current unit
  const startingLogged = useMemo(
    () => (startingSurahId ? surahToUnits(startingSurahId, unit) : 0),
    [startingSurahId, unit]
  );

  const daysToComplete = calcDays(totalUnits, dailyTarget);
  const projectedDate = daysToComplete ? projDate(daysToComplete) : null;
  const unitLabel = UNITS.find((u) => u.value === unit)?.label.toLowerCase() ?? 'units';

  // Pre-populate form when editing
  useEffect(() => {
    if (isEdit && existingGoal && !populated) {
      setUnit(existingGoal.unit as MemUnit);
      setDailyTarget(existingGoal.dailyTarget);
      setPopulated(true);
    }
  }, [isEdit, existingGoal, populated]);

  async function handleSubmit() {
    if (!totalUnits || !dailyTarget) return;
    try {
      if (isEdit && existingGoal) {
        await updateGoal({ id: existingGoal.id, unit, totalUnits, dailyTarget });
        router.back();
      } else {
        await createGoal({ unit, totalUnits, dailyTarget });
        if (startingLogged > 0) {
          await setPosition(startingLogged);
        }
        router.replace('/(tabs)/home');
      }
    } catch {
      // error handled by mutation
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {isEdit && (
          <View style={[styles.editHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text variant="body" color={theme.textSecondary}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="bodyLarge" semiBold>Adjust Goal</Text>
            <View style={{ width: 50 }} />
          </View>
        )}

        {/* Progress dots */}
        <View style={styles.stepRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                {
                  backgroundColor: i <= step ? theme.accentGreenLight : theme.bgSubtle,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <StepUnit
              unit={unit}
              onSelect={setUnit}
              totalSteps={TOTAL_STEPS}
              theme={theme}
            />
          )}
          {step === 1 && (
            <StepDaily
              unit={unit}
              unitLabel={unitLabel}
              daily={dailyTarget}
              onChangeDaily={setDailyTarget}
              daysToComplete={daysToComplete}
              projectedDate={projectedDate}
              totalSteps={TOTAL_STEPS}
              theme={theme}
            />
          )}
          {step === 2 && !isEdit && (
            <StepStartPosition
              unit={unit}
              unitLabel={unitLabel}
              selectedSurahId={startingSurahId}
              startingLogged={startingLogged}
              onSelectSurah={setStartingSurahId}
              onClear={() => setStartingSurahId(null)}
              theme={theme}
            />
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep((s) => s - 1)} style={styles.backBtn}>
              <Text variant="body" color={theme.textSecondary}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.nextBtn}>
            {step < TOTAL_STEPS - 1 ? (
              <Button label="Continue" onPress={() => setStep((s) => s + 1)} />
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {!isEdit && !startingSurahId && (
                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={{ alignItems: 'center', paddingVertical: Spacing.xs }}
                    activeOpacity={0.7}
                  >
                    <Text variant="caption" color={theme.textSecondary}>
                      Skip — I'm starting fresh
                    </Text>
                  </TouchableOpacity>
                )}
                <Button
                  label={isEdit ? 'Update Goal' : startingSurahId ? 'Start My Journey' : 'Pick My Starting Surah'}
                  onPress={handleSubmit}
                  loading={isPending}
                  disabled={!totalUnits || !dailyTarget || (!isEdit && !startingSurahId)}
                />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}

// ── Step 0: Unit picker ─────────────────────────────────────────────
function StepUnit({
  unit,
  onSelect,
  totalSteps,
  theme,
}: {
  unit: MemUnit;
  onSelect: (u: MemUnit) => void;
  totalSteps: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.stepContent}>
      <Text variant="caption" secondary style={styles.stepLabel}>STEP 1 OF {totalSteps}</Text>
      <Text variant="h1" style={styles.stepHeadline}>How will you track?</Text>
      <Text variant="body" secondary>
        Choose the unit your teacher or halaqa uses.
      </Text>
      <View style={styles.unitGrid}>
        {UNITS.map((u) => {
          const active = unit === u.value;
          return (
            <TouchableOpacity
              key={u.value}
              onPress={() => onSelect(u.value)}
              activeOpacity={0.8}
              style={styles.unitTile}
            >
              <Card
                style={{
                  borderColor: active ? theme.accentGreenLight : theme.border,
                  borderWidth: active ? 1.5 : 1,
                  padding: Spacing.md,
                }}
              >
                <Text variant="body" semiBold>{u.label}</Text>
                <Text variant="caption" secondary style={{ marginTop: 2 }}>{u.example}</Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Step 1: Daily target ─────────────────────────────────────────────
function StepDaily({
  unit,
  unitLabel,
  daily,
  onChangeDaily,
  daysToComplete,
  projectedDate,
  totalSteps,
  theme,
}: {
  unit: MemUnit;
  unitLabel: string;
  daily: number;
  onChangeDaily: (v: number) => void;
  daysToComplete: number | null;
  projectedDate: string | null;
  totalSteps: number;
  theme: ReturnType<typeof useTheme>;
}) {
  const steps = FRACTION_STEPS[unit];
  const currentIdx = steps.indexOf(daily);

  function stepDown() {
    if (currentIdx > 0) onChangeDaily(steps[currentIdx - 1]);
    else if (daily > 0.25) onChangeDaily(Math.max(0.25, daily - (unit === 'page' ? 0.25 : 1)));
  }
  function stepUp() {
    if (currentIdx >= 0 && currentIdx < steps.length - 1) onChangeDaily(steps[currentIdx + 1]);
    else if (currentIdx < 0) onChangeDaily(Math.ceil(daily) + 1);
    else onChangeDaily(daily + 1);
  }

  return (
    <View style={styles.stepContent}>
      <Text variant="caption" secondary style={styles.stepLabel}>STEP 2 OF {totalSteps}</Text>
      <Text variant="h1" style={styles.stepHeadline}>Daily target</Text>
      <Text variant="body" secondary>
        How many {unitLabel} will you memorise each day?
        {unit === 'page' ? ' You can set fractions — ¼ page, ½ page, etc.' : ''}
      </Text>

      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={stepDown}
          style={[styles.stepperBtn, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}
          activeOpacity={0.7}
        >
          <Text variant="h2" color={theme.textPrimary}>−</Text>
        </TouchableOpacity>
        <View style={[styles.stepperValue, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}>
          <Text variant="h1" gold style={{ letterSpacing: -1 }}>{formatAmount(daily)}</Text>
          <Text variant="caption" secondary style={{ marginTop: 2 }}>{unitLabel} / day</Text>
        </View>
        <TouchableOpacity
          onPress={stepUp}
          style={[styles.stepperBtn, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}
          activeOpacity={0.7}
        >
          <Text variant="h2" color={theme.textPrimary}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pillRow}>
        {DAILY_SUGGESTIONS[unit].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => onChangeDaily(s)}
            style={[
              styles.suggestionPill,
              {
                borderColor: daily === s ? theme.accentGreenLight : theme.border,
                backgroundColor: theme.bgSubtle,
              },
            ]}
          >
            <Text variant="caption" color={daily === s ? theme.accentGreenLight : theme.textSecondary}>
              {formatAmount(s)} / day
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {projectedDate && daysToComplete !== null && (
        <Card elevated={false} style={styles.forecastCard}>
          <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>AT THIS PACE</Text>
          <Text variant="h2" gold style={{ marginTop: Spacing.xs }}>{projectedDate}</Text>
          <Text variant="body" secondary style={{ marginTop: 4 }}>
            {daysToComplete.toLocaleString()} days from today
          </Text>
        </Card>
      )}
    </View>
  );
}

// ── Step 2: Starting position (surah picker for all unit types) ───────
function StepStartPosition({
  unit,
  unitLabel,
  selectedSurahId,
  startingLogged,
  onSelectSurah,
  onClear,
  theme,
}: {
  unit: MemUnit;
  unitLabel: string;
  selectedSurahId: number | null;
  startingLogged: number;
  onSelectSurah: (id: number) => void;
  onClear: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedSurah = selectedSurahId
    ? ALL_SURAHS.find(s => s.id === selectedSurahId) ?? null
    : null;

  const filtered = useMemo(() => {
    if (!query.trim()) return SURAHS_REVERSED;
    const q = query.toLowerCase();
    return SURAHS_REVERSED.filter(
      s => s.nameTranslit.toLowerCase().includes(q) ||
           s.nameEnglish.toLowerCase().includes(q) ||
           String(s.id).includes(q)
    );
  }, [query]);

  function handleSelect(surahId: number) {
    onSelectSurah(surahId);
    setPickerOpen(false);
    setQuery('');
  }

  // Human-readable summary of what startingLogged means for the chosen unit
  function getLoggedLabel(): string {
    if (!selectedSurah) return '';
    switch (unit) {
      case 'surah': return `${startingLogged} surahs memorized (Nas → ${selectedSurah.nameTranslit})`;
      case 'page': return `~${startingLogged} pages memorized`;
      case 'juz': return `~${startingLogged} juz memorized`;
      case 'ayah': return `~${startingLogged.toLocaleString()} ayahs memorized`;
      default: return `${startingLogged} ${unitLabel} logged`;
    }
  }

  return (
    <View style={styles.stepContent}>
      <Text variant="caption" secondary style={styles.stepLabel}>STEP 3 OF 3</Text>
      <Text variant="h1" style={styles.stepHeadline}>Where are you now?</Text>
      <Text variant="body" secondary>
        Already memorized some Quran? Pick the surah you're currently on. We'll set your starting position so your stats are accurate from day one.
      </Text>

      {/* Selection button */}
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={[
          styles.posSelectBtn,
          {
            backgroundColor: theme.bgSubtle,
            borderColor: selectedSurah ? theme.accentGreenLight : theme.border,
          },
        ]}
        activeOpacity={0.8}
      >
        <Text variant="caption" secondary>Surah I'm currently memorizing</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 }}>
          {selectedSurah ? (
            <>
              <Text variant="body" semiBold>{selectedSurah.id}. {selectedSurah.nameTranslit}</Text>
              <Text style={{ fontFamily: 'Amiri_700Bold', fontSize: 18, color: theme.gold }}>
                {selectedSurah.nameArabic}
              </Text>
            </>
          ) : (
            <Text variant="body" color={theme.textDisabled}>Tap to select →</Text>
          )}
        </View>
        {selectedSurah && (
          <Text variant="caption" color={theme.accentGreenLight} style={{ marginTop: 2 }}>
            {getLoggedLabel()}
          </Text>
        )}
      </TouchableOpacity>

      {selectedSurah && (
        <TouchableOpacity
          onPress={onClear}
          style={{ alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Text variant="caption" color={theme.textSecondary}>Clear — I'm starting fresh</Text>
        </TouchableOpacity>
      )}

      {/* Inline surah picker */}
      {pickerOpen && (
        <View style={[styles.inlinePicker, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          <Text variant="body" semiBold style={{ marginBottom: Spacing.sm }}>
            Which surah are you currently on?
          </Text>
          <TextInput
            style={[
              styles.pickerSearch,
              {
                color: theme.textPrimary,
                backgroundColor: theme.bgSubtle,
                borderColor: theme.border,
                fontFamily: FontFamily.sansRegular,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search surahs..."
            placeholderTextColor={theme.textDisabled}
            autoFocus
          />
          <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtered.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleSelect(s.id)}
                style={[styles.pickerRow, { borderBottomColor: theme.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.numChip, { backgroundColor: theme.bgSubtle }]}>
                  <Text variant="caption" color={theme.gold} style={{ fontSize: 11 }}>{s.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body">{s.nameTranslit}</Text>
                  <Text variant="caption" secondary>{s.nameEnglish}</Text>
                </View>
                <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: theme.textSecondary }}>
                  {s.nameArabic}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => setPickerOpen(false)}
            style={{ paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm }}
          >
            <Text variant="caption" color={theme.textSecondary}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  stepDot: {
    height: 8,
    borderRadius: Radius.full,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  stepContent: { gap: Spacing.lg },
  stepLabel: { letterSpacing: 1 },
  stepHeadline: { marginTop: Spacing.xs },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  unitTile: { width: '47%' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestionPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  forecastCard: {
    marginTop: Spacing.sm,
    padding: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  backBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  nextBtn: { flex: 1 },
  posSelectBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  inlinePicker: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  pickerSearch: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  numChip: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
