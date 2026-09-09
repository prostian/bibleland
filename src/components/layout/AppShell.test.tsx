// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import AppShell from '@/components/layout/AppShell';
import { useUiStore } from '@/store/useUiStore';

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

function renderShell(path = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <p>Inhalt</p> },
          { path: 'ereignis/:id', element: <p>Ereignis</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    // Der Store lebt auf Modulebene und ueberlebt cleanup().
    useUiStore.setState({ helpOpen: false, searchOpen: false });
  });

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

describe('Kurzübersicht', () => {
  beforeEach(() => {
    localStorage.clear();
    // Der Store lebt auf Modulebene und ueberlebt cleanup().
    useUiStore.setState({ helpOpen: false, searchOpen: false });
  });

  afterEach(() => {
    cleanup();
  });

  it('öffnet sich mit „?" außerhalb eines Eingabefeldes', () => {
    renderShell();
    expect(screen.queryByRole('dialog', { name: 'Kurzübersicht' })).toBeNull();

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Kurzübersicht' })).toBeDefined();
  });

  it('bleibt bei „?" in einem Eingabefeld zu — dort ist es ein Fragezeichen', () => {
    renderShell();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: '?' });
    expect(screen.queryByRole('dialog', { name: 'Kurzübersicht' })).toBeNull();
    input.remove();
  });

  it('schließt mit Escape und gibt den Fokus an den auslösenden Knopf zurück', () => {
    renderShell();
    const opener = screen.getByRole('button', { name: 'Kurzübersicht öffnen' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Kurzübersicht' });
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Kurzübersicht' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('nennt nur Kürzel, die es auch gibt', () => {
    renderShell();
    fireEvent.keyDown(window, { key: '?' });
    const dialog = screen.getByRole('dialog', { name: 'Kurzübersicht' });

    // Strg K ist in AppShell verdrahtet, ? in derselben Stelle.
    const keys = [...dialog.querySelectorAll('kbd')].map((k) => k.textContent);
    expect(keys).toContain('Strg');
    expect(keys).toContain('?');
  });
});

describe('Erstbesuch-Einführung', () => {
  beforeEach(() => {
    localStorage.clear();
    // Der Store lebt auf Modulebene und ueberlebt cleanup().
    useUiStore.setState({ helpOpen: false, searchOpen: false });
  });

  afterEach(() => {
    cleanup();
  });

  it('erscheint auf der nackten Startseite', () => {
    renderShell();
    expect(screen.getByRole('dialog', { name: 'Willkommen bei Bibleland' })).toBeDefined();
  });

  it('kehrt nach dem Schließen auch beim Neuladen nicht wieder', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Loslegen' }));
    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Bibleland' })).toBeNull();

    cleanup();
    renderShell();
    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Bibleland' })).toBeNull();
  });

  it('bleibt bei einem geteilten Link auf ein Ereignis weg', () => {
    renderShell('/ereignis/damaskus-bekehrung');
    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Bibleland' })).toBeNull();
  });

  it('bleibt bei einer geteilten Ansicht mit Filtern weg', () => {
    renderShell('/?a=propheten');
    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Bibleland' })).toBeNull();
  });

  it('führt von der Einführung in die Kurzübersicht', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Kurzübersicht ansehen' }));

    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Bibleland' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Kurzübersicht' })).toBeDefined();
  });
});
