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
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';
import { Spacing, Radius } from '../../src/constants/spacing';
import { FontFamily } from '../../src/constants/typography';
import { useGroupDetail } from '../../src/hooks/useGroups';
import type { GroupMember, GroupRole } from '../../src/types/api';

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

  const group = data?.group;
  const members = data?.members ?? [];

  const loggedTodayCount = members.filter((m) => m.loggedToday).length;

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
  const unitLabel = member.goal ? UNIT_LABEL[member.goal.unit] ?? 'units' : '';

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

          {/* Stats row */}
          <View style={styles.memberStats}>
            <Text variant="caption" secondary>
              🔥 {member.streak} day{member.streak !== 1 ? 's' : ''}
            </Text>
            {member.goal && (
              <>
                <Text variant="caption" secondary>  ·  </Text>
                <Text variant="caption" secondary>
                  {member.percentComplete}% of {member.goal.totalUnits} {unitLabel}
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
