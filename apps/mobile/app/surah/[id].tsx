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
import {
  useSettingsStore,
  QURAN_FONT_MIN,
  QURAN_FONT_MAX,
  QURAN_FONT_STEP,
} from '../../src/stores/settingsStore';
import type { AyahInfo, SurahInfo, VerseKey } from '../../src/types/quran';

const BASMALLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const QURAN_FONT = 'ScheherazadeNew_400Regular';
const QURAN_FONT_BOLD = 'ScheherazadeNew_700Bold';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALL_PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

function toArabicNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

// LINE_HEIGHT scales with font size (ratio ~2.14)
function lineHeight(fontSize: number) {
  return Math.round(fontSize * 2.15);
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
  const [focusMode, setFocusMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(surah?.pageStart ?? 1);
  const tajweedAvailable = isTajweedAvailable();

  // Font size from persistent settings
  const fontSize = useSettingsStore((s) => s.quranFontSize);
  const setFontSize = useSettingsStore((s) => s.setQuranFontSize);

  const pagerRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.item) setCurrentPage(viewableItems[0].item as number);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

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
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="body" color={theme.textSecondary}>‹ Back</Text>
          </TouchableOpacity>

          {/* Centre — surah name or page number */}
          {!showTranslation && !focusMode && currentSurahOnPage && (
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm }}>
              <Text variant="caption" secondary numberOfLines={1}>
                {currentSurahOnPage.nameTranslit}
              </Text>
            </View>
          )}
          {(showTranslation || focusMode) && <View style={{ flex: 1 }} />}

          {/* Controls */}
          <View style={styles.controls}>
            {/* Font size — / + */}
            <TouchableOpacity
              onPress={() => setFontSize(Math.max(QURAN_FONT_MIN, fontSize - QURAN_FONT_STEP))}
              style={[styles.sizeBtn, { borderColor: theme.border, backgroundColor: theme.bgSubtle }]}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text variant="caption" color={theme.textSecondary} style={{ fontSize: 16, lineHeight: 18 }}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFontSize(Math.min(QURAN_FONT_MAX, fontSize + QURAN_FONT_STEP))}
              style={[styles.sizeBtn, { borderColor: theme.border, backgroundColor: theme.bgSubtle }]}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text variant="caption" color={theme.textSecondary} style={{ fontSize: 16, lineHeight: 18 }}>+</Text>
            </TouchableOpacity>

            {/* Focus mode */}
            <TouchableOpacity
              onPress={() => { setFocusMode(v => !v); setShowTranslation(false); }}
              style={[styles.toggleBtn, {
                borderColor: focusMode ? theme.gold : theme.border,
                backgroundColor: focusMode ? theme.gold + '22' : theme.bgSubtle,
              }]}
              activeOpacity={0.7}
            >
              <Text variant="caption" color={focusMode ? theme.gold : theme.textSecondary}>آ</Text>
            </TouchableOpacity>

            {/* EN translation — disabled in focus mode (it's always on there) */}
            {!focusMode && (
              <TouchableOpacity
                onPress={() => setShowTranslation(v => !v)}
                style={[styles.toggleBtn, {
                  borderColor: showTranslation ? theme.accentGreenLight : theme.border,
                  backgroundColor: showTranslation ? theme.accentGreen : theme.bgSubtle,
                }]}
                activeOpacity={0.7}
              >
                <Text variant="caption" color={showTranslation ? '#F5F0E8' : theme.textSecondary}>EN</Text>
              </TouchableOpacity>
            )}

            {/* Tajweed */}
            {!focusMode && (
              <TouchableOpacity
                onPress={() => { if (!tajweedAvailable && mode === 'plain') return; setMode(m => m === 'plain' ? 'tajweed' : 'plain'); }}
                style={[styles.toggleBtn, {
                  borderColor: mode === 'tajweed' ? '#9400A8' : tajweedAvailable ? theme.border : theme.bgSubtle,
                  backgroundColor: mode === 'tajweed' ? '#2A0030' : theme.bgSubtle,
                  opacity: tajweedAvailable ? 1 : 0.4,
                }]}
                activeOpacity={tajweedAvailable ? 0.7 : 1}
              >
                <Text variant="caption" color={mode === 'tajweed' ? '#CC44FF' : theme.textSecondary}>تجويد</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* FOCUS MODE: one ayah at a time with translation */}
      {focusMode ? (
        <FocusView surah={surah} mode={mode} theme={theme} fontSize={fontSize} />
      ) : showTranslation ? (
        /* TRANSLATION MODE: scrollable verse-by-verse */
        <TranslationView surah={surah} mode={mode} theme={theme} fontSize={fontSize} />
      ) : (
        /* MUSHAF MODE: horizontal 604-page pager */
        <FlatList
          ref={pagerRef}
          data={ALL_PAGES}
          keyExtractor={String}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          initialScrollIndex={surah.pageStart - 1}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          renderItem={({ item: pageNum }) => (
            <PageView pageNum={pageNum} mode={mode} tajweedAvailable={tajweedAvailable} theme={theme} fontSize={fontSize} />
          )}
          windowSize={3}
          maxToRenderPerBatch={3}
          initialNumToRender={1}
        />
      )}
    </View>
  );
}

// ─── Focus mode: one ayah at a time ──────────────────────────────────────────

function FocusView({
  surah, mode, theme, fontSize,
}: {
  surah: SurahInfo; mode: ReadingMode; theme: ReturnType<typeof useTheme>; fontSize: number;
}) {
  const ayahs = useMemo(() => QuranService.getSurahAyahs(surah.id), [surah.id]);
  const [index, setIndex] = useState(0);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const tajweedAvailable = isTajweedAvailable();

  useEffect(() => {
    TranslationService.getSurahTranslations('en-sahih', surah.id, surah.ayahCount)
      .then(setTranslations);
  }, [surah.id, surah.ayahCount]);

  const ayah = ayahs[index];
  if (!ayah) return null;

  const lh = lineHeight(fontSize);
  const translation = translations.get(ayah.verseKey);
  const spanStyle = { fontFamily: QURAN_FONT, fontSize, lineHeight: lh };

  let arabicNode: React.ReactNode;
  if (mode === 'tajweed' && tajweedAvailable) {
    const segs = getTajweedSegments(ayah.verseKey as VerseKey);
    if (segs && segs.length > 0) {
      arabicNode = (
        <RNText style={[styles.focusArabic, { fontSize, lineHeight: lh, color: theme.textPrimary }]} allowFontScaling={false}>
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
      <RNText style={[styles.focusArabic, { fontSize, lineHeight: lh, color: theme.textPrimary }]} allowFontScaling={false}>
        {ayah.textUthmani}
        <RNText style={[spanStyle, { color: theme.gold }]}>{`  ﴿${toArabicNum(ayah.ayahNum)}﴾`}</RNText>
      </RNText>
    );
  }

  return (
    <View style={styles.focusRoot}>
      {/* Surah + ayah counter */}
      <View style={styles.focusCounter}>
        <Text variant="caption" secondary>{surah.nameTranslit}</Text>
        <Text variant="caption" color={theme.gold} style={{ fontFamily: 'ScheherazadeNew_400Regular', fontSize: 14 }}>
          {'  '}﴿{toArabicNum(ayah.ayahNum)}﴾
        </Text>
        <Text variant="caption" secondary style={{ marginLeft: 'auto' }}>
          {index + 1} / {ayahs.length}
        </Text>
      </View>

      {/* Arabic — centred, large */}
      <ScrollView
        contentContainerStyle={styles.focusScroll}
        showsVerticalScrollIndicator={false}
      >
        {arabicNode}

        {/* Translation */}
        {translation ? (
          <View style={[styles.focusDivider, { borderTopColor: theme.border }]}>
            <Text variant="body" secondary style={styles.focusTranslation}>{translation}</Text>
          </View>
        ) : (
          <ActivityIndicator size="small" color={theme.textDisabled} style={{ marginTop: Spacing.lg }} />
        )}
      </ScrollView>

      {/* Prev / Next navigation */}
      <View style={[styles.focusNav, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          style={[styles.navBtn, { borderColor: theme.border, opacity: index === 0 ? 0.3 : 1 }]}
          activeOpacity={0.7}
        >
          <Text variant="body" color={theme.textSecondary}>‹ Prev</Text>
        </TouchableOpacity>

        <Text variant="caption" secondary>{index + 1} / {ayahs.length}</Text>

        <TouchableOpacity
          onPress={() => setIndex(i => Math.min(ayahs.length - 1, i + 1))}
          disabled={index === ayahs.length - 1}
          style={[styles.navBtn, { borderColor: theme.border, opacity: index === ayahs.length - 1 ? 0.3 : 1 }]}
          activeOpacity={0.7}
        >
          <Text variant="body" color={theme.textSecondary}>Next ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Single mushaf page ───────────────────────────────────────────────────────

const PageView = React.memo(function PageView({
  pageNum, mode, tajweedAvailable, theme, fontSize,
}: {
  pageNum: number; mode: ReadingMode; tajweedAvailable: boolean;
  theme: ReturnType<typeof useTheme>; fontSize: number;
}) {
  const ayahs = useMemo(() => QuranService.getPageAyahs(pageNum), [pageNum]);
  const textColor = theme.textPrimary;
  const goldColor = theme.gold;
  const lh = lineHeight(fontSize);

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

  const spanStyle = useMemo(() => ({ fontFamily: QURAN_FONT, fontSize, lineHeight: lh }), [fontSize, lh]);

  const buildInline = useCallback((groupAyahs: AyahInfo[]) => {
    const nodes: React.ReactNode[] = [];
    for (const ayah of groupAyahs) {
      const marker = `  ﴿${toArabicNum(ayah.ayahNum)}﴾  `;
      if (mode === 'tajweed' && tajweedAvailable) {
        const segs = getTajweedSegments(ayah.verseKey as VerseKey);
        if (segs && segs.length > 0) {
          segs.forEach((seg, i) => {
            nodes.push(
              <RNText key={`${ayah.verseKey}-${i}`} style={[spanStyle, { color: getTajweedColor(seg.rule, textColor) }]}>
                {seg.text}
              </RNText>
            );
          });
          nodes.push(<RNText key={`${ayah.verseKey}-m`} style={[spanStyle, { color: goldColor }]}>{marker}</RNText>);
          continue;
        }
      }
      nodes.push(<RNText key={ayah.verseKey} style={[spanStyle, { color: textColor }]}>{ayah.textUthmani}</RNText>);
      nodes.push(<RNText key={`${ayah.verseKey}-m`} style={[spanStyle, { color: goldColor }]}>{marker}</RNText>);
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
            {isFirstAyah && (
              <View style={styles.surahHeader}>
                <View style={[styles.ornamentLine, { backgroundColor: theme.gold }]} />
                <RNText style={[styles.surahNameArabic, { color: theme.gold, fontFamily: QURAN_FONT_BOLD }]}>
                  {surah.nameArabic}
                </RNText>
                <Text variant="h2" style={{ textAlign: 'center', marginTop: Spacing.xs }}>{surah.nameTranslit}</Text>
                <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: 4 }}>
                  {surah.ayahCount} ayahs · {surah.type === 'meccan' ? 'Meccan' : 'Medinan'} · Juz {surah.juzStart}
                </Text>
                <View style={[styles.ornamentLine, { backgroundColor: theme.gold, marginTop: Spacing.md }]} />
              </View>
            )}
            {showBasmallah && (
              <RNText style={[styles.basmallah, { color: theme.gold, fontFamily: QURAN_FONT }]}>{BASMALLAH}</RNText>
            )}
            <RNText style={{ fontFamily: QURAN_FONT, fontSize, lineHeight: lh, textAlign: 'justify', writingDirection: 'rtl', color: textColor }} allowFontScaling={false}>
              {buildInline(groupAyahs)}
            </RNText>
          </View>
        );
      })}
      <View style={styles.pageFooter}>
        <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
        <Text variant="caption" secondary style={{ marginTop: Spacing.sm, textAlign: 'center' }}>{pageNum}</Text>
      </View>
    </ScrollView>
  );
});

// ─── Translation mode ─────────────────────────────────────────────────────────

type ListItem = { type: 'header' } | { type: 'basmallah' } | { type: 'ayah'; ayah: AyahInfo };

function TranslationView({
  surah, mode, theme, fontSize,
}: {
  surah: SurahInfo; mode: ReadingMode; theme: ReturnType<typeof useTheme>; fontSize: number;
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

  const lh = lineHeight(fontSize);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.surahHeader}>
          <View style={[styles.ornamentLine, { backgroundColor: theme.gold }]} />
          <RNText style={[styles.surahNameArabic, { color: theme.gold, fontFamily: QURAN_FONT_BOLD }]}>{surah.nameArabic}</RNText>
          <Text variant="h2" style={{ textAlign: 'center', marginTop: Spacing.xs }}>{surah.nameTranslit}</Text>
          <Text variant="body" secondary style={{ textAlign: 'center', marginTop: 2 }}>{surah.nameEnglish}</Text>
          <Text variant="caption" secondary style={{ textAlign: 'center', marginTop: 4 }}>
            {surah.ayahCount} ayahs · {surah.type === 'meccan' ? 'Meccan' : 'Medinan'} · Juz {surah.juzStart}
          </Text>
          <View style={[styles.ornamentLine, { backgroundColor: theme.gold, marginTop: Spacing.lg }]} />
        </View>
      );
    }
    if (item.type === 'basmallah') {
      return <RNText style={[styles.basmallah, { color: theme.gold, fontFamily: QURAN_FONT }]}>{BASMALLAH}</RNText>;
    }

    const { ayah } = item;
    const translation = translations.get(ayah.verseKey);
    const spanStyle = { fontFamily: QURAN_FONT, fontSize, lineHeight: lh };

    let arabicNode: React.ReactNode;
    if (mode === 'tajweed' && isTajweedAvailable()) {
      const segs = getTajweedSegments(ayah.verseKey as VerseKey);
      if (segs && segs.length > 0) {
        arabicNode = (
          <RNText style={{ fontFamily: QURAN_FONT, fontSize, lineHeight: lh, textAlign: 'right', writingDirection: 'rtl', color: theme.textPrimary }} allowFontScaling={false}>
            {segs.map((seg, i) => (
              <RNText key={i} style={[spanStyle, { color: getTajweedColor(seg.rule, theme.textPrimary) }]}>{seg.text}</RNText>
            ))}
            <RNText style={[spanStyle, { color: theme.gold }]}>{`  ﴿${toArabicNum(ayah.ayahNum)}﴾`}</RNText>
          </RNText>
        );
      }
    }
    if (!arabicNode) {
      arabicNode = (
        <RNText style={{ fontFamily: QURAN_FONT, fontSize, lineHeight: lh, textAlign: 'right', writingDirection: 'rtl', color: theme.textPrimary }} allowFontScaling={false}>
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
  }, [mode, translations, translationLoading, theme, surah, fontSize, lh]);

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
  controls: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  sizeBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 36,
    alignItems: 'center',
  },
  // Page view
  pageContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xl, justifyContent: 'space-between' },
  pageFooter: { alignItems: 'center', paddingTop: Spacing.xl },
  footerLine: { width: 32, height: 1 },
  // Focus mode
  focusRoot: { flex: 1 },
  focusCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  focusScroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    justifyContent: 'center',
  },
  focusArabic: {
    fontFamily: 'ScheherazadeNew_400Regular',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  focusDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  focusTranslation: {
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 16,
  },
  focusNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
  },
  navBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  // Translation mode
  translationContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 80 },
  ayahBlock: { paddingVertical: Spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  ayahNumRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: Spacing.sm },
  ayahNumBadge: { width: 28, height: 28, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  translation: { marginTop: Spacing.md, lineHeight: 22, fontSize: 14, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  // Shared
  surahHeader: { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.md },
  ornamentLine: { width: 60, height: 2, borderRadius: 1, opacity: 0.6 },
  surahNameArabic: { fontSize: 38, marginTop: Spacing.lg, textAlign: 'center' },
  basmallah: { fontSize: 26, textAlign: 'center', writingDirection: 'rtl', lineHeight: 52, marginBottom: Spacing.xl },
});
