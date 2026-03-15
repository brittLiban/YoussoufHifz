import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/lib/theme';
import { useProgressStats } from '../../src/hooks/useProgress';
import { useForecast } from '../../src/hooks/useProgress';
import { useActiveGoal } from '../../src/hooks/useGoal';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radius } from '../../src/constants/spacing';
import type { WeeklyDataPoint } from '../../src/types/api';

function formatAmount(n: number): string {
  if (n === Math.floor(n)) return String(n);
  const f = Math.round(n * 4) / 4;
  const whole = Math.floor(f);
  const frac = f - whole;
  const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  if (!fracStr) return n.toFixed(2);
  return whole > 0 ? `${whole}${fracStr}` : fracStr;
}

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useProgressStats();
  const { data: forecast } = useForecast();
  const { data: goal } = useActiveGoal();

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

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text variant="h2">Progress</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!goal ? (
          <NoGoalCard onSetGoal={() => router.push('/(onboarding)/set-goal')} />
        ) : statsLoading ? (
          <Card>
            <Text variant="body" secondary>Loading your progress...</Text>
          </Card>
        ) : (
          <>
            {/* New memorisation progress */}
            <Card>
              <Text variant="caption" secondary style={styles.sectionLabel}>
                MEMORISATION PROGRESS
              </Text>
              <View style={styles.progressMain}>
                <View style={styles.percentBlock}>
                  <Text variant="display" gold>{percentComplete ?? 0}%</Text>
                  <Text variant="caption" secondary style={{ marginTop: 2 }}>complete</Text>
                </View>
                <View style={styles.progressDetails}>
                  <DetailRow label="Logged" value={`${formatAmount(stats?.totalLogged ?? 0)} ${unitLabel}`} />
                  <DetailRow
                    label="Remaining"
                    value={`${formatAmount(Math.max(0, goal.totalUnits - (stats?.totalLogged ?? 0)))} ${unitLabel}`}
                  />
                  <DetailRow label="Goal" value={`${formatAmount(goal.totalUnits)} ${unitLabel}`} />
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: theme.bgSubtle }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: theme.accentGreen, width: `${percentComplete ?? 0}%` },
                  ]}
                />
              </View>
            </Card>

            {/* Streak + stats */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text variant="caption" secondary style={styles.statLabel}>STREAK</Text>
                <Text variant="h1" gold>{stats?.currentStreak ?? 0}</Text>
                <Text variant="caption" secondary>days</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text variant="caption" secondary style={styles.statLabel}>BEST STREAK</Text>
                <Text variant="h1" gold>{stats?.longestStreak ?? 0}</Text>
                <Text variant="caption" secondary>days</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text variant="caption" secondary style={styles.statLabel}>THIS WEEK</Text>
                <Text variant="h1" gold>{formatAmount(stats?.weeklyTotal ?? 0)}</Text>
                <Text variant="caption" secondary>{unitLabel}</Text>
              </Card>
            </View>

            {/* Weekly chart */}
            {stats?.weeklyData && (
              <Card elevated={false}>
                <Text variant="caption" secondary style={styles.sectionLabel}>
                  LAST 7 DAYS
                </Text>
                <WeeklyChart
                  data={stats.weeklyData}
                  dailyTarget={goal.dailyTarget}
                />
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.accentGreen }]} />
                    <Text variant="caption" secondary>New</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.border }]} />
                    <Text variant="caption" secondary>
                      Target ({formatAmount(goal.dailyTarget)} {unitLabel})
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Memorisation forecast */}
            {forecast && (
              <Card>
                <Text variant="caption" secondary style={styles.sectionLabel}>
                  MEMORISATION FORECAST
                </Text>
                {forecast.projectedDate ? (
                  <>
                    <Text variant="h2" gold style={{ marginTop: Spacing.xs }}>
                      {new Date(forecast.projectedDate).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </Text>
                    <Text variant="body" secondary style={{ marginTop: 4 }}>
                      {forecast.daysLeft !== null && forecast.daysLeft > 0
                        ? `${forecast.daysLeft.toLocaleString()} days from today`
                        : 'Goal complete'}
                    </Text>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.forecastRow}>
                      <ForecastStat label="Based on" value={`${formatAmount(forecast.dailyAvg)} ${unitLabel}/day`} />
                      <ForecastStat label="Remaining" value={`${formatAmount(forecast.remaining)} ${unitLabel}`} />
                    </View>
                  </>
                ) : (
                  <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
                    Log a few sessions to generate your forecast.
                  </Text>
                )}
              </Card>
            )}

            <Button label="Log Today's Session" onPress={() => router.push('/log')} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function NoGoalCard({ onSetGoal }: { onSetGoal: () => void }) {
  return (
    <Card>
      <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>NO ACTIVE GOAL</Text>
      <Text variant="h2" style={{ marginTop: Spacing.xs }}>Start your hifz journey</Text>
      <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
        Set a memorisation goal to track your progress, see your streak, and get a projected completion date.
      </Text>
      <Button label="Set Memorisation Goal" style={{ marginTop: Spacing.lg }} onPress={onSetGoal} />
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text variant="caption" secondary>{label}</Text>
      <Text variant="caption" color={theme.textPrimary} semiBold>{value}</Text>
    </View>
  );
}

function ForecastStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.forecastStat}>
      <Text variant="caption" secondary>{label}</Text>
      <Text variant="body" semiBold color={theme.textPrimary} style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function WeeklyChart({
  data,
  dailyTarget,
}: {
  data: WeeklyDataPoint[];
  dailyTarget: number;
}) {
  const theme = useTheme();
  const maxVal = Math.max(
    dailyTarget * 1.5,
    ...data.map((d) => d.units),
    1
  );

  return (
    <View style={styles.chart}>
      {data.map((point) => {
        const newPct = Math.min(1, point.units / maxVal);
        const targetPct = Math.min(1, dailyTarget / maxVal);
        const dayLabel = new Date(point.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' });
        const metTarget = point.units >= dailyTarget && point.units > 0;

        return (
          <View key={point.date} style={styles.chartCol}>
            <View style={styles.barContainer}>
              {/* Target line */}
              <View
                style={[
                  styles.targetLine,
                  { bottom: `${targetPct * 100}%` as any, borderColor: theme.border },
                ]}
              />
              {/* New memorisation bar */}
              <View
                style={[
                  styles.bar,
                  {
                    height: `${newPct * 100}%` as any,
                    backgroundColor: metTarget
                      ? theme.accentGreen
                      : point.units > 0
                      ? theme.accentGreenLight
                      : theme.bgSubtle,
                    borderRadius: Radius.sm,
                    minHeight: point.units > 0 ? 4 : 2,
                  },
                ]}
              />
            </View>
            <Text variant="caption" secondary style={{ fontSize: 10, textAlign: 'center', marginTop: 4 }}>
              {dayLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  sectionLabel: { letterSpacing: 0.8, marginBottom: Spacing.sm },
  progressMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  percentBlock: { alignItems: 'center', width: 80 },
  progressDetails: { flex: 1, gap: Spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: Spacing.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Spacing.sm, minWidth: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 2 },
  statLabel: { letterSpacing: 0.5, fontSize: 9, textAlign: 'center' },
  divider: { height: 1, marginVertical: Spacing.md },
  forecastRow: { flexDirection: 'row', gap: Spacing.xl },
  forecastStat: { gap: 2 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chartCol: { flex: 1, alignItems: 'center' },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bar: { width: '100%' },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  chartLegend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: Radius.full },
});
