import type { EdgeType, GraphEdge, GraphNode, KnowledgeGraph, NodeType } from '@/types';
import { books, events, journeys, persons, places } from '@/lib/dataset';
import { RELATION_LABEL } from '@/lib/labels';

/**
 * Baut aus den Datendateien ein Netz aus Knoten und Kanten.
 *
 * Ereignisse sind die Naben: Sie verbinden Personen mit Orten, Orte mit
 * Büchern und alles mit der Zeit. Ohne sie zerfiele der Bestand in fünf
 * unverbundene Listen.
 *
 * Kanten sind hier ungerichtet gedacht — die Richtung steckt im Typ und im
 * Etikett („Vater von"), nicht in der Reihenfolge von Quelle und Ziel. Für
 * die Kräftesimulation ist das ohnehin unerheblich.
 */

/** Zusammengesetzte Knotenkennung: Ohne Präfix kollidieren Kennungen zwischen Typen. */
export function nodeKey(type: NodeType, id: string): string {
  return `${type}:${id}`;
}

export function splitNodeKey(key: string): { type: NodeType; id: string } | null {
  const index = key.indexOf(':');
  if (index === -1) return null;
  return { type: key.slice(0, index) as NodeType, id: key.slice(index + 1) };
}

let cached: KnowledgeGraph | null = null;

/** Das vollständige Netz. Wird beim ersten Aufruf gebaut und gemerkt. */
export function buildGraph(): KnowledgeGraph {
  if (cached) return cached;

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  const addNode = (type: NodeType, id: string, label: string, extra: Partial<GraphNode> = {}) => {
    const key = nodeKey(type, id);
    if (!nodes.has(key)) nodes.set(key, { id: key, type, label, degree: 0, ...extra });
    return key;
  };

  const addEdge = (source: string, target: string, type: EdgeType, label?: string) => {
    if (source === target) return;
    // Kantenrichtung für die Dublettenprüfung normalisieren.
    const key = source < target ? `${source}|${target}|${type}` : `${target}|${source}|${type}`;
    if (seenEdges.has(key)) return;
    seenEdges.add(key);
    edges.push({ source, target, type, ...(label ? { label } : {}) });
  };

  /* --- Knoten ---------------------------------------------------- */

  for (const person of persons) {
    addNode('person', person.id, person.name, {
      ...(person.birthYear !== undefined ? { year: person.birthYear } : {}),
    });
  }
  for (const place of places) addNode('ort', place.id, place.name);
  for (const book of books) addNode('buch', book.id, book.name, { section: book.section });
  for (const journey of journeys) {
    addNode('reise', journey.id, journey.title, { year: journey.yearStart });
  }
  for (const event of events) {
    addNode('ereignis', event.id, event.title, { year: event.year, section: event.section });
  }

  /* --- Kanten ---------------------------------------------------- */

  for (const event of events) {
    const eventKey = nodeKey('ereignis', event.id);

    for (const personId of event.personIds) {
      addEdge(eventKey, nodeKey('person', personId), 'nahm_teil_an');
    }
    if (event.placeId) {
      addEdge(eventKey, nodeKey('ort', event.placeId), 'fand_statt_in');
    }
    // Außerbiblische Ereignisse haben keine Stelle und damit keine Kante zu
    // einem Buch — sie hängen nur über Ort und Personen im Netz.
    if (event.ref) addEdge(eventKey, nodeKey('buch', event.ref.bookId), 'beschrieben_in');
    for (const ref of event.parallelRefs ?? []) {
      addEdge(eventKey, nodeKey('buch', ref.bookId), 'beschrieben_in');
    }
    if (event.journeyId) {
      addEdge(eventKey, nodeKey('reise', event.journeyId), 'etappe_von');
    }
    for (const relatedId of event.relatedEventIds ?? []) {
      addEdge(eventKey, nodeKey('ereignis', relatedId), 'verknuepft_mit');
    }
  }

  for (const person of persons) {
    const personKey = nodeKey('person', person.id);
    for (const relation of person.relations) {
      addEdge(
        personKey,
        nodeKey('person', relation.personId),
        'verwandt_mit',
        RELATION_LABEL[relation.type],
      );
    }
  }

  for (const journey of journeys) {
    const journeyKey = nodeKey('reise', journey.id);
    for (const personId of journey.personIds) {
      addEdge(journeyKey, nodeKey('person', personId), 'nahm_teil_an');
    }
    for (const leg of journey.legs) {
      addEdge(journeyKey, nodeKey('ort', leg.placeId), 'etappe_von');
    }
  }

  for (const book of books) {
    if (book.authorPersonId) {
      addEdge(nodeKey('buch', book.id), nodeKey('person', book.authorPersonId), 'verknuepft_mit', 'Verfasser');
    }
  }

  /* --- Grad ------------------------------------------------------ */

  for (const edge of edges) {
    const source = nodes.get(edge.source as string);
    const target = nodes.get(edge.target as string);
    if (source) source.degree += 1;
    if (target) target.degree += 1;
  }

  cached = { nodes: [...nodes.values()], edges };
  return cached;
}

/** Nachbarschaftsliste — Grundlage für die Umkreissuche. */
function adjacency(graph: KnowledgeGraph): Map<string, string[]> {
  const map = new Map<string, string[]>();

  const link = (from: string, to: string) => {
    const bucket = map.get(from);
    if (bucket) bucket.push(to);
    else map.set(from, [to]);
  };

  for (const edge of graph.edges) {
    const source = edge.source as string;
    const target = edge.target as string;
    link(source, target);
    link(target, source);
  }
  return map;
}

let cachedAdjacency: Map<string, string[]> | null = null;

/**
 * Der Ausschnitt um einen Knoten herum, bis zu einer bestimmten Tiefe.
 *
 * Das vollständige Netz hat mehrere hundert Knoten und über tausend Kanten —
 * als Ganzes gezeichnet ist es ein Wollknäuel, aus dem sich nichts ablesen
 * lässt. Der Umkreis um eine gewählte Entität ist die Ansicht, die tatsächlich
 * etwas erzählt: „Wer und was hängt mit Paulus zusammen?"
 */
export function egoGraph(centerKey: string, depth = 2, maxNodes = 160): KnowledgeGraph {
  const graph = buildGraph();
  cachedAdjacency ??= adjacency(graph);

  const distances = new Map<string, number>([[centerKey, 0]]);
  const queue: string[] = [centerKey];

  // Breitensuche: Sie garantiert, dass bei Erreichen der Obergrenze die
  // *nächsten* Nachbarn drin sind und nicht ein zufälliger Fernbereich.
  while (queue.length > 0 && distances.size < maxNodes) {
    const current = queue.shift()!;
    const currentDistance = distances.get(current)!;
    if (currentDistance >= depth) continue;

    for (const neighbour of cachedAdjacency.get(current) ?? []) {
      if (distances.has(neighbour)) continue;
      distances.set(neighbour, currentDistance + 1);
      queue.push(neighbour);
      if (distances.size >= maxNodes) break;
    }
  }

  const included = new Set(distances.keys());
  return {
    nodes: graph.nodes.filter((node) => included.has(node.id)),
    edges: graph.edges.filter(
      (edge) => included.has(edge.source as string) && included.has(edge.target as string),
    ),
  };
}

/** Die am stärksten vernetzten Knoten — Einstiegspunkte für die Vollansicht. */
export function hubs(limit = 12): GraphNode[] {
  return [...buildGraph().nodes].sort((a, b) => b.degree - a.degree).slice(0, limit);
}

export const EDGE_LABEL: Record<EdgeType, string> = {
  nahm_teil_an: 'beteiligt an',
  fand_statt_in: 'fand statt in',
  beschrieben_in: 'beschrieben in',
  etappe_von: 'Etappe von',
  verwandt_mit: 'verwandt mit',
  verknuepft_mit: 'verknüpft mit',
};
