import { memo } from 'react';

import type { ReadingSegment } from '@/lib/readingPath';
import { segmentLabel } from '@/lib/readingPath';
import type { TimelineScale } from '@/lib/timelineScale';
import { getPlace } from '@/lib/dataset';
import { eventColorVar } from '@/lib/labels';
import { useAtlasStore } from '@/store/useAtlasStore';

interface ReadingBandsProps {
  segments: readonly ReadingSegment[];
  scale: TimelineScale;
  height: number;
}

/** Ab dieser Breite passt der Ortsname noch ins Band. */
const MIN_LABEL_WIDTH = 52;

/**
 * Die Ortsabschnitte als Bänder im Hintergrund des Lesestrahls.
 *
 * Das Gegenstück zu den Epochenbändern der Zeitachse — und der eigentliche
 * Gewinn des Lesemodus: Man sieht auf einen Blick, wo die Erzählung spielt,
 * und zwar **durchgehend**, nicht nur in den Kapiteln mit erfasstem Ereignis.
 *
 * Fortgeschriebene Abschnitte werden blasser gezeichnet. Dass sich der Ort
 * über Kapitel ohne eigenes Ereignis hinweg nicht ändert, ist eine Annahme
 * dieses Datensatzes und keine Aussage des Textes — das gehört sichtbar
 * gemacht, statt es unter einer einheitlichen Fläche zu verstecken.
 */
function ReadingBands({ segments, scale, height }: ReadingBandsProps) {
  const selectEvent = useAtlasStore((s) => s.selectEvent);
  const hoverEntity = useAtlasStore((s) => s.hoverEntity);
  const hoveredEntityId = useAtlasStore((s) => s.hoveredEntityId);

  return (
    <div className="absolute inset-x-0 top-0 select-none" style={{ height: `${height}px` }}>
      {segments.map((segment) => {
        const x0 = scale.valueToX(segment.fromPosition);
        const x1 = scale.valueToX(segment.toPosition);
        const width = x1 - x0;
        if (width <= 0) return null;

        const place = getPlace(segment.placeId);
        const leadEvent = segment.events[0];
        const color = leadEvent ? eventColorVar(leadEvent) : 'var(--bl-ausserbiblisch)';
        const name = place?.name ?? 'ohne Ort';
        const hovered = segment.placeId !== null && hoveredEntityId === segment.placeId;

        return (
          <button
            key={`${segment.order}-${segment.fromPosition}`}
            type="button"
            title={`${name} · ${segmentLabel(segment)}${
              segment.extended ? ' — Ort fortgeschrieben, kein eigenes Ereignis in allen Kapiteln' : ''
            }`}
            onClick={() => {
              if (leadEvent) selectEvent(leadEvent.id);
            }}
            onMouseEnter={() => hoverEntity(segment.placeId)}
            onMouseLeave={() => hoverEntity(null)}
            className="absolute inset-y-0 overflow-hidden border-r border-bg/60 text-left transition-[filter] hover:brightness-110 focus-visible:z-10"
            style={{
              transform: `translateX(${x0}px)`,
              width: `${width}px`,
              backgroundColor: color,
              opacity: hovered ? 0.42 : segment.extended ? 0.14 : 0.28,
            }}
          >
            {width >= MIN_LABEL_WIDTH ? (
              <span className="pointer-events-none block truncate px-1.5 text-[10px] font-semibold text-ink">
                {name}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default memo(ReadingBands);
