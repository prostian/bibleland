#!/usr/bin/env node
/**
 * Berichtet, wo der Datenbestand dünn ist.
 *
 * Anders als `validate-data.mjs` prüft dieses Skript nichts und schlägt nie
 * fehl: Eine Lücke ist kein Fehler. Es beantwortet die Frage, an welcher
 * Stelle inhaltliche Arbeit am meisten bringt — und ersetzt damit die von
 * Hand gepflegten Zahlen, die im README beim ersten neuen Ereignis veralten.
 *
 * Gerechnet wird in `src/lib/gaps.ts`, damit die Info-Seite der App dieselben
 * Zahlen zeigt. Node entfernt die Typen beim Import selbst; einen Buildschritt
 * braucht es dafür nicht.
 *
 * Aufruf: npm run gaps  ·  npm run gaps -- --json
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeGaps, SHORT_DESCRIPTION_CHARS } from '../src/lib/gaps.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');

const asJson = process.argv.includes('--json');

function load(name) {
  try {
    return JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
  } catch (error) {
    console.error(`\n  Datei ${name} konnte nicht gelesen werden: ${error.message}\n`);
    process.exit(1);
  }
}

const report = computeGaps({
  books: load('books.json'),
  periods: load('periods.json'),
  places: load('places.json'),
  persons: load('persons.json'),
  events: load('events.json'),
  journeys: load('journeys.json'),
});

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * Konsolenbericht
 * ------------------------------------------------------------------ */

const WIDTH = 74;

const line = () => console.log('  ' + '─'.repeat(WIDTH));

function heading(text) {
  console.log('');
  console.log(`  ${text}`);
  line();
}

function row(label, value, hint = '') {
  console.log(`  ${label.padEnd(34)}${String(value).padStart(5)}   ${hint}`);
}

/** Namen als Fließtext, damit 98 Orte nicht 98 Zeilen belegen. */
function names(items, limit = Number.POSITIVE_INFINITY) {
  const shown = items.slice(0, limit).map((item) => item.name);
  const rest = items.length - shown.length;
  const text = shown.join(', ') + (rest > 0 ? ` … und ${rest} weitere` : '');

  let current = '   ';
  for (const word of text.split(' ')) {
    if (current.length + word.length + 1 > WIDTH) {
      console.log(current);
      current = '   ';
    }
    current += (current === '   ' ? ' ' : ' ') + word;
  }
  if (current.trim()) console.log(current);
}

function bar(count, max) {
  const width = max === 0 ? 0 : Math.round((count / max) * 24);
  return '█'.repeat(width) || (count > 0 ? '▏' : '');
}

console.log('');
console.log('  Bibleland — Lückenbericht');
console.log('  ' + '═'.repeat(WIDTH));
console.log(
  `  ${report.totals.events} Ereignisse · ${report.totals.places} Orte · ` +
    `${report.totals.persons} Personen · ${report.totals.journeys} Reisen · ` +
    `${report.totals.books} Bücher · ${report.totals.periods} Epochen`,
);

heading('Ohne Anbindung');
row('Bücher ohne Ereignis', report.booksWithoutEvents.length, `von ${report.totals.books}`);
if (report.booksWithoutEvents.length) {
  for (const book of report.booksWithoutEvents) {
    console.log(
      `     ${book.name.padEnd(22)} ${book.section.padEnd(20)}` +
        (book.hasWrittenYear ? 'Abfassungszeit vorhanden' : 'auch ohne Abfassungszeit'),
    );
  }
}

row('Orte ohne Ereignis', report.placesWithoutEvents.length, `von ${report.totals.places}`);
names(report.placesWithoutEvents);
row('Personen ohne Ereignis', report.personsWithoutEvents.length, `von ${report.totals.persons}`);
names(report.personsWithoutEvents);
row('Personen ohne Beziehung', report.personsWithoutRelations.length, `von ${report.totals.persons}`);
names(report.personsWithoutRelations, 12);

heading(`Beschreibungen unter ${SHORT_DESCRIPTION_CHARS} Zeichen`);
row('Orte', report.shortDescriptions.places.length, `von ${report.totals.places}`);
names(report.shortDescriptions.places, 12);
row('Personen', report.shortDescriptions.persons.length, `von ${report.totals.persons}`);
names(report.shortDescriptions.persons, 12);
row('Ereignisse', report.shortDescriptions.events.length, `von ${report.totals.events}`);
names(report.shortDescriptions.events, 12);

heading('Belege');
row('Ereignisse mit Bibelstelle', report.keyVerses.biblical, `${report.extrabiblicalEvents} außerbiblisch`);
row('davon mit Schlüsselvers', report.keyVerses.withKeyVerse, '');
row('ohne Schlüsselvers', report.keyVerses.withoutKeyVerse, 'kein Vers zum Aufklappen');
row('Orte ohne heutigen Namen', report.placesWithoutModernName, `von ${report.totals.places}`);

heading('Verlässlichkeit der Datierung');
for (const entry of report.certainty) {
  console.log(
    `  ${entry.certainty.padEnd(14)}${String(entry.count).padStart(5)}` +
      `${String(entry.share.toFixed(1) + ' %').padStart(9)}   ${bar(entry.count, report.totals.events)}`,
  );
}

heading('Ereignisse je Epoche');
const maxPeriod = report.eventsByPeriod.reduce((max, p) => Math.max(max, p.count), 0);
for (const period of report.eventsByPeriod) {
  console.log(`  ${period.name.padEnd(30)}${String(period.count).padStart(5)}   ${bar(period.count, maxPeriod)}`);
}

heading('Ereignisse je Abschnitt');
const maxSection = report.eventsBySection.reduce((max, s) => Math.max(max, s.count), 0);
for (const section of report.eventsBySection) {
  console.log(`  ${section.name.padEnd(30)}${String(section.count).padStart(5)}   ${bar(section.count, maxSection)}`);
}

heading('Reisen mit Etappen ohne Ereignis');
if (report.journeysWithLegsWithoutEvent.length === 0) {
  console.log('   jede Etappe trägt ein Ereignis');
} else {
  for (const journey of report.journeysWithLegsWithoutEvent) {
    console.log(
      `  ${journey.name.padEnd(38)}${String(journey.legsWithoutEvent).padStart(3)} von ${journey.legs} Etappen`,
    );
  }
}

console.log('');
console.log('  Kein Fehler, nur ein Befund. Mit --json für die Weiterverarbeitung.');
console.log('');
