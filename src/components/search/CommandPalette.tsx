import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import { search } from '@/lib/search';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import SearchResultList, { resultPath } from '@/components/search/SearchResultList';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const MAX_RESULTS = 12;

/**
 * Schnellsuche über Strg/Cmd + K.
 *
 * Sie ist der kürzeste Weg durch das Netz: tippen, mit den Pfeiltasten
 * wählen, Enter — ohne die Hand von der Tastatur zu nehmen. Alles, was hier
 * gefunden wird, ist auch über `/suche` erreichbar; die Palette spart nur
 * den Umweg.
 */
export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => (query.trim() ? search(query, MAX_RESULTS) : []),
    [query],
  );

  // Beim Öffnen zurücksetzen, damit nicht die letzte Suche stehen bleibt.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) {
        navigate(resultPath(target));
        onClose();
      }
    }
  };

  /*
   * Auf dem Handy sitzt die Suche oben am Rand und füllt die Breite, statt
   * als Kasten in der Bildmitte zu schweben: Die Bildschirmtastatur schiebt
   * sich von unten über die Hälfte des Bildes: Ein zentrierter Kasten läge
   * darunter. Aus demselben Grund ist das Eingabefeld dort 16 Pixel groß —
   * bei kleinerer Schrift zoomt iOS beim Antippen hinein.
   */
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.14 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 backdrop-blur-[2px] sm:px-4 sm:pt-[12vh]"
        onClick={onClose}
      >
        <motion.div
          key="panel"
          role="dialog"
          aria-modal="true"
          aria-label="Suche"
          initial={reducedMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
          transition={{ duration: reducedMotion ? 0 : 0.16, ease: [0.2, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden border-line bg-surface shadow-pop max-sm:h-[92dvh] max-sm:rounded-b-2xl sm:rounded-2xl sm:border"
        >
          <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-3.5 py-3">
            <svg
              viewBox="0 0 16 16"
              className="size-4 shrink-0 text-ink-subtle"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ereignis, Person, Ort, Bibelstelle oder Jahr …"
              aria-label="Suchbegriff"
              className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle sm:text-sm"
            />
            <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-sans text-[10px] text-ink-subtle sm:inline">
              Esc
            </kbd>
            <button
              type="button"
              onClick={onClose}
              aria-label="Suche schließen"
              className="tap grid size-9 shrink-0 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink sm:hidden"
            >
              <svg
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-slim p-1.5 sm:max-h-[52vh] sm:flex-none">
            {query.trim().length === 0 ? (
              <p className="px-2.5 py-6 text-center text-xs leading-relaxed text-ink-subtle">
                Versuch „Genesis 12", „Moses", „Jerusalem", „1000 v. Chr."
                <br />
                oder „Paulus zweite Missionsreise".
              </p>
            ) : results.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-xs text-ink-subtle">
                Nichts gefunden zu „{query}".
              </p>
            ) : (
              <SearchResultList results={results} activeIndex={activeIndex} onNavigate={onClose} />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-line px-3.5 py-2 text-[10px] text-ink-subtle pb-safe">
            <span className="hidden sm:inline">↑ ↓ wählen</span>
            <span className="hidden sm:inline">↵ öffnen</span>
            <button
              type="button"
              onClick={() => {
                navigate(query.trim() ? `/suche?q=${encodeURIComponent(query)}` : '/suche');
                onClose();
              }}
              className="ml-auto text-accent transition-opacity hover:opacity-80"
            >
              Alle Treffer ansehen
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
