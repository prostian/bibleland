#!/usr/bin/env node
/**
 * Wacht über die Bundle-Größe.
 *
 * `manualChunks` in der `vite.config.ts` trennt sinnvoll — aber niemand
 * merkt, wenn ein Chunk sich verdoppelt, weil versehentlich eine Bibliothek
 * in den Startpfad gerutscht ist. Auf einer Seite, die auch im Zug und über
 * Mobilfunk laden soll, ist das der teuerste Fehler, den man nicht sieht.
 *
 * Die Grenzen sind **gemessen, nicht gewünscht**: Ist-Stand plus rund 15 %.
 * Wer sie sinnvoll überschreitet, hebt sie hier an — dann steht die
 * Entscheidung wenigstens im Verlauf.
 *
 * Aufruf: npm run size (nach dem Build)
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'dist', 'assets');

/** Obergrenzen in kB, gemessen am Stand von Version 0.1.1. */
const BUDGETS = {
  'index.js': 510,
  'daten.js': 355,
  'verse.js': 245,
  'leaflet.js': 205,
  'd3.js': 65,
  'index.css': 67,
};

/**
 * Für alles Übrige: die nachgeladenen Seiten und der gemeinsame Chunk, den
 * Rollup nach einem beliebigen seiner Module benennt. Dieser Name ist nicht
 * stabil — deshalb hier eine Grenze statt eines Eintrags oben.
 */
const DEFAULT_BUDGET = 130;

/** Summe aller Dateien in dist/assets. */
const TOTAL_BUDGET = 1600;

/** `index-DgK0TQ9F.js` → `index.js` */
function baseName(file) {
  return file.replace(/-[A-Za-z0-9_-]{8,}(?=\.[a-z]+$)/, '');
}

if (!existsSync(assetsDir)) {
  console.error('\n  dist/assets fehlt — bitte zuerst bauen.\n');
  process.exitCode = 1;
} else {
  const files = readdirSync(assetsDir)
    .filter((name) => statSync(join(assetsDir, name)).isFile())
    .map((name) => ({
      name,
      base: baseName(name),
      kb: statSync(join(assetsDir, name)).size / 1024,
    }))
    .sort((a, b) => b.kb - a.kb);

  const over = [];
  let total = 0;

  console.log('');
  console.log('  Bibleland — Groessenpruefung');
  console.log('  ' + '─'.repeat(58));

  for (const file of files) {
    total += file.kb;
    const budget = BUDGETS[file.base] ?? DEFAULT_BUDGET;
    const exceeded = file.kb > budget;
    if (exceeded) over.push({ ...file, budget });

    console.log(
      `  ${file.base.padEnd(28)}${file.kb.toFixed(1).padStart(8)} kB` +
        `${String(budget).padStart(7)} kB  ${exceeded ? 'zu gross' : ''}`,
    );
  }

  console.log('  ' + '─'.repeat(58));
  console.log(
    `  ${'gesamt'.padEnd(28)}${total.toFixed(1).padStart(8)} kB${String(TOTAL_BUDGET).padStart(7)} kB`,
  );
  console.log('');

  if (total > TOTAL_BUDGET) {
    over.push({ base: 'gesamt', kb: total, budget: TOTAL_BUDGET });
  }

  if (over.length) {
    console.error('  Budget ueberschritten:');
    for (const item of over) {
      console.error(
        `    ✗ ${item.base}: ${item.kb.toFixed(1)} kB, erlaubt sind ${item.budget} kB`,
      );
    }
    console.error('');
    process.exitCode = 1;
  } else {
    console.log('  Alle Chunks im Budget.');
    console.log('');
  }
}
