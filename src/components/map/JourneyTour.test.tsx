// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import JourneyTour from '@/components/map/JourneyTour';
import { getJourney } from '@/lib/dataset';
import { useAtlasStore } from '@/store/useAtlasStore';

/**
 * Die Tour ist Bedienung, keine Darstellung — geprüft wird deshalb der
 * Zustand, den sie setzt, nicht wie sie aussieht. Die Kartenflüge selbst
 * hängen an Leaflet und stehen hier nicht zur Debatte.
 */

const journey = getJourney('paulus-2')!;

function renderTour() {
  return render(<JourneyTour journey={journey} />);
}

describe('JourneyTour', () => {
  beforeEach(() => {
    useAtlasStore.setState({ activeJourneyId: journey.id, tourLeg: 1, tourPlaying: false });
  });

  afterEach(() => {
    cleanup();
  });

  it('beginnt bei der ersten Etappe', () => {
    renderTour();
    expect(screen.getByRole('status').textContent).toBe(`Etappe 1 von ${journey.legs.length}`);
  });

  it('schaltet vor und zurück', () => {
    renderTour();
    fireEvent.click(screen.getByRole('button', { name: 'Nächste Etappe' }));
    expect(useAtlasStore.getState().tourLeg).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Vorige Etappe' }));
    expect(useAtlasStore.getState().tourLeg).toBe(1);
  });

  it('läuft am Ende nicht in die Schleife — eine Reise hat ein Ziel', () => {
    useAtlasStore.setState({ tourLeg: journey.legs.length });
    renderTour();

    const next = screen.getByRole('button', { name: 'Nächste Etappe' });
    expect(next.hasAttribute('disabled')).toBe(true);
    fireEvent.click(next);
    expect(useAtlasStore.getState().tourLeg).toBe(journey.legs.length);
  });

  it('startet und pausiert die Wiedergabe', () => {
    renderTour();
    fireEvent.click(screen.getByRole('button', { name: 'Tour abspielen' }));
    expect(useAtlasStore.getState().tourPlaying).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tour anhalten' }));
    expect(useAtlasStore.getState().tourPlaying).toBe(false);
  });

  it('bedient sich mit Pfeiltasten und Leertaste', () => {
    renderTour();
    const bar = screen.getByRole('group', { name: /^Geführte Tour/ });

    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    expect(useAtlasStore.getState().tourLeg).toBe(2);

    fireEvent.keyDown(bar, { key: ' ' });
    expect(useAtlasStore.getState().tourPlaying).toBe(true);

    fireEvent.keyDown(bar, { key: 'ArrowLeft' });
    expect(useAtlasStore.getState().tourLeg).toBe(1);
  });

  it('beendet mit Escape nur die Tour, nicht die Route', () => {
    renderTour();
    fireEvent.keyDown(screen.getByRole('group', { name: /^Geführte Tour/ }), { key: 'Escape' });

    const state = useAtlasStore.getState();
    expect(state.tourLeg).toBeNull();
    expect(state.tourPlaying).toBe(false);
    // Die Route bleibt liegen — wer aussteigt, will sich das Erreichte ansehen.
    expect(state.activeJourneyId).toBe(journey.id);
  });

  it('zeigt am Finger Knöpfe von mindestens 44 Pixeln', () => {
    renderTour();
    // `size-11` sind 2.75rem = 44 px; ab `md` darf es kleiner werden.
    for (const name of ['Vorige Etappe', 'Nächste Etappe', 'Tour abspielen']) {
      expect(screen.getByRole('button', { name }).className).toContain('size-11');
    }
  });
});
