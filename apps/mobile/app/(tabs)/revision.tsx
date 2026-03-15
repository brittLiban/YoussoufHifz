import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Spacing, Radius } from '../../src/constants/spacing';
import {
  useSurahRevisions,
  useLogSurahRevisions,
  useUndoSurahRevision,
} from '../../src/hooks/useRevision';
import type { RevisionStrength } from '../../src/types/api';
import { SURAHS } from '../../src/lib/quran';

// Strength config
const S: Record<RevisionStrength, { color: string; bg: string; label: string }> = {
  strong:   { color: '#52B788', bg: '#1A3329', label: 'Strong'     },
  good:     { color: '#7EC8A0', bg: '#1A2E23', label: 'Good'       },
  review:   { color: '#C9A84C', bg: '#2C2410', label: 'Review'     },
  weak:     { color: '#E0974A', bg: '#2C1C0A', label: 'Weak'       },
  critical: { color: '#E07070', bg: '#2C1010', label: 'Overdue'    },
};

function formatAgo(days: number | null): string {
  if (days === null) return 'Never';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type Filter = 'all' | 'overdue' | 'review';

export default function RevisionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, refetch } = useSurahRevisions();
  const { mutateAsync: logRevisions, isPending: isLogging } = useLogSurahRevisions();
  const { mutateAsync: undoRevision } = useUndoSurahRevision();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');

  const memorized = data?.memorized ?? [];
  const currentSurahId = data?.currentSurahId ?? null;
  const totalMemorized = data?.totalMemorized ?? 0;

  const currentSurah = currentSurahId ? SURAHS.find(s => s.id === currentSurahId) : null;

  // Stats
  const overdueCount = memorized.filter(s => s.strength === 'critical' || s.strength === 'weak').length;
  const reviewCount = memorized.filter(s => s.strength === 'review').length;
  const revisedToday = memorized.filter(s => s.revisedToday).length;

  const displayed = useMemo(() => {
    if (filter === 'overdue') return memorized.filter(s => s.strength === 'critical' || s.strength === 'weak');
    if (filter === 'review') return memorized.filter(s => s.strength === 'review' || s.strength === 'weak' || s.strength === 'critical');
    return memorized;
  }, [memorized, filter]);

  function toggleSelect(surahId: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(surahId)) next.delete(surahId);
      else next.add(surahId);
      return next;
    });
  }

  async function handleMarkRevised() {
    if (selected.size === 0) return;
    await logRevisions(Array.from(selected));
    setSelected(new Set());
  }

  async function handleUndoToday(surahId: number) {
    await undoRevision(surahId);
  }

  // ── Empty / loading ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text variant="h2">Murajaah</Text>
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Text variant="body" secondary>Loading...</Text>
        </View>
      </View>
    );
  }

  if (totalMemorized === 0) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text variant="h2">Murajaah</Text>
            <Text variant="caption" secondary style={{ marginTop: 2 }}>Revision</Text>
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Card style={styles.emptyCard}>
            <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>NO SURAHS YET</Text>
            <Text variant="h2" style={{ marginTop: Spacing.xs }}>Start logging your hifz</Text>
            <Text variant="body" secondary style={{ marginTop: Spacing.sm }}>
              Once you log progress on a surah-based goal, your memorized surahs will appear here for revision tracking.
            </Text>
            <TouchableOpacity
              style={[styles.logBtn, { backgroundColor: theme.accentGreen }]}
              onPress={() => router.push('/log')}
              activeOpacity={0.8}
            >
              <Text variant="body" semiBold color="#F5F0E8">Log a session</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </View>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="h2">Murajaah</Text>
            <Text variant="caption" secondary style={{ marginTop: 2 }}>Revision Tracker</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/quiz' as any)}
            style={[styles.quizBtn, { backgroundColor: theme.gold + '22', borderColor: theme.gold + '66' }]}
            activeOpacity={0.8}
          >
            <Text variant="caption" semiBold style={{ color: theme.gold }}>Quiz ›</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={displayed}
        keyExtractor={(item) => String(item.surahId)}
        contentContainerStyle={[styles.list, selected.size > 0 && { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Current position banner */}
            {currentSurah && (
              <View style={[styles.positionBanner, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" secondary style={{ letterSpacing: 0.8 }}>CURRENTLY MEMORIZING</Text>
                  <Text variant="body" semiBold style={{ marginTop: 2 }}>
                    {currentSurah.nameTranslit}
                    {'  '}
                    <Text style={{ fontFamily: 'Amiri_700Bold', fontSize: 16, color: theme.gold }}>
                      {currentSurah.nameArabic}
                    </Text>
                  </Text>
                  <Text variant="caption" secondary style={{ marginTop: 1 }}>
                    Surah {currentSurah.id} · Juz {getJuzForSurah(currentSurah.id)} · p.{currentSurah.pageStart}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/surah/${currentSurah.id}` as any)}
                  style={[styles.readBtn, { borderColor: theme.border }]}
                  activeOpacity={0.7}
                >
                  <Text variant="caption" color={theme.gold}>Read ›</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill value={totalMemorized} label="memorized" color={theme.textSecondary} theme={theme} />
              <StatPill value={revisedToday} label="revised today" color={theme.accentGreenLight} theme={theme} />
              <StatPill
                value={overdueCount}
                label="overdue"
                color={overdueCount > 0 ? S.critical.color : theme.textSecondary}
                theme={theme}
              />
            </View>

            {/* Filter tabs */}
            <View style={[styles.filterRow, { backgroundColor: theme.bgSubtle, borderColor: theme.border }]}>
              {([
                { key: 'all' as Filter,     label: 'All' },
                { key: 'overdue' as Filter, label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
                { key: 'review' as Filter,  label: `Needs Work${reviewCount > 0 ? ` (${reviewCount})` : ''}` },
              ]).map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.filterTab,
                    filter === f.key && { backgroundColor: theme.accentGreen },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="caption"
                    semiBold
                    color={filter === f.key ? '#F5F0E8' : theme.textSecondary}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {(Object.keys(S) as RevisionStrength[]).map((k) => (
                <View key={k} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: S[k].color }]} />
                  <Text variant="caption" secondary style={{ fontSize: 10 }}>{S[k].label}</Text>
                </View>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const surah = SURAHS.find(s => s.id === item.surahId);
          if (!surah) return null;
          const isSelected = selected.has(item.surahId);
          const cfg = S[item.strength];

          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                if (item.revisedToday) {
                  handleUndoToday(item.surahId);
                } else {
                  toggleSelect(item.surahId);
                }
              }}
              style={[
                styles.row,
                {
                  borderBottomColor: theme.border,
                  borderLeftColor: isSelected ? theme.accentGreenLight : cfg.color,
                  backgroundColor: isSelected ? theme.bgSubtle : 'transparent',
                },
              ]}
            >
              {/* Surah number */}
              <View style={[styles.numBadge, { backgroundColor: theme.bgSubtle }]}>
                <Text variant="caption" style={{ color: theme.gold, fontSize: 11 }}>
                  {item.surahId}
                </Text>
              </View>

              {/* Name */}
              <View style={styles.nameBlock}>
                <View style={styles.nameRow}>
                  <Text variant="body" semiBold>{surah.nameTranslit}</Text>
                  <Text style={{ fontFamily: 'Amiri_400Regular', fontSize: 16, color: theme.textPrimary, marginLeft: 6 }}>
                    {surah.nameArabic}
                  </Text>
                </View>
                <Text variant="caption" secondary style={{ marginTop: 2 }}>
                  {surah.ayahCount} ayahs · {formatAgo(item.daysSinceRevision)}
                  {item.revisionCount > 0 ? ` · ${item.revisionCount}× revised` : ''}
                </Text>
              </View>

              {/* Right: strength or tick */}
              <View style={styles.rightBlock}>
                {item.revisedToday ? (
                  <View style={[styles.badge, { backgroundColor: '#1A3329' }]}>
                    <Text variant="caption" color="#52B788" style={{ fontSize: 11 }}>✓ done</Text>
                  </View>
                ) : isSelected ? (
                  <View style={[styles.badge, { backgroundColor: theme.accentGreen }]}>
                    <Text variant="caption" color="#F5F0E8" style={{ fontSize: 11 }}>selected</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Text variant="caption" color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Bottom action bar */}
      {selected.size > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.bgElevated, borderTopColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => setSelected(new Set())}
            style={styles.clearBtn}
            activeOpacity={0.7}
          >
            <Text variant="body" color={theme.textSecondary}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMarkRevised}
            disabled={isLogging}
            style={[styles.markBtn, { backgroundColor: theme.accentGreen, opacity: isLogging ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            <Text variant="body" semiBold color="#F5F0E8">
              {isLogging ? 'Logging...' : `Mark ${selected.size} as Revised`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const JUZ_STARTS = [1,22,42,62,82,102,121,142,162,182,201,221,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];

function getJuzForSurah(surahId: number): number {
  const surah = SURAHS.find(s => s.id === surahId);
  if (!surah) return 1;
  let juz = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) {
    if (JUZ_STARTS[i] <= surah.pageStart) juz = i + 1;
    else break;
  }
  return juz;
}

function StatPill({
  value, label, color, theme,
}: {
  value: number;
  label: string;
  color: string;
  theme: ReturnType<typeof import('../../src/lib/theme').useTheme>;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
      <Text variant="h2" color={color}>{value}</Text>
      <Text variant="caption" secondary style={{ fontSize: 10, marginTop: 2, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  quizBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  listHeader: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  list: { paddingBottom: Spacing['3xl'] },
  emptyCard: { padding: Spacing.lg, gap: Spacing.sm },
  logBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  // Position banner
  positionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  readBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    gap: Spacing.md,
  },
  numBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  rightBlock: { alignItems: 'flex-end' },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  // Bottom bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  clearBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  markBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
