import quranData from '../../assets/data/quran-meta.json';

export interface SurahMeta {
  id: number;
  nameArabic: string;
  nameTranslit: string;
  ayahCount: number;
  pageStart: number;
}

export const SURAHS: SurahMeta[] = quranData.surahs;
export const JUZ_PAGE_STARTS: number[] = quranData.juzPageStarts;

/** Which surah does this Madinah Mushaf page fall in? */
export function getSurahForPage(page: number): SurahMeta {
  let result = SURAHS[0];
  for (const s of SURAHS) {
    if (s.pageStart <= page) result = s;
    else break;
  }
  return result;
}

/** Which juz does this page fall in? */
export function getJuzForPage(page: number): number {
  let juz = 1;
  for (let i = 0; i < JUZ_PAGE_STARTS.length; i++) {
    if (JUZ_PAGE_STARTS[i] <= page) juz = i + 1;
    else break;
  }
  return juz;
}

/**
 * Given a memorization goal's unit and how much has been logged,
 * compute the current "next" page + which surah it falls in.
 */
export function getCurrentPosition(
  unit: string,
  totalLogged: number
): { page: number; surah: SurahMeta; juz: number } | null {
  if (totalLogged <= 0) return null;

  let page: number;

  if (unit === 'page') {
    page = Math.floor(totalLogged) + 1;
  } else if (unit === 'juz') {
    const nextJuz = Math.min(30, Math.floor(totalLogged) + 1);
    page = JUZ_PAGE_STARTS[nextJuz - 1];
  } else if (unit === 'surah') {
    // Journey is Nas (114) → Baqarah (2): current surah = 114 - totalLogged
    const currentSurahId = Math.max(1, 114 - Math.floor(totalLogged));
    const s = SURAHS.find((s) => s.id === currentSurahId);
    if (!s) return null;
    page = s.pageStart;
  } else {
    return null;
  }

  if (page > 604) return null;

  const surah = getSurahForPage(page);
  const juz = getJuzForPage(page);
  return { page, surah, juz };
}

/** Short human-readable label for current position, e.g. "Page 45 · Al-Baqarah" */
export function getPositionLabel(unit: string, totalLogged: number): string | null {
  const pos = getCurrentPosition(unit, totalLogged);
  if (!pos) return null;

  if (unit === 'page') {
    return `Page ${pos.page} · ${pos.surah.nameTranslit}`;
  }
  if (unit === 'juz') {
    return `Juz ${pos.juz} · ${pos.surah.nameTranslit}`;
  }
  if (unit === 'surah') {
    return `${pos.surah.nameArabic}  ${pos.surah.nameTranslit}`;
  }
  return null;
}

/** Generate a label for a surah-based revision portion */
export function surahRangeLabel(fromId: number, toId?: number): string {
  const from = SURAHS.find((s) => s.id === fromId);
  if (!from) return `Surah ${fromId}`;
  if (!toId || toId === fromId) {
    return `${from.nameTranslit} (${from.id})`;
  }
  const to = SURAHS.find((s) => s.id === toId);
  if (!to) return `${from.nameTranslit} onwards`;
  return `${from.nameTranslit} – ${to.nameTranslit} (${from.id}–${to.id})`;
}

/** Generate a label for a page-based revision portion */
export function pageRangeLabel(fromPage: number, toPage: number): string {
  const fromSurah = getSurahForPage(fromPage);
  const toSurah = getSurahForPage(toPage);
  const surahPart =
    fromSurah.id === toSurah.id
      ? fromSurah.nameTranslit
      : `${fromSurah.nameTranslit} – ${toSurah.nameTranslit}`;
  return `Pages ${fromPage}–${toPage} (${surahPart})`;
}
