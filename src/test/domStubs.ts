/**
 * Was jsdom nicht mitbringt.
 *
 * Die Oberfläche fragt drei Dinge ab, die es in jsdom nicht gibt:
 * `matchMedia` für die Layoutschwellen, den `ResizeObserver` für die Breite
 * des Zeitstrahls und echte Elementmaße. Ohne Ersatz stürzt der erste Render
 * ab, und mit Maßen von null rechnet der Zeitstrahl alle Ereignisse auf einen
 * Pixel — es wäre also nichts zu bedienen und nichts zu prüfen.
 *
 * Absichtlich Stummel und keine Nachbauten: Geprüft wird die Bedienung, nicht
 * das Umbruchverhalten des Browsers.
 */

/** `matches` gilt für jede Abfrage — im Test wird nicht nach Breiten unterschieden. */
export function installMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

export function installResizeObserver(): void {
  class Stub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: Stub,
  });
  globalThis.ResizeObserver = Stub;
}

/**
 * Gibt jedem Element eine feste Größe. `useElementSize` liest sie beim
 * Anhängen einmal aus, womit der Zeitstrahl eine benutzbare Breite hat.
 */
export function installElementSize(width = 1200, height = 320): void {
  Element.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
    return {
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

/** Alle drei zusammen — der übliche Fall. */
export function installDomStubs(options: { matchMedia?: boolean } = {}): void {
  installMatchMedia(options.matchMedia ?? false);
  installResizeObserver();
  installElementSize();
}
