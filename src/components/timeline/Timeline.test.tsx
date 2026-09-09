// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import Timeline from '@/components/timeline/Timeline';
import { DEFAULT_FILTERS, useAtlasStore } from '@/store/useAtlasStore';
import { MAX_YEAR, MIN_YEAR } from '@/lib/year';

/**
 * Der Zeitstrahl soll **eine** Tabulator-Station sein, nicht hundert. Geprüft
 * wird deshalb vor allem, dass genau ein Marker erreichbar ist und die
 * Pfeiltasten den Fokus innerhalb der Reihe weitergeben — ohne dabei
 * zusätzlich den Ausschnitt zu verschieben.
 */

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
      axisMode: 'zeit',
      activeJourneyId: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('rendert die Ereignisse als echte Knöpfe', () => {
    render(<Timeline onSelectEvent={() => {}} />);
    const all = markers();
    expect(all.length).toBeGreaterThan(5);
    expect(all.every((node) => node.tagName === 'BUTTON')).toBe(true);
  });

  it('macht genau einen Marker mit dem Tabulator erreichbar', () => {
    render(<Timeline onSelectEvent={() => {}} />);
    expect(tabbableMarkers()).toHaveLength(1);
  });

  it('wandert mit den Pfeiltasten zum nächsten und vorigen Ereignis', () => {
    render(<Timeline onSelectEvent={() => {}} />);
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
    render(<Timeline onSelectEvent={() => {}} />);
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
    render(<Timeline onSelectEvent={() => {}} />);
    const before = useAtlasStore.getState().viewRange;

    const first = tabbableMarkers()[0];
    first?.focus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });

    expect(useAtlasStore.getState().viewRange).toEqual(before);
  });

  it('gibt den Fokus mit Escape an den Zeitstrahl zurück', () => {
    render(<Timeline onSelectEvent={() => {}} />);
    const first = tabbableMarkers()[0];
    first?.focus();

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('application'));
  });

  it('wählt beim Klick auf einen Marker das Ereignis aus', () => {
    const onSelect = vi.fn();
    render(<Timeline onSelectEvent={onSelect} />);
    const first = markers()[0];
    expect(first).toBeDefined();

    fireEvent.click(first!);
    expect(onSelect).toHaveBeenCalledWith(first!.dataset['eventId']);
  });

  it('zoomt auf dem Strahl selbst mit Plus und Minus', () => {
    render(<Timeline onSelectEvent={() => {}} />);
    const track = screen.getByRole('application');
    const span = (range: { from: number; to: number }) => range.to - range.from;
    const before = span(useAtlasStore.getState().viewRange);

    fireEvent.keyDown(track, { key: '+' });
    expect(span(useAtlasStore.getState().viewRange)).toBeLessThan(before);
  });

  it('verschiebt auf dem Strahl selbst mit den Pfeiltasten', () => {
    render(<Timeline onSelectEvent={() => {}} />);
    const track = screen.getByRole('application');
    // Erst hineinzoomen: Über den gesamten Zeitraum gibt es nichts zu verschieben.
    fireEvent.keyDown(track, { key: '+' });
    const before = useAtlasStore.getState().viewRange;

    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(useAtlasStore.getState().viewRange.from).toBeGreaterThan(before.from);
  });
});
