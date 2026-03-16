import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/lib/theme';
import { Text } from '../../../src/components/ui/Text';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Spacing, Radius } from '../../../src/constants/spacing';
import { FontFamily } from '../../../src/constants/typography';
import { useGroupDetail } from '../../../src/hooks/useGroups';
import { useMyTeacherNotes } from '../../../src/hooks/useTeacher';
import { QuranService } from '../../../src/lib/quran-service';
import type { GroupMember, GroupRole, TeacherNote, TeacherTarget } from '../../../src/types/api';

const ROLE_LABEL: Record<GroupRole, string> = {
  leader: 'Leader',
  teacher: 'Teacher',
  member: 'Member',
};

const UNIT_LABEL: Record<string, string> = {
  page: 'pages',
  juz: 'juz',
  surah: 'surahs',
  ayah: 'ayahs',
  line: 'lines',
};

export default function GroupDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useGroupDetail(id ?? '');
  const { data: myNotesData } = useMyTeacherNotes(id ?? '');

  const group = data?.group;
  const members = data?.members ?? [];
  const isTeacherOrLeader = group?.myRole === 'teacher' || group?.myRole === 'leader';

  const loggedTodayCount = members.filter((m) => m.loggedToday).length;
  const myNotes = myNotesData?.notes ?? [];
  const myTargets = myNotesData?.targets ?? [];

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accentGreenLight} />
      </View>
    );
  }

  if (isError || !group) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <Text variant="body" secondary>Could not load group.</Text>
      </View>
    );
  }

  function copyCode() {
    Alert.alert('Invite Code', group!.inviteCode, [{ text: 'OK' }]);
  }

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
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Group header */}
        <View style={styles.groupHeader}>
          <View style={[styles.groupAvatar, { backgroundColor: theme.bgSubtle }]}>
            <Text style={{ fontSize: 32, textAlign: 'center' }} gold>
              {group.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text variant="h2" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            {group.name}
          </Text>
          {group.description ? (
            <Text variant="body" secondary style={{ marginTop: Spacing.xs, textAlign: 'center' }}>
              {group.description}
            </Text>
          ) : null}
          <Text variant="caption" secondary style={{ marginTop: Spacing.xs }}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        {/* Invite code card */}
        <TouchableOpacity onPress={copyCode} activeOpacity={0.7}>
          <Card elevated={false}>
            <View style={styles.codeCardRow}>
              <View>
                <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>INVITE CODE</Text>
                <Text
                  variant="h2"
                  style={{
                    letterSpacing: 6,
                    fontFamily: FontFamily.sansSemiBold,
                    color: theme.accentGreenLight,
                    marginTop: 4,
                  }}
                >
                  {group.inviteCode}
                </Text>
              </View>
              <Text variant="caption" style={{ color: theme.accentGreenLight }}>
                TAP TO COPY
              </Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Today's check-in summary */}
        <Card elevated={false}>
          <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>TODAY'S CHECK-IN</Text>
          <Text variant="h2" gold style={{ marginTop: Spacing.xs }}>
            {loggedTodayCount} / {members.length}
          </Text>
          <Text variant="body" secondary style={{ marginTop: 4 }}>
            {loggedTodayCount === members.length
              ? 'Everyone has logged today. Masha\'Allah.'
              : `${members.length - loggedTodayCount} ${members.length - loggedTodayCount === 1 ? 'member' : 'members'} yet to log today.`}
          </Text>
        </Card>

        {/* Teacher dashboard button — only for teacher/leader */}
        {isTeacherOrLeader && (
          <Button
            label="Teacher Dashboard"
            variant="secondary"
            onPress={() => router.push(`/group/${id}/teacher` as any)}
            style={{ marginBottom: Spacing.xs }}
          />
        )}

        {/* My targets from teacher — student view */}
        {!isTeacherOrLeader && myTargets.length > 0 && (
          <Card elevated={false}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>ASSIGNED TO YOU</Text>
            {myTargets.map((t) => (
              <View key={t.id} style={[styles.targetRow, { borderColor: theme.border }]}>
                <View style={[styles.targetTypeDot, {
                  backgroundColor: t.targetType === 'memorization' ? theme.accentGreen : theme.gold,
                }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{t.description}</Text>
                  {t.dueDate && (
                    <Text variant="caption" secondary style={{ marginTop: 2 }}>
                      Due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* My notes from teacher — student view */}
        {!isTeacherOrLeader && myNotes.length > 0 && (
          <Card elevated={false}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>NOTES FROM YOUR TEACHER</Text>
            {myNotes.slice(0, 3).map((n) => (
              <View key={n.id} style={[styles.noteRow, { borderColor: theme.border }]}>
                <Text variant="body" style={{ lineHeight: 22 }}>{n.content}</Text>
                <Text variant="caption" secondary style={{ marginTop: 4 }}>
                  {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Member list */}
        <Text variant="caption" secondary style={{ letterSpacing: 0.8, paddingHorizontal: Spacing.xs }}>
          MEMBERS
        </Text>

        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Member Card ─────────────────────────────────────────────────────

function MemberCard({ member }: { member: GroupMember }) {
  const theme = useTheme();
  const isElevated = member.role === 'leader' || member.role === 'teacher';
  const currentSurah = member.currentSurahId ? QuranService.getSurah(member.currentSurahId) : null;

  return (
    <Card elevated={false}>
      <View style={styles.memberRow}>
        {/* Avatar + logged dot */}
        <View>
          <Avatar uri={member.avatarUrl} name={member.displayName} size={44} />
          <View
            style={[
              styles.loggedDot,
              {
                backgroundColor: member.loggedToday ? theme.accentGreenLight : theme.bgSubtle,
                borderColor: member.loggedToday ? theme.accentGreenLight : theme.border,
              },
            ]}
          />
        </View>

        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          {/* Name + role */}
          <View style={styles.memberNameRow}>
            <Text variant="body" semiBold style={{ flex: 1 }} numberOfLines={1}>
              {member.displayName}
            </Text>
            {isElevated && (
              <View style={[styles.roleBadge, { borderColor: theme.accentGreenLight }]}>
                <Text variant="caption" style={{ color: theme.accentGreenLight, fontSize: 10 }}>
                  {ROLE_LABEL[member.role]}
                </Text>
              </View>
            )}
          </View>

          {/* Current surah */}
          {currentSurah ? (
            <View style={styles.surahRow}>
              <Text variant="caption" secondary>On </Text>
              <Text variant="caption" semiBold style={{ color: theme.gold }}>
                {currentSurah.nameTranslit}
              </Text>
              <Text
                style={{
                  fontFamily: 'Amiri_400Regular',
                  fontSize: 13,
                  color: theme.gold,
                  marginLeft: 4,
                }}
              >
                {currentSurah.nameArabic}
              </Text>
              <Text variant="caption" secondary style={{ marginLeft: 4 }}>
                · Surah {currentSurah.id}
              </Text>
            </View>
          ) : null}

          {/* Streak + percent */}
          <View style={styles.memberStats}>
            <Text variant="caption" secondary>
              🔥 {member.streak} day{member.streak !== 1 ? 's' : ''}
            </Text>
            {member.goal && (
              <>
                <Text variant="caption" secondary>  ·  </Text>
                <Text variant="caption" secondary>
                  {member.percentComplete}% complete
                </Text>
              </>
            )}
          </View>

          {/* Progress bar */}
          {member.goal && (
            <View style={[styles.progressTrack, { backgroundColor: theme.bgSubtle, marginTop: Spacing.sm }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.accentGreen,
                    width: `${Math.min(100, member.percentComplete)}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  groupHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    minWidth: 4,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  targetTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  noteRow: {
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loggedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
