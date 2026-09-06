import { describe, expect, it } from 'vitest';

import { decodeAtlasState, encodeAtlasState, type AtlasUrlState } from '@/lib/urlState';
import { DEFAULT_READING_SCOPE } from '@/store/useAtlasStore';
import { MAX_YEAR, MIN_YEAR } from '@/lib/year';

/**
 * Der wichtigste Test ist der erste: Ein unberührter Atlas muss eine leere
 * Adresse ergeben. Alles andere in dieser Datei prüft, dass ein alter oder
 * verstümmelter Link die Seite nicht leerräumt.
 */

const DEFAULTS: AtlasUrlState = {
  sections: [],
  bookIds: [],
  eventTypes: [],
  personIds: [],
  activeJourneyId: null,
  years: { from: MIN_YEAR, to: MAX_YEAR },
  query: '',
  axisMode: 'zeit',
  readingScope: DEFAULT_READING_SCOPE,
  borders: { mode: 'auto', eraId: 'herodianisch' },
  linkMapToTimeline: false,
};

const encode = (patch: Partial<AtlasUrlState> = {}) =>
  encodeAtlasState({ ...DEFAULTS, ...patch }).toString();

describe('encodeAtlasState', () => {
  it('schreibt für den Vorgabezustand keinen einzigen Parameter', () => {
    expect(encode()).toBe('');
  });

  it('schreibt Abschnitt und Zeitfenster', () => {
    const params = encode({ sections: ['propheten'], years: { from: -800, to: -700 } });
    expect(params).toContain('a=propheten');
    expect(params).toContain('y=-800%3A-700');
  });

  it('fasst mehrere Werte kommagetrennt zusammen', () => {
    expect(encode({ bookIds: ['jes', 'mt'] })).toBe('b=jes%2Cmt');
  });

  it('lässt den Lesebereich weg, solange er der Vorgabe entspricht', () => {
    expect(encode({ axisMode: 'kapitel' })).toBe('m=kapitel');
  });

  it('schreibt einen abweichenden Lesebereich mit', () => {
    const params = encode({ axisMode: 'kapitel', readingScope: { kind: 'buch', id: 'mt' } });
    expect(params).toContain('s=buch%3Amt');
  });

  it('schreibt den Lesebereich nicht ohne Kapitelmodus — er wirkte dort nicht', () => {
    expect(encode({ readingScope: { kind: 'buch', id: 'mt' } })).toBe('');
  });

  it('schreibt die Grenzebene nur, wenn sie von der Automatik abweicht', () => {
    expect(encode({ borders: { mode: 'auto', eraId: 'herodianisch' } })).toBe('');
    expect(encode({ borders: { mode: 'aus', eraId: 'herodianisch' } })).toBe('g=aus');
    expect(encode({ borders: { mode: 'fest', eraId: 'eisenzeit-2' } })).toBe('g=eisenzeit-2');
  });

  it('schreibt die Kopplung von Karte und Zeitstrahl nur im eingeschalteten Fall', () => {
    expect(encode({ linkMapToTimeline: true })).toBe('l=1');
  });
});

describe('decodeAtlasState', () => {
  const decode = (search: string) => decodeAtlasState(new URLSearchParams(search));

  it('liest eine leere Adresse als leere Änderung', () => {
    expect(decode('')).toEqual({});
  });

  it('liest Abschnitte und Bücher', () => {
    const state = decode('a=propheten&b=jes,mt');
    expect(state.sections).toEqual(['propheten']);
    expect(state.bookIds).toEqual(['jes', 'mt']);
  });

  it('verwirft unbekannte Buchkennungen still', () => {
    expect(decode('b=gibtsnicht')).toEqual({});
    expect(decode('b=gibtsnicht,mt').bookIds).toEqual(['mt']);
  });

  it('verwirft unbekannte Abschnitte, Ereignisarten und Personen', () => {
    expect(decode('a=quatsch&t=quatsch&p=quatsch')).toEqual({});
  });

  it('entfernt Doppelnennungen', () => {
    expect(decode('b=mt,mt,jes').bookIds).toEqual(['mt', 'jes']);
  });

  it('liest ein Zeitfenster mit negativen Jahren', () => {
    expect(decode('y=-1000:-900').years).toEqual({ from: -1000, to: -900 });
  });

  it('dreht ein verkehrt herum angegebenes Zeitfenster um', () => {
    expect(decode('y=-900:-1000').years).toEqual({ from: -1000, to: -900 });
  });

  it('begrenzt ein Zeitfenster auf den darstellbaren Bereich', () => {
    expect(decode('y=-9999:9999').years).toEqual({ from: MIN_YEAR, to: MAX_YEAR });
  });

  it('verwirft ein Zeitfenster, das kein Doppelpunktpaar ist', () => {
    expect(decode('y=-1000')).toEqual({});
    expect(decode('y=-1000:-900:-800')).toEqual({});
    expect(decode('y=frueher:spaeter')).toEqual({});
  });

  it('verwirft das Jahr 0 — es gibt keins', () => {
    expect(decode('y=0:100')).toEqual({});
  });

  it('liest Kapitelmodus und Lesebereich', () => {
    const state = decode('m=kapitel&s=abschnitt:propheten');
    expect(state.axisMode).toBe('kapitel');
    expect(state.readingScope).toEqual({ kind: 'abschnitt', id: 'propheten' });
  });

  it('verwirft einen Lesebereich mit unbekannter Kennung', () => {
    expect(decode('s=buch:gibtsnicht')).toEqual({});
    expect(decode('s=quatsch:gen')).toEqual({});
  });

  it('liest die Grenzebene in allen drei Formen', () => {
    expect(decode('g=aus').borders).toEqual({ mode: 'aus', eraId: '' });
    expect(decode('g=auto').borders).toEqual({ mode: 'auto', eraId: '' });
    expect(decode('g=eisenzeit-2').borders).toEqual({ mode: 'fest', eraId: 'eisenzeit-2' });
  });

  it('verwirft eine Grenzebene mit unzulässigen Zeichen', () => {
    expect(decode('g=Eisenzeit 2')).toEqual({});
  });

  it('liest die Kopplung nur bei genau „1"', () => {
    expect(decode('l=1').linkMapToTimeline).toBe(true);
    expect(decode('l=0')).toEqual({});
  });
});

describe('Hin- und Rückweg', () => {
  it('erhält eine vollständig eingestellte Ansicht', () => {
    const state: AtlasUrlState = {
      ...DEFAULTS,
      sections: ['propheten'],
      bookIds: ['jes'],
      eventTypes: ['schlacht'],
      personIds: ['paulus'],
      activeJourneyId: 'paulus-2',
      years: { from: -800, to: -700 },
      query: 'tempel',
      borders: { mode: 'fest', eraId: 'eisenzeit-2' },
      linkMapToTimeline: true,
    };

    const back = decodeAtlasState(encodeAtlasState(state));

    expect(back.sections).toEqual(state.sections);
    expect(back.bookIds).toEqual(state.bookIds);
    expect(back.eventTypes).toEqual(state.eventTypes);
    expect(back.personIds).toEqual(state.personIds);
    expect(back.activeJourneyId).toBe(state.activeJourneyId);
    expect(back.years).toEqual(state.years);
    expect(back.query).toBe(state.query);
    expect(back.borders).toEqual(state.borders);
    expect(back.linkMapToTimeline).toBe(true);
  });

  it('erhält den Kapitelmodus samt Lesebereich', () => {
    const state: AtlasUrlState = {
      ...DEFAULTS,
      axisMode: 'kapitel',
      readingScope: { kind: 'buch', id: 'mt' },
    };

    const back = decodeAtlasState(encodeAtlasState(state));
    expect(back.axisMode).toBe('kapitel');
    expect(back.readingScope).toEqual({ kind: 'buch', id: 'mt' });
  });
});
