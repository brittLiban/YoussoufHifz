import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/lib/theme';
import { Text } from '../../../src/components/ui/Text';
import { Card } from '../../../src/components/ui/Card';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Spacing, Radius } from '../../../src/constants/spacing';
import { useTeacherStudents } from '../../../src/hooks/useTeacher';
import type { StudentDetail } from '../../../src/types/api';

const UNIT_LABEL: Record<string, string> = {
  page: 'pages', juz: 'juz', surah: 'surahs', ayah: 'ayahs', line: 'lines',
};

export default function TeacherDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { data: students, isLoading } = useTeacherStudents(groupId ?? '');

  const needsAttention = students?.filter((s) => {
    if (!s.stats) return false;
    return s.stats.currentStreak === 0 || (s.goal && s.stats.weeklyAvg < s.goal.dailyTarget * 0.6);
  }) ?? [];

  const onTrack = students?.filter((s) => !needsAttention.includes(s)) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="body" color={theme.textSecondary}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text variant="h2">Teacher Dashboard</Text>
          </View>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color={theme.accentGreenLight} style={{ marginTop: Spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Summary row */}
          {students && students.length > 0 && (
            <View style={styles.summaryRow}>
              <SummaryTile label="Students" value={String(students.length)} theme={theme} />
              <SummaryTile label="On track" value={String(onTrack.length)} theme={theme} accent={theme.accentGreenLight} />
              <SummaryTile label="Needs attention" value={String(needsAttention.length)} theme={theme} accent={needsAttention.length > 0 ? theme.gold : undefined} />
            </View>
          )}

          {/* Needs attention */}
          {needsAttention.length > 0 && (
            <>
              <Text variant="caption" secondary style={{ letterSpacing: 0.8, paddingHorizontal: Spacing.xs }}>
                NEEDS ATTENTION
              </Text>
              {needsAttention.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  groupId={groupId ?? ''}
                  attention
                  onPress={() => router.push(`/group/${groupId}/student/${s.id}` as any)}
                  theme={theme}
                />
              ))}
            </>
          )}

          {/* On track */}
          {onTrack.length > 0 && (
            <>
              <Text variant="caption" secondary style={{ letterSpacing: 0.8, paddingHorizontal: Spacing.xs }}>
                ON TRACK
              </Text>
              {onTrack.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  groupId={groupId ?? ''}
                  attention={false}
                  onPress={() => router.push(`/group/${groupId}/student/${s.id}` as any)}
                  theme={theme}
                />
              ))}
            </>
          )}

          {(!students || students.length === 0) && (
            <Card elevated={false}>
              <Text variant="body" secondary style={{ textAlign: 'center' }}>
                No students in this group yet.
              </Text>
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryTile({
  label, value, theme, accent,
}: {
  label: string; value: string; theme: ReturnType<typeof useTheme>; accent?: string;
}) {
  return (
    <Card style={styles.summaryTile}>
      <Text variant="h1" style={{ textAlign: 'center', color: accent ?? theme.textPrimary }}>
        {value}
      </Text>
      <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: 2 }}>
        {label}
      </Text>
    </Card>
  );
}

function StudentCard({
  student, groupId, attention, onPress, theme,
}: {
  student: StudentDetail;
  groupId: string;
  attention: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const unit = student.goal?.unit ?? 'page';
  const unitLabel = UNIT_LABEL[unit] ?? 'units';
  const streak = student.stats?.currentStreak ?? 0;
  const percent = student.stats?.percentComplete ?? 0;
  const weeklyAvg = student.stats?.weeklyAvg ?? 0;
  const dailyTarget = student.goal?.dailyTarget ?? 0;
  const loggedToday = student.stats?.todayLogged !== null && student.stats?.todayLogged !== undefined;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card elevated={false} style={attention ? { borderColor: theme.gold, borderWidth: 1 } : {}}>
        <View style={styles.studentRow}>
          <Avatar uri={student.avatarUrl} name={student.displayName} size={44} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <View style={styles.nameRow}>
              <Text variant="body" semiBold style={{ flex: 1 }} numberOfLines={1}>
                {student.displayName}
              </Text>
              {/* Logged today indicator */}
              <View style={[
                styles.todayDot,
                { backgroundColor: loggedToday ? theme.accentGreenLight : theme.bgSubtle,
                  borderColor: loggedToday ? theme.accentGreenLight : theme.border },
              ]} />
            </View>

            <View style={styles.statsRow}>
              <Text variant="caption" secondary>🔥 {streak} day{streak !== 1 ? 's' : ''}</Text>
              <Text variant="caption" secondary>  ·  </Text>
              <Text variant="caption" secondary>{percent}% complete</Text>
              {dailyTarget > 0 && (
                <>
                  <Text variant="caption" secondary>  ·  </Text>
                  <Text
                    variant="caption"
                    style={{ color: weeklyAvg >= dailyTarget * 0.8 ? theme.accentGreenLight : theme.gold }}
                  >
                    avg {weeklyAvg.toFixed(1)} / {dailyTarget} {unitLabel}/day
                  </Text>
                </>
              )}
            </View>

            {/* Mini progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: theme.bgSubtle, marginTop: Spacing.sm }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.accentGreen, width: `${Math.min(100, percent)}%` }]} />
            </View>
          </View>
          <Text variant="body" color={theme.textDisabled} style={{ paddingLeft: Spacing.sm }}>›</Text>
        </View>
      </Card>
    </TouchableOpacity>
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
    paddingBottom: 80,
    gap: Spacing.md,
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryTile: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  todayDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  progressTrack: { height: 4, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full, minWidth: 4 },
});
