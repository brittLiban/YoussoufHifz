// ─────────────────────────────────────────────────────────────────────────────
// Core Quran types
// ─────────────────────────────────────────────────────────────────────────────

/** e.g. "2:255" */
export type VerseKey = `${number}:${number}`;

export interface SurahInfo {
  id: number;                 // 1–114
  nameArabic: string;         // الفاتحة
  nameTranslit: string;       // Al-Fatihah
  nameEnglish: string;        // The Opening
  type: 'meccan' | 'medinan';
  ayahCount: number;
  pageStart: number;          // Madinah Mushaf first page
  juzStart: number;           // which juz it starts in
}

export interface AyahInfo {
  verseKey: VerseKey;
  surahId: number;
  ayahNum: number;
  textUthmani: string;        // Tanzil Uthmani script
  page: number;               // Madinah Mushaf page (1–604)
  juz: number;                // 1–30
  hizb: number;               // 1–60
  rub: number;                // 1–240
}

export interface JuzInfo {
  juzNum: number;             // 1–30
  pageStart: number;
  verseKeyStart: VerseKey;
  nameArabic: string;         // e.g. "الم"
}

export interface PageInfo {
  pageNum: number;            // 1–604
  juz: number;
  surahId: number;
  firstVerseKey: VerseKey;
  lastVerseKey: VerseKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tajweed types
// ─────────────────────────────────────────────────────────────────────────────

/** All tajweed rule categories */
export type TajweedRule =
  | 'hamza_wasl'    // hamza that is silent after a vowel
  | 'silent'        // silent letter
  | 'lam_shamsiyya' // sun letter assimilation
  | 'madda_normal'  // 2-beat madd
  | 'madda_permissible'   // 2 or 4 beat madd
  | 'madda_necessary'     // 4-5 beat madd (obligatory)
  | 'madda_obligatory'    // 4-5 beat when followed by sukun
  | 'qalqala'       // echo/bounce letters ق ط ب ج د
  | 'idghaam'       // full assimilation
  | 'idghaam_ghunna'      // assimilation with nasalisation
  | 'ikhfa'         // partial concealment
  | 'ikhfa_shafawi' // ikhfa with meem
  | 'iqlab'         // converting nun/tanwin to meem
  | 'ghunna'        // nasalisation (shaddah on n or m)
  | 'idghaam_shafawi'     // meem assimilation
  | 'waqf_compulsory'     // must stop
  | 'waqf_preferred'      // preferred stop
  | 'waqf_regular'        // regular waqf
  | 'none';

// Colors tuned for dark backgrounds (our default dark theme)
export const TAJWEED_COLORS: Record<TajweedRule, string> = {
  hamza_wasl:         '#9CA3AF',   // soft grey
  silent:             '#9CA3AF',
  lam_shamsiyya:      '#9CA3AF',
  madda_normal:       '#6B9FFF',   // bright blue
  madda_permissible:  '#7AADFF',
  madda_necessary:    '#5B8FFF',
  madda_obligatory:   '#5B8FFF',
  qalqala:            '#FF8B5E',   // bright orange
  idghaam:            '#4ADE4A',   // bright green
  idghaam_ghunna:     '#4ADE4A',
  ikhfa:              '#D966FF',   // bright purple
  ikhfa_shafawi:      '#D966FF',
  iqlab:              '#22D3EE',   // cyan
  ghunna:             '#A3E635',   // lime
  idghaam_shafawi:    '#A3E635',
  waqf_compulsory:    '#9CA3AF',
  waqf_preferred:     '#9CA3AF',
  waqf_regular:       '#9CA3AF',
  none:               'inherit',
};

/** One tagged segment of an ayah */
export interface TajweedSegment {
  text: string;
  rule: TajweedRule;
}

/** Per-verse tajweed breakdown */
export interface TajweedVerse {
  verseKey: VerseKey;
  segments: TajweedSegment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Translation types
// ─────────────────────────────────────────────────────────────────────────────

export interface TranslationMeta {
  id: string;              // e.g. "en-sahih"
  language: string;        // "en"
  name: string;            // "Sahih International"
  author: string;
  bundled: boolean;        // true = ships with app, false = downloadable
}

export interface TranslationVerse {
  verseKey: VerseKey;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup / navigation types
// ─────────────────────────────────────────────────────────────────────────────

/** For memorization portion and Subcis range definition */
export interface VerseRange {
  from: VerseKey;
  to: VerseKey;
}

export interface PageRange {
  fromPage: number;
  toPage: number;
}

export type PortionRef =
  | { type: 'surah'; surahId: number }
  | { type: 'surah_range'; fromSurah: number; toSurah: number }
  | { type: 'juz'; juzNum: number }
  | { type: 'page'; pageNum: number }
  | { type: 'page_range'; fromPage: number; toPage: number }
  | { type: 'verse_range'; from: VerseKey; to: VerseKey };
