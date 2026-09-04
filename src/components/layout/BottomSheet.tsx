import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useDragControls, type PanInfo } from 'motion/react';

import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Die Detailansicht auf dem Handy: ein Blatt, das von unten hereinfährt.
 *
 * Auf dem Rechner steht das Ereignis rechts neben der Karte — der Platz ist
 * da. Auf dem Handy gäbe es nur die Wahl zwischen „Karte weg" und „Details
 * weg". Das Blatt löst genau das: Es kommt zur Hälfte hoch, sodass der Ort
 * auf der Karte sichtbar bleibt, und lässt sich mit dem Daumen ganz
 * aufziehen oder wegschieben. Dieselbe Geste, die man von Karten- und
 * Musikanwendungen kennt.
 *
 * Zwei Rastpunkte, keine freie Höhe: Ein Blatt, das irgendwo stehen bleibt,
 * fühlt sich kaputt an. Losgelassen fährt es immer auf eine der beiden
 * Höhen — oder hinaus, wenn man es weit genug nach unten zieht.
 */

/** Anteil der Bildschirmhöhe, den das Blatt einnimmt, wenn es ganz oben ist. */
const FULL_RATIO = 0.9;
/** Anteil, der beim Öffnen zu sehen ist. */
const HALF_RATIO = 0.52;

/** Ab dieser Zugstrecke bzw. Geschwindigkeit nach unten wird geschlossen. */
const CLOSE_DISTANCE = 96;
const CLOSE_VELOCITY = 620;

interface BottomSheetProps {
  onClose: () => void;
  children: ReactNode;
  label: string;
}

export default function BottomSheet({ onClose, children, label }: BottomSheetProps) {
  const reducedMotion = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Gezogen wird **nur** am Griff.
   *
   * Läge der Ziehbereich auf dem ganzen Blatt, ließe sich der Text darin
   * nicht mehr scrollen — jeder Wisch nach oben würde stattdessen das Blatt
   * bewegen. Die Steuerung von außen zu starten trennt beides sauber.
   */
  const dragControls = useDragControls();
  /** Wurde gerade gezogen? Dann ist der folgende Klick keiner. */
  const draggedRef = useRef(false);

  // Die Höhen hängen am sichtbaren Bereich, der sich auf dem Handy mit der
  // ein- und ausfahrenden Browserleiste ändert.
  const [viewport, setViewport] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight,
  );
  useEffect(() => {
    const onResize = () => setViewport(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sheetHeight = Math.round(viewport * FULL_RATIO);
  /** Verschiebung nach unten, bei der nur der halbe Ausschnitt zu sehen ist. */
  const halfOffset = Math.round(viewport * (FULL_RATIO - HALF_RATIO));

  const [expanded, setExpanded] = useState(false);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const y = info.offset.y;
      const velocity = info.velocity.y;

      // Kräftig nach unten geworfen oder weit gezogen: schließen.
      if (velocity > CLOSE_VELOCITY || (!expanded && y > CLOSE_DISTANCE)) {
        onClose();
        return;
      }
      if (expanded && y > CLOSE_DISTANCE) {
        setExpanded(false);
        return;
      }
      if (!expanded && (y < -CLOSE_DISTANCE / 2 || velocity < -CLOSE_VELOCITY)) {
        setExpanded(true);
      }
    },
    [expanded, onClose],
  );

  // Beim Einklappen den Inhalt wieder nach oben rollen — sonst steht das
  // halbhohe Blatt mitten in einem Text, dessen Anfang man nicht sieht.
  useEffect(() => {
    if (!expanded && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [expanded]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <motion.aside
      role="dialog"
      aria-label={label}
      aria-modal="false"
      initial={reducedMotion ? false : { y: sheetHeight }}
      animate={{ y: expanded ? 0 : halfOffset }}
      exit={{ y: sheetHeight }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }
      }
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: sheetHeight }}
      dragElastic={{ top: 0.03, bottom: 0.2 }}
      dragMomentum={false}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      style={{ height: sheetHeight }}
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop md:hidden"
    >
      {/* Der Griff ist zugleich die Anleitung zur Geste: hoch ziehen, runter
          wischen. Er nimmt die volle Breite, damit man ihn nicht treffen
          muss — und tut aufs Antippen dasselbe wie aufs Ziehen, weil eine
          Geste ohne Klick-Entsprechung nicht bedienbar wäre. */}
      <button
        type="button"
        onPointerDown={(e) => {
          draggedRef.current = false;
          dragControls.start(e);
        }}
        onClick={() => {
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          setExpanded((v) => !v);
        }}
        aria-label={expanded ? 'Detailansicht verkleinern' : 'Detailansicht vergrößern'}
        aria-expanded={expanded}
        className="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
      >
        <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
      </button>

      {/* Das Blatt schiebt sich unter die Bereichsleiste, statt sie zu
          verdecken: Wer im Detail steckt, soll ohne Umweg zurück zur Karte
          können. Der Innenabstand hält den Text aus ihrem Weg. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-slim pb-tabbar"
      >
        {children}
      </div>
    </motion.aside>
  );
}
