import type { EventType, NodeType, PlaceType, RelationType, Section, Testament } from '@/types';

/**
 * Anzeigetexte. Alle Kennungen im Datenmodell sind maschinenlesbare Slugs;
 * was der Nutzer sieht, steht ausschließlich hier — ein Ort für alle
 * Umbenennungen und die Anlaufstelle, falls die App je zweisprachig wird.
 */

export const SECTION_LABEL: Record<Section, string> = {
  pentateuch: 'Pentateuch',
  geschichtsbuecher: 'Geschichtsbücher',
  weisheit: 'Weisheitsliteratur',
  propheten: 'Propheten',
  evangelien: 'Evangelien',
  apostelgeschichte: 'Apostelgeschichte',
  briefe: 'Briefe',
  offenbarung: 'Offenbarung',
};

/** Der CSS-Variablenname zur Abschnittsfarbe — dieselbe Quelle wie Tailwind. */
export function sectionColorVar(section: Section): string {
  return `var(--bl-${section})`;
}

/** Farbe für alles, was zu keinem Bibelabschnitt gehört. */
export const AUSSERBIBLISCH_COLOR = 'var(--bl-ausserbiblisch)';

/**
 * Die Farbe eines Ereignisses.
 *
 * Außerbiblische Ereignisse — die Septuaginta, Pompejus, die Zerstörung des
 * Tempels im Jahr 70 — stehen im Datensatz, weil sie den Zusammenhang
 * herstellen, gehören aber zu keinem Bibelabschnitt. Sie bekommen deshalb
 * kein Abschnittsgrün oder -blau, sondern ein neutrales Grau: sichtbar, aber
 * erkennbar von anderer Art.
 */
export function eventColorVar(event: { section?: Section | undefined }): string {
  return event.section ? sectionColorVar(event.section) : AUSSERBIBLISCH_COLOR;
}

/** Anzeigename des Abschnitts, mit Ersatz für außerbiblische Ereignisse. */
export function sectionLabelOf(section: Section | undefined): string {
  return section ? SECTION_LABEL[section] : 'Außerbiblisch';
}

export const TESTAMENT_LABEL: Record<Testament, string> = {
  at: 'Altes Testament',
  nt: 'Neues Testament',
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  bund: 'Bund',
  theophanie: 'Gottesbegegnung',
  wunder: 'Wunder',
  schlacht: 'Schlacht',
  reise: 'Reise',
  geburt: 'Geburt',
  tod: 'Tod',
  prophetie: 'Prophetie',
  bau: 'Bau',
  gericht: 'Gericht',
  lehre: 'Lehre',
  politik: 'Politik',
  gruendung: 'Gründung',
};

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  stadt: 'Stadt',
  berg: 'Berg',
  gewaesser: 'Gewässer',
  region: 'Region',
  wueste: 'Wüste',
  land: 'Land',
  insel: 'Insel',
};

/**
 * Beziehungen werden aus Sicht der tragenden Person gelesen: Bei Abraham
 * steht `vater` für „Terach ist sein Vater". Deshalb sind die Bezeichnungen
 * als Rolle des Gegenübers formuliert.
 */
export const RELATION_LABEL: Record<RelationType, string> = {
  vater: 'Vater',
  mutter: 'Mutter',
  kind: 'Kind',
  ehepartner: 'Ehepartner',
  geschwister: 'Geschwister',
  vorgaenger: 'Vorgänger',
  nachfolger: 'Nachfolger',
  mentor: 'Lehrer',
  schueler: 'Schüler',
  gegner: 'Gegner',
  mitarbeiter: 'Weggefährte',
};

/** Die Gegenrichtung einer Beziehung — nötig, um den Graph symmetrisch zu machen. */
export const RELATION_INVERSE: Record<RelationType, RelationType> = {
  vater: 'kind',
  mutter: 'kind',
  kind: 'vater',
  ehepartner: 'ehepartner',
  geschwister: 'geschwister',
  vorgaenger: 'nachfolger',
  nachfolger: 'vorgaenger',
  mentor: 'schueler',
  schueler: 'mentor',
  gegner: 'gegner',
  mitarbeiter: 'mitarbeiter',
};

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  ereignis: 'Ereignis',
  person: 'Person',
  ort: 'Ort',
  buch: 'Buch',
  reise: 'Reise',
};

export const NODE_TYPE_PLURAL: Record<NodeType, string> = {
  ereignis: 'Ereignisse',
  person: 'Personen',
  ort: 'Orte',
  buch: 'Bücher',
  reise: 'Reisen',
};

/** Routensegment pro Entitätstyp — hält Links und Router-Definition beisammen. */
export const NODE_TYPE_PATH: Record<NodeType, string> = {
  ereignis: 'ereignis',
  person: 'person',
  ort: 'ort',
  buch: 'buch',
  reise: 'reise',
};

export function entityPath(type: NodeType, id: string): string {
  return `/${NODE_TYPE_PATH[type]}/${id}`;
}
