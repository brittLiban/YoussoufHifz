import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
  Dimensions,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Spacing, Radius } from '../../src/constants/spacing';
import { getTajweedSegments, getTajweedColor, isTajweedAvailable } from '../../src/lib/tajweed';
import { TranslationService } from '../../src/lib/translation-service';
import { QuranService } from '../../src/lib/quran-service';
import type { AyahInfo, SurahInfo, VerseKey } from '../../src/types/quran';

const BASMALLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const QURAN_FONT = 'ScheherazadeNew_400Regular';
const QURAN_FONT_BOLD = 'ScheherazadeNew_700Bold';
const FONT_SIZE = 28;
const LINE_HEIGHT = 60;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALL_PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

function toArabicNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

type ReadingMode = 'plain' | 'tajweed';

export default function SurahReaderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahId = parseInt(id ?? '1', 10);

  const surah = useMemo(() => QuranService.getSurah(surahId), [surahId]);

  const [mode, setMode] = useState<ReadingMode>('plain');
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentPage, setCurrentPage] = useState(surah?.pageStart ?? 1);
  const tajweedAvailable = isTajweedAvailable();

  const pagerRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.item) {
        setCurrentPage(viewableItems[0].item as number);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  // Surah name for the header (updates as you flip pages)
  const currentSurahOnPage = useMemo(() => {
    const ayahs = QuranService.getPageAyahs(currentPage);
    if (!ayahs.length) return null;
    return QuranService.getSurah(ayahs[0].surahId);
  }, [currentPage]);

  if (!surah) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
        <Text variant="body" secondary style={{ padding: Spacing.lg }}>Surah not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']}>
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="body" color={theme.textSecondary}>‹ Back</Text>
          </TouchableOpacity>

          {/* Current surah name in centre */}
          {!showTranslation && currentSurahOnPage && (
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm }}>
              <Text variant="caption" secondary numberOfLines={1}>
                {currentSurahOnPage.nameTranslit}
              </Text>
            </View>
          )}
          {showTranslation && <View style={{ flex: 1 }} />}

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={() => setShowTranslation(v => !v)}
              style={[
                styles.toggleBtn,
                {
                  borderColor: showTranslation ? theme.accentGreenLight : theme.border,
                  backgroundColor: showTranslation ? theme.accentGreen : theme.bgSubtle,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text variant="caption" color={showTranslation ? '#F5F0E8' : theme.textSecondary}>
                EN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!tajweedAvailable && mode === 'plain') return;
                setMode(m => m === 'plain' ? 'tajweed' : 'plain');
              }}
              style={[
                styles.toggleBtn,
                {
                  borderColor: mode === 'tajweed' ? '#9400A8' : tajweedAvailable ? theme.border : theme.bgSubtle,
                  backgroundColor: mode === 'tajweed' ? '#2A0030' : theme.bgSubtle,
                  opacity: tajweedAvailable ? 1 : 0.4,
                },
              ]}
              activeOpacity={tajweedAvailable ? 0.7 : 1}
            >
              <Text variant="caption" color={mode === 'tajweed' ? '#CC44FF' : theme.textSecondary}>
                تجويد
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* TRANSLATION MODE: scrollable verse-by-verse for the current surah */}
      {showTranslation ? (
        <TranslationView surah={surah} mode={mode} theme={theme} />
      ) : (
        /* MUSHAF MODE: horizontal page pager across all 604 pages */
        <FlatList
          ref={pagerRef}
          data={ALL_PAGES}
          keyExtractor={String}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialScrollIndex={surah.pageStart - 1}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          renderItem={({ item: pageNum }) => (
            <PageView
              pageNum={pageNum}
              mode={mode}
              tajweedAvailable={tajweedAvailable}
              theme={theme}
            />
          )}
          windowSize={3}
          maxToRenderPerBatch={3}
          initialNumToRender={1}
        />
      )}
    </View>
  );
}

// ─── Single mushaf page ───────────────────────────────────────────────────────

const PageView = React.memo(function PageView({
  pageNum,
  mode,
  tajweedAvailable,
  theme,
}: {
  pageNum: number;
  mode: ReadingMode;
  tajweedAvailable: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const ayahs = useMemo(() => QuranService.getPageAyahs(pageNum), [pageNum]);
  const textColor = theme.textPrimary;
  const goldColor = theme.gold;

  // Group ayahs by surah so we can show surah headers at surah boundaries
  const groups = useMemo(() => {
    const result: { surah: SurahInfo; ayahs: AyahInfo[] }[] = [];
    for (const ayah of ayahs) {
      const last = result[result.length - 1];
      if (last && last.surah.id === ayah.surahId) {
        last.ayahs.push(ayah);
      } else {
        const s = QuranService.getSurah(ayah.surahId);
        if (s) result.push({ surah: s, ayahs: [ayah] });
      }
    }
    return result;
  }, [ayahs]);

  // Span style — every nested Text needs explicit font + lineHeight
  const spanStyle = useMemo(() => ({
    fontFamily: QURAN_FONT,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
  }), []);

  // Build inline content for a group of ayahs
  const buildInline = useCallback((groupAyahs: AyahInfo[]) => {
    const nodes: React.ReactNode[] = [];
    for (const ayah of groupAyahs) {
      const marker = `  ﴿${toArabicNum(ayah.ayahNum)}﴾  `;
      if (mode === 'tajweed' && tajweedAvailable) {
        const segs = getTajweedSegments(ayah.verseKey as VerseKey);
        if (segs && segs.length > 0) {
          segs.forEach((seg, i) => {
            nodes.push(
              <RNText
                key={`${ayah.verseKey}-${i}`}
                style={[spanStyle, { color: getTajweedColor(seg.rule, textColor) }]}
              >
                {seg.text}
              </RNText>
            );
          });
          nodes.push(
            <RNText key={`${ayah.verseKey}-m`} style={[spanStyle, { color: goldColor }]}>
              {marker}
            </RNText>
          );
          continue;
        }
      }
      nodes.push(
        <RNText key={ayah.verseKey} style={[spanStyle, { color: textColor }]}>
          {ayah.textUthmani}
        </RNText>
      );
      nodes.push(
        <RNText key={`${ayah.verseKey}-m`} style={[spanStyle, { color: goldColor }]}>
          {marker}
        </RNText>
      );
    }
    return nodes;
  }, [mode, tajweedAvailable, textColor, goldColor, spanStyle]);

  return (
    <ScrollView
      style={{ width: SCREEN_WIDTH }}
      contentContainerStyle={[styles.pageContent, { minHeight: '100%' }]}
      showsVerticalScrollIndicator={false}
    >
      {groups.map(({ surah, ayahs: groupAyahs }) => {
        const isFirstAyah = groupAyahs[0]?.ayahNum === 1;
        const showBasmallah = isFirstAyah && surah.id !== 1 && surah.id !== 9;

        return (
          <View key={surah.id}>
            {/* Surah header — shown only when the surah starts on this page */}
            {isFirstAyah && (
              <View style={styles.surahHeader}>
                <View style={[styles.ornamentLine, { backgroundColor: theme.gold }]} />
                <RNText style={[styles.surahNameArabic, { color: theme.gold, fontFamily: QURAN_FONT_BOLD }]}>
                  {surah.nameArabic}
                </RNText>
                <Text variant="h2" style={{ textAlign: 'center', marginTop: Spacing.xs }}>
                  {surah.nameTranslit}
                </Text>
                <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: 4 }}>
                  {surah.ayahCount} ayahs · {surah.type === 'meccan' ? 'Meccan' : 'Medinan'} · Juz {surah.juzStart}
                </Text>
                <View style={[styles.ornamentLine, { backgroundColor: theme.gold, marginTop: Spacing.md }]} />
              </View>
            )}

            {showBasmallah && (
              <RNText style={[styles.basmallah, { color: theme.gold, fontFamily: QURAN_FONT }]}>
                {BASMALLAH}
              </RNText>
            )}

            {/* Flowing ayah text */}
            <RNText
              style={{
                fontFamily: QURAN_FONT,
                fontSize: FONT_SIZE,
                lineHeight: LINE_HEIGHT,
                textAlign: 'justify',
                writingDirection: 'rtl',
                color: textColor,
              }}
              allowFontScaling={false}
            >
              {buildInline(groupAyahs)}
            </RNText>
          </View>
        );
      })}

      {/* Page number footer */}
      <View style={styles.pageFooter}>
        <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
        <Text variant="caption" secondary style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
          {pageNum}
        </Text>
      </View>
    </ScrollView>
  );
});

// ─── Translation mode: scrollable verse list for the whole surah ─────────────

type ListItem =
  | { type: 'header' }
  | { type: 'basmallah' }
  | { type: 'ayah'; ayah: AyahInfo };

function TranslationView({
  surah,
  mode,
  theme,
}: {
  surah: SurahInfo;
  mode: ReadingMode;
  theme: ReturnType<typeof useTheme>;
}) {
  const ayahs = useMemo(() => QuranService.getSurahAyahs(surah.id), [surah.id]);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [translationLoading, setTranslationLoading] = useState(true);

  useEffect(() => {
    setTranslationLoading(true);
    TranslationService.getSurahTranslations('en-sahih', surah.id, surah.ayahCount)
      .then(setTranslations)
      .finally(() => setTranslationLoading(false));
  }, [surah.id, surah.ayahCount]);

  const showBasmallah = surah.id !== 9 && surah.id !== 1;

  const items: ListItem[] = useMemo(() => {
    const result: ListItem[] = [{ type: 'header' }];
    if (showBasmallah) result.push({ type: 'basmallah' });
    for (const ayah of ayahs) result.push({ type: 'ayah', ayah });
    return result;
  }, [ayahs, showBasmallah]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.surahHeader}>
          <View style={[styles.ornamentLine, { backgroundColor: theme.gold }]} />
          <RNText style={[styles.surahNameArabic, { color: theme.gold, fontFamily: QURAN_FONT_BOLD }]}>
            {surah.nameArabic}
          </RNText>
          <Text variant="h2" style={{ textAlign: 'center', marginTop: Spacing.xs }}>
            {surah.nameTranslit}
          </Text>
          <Text variant="body" secondary style={{ textAlign: 'center', marginTop: 2 }}>
            {surah.nameEnglish}
          </Text>
          <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: 4 }}>
            {surah.ayahCount} ayahs · {surah.type === 'meccan' ? 'Meccan' : 'Medinan'} · Juz {surah.juzStart}
          </Text>
          <View style={[styles.ornamentLine, { backgroundColor: theme.gold, marginTop: Spacing.lg }]} />
        </View>
      );
    }
    if (item.type === 'basmallah') {
      return (
        <RNText style={[styles.basmallah, { color: theme.gold, fontFamily: QURAN_FONT }]}>
          {BASMALLAH}
        </RNText>
      );
    }

    const { ayah } = item;
    const translation = translations.get(ayah.verseKey);
    const spanStyle = { fontFamily: QURAN_FONT, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT };

    let arabicNode: React.ReactNode;
    if (mode === 'tajweed' && isTajweedAvailable()) {
      const segs = getTajweedSegments(ayah.verseKey as VerseKey);
      if (segs && segs.length > 0) {
        arabicNode = (
          <RNText
            style={{ fontFamily: QURAN_FONT, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT,
              textAlign: 'right', writingDirection: 'rtl', color: theme.textPrimary }}
            allowFontScaling={false}
          >
            {segs.map((seg, i) => (
              <RNText key={i} style={[spanStyle, { color: getTajweedColor(seg.rule, theme.textPrimary) }]}>
                {seg.text}
              </RNText>
            ))}
            <RNText style={[spanStyle, { color: theme.gold }]}>{`  ﴿${toArabicNum(ayah.ayahNum)}﴾`}</RNText>
          </RNText>
        );
      }
    }
    if (!arabicNode) {
      arabicNode = (
        <RNText
          style={{ fontFamily: QURAN_FONT, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT,
            textAlign: 'right', writingDirection: 'rtl', color: theme.textPrimary }}
          allowFontScaling={false}
        >
          {ayah.textUthmani}
          <RNText style={[spanStyle, { color: theme.gold }]}>{`  ﴿${toArabicNum(ayah.ayahNum)}﴾`}</RNText>
        </RNText>
      );
    }

    return (
      <View style={[styles.ayahBlock, { borderBottomColor: theme.border }]}>
        <View style={styles.ayahNumRow}>
          <View style={[styles.ayahNumBadge, { borderColor: theme.border }]}>
            <Text variant="caption" color={theme.gold} style={{ fontSize: 11 }}>{ayah.ayahNum}</Text>
          </View>
        </View>
        {arabicNode}
        {translationLoading ? (
          <ActivityIndicator size="small" color={theme.textDisabled} style={{ marginTop: Spacing.sm }} />
        ) : translation ? (
          <Text variant="body" secondary style={styles.translation}>{translation}</Text>
        ) : null}
      </View>
    );
  }, [mode, translations, translationLoading, theme, surah]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item, i) => {
        if (item.type === 'header') return 'header';
        if (item.type === 'basmallah') return 'basmallah';
        return item.ayah.verseKey;
      }}
      contentContainerStyle={styles.translationContent}
      showsVerticalScrollIndicator={false}
      renderItem={renderItem}
      initialNumToRender={12}
      maxToRenderPerBatch={15}
      windowSize={8}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  // Page view
  pageContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  pageFooter: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  footerLine: {
    width: 32,
    height: 1,
  },
  // Translation mode
  translationContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 80,
  },
  ayahBlock: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ayahNumRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: Spacing.sm,
  },
  ayahNumBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translation: {
    marginTop: Spacing.md,
    lineHeight: 22,
    fontSize: 14,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Shared
  surahHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  ornamentLine: {
    width: 60,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  surahNameArabic: {
    fontSize: 38,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  basmallah: {
    fontSize: 26,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 52,
    marginBottom: Spacing.xl,
  },
});
