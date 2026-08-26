/**
 * Datenmodell von Bibleland.
 *
 * Sechs Entitätstypen — Ereignis, Person, Ort, Reise, Epoche, Buch — bilden
 * zusammen das Wissensnetz. Ereignisse sind der Dreh- und Angelpunkt: sie
 * tragen die Zeit (Timeline), verweisen auf einen Ort (Karte) und auf
 * Personen und Bücher (Graph). Alles andere hängt daran.
 *
 * Jahreszahlen sind ganzzahlig, negativ für v. Chr. Es gibt kein Jahr 0:
 * -1 ist 1 v. Chr., +1 ist 1 n. Chr. Siehe `lib/year.ts`.
 */

/* ------------------------------------------------------------------ *
 * Kanon
 * ------------------------------------------------------------------ */

/** Die acht Bibelabschnitte, nach denen farblich gruppiert wird. */
export type Section =
  | 'pentateuch'
  | 'geschichtsbuecher'
  | 'weisheit'
  | 'propheten'
  | 'evangelien'
  | 'apostelgeschichte'
  | 'briefe'
  | 'offenbarung';

export const SECTIONS: readonly Section[] = [
  'pentateuch',
  'geschichtsbuecher',
  'weisheit',
  'propheten',
  'evangelien',
  'apostelgeschichte',
  'briefe',
  'offenbarung',
] as const;

export type Testament = 'at' | 'nt';

export interface BibleBook {
  /** Kurze, URL-taugliche Kennung: 'gen', '1sam', 'mt', 'roem'. */
  id: string;
  /** Deutscher Anzeigename: '1. Mose', 'Matthäus'. */
  name: string;
  /** Gängiger Zweitname, im AT die griechisch-lateinische Form: 'Genesis'. */
  altName?: string;
  /** Deutsche Abkürzung: '1Mo', 'Mt'. */
  abbrev: string;
  testament: Testament;
  section: Section;
  /** Position im Kanon, 1–66. */
  order: number;
  chapters: number;

  /**
   * Namensvarianten für externe Quellen. Ohne diese Tabelle lässt sich weder
   * ein Bibleserver-Link bauen noch ein Vers aus den Rohdaten ziehen.
   */
  /** Pfadsegment auf bibleserver.com, z. B. '1.Mose', 'Matthäus'. */
  bibleserver: string;
  /** USFM-Code, z. B. 'GEN', 'MAT' — genutzt von die-bibel.de. */
  usfm: string;
  /** Buchnummer 1–66 bei bolls.life und getbible. */
  sourceNr: number;
  /** Englischer Name in den scrollmapper-Datensätzen, z. B. 'Genesis'. */
  sourceName: string;
  /** Dateiname im SBLGNT-Repo, nur NT: 'Matt', 'Rom', 'Rev'. */
  sblgnt?: string;

  /** Traditionell zugeschriebener Verfasser, falls als Person modelliert. */
  authorPersonId?: string;
  /** Geschätzte Abfassungszeit — trägt Weisheitsliteratur und Briefe auf der Timeline. */
  writtenYear?: number;
  /** Ein bis zwei Sätze für die Buchseite. */
  description?: string;
}

/* ------------------------------------------------------------------ *
 * Bibelstellen
 * ------------------------------------------------------------------ */

export interface BibleRef {
  bookId: string;
  /** Anfangskapitel. */
  chapter: number;
  /** Versangabe innerhalb des Kapitels, z. B. '1-9' oder '3'. Fehlt = ganzes Kapitel. */
  verses?: string;
  /** Endkapitel bei kapitelübergreifenden Abschnitten (Gen 37–50). */
  endChapter?: number;
}

/* ------------------------------------------------------------------ *
 * Ereignisse
 * ------------------------------------------------------------------ */

/**
 * Wie sicher ist die Datierung?
 *
 * `symbolisch` ist kein Grad von Unsicherheit, sondern eine andere Kategorie:
 * Urgeschichte-Ereignisse bekommen einen Timeline-Platz, damit sie überhaupt
 * darstellbar sind — eine historische Jahreszahl wird damit nicht behauptet.
 */
export type Certainty = 'hoch' | 'mittel' | 'niedrig' | 'symbolisch';

export type EventType =
  | 'bund'
  | 'theophanie'
  | 'wunder'
  | 'schlacht'
  | 'reise'
  | 'geburt'
  | 'tod'
  | 'prophetie'
  | 'bau'
  | 'gericht'
  | 'lehre'
  | 'politik'
  | 'gruendung';

export const EVENT_TYPES: readonly EventType[] = [
  'bund',
  'theophanie',
  'wunder',
  'schlacht',
  'reise',
  'geburt',
  'tod',
  'prophetie',
  'bau',
  'gericht',
  'lehre',
  'politik',
  'gruendung',
] as const;

export interface BibleEvent {
  /** Sprechende, stabile Kennung: 'abraham-kanaan'. Teil der URL. */
  id: string;
  title: string;
  /** Jahr bzw. Beginn des Zeitraums. Negativ = v. Chr. */
  year: number;
  /** Ende des Zeitraums, falls das Ereignis sich über Jahre erstreckt. */
  yearEnd?: number;
  certainty: Certainty;
  /**
   * Bibelabschnitt — steuert die Farbe. Fehlt bei außerbiblischen
   * Ereignissen: Was nicht in der Bibel steht, gehört auch zu keinem ihrer
   * Abschnitte und wird neutral dargestellt.
   */
  section?: Section;
  eventType: EventType;

  /**
   * Hauptbelegstelle — **nur**, wenn die Bibel das Ereignis tatsächlich
   * erzählt.
   *
   * Bewusst optional. Außerbiblische Ereignisse (Septuaginta, Pompejus,
   * Tempelzerstörung 70) bekommen hier nichts: Eine Stelle anzugeben, die
   * das Ereignis gar nicht bezeugt, wäre irreführend — auch dann, wenn
   * anderswo darüber prophezeit wird.
   */
  ref?: BibleRef;
  /** Parallelen: Synoptiker, Chronik zu Könige. */
  parallelRefs?: BibleRef[];

  /** Ort des Geschehens; `null`, wenn keiner sinnvoll zuzuordnen ist. */
  placeId: string | null;
  personIds: string[];
  journeyId?: string;
  periodId: string;

  description: string;
  /**
   * Schlüsselvers als Punkt-Referenz 'gen.12.1' — Schlüssel in die
   * Vers-Stores. Bewusst getrennt vom Ereignis gehalten, damit lizenzierter
   * Text isolierbar bleibt.
   */
  keyVerseRef?: string;

  relatedEventIds?: string[];
  tags: string[];
  /** Wahr, wenn das Ereignis außerbiblisch belegt, aber für den Kontext wichtig ist. */
  extrabiblical?: boolean;
}

/* ------------------------------------------------------------------ *
 * Orte
 * ------------------------------------------------------------------ */

export type PlaceType = 'stadt' | 'berg' | 'gewaesser' | 'region' | 'wueste' | 'land' | 'insel';

export interface Place {
  id: string;
  name: string;
  /** Weitere biblische Namen: Salem, Jebus für Jerusalem. Fließt in die Suche. */
  aliases: string[];
  /** Heutiger Name und Staat, soweit identifizierbar. */
  modernName?: string;
  greekName?: string;
  lat: number;
  lng: number;
  type: PlaceType;
  /** Grobe geografische Zuordnung: 'Judäa', 'Galiläa', 'Mesopotamien'. */
  region: string;
  description: string;
  /**
   * Wie sicher ist die Lokalisierung? Manche Orte (Berg Sinai, Kadesch-Barnea)
   * sind archäologisch umstritten — das gehört sichtbar gemacht.
   */
  locationCertainty?: Certainty;
}

/* ------------------------------------------------------------------ *
 * Personen
 * ------------------------------------------------------------------ */

export type RelationType =
  | 'vater'
  | 'mutter'
  | 'kind'
  | 'ehepartner'
  | 'geschwister'
  | 'vorgaenger'
  | 'nachfolger'
  | 'mentor'
  | 'schueler'
  | 'gegner'
  | 'mitarbeiter';

/**
 * Eine gerichtete Beziehung, gelesen aus Sicht der tragenden Person:
 * `{ type: 'vater', personId: 'terach' }` an Abraham bedeutet
 * „Terach ist Abrahams Vater".
 */
export interface PersonRelation {
  type: RelationType;
  personId: string;
  note?: string;
}

export interface Person {
  id: string;
  name: string;
  /** Namenswechsel und Varianten: Abram, Saulus, Kephas. */
  aliases: string[];
  greekName?: string;
  hebrewName?: string;
  /** Kurze Rollenbezeichnung: 'Patriarch', 'König von Juda', 'Apostel'. */
  role: string;
  birthYear?: number;
  deathYear?: number;
  /** Regierungszeit bei Königen — auf der Personenseite als Balken dargestellt. */
  reignStart?: number;
  reignEnd?: number;
  tribe?: string;
  description: string;
  relations: PersonRelation[];
  /** Wichtigste Stelle zur Person, für den Absprung in den Text. */
  primaryRef?: BibleRef;
}

/* ------------------------------------------------------------------ *
 * Reisen
 * ------------------------------------------------------------------ */

export interface JourneyLeg {
  placeId: string;
  /** Reihenfolge der Etappe, beginnend bei 1. */
  order: number;
  /** Ereignis, das an dieser Etappe stattfand. */
  eventId?: string;
  note?: string;
}

export interface Journey {
  id: string;
  title: string;
  personIds: string[];
  yearStart: number;
  yearEnd: number;
  /** Name eines Abschnitts-Farbtokens, z. B. 'apostelgeschichte'. */
  colorToken: Section;
  description: string;
  legs: JourneyLeg[];
  /**
   * Route archäologisch umstritten (Exodus, Wüstenwanderung)? Dann wird die
   * Linie gestrichelt gezeichnet statt durchgezogen.
   */
  routeCertainty?: Certainty;
}

/* ------------------------------------------------------------------ *
 * Epochen
 * ------------------------------------------------------------------ */

export interface Period {
  id: string;
  name: string;
  yearStart: number;
  yearEnd: number;
  colorToken: Section;
  description: string;
}

/* ------------------------------------------------------------------ *
 * Verse
 * ------------------------------------------------------------------ */

/**
 * Textfassungen, zwischen denen die Detailansicht umschaltet.
 *
 * `woertlich` ist keine eigene Sprache, sondern eine deutsche Übersetzung
 * mit formaler Äquivalenz — sie bildet den Satzbau der Ursprache so eng wie
 * möglich nach. Sie steht neben `de`, weil eine gut lesbare und eine
 * wörtliche Wiedergabe verschiedene Fragen beantworten.
 */
export type VerseLanguage = 'de' | 'woertlich' | 'grc' | 'hbo';

export interface VerseEntry {
  /** Anzeigefertige Stellenangabe: '1. Mose 12,1'. */
  ref: string;
  text: string;
}

/** Schlüssel ist eine Punkt-Referenz wie 'gen.12.1'. */
export type VerseStore = Record<string, VerseEntry>;

export interface VerseSourceInfo {
  /** Anzeigename der Ausgabe: 'Schlachter 2000'. */
  name: string;
  /** Kurzform für Badges: 'SLT'. */
  short: string;
  language: VerseLanguage;
  /** Lizenz- bzw. Rechtehinweis, wird in der App angezeigt. */
  license: string;
  /** Wahr, wenn der Text nur lokal vorliegt und nicht weitergegeben werden darf. */
  restricted: boolean;
}

export interface VerseBundle {
  source: VerseSourceInfo;
  verses: VerseStore;
}

/* ------------------------------------------------------------------ *
 * Wissensnetz
 * ------------------------------------------------------------------ */

export type NodeType = 'ereignis' | 'person' | 'ort' | 'buch' | 'reise';

export type EdgeType =
  | 'nahm_teil_an'
  | 'fand_statt_in'
  | 'beschrieben_in'
  | 'etappe_von'
  | 'verwandt_mit'
  | 'verknuepft_mit';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  /** Jahr zur Einfärbung/Filterung, falls die Entität datierbar ist. */
  year?: number;
  section?: Section;
  /** Grad im Graph — steuert den Knotenradius. */
  degree: number;
  /* Von d3-force zur Laufzeit gesetzt. */
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: EdgeType;
  /** Feinere Beschriftung, z. B. der konkrete Verwandtschaftsgrad. */
  label?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ------------------------------------------------------------------ *
 * Suche
 * ------------------------------------------------------------------ */

export type SearchResultKind = NodeType | 'stelle';

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  /** Kleiner als besser — vereinheitlichter Rang über alle Trefferquellen. */
  score: number;
  /** Bei Jahres- und Zeitraumsuchen: das gemeinte Fenster. */
  yearRange?: { from: number; to: number };
}

/** Ergebnis des Suchtext-Parsers, bevor gesucht wird. */
export interface ParsedQuery {
  raw: string;
  /** Freitextanteil nach Abzug der erkannten Strukturen. */
  text: string;
  bookId?: string;
  chapter?: number;
  verse?: number;
  year?: number;
  yearRange?: { from: number; to: number };
}
