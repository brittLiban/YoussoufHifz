/**
 * One-time script: downloads Uthmani Tajweed text from Quran Foundation API
 * and saves it to apps/mobile/assets/data/quran-tajweed.json
 *
 * Run once from the repo root:
 *   node scripts/fetch-tajweed.js
 *
 * The output file is ~4MB and works fully offline in the app.
 * Commit it or add to .gitignore — your choice.
 *
 * QF API reference: https://api.quran.com/api/v4
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../apps/mobile/assets/data/quran-tajweed.json');

// Map QF API class names → our TajweedRule values.
// Keys are the EXACT strings the API puts in class= attributes.
const QF_CLASS_MAP = {
  ham_wasl:             'hamza_wasl',
  slnt:                 'silent',
  laam_shamsiyah:       'lam_shamsiyya',       // API: laam_shamsiyah
  madda_normal:         'madda_normal',
  madda_permissible:    'madda_permissible',
  madda_necessary:      'madda_necessary',
  madda_obligatory:     'madda_obligatory',
  qalaqah:              'qalqala',              // API: qalaqah  (not qalqala)
  idgham_wo_ghunnah:    'idghaam',              // API: idgham_wo_ghunnah
  idgham_ghunnah:       'idghaam_ghunna',       // API: idgham_ghunnah
  ikhafa:               'ikhfa',               // API: ikhafa   (not ikhfa)
  ikhafa_shafawi:       'ikhfa_shafawi',       // API: ikhafa_shafawi
  iqlab:                'iqlab',
  ghunnah:              'ghunna',              // API: ghunnah  (not ghunna)
  idgham_shafawi:       'idghaam_shafawi',
};

function mapClass(cls) {
  return QF_CLASS_MAP[cls] ?? 'none';
}

/**
 * Parse QF tajweed-tagged text into segments array.
 * QF format: "plain text <tajweed class="rule">tagged</tajweed> more text"
 */
function parseSegments(taggedText) {
  const segments = [];
  // API uses unquoted class attrs: class=rule or class="rule"
  // Also skip <span class=end> verse-number markers
  const re = /<tajweed class=["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/tajweed>|<span[^>]*>[\s\S]*?<\/span>|([^<]+)/g;
  let match;
  while ((match = re.exec(taggedText)) !== null) {
    if (match[3] !== undefined) {
      // Plain text — strip Unicode replacement chars (U+FFFD) from corrupted API bytes
      const t = match[3].replace(/\uFFFD/g, '');
      if (t.trim() || t.includes('\u200f') || t.includes('\u200e')) {
        segments.push({ text: t, rule: 'none' });
      }
    } else if (match[1] !== undefined) {
      // Tajweed-tagged segment — strip replacement chars too
      const t = match[2].replace(/\uFFFD/g, '');
      if (t) segments.push({ text: t, rule: mapClass(match[1]) });
    }
    // span tags are skipped (verse number markers)
  }
  return segments;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching Quran Foundation tajweed data...');
  console.log('This will make 114 API calls. ETA ~2 minutes.\n');

  const result = {};
  let totalVerses = 0;

  for (let surahId = 1; surahId <= 114; surahId++) {
    process.stdout.write(`\rSurah ${surahId}/114...`);

    let page = 1;
    while (true) {
      const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahId}` +
        `?fields=text_uthmani_tajweed&per_page=50&page=${page}`;

      let data;
      try {
        data = await fetchJson(url);
      } catch (e) {
        console.error(`\nError fetching surah ${surahId} page ${page}: ${e.message}`);
        process.exit(1);
      }

      for (const verse of (data.verses || [])) {
        const vk = verse.verse_key;
        const tagged = verse.text_uthmani_tajweed;
        if (vk && tagged) {
          result[vk] = parseSegments(tagged);
          totalVerses++;
        }
      }

      const meta = data.meta || {};
      if (!meta.next_page) break;
      page++;

      // Rate limit: 100ms between requests
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n\nFetched ${totalVerses} verses.`);
  console.log(`Writing to ${OUTPUT_PATH}...`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 0));

  const size = fs.statSync(OUTPUT_PATH).size;
  console.log(`Done. File size: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log('\nTajweed mode is now available offline in the app.');
}

main().catch(e => {
  console.error('\nFailed:', e.message);
  process.exit(1);
});
