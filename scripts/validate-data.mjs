#!/usr/bin/env node
/**
 * Prüft die Datendateien auf referentielle Integrität und Plausibilität.
 *
 * TypeScript kann das nicht leisten: Die JSON-Dateien werden über ambiente
 * Moduldeklarationen typisiert, der Compiler sieht ihren Inhalt also nie.
 * Dieses Skript ist die einzige Stelle, an der eine verwaiste `placeId` oder
 * ein Tippfehler in einer `personId` auffällt, bevor die App weiße Flecken
 * anzeigt.
 *
 * Aufruf: npm run validate
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');

const MIN_YEAR = -2200;
const MAX_YEAR = 100;

/** Grober geografischer Rahmen der biblischen Welt (Spanien bis Persien). */
const BBOX = { minLat: 20, maxLat: 45, minLng: -10, maxLng: 60 };

const SECTIONS = new Set([
  'pentateuch', 'geschichtsbuecher', 'weisheit', 'propheten',
  'evangelien', 'apostelgeschichte', 'briefe', 'offenbarung',
]);
const EVENT_TYPES = new Set([
  'bund', 'theophanie', 'wunder', 'schlacht', 'reise', 'geburt', 'tod',
  'prophetie', 'bau', 'gericht', 'lehre', 'politik', 'gruendung',
]);
const CERTAINTIES = new Set(['hoch', 'mittel', 'niedrig', 'symbolisch']);
const PLACE_TYPES = new Set(['stadt', 'berg', 'gewaesser', 'region', 'wueste', 'land', 'insel']);
const RELATION_TYPES = new Set([
  'vater', 'mutter', 'kind', 'ehepartner', 'geschwister', 'vorgaenger',
  'nachfolger', 'mentor', 'schueler', 'gegner', 'mitarbeiter',
]);

const errors = [];
const warnings = [];

const fail = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

function load(name) {
  try {
    return JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
  } catch (error) {
    console.error(`\n  Datei ${name} konnte nicht gelesen werden: ${error.message}\n`);
    process.exit(1);
  }
}

const books = load('books.json');
const periods = load('periods.json');
const placesData = load('places.json');
const persons = load('persons.json');
const events = load('events.json');
const journeys = load('journeys.json');
const territoryEras = load('territories.json');

/* ------------------------------------------------------------------ *
 * Eindeutigkeit der Kennungen
 * ------------------------------------------------------------------ */

function idSet(collection, label) {
  const seen = new Set();
  for (const item of collection) {
    if (typeof item.id !== 'string' || item.id.length === 0) {
      fail(label, `Eintrag ohne gültige id: ${JSON.stringify(item).slice(0, 80)}`);
      continue;
    }
    if (seen.has(item.id)) fail(label, `doppelte id "${item.id}"`);
    if (!/^[a-z0-9-]+$/.test(item.id)) {
      fail(label, `id "${item.id}" enthält unerlaubte Zeichen (erlaubt: a-z, 0-9, Bindestrich)`);
    }
    seen.add(item.id);
  }
  return seen;
}

const bookIds = idSet(books, 'books.json');
const periodIds = idSet(periods, 'periods.json');
const placeIds = idSet(placesData, 'places.json');
const personIds = idSet(persons, 'persons.json');
const eventIds = idSet(events, 'events.json');
const journeyIds = idSet(journeys, 'journeys.json');

/* ------------------------------------------------------------------ *
 * Bücher
 * ------------------------------------------------------------------ */

const seenOrder = new Set();
for (const book of books) {
  const where = `books.json/${book.id}`;
  if (!SECTIONS.has(book.section)) fail(where, `unbekannter Abschnitt "${book.section}"`);
  if (book.testament !== 'at' && book.testament !== 'nt') fail(where, `testament muss "at" oder "nt" sein`);
  if (!Number.isInteger(book.order) || book.order < 1 || book.order > 66) {
    fail(where, `order ${book.order} liegt außerhalb 1–66`);
  }
  if (seenOrder.has(book.order)) fail(where, `order ${book.order} doppelt vergeben`);
  seenOrder.add(book.order);
  if (!Number.isInteger(book.chapters) || book.chapters < 1) fail(where, `chapters ungültig`);
  if (book.authorPersonId && !personIds.has(book.authorPersonId)) {
    fail(where, `authorPersonId "${book.authorPersonId}" existiert nicht`);
  }
  for (const field of ['bibleserver', 'usfm', 'sourceName']) {
    if (typeof book[field] !== 'string' || !book[field]) fail(where, `Feld "${field}" fehlt`);
  }
  if (book.testament === 'nt' && !book.sblgnt) {
    warn(where, 'kein sblgnt-Dateiname — der griechische Text lässt sich nicht zuordnen');
  }
}
if (books.length !== 66) fail('books.json', `${books.length} Bücher statt 66`);

/* ------------------------------------------------------------------ *
 * Epochen
 * ------------------------------------------------------------------ */

for (const period of periods) {
  const where = `periods.json/${period.id}`;
  if (period.yearStart >= period.yearEnd) fail(where, `yearStart muss vor yearEnd liegen`);
  if (period.yearStart < MIN_YEAR || period.yearEnd > MAX_YEAR) {
    fail(where, `Zeitraum ${period.yearStart}…${period.yearEnd} verlässt ${MIN_YEAR}…${MAX_YEAR}`);
  }
  if (!SECTIONS.has(period.colorToken)) fail(where, `colorToken "${period.colorToken}" ist kein Abschnitt`);
}

const sortedPeriods = [...periods].sort((a, b) => a.yearStart - b.yearStart);
for (let i = 1; i < sortedPeriods.length; i++) {
  const prev = sortedPeriods[i - 1];
  const cur = sortedPeriods[i];
  if (cur.yearStart < prev.yearEnd) {
    warn('periods.json', `"${prev.name}" und "${cur.name}" überlappen sich — die Epochenbänder werden übereinander gezeichnet`);
  }
}

/* ------------------------------------------------------------------ *
 * Orte
 * ------------------------------------------------------------------ */

for (const place of placesData) {
  const where = `places.json/${place.id}`;
  if (typeof place.lat !== 'number' || typeof place.lng !== 'number') {
    fail(where, 'lat/lng fehlen oder sind keine Zahlen');
    continue;
  }
  if (place.lat < -90 || place.lat > 90) fail(where, `lat ${place.lat} liegt außerhalb -90…90`);
  if (place.lng < -180 || place.lng > 180) fail(where, `lng ${place.lng} liegt außerhalb -180…180`);
  if (
    place.lat < BBOX.minLat || place.lat > BBOX.maxLat ||
    place.lng < BBOX.minLng || place.lng > BBOX.maxLng
  ) {
    warn(where, `Koordinate ${place.lat}/${place.lng} liegt außerhalb der biblischen Welt — Zahlendreher?`);
  }
  if (!PLACE_TYPES.has(place.type)) fail(where, `unbekannter Ortstyp "${place.type}"`);
  if (!Array.isArray(place.aliases)) fail(where, 'aliases muss ein Array sein');
  if (place.locationCertainty && !CERTAINTIES.has(place.locationCertainty)) {
    fail(where, `unbekannte locationCertainty "${place.locationCertainty}"`);
  }
  if (!place.description) warn(where, 'ohne Beschreibung');
}

// Zwei Orte auf derselben Koordinate deuten meist auf ein Copy-Paste-Versehen.
const byCoord = new Map();
for (const place of placesData) {
  const key = `${place.lat.toFixed(4)}/${place.lng.toFixed(4)}`;
  const other = byCoord.get(key);
  if (other) warn('places.json', `"${place.id}" und "${other}" teilen sich exakt dieselbe Koordinate`);
  else byCoord.set(key, place.id);
}

/* ------------------------------------------------------------------ *
 * Personen
 * ------------------------------------------------------------------ */

for (const person of persons) {
  const where = `persons.json/${person.id}`;
  if (!Array.isArray(person.relations)) {
    fail(where, 'relations muss ein Array sein');
    continue;
  }
  for (const relation of person.relations) {
    if (!RELATION_TYPES.has(relation.type)) fail(where, `unbekannte Beziehungsart "${relation.type}"`);
    if (!personIds.has(relation.personId)) {
      fail(where, `Beziehung verweist auf unbekannte Person "${relation.personId}"`);
    }
    if (relation.personId === person.id) fail(where, 'Beziehung auf sich selbst');
  }
  for (const field of ['birthYear', 'deathYear', 'reignStart', 'reignEnd']) {
    const value = person[field];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value === 0) fail(where, `${field} ist keine gültige Jahreszahl (kein Jahr 0)`);
    else if (value < MIN_YEAR || value > MAX_YEAR) fail(where, `${field} ${value} verlässt ${MIN_YEAR}…${MAX_YEAR}`);
  }
  if (person.birthYear && person.deathYear && person.birthYear > person.deathYear) {
    fail(where, `birthYear ${person.birthYear} liegt nach deathYear ${person.deathYear}`);
  }
  if (person.reignStart && person.reignEnd && person.reignStart > person.reignEnd) {
    fail(where, `reignStart liegt nach reignEnd`);
  }
  if (person.primaryRef && !bookIds.has(person.primaryRef.bookId)) {
    fail(where, `primaryRef verweist auf unbekanntes Buch "${person.primaryRef.bookId}"`);
  }
}

/* ------------------------------------------------------------------ *
 * Ereignisse
 * ------------------------------------------------------------------ */

const bookByIdMap = new Map(books.map((b) => [b.id, b]));

function checkRef(ref, where, label) {
  if (!ref || typeof ref !== 'object') {
    fail(where, `${label} fehlt`);
    return;
  }
  const book = bookByIdMap.get(ref.bookId);
  if (!book) {
    fail(where, `${label} verweist auf unbekanntes Buch "${ref.bookId}"`);
    return;
  }
  if (!Number.isInteger(ref.chapter) || ref.chapter < 1) {
    fail(where, `${label}: chapter ${ref.chapter} ist ungültig`);
  } else if (ref.chapter > book.chapters) {
    fail(where, `${label}: ${book.name} hat nur ${book.chapters} Kapitel, angegeben ist ${ref.chapter}`);
  }
  if (ref.endChapter !== undefined) {
    if (!Number.isInteger(ref.endChapter) || ref.endChapter <= ref.chapter) {
      fail(where, `${label}: endChapter muss größer als chapter sein`);
    } else if (ref.endChapter > book.chapters) {
      fail(where, `${label}: endChapter ${ref.endChapter} übersteigt ${book.chapters} Kapitel`);
    }
  }
  if (ref.verses !== undefined && !/^\d+(-\d+)?$/.test(String(ref.verses))) {
    fail(where, `${label}: verses "${ref.verses}" hat nicht die Form "3" oder "1-9"`);
  }
}

for (const event of events) {
  const where = `events.json/${event.id}`;

  if (!event.title) fail(where, 'ohne Titel');
  if (!event.description) fail(where, 'ohne Beschreibung');
  if (!EVENT_TYPES.has(event.eventType)) fail(where, `unbekannter Ereignistyp "${event.eventType}"`);
  if (!CERTAINTIES.has(event.certainty)) fail(where, `unbekannte certainty "${event.certainty}"`);
  if (!Array.isArray(event.tags)) fail(where, 'tags muss ein Array sein');

  /*
   * Bibelstelle, Abschnitt und das Kennzeichen „außerbiblisch" gehören
   * zusammen: Entweder erzählt die Bibel das Ereignis — dann hat es eine
   * Stelle und einen Abschnitt — oder nicht, dann keins von beidem.
   *
   * Diese Prüfung gibt es, weil genau hier ein Fehler steckte: Um das früher
   * verpflichtende Feld `ref` zu füllen, waren außerbiblischen Ereignissen
   * Stellen zugeordnet worden, die sie gar nicht bezeugen. „Die Septuaginta
   * entsteht" trug Daniel 1,4.
   */
  const istAusserbiblisch = event.extrabiblical === true;

  if (istAusserbiblisch) {
    if (event.ref) fail(where, 'als außerbiblisch gekennzeichnet, trägt aber eine Bibelstelle');
    if (event.section) fail(where, 'als außerbiblisch gekennzeichnet, trägt aber einen Bibelabschnitt');
    if (event.keyVerseRef) fail(where, 'als außerbiblisch gekennzeichnet, trägt aber einen Schlüsselvers');
  } else {
    if (!event.ref) {
      fail(where, 'ohne Bibelstelle — dann muss es als "extrabiblical": true gekennzeichnet sein');
    }
    if (!SECTIONS.has(event.section)) fail(where, `unbekannter Abschnitt "${event.section}"`);
  }

  if (!Number.isInteger(event.year) || event.year === 0) {
    fail(where, `year ${event.year} ist keine gültige Jahreszahl (kein Jahr 0)`);
  } else if (event.year < MIN_YEAR || event.year > MAX_YEAR) {
    fail(where, `year ${event.year} verlässt ${MIN_YEAR}…${MAX_YEAR}`);
  }
  if (event.yearEnd !== undefined) {
    if (!Number.isInteger(event.yearEnd) || event.yearEnd === 0) fail(where, `yearEnd ${event.yearEnd} ungültig`);
    else if (event.yearEnd < event.year) fail(where, `yearEnd ${event.yearEnd} liegt vor year ${event.year}`);
    else if (event.yearEnd > MAX_YEAR) fail(where, `yearEnd ${event.yearEnd} verlässt den Bereich`);
  }

  if (event.ref) checkRef(event.ref, where, 'ref');
  for (const [i, ref] of (event.parallelRefs ?? []).entries()) checkRef(ref, where, `parallelRefs[${i}]`);

  // Der Abschnitt eines Ereignisses muss zu seinem Belegbuch passen, sonst
  // stimmt die Farbe auf Karte und Zeitstrahl nicht mit der Quelle überein.
  const book = event.ref ? bookByIdMap.get(event.ref.bookId) : undefined;
  if (book && book.section !== event.section) {
    fail(where, `section "${event.section}" widerspricht dem Buch ${book.name} ("${book.section}")`);
  }

  if (event.placeId !== null && event.placeId !== undefined && !placeIds.has(event.placeId)) {
    fail(where, `placeId "${event.placeId}" existiert nicht`);
  }
  if (event.placeId === undefined) fail(where, 'placeId fehlt (null ist erlaubt, undefined nicht)');

  if (!Array.isArray(event.personIds)) {
    fail(where, 'personIds muss ein Array sein');
  } else {
    for (const id of event.personIds) {
      if (!personIds.has(id)) fail(where, `personIds enthält unbekannte Person "${id}"`);
    }
    if (new Set(event.personIds).size !== event.personIds.length) fail(where, 'personIds enthält Duplikate');
  }

  if (!periodIds.has(event.periodId)) fail(where, `periodId "${event.periodId}" existiert nicht`);
  if (event.journeyId && !journeyIds.has(event.journeyId)) {
    fail(where, `journeyId "${event.journeyId}" existiert nicht`);
  }

  for (const id of event.relatedEventIds ?? []) {
    if (!eventIds.has(id)) fail(where, `relatedEventIds enthält unbekanntes Ereignis "${id}"`);
    if (id === event.id) fail(where, 'relatedEventIds verweist auf sich selbst');
  }

  if (event.keyVerseRef) {
    const parts = String(event.keyVerseRef).split('.');
    if (parts.length !== 3) {
      fail(where, `keyVerseRef "${event.keyVerseRef}" hat nicht die Form "buch.kapitel.vers"`);
    } else {
      const [bookId, chapter, verse] = parts;
      if (!bookIds.has(bookId)) fail(where, `keyVerseRef verweist auf unbekanntes Buch "${bookId}"`);
      if (!/^\d+$/.test(chapter) || !/^\d+$/.test(verse)) {
        fail(where, `keyVerseRef "${event.keyVerseRef}" enthält keine gültigen Zahlen`);
      }
      if (event.ref && bookId !== event.ref.bookId) {
        warn(where, `keyVerseRef liegt in ${bookId}, die Hauptstelle aber in ${event.ref.bookId}`);
      }
    }
  }

  // Passt das Jahr in die zugeordnete Epoche?
  const period = periods.find((p) => p.id === event.periodId);
  if (period && (event.year < period.yearStart || event.year > period.yearEnd)) {
    warn(where, `Jahr ${event.year} liegt außerhalb der Epoche "${period.name}" (${period.yearStart}…${period.yearEnd})`);
  }
}

/* ------------------------------------------------------------------ *
 * Reisen
 * ------------------------------------------------------------------ */

for (const journey of journeys) {
  const where = `journeys.json/${journey.id}`;
  if (!SECTIONS.has(journey.colorToken)) fail(where, `colorToken "${journey.colorToken}" ist kein Abschnitt`);
  if (journey.yearStart > journey.yearEnd) fail(where, 'yearStart liegt nach yearEnd');
  if (journey.routeCertainty && !CERTAINTIES.has(journey.routeCertainty)) {
    fail(where, `unbekannte routeCertainty "${journey.routeCertainty}"`);
  }
  for (const id of journey.personIds ?? []) {
    if (!personIds.has(id)) fail(where, `personIds enthält unbekannte Person "${id}"`);
  }

  if (!Array.isArray(journey.legs) || journey.legs.length < 2) {
    fail(where, 'eine Reise braucht mindestens zwei Etappen, sonst gibt es keine Linie');
    continue;
  }
  const orders = journey.legs.map((leg) => leg.order).sort((a, b) => a - b);
  for (const [i, order] of orders.entries()) {
    if (order !== i + 1) {
      fail(where, `Etappennummern müssen lückenlos bei 1 beginnen — gefunden: ${orders.join(', ')}`);
      break;
    }
  }
  for (const leg of journey.legs) {
    if (!placeIds.has(leg.placeId)) fail(where, `Etappe ${leg.order} verweist auf unbekannten Ort "${leg.placeId}"`);
    if (leg.eventId && !eventIds.has(leg.eventId)) {
      fail(where, `Etappe ${leg.order} verweist auf unbekanntes Ereignis "${leg.eventId}"`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Historische Grenzen
 *
 * Die Umrisse sind schematisch — geprüft wird deshalb nicht ihre Richtigkeit,
 * sondern nur, dass sie zeichenbar sind und die Epochen den Zeitstrahl
 * lückenlos und überschneidungsfrei abdecken. Ohne das müsste die Automatik
 * bei manchen Jahren raten, welches Kartenbild sie zeigt.
 * ------------------------------------------------------------------ */

const TERRITORY_KINDS = new Set(['reich', 'provinz', 'stamm', 'volk', 'einfluss']);

// Weiter gefasst als bei den Orten: Das Perserreich reicht bis an den Indus.
const TERRITORY_BBOX = { minLat: 15, maxLat: 50, minLng: -12, maxLng: 75 };

const eraIds = idSet(territoryEras, 'territories.json');
const territoryIds = new Set();

for (const era of territoryEras) {
  const where = `territories.json/${era.id}`;
  if (!era.name || !era.hint || !era.note) fail(where, 'name, hint oder note fehlt');
  if (!Number.isInteger(era.yearFrom) || !Number.isInteger(era.yearTo) || era.yearFrom === 0 || era.yearTo === 0) {
    fail(where, `yearFrom/yearTo sind keine gültigen Jahreszahlen (kein Jahr 0)`);
  } else if (era.yearFrom >= era.yearTo) {
    fail(where, 'yearFrom muss vor yearTo liegen');
  }
  if (!Array.isArray(era.territories) || era.territories.length === 0) {
    fail(where, 'ohne Gebiete');
    continue;
  }

  for (const territory of era.territories) {
    const tWhere = `${where}/${territory.id}`;
    if (typeof territory.id !== 'string' || !/^[a-z0-9-]+$/.test(territory.id)) {
      fail(tWhere, 'ungültige id');
    } else if (territoryIds.has(territory.id)) {
      fail(tWhere, `doppelte Gebiets-id "${territory.id}"`);
    } else {
      territoryIds.add(territory.id);
    }
    if (!territory.name) fail(tWhere, 'ohne Namen');
    if (!TERRITORY_KINDS.has(territory.kind)) fail(tWhere, `unbekannte kind "${territory.kind}"`);
    if (!Number.isInteger(territory.color) || territory.color < 0 || territory.color > 7) {
      fail(tWhere, `color ${territory.color} liegt außerhalb 0–7`);
    }

    const ring = territory.ring;
    if (!Array.isArray(ring) || ring.length < 3) {
      fail(tWhere, 'ring braucht mindestens drei Punkte');
      continue;
    }
    for (const point of [...ring, ...(territory.label ? [territory.label] : [])]) {
      if (!Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number') {
        fail(tWhere, `Punkt ${JSON.stringify(point)} ist kein [lat, lng]-Paar`);
        continue;
      }
      const [lat, lng] = point;
      if (
        lat < TERRITORY_BBOX.minLat || lat > TERRITORY_BBOX.maxLat ||
        lng < TERRITORY_BBOX.minLng || lng > TERRITORY_BBOX.maxLng
      ) {
        warn(tWhere, `Punkt ${lat}/${lng} liegt außerhalb der dargestellten Welt — Zahlendreher?`);
      }
    }
  }
}

const sortedEras = [...territoryEras].sort((a, b) => a.yearFrom - b.yearFrom);
for (let i = 1; i < sortedEras.length; i++) {
  const prev = sortedEras[i - 1];
  const cur = sortedEras[i];
  if (cur.yearFrom <= prev.yearTo) {
    fail('territories.json', `"${prev.name}" und "${cur.name}" überlappen sich — zu einem Jahr gehört genau ein Kartenbild`);
  } else if (cur.yearFrom > prev.yearTo + 1) {
    warn('territories.json', `zwischen "${prev.name}" und "${cur.name}" klafft eine Lücke (${prev.yearTo}…${cur.yearFrom})`);
  }
}
if (sortedEras.length) {
  const first = sortedEras[0];
  const last = sortedEras[sortedEras.length - 1];
  if (first.yearFrom > MIN_YEAR) warn('territories.json', `vor ${first.yearFrom} gibt es kein Kartenbild`);
  if (last.yearTo < MAX_YEAR) warn('territories.json', `nach ${last.yearTo} gibt es kein Kartenbild`);
}

/* ------------------------------------------------------------------ *
 * Abdeckung — keine Fehler, aber gut zu wissen
 * ------------------------------------------------------------------ */

const usedPlaces = new Set(events.map((e) => e.placeId).filter(Boolean));
for (const journey of journeys) for (const leg of journey.legs) usedPlaces.add(leg.placeId);
const orphanPlaces = [...placeIds].filter((id) => !usedPlaces.has(id));

const usedPersons = new Set(events.flatMap((e) => e.personIds));
for (const journey of journeys) for (const id of journey.personIds ?? []) usedPersons.add(id);
const orphanPersons = [...personIds].filter((id) => !usedPersons.has(id));

const usedBooks = new Set(events.filter((e) => e.ref).map((e) => e.ref.bookId));
const booksWithoutEvents = books.filter((b) => !usedBooks.has(b.id));

const ausserbiblisch = events.filter((e) => e.extrabiblical === true);

/* ------------------------------------------------------------------ *
 * Bericht
 * ------------------------------------------------------------------ */

const yearsCovered = events.map((e) => e.year);

console.log('');
console.log('  Bibleland — Datenprüfung');
console.log('  ' + '─'.repeat(58));
console.log(`  Bücher            ${String(books.length).padStart(4)}`);
console.log(`  Epochen           ${String(periods.length).padStart(4)}`);
console.log(`  Orte              ${String(placesData.length).padStart(4)}   (${orphanPlaces.length} ohne Ereignis oder Reise)`);
console.log(`  Personen          ${String(persons.length).padStart(4)}   (${orphanPersons.length} ohne Ereignis oder Reise)`);
console.log(`  Ereignisse        ${String(events.length).padStart(4)}   von ${Math.min(...yearsCovered)} bis ${Math.max(...yearsCovered)}`);
console.log(`  davon außerbiblisch ${String(ausserbiblisch.length).padStart(2)}   (ohne Bibelstelle, für den Zusammenhang)`);
console.log(`  Reisen            ${String(journeys.length).padStart(4)}`);
console.log(`  Gebietskarten     ${String(eraIds.size).padStart(4)}   (${territoryIds.size} Gebiete)`);
console.log(`  Bücher ohne Ereignis: ${booksWithoutEvents.length}`);
console.log('');

if (warnings.length) {
  console.log(`  ${warnings.length} Hinweis(e):`);
  for (const w of warnings) console.log(`    · ${w}`);
  console.log('');
}

if (errors.length) {
  console.error(`  ${errors.length} Fehler:`);
  for (const e of errors) console.error(`    ✗ ${e}`);
  console.error('');
  process.exit(1);
}

console.log('  Alle Prüfungen bestanden.');
console.log('');
