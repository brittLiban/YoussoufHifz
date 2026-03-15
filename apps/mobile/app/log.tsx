import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/lib/theme';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Spacing, Radius } from '../src/constants/spacing';
import { FontFamily } from '../src/constants/typography';
import { useActiveGoal } from '../src/hooks/useGoal';
import { useLogProgress } from '../src/hooks/useProgress';

const PAGE_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];

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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function LogModal() {
  const theme = useTheme();
  const router = useRouter();
  const { data: goal } = useActiveGoal();
  const { mutateAsync: logProgress, isPending } = useLogProgress();

  const [newAmount, setNewAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPageUnit = goal?.unit === 'page';

  const unitLabel = goal?.unit === 'ayah' ? 'ayahs'
    : goal?.unit === 'page' ? 'pages'
    : goal?.unit === 'juz' ? 'juz'
    : goal?.unit === 'surah' ? 'surahs'
    : goal?.unit === 'line' ? 'lines'
    : 'units';

  function stepNewDown() {
    if (isPageUnit) {
      const idx = PAGE_STEPS.indexOf(newAmount);
      if (idx > 0) setNewAmount(PAGE_STEPS[idx - 1]);
      else if (newAmount > 0.25) setNewAmount(Math.max(0.25, newAmount - 0.25));
    } else {
      setNewAmount((v) => Math.max(0, v - 1));
    }
  }
  function stepNewUp() {
    if (isPageUnit) {
      const idx = PAGE_STEPS.indexOf(newAmount);
      if (idx >= 0 && idx < PAGE_STEPS.length - 1) setNewAmount(PAGE_STEPS[idx + 1]);
      else setNewAmount(newAmount + 1);
    } else {
      setNewAmount((v) => v + 1);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (newAmount <= 0) {
      setError('Log at least some new memorisation');
      return;
    }
    if (!goal) {
      setError('No active goal found');
      return;
    }
    try {
      await logProgress({
        goalId: goal.id,
        unitsLogged: newAmount,
        logDate: todayStr(),
        note: note.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.back(), 700);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.header}>
            <Text variant="h2">Log today's session</Text>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text variant="body" color={theme.textSecondary}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {success ? (
            <Card style={styles.successCard}>
              <Text variant="h2" gold style={{ textAlign: 'center' }}>
                Logged ✓
              </Text>
              <Text variant="body" secondary style={{ textAlign: 'center', marginTop: Spacing.sm }}>
                Keep going. Every session counts.
              </Text>
            </Card>
          ) : goal ? (
            <View style={styles.form}>

              {/* New memorisation */}
              <View>
                <Text variant="caption" secondary style={styles.label}>
                  NEW MEMORISATION
                </Text>
                <AmountStepper
                  value={newAmount}
                  unitLabel={unitLabel}
                  onDown={stepNewDown}
                  onUp={stepNewUp}
                  theme={theme}
                />
                {goal.dailyTarget > 0 && (
                  <View style={styles.pillRow}>
                    {isPageUnit
                      ? [0.25, 0.5, 0.75, 1, goal.dailyTarget].filter((v, i, a) => a.indexOf(v) === i).map((s) => (
                          <QuickPill
                            key={s}
                            label={formatAmount(s)}
                            active={newAmount === s}
                            onPress={() => setNewAmount(s)}
                            theme={theme}
                          />
                        ))
                      : [1, 2, Math.round(goal.dailyTarget / 2), goal.dailyTarget].filter((v) => v > 0).filter((v, i, a) => a.indexOf(v) === i).map((s) => (
                          <QuickPill
                            key={s}
                            label={String(s)}
                            active={newAmount === s}
                            onPress={() => setNewAmount(s)}
                            theme={theme}
                          />
                        ))
                    }
                    <QuickPill
                      label={`Goal ${formatAmount(goal.dailyTarget)}`}
                      active={newAmount === goal.dailyTarget}
                      onPress={() => setNewAmount(goal.dailyTarget)}
                      theme={theme}
                      highlight
                    />
                  </View>
                )}
              </View>

              {/* Note */}
              <View>
                <Text variant="caption" secondary style={styles.label}>
                  NOTE (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    styles.noteInput,
                    {
                      color: theme.textPrimary,
                      backgroundColor: theme.bgSubtle,
                      borderColor: theme.border,
                      fontFamily: FontFamily.sansRegular,
                    },
                  ]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Reviewed with teacher, focused on tajweed"
                  placeholderTextColor={theme.textDisabled}
                  multiline
                  maxLength={250}
                />
              </View>

              {error && (
                <Text variant="caption" color={theme.error}>{error}</Text>
              )}

              <Button
                label="Save Session"
                onPress={handleSubmit}
                loading={isPending}
              />
            </View>
          ) : (
            <Card style={{ padding: Spacing.lg }}>
              <Text variant="body" secondary>
                Set a memorisation goal first before logging your progress.
              </Text>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function AmountStepper({
  value,
  unitLabel,
  onDown,
  onUp,
  theme,
  accentColor,
}: {
  value: number;
  unitLabel: string;
  onDown: () => void;
  onUp: () => void;
  theme: ReturnType<typeof useTheme>;
  accentColor?: string;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={onDown}
        style={[styles.stepperBtn, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}
        activeOpacity={0.7}
      >
        <Text variant="h2" color={theme.textPrimary}>−</Text>
      </TouchableOpacity>
      <View style={[styles.stepperValue, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}>
        <Text variant="h1" color={accentColor ?? theme.accentGreenLight} style={{ letterSpacing: -1 }}>
          {formatAmount(value)}
        </Text>
        <Text variant="caption" secondary style={{ marginTop: 2 }}>
          {unitLabel}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onUp}
        style={[styles.stepperBtn, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}
        activeOpacity={0.7}
      >
        <Text variant="h2" color={theme.textPrimary}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function QuickPill({
  label,
  active,
  onPress,
  theme,
  highlight,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderColor: active ? theme.accentGreenLight : theme.border,
          backgroundColor: active ? theme.accentGreen : theme.bgSubtle,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text
        variant="caption"
        color={active ? theme.accentGreenLight : highlight ? theme.accentGreenLight : theme.textSecondary}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  form: { gap: Spacing.lg },
  label: {
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
    marginTop: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  successCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
