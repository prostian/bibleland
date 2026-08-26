import { describe, expect, it } from 'vitest';

import { parseQuery, search } from '@/lib/search';

/**
 * Die fünf Beispielanfragen aus der Aufgabenstellung sind hier als Tests
 * festgehalten — sie beschreiben, was die Suche mindestens können muss.
 */

describe('parseQuery', () => {
  it('erkennt Buch und Kapitel in „Genesis 12"', () => {
    const parsed = parseQuery('Genesis 12');
    expect(parsed.bookId).toBe('gen');
    expect(parsed.chapter).toBe(12);
  });

  it('erkennt die deutsche Buchbezeichnung „1. Mose 12"', () => {
    const parsed = parseQuery('1. Mose 12');
    expect(parsed.bookId).toBe('gen');
    expect(parsed.chapter).toBe(12);
  });

  it('erkennt Abkürzung, Kapitel und Vers in „Mt 5,3"', () => {
    const parsed = parseQuery('Mt 5,3');
    expect(parsed.bookId).toBe('mt');
    expect(parsed.chapter).toBe(5);
    expect(parsed.verse).toBe(3);
  });

  it('erkennt eine Jahresangabe', () => {
    expect(parseQuery('1000 v. Chr.').year).toBe(-1000);
  });

  it('erkennt eine Jahrhundertangabe als Zeitraum', () => {
    expect(parseQuery('8. Jahrhundert v. Chr.').yearRange).toEqual({ from: -800, to: -701 });
  });

  it('deutet „Psalm 23" als Stelle, nicht als Jahreszahl', () => {
    const parsed = parseQuery('Psalm 23');
    expect(parsed.bookId).toBe('ps');
    expect(parsed.chapter).toBe(23);
    expect(parsed.year).toBeUndefined();
  });

  it('lässt reinen Freitext unangetastet', () => {
    const parsed = parseQuery('Moses');
    expect(parsed.bookId).toBeUndefined();
    expect(parsed.year).toBeUndefined();
    expect(parsed.text).toBe('Moses');
  });
});

describe('search — die Beispielanfragen aus der Spezifikation', () => {
  it('„Genesis 12" findet das Buch und Ereignisse aus Kapitel 12', () => {
    const results = search('Genesis 12');
    expect(results.some((r) => r.kind === 'buch' && r.id === 'gen')).toBe(true);
    expect(results.some((r) => r.kind === 'ereignis' && r.id === 'abraham-kanaan')).toBe(true);
  });

  it('„Moses" findet die Person Mose', () => {
    const results = search('Moses');
    expect(results.some((r) => r.kind === 'person' && r.id === 'mose')).toBe(true);
  });

  it('„Jerusalem" findet den Ort', () => {
    const results = search('Jerusalem');
    expect(results.some((r) => r.kind === 'ort' && r.id === 'jerusalem')).toBe(true);
  });

  it('„1000 v. Chr." findet Ereignisse aus dieser Zeit', () => {
    const results = search('1000 v. Chr.');
    const treffer = results.filter((r) => r.kind === 'ereignis');
    expect(treffer.length).toBeGreaterThan(0);
  });

  it('„Paulus zweite Missionsreise" findet die Reise', () => {
    const results = search('Paulus zweite Missionsreise');
    expect(results.some((r) => r.kind === 'reise' && r.id === 'paulus-2')).toBe(true);
  });
});

describe('search — Robustheit', () => {
  it('gibt bei leerer Eingabe nichts zurück', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
  });

  it('findet über Namensvarianten — „Abram" führt zu Abraham', () => {
    const results = search('Abram');
    expect(results.some((r) => r.kind === 'person' && r.id === 'abraham')).toBe(true);
  });

  it('findet über Ortsvarianten — „Jebus" führt zu Jerusalem', () => {
    const results = search('Jebus');
    expect(results.some((r) => r.kind === 'ort' && r.id === 'jerusalem')).toBe(true);
  });

  it('verzeiht einen Tippfehler', () => {
    const results = search('Jerusalm');
    expect(results.some((r) => r.kind === 'ort' && r.id === 'jerusalem')).toBe(true);
  });

  it('liefert keine Duplikate', () => {
    const results = search('Genesis 12');
    const keys = results.map((r) => `${r.kind}:${r.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('hält die Obergrenze ein', () => {
    expect(search('a', 10).length).toBeLessThanOrEqual(10);
  });
});
