// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import CommandPalette from '@/components/search/CommandPalette';

/**
 * Die Palette ist der kürzeste Weg durch das Netz — tippen, Pfeiltaste, Enter.
 * Bricht eine dieser drei Tasten, ist der ganze Weg weg, ohne dass es
 * irgendwo auffiele: Klicken funktioniert ja weiter.
 */

function renderPalette(onClose = () => {}) {
  const router = createMemoryRouter(
    [{ path: '*', element: <CommandPalette open onClose={onClose} /> }],
    { initialEntries: ['/'] },
  );
  const result = render(<RouterProvider router={router} />);
  return { ...result, router };
}

const input = () => screen.getByLabelText('Suchbegriff');

/** Die Treffer sind Links; der hervorgehobene trägt die Akzentfläche. */
const results = () => [...document.querySelectorAll<HTMLElement>('[data-result-index]')];
const activeIndex = () => results().findIndex((row) => row.className.includes('bg-accent-soft'));

describe('CommandPalette', () => {
  afterEach(() => {
    cleanup();
  });

  it('zeigt geschlossen nichts', () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <CommandPalette open={false} onClose={() => {}} /> }],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('findet Treffer zur Eingabe', () => {
    renderPalette();
    fireEvent.change(input(), { target: { value: 'Jerusalem' } });

    const rows = results();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.textContent).toContain('Jerusalem');
  });

  it('wandert mit den Pfeiltasten durch die Treffer', () => {
    renderPalette();
    fireEvent.change(input(), { target: { value: 'Jerusalem' } });

    expect(activeIndex()).toBe(0);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(activeIndex()).toBe(1);
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(activeIndex()).toBe(0);
  });

  it('öffnet mit Enter den gewählten Treffer und schließt sich', () => {
    const onClose = vi.fn();
    const { router } = renderPalette(onClose);
    fireEvent.change(input(), { target: { value: 'Jerusalem' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(onClose).toHaveBeenCalled();
    expect(router.state.location.pathname).not.toBe('/');
  });

  it('schließt mit Escape, ohne zu navigieren', () => {
    const onClose = vi.fn();
    const { router } = renderPalette(onClose);
    fireEvent.keyDown(input(), { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/');
  });
});
