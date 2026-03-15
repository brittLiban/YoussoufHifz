import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Spacing, Radius } from '../../src/constants/spacing';
import { FontFamily } from '../../src/constants/typography';
import { QuranService } from '../../src/lib/quran-service';
import { useActiveGoal } from '../../src/hooks/useGoal';
import { useProgressStats } from '../../src/hooks/useProgress';

const SURAH_LIST = QuranService.getAllSurahs();

export default function SurahListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: goal } = useActiveGoal();
  const { data: stats } = useProgressStats();

  // Current surah being memorized (for highlighting)
  const currentSurahId = useMemo(() => {
    if (!goal || !stats || goal.unit !== 'surah') return null;
    const nextIdx = Math.floor(stats.totalLogged);
    // User goes Nas (114) → Baqarah (2): surah id = 115 - nextIdx
    return Math.max(1, Math.min(114, 115 - nextIdx));
  }, [goal, stats]);

  const filtered = useMemo(() => {
    if (!query.trim()) return SURAH_LIST;
    const q = query.toLowerCase();
    return SURAH_LIST.filter(
      (s) =>
        s.nameTranslit.toLowerCase().includes(q) ||
        s.nameArabic.includes(query) ||
        String(s.id).includes(q) ||
        s.nameEnglish.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <Text variant="body" color={theme.textSecondary}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text
              style={[styles.arabicTitle, { color: theme.gold, fontFamily: 'Amiri_700Bold' }]}
            >
              القرآن الكريم
            </Text>
            <Text variant="caption" secondary>The Holy Quran · 114 Surahs</Text>
          </View>
        </View>

        <View style={[styles.searchRow, { borderBottomColor: theme.border }]}>
          <TextInput
            style={[
              styles.search,
              {
                color: theme.textPrimary,
                backgroundColor: theme.bgSubtle,
                borderColor: theme.border,
                fontFamily: FontFamily.sansRegular,
              },
            ]}
            placeholder="Search surah…"
            placeholderTextColor={theme.textDisabled}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: s }) => {
          const isCurrent = s.id === currentSurahId;
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push(`/surah/${s.id}` as any)}
              style={[
                styles.row,
                { borderBottomColor: theme.border },
                isCurrent && { backgroundColor: theme.bgSubtle },
              ]}
            >
              {/* Number badge */}
              <View style={[styles.badge, { borderColor: theme.border, backgroundColor: theme.bgSubtle }]}>
                <Text variant="caption" secondary style={{ fontVariant: ['tabular-nums'] }}>
                  {s.id}
                </Text>
              </View>

              {/* Names */}
              <View style={styles.names}>
                <Text variant="body" semiBold>{s.nameTranslit}</Text>
                <Text variant="caption" secondary style={{ marginTop: 2 }}>
                  {s.nameEnglish} · {s.ayahCount} ayahs · {s.type === 'meccan' ? 'Meccan' : 'Medinan'}
                </Text>
              </View>

              {/* Arabic name + current marker */}
              <View style={styles.right}>
                <Text
                  style={[styles.arabicName, { color: theme.textPrimary, fontFamily: 'Amiri_700Bold' }]}
                >
                  {s.nameArabic}
                </Text>
                {isCurrent && (
                  <Text variant="caption" color={theme.gold} style={{ marginTop: 2, textAlign: 'right' }}>
                    current
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backBtn: { paddingRight: Spacing.sm },
  titleBlock: { flex: 1, alignItems: 'center' },
  arabicTitle: { fontSize: 22 },
  searchRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  search: {
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  list: { paddingBottom: Spacing['3xl'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: { flex: 1 },
  right: { alignItems: 'flex-end', minWidth: 80 },
  arabicName: { fontSize: 18 },
});
