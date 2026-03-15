import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';
import { Spacing, Radius } from '../../src/constants/spacing';
import { FontFamily } from '../../src/constants/typography';
import { useMyGroups, useCreateGroup, useJoinGroup } from '../../src/hooks/useGroups';
import type { Group, GroupRole } from '../../src/types/api';

const ROLE_LABEL: Record<GroupRole, string> = {
  leader: 'Leader',
  teacher: 'Teacher',
  member: 'Member',
};

export default function GroupsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: myGroups, isLoading } = useMyGroups();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="h2">Groups</Text>
            <Text variant="body" secondary style={{ marginTop: 2 }}>
              Your memorisation circles
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={[styles.newBtn, { backgroundColor: theme.accentGreen }]}
            activeOpacity={0.8}
          >
            <Text variant="caption" style={{ color: theme.accentGreenLight, letterSpacing: 0.5 }}>
              + NEW
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.accentGreenLight} style={{ marginTop: Spacing.xl }} />
        ) : myGroups && myGroups.length > 0 ? (
          <>
            {myGroups.map((g) => (
              <GroupCard key={g.id} group={g} onPress={() => router.push(`/group/${g.id}` as never)} />
            ))}
          </>
        ) : (
          <Card>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>
              YOUR CIRCLES
            </Text>
            <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
              You're not part of any group yet. Create one or join with an invite code.
            </Text>
            <View style={styles.emptyActions}>
              <Button
                label="Create Group"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={() => setShowCreate(true)}
              />
              <Button
                label="Join with Code"
                variant="secondary"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={() => setShowJoin(true)}
              />
            </View>
          </Card>
        )}

        {myGroups && myGroups.length > 0 && (
          <TouchableOpacity onPress={() => setShowJoin(true)} activeOpacity={0.7}>
            <Card elevated={false}>
              <Text variant="body" secondary style={{ textAlign: 'center' }}>
                Have an invite code?{' '}
                <Text variant="body" style={{ color: theme.accentGreenLight }}>
                  Join a group
                </Text>
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      </ScrollView>

      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <JoinGroupModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
      />
    </View>
  );
}

// ── Group Card ──────────────────────────────────────────────────────

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const theme = useTheme();
  const isLeaderOrTeacher = group.myRole === 'leader' || group.myRole === 'teacher';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card>
        <View style={styles.groupCardRow}>
          <View style={[styles.groupAvatar, { backgroundColor: theme.bgSubtle }]}>
            <Text variant="h2" gold style={{ textAlign: 'center' }}>
              {group.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <View style={styles.groupNameRow}>
              <Text variant="body" semiBold style={{ flex: 1 }}>
                {group.name}
              </Text>
              {isLeaderOrTeacher && (
                <View style={[styles.roleBadge, { backgroundColor: theme.bgSubtle, borderColor: theme.accentGreenLight }]}>
                  <Text variant="caption" style={{ color: theme.accentGreenLight, fontSize: 10 }}>
                    {ROLE_LABEL[group.myRole]}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="caption" secondary style={{ marginTop: 2 }}>
              {group.memberCount ?? 0} {group.memberCount === 1 ? 'member' : 'members'}
            </Text>
            {group.description ? (
              <Text variant="caption" secondary style={{ marginTop: 2 }} numberOfLines={1}>
                {group.description}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.codeRow, { borderTopColor: theme.border }]}>
          <Text variant="caption" secondary style={{ letterSpacing: 0.5 }}>
            INVITE CODE
          </Text>
          <Text variant="caption" style={{ color: theme.accentGreenLight, letterSpacing: 2, fontFamily: FontFamily.sansSemiBold }}>
            {group.inviteCode}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Create Group Modal ──────────────────────────────────────────────

function CreateGroupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { mutateAsync: createGroup, isPending } = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setError('Group name is required'); return; }
    setError(null);
    try {
      await createGroup({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bgElevated }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            <Text variant="h2" style={{ marginBottom: Spacing.lg }}>Create a group</Text>

            <Text variant="caption" secondary style={styles.fieldLabel}>GROUP NAME</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.bgSubtle, borderColor: error && !name.trim() ? theme.error : theme.border, fontFamily: FontFamily.sansRegular }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Saturday Halaqa"
              placeholderTextColor={theme.textDisabled}
              maxLength={80}
              autoFocus
            />

            <Text variant="caption" secondary style={[styles.fieldLabel, { marginTop: Spacing.md }]}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.bgSubtle, borderColor: theme.border, fontFamily: FontFamily.sansRegular }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What is this group for?"
              placeholderTextColor={theme.textDisabled}
              maxLength={300}
            />

            {error && (
              <Text variant="caption" color={theme.error} style={{ marginTop: Spacing.sm }}>
                {error}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={onClose}
              />
              <Button
                label="Create"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={handleCreate}
                loading={isPending}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Join Group Modal ────────────────────────────────────────────────

function JoinGroupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { mutateAsync: joinGroup, isPending } = useJoinGroup();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim()) { setError('Enter an invite code'); return; }
    setError(null);
    try {
      await joinGroup(code.trim());
      setCode('');
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error;
      setError(msg ?? 'Invalid code or something went wrong.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bgElevated }]}>
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            <Text variant="h2" style={{ marginBottom: Spacing.xs }}>Join a group</Text>
            <Text variant="body" secondary style={{ marginBottom: Spacing.lg }}>
              Ask your group leader or teacher for the 6-character invite code.
            </Text>

            <Text variant="caption" secondary style={styles.fieldLabel}>INVITE CODE</Text>
            <TextInput
              style={[styles.codeInput, { color: theme.textPrimary, backgroundColor: theme.bgSubtle, borderColor: error ? theme.error : theme.border, fontFamily: FontFamily.sansSemiBold }]}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="XXXXXX"
              placeholderTextColor={theme.textDisabled}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />

            {error && (
              <Text variant="caption" color={theme.error} style={{ marginTop: Spacing.sm }}>
                {error}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={onClose}
              />
              <Button
                label="Join"
                fullWidth={false}
                style={{ flex: 1 }}
                onPress={handleJoin}
                loading={isPending}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  newBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  groupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  handleBar: { alignItems: 'center', marginBottom: Spacing.lg },
  handle: { width: 40, height: 4, borderRadius: Radius.full },
  fieldLabel: { letterSpacing: 0.8, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
});
