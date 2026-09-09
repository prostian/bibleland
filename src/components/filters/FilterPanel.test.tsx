// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import FilterPanel from '@/components/filters/FilterPanel';
import { eventsInBook } from '@/lib/dataset';
import { DEFAULT_FILTERS, useAtlasStore } from '@/store/useAtlasStore';
import { MAX_YEAR, MIN_YEAR } from '@/lib/year';

/**
 * Die Filterleiste ist die Stelle, an der sich ein Fehler am teuersten rächt:
 * Sie ändert den Zustand, den alle drei Sichten lesen. Eine falsche Zahl neben
 * einem Buch führt außerdem direkt in eine leere Auswahl — der Nutzer klickt
 * auf „7" und bekommt nichts.
 */

describe('FilterPanel', () => {
  beforeEach(() => {
    useAtlasStore.setState({
      filters: DEFAULT_FILTERS,
      viewRange: { from: MIN_YEAR, to: MAX_YEAR },
      activeJourneyId: null,
      axisMode: 'zeit',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('setzt mit einem Klick auf einen Abschnitt den Filter im Store', () => {
    render(<FilterPanel />);
    const propheten = screen.getByRole('button', { name: /^Propheten/ });
    expect(propheten.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(propheten);

    expect(useAtlasStore.getState().filters.sections).toEqual(['propheten']);
    expect(
      screen.getByRole('button', { name: /^Propheten/ }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('nimmt einen zweiten Klick wieder zurück', () => {
    render(<FilterPanel />);
    const propheten = screen.getByRole('button', { name: /^Propheten/ });
    fireEvent.click(propheten);
    fireEvent.click(screen.getByRole('button', { name: /^Propheten/ }));

    expect(useAtlasStore.getState().filters.sections).toEqual([]);
  });

  it('nennt neben einem Buch die Zahl, die ein Klick darauf bringt', () => {
    render(<FilterPanel />);
    // Den Abschnitt aufklappen, ohne ihn zu filtern — dafür sind es zwei Knöpfe.
    fireEvent.click(screen.getByRole('button', { name: 'Bücher aus Evangelien ausklappen' }));

    const matthaeus = screen.getByRole('button', { name: /^Matthäus/ });
    expect(within(matthaeus).getByText(String(eventsInBook('mt').length))).toBeDefined();
  });

  it('zeigt „Zurücksetzen" nur, wenn ein Filter gesetzt ist', () => {
    render(<FilterPanel />);
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Propheten/ }));
    const reset = screen.getByRole('button', { name: 'Zurücksetzen' });

    fireEvent.click(reset);
    expect(useAtlasStore.getState().filters).toEqual(DEFAULT_FILTERS);
    expect(screen.queryByRole('button', { name: 'Zurücksetzen' })).toBeNull();
  });

  it('zählt die Treffer der aktuellen Auswahl im Kopf mit', () => {
    render(<FilterPanel />);
    const before = Number(/^(\d+)/.exec(screen.getByText(/Ereignisse?$/).textContent ?? '')?.[1]);

    fireEvent.click(screen.getByRole('button', { name: /^Offenbarung/ }));
    const after = Number(/^(\d+)/.exec(screen.getByText(/Ereignisse?$/).textContent ?? '')?.[1]);

    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });
});
