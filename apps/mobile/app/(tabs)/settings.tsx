import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';
import { Spacing } from '../../src/constants/spacing';
import { logout } from '../../src/lib/authService';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { themePreference, setThemePreference } = useSettingsStore();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text variant="h2">Settings</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <Card>
          <View style={styles.profileRow}>
            <Avatar uri={user?.avatarUrl} name={user?.displayName} size={52} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLarge" semiBold>{user?.displayName}</Text>
              <Text variant="caption" secondary style={{ marginTop: 2 }}>
                {user?.email}
              </Text>
              <Text variant="caption" secondary style={{ marginTop: 2, textTransform: 'capitalize' }}>
                {user?.role}
              </Text>
            </View>
          </View>
        </Card>

        {/* Appearance */}
        <View style={styles.section}>
          <Text variant="caption" secondary style={styles.sectionLabel}>
            APPEARANCE
          </Text>
          <Card padding={0}>
            {(['dark', 'light', 'system'] as const).map((pref, i, arr) => (
              <TouchableOpacity
                key={pref}
                onPress={() => setThemePreference(pref)}
                style={[
                  styles.row,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
              >
                <Text variant="body" style={{ textTransform: 'capitalize' }}>
                  {pref}
                </Text>
                {themePreference === pref && (
                  <Text variant="caption" color={theme.accentGreenLight}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Goal */}
        <View style={styles.section}>
          <Text variant="caption" secondary style={styles.sectionLabel}>
            GOAL
          </Text>
          <Card padding={0}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/(onboarding)/set-goal?edit=1')}
            >
              <Text variant="body">Adjust memorisation goal</Text>
              <Text variant="caption" color={theme.textDisabled}>›</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text variant="caption" secondary style={styles.sectionLabel}>
            ACCOUNT
          </Text>
          <Card padding={0}>
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <Text variant="body" color={theme.error}>
                Sign out
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* App info */}
        <Text variant="caption" secondary style={styles.appInfo}>
          Youssouf · v0.1.0
        </Text>
      </ScrollView>
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  section: { gap: Spacing.sm },
  sectionLabel: { letterSpacing: 0.8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  appInfo: {
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
