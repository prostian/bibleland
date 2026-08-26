import { useMemo, useState } from 'react';

import type { BibleRef, VerseLanguage } from '@/types';
import { formatRef } from '@/lib/dataset';
import {
  BIBLESERVER_VERSIONS,
  LANGUAGE_HINT,
  LANGUAGE_LABEL,
  availableLanguages,
  bibleserverUrl,
  bundleFor,
  getVerse,
  languageClass,
} from '@/lib/verses';
import { cn } from '@/lib/cn';

interface VerseBoxProps {
  refs: BibleRef;
  verseKey?: string | undefined;
}

/**
 * Der Schlüsselvers samt Sprachumschalter und Absprung in den vollen Kontext.
 *
 * Liegt kein Verstext vor — etwa weil `npm run fetch:verses` noch nicht
 * gelaufen ist —, wird der Kasten nicht leer angezeigt, sondern auf die
 * externen Links reduziert. Ein leerer Rahmen sähe nach Fehler aus, obwohl
 * die App vollständig benutzbar bleibt.
 */
export default function VerseBox({ refs, verseKey }: VerseBoxProps) {
  const languages = useMemo(() => availableLanguages(verseKey), [verseKey]);
  const [language, setLanguage] = useState<VerseLanguage>('de');

  const active: VerseLanguage = languages.includes(language) ? language : (languages[0] ?? 'de');
  const verse = getVerse(verseKey, active);
  const bundle = bundleFor(active);

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-ink">{formatRef(refs)}</span>

        {languages.length > 1 ? (
          <div className="ml-auto flex rounded-md border border-line bg-surface p-0.5">
            {languages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                aria-pressed={active === lang}
                title={LANGUAGE_HINT[lang]}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] transition-colors',
                  active === lang
                    ? 'bg-accent text-accent-contrast'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {LANGUAGE_LABEL[lang]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {verse ? (
        <>
          <blockquote
            className={cn(
              'border-l-2 border-accent/40 pl-3 text-[13px] leading-relaxed text-ink',
              languageClass(active),
            )}
          >
            {verse.text}
          </blockquote>
          <p className="mt-2 text-[10px] text-ink-subtle">
            {bundle.source.name}
            {bundle.source.restricted ? ' · nur lokal, nicht zur Weitergabe' : ''}
          </p>
        </>
      ) : (
        <p className="text-[12px] text-ink-subtle">
          Kein Verstext hinterlegt. Mit <code className="text-ink-muted">npm run fetch:verses</code>{' '}
          lässt er sich nachladen.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-line pt-2">
        <span className="mr-1 text-[10px] uppercase tracking-wide text-ink-subtle">Nachlesen</span>
        {BIBLESERVER_VERSIONS.slice(0, 4).map((version) => (
          <a
            key={version.code}
            href={bibleserverUrl(refs, version.code)}
            target="_blank"
            rel="noreferrer noopener"
            title={`${formatRef(refs)} in der Übersetzung ${version.name} auf bibleserver.com`}
            className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            {version.code}
          </a>
        ))}
      </div>
    </div>
  );
}
