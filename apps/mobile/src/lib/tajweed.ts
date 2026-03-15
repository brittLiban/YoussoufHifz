/**
 * Tajweed rendering layer.
 *
 * Tajweed data is stored locally in assets/data/quran-tajweed.json.
 * Use the fetch script at scripts/fetch-tajweed.js to download it once.
 *
 * Format stored per verse:
 *   { "1:1": [{ text: "بِسْمِ", rule: "none" }, ...], ... }
 *
 * Rule → color mapping from TAJWEED_COLORS in src/types/quran.ts.
 */

import type { TajweedSegment, TajweedRule, VerseKey } from '../types/quran';
import { TAJWEED_COLORS } from '../types/quran';

// Lazy-loaded tajweed data (may not exist until fetch script is run)
let _tajweedData: Record<string, TajweedSegment[]> | null = null;
let _loadAttempted = false;

function loadTajweedData(): Record<string, TajweedSegment[]> | null {
  if (_loadAttempted) return _tajweedData;
  _loadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _tajweedData = require('../../assets/data/quran-tajweed.json') as Record<string, TajweedSegment[]>;
  } catch {
    // File doesn't exist yet — run scripts/fetch-tajweed.js to generate it
    _tajweedData = null;
  }
  return _tajweedData;
}

/** Returns tajweed segments for a verse, or null if data not available. */
export function getTajweedSegments(verseKey: VerseKey): TajweedSegment[] | null {
  const data = loadTajweedData();
  if (!data) return null;
  return data[verseKey] ?? null;
}

/** Returns the color for a tajweed rule. */
export function getTajweedColor(rule: TajweedRule, defaultColor: string): string {
  if (rule === 'none') return defaultColor;
  return TAJWEED_COLORS[rule] ?? defaultColor;
}

/** Checks whether tajweed data is available locally. */
export function isTajweedAvailable(): boolean {
  return loadTajweedData() !== null;
}

/**
 * Parse Quran Foundation tajweed-tagged text into segments.
 * The QF format uses XML-like tags: <tajweed class="rule">text</tajweed>
 * and also plain text for untagged segments.
 */
export function parseQFTajweedText(taggedText: string): TajweedSegment[] {
  const segments: TajweedSegment[] = [];
  // Match either a tag with content or plain text between tags
  // API uses unquoted class attrs: class=rule or class="rule". Also skip <span> markers.
  const re = /<tajweed class=["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/tajweed>|<span[^>]*>[\s\S]*?<\/span>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(taggedText)) !== null) {
    if (match[3] !== undefined) {
      // Plain text
      const t = match[3];
      if (t) segments.push({ text: t, rule: 'none' });
    } else {
      // Tagged segment — map QF class names to our TajweedRule
      const rule = mapQFClass(match[1]);
      if (match[2]) segments.push({ text: match[2], rule });
    }
  }

  return segments;
}

// Map QF API class names → our TajweedRule enum.
// Keys are the EXACT strings the API puts in class= attributes.
const QF_CLASS_MAP: Record<string, TajweedRule> = {
  ham_wasl:             'hamza_wasl',
  slnt:                 'silent',
  laam_shamsiyah:       'lam_shamsiyya',
  madda_normal:         'madda_normal',
  madda_permissible:    'madda_permissible',
  madda_necessary:      'madda_necessary',
  madda_obligatory:     'madda_obligatory',
  qalaqah:              'qalqala',
  idgham_wo_ghunnah:    'idghaam',
  idgham_ghunnah:       'idghaam_ghunna',
  ikhafa:               'ikhfa',
  ikhafa_shafawi:       'ikhfa_shafawi',
  iqlab:                'iqlab',
  ghunnah:              'ghunna',
  idgham_shafawi:       'idghaam_shafawi',
};

function mapQFClass(cls: string): TajweedRule {
  return QF_CLASS_MAP[cls] ?? 'none';
}

export { TAJWEED_COLORS };
export type { TajweedSegment, TajweedRule };
