// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import BottomSheet from '@/components/layout/BottomSheet';

/**
 * Am Blatt hängt auf dem Telefon die gesamte Detailansicht. Zwei Dinge
 * müssen dabei stimmen, und beide sind unsichtbar: Gezogen wird **nur** am
 * Griff — läge der Ziehbereich auf dem ganzen Blatt, ließe sich der Text
 * darin nicht mehr scrollen. Und der Griff muss aufs Antippen dasselbe tun
 * wie aufs Ziehen, sonst ist die Geste ohne Maus nicht bedienbar.
 *
 * Das Ziehen selbst wird hier nicht simuliert: Es steckt in der
 * Gestenerkennung von `motion`, und ein nachgestellter Zeigerverlauf würde
 * am Ende nur diese Bibliothek prüfen.
 */

function renderSheet(onClose = () => {}) {
  return render(
    <BottomSheet label="Detailansicht" onClose={onClose}>
      <p>Inhalt des Blattes</p>
    </BottomSheet>,
  );
}

const handle = () => screen.getByRole('button', { name: /Detailansicht (vergrößern|verkleinern)/ });

describe('BottomSheet', () => {
  afterEach(() => {
    cleanup();
  });

  it('zeigt seinen Inhalt in einem beschrifteten Dialog', () => {
    renderSheet();
    const sheet = screen.getByRole('dialog', { name: 'Detailansicht' });
    expect(sheet.textContent).toContain('Inhalt des Blattes');
  });

  it('klappt mit dem Griff auf und wieder zu', () => {
    renderSheet();
    expect(handle().getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(handle());
    expect(handle().getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(handle());
    expect(handle().getAttribute('aria-expanded')).toBe('false');
  });

  it('schließt mit Escape', () => {
    const onClose = vi.fn();
    renderSheet(onClose);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hält den Inhalt scrollbar und aus dem Ziehbereich heraus', () => {
    renderSheet();
    const content = screen.getByText('Inhalt des Blattes').parentElement;

    expect(content?.className).toContain('overflow-y-auto');
    // Der Griff ist ein eigenes Element neben dem Inhalt, nicht darum herum.
    expect(content?.contains(handle())).toBe(false);
  });

  it('trägt im Griffbereich den Teilen-Knopf', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: 'Diese Ansicht teilen' })).toBeDefined();
  });
});
