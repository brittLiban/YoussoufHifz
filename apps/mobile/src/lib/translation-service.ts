/**
 * Translation Service
 *
 * Bundled translations ship with the app.
 * Downloadable packs are fetched from Quran Foundation API and cached
 * via AsyncStorage so they work fully offline after first download.
 *
 * Usage:
 *   await TranslationService.init();
 *   const text = await TranslationService.getVerse('en-sahih', '2:255');
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TranslationMeta, VerseKey } from '../types/quran';

// ─── Bundled translations ──────────────────────────────────────────────────

// Sahih International (English) is bundled via quran_en.json
import fullQuranEN from '../../assets/data/quran-meta.json'; // used only for shape

// We extract translations from quran_en.json dynamically
function loadBundledEN(): Map<string, string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('quran-json/dist/quran_en.json') as Array<{
      id: number;
      verses: { id: number; translation: string }[];
    }>;
    const map = new Map<string, string>();
    for (const surah of data) {
      for (const verse of surah.verses) {
        map.set(`${surah.id}:${verse.id}`, verse.translation ?? '');
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

// ─── Available translations registry ──────────────────────────────────────

export const AVAILABLE_TRANSLATIONS: TranslationMeta[] = [
  {
    id: 'en-sahih',
    language: 'en',
    name: 'Sahih International',
    author: 'Saheeh International',
    bundled: true,
  },
  {
    id: 'en-pickthall',
    language: 'en',
    name: 'Pickthall',
    author: 'Mohammad Marmaduke Pickthall',
    bundled: false,
  },
  {
    id: 'ur-jawadi',
    language: 'ur',
    name: 'Jawadi',
    author: 'Ayatullah Jawadi Amuli',
    bundled: false,
  },
  {
    id: 'tr-diyanet',
    language: 'tr',
    name: 'Diyanet İşleri',
    author: 'Diyanet İşleri',
    bundled: false,
  },
];

// Quran Foundation API translation IDs (for fetching downloadable packs)
// See: https://api.quran.com/api/v4/resources/translations
const QF_TRANSLATION_IDS: Record<string, number> = {
  'en-sahih': 131,
  'en-pickthall': 85,
  'ur-jawadi': 97,
  'tr-diyanet': 77,
};

// ─── Storage keys ──────────────────────────────────────────────────────────

function storageKey(translationId: string): string {
  return `@translation/${translationId}`;
}

// ─── In-memory cache ───────────────────────────────────────────────────────

const _cache = new Map<string, Map<string, string>>();

// ─── Service ───────────────────────────────────────────────────────────────

export const TranslationService = {
  /** Load the bundled English translation into memory. Call once at startup. */
  async init(): Promise<void> {
    if (!_cache.has('en-sahih')) {
      _cache.set('en-sahih', loadBundledEN());
    }
  },

  /**
   * Get a single verse translation.
   * Returns empty string if translation is not installed.
   */
  async getVerse(translationId: string, verseKey: VerseKey): Promise<string> {
    await this._ensureLoaded(translationId);
    return _cache.get(translationId)?.get(verseKey) ?? '';
  },

  /**
   * Get all verses for a surah in a given translation.
   */
  async getSurahTranslations(
    translationId: string,
    surahId: number,
    ayahCount: number
  ): Promise<Map<string, string>> {
    await this._ensureLoaded(translationId);
    const result = new Map<string, string>();
    const cache = _cache.get(translationId);
    if (!cache) return result;
    for (let i = 1; i <= ayahCount; i++) {
      const key = `${surahId}:${i}`;
      const val = cache.get(key);
      if (val) result.set(key, val);
    }
    return result;
  },

  /** Whether a translation is installed (bundled or downloaded). */
  async isInstalled(translationId: string): Promise<boolean> {
    const meta = AVAILABLE_TRANSLATIONS.find(t => t.id === translationId);
    if (meta?.bundled) return true;
    const stored = await AsyncStorage.getItem(storageKey(translationId));
    return stored !== null;
  },

  /** List all installed translation IDs. */
  async getInstalledIds(): Promise<string[]> {
    const results: string[] = [];
    for (const t of AVAILABLE_TRANSLATIONS) {
      if (await this.isInstalled(t.id)) results.push(t.id);
    }
    return results;
  },

  /**
   * Download and cache a translation pack.
   * Fetches from Quran Foundation API (requires internet once).
   * After download, works fully offline.
   */
  async downloadTranslation(
    translationId: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const qfId = QF_TRANSLATION_IDS[translationId];
    if (!qfId) throw new Error(`Unknown translation: ${translationId}`);

    const verseMap = new Map<string, string>();
    let page = 1;
    const perPage = 50;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const url = `https://api.quran.com/api/v4/quran/translations/${qfId}?page=${page}&per_page=${perPage}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const data = await res.json();

      for (const t of data.translations ?? []) {
        if (t.verse_key && t.text) {
          verseMap.set(t.verse_key, t.text.replace(/<[^>]+>/g, '')); // strip HTML
        }
      }

      const totalPages = data.meta?.total_pages ?? 1;
      onProgress?.(Math.round((page / totalPages) * 100));

      if (page >= totalPages) break;
      page++;
    }

    // Persist to AsyncStorage as JSON
    const obj = Object.fromEntries(verseMap);
    await AsyncStorage.setItem(storageKey(translationId), JSON.stringify(obj));
    _cache.set(translationId, verseMap);
  },

  /** Remove a downloaded translation pack. */
  async removeTranslation(translationId: string): Promise<void> {
    const meta = AVAILABLE_TRANSLATIONS.find(t => t.id === translationId);
    if (meta?.bundled) throw new Error('Cannot remove a bundled translation');
    await AsyncStorage.removeItem(storageKey(translationId));
    _cache.delete(translationId);
  },

  // ── Private ──────────────────────────────────────────────────────

  async _ensureLoaded(translationId: string): Promise<void> {
    if (_cache.has(translationId)) return;

    const meta = AVAILABLE_TRANSLATIONS.find(t => t.id === translationId);
    if (meta?.bundled) {
      await this.init();
      return;
    }

    // Try loading from AsyncStorage
    const stored = await AsyncStorage.getItem(storageKey(translationId));
    if (stored) {
      try {
        const obj = JSON.parse(stored) as Record<string, string>;
        _cache.set(translationId, new Map(Object.entries(obj)));
      } catch {
        // corrupted — ignore
      }
    }
  },
};
