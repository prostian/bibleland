#!/usr/bin/env node
/**
 * Schreibt für jede Entität eine echte HTML-Datei nach `dist/`.
 *
 * Warum das nötig ist: Bibleland ist eine Einzelseiten-Anwendung. Ein Crawler
 * oder eine Linkvorschau, die kein JavaScript ausführt, bekommt für alle 750
 * Entitätsadressen dieselbe leere Hülle mit demselben Titel — die Inhalte
 * existieren für Suchmaschinen und Messenger schlicht nicht.
 *
 * Kein Server-Rendering von React: Für Kopfzeilen und einen Textabriss wäre
 * das ein zweiter Renderpfad, der bei jeder Komponentenänderung mitgepflegt
 * werden müsste. Hier werden stattdessen die JSON-Dateien gelesen und die
 * Textbausteine selbst gebaut — dieselbe Quelle, aber ohne zweite Fassung der
 * Oberfläche.
 *
 * Die `public/.htaccess` braucht dafür keine Änderung: Ihre erste Regel lässt
 * vorhandene Dateien *und Verzeichnisse* durch, bevor die SPA-Weiterleitung
 * greift. `/person/paulus` ist nach diesem Lauf ein Verzeichnis mit einer
 * `index.html` darin, wird also direkt ausgeliefert.
 *
 * Aufruf: npm run build (läuft nach `vite build`)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { formatEventDate, formatYear, formatYearRange } from '../src/lib/year.ts';
import {
  EVENT_TYPE_LABEL,
  PLACE_TYPE_LABEL,
  RELATION_LABEL,
  SECTION_LABEL,
  TESTAMENT_LABEL,
} from '../src/lib/labels.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');
const distDir = join(root, 'dist');

/** Das Projekt hat genau eine Adresse — eine Umgebungsvariable wäre Zierrat. */
const SITE = 'https://biblego.info';
const SITE_NAME = 'Bibleland';
const OG_IMAGE = `${SITE}/og.png`;

/** Länge, ab der eine Beschreibung in der Vorschau abgeschnitten wird. */
const DESCRIPTION_CHARS = 200;

const baseFile = join(distDir, 'index.html');

const load = (name) => JSON.parse(readFileSync(join(dataDir, name), 'utf8'));

const books = load('books.json');
const periods = load('periods.json');
const places = load('places.json');
const persons = load('persons.json');
const events = load('events.json');
const journeys = load('journeys.json');

const bookById = new Map(books.map((b) => [b.id, b]));
const periodById = new Map(periods.map((p) => [p.id, p]));
const placeById = new Map(places.map((p) => [p.id, p]));
const personById = new Map(persons.map((p) => [p.id, p]));
const eventById = new Map(events.map((e) => [e.id, e]));
const journeyById = new Map(journeys.map((j) => [j.id, j]));

/* ------------------------------------------------------------------ *
 * Textbausteine
 * ------------------------------------------------------------------ */

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Einzeilig und gekürzt — eine Vorschau ist kein Fließtext. */
function summarize(text) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= DESCRIPTION_CHARS) return flat;
  const cut = flat.slice(0, DESCRIPTION_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : DESCRIPTION_CHARS)} …`;
}

/** Stellenangabe in deutscher Schreibweise — wie `formatRef` in der App. */
function refLabel(ref) {
  if (!ref) return 'außerbiblisch';
  const book = bookById.get(ref.bookId);
  const name = book ? book.name : ref.bookId;
  if (ref.endChapter && ref.endChapter !== ref.chapter) {
    return `${name} ${ref.chapter}–${ref.endChapter}`;
  }
  if (ref.verses) return `${name} ${ref.chapter},${ref.verses}`;
  return `${name} ${ref.chapter}`;
}

const link = (href, text) => `<li><a href="${esc(href)}">${esc(text)}</a></li>`;

function list(title, items) {
  if (items.length === 0) return '';
  return `<h2>${esc(title)}</h2>\n<ul>\n${items.join('\n')}\n</ul>`;
}

/* ------------------------------------------------------------------ *
 * Die Seiten
 * ------------------------------------------------------------------ */

/**
 * Der `<noscript>`-Block ist das, was ein Crawler ohne JavaScript sieht.
 *
 * Bewusst nicht die halbe Detailseite, sondern das, wonach jemand sucht: was
 * es ist, wann es war, und die Namen drumherum als Links — damit der Crawler
 * von hier aus überhaupt weiterkommt.
 */
function eventPage(event) {
  const place = event.placeId ? placeById.get(event.placeId) : undefined;
  const period = periodById.get(event.periodId);
  const book = event.ref ? bookById.get(event.ref.bookId) : undefined;

  const related = [
    ...(place ? [link(`/ort/${place.id}`, `Ort: ${place.name}`)] : []),
    ...event.personIds
      .map((id) => personById.get(id))
      .filter(Boolean)
      .map((person) => link(`/person/${person.id}`, person.name)),
    ...(book ? [link(`/buch/${book.id}`, `Buch: ${book.name}`)] : []),
    ...(event.journeyId && journeyById.has(event.journeyId)
      ? [link(`/reise/${event.journeyId}`, `Reise: ${journeyById.get(event.journeyId).title}`)]
      : []),
    ...(event.relatedEventIds ?? [])
      .map((id) => eventById.get(id))
      .filter(Boolean)
      .map((other) => link(`/ereignis/${other.id}`, other.title)),
  ];

  const facts = [
    formatEventDate(event),
    refLabel(event.ref),
    EVENT_TYPE_LABEL[event.eventType] ?? event.eventType,
    period ? period.name : null,
  ].filter(Boolean);

  return {
    path: `ereignis/${event.id}`,
    title: event.title,
    description: summarize(event.description),
    type: 'article',
    body: `<h1>${esc(event.title)}</h1>
<p>${esc(facts.join(' · '))}</p>
<p>${esc(event.description)}</p>
${list('Verknüpft mit', related)}`,
  };
}

function personPage(person) {
  const lived = [
    person.birthYear !== undefined || person.deathYear !== undefined
      ? `Lebenszeit ${formatYearRange(person.birthYear ?? person.deathYear, person.deathYear ?? person.birthYear)}`
      : null,
    person.reignStart !== undefined && person.reignEnd !== undefined
      ? `Regierungszeit ${formatYearRange(person.reignStart, person.reignEnd)}`
      : null,
    person.tribe ? `Stamm ${person.tribe}` : null,
  ].filter(Boolean);

  const own = events.filter((event) => event.personIds.includes(person.id));

  const related = [
    ...person.relations
      .map((relation) => ({ relation, other: personById.get(relation.personId) }))
      .filter(({ other }) => other)
      .map(({ relation, other }) =>
        link(
          `/person/${other.id}`,
          `${RELATION_LABEL[relation.type] ?? relation.type}: ${other.name}`,
        ),
      ),
    ...own.slice(0, 12).map((event) => link(`/ereignis/${event.id}`, event.title)),
    ...journeys
      .filter((journey) => journey.personIds.includes(person.id))
      .map((journey) => link(`/reise/${journey.id}`, `Reise: ${journey.title}`)),
  ];

  return {
    path: `person/${person.id}`,
    title: person.name,
    description: summarize(person.description || `${person.name} — ${person.role}`),
    type: 'profile',
    body: `<h1>${esc(person.name)}</h1>
<p>${esc([person.role, ...lived].join(' · '))}</p>
<p>${esc(person.description)}</p>
${list('Verknüpft mit', related)}`,
  };
}

function placePage(place) {
  const facts = [
    PLACE_TYPE_LABEL[place.type] ?? place.type,
    place.region,
    place.modernName ? `heute ${place.modernName}` : null,
    `${place.lat.toFixed(3)}, ${place.lng.toFixed(3)}`,
  ].filter(Boolean);

  const here = events.filter((event) => event.placeId === place.id);

  const related = [
    ...here.slice(0, 15).map((event) => link(`/ereignis/${event.id}`, event.title)),
    ...journeys
      .filter((journey) => journey.legs.some((leg) => leg.placeId === place.id))
      .map((journey) => link(`/reise/${journey.id}`, `Reise: ${journey.title}`)),
  ];

  return {
    path: `ort/${place.id}`,
    title: place.name,
    description: summarize(place.description || `${place.name} — ${facts.join(', ')}`),
    type: 'website',
    body: `<h1>${esc(place.name)}</h1>
<p>${esc(facts.join(' · '))}</p>
<p>${esc(place.description)}</p>
${list('Was hier geschah', related)}`,
  };
}

function bookPage(book) {
  const author = book.authorPersonId ? personById.get(book.authorPersonId) : undefined;
  const inBook = events.filter(
    (event) =>
      event.ref?.bookId === book.id ||
      (event.parallelRefs ?? []).some((ref) => ref.bookId === book.id),
  );

  const facts = [
    TESTAMENT_LABEL[book.testament] ?? book.testament,
    SECTION_LABEL[book.section] ?? book.section,
    `${book.chapters} Kapitel`,
    book.writtenYear !== undefined ? `verfasst um ${formatYear(book.writtenYear)}` : null,
  ].filter(Boolean);

  // Getrennte Überschriften: 14 Bücher tragen kein einziges Ereignis, und
  // „Ereignisse in diesem Buch" über einem einzelnen Verfassernamen wäre dort
  // schlicht gelogen.
  const authorLink = author ? [link(`/person/${author.id}`, author.name)] : [];
  const eventLinks = inBook.slice(0, 15).map((event) => link(`/ereignis/${event.id}`, event.title));

  return {
    path: `buch/${book.id}`,
    title: book.altName ? `${book.name} (${book.altName})` : book.name,
    description: summarize(book.description || `${book.name} — ${facts.join(', ')}`),
    type: 'article',
    body: `<h1>${esc(book.name)}</h1>
<p>${esc(facts.join(' · '))}</p>
<p>${esc(book.description ?? '')}</p>
${list('Zugeschriebener Verfasser', authorLink)}
${list('Ereignisse in diesem Buch', eventLinks)}`,
  };
}

function journeyPage(journey) {
  const legs = [...journey.legs].sort((a, b) => a.order - b.order);

  const related = [
    ...journey.personIds
      .map((id) => personById.get(id))
      .filter(Boolean)
      .map((person) => link(`/person/${person.id}`, person.name)),
    ...legs
      .map((leg) => placeById.get(leg.placeId))
      .filter(Boolean)
      .map((place, index) => link(`/ort/${place.id}`, `${index + 1}. ${place.name}`)),
  ];

  return {
    path: `reise/${journey.id}`,
    title: journey.title,
    description: summarize(journey.description),
    type: 'article',
    body: `<h1>${esc(journey.title)}</h1>
<p>${esc(`${formatYearRange(journey.yearStart, journey.yearEnd)} · ${legs.length} Etappen`)}</p>
<p>${esc(journey.description)}</p>
${list('Route und Beteiligte', related)}`,
  };
}

/* ------------------------------------------------------------------ *
 * Schreiben
 * ------------------------------------------------------------------ */

function render(base, page) {
  const title = `${page.title} — ${SITE_NAME}`;
  const url = `${SITE}/${page.path}`;

  const head = `<meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:type" content="${esc(page.type)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:locale" content="de_DE" />
    <meta name="twitter:card" content="summary_large_image" />`;

  const noscript = `<noscript><article>
${page.body}
<p><a href="/">Zur Karte, zum Zeitstrahl und zum Wissensnetz</a></p>
</article></noscript>`;

  let html = base.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);

  // Die Angaben der Startseite weichen denen der Entität — sonst stünden in
  // jeder Datei zwei og:title, und welchen ein Vorschaudienst nimmt, ist
  // Glückssache.
  html = html
    .replace(/\s*<link rel="canonical"[\s\S]*?\/>/g, '')
    .replace(/\s*<meta\s+property="og:[\s\S]*?\/>/g, '')
    .replace(/\s*<meta\s+name="twitter:[\s\S]*?\/>/g, '');

  html = html.replace(/<meta\s+name="description"[\s\S]*?\/>/, head);
  html = html.replace('</body>', `  ${noscript}\n  </body>`);
  return html;
}

/* ------------------------------------------------------------------ *
 * Sitemap und robots.txt
 *
 * Ohne Sitemap müsste eine Suchmaschine jede der 750 Adressen über Links
 * erraten — und die entstehen erst, wenn JavaScript läuft. Die vorgerenderten
 * Dateien wären damit zwar da, aber unauffindbar.
 * ------------------------------------------------------------------ */

/** Startseite vor Ereignissen vor Personen und Orten — grob nach Substanz. */
const PRIORITY = {
  '': '1.0',
  ereignis: '0.8',
  person: '0.7',
  ort: '0.7',
  buch: '0.6',
  reise: '0.6',
};

/** Die Seiten ohne eigene Entität — sie werden nicht vorgerendert. */
const STATIC_PATHS = ['', 'graph', 'suche', 'info'];

function writeSitemap(pages) {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();

  const entries = [...STATIC_PATHS, ...pages.map((page) => page.path)]
    .filter((path) => {
      if (seen.has(path)) return false;
      seen.add(path);
      return true;
    })
    .map((path) => {
      const priority = PRIORITY[path.split('/')[0]] ?? '0.5';
      return `  <url>
    <loc>${esc(`${SITE}/${path}`)}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`;
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
  writeFileSync(join(distDir, 'sitemap.xml'), xml, 'utf8');

  writeFileSync(
    join(distDir, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
    'utf8',
  );

  return entries.length;
}

/*
 * Kein `process.exit()` beim Abbruch: In einem Modul, das eine TypeScript-
 * Datei importiert, bricht Node unter Windows dabei mit einer libuv-Assertion
 * ab statt sauber zu beenden. Ein gesetzter `exitCode` und ein Rücksprung
 * tun dasselbe, ohne den Prozess zu erschrecken.
 */
if (!existsSync(baseFile)) {
  console.error('\n  dist/index.html fehlt — bitte zuerst `vite build` laufen lassen.\n');
  process.exitCode = 1;
} else {
  const base = readFileSync(baseFile, 'utf8');
  const started = Date.now();

  const pages = [
    ...events.map(eventPage),
    ...persons.map(personPage),
    ...places.map(placePage),
    ...books.map(bookPage),
    ...journeys.map(journeyPage),
  ];

  for (const page of pages) {
    const dir = join(distDir, ...page.path.split('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), render(base, page), 'utf8');
  }

  /*
   * Verwaiste Dateien muss niemand aufräumen: Vite leert `dist` vor jedem
   * Build, eine gelöschte Entität ist danach schlicht nicht mehr da und läuft
   * wieder über die SPA-Weiterleitung in die NotFoundPage.
   */
  const urls = writeSitemap(pages);

  console.log('');
  console.log(`  Vorgerendert: ${pages.length} Seiten in ${Date.now() - started} ms`);
  console.log(`  sitemap.xml: ${urls} Adressen · robots.txt geschrieben`);
  console.log(
    `  ${events.length} Ereignisse · ${persons.length} Personen · ${places.length} Orte · ` +
      `${books.length} Bücher · ${journeys.length} Reisen`,
  );
  console.log('');
}
