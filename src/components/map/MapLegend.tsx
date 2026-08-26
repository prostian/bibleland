import { useState } from 'react';

import { EVENT_TYPES, SECTIONS } from '@/types';
import { AUSSERBIBLISCH_COLOR, EVENT_TYPE_LABEL, SECTION_LABEL, sectionColorVar } from '@/lib/labels';
import { glyphMarkup } from '@/lib/markerIcons';
import { cn } from '@/lib/cn';

interface MapLegendProps {
  placeCount: number;
  eventCount: number;
}

/**
 * Ein Zeichen aus der Markerkodierung, in Textfarbe statt Weiß.
 *
 * Das Markup kommt aus einer Modulkonstante ohne jede Fremdeingabe — hier
 * fließen keine Nutzerdaten ein, deshalb ist das direkte Einsetzen
 * unbedenklich. Die Alternative wäre, dreizehn Pfade doppelt zu pflegen.
 */
function Glyph({ type }: { type: (typeof EVENT_TYPES)[number] }) {
  return (
    <svg
      viewBox="4 4 16 16"
      className="size-4 shrink-0 **:fill-current! **:[[stroke]]:stroke-current!"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: glyphMarkup(type, 'transparent') }}
    />
  );
}

/**
 * Legende zur Kartenkodierung.
 *
 * Standardmäßig eingeklappt: Die Karte soll beim ersten Blick nicht von
 * einem Kasten mit zwanzig Zeilen verstellt werden. Wer die Kodierung wissen
 * will, klappt sie auf — die Zusammenfassung mit den Zahlen bleibt immer
 * sichtbar.
 */
export default function MapLegend({ placeCount, eventCount }: MapLegendProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-1000 max-w-[min(22rem,calc(100%-1.5rem))]">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-line bg-overlay shadow-panel backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:bg-surface-2"
        >
          <span className="font-medium text-ink">
            {eventCount} {eventCount === 1 ? 'Ereignis' : 'Ereignisse'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {placeCount} {placeCount === 1 ? 'Ort' : 'Orte'}
          </span>
          <span className="ml-auto text-[11px] text-ink-subtle">Legende</span>
          <svg
            className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <div className="max-h-[60vh] overflow-y-auto border-t border-line px-3 pb-3 pt-2.5 scrollbar-slim">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
              Farbe — Bibelabschnitt
            </p>
            <ul className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1">
              {SECTIONS.map((section) => (
                <li key={section} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sectionColorVar(section) }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{SECTION_LABEL[section]}</span>
                </li>
              ))}
              <li className="col-span-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: AUSSERBIBLISCH_COLOR }}
                  aria-hidden="true"
                />
                <span className="truncate">Außerbiblisch — ohne Bibelstelle</span>
              </li>
            </ul>

            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
              Zeichen — Art des Ereignisses
            </p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {EVENT_TYPES.map((type) => (
                <li key={type} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <Glyph type={type} />
                  <span className="truncate">{EVENT_TYPE_LABEL[type]}</span>
                </li>
              ))}
            </ul>

            <p className="mt-3 border-t border-line pt-2 text-[11px] leading-relaxed text-ink-subtle">
              Blasse, gestrichelte Marker kennzeichnen unsichere oder rein symbolische Datierungen.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
