import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Spacing } from '../../src/constants/spacing';

export default function SubcisScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text variant="caption" secondary style={{ letterSpacing: 1.5 }}>
            SUBCIS
          </Text>
          <Text variant="h2" style={{ marginTop: Spacing.xs }}>
            Group Revision
          </Text>
          <Text variant="body" secondary style={{ marginTop: Spacing.xs }}>
            A shared revision cycle where every voice completes the whole.
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Explanation card */}
        <Card>
          <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>
            HOW SUBCIS WORKS
          </Text>
          <View style={styles.steps}>
            <Step number="1" text="A group leader selects a revision target — e.g. Juz 1." />
            <Step number="2" text="The app divides the portion among all group members." />
            <Step number="3" text="Each member records and submits their assigned section." />
            <Step number="4" text="The app stitches all recordings into one complete track." />
            <Step number="5" text="The group listens together and revises as one." />
          </View>
        </Card>

        {/* Active cycles — stub */}
        <Card elevated={false}>
          <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>
            ACTIVE CYCLES
          </Text>
          <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
            You have no active Subcis cycles. Join a group and ask your leader
            to start one.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepBadge,
          { backgroundColor: theme.bgSubtle, borderColor: theme.border },
        ]}
      >
        <Text variant="caption" gold semiBold>
          {number}
        </Text>
      </View>
      <Text variant="body" secondary style={{ flex: 1, lineHeight: 22 }}>
        {text}
      </Text>
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
  steps: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
