import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useProgressStats } from '../../src/hooks/useProgress';
import { useActiveGoal } from '../../src/hooks/useGoal';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';
import { Spacing, Radius } from '../../src/constants/spacing';
import { FontFamily } from '../../src/constants/typography';
import { getPositionLabel } from '../../src/lib/quran';
import { useSetPosition } from '../../src/hooks/useProgress';

function formatAmount(n: number): string {
  if (n === Math.floor(n)) return String(n);
  const f = Math.round(n * 4) / 4;
  const whole = Math.floor(f);
  const frac = f - whole;
  const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  if (!fracStr) return n.toFixed(2);
  return whole > 0 ? `${whole}${fracStr}` : fracStr;
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: stats } = useProgressStats();
  const { data: goal } = useActiveGoal();

  const [updatePositionOpen, setUpdatePositionOpen] = useState(false);
  const greeting = getGreeting();
  const todayLogged = stats?.todayLogged ?? null;
  const hasLoggedToday = todayLogged !== null && todayLogged > 0;

  const unitLabel = goal
    ? goal.unit === 'page' ? 'pages'
    : goal.unit === 'juz' ? 'juz'
    : goal.unit === 'surah' ? 'surahs'
    : goal.unit === 'ayah' ? 'ayahs'
    : 'lines'
    : 'units';

  const percentComplete =
    goal && stats
      ? Math.min(100, Math.round((stats.totalLogged / goal.totalUnits) * 100))
      : null;

  const positionLabel =
    goal && stats ? getPositionLabel(goal.unit, stats.totalLogged) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" secondary style={{ letterSpacing: 1 }}>
              {greeting.toUpperCase()}
            </Text>
            <Text variant="h2" style={{ marginTop: 2 }}>
              {user?.displayName ?? 'Welcome'}
            </Text>
          </View>
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={40} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily check-in */}
        {goal ? (
          <Card style={styles.checkinCard}>
            {hasLoggedToday ? (
              <>
                <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>TODAY'S LOG</Text>
                <Text variant="h2" style={{ marginTop: Spacing.xs }}>
                  {formatAmount(todayLogged!)} {unitLabel} memorised
                </Text>
                {todayLogged! >= goal.dailyTarget ? (
                  <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
                    You hit your daily target. Alhamdulillah.
                  </Text>
                ) : (
                  <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
                    {formatAmount(goal.dailyTarget - todayLogged!)} more {unitLabel} to reach your goal.
                  </Text>
                )}

                <Button
                  variant="secondary"
                  label="Update Log"
                  fullWidth={false}
                  style={{ marginTop: Spacing.md }}
                  onPress={() => router.push('/log')}
                />
              </>
            ) : (
              <>
                <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>
                  HAVE YOU MEMORISED TODAY?
                </Text>
                <Text variant="h2" style={{ marginTop: Spacing.xs }}>
                  Log today's session
                </Text>
                <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
                  Daily target: {formatAmount(goal.dailyTarget)} {unitLabel}
                </Text>
                <Button
                  label="Log Session"
                  style={{ marginTop: Spacing.lg }}
                  onPress={() => router.push('/log')}
                />
              </>
            )}
          </Card>
        ) : (
          <Card style={styles.checkinCard}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>GET STARTED</Text>
            <Text variant="h2" style={{ marginTop: Spacing.xs }}>Set your memorisation goal</Text>
            <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
              Define your target and daily pace to begin tracking.
            </Text>
            <Button
              label="Set Goal"
              style={{ marginTop: Spacing.lg }}
              onPress={() => router.push('/(onboarding)/set-goal')}
            />
          </Card>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatTile label="Streak" value={stats ? String(stats.currentStreak) : '—'} unit="days" />
          <StatTile label="This week" value={stats ? formatAmount(stats.weeklyTotal) : '—'} unit={unitLabel} />
          <StatTile label="Complete" value={percentComplete !== null ? `${percentComplete}%` : '—'} unit="" />
        </View>

        {/* Forecast / journey card */}
        {goal && stats && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)/progress')}>
            <Card elevated={false} style={{ borderColor: theme.border }}>
              <View style={styles.goalRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>YOUR JOURNEY</Text>
                  <Text variant="h2" gold style={{ marginTop: Spacing.xs }}>
                    {getForecastDate(goal.totalUnits, stats.totalLogged, goal.dailyTarget)}
                  </Text>
                  <Text variant="caption" secondary style={{ marginTop: 2 }}>
                    projected completion · {formatAmount(goal.dailyTarget)} {unitLabel}/day
                  </Text>
                  <TouchableOpacity
                    onPress={() => setUpdatePositionOpen(true)}
                    activeOpacity={0.7}
                    style={{ marginTop: Spacing.sm, alignSelf: 'flex-start' }}
                  >
                    <Text variant="caption" color={theme.gold}>
                      {positionLabel ?? `${formatAmount(stats.totalLogged)} ${unitLabel} done`} · update ›
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text variant="h2" color={theme.textDisabled} style={{ paddingLeft: Spacing.sm }}>›</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.bgSubtle, marginTop: Spacing.md }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: theme.accentGreenLight, width: `${Math.max(1, percentComplete ?? 0)}%` },
                  ]}
                />
              </View>
              <Text variant="caption" secondary style={{ marginTop: 4 }}>
                {percentComplete}% complete · {formatAmount(Math.max(0, goal.totalUnits - stats.totalLogged))} {unitLabel} remaining
              </Text>
            </Card>
          </TouchableOpacity>
        )}

        {/* Quran reader shortcut */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/surah' as any)}>
          <Card elevated={false} style={[styles.quranCard, { borderColor: theme.gold + '33' }]}>
            <View style={styles.quranRow}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" style={{ letterSpacing: 0.8, color: theme.gold }}>READ QURAN</Text>
                <Text
                  style={{ fontFamily: 'Amiri_700Bold', fontSize: 26, color: theme.gold, marginTop: 4 }}
                >
                  القرآن الكريم
                </Text>
                <Text variant="body" secondary style={{ marginTop: 4 }}>
                  Browse all 114 surahs · tap to read
                </Text>
              </View>
              <View style={[styles.quranArrow, { backgroundColor: theme.gold + '22', borderColor: theme.gold + '44' }]}>
                <Text style={{ color: theme.gold, fontSize: 22 }}>›</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Groups teaser */}
        <Card elevated={false}>
          <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>YOUR GROUPS</Text>
          <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
            You haven't joined a group yet. Memorise with others.
          </Text>
          <Button
            variant="secondary"
            label="Explore Groups"
            fullWidth={false}
            style={{ marginTop: Spacing.md }}
            onPress={() => router.push('/(tabs)/groups')}
          />
        </Card>
      </ScrollView>

      {goal && stats && (
        <UpdatePositionModal
          key={updatePositionOpen ? stats.totalLogged : 'closed'}
          visible={updatePositionOpen}
          onClose={() => setUpdatePositionOpen(false)}
          currentTotal={stats.totalLogged}
          unit={goal.unit}
          unitLabel={unitLabel}
          theme={theme}
        />
      )}
    </View>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  return (
    <Card style={styles.statTile}>
      <Text variant="caption" secondary style={{ letterSpacing: 0.5, textAlign: 'center' }}>
        {label.toUpperCase()}
      </Text>
      <Text variant="h1" gold style={{ marginTop: Spacing.xs, textAlign: 'center' }}>
        {value}
      </Text>
      {unit ? (
        <Text variant="caption" secondary style={{ textAlign: 'center' }}>{unit}</Text>
      ) : null}
    </Card>
  );
}

function getForecastDate(totalUnits: number, logged: number, dailyTarget: number): string {
  const remaining = Math.max(0, totalUnits - logged);
  if (dailyTarget <= 0 || remaining <= 0) return 'Goal complete';
  const daysLeft = Math.ceil(remaining / dailyTarget);
  const date = new Date(Date.now() + daysLeft * 86400000);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Update position modal ─────────────────────────────────────────────────────

function UpdatePositionModal({
  visible,
  onClose,
  currentTotal,
  unit,
  unitLabel,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  currentTotal: number;
  unit: string;
  unitLabel: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const [value, setValue] = useState(String(Math.round(currentTotal)));
  const { mutateAsync: setPosition, isPending } = useSetPosition();

  const parsed = parseFloat(value);
  const isValid = !isNaN(parsed) && parsed >= 0;

  const hint =
    unit === 'surah'
      ? 'Total surahs memorized (e.g. 48 if you\'ve done Nas down to Al-Mulk)'
      : unit === 'page'
      ? 'Total pages memorized (Madinah Mushaf, 1–604)'
      : unit === 'juz'
      ? 'Total juz memorized (1–30)'
      : `Total ${unitLabel} memorized`;

  async function handleSave() {
    if (!isValid) return;
    try {
      await setPosition(parsed);
      onClose();
    } catch {
      Alert.alert('Error', 'Could not update position. Try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
        <View style={styles.modalHandle}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>
        <Text variant="h2">Update Position</Text>
        <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
          {hint}
        </Text>
        <TextInput
          style={[
            styles.posInput,
            {
              color: theme.textPrimary,
              backgroundColor: theme.bgSubtle,
              borderColor: isValid ? theme.border : theme.error,
              fontFamily: FontFamily.sansRegular,
            },
          ]}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          selectTextOnFocus
          autoFocus
        />
        <Text variant="caption" secondary style={{ marginTop: Spacing.xs, textAlign: 'center' }}>
          Currently: {Math.round(currentTotal)} {unitLabel}
        </Text>
        <View style={styles.modalFooter}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text variant="body" color={theme.textSecondary}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Button label="Save Position" onPress={handleSave} loading={isPending} disabled={!isValid} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  checkinCard: { marginBottom: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statTile: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Spacing.sm,
    minWidth: 4,
  },
  quranCard: {
    borderWidth: 1,
  },
  quranRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quranArrow: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // UpdatePositionModal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  modalHandle: { alignItems: 'center', marginBottom: Spacing.lg },
  handle: { width: 40, height: 4, borderRadius: Radius.full },
  posInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 56,
    fontSize: 24,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  modalFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  cancelBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
});
