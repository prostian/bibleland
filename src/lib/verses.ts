import publicDe from '@/data/verses/verses.de.public.json';
import greek from '@/data/verses/verses.grc.json';

import type { BibleEvent, BibleRef, VerseBundle, VerseEntry, VerseLanguage } from '@/types';
import { bookById } from '@/lib/dataset';

/**
 * Zugriff auf die Verstexte.
 *
 * Zwei deutsche Quellen sind vorgesehen:
 *
 * - `verses.de.public.json` — gemeinfrei, im Repo, immer vorhanden.
 * - `verses.de.local.json` — die lizenzierte Wunschübersetzung, per
 *   `.gitignore` ausgeschlossen und nur auf diesem Rechner. Schlachter 2000
 *   und die Einheitsübersetzung sind urheberrechtlich geschützt: eine
 *   Privatkopie ist zulässig, eine Weitergabe wäre es nicht.
 *
 * Liegt die lokale Datei vor, hat sie Vorrang. Fehlt sie — etwa nach einem
 * frischen Klon —, greift lautlos der gemeinfreie Text. Deshalb wird sie
 * über `import.meta.glob` geladen: Ein gewöhnlicher Import würde den Build
 * mit „Datei nicht gefunden" abbrechen, sobald sie fehlt.
 */

const localModules = import.meta.glob<{ default: VerseBundle }>(
  '/src/data/verses/verses.de.local.json',
  { eager: true },
);

const localDe: VerseBundle | undefined = Object.values(localModules)[0]?.default;

const literalBundle: VerseBundle = publicDe as VerseBundle;
const germanBundle: VerseBundle = localDe ?? literalBundle;
const greekBundle: VerseBundle = greek as VerseBundle;

/** Liegt der lizenzierte Text vor, oder läuft die App auf dem Ersatztext? */
export const usingLocalGerman = localDe !== undefined;

export function bundleFor(language: VerseLanguage): VerseBundle {
  if (language === 'de') return germanBundle;
  if (language === 'woertlich') return literalBundle;
  return greekBundle;
}

/**
 * Welche Fassungen haben für diesen Schlüssel überhaupt einen Text?
 *
 * `woertlich` entfällt, solange kein lizenzierter Text vorliegt: Dann ist die
 * Elberfelder bereits die deutsche Fassung, und zwei Reiter mit identischem
 * Inhalt wären nur verwirrend.
 */
export function availableLanguages(verseKey: string | undefined): VerseLanguage[] {
  if (!verseKey) return [];
  const languages: VerseLanguage[] = [];
  if (germanBundle.verses[verseKey]) languages.push('de');
  if (usingLocalGerman && literalBundle.verses[verseKey]) languages.push('woertlich');
  if (greekBundle.verses[verseKey]) languages.push('grc');
  return languages;
}

export function getVerse(
  verseKey: string | undefined,
  language: VerseLanguage,
): VerseEntry | undefined {
  if (!verseKey) return undefined;
  return bundleFor(language).verses[verseKey];
}

export const LANGUAGE_LABEL: Record<VerseLanguage, string> = {
  de: 'Deutsch',
  woertlich: 'Wörtlich',
  grc: 'Griechisch',
  hbo: 'Hebräisch',
};

export const LANGUAGE_HINT: Record<VerseLanguage, string> = {
  de: 'Gut lesbare Übersetzung',
  woertlich:
    'Elberfelder 1905 — bildet den Satzbau der Ursprache so eng wie möglich nach. Eine echte Wort-für-Wort-Zeile mit deutschen Glossen gibt es als freien Datensatz nicht.',
  grc: 'Der griechische Urtext (SBLGNT). Nur für das Neue Testament.',
  hbo: 'Der hebräische Urtext.',
};

/** CSS-Klasse für die Schriftwahl und Leserichtung einer Fassung. */
export function languageClass(language: VerseLanguage): string {
  if (language === 'grc') return 'text-greek';
  if (language === 'hbo') return 'text-hebrew';
  return '';
}

/**
 * Der Versschlüssel eines Ereignisses.
 *
 * Ist kein Schlüsselvers gepflegt, wird der **erste Vers der Belegstelle**
 * genommen: Aus „Apostelgeschichte 16,11-15" wird `apg.16.11`. Ohne diese
 * Ableitung stünde bei zwei Dritteln der Ereignisse „kein Verstext
 * hinterlegt", obwohl es die Stelle sehr wohl gibt.
 */
export function verseKeyForEvent(event: BibleEvent): string | undefined {
  if (event.keyVerseRef) return event.keyVerseRef;
  if (!event.ref) return undefined;
  return firstVerseKey(event.ref);
}

/** Erster Vers einer Stellenangabe als Punkt-Referenz. */
export function firstVerseKey(ref: BibleRef): string {
  const match = ref.verses?.match(/^(\d+)/);
  const verse = match?.[1] ? Number(match[1]) : 1;
  return `${ref.bookId}.${ref.chapter}.${verse}`;
}

/* ------------------------------------------------------------------ *
 * Deep-Links nach außen
 * ------------------------------------------------------------------ */

/** Übersetzungen, die auf bibleserver.com verlinkbar sind. */
export const BIBLESERVER_VERSIONS = [
  { code: 'SLT', name: 'Schlachter 2000' },
  { code: 'EU', name: 'Einheitsübersetzung' },
  { code: 'LUT', name: 'Lutherbibel 2017' },
  { code: 'ELB', name: 'Elberfelder' },
  { code: 'HFA', name: 'Hoffnung für Alle' },
  { code: 'NEU', name: 'Neue evangelistische Übersetzung' },
] as const;

export type BibleserverVersion = (typeof BIBLESERVER_VERSIONS)[number]['code'];

/**
 * Link auf eine Bibelstelle bei ERF Bibleserver.
 *
 * Aufbau: `/<VERSION>/<Buch><Kapitel>,<Verse>`, etwa
 * `/SLT/1.Mose12,1-9`. Der Buchname wird kodiert, weil er Umlaute enthalten
 * kann (Matthäus, Römer, Sprüche).
 *
 * Verlinken statt einbetten ist bei den geschützten Übersetzungen der einzig
 * saubere Weg — und der von Bibleserver ausdrücklich vorgesehene.
 */
export function bibleserverUrl(ref: BibleRef, version: BibleserverVersion = 'SLT'): string {
  const book = bookById.get(ref.bookId);
  const name = encodeURIComponent(book?.bibleserver ?? ref.bookId);

  let locator = `${name}${ref.chapter}`;
  if (ref.endChapter && ref.endChapter !== ref.chapter) {
    // Bibleserver kennt keine Kapitelspanne in einer URL — auf das
    // Anfangskapitel verlinken ist besser als ein toter Link.
    locator = `${name}${ref.chapter}`;
  } else if (ref.verses) {
    locator = `${name}${ref.chapter},${ref.verses}`;
  }

  return `https://www.bibleserver.com/${version}/${locator}`;
}

/** Link auf die Deutsche Bibelgesellschaft, die USFM-Buchcodes verwendet. */
export function dieBibelUrl(ref: BibleRef, version = 'LU17'): string {
  const book = bookById.get(ref.bookId);
  return `https://www.die-bibel.de/bibel/${version}/${book?.usfm ?? ref.bookId}.${ref.chapter}`;
}
