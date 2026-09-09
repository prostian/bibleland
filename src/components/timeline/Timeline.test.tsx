// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Timeline from '@/components/timeline/Timeline';
import { DEFAULT_FILTERS, useAtlasStore } from '@/store/useAtlasStore';
import { MAX_YEAR, MIN_YEAR } from '@/lib/year';

/**
 * Der Zeitstrahl soll **eine** Tabulator-Station sein, nicht hundert. Geprüft
 * wird deshalb vor allem, dass genau ein Marker erreichbar ist und die
 * Pfeiltasten den Fokus innerhalb der Reihe weitergeben — ohne dabei
 * zusätzlich den Ausschnitt zu verschieben.
 */

/** Der Zeitstrahl haengt in der App immer im Router — die Buchspur verlinkt. */
function renderTimeline(onSelectEvent: (id: string) => void = () => {}) {
  return render(
    <MemoryRouter>
      <Timeline onSelectEvent={onSelectEvent} />
    </MemoryRouter>,
  );
}

/** Alle Ereignismarker in Dokumentreihenfolge. */
function markers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-event-id]')];
}

function tabbableMarkers(): HTMLElement[] {
  return markers().filter((node) => node.getAttribute('tabindex') === '0');
}

describe('Timeline', () => {
  beforeEach(() => {
    useAtlasStore.setState({
      filters: DEFAULT_FILTERS,
      viewRange: { from: MIN_YEAR, to: MAX_YEAR },
      selectedEventId: null,
      showWrittenTrack: false,
      axisMode: 'zeit',
      activeJourneyId: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('rendert die Ereignisse als echte Knöpfe', () => {
    renderTimeline();
    const all = markers();
    expect(all.length).toBeGreaterThan(5);
    expect(all.every((node) => node.tagName === 'BUTTON')).toBe(true);
  });

  it('macht genau einen Marker mit dem Tabulator erreichbar', () => {
    renderTimeline();
    expect(tabbableMarkers()).toHaveLength(1);
  });

  it('wandert mit den Pfeiltasten zum nächsten und vorigen Ereignis', () => {
    renderTimeline();
    const first = tabbableMarkers()[0];
    expect(first).toBeDefined();
    first?.focus();

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    const second = document.activeElement as HTMLElement;
    expect(second).not.toBe(first);
    expect(second.dataset['eventId']).toBeDefined();
    // Der Fokus wandert mit — es bleibt bei genau einer Tabulator-Station.
    expect(tabbableMarkers()).toEqual([second]);

    fireEvent.keyDown(second, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(first);
  });

  it('springt mit Ende und Pos1 an die Ränder der Reihe', () => {
    renderTimeline();
    const first = tabbableMarkers()[0];
    first?.focus();

    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    const last = document.activeElement as HTMLElement;
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    // Am Ende bleibt es am Ende, statt zum Anfang zu springen.
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: 'Home' });
    expect(document.activeElement).toBe(first);
  });

  it('verschiebt beim Wandern nicht zusätzlich den Ausschnitt', () => {
    renderTimeline();
    const before = useAtlasStore.getState().viewRange;

    const first = tabbableMarkers()[0];
    first?.focus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });

    expect(useAtlasStore.getState().viewRange).toEqual(before);
  });

  it('gibt den Fokus mit Escape an den Zeitstrahl zurück', () => {
    renderTimeline();
    const first = tabbableMarkers()[0];
    first?.focus();

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('application'));
  });

  it('wählt beim Klick auf einen Marker das Ereignis aus', () => {
    const onSelect = vi.fn();
    renderTimeline(onSelect);
    const first = markers()[0];
    expect(first).toBeDefined();

    fireEvent.click(first!);
    expect(onSelect).toHaveBeenCalledWith(first!.dataset['eventId']);
  });

  it('macht die Zahl der ausgelassenen Ereignisse zu einem Bedienelement', () => {
    renderTimeline();
    const counter = screen.getByRole('button', { name: /weitere Ereignisse anzeigen$/ });
    expect(counter.getAttribute('aria-expanded')).toBe('false');
  });

  it('zeigt hinter dem Zähler alle ausgelassenen Ereignisse, nicht die ersten fünf', () => {
    renderTimeline();
    const counter = screen.getByRole('button', { name: /weitere Ereignisse anzeigen$/ });
    const expected = Number(/^(\d+)/.exec(counter.getAttribute('aria-label') ?? '')?.[1]);
    expect(expected).toBeGreaterThan(0);

    fireEvent.click(counter);
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelectorAll('li')).toHaveLength(expected);
  });

  it('wählt ein Ereignis aus der Liste wie einen Marker aus', () => {
    const onSelect = vi.fn();
    renderTimeline(onSelect);
    fireEvent.click(screen.getByRole('button', { name: /weitere Ereignisse anzeigen$/ }));

    const first = screen.getByRole('dialog').querySelector('li button');
    fireEvent.click(first!);

    expect(onSelect).toHaveBeenCalledTimes(1);
    // Die Liste schließt sich dabei — sie hat ihren Zweck erfüllt.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('schließt die Liste mit Escape und gibt den Fokus an den Zähler zurück', () => {
    renderTimeline();
    const counter = screen.getByRole('button', { name: /weitere Ereignisse anzeigen$/ });
    fireEvent.click(counter);
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(counter);
  });

  it('zeigt die Abfassungsspur im Vorgabezustand nicht', () => {
    renderTimeline();
    expect(document.querySelectorAll('[data-book-id]')).toHaveLength(0);
  });

  it('legt eingeschaltet die Bücher in eine eigene Reihe', () => {
    useAtlasStore.setState({ showWrittenTrack: true });
    renderTimeline();

    const track = screen.getByRole('toolbar', { name: /^Abfassungszeiten/ });
    const books = [...track.querySelectorAll('[data-book-id]')];
    expect(books.length).toBeGreaterThan(10);

    // Eigene Reihe heißt: kein Buch steckt in der Ereignisleiste.
    const events = screen.getByRole('toolbar', { name: /^Ereignisse/ });
    expect(books.some((node) => events.contains(node))).toBe(false);

    // Und wieder nur eine Tabulator-Station, nicht 49.
    expect(books.filter((node) => node.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('lässt die Abfassungsspur im Kapitelmodus weg — dort hat sie keinen Ort', () => {
    useAtlasStore.setState({ showWrittenTrack: true, axisMode: 'kapitel' });
    renderTimeline();
    expect(document.querySelectorAll('[data-book-id]')).toHaveLength(0);
  });

  it('zoomt auf dem Strahl selbst mit Plus und Minus', () => {
    renderTimeline();
    const track = screen.getByRole('application');
    const span = (range: { from: number; to: number }) => range.to - range.from;
    const before = span(useAtlasStore.getState().viewRange);

    fireEvent.keyDown(track, { key: '+' });
    expect(span(useAtlasStore.getState().viewRange)).toBeLessThan(before);
  });

  it('verschiebt auf dem Strahl selbst mit den Pfeiltasten', () => {
    renderTimeline();
    const track = screen.getByRole('application');
    // Erst hineinzoomen: Über den gesamten Zeitraum gibt es nichts zu verschieben.
    fireEvent.keyDown(track, { key: '+' });
    const before = useAtlasStore.getState().viewRange;

    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(useAtlasStore.getState().viewRange.from).toBeGreaterThan(before.from);
  });
});
