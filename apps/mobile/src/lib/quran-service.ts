/**
 * QuranService — local lookup for Uthmani text, page/juz/surah/ayah references.
 * All data is bundled with the app. No network calls.
 */
import quranRaw from '../../assets/data/quran-meta.json';
import surahIndexRaw from 'quran-json/dist/chapters/en/index.json';
import fullQuranRaw from 'quran-json/dist/quran_en.json';

import type {
  SurahInfo,
  AyahInfo,
  JuzInfo,
  PageInfo,
  VerseKey,
  VerseRange,
  PageRange,
  PortionRef,
} from '../types/quran';

// ─── Raw data casts ───────────────────────────────────────────────────────────

interface RawSurahIndex {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: string;
  total_verses: number;
}

interface RawQuranSurah extends RawSurahIndex {
  verses: { id: number; text: string; translation: string }[];
}

const SURAH_INDEX = surahIndexRaw as RawSurahIndex[];
const FULL_QURAN = fullQuranRaw as RawQuranSurah[];

// ─── Juz data (page starts — Madinah Mushaf) ─────────────────────────────────

const JUZ_PAGE_STARTS: number[] = (quranRaw as any).juzPageStarts;

// First verse_key of each juz (Hafs/Uthmani standard)
const JUZ_FIRST_VERSE: VerseKey[] = [
  '1:1','2:142','2:253','3:92','4:24','4:148','5:82','6:111','7:87','8:41',
  '9:93','11:6','12:53','15:1','17:1','18:75','21:1','23:1','25:21','27:56',
  '29:46','33:31','36:28','39:32','41:47','46:1','51:31','58:1','67:1','78:1',
];

const JUZ_NAMES_ARABIC = [
  'الم','سَيَقُولُ','تِلْكَ الرُّسُلُ','لَنْ تَنَالُوا','وَالْمُحْصَنَاتُ',
  'لَا يُحِبُّ اللَّهُ','وَإِذَا سَمِعُوا','وَلَوْ أَنَّنَا','قَالَ الْمَلَأُ','وَاعْلَمُوا',
  'يَعْتَذِرُونَ','وَمَا مِنْ دَابَّةٍ','وَمَا أُبَرِّئُ','رُبَمَا','سُبْحَانَ الَّذِي',
  'قَالَ أَلَمْ','اقْتَرَبَ','قَدْ أَفْلَحَ','وَقَالَ الَّذِينَ','أَمَّنْ خَلَقَ',
  'اتْلُ مَا أُوحِيَ','وَمَنْ يَقْنُتْ','وَمَا لِيَ','فَمَنْ أَظْلَمُ','إِلَيْهِ يُرَدُّ',
  'حم','قَالَ فَمَا خَطْبُكُمْ','قَدْ سَمِعَ اللَّهُ','تَبَارَكَ الَّذِي','عَمَّ',
];

// ─── Build lookup tables ──────────────────────────────────────────────────────

// All ayahs flat array, in order
const _ayahs: AyahInfo[] = [];
// Maps verseKey → AyahInfo
const _ayahMap = new Map<VerseKey, AyahInfo>();
// Maps surahId → SurahInfo
const _surahMap = new Map<number, SurahInfo>();
// Maps page → first verse index in _ayahs
const _pageFirstAyah = new Map<number, number>();
// Maps juz → first verse index in _ayahs
const _juzFirstAyah = new Map<number, number>();

function _getJuzForPage(page: number): number {
  let juz = 1;
  for (let i = 0; i < JUZ_PAGE_STARTS.length; i++) {
    if (JUZ_PAGE_STARTS[i] <= page) juz = i + 1;
    else break;
  }
  return juz;
}

function _getHizbForPage(page: number): number {
  // 8 hizbs per juz, roughly 2.5 pages per hizb
  return Math.max(1, Math.min(240, Math.ceil(page / 2.5)));
}

function _buildIndex() {
  const metaSurahs: { id: number; pageStart: number }[] = (quranRaw as any).surahs;
  const pageMap = new Map(metaSurahs.map(s => [s.id, s.pageStart]));

  for (const rawSurah of FULL_QURAN) {
    const idxEntry = SURAH_INDEX.find(s => s.id === rawSurah.id)!;
    const pageStart = pageMap.get(rawSurah.id) ?? 1;
    const juzStart = _getJuzForPage(pageStart);

    const surahInfo: SurahInfo = {
      id: rawSurah.id,
      nameArabic: rawSurah.name,
      nameTranslit: rawSurah.transliteration,
      nameEnglish: idxEntry?.translation ?? '',
      type: (rawSurah.type as 'meccan' | 'medinan'),
      ayahCount: rawSurah.total_verses,
      pageStart,
      juzStart,
    };
    _surahMap.set(rawSurah.id, surahInfo);

    // Estimate page for each ayah within this surah
    // We don't have per-ayah page data in quran-json, so we use surah page starts
    // and pro-rate within the surah based on next surah's page start
    const nextSurahPageStart = pageMap.get(rawSurah.id + 1) ?? 605;
    const surahPages = nextSurahPageStart - pageStart;
    const ayahsPerPage = rawSurah.total_verses / Math.max(1, surahPages);

    for (const verse of rawSurah.verses) {
      const estimatedPage = Math.min(
        604,
        pageStart + Math.floor((verse.id - 1) / Math.max(1, ayahsPerPage))
      );
      const page = Math.max(pageStart, estimatedPage);
      const juz = _getJuzForPage(page);
      const hizb = _getHizbForPage(page);
      const verseKey = `${rawSurah.id}:${verse.id}` as VerseKey;

      const ayahInfo: AyahInfo = {
        verseKey,
        surahId: rawSurah.id,
        ayahNum: verse.id,
        textUthmani: verse.text,
        page,
        juz,
        hizb,
        rub: Math.ceil(hizb / 0.25),
      };

      _ayahs.push(ayahInfo);
      _ayahMap.set(verseKey, ayahInfo);
    }
  }

  // Build page→first-ayah and juz→first-ayah indices
  for (let i = 0; i < _ayahs.length; i++) {
    const a = _ayahs[i];
    if (!_pageFirstAyah.has(a.page)) _pageFirstAyah.set(a.page, i);
    if (!_juzFirstAyah.has(a.juz)) _juzFirstAyah.set(a.juz, i);
  }
}

_buildIndex();

// ─── Public API ───────────────────────────────────────────────────────────────

export const QuranService = {
  // ── Single lookups ──────────────────────────────────────────────

  getAyah(verseKey: VerseKey): AyahInfo | null {
    return _ayahMap.get(verseKey) ?? null;
  },

  getSurah(surahId: number): SurahInfo | null {
    return _surahMap.get(surahId) ?? null;
  },

  getAllSurahs(): SurahInfo[] {
    return Array.from(_surahMap.values()).sort((a, b) => a.id - b.id);
  },

  getJuz(juzNum: number): JuzInfo {
    return {
      juzNum,
      pageStart: JUZ_PAGE_STARTS[juzNum - 1] ?? 1,
      verseKeyStart: JUZ_FIRST_VERSE[juzNum - 1] ?? ('1:1' as VerseKey),
      nameArabic: JUZ_NAMES_ARABIC[juzNum - 1] ?? '',
    };
  },

  getAllJuz(): JuzInfo[] {
    return Array.from({ length: 30 }, (_, i) => this.getJuz(i + 1));
  },

  getPage(pageNum: number): PageInfo | null {
    const firstIdx = _pageFirstAyah.get(pageNum);
    if (firstIdx === undefined) return null;

    // Find last ayah on this page
    let lastIdx = firstIdx;
    while (lastIdx + 1 < _ayahs.length && _ayahs[lastIdx + 1].page === pageNum) {
      lastIdx++;
    }

    const first = _ayahs[firstIdx];
    const last = _ayahs[lastIdx];

    return {
      pageNum,
      juz: first.juz,
      surahId: first.surahId,
      firstVerseKey: first.verseKey,
      lastVerseKey: last.verseKey,
    };
  },

  // ── Batch lookups ───────────────────────────────────────────────

  getSurahAyahs(surahId: number): AyahInfo[] {
    return _ayahs.filter(a => a.surahId === surahId);
  },

  getPageAyahs(pageNum: number): AyahInfo[] {
    return _ayahs.filter(a => a.page === pageNum);
  },

  getJuzAyahs(juzNum: number): AyahInfo[] {
    return _ayahs.filter(a => a.juz === juzNum);
  },

  getPageRangeAyahs(fromPage: number, toPage: number): AyahInfo[] {
    return _ayahs.filter(a => a.page >= fromPage && a.page <= toPage);
  },

  getVerseRangeAyahs(from: VerseKey, to: VerseKey): AyahInfo[] {
    const fromIdx = _ayahs.findIndex(a => a.verseKey === from);
    const toIdx = _ayahs.findIndex(a => a.verseKey === to);
    if (fromIdx === -1 || toIdx === -1) return [];
    return _ayahs.slice(fromIdx, toIdx + 1);
  },

  /** Resolve any PortionRef to the list of ayahs it covers */
  resolvePortionRef(ref: PortionRef): AyahInfo[] {
    switch (ref.type) {
      case 'surah':
        return this.getSurahAyahs(ref.surahId);
      case 'surah_range': {
        const result: AyahInfo[] = [];
        // For Nas→Baqarah direction, the range may be reversed numerically
        const lo = Math.min(ref.fromSurah, ref.toSurah);
        const hi = Math.max(ref.fromSurah, ref.toSurah);
        for (let s = lo; s <= hi; s++) result.push(...this.getSurahAyahs(s));
        return result;
      }
      case 'juz':
        return this.getJuzAyahs(ref.juzNum);
      case 'page':
        return this.getPageAyahs(ref.pageNum);
      case 'page_range':
        return this.getPageRangeAyahs(ref.fromPage, ref.toPage);
      case 'verse_range':
        return this.getVerseRangeAyahs(ref.from, ref.to);
    }
  },

  // ── Navigation helpers ──────────────────────────────────────────

  /** Surah page boundaries as a quick lookup for the reader */
  getSurahPageRange(surahId: number): { firstPage: number; lastPage: number } | null {
    const ayahs = this.getSurahAyahs(surahId);
    if (!ayahs.length) return null;
    return {
      firstPage: ayahs[0].page,
      lastPage: ayahs[ayahs.length - 1].page,
    };
  },

  /** Which surah is the user currently memorizing given Nas→Baqarah tracking */
  getCurrentMemorizingSurah(unit: string, totalLogged: number): SurahInfo | null {
    if (totalLogged <= 0) return this.getSurah(114); // start at Nas
    if (unit === 'surah') {
      const id = Math.max(1, 114 - Math.floor(totalLogged));
      return this.getSurah(id);
    }
    if (unit === 'page') {
      const page = Math.max(1, 605 - Math.floor(totalLogged));
      // Find surah for this page
      const ayah = _ayahs.find(a => a.page === page) ?? _ayahs[0];
      return this.getSurah(ayah.surahId);
    }
    return null;
  },
};

export type { SurahInfo, AyahInfo, JuzInfo, PageInfo, VerseKey };
