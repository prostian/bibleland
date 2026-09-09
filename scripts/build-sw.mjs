#!/usr/bin/env node
/**
 * Setzt Version und Vorladeliste in den Service Worker ein.
 *
 * `public/sw.js` wird von Vite unverändert kopiert und kann die Dateinamen
 * deshalb nicht kennen: Sie tragen einen Hash, der erst beim Build entsteht.
 * Dieses Skript trägt sie nach — dadurch bleibt der Service Worker im
 * Quelltext lesbar statt aus einem Plugin zu fallen.
 *
 * Die Version kommt aus `package.json`. Sie steht im Cache-Namen; ein neuer
 * Build räumt dadurch den alten Zwischenspeicher ab.
 *
 * Aufruf: npm run build (läuft nach `vite build`)
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const swFile = join(distDir, 'sw.js');

/**
 * Was ohne Netz da sein muss.
 *
 * Die Hülle, alle Chunks und Stile, dazu Manifest und Icons. Die 752
 * vorgerenderten Entitätsdateien gehören ausdrücklich **nicht** dazu: Sie
 * sind für Crawler gedacht, im Browser übernimmt nach dem ersten Aufruf das
 * Routing. Sie vorzuladen hieße, 20 MB für etwas zu speichern, das die App
 * selbst erzeugt.
 */
const EXTRA = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable.png', '/og.png'];

function assetUrls() {
  const assetsDir = join(distDir, 'assets');
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir)
    .filter((name) => statSync(join(assetsDir, name)).isFile())
    .map((name) => posix.join('/assets', name));
}

if (!existsSync(swFile)) {
  console.error('\n  dist/sw.js fehlt — wurde public/sw.js gelöscht?\n');
  process.exitCode = 1;
} else {
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const precache = [...EXTRA.filter((url) => url === '/' || existsSync(join(distDir, url))), ...assetUrls()];

  const original = readFileSync(swFile, 'utf8');
  const source = original
    .replace('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(precache, null, 2));

  // Fehlt ein Platzhalter, liefe der Service Worker in einen ReferenceError —
  // und zwar erst im Browser des Nutzers, wo es niemand sieht.
  if (source === original || source.includes('__VERSION__') || source.includes('__PRECACHE__')) {
    console.error('\n  In dist/sw.js fehlen die Platzhalter __VERSION__ oder __PRECACHE__.\n');
    process.exitCode = 1;
  } else {
    writeFileSync(swFile, source, 'utf8');
  }

  const bytes = precache
    .filter((url) => url !== '/')
    .reduce((sum, url) => sum + statSync(join(distDir, url)).size, 0);

  console.log(`  Service Worker: Version ${version}, ${precache.length} Dateien vorgeladen ` +
    `(${(bytes / 1024).toFixed(0)} kB)`);
  console.log('');
}
