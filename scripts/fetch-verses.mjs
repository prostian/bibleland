#!/usr/bin/env node
/**
 * Holt die Schlüsselverse aller Ereignisse und schreibt sie in die Vers-Stores.
 *
 * Es werden nur die in `events.json` als `keyVerseRef` hinterlegten Verse
 * gespeichert — rund dreihundert Stück, nicht die ganze Bibel. Das hält die
 * Dateien klein und begrenzt zugleich, was überhaupt an Text im Projekt landet.
 *
 * ── Zum Urheberrecht ──────────────────────────────────────────────────────
 * Die Voreinstellung `--de=elb` lädt die **Elberfelder 1905**: gemeinfrei,
 * unbedenklich weiterzugeben, landet in der committeten Datei
 * `verses.de.public.json`.
 *
 * `--de=s00` (Schlachter 2000) und `--de=hfa` sind urheberrechtlich
 * geschützt. Sie werden ausschließlich nach `verses.de.local.json`
 * geschrieben — diese Datei steht in der `.gitignore` und verlässt diesen
 * Rechner nicht. Eine Privatkopie ist zulässig, eine Weitergabe wäre es
 * nicht. Das Skript weigert sich, geschützten Text in die öffentliche Datei
 * zu schreiben.
 *
 * Aufruf:
 *   npm run fetch:verses                 Elberfelder 1905 + griechisches NT
 *   npm run fetch:verses -- --de=s00     zusätzlich Schlachter 2000 (nur lokal)
 *   npm run fetch:verses -- --skip-greek  ohne Originaltext
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');
const versesDir = join(dataDir, 'verses');
const cacheDir = join(root, '.cache');

/* ------------------------------------------------------------------ *
 * Quellen
 * ------------------------------------------------------------------ */

const GERMAN_SOURCES = {
  elb: {
    name: 'Elberfelder 1905 (unrevidiert)',
    short: 'ELB05',
    license: 'Gemeinfrei (Public Domain). Quelle: scrollmapper/bible_databases.',
    restricted: false,
    format: 'scrollmapper',
    url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/GerElb1905.json',
    cache: 'GerElb1905.json',
  },
  lut1912: {
    name: 'Lutherbibel 1912',
    short: 'LUT12',
    license: 'Gemeinfrei (Public Domain).',
    restricted: false,
    format: 'bolls',
    url: 'https://bolls.life/static/translations/LUT.json',
    cache: 'LUT.json',
  },
  sch1951: {
    name: 'Schlachter 1951',
    short: 'SCH51',
    license:
      '© 1951 Genfer Bibelgesellschaft. Nicht gemeinfrei — bei Weitergabe ist dieser Hinweis mitzuführen.',
    restricted: true,
    format: 'bolls',
    url: 'https://bolls.life/static/translations/SCH.json',
    cache: 'SCH.json',
  },
  s00: {
    name: 'Schlachter 2000',
    short: 'SLT',
    license:
      '© Genfer Bibelgesellschaft. Urheberrechtlich geschützt — nur zur privaten Nutzung auf diesem Rechner, keine Weitergabe.',
    restricted: true,
    format: 'bolls',
    url: 'https://bolls.life/static/translations/S00.json',
    cache: 'S00.json',
  },
  hfa: {
    name: 'Hoffnung für Alle',
    short: 'HFA',
    license:
      '© Fontis Verlag. Urheberrechtlich geschützt — nur zur privaten Nutzung auf diesem Rechner, keine Weitergabe.',
    restricted: true,
    format: 'bolls',
    url: 'https://bolls.life/static/translations/HFA.json',
    cache: 'HFA.json',
  },
};

const SBLGNT_BASE =
  'https://raw.githubusercontent.com/Faithlife/SBLGNT/master/data/sblgnt/text';

/* ------------------------------------------------------------------ *
 * Argumente
 * ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const germanKey = getFlag('de', 'elb');
const skipGreek = hasFlag('skip-greek');
const german = GERMAN_SOURCES[germanKey];

if (!german) {
  console.error(`\n  Unbekannte Übersetzung "${germanKey}".`);
  console.error(`  Verfügbar: ${Object.keys(GERMAN_SOURCES).join(', ')}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Hilfsfunktionen
 * ------------------------------------------------------------------ */

const books = JSON.parse(readFileSync(join(dataDir, 'books.json'), 'utf8'));
const events = JSON.parse(readFileSync(join(dataDir, 'events.json'), 'utf8'));

const bookById = new Map(books.map((b) => [b.id, b]));

/**
 * Verstext säubern.
 *
 * bolls liefert HTML: `<f> [59]</f>` ist eine Fußnotenmarke, `<S>` sind
 * Strong-Nummern. Solche Elemente werden **samt Inhalt** entfernt — würde man
 * nur die Tags strippen, bliebe die nackte Zahl im Satz stehen.
 *
 * Eckige Klammern außerhalb dieser Elemente bleiben dagegen erhalten: In
 * Schlachter und Elberfelder kennzeichnen sie Wörter, die der Übersetzer
 * ergänzt hat („Denn so [sehr] hat Gott die Welt geliebt"). Sie gehören zum
 * Text.
 */
function cleanText(raw) {
  return String(raw)
    .replace(/<f>.*?<\/f>/gis, '')
    .replace(/<S>.*?<\/S>/gis, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function download(url, cacheName) {
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, cacheName);

  if (existsSync(cachePath)) {
    process.stdout.write(`  · ${cacheName} aus dem Zwischenspeicher\n`);
    return readFileSync(cachePath, 'utf8');
  }

  process.stdout.write(`  · lade ${url}\n`);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'bibleland-fetch-verses (privates Projekt)' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} bei ${url}`);
  }
  const body = await response.text();
  writeFileSync(cachePath, body, 'utf8');
  return body;
}

/**
 * Alle benötigten Versschlüssel aus den Ereignissen sammeln.
 *
 * Neben dem ausdrücklich gepflegten Schlüsselvers wird auch der **erste Vers
 * jeder Belegstelle** geholt — sonst stünde bei zwei Dritteln der Ereignisse
 * „kein Verstext hinterlegt", obwohl die Stelle bekannt ist. Aus
 * „Apostelgeschichte 16,11-15" wird `apg.16.11`.
 *
 * Muss mit `verseKeyForEvent` in `src/lib/verses.ts` übereinstimmen, sonst
 * holt das Skript andere Verse, als die App nachschlägt.
 */
function collectVerseKeys() {
  const keys = new Set();

  for (const event of events) {
    if (event.keyVerseRef) keys.add(event.keyVerseRef);

    for (const ref of [event.ref, ...(event.parallelRefs ?? [])]) {
      if (!ref) continue;
      const match = String(ref.verses ?? '').match(/^(\d+)/);
      const verse = match ? Number(match[1]) : 1;
      keys.add(`${ref.bookId}.${ref.chapter}.${verse}`);
    }
  }

  return [...keys].sort();
}

/** 'gen.12.1' → { bookId, chapter, verse } */
function parseKey(key) {
  const [bookId, chapter, verse] = key.split('.');
  return { bookId, chapter: Number(chapter), verse: Number(verse) };
}

/** Anzeigefertige Stellenangabe: „1. Mose 12,1". */
function displayRef(bookId, chapter, verse) {
  return `${bookById.get(bookId)?.name ?? bookId} ${chapter},${verse}`;
}

/* ------------------------------------------------------------------ *
 * Deutsche Übersetzung
 * ------------------------------------------------------------------ */

/**
 * Buchnamen vergleichbar machen.
 *
 * Die Quellen schreiben dieselben Bücher unterschiedlich: „1 Kings" gegen
 * „I Kings", „Revelation" gegen „Revelation of John". Hier werden römische
 * Zählziffern in arabische überführt und alles Übrige auf Kleinbuchstaben
 * reduziert.
 */
function normalizeBookName(name) {
  return String(name)
    .toLowerCase()
    .replace(/^iii\s+/, '3 ')
    .replace(/^ii\s+/, '2 ')
    .replace(/^i\s+/, '1 ')
    .replace(/\s+of\s+john$/, '')
    .replace(/[^a-z0-9]/g, '');
}

/** scrollmapper: { books: [{ name, chapters: [{ chapter, verses: [{verse, text}] }] }] } */
function indexScrollmapper(json) {
  const index = new Map();
  const byName = new Map(json.books.map((b) => [normalizeBookName(b.name), b]));

  for (const book of books) {
    // Der Kanon ist in diesen Dateien vollständig und in der üblichen
    // Reihenfolge. Die Position ist deshalb der verlässlichste Schlüssel;
    // der Name dient nur als Gegenprobe, falls eine Quelle davon abweicht.
    const byPosition = json.books.length === 66 ? json.books[book.order - 1] : undefined;
    const source = byPosition ?? byName.get(normalizeBookName(book.sourceName));
    if (!source) {
      console.warn(`    ! ${book.name} nicht in der Quelle gefunden`);
      continue;
    }
    for (const chapter of source.chapters) {
      for (const verse of chapter.verses) {
        index.set(`${book.id}.${chapter.chapter}.${verse.verse}`, cleanText(verse.text));
      }
    }
  }
  return index;
}

/** bolls: [{ book, chapter, verse, text }] mit Buchnummern 1–66 */
function indexBolls(json) {
  const index = new Map();
  const byNumber = new Map(books.map((b) => [b.sourceNr, b.id]));

  for (const row of json) {
    const bookId = byNumber.get(row.book);
    if (!bookId) continue;
    index.set(`${bookId}.${row.chapter}.${row.verse}`, cleanText(row.text));
  }
  return index;
}

async function buildGerman(keys) {
  console.log(`\n  Deutscher Text — ${german.name}`);
  const raw = await download(german.url, german.cache);
  const json = JSON.parse(raw);
  const index = german.format === 'scrollmapper' ? indexScrollmapper(json) : indexBolls(json);

  const verses = {};
  const missing = [];

  for (const key of keys) {
    const text = index.get(key);
    if (!text) {
      missing.push(key);
      continue;
    }
    const { bookId, chapter, verse } = parseKey(key);
    verses[key] = { ref: displayRef(bookId, chapter, verse), text };
  }

  return { verses, missing };
}

/* ------------------------------------------------------------------ *
 * Griechisches Neues Testament (SBLGNT)
 * ------------------------------------------------------------------ */

async function buildGreek(keys) {
  console.log('\n  Originaltext — SBL Greek New Testament');

  // Nur die neutestamentlichen Bücher laden, zu denen ein Vers gebraucht wird.
  const needed = new Map();
  for (const key of keys) {
    const { bookId } = parseKey(key);
    const book = bookById.get(bookId);
    if (!book?.sblgnt) continue;
    if (!needed.has(book.sblgnt)) needed.set(book.sblgnt, book.id);
  }

  const verses = {};
  const missing = [];

  for (const [file, bookId] of needed) {
    let raw;
    try {
      raw = await download(`${SBLGNT_BASE}/${file}.txt`, `sblgnt-${file}.txt`);
    } catch (error) {
      console.warn(`    ! ${file} konnte nicht geladen werden: ${error.message}`);
      continue;
    }

    // Zeilenformat: "Matt 1:1\tΒίβλος γενέσεως …"
    const index = new Map();
    for (const line of raw.split('\n')) {
      const tab = line.indexOf('\t');
      if (tab === -1) continue;
      const locator = line.slice(0, tab);
      const text = line.slice(tab + 1).trim();
      const match = locator.match(/(\d+):(\d+)\s*$/);
      if (!match) continue;
      index.set(`${bookId}.${Number(match[1])}.${Number(match[2])}`, text);
    }

    for (const key of keys) {
      if (!key.startsWith(`${bookId}.`)) continue;
      const text = index.get(key);
      if (!text) {
        missing.push(key);
        continue;
      }
      const { chapter, verse } = parseKey(key);
      verses[key] = { ref: displayRef(bookId, chapter, verse), text };
    }
  }

  return { verses, missing };
}

/* ------------------------------------------------------------------ *
 * Ablauf
 * ------------------------------------------------------------------ */

function writeBundle(fileName, source, verses) {
  mkdirSync(versesDir, { recursive: true });
  const path = join(versesDir, fileName);
  writeFileSync(path, `${JSON.stringify({ source, verses }, null, 2)}\n`, 'utf8');
  return path;
}

async function main() {
  const keys = collectVerseKeys();

  console.log('');
  console.log('  Bibleland — Verse holen');
  console.log('  ' + '─'.repeat(58));
  console.log(`  ${keys.length} Schlüsselverse aus ${events.length} Ereignissen`);

  /* --- Deutsch ------------------------------------------------- */
  let germanResult;
  try {
    germanResult = await buildGerman(keys);
  } catch (error) {
    console.error(`\n  Der deutsche Text konnte nicht geladen werden: ${error.message}`);
    console.error('  Die App läuft weiter — sie zeigt dann nur die Stellenangaben.\n');
    process.exit(1);
  }

  const targetFile = german.restricted ? 'verses.de.local.json' : 'verses.de.public.json';
  const written = writeBundle(
    targetFile,
    {
      name: german.name,
      short: german.short,
      language: 'de',
      license: german.license,
      restricted: german.restricted,
    },
    germanResult.verses,
  );

  console.log(`    ${Object.keys(germanResult.verses).length} Verse geschrieben → ${targetFile}`);
  if (germanResult.missing.length) {
    console.log(`    ${germanResult.missing.length} nicht gefunden: ${germanResult.missing.slice(0, 5).join(', ')}${germanResult.missing.length > 5 ? ' …' : ''}`);
  }
  if (german.restricted) {
    console.log('');
    console.log('    ⚠  Geschützter Text. Die Datei steht in der .gitignore und');
    console.log('       darf nicht weitergegeben werden. Der gemeinfreie Text in');
    console.log('       verses.de.public.json bleibt als Ersatz erhalten.');
  }
  void written;

  /* --- Griechisch ---------------------------------------------- */
  if (!skipGreek) {
    try {
      const greekResult = await buildGreek(keys);
      writeBundle(
        'verses.grc.json',
        {
          name: 'SBL Greek New Testament',
          short: 'SBLGNT',
          language: 'grc',
          license:
            '© 2010 Society of Biblical Literature und Logos Bible Software. Lizenziert unter CC BY 4.0.',
          restricted: false,
        },
        greekResult.verses,
      );
      console.log(`    ${Object.keys(greekResult.verses).length} Verse geschrieben → verses.grc.json`);
      if (greekResult.missing.length) {
        console.log(`    ${greekResult.missing.length} nicht gefunden`);
      }
      console.log('');
      console.log('    Hinweis: Das SBLGNT deckt nur das Neue Testament ab.');
      console.log('    Alttestamentliche Ereignisse zeigen daher keinen Originaltext.');
    } catch (error) {
      console.warn(`\n  Der griechische Text konnte nicht geladen werden: ${error.message}`);
      console.warn('  Die App läuft weiter, nur ohne Sprachumschalter.');
    }
  }

  console.log('');
  console.log('  Fertig.');
  console.log('');
}

main().catch((error) => {
  console.error(`\n  Unerwarteter Fehler: ${error.message}\n`);
  process.exit(1);
});
