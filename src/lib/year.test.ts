import { describe, expect, it } from 'vitest';
import {
  centuryOf,
  formatEventDate,
  formatYear,
  formatYearRange,
  fromContinuous,
  parseYear,
  parseYearRange,
  toContinuous,
  yearsBetween,
} from '@/lib/year';

describe('lückenlose Skala', () => {
  it('lässt Jahre nach Christus unverändert', () => {
    expect(toContinuous(30)).toBe(30);
    expect(toContinuous(1)).toBe(1);
  });

  it('verschiebt Jahre vor Christus um eins, weil es kein Jahr 0 gibt', () => {
    expect(toContinuous(-1)).toBe(0);
    expect(toContinuous(-1900)).toBe(-1899);
  });

  it('misst über die Zeitenwende hinweg richtig — 1 v. Chr. bis 1 n. Chr. ist ein Jahr', () => {
    expect(yearsBetween(-1, 1)).toBe(1);
  });

  it('rechnet ohne die Korrektur falsch — Gegenprobe', () => {
    // Die naive Differenz wäre 2. Genau diesen Fehler verhindert toContinuous.
    expect(1 - -1).toBe(2);
    expect(yearsBetween(-1, 1)).not.toBe(2);
  });

  it('ist umkehrbar und überspringt dabei die Null', () => {
    for (const year of [-2200, -1000, -1, 1, 30, 100]) {
      expect(fromContinuous(toContinuous(year))).toBe(year);
    }
    expect(fromContinuous(0)).toBe(-1);
  });

  it('misst gewöhnliche Zeiträume unverändert', () => {
    expect(yearsBetween(-1050, -931)).toBe(119);
    expect(yearsBetween(30, 100)).toBe(70);
  });
});

describe('formatYear', () => {
  it('schreibt Jahre vor Christus ohne Minuszeichen aus', () => {
    expect(formatYear(-1900)).toBe('1900 v. Chr.');
  });

  it('kennzeichnet Jahre nach Christus', () => {
    expect(formatYear(30)).toBe('30 n. Chr.');
  });

  it('lässt die Epoche im Kompaktmodus nur nach Christus weg', () => {
    expect(formatYear(30, { compact: true })).toBe('30');
    expect(formatYear(-30, { compact: true })).toBe('30 v. Chr.');
  });
});

describe('formatYearRange', () => {
  it('nennt die Epoche innerhalb von v. Chr. nur einmal', () => {
    expect(formatYearRange(-1050, -931)).toBe('1050–931 v. Chr.');
  });

  it('nennt die Epoche innerhalb von n. Chr. nur einmal', () => {
    expect(formatYearRange(49, 52)).toBe('49–52 n. Chr.');
  });

  it('nennt über die Zeitenwende hinweg beide Epochen', () => {
    expect(formatYearRange(-6, 33)).toBe('6 v. Chr. – 33 n. Chr.');
  });

  it('kürzt ab, wenn Anfang und Ende gleich sind', () => {
    expect(formatYearRange(-586, -586)).toBe('586 v. Chr.');
  });
});

describe('formatEventDate', () => {
  it('setzt bei gesicherter Datierung kein „ca."', () => {
    expect(formatEventDate({ year: -586, certainty: 'hoch' })).toBe('586 v. Chr.');
  });

  it('kennzeichnet unsichere Datierungen mit „ca."', () => {
    expect(formatEventDate({ year: -1900, certainty: 'niedrig' })).toBe('ca. 1900 v. Chr.');
  });

  it('stellt Zeiträume als Spanne dar', () => {
    expect(formatEventDate({ year: 49, yearEnd: 52, certainty: 'hoch' })).toBe('49–52 n. Chr.');
  });

  it('behandelt yearEnd gleich year wie ein Einzeljahr', () => {
    expect(formatEventDate({ year: -931, yearEnd: -931, certainty: 'hoch' })).toBe('931 v. Chr.');
  });
});

describe('parseYear', () => {
  it('erkennt die gängigen deutschen Schreibweisen für v. Chr.', () => {
    for (const input of ['1000 v. Chr.', '1000 v.Chr.', '1000 vChr', '1000 vor Christus', '1000 BC']) {
      expect(parseYear(input)).toBe(-1000);
    }
  });

  it('erkennt Angaben nach Christus', () => {
    expect(parseYear('30 n. Chr.')).toBe(30);
    expect(parseYear('70 AD')).toBe(70);
  });

  it('liest eine nackte kleine Zahl als n. Chr.', () => {
    expect(parseYear('33')).toBe(33);
  });

  it('liest eine nackte große Zahl als v. Chr., weil sie sonst außerhalb des Zeitraums läge', () => {
    expect(parseYear('1000')).toBe(-1000);
  });

  it('gibt null zurück, wenn keine Zahl vorkommt', () => {
    expect(parseYear('Jerusalem')).toBeNull();
    expect(parseYear('')).toBeNull();
  });

  it('lehnt das nicht existierende Jahr 0 ab', () => {
    expect(parseYear('0')).toBeNull();
  });
});

describe('parseYearRange', () => {
  it('erkennt eine Spanne mit Bindestrich', () => {
    expect(parseYearRange('1000-900 v. Chr.')).toEqual({ from: -1000, to: -900 });
  });

  it('erkennt eine Spanne mit „bis"', () => {
    expect(parseYearRange('1000 bis 900 v. Chr.')).toEqual({ from: -1000, to: -900 });
  });

  it('dreht eine verkehrt herum eingegebene Spanne um', () => {
    expect(parseYearRange('900-1000 v. Chr.')).toEqual({ from: -1000, to: -900 });
  });

  it('erkennt Jahrhundertangaben vor Christus', () => {
    expect(parseYearRange('8. Jahrhundert v. Chr.')).toEqual({ from: -800, to: -701 });
  });

  it('erkennt Jahrhundertangaben nach Christus', () => {
    expect(parseYearRange('1. Jahrhundert')).toEqual({ from: 1, to: 100 });
  });

  it('gibt null zurück, wenn keine Spanne erkennbar ist', () => {
    expect(parseYearRange('Paulus')).toBeNull();
  });
});

describe('centuryOf', () => {
  it('ordnet 1899 v. Chr. dem 19. Jahrhundert v. Chr. zu, das 1900 v. Chr. beginnt', () => {
    expect(centuryOf(-1899)).toBe(-1900);
  });

  it('lässt ein glattes Jahrhundert bei sich selbst', () => {
    expect(centuryOf(-1900)).toBe(-1900);
  });

  it('schiebt 1901 v. Chr. ins nächstältere Jahrhundert', () => {
    expect(centuryOf(-1901)).toBe(-2000);
  });

  it('ordnet 33 n. Chr. dem 1. Jahrhundert zu, das im Jahr 1 beginnt', () => {
    expect(centuryOf(33)).toBe(1);
  });

  it('rechnet das Jahr 100 noch zum 1. Jahrhundert', () => {
    expect(centuryOf(100)).toBe(1);
    expect(centuryOf(101)).toBe(101);
  });
});
