// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import AppShell from '@/components/layout/AppShell';

/**
 * Der Sprunglink ist nur etwas wert, wenn er *zuerst* kommt. Steht vor ihm
 * noch ein Element, ist der Zweck verfehlt — deshalb prüft dieser Test die
 * Reihenfolge und nicht bloß seine Existenz.
 */

/** Was der Tabulator in Dokumentreihenfolge erreicht. */
function focusables(): HTMLElement[] {
  const selector = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
  return [...document.querySelectorAll<HTMLElement>(selector)];
}

function renderShell() {
  const router = createMemoryRouter(
    [{ path: '/', element: <AppShell />, children: [{ index: true, element: <p>Inhalt</p> }] }],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('macht den Sprunglink zum ersten erreichbaren Element', () => {
    renderShell();
    const first = focusables()[0];
    expect(first?.textContent).toBe('Zum Inhalt springen');
  });

  it('verweist mit dem Sprunglink auf den fokussierbaren Inhaltsbereich', () => {
    renderShell();
    const link = screen.getByRole('link', { name: 'Zum Inhalt springen' });
    expect(link.getAttribute('href')).toBe('#inhalt');

    const main = document.getElementById('inhalt');
    expect(main?.tagName).toBe('MAIN');
    // Nur mit tabindex nimmt der Bereich den Fokus vom Sprunglink an.
    expect(main?.getAttribute('tabindex')).toBe('-1');
  });

  it('hält den Sprunglink versteckt, bis er den Fokus hat', () => {
    renderShell();
    const link = screen.getByRole('link', { name: 'Zum Inhalt springen' });
    expect(link.className).toContain('sr-only');
    expect(link.className).toContain('focus:not-sr-only');
  });

  it('meldet die Trefferzahl über einen höflichen Live-Bereich', () => {
    renderShell();
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toMatch(/^\d+ Ereignisse$/);
  });
});
