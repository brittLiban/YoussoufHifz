import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../src/lib/theme';
import { Text } from '../../../../src/components/ui/Text';
import { Card } from '../../../../src/components/ui/Card';
import { Button } from '../../../../src/components/ui/Button';
import { Avatar } from '../../../../src/components/ui/Avatar';
import { Spacing, Radius } from '../../../../src/constants/spacing';
import { FontFamily } from '../../../../src/constants/typography';
import {
  useStudentDetail,
  useAddNote,
  useAssignTarget,
  useCompleteTarget,
} from '../../../../src/hooks/useTeacher';
import type { TeacherTarget, TeacherNote } from '../../../../src/types/api';

const UNIT_LABEL: Record<string, string> = {
  page: 'pages', juz: 'juz', surah: 'surahs', ayah: 'ayahs', line: 'lines',
};

export default function StudentDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id: groupId, uid: studentId } = useLocalSearchParams<{ id: string; uid: string }>();

  const { data: student, isLoading } = useStudentDetail(groupId ?? '', studentId ?? '');
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAssignTarget, setShowAssignTarget] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accentGreenLight} />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <Text variant="body" secondary>Student not found.</Text>
      </View>
    );
  }

  const unit = student.goal?.unit ?? 'page';
  const unitLabel = UNIT_LABEL[unit] ?? 'units';
  const stats = student.stats;
  const percent = stats?.percentComplete ?? 0;
  const streak = stats?.currentStreak ?? 0;
  const weeklyAvg = stats?.weeklyAvg ?? 0;
  const dailyTarget = student.goal?.dailyTarget ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" color={theme.textSecondary}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Student header */}
        <View style={styles.studentHeader}>
          <Avatar uri={student.avatarUrl} name={student.displayName} size={64} />
          <Text variant="h2" style={{ marginTop: Spacing.md }}>{student.displayName}</Text>
          <Text variant="caption" secondary style={{ marginTop: 4 }}>{student.email}</Text>

          {/* Progress ring stand-in — large % number */}
          <View style={[styles.percentBadge, { borderColor: theme.accentGreen }]}>
            <Text variant="h1" gold>{percent}%</Text>
            <Text variant="caption" secondary>complete</Text>
          </View>
        </View>

        {/* Stats cards */}
        {stats && (
          <View style={styles.statsRow}>
            <StatTile label="Streak" value={`${streak}d`} theme={theme} />
            <StatTile label="Weekly avg" value={`${weeklyAvg.toFixed(1)}`} sub={unitLabel + '/day'} theme={theme} />
            <StatTile label="Daily target" value={`${dailyTarget}`} sub={unitLabel + '/day'} theme={theme} />
          </View>
        )}

        {/* 7-day activity chart */}
        {stats?.last7Days && (
          <Card elevated={false}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8, marginBottom: Spacing.md }}>
              LAST 7 DAYS
            </Text>
            <WeeklyBars days={stats.last7Days} dailyTarget={dailyTarget} theme={theme} />
          </Card>
        )}

        {/* Active targets */}
        <View style={styles.sectionHeader}>
          <Text variant="caption" secondary style={{ letterSpacing: 0.8, flex: 1 }}>ACTIVE TARGETS</Text>
          <TouchableOpacity onPress={() => setShowAssignTarget(true)}>
            <Text variant="caption" style={{ color: theme.accentGreenLight }}>+ Assign</Text>
          </TouchableOpacity>
        </View>

        {student.targets.length === 0 ? (
          <Card elevated={false}>
            <Text variant="body" secondary>No active targets.</Text>
          </Card>
        ) : (
          student.targets.map((t) => (
            <TargetCard
              key={t.id}
              target={t}
              groupId={groupId ?? ''}
              studentId={studentId ?? ''}
              theme={theme}
            />
          ))
        )}

        {/* Notes */}
        <View style={styles.sectionHeader}>
          <Text variant="caption" secondary style={{ letterSpacing: 0.8, flex: 1 }}>NOTES</Text>
          <TouchableOpacity onPress={() => setShowAddNote(true)}>
            <Text variant="caption" style={{ color: theme.accentGreenLight }}>+ Add note</Text>
          </TouchableOpacity>
        </View>

        {student.notes.length === 0 ? (
          <Card elevated={false}>
            <Text variant="body" secondary>No notes yet. Add one to guide this student.</Text>
          </Card>
        ) : (
          student.notes.map((n) => (
            <NoteCard key={n.id} note={n} theme={theme} />
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <AddNoteModal
        visible={showAddNote}
        onClose={() => setShowAddNote(false)}
        groupId={groupId ?? ''}
        studentId={studentId ?? ''}
        theme={theme}
      />
      <AssignTargetModal
        visible={showAssignTarget}
        onClose={() => setShowAssignTarget(false)}
        groupId={groupId ?? ''}
        studentId={studentId ?? ''}
        theme={theme}
      />
    </View>
  );
}

// ── Weekly bars ──────────────────────────────────────────────────────────────

function WeeklyBars({
  days, dailyTarget, theme,
}: {
  days: { date: string; units: number }[];
  dailyTarget: number;
  theme: ReturnType<typeof useTheme>;
}) {
  const max = Math.max(dailyTarget * 1.2, ...days.map((d) => d.units), 1);
  return (
    <View style={styles.barsContainer}>
      {days.map((d) => {
        const heightPct = (d.units / max) * 100;
        const hitTarget = dailyTarget > 0 && d.units >= dailyTarget;
        const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2);
        return (
          <View key={d.date} style={styles.barCol}>
            <View style={styles.barTrack}>
              {d.units > 0 && (
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(4, heightPct)}%`,
                      backgroundColor: hitTarget ? theme.accentGreenLight : theme.accentGreen,
                    },
                  ]}
                />
              )}
            </View>
            <Text variant="caption" secondary style={{ fontSize: 10, marginTop: 4 }}>{dayLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Target card ──────────────────────────────────────────────────────────────

function TargetCard({
  target, groupId, studentId, theme,
}: {
  target: TeacherTarget;
  groupId: string;
  studentId: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const { mutateAsync: completeTarget, isPending } = useCompleteTarget(groupId, studentId);

  return (
    <Card elevated={false}>
      <View style={styles.targetRow}>
        <View style={[
          styles.typePill,
          { backgroundColor: target.targetType === 'memorization' ? theme.accentGreen + '33' : theme.gold + '33',
            borderColor: target.targetType === 'memorization' ? theme.accentGreenLight : theme.gold },
        ]}>
          <Text variant="caption" style={{
            color: target.targetType === 'memorization' ? theme.accentGreenLight : theme.gold,
            fontSize: 10,
          }}>
            {target.targetType === 'memorization' ? 'MEMORISATION' : 'REVISION'}
          </Text>
        </View>
      </View>
      <Text variant="body" style={{ marginTop: Spacing.sm, lineHeight: 22 }}>{target.description}</Text>
      {target.dueDate && (
        <Text variant="caption" secondary style={{ marginTop: 4 }}>
          Due {new Date(target.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => completeTarget(target.id)}
        style={[styles.completeBtn, { borderColor: theme.border }]}
        activeOpacity={0.7}
        disabled={isPending}
      >
        <Text variant="caption" style={{ color: theme.textSecondary }}>
          {isPending ? 'Marking…' : 'Mark complete'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
}

// ── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note, theme }: { note: TeacherNote; theme: ReturnType<typeof useTheme> }) {
  return (
    <Card elevated={false}>
      <Text variant="body" style={{ lineHeight: 22 }}>{note.content}</Text>
      <View style={styles.noteMeta}>
        <Text variant="caption" secondary>
          {new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        {note.isShareableWithParent && (
          <Text variant="caption" style={{ color: theme.gold }}>  · Shared with parent</Text>
        )}
      </View>
    </Card>
  );
}

// ── Add Note Modal ───────────────────────────────────────────────────────────

function AddNoteModal({
  visible, onClose, groupId, studentId, theme,
}: {
  visible: boolean; onClose: () => void;
  groupId: string; studentId: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const [content, setContent] = useState('');
  const [shareWithParent, setShareWithParent] = useState(false);
  const { mutateAsync: addNote, isPending } = useAddNote(groupId);

  async function handleSubmit() {
    if (!content.trim()) return;
    try {
      await addNote({ studentId, content: content.trim(), isShareableWithParent: shareWithParent });
      setContent('');
      setShareWithParent(false);
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save note. Try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: theme.bgElevated }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            <Text variant="h2" style={{ marginBottom: Spacing.sm }}>Add note</Text>
            <Text variant="body" secondary style={{ marginBottom: Spacing.lg }}>
              This note is visible to the student in their group view.
            </Text>

            <TextInput
              style={[styles.noteInput, {
                color: theme.textPrimary,
                backgroundColor: theme.bgSubtle,
                borderColor: theme.border,
                fontFamily: FontFamily.sansRegular,
              }]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your note…"
              placeholderTextColor={theme.textDisabled}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body">Share with parent</Text>
                <Text variant="caption" secondary style={{ marginTop: 2 }}>
                  Only if student has linked a parent
                </Text>
              </View>
              <Switch
                value={shareWithParent}
                onValueChange={setShareWithParent}
                trackColor={{ true: theme.accentGreen, false: theme.bgSubtle }}
                thumbColor={shareWithParent ? theme.accentGreenLight : theme.textDisabled}
              />
            </View>

            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={onClose} />
              <Button label="Save Note" fullWidth={false} style={{ flex: 1 }} onPress={handleSubmit}
                loading={isPending} disabled={!content.trim()} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Assign Target Modal ──────────────────────────────────────────────────────

function AssignTargetModal({
  visible, onClose, groupId, studentId, theme,
}: {
  visible: boolean; onClose: () => void;
  groupId: string; studentId: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const [targetType, setTargetType] = useState<'memorization' | 'revision'>('memorization');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const { mutateAsync: assignTarget, isPending } = useAssignTarget(groupId);

  async function handleSubmit() {
    if (!description.trim()) return;
    const dueDateVal = dueDate.trim().match(/^\d{4}-\d{2}-\d{2}$/) ? dueDate.trim() : null;
    try {
      await assignTarget({ studentId, targetType, description: description.trim(), dueDate: dueDateVal });
      setDescription('');
      setDueDate('');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not assign target. Try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: theme.bgElevated }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            <Text variant="h2" style={{ marginBottom: Spacing.lg }}>Assign target</Text>

            {/* Type picker */}
            <View style={styles.typePicker}>
              {(['memorization', 'revision'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTargetType(t)}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor: targetType === t ? theme.accentGreen : theme.bgSubtle,
                      borderColor: targetType === t ? theme.accentGreenLight : theme.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text variant="body" style={{
                    color: targetType === t ? theme.accentGreenLight : theme.textSecondary,
                  }}>
                    {t === 'memorization' ? 'Memorisation' : 'Revision'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text variant="caption" secondary style={[styles.fieldLabel, { marginTop: Spacing.md }]}>
              DESCRIPTION
            </Text>
            <TextInput
              style={[styles.descInput, {
                color: theme.textPrimary,
                backgroundColor: theme.bgSubtle,
                borderColor: theme.border,
                fontFamily: FontFamily.sansRegular,
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder={targetType === 'memorization'
                ? 'e.g. Memorise Surah Al-Mulk by next week'
                : 'e.g. Revise Juz 30 — focus on short surahs'}
              placeholderTextColor={theme.textDisabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text variant="caption" secondary style={[styles.fieldLabel, { marginTop: Spacing.md }]}>
              DUE DATE (OPTIONAL — YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.dateInput, {
                color: theme.textPrimary,
                backgroundColor: theme.bgSubtle,
                borderColor: theme.border,
                fontFamily: FontFamily.sansRegular,
              }]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="e.g. 2026-04-01"
              placeholderTextColor={theme.textDisabled}
              keyboardType="numbers-and-punctuation"
            />

            <View style={[styles.modalActions, { marginTop: Spacing.lg }]}>
              <Button label="Cancel" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={onClose} />
              <Button label="Assign" fullWidth={false} style={{ flex: 1 }} onPress={handleSubmit}
                loading={isPending} disabled={!description.trim()} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function StatTile({
  label, value, sub, theme,
}: {
  label: string; value: string; sub?: string; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing.md }}>
      <Text variant="h2" gold style={{ textAlign: 'center' }}>{value}</Text>
      {sub && <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: 2 }}>{sub}</Text>}
      <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    gap: Spacing.md,
  },
  studentHeader: { alignItems: 'center', paddingVertical: Spacing.lg },
  percentBadge: {
    marginTop: Spacing.lg,
    borderWidth: 2,
    borderRadius: 60,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  // Weekly bars
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: '100%', height: 64, justifyContent: 'flex-end', borderRadius: Radius.sm, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: Radius.sm },
  // Target card
  targetRow: { flexDirection: 'row' },
  typePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  completeBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  // Note card
  noteMeta: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  // Modals
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: 48,
  },
  handleBar: { alignItems: 'center', marginBottom: Spacing.lg },
  handle: { width: 40, height: 4, borderRadius: Radius.full },
  fieldLabel: { letterSpacing: 0.8, marginBottom: Spacing.sm },
  noteInput: {
    borderWidth: 1, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: 15,
    minHeight: 120,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.md, gap: Spacing.md,
  },
  typePicker: { flexDirection: 'row', gap: Spacing.sm },
  typeOption: {
    flex: 1, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1,
    alignItems: 'center',
  },
  descInput: {
    borderWidth: 1, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: 15,
    minHeight: 80,
  },
  dateInput: {
    borderWidth: 1, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: 15, height: 52,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
