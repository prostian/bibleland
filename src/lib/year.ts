import type { Certainty } from '@/types';

/**
 * Umgang mit biblischen Jahreszahlen.
 *
 * Gespeichert wird historische Zählung: negativ = v. Chr., positiv = n. Chr.,
 * **es gibt kein Jahr 0**. Das Jahr -1 ist 1 v. Chr., direkt darauf folgt +1
 * als 1 n. Chr.
 *
 * Für alles Rechnerische — Abstände, Timeline-Positionen, Dauer — wird in eine
 * lückenlose Skala umgerechnet (`toContinuous`). Ohne diesen Schritt wäre der
 * Abstand zwischen 1 v. Chr. und 1 n. Chr. zwei Jahre statt einem, und die
 * Timeline hätte um Christi Geburt eine unsichtbare Lücke.
 */

export const MIN_YEAR = -2200;
export const MAX_YEAR = 100;

/** Historische Jahreszahl → lückenlose Skala für Berechnungen. */
export function toContinuous(year: number): number {
  return year < 0 ? year + 1 : year;
}

/** Lückenlose Skala → historische Jahreszahl. */
export function fromContinuous(value: number): number {
  const rounded = Math.round(value);
  return rounded <= 0 ? rounded - 1 : rounded;
}

/** Abstand zweier Jahre in tatsächlichen Jahren. */
export function yearsBetween(from: number, to: number): number {
  return toContinuous(to) - toContinuous(from);
}

/**
 * Jahreszahl als Text.
 *
 * `-1900` → „1900 v. Chr.", `30` → „30 n. Chr.". Die Epochenangabe „n. Chr."
 * wird bei kompakter Darstellung weggelassen, wenn der Kontext eindeutig ist.
 */
export function formatYear(year: number, options: { compact?: boolean } = {}): string {
  const { compact = false } = options;
  if (year < 0) return `${Math.abs(year)} v. Chr.`;
  if (compact) return `${year}`;
  return `${year} n. Chr.`;
}

/**
 * Zeitraum als Text. Liegen beide Jahre vor Christus, steht die Epoche nur
 * einmal am Ende: „1050–931 v. Chr." statt „1050 v. Chr. – 931 v. Chr.".
 */
export function formatYearRange(from: number, to: number): string {
  if (from === to) return formatYear(from);
  if (from < 0 && to < 0) return `${Math.abs(from)}–${Math.abs(to)} v. Chr.`;
  if (from > 0 && to > 0) return `${from}–${to} n. Chr.`;
  // Über die Zeitenwende hinweg müssen beide Epochen genannt werden.
  return `${formatYear(from)} – ${formatYear(to)}`;
}

/** Präfix, das die Verlässlichkeit einer Datierung sichtbar macht. */
export function certaintyPrefix(certainty: Certainty): string {
  switch (certainty) {
    case 'hoch':
      return '';
    case 'mittel':
      return 'ca. ';
    case 'niedrig':
      return 'ca. ';
    case 'symbolisch':
      return '';
  }
}

/** Klartext zur Datierungssicherheit, für Tooltips und die Detailansicht. */
export function certaintyLabel(certainty: Certainty): string {
  switch (certainty) {
    case 'hoch':
      return 'Datierung gut gesichert';
    case 'mittel':
      return 'Datierung ungefähr, Abweichungen von einigen Jahrzehnten möglich';
    case 'niedrig':
      return 'Datierung umstritten';
    case 'symbolisch':
      return 'Keine historische Datierung — Platzierung nur zur Darstellung';
  }
}

/**
 * Vollständige Datumsangabe eines Ereignisses, inklusive Unsicherheitsmarker
 * und Zeitraum.
 */
export function formatEventDate(event: {
  year: number;
  yearEnd?: number | undefined;
  certainty: Certainty;
}): string {
  const prefix = certaintyPrefix(event.certainty);
  if (event.yearEnd !== undefined && event.yearEnd !== event.year) {
    return prefix + formatYearRange(event.year, event.yearEnd);
  }
  return prefix + formatYear(event.year);
}

/**
 * Freitext in eine Jahreszahl übersetzen.
 *
 * Erkennt „1000 v. Chr.", „1000 vChr", „1000 BC", „v.Chr. 1000", „30 n. Chr.",
 * „30 AD" und eine nackte Zahl (dann als n. Chr. gelesen, außer sie ist so
 * groß, dass nur v. Chr. sinnvoll ist).
 *
 * Gibt `null` zurück, wenn nichts Brauchbares gefunden wurde.
 */
export function parseYear(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const digits = text.match(/\d{1,4}/);
  if (!digits) return null;
  const value = Number.parseInt(digits[0], 10);
  if (!Number.isFinite(value) || value === 0) return null;

  // Punkte und Leerzeichen entfernen, damit „v. Chr.", „v.Chr." und „vchr"
  // gleich behandelt werden.
  const normalized = text.replace(/[.\s]/g, '');

  const isBC = /(vchr|vc|bc|bce|vorchristus)/.test(normalized);
  const isAD = /(nchr|nc|ad|ce|nachchristus)/.test(normalized);

  if (isBC) return -value;
  if (isAD) return value;

  // Ohne Epochenangabe: Jahreszahlen oberhalb des NT-Zeitraums können in
  // dieser App nur v. Chr. gemeint sein.
  return value > MAX_YEAR ? -value : value;
}

/**
 * Zeitraum aus Freitext. Erkennt „1000–900 v. Chr.", „von 1000 bis 900 v. Chr."
 * und einzelne Jahrhundertangaben wie „8. Jahrhundert v. Chr.".
 */
export function parseYearRange(input: string): { from: number; to: number } | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const century = text.match(/(\d{1,2})\s*\.?\s*(?:jh|jahrhundert)/);
  if (century?.[1]) {
    const n = Number.parseInt(century[1], 10);
    if (n >= 1 && n <= 22) {
      const bc = /(vchr|vc|bc)/.test(text.replace(/[.\s]/g, ''));
      return bc ? { from: -(n * 100), to: -(n * 100 - 99) } : { from: (n - 1) * 100 + 1, to: n * 100 };
    }
  }

  // Zwei Zahlen, getrennt durch Bindestrich, Gedankenstrich oder „bis".
  const pair = text.match(/(\d{1,4})\s*(?:-|–|—|bis)\s*(\d{1,4})/);
  if (pair?.[1] && pair[2]) {
    const epoch = text.slice(pair.index! + pair[0].length);
    const suffix = epoch || text;
    const first = parseYear(`${pair[1]} ${suffix}`);
    const second = parseYear(`${pair[2]} ${suffix}`);
    if (first !== null && second !== null) {
      return first <= second ? { from: first, to: second } : { from: second, to: first };
    }
  }

  return null;
}

/** Begrenzt ein Jahr auf den darstellbaren Bereich der Anwendung. */
export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
}

/**
 * Das Jahrhundert, in dem ein Jahr liegt — zurückgegeben als dessen frühestes
 * Jahr. 1899 v. Chr. liegt im 19. Jahrhundert v. Chr. (1900–1801 v. Chr.),
 * also kommt -1900 heraus; 33 n. Chr. liegt im 1. Jahrhundert (1–100), also 1.
 *
 * Bewusst *ohne* `toContinuous`: Die lückenlose Skala dient dem Messen von
 * Abständen, nicht dem Benennen von Grenzen. Über sie gerechnet käme das
 * Jahrhundert um ein Jahr verschoben heraus.
 */
export function centuryOf(year: number): number {
  if (year < 0) return -(Math.ceil(Math.abs(year) / 100) * 100);
  return (Math.ceil(year / 100) - 1) * 100 + 1;
}
