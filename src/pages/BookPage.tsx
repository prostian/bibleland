import { useMemo } from 'react';

import { useParams } from 'react-router-dom';

import { eventsInBook, getBook, getPerson } from '@/lib/dataset';
import { SECTION_LABEL, TESTAMENT_LABEL, sectionColorVar } from '@/lib/labels';
import { formatYear } from '@/lib/year';
import { bibleserverUrl } from '@/lib/verses';
import PageContainer, { PageSection } from '@/components/layout/PageContainer';
import EventList from '@/components/detail/EventList';
import EntityChip from '@/components/detail/EntityChip';
import Badge from '@/components/ui/Badge';
import NotFoundPage from '@/pages/NotFoundPage';

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const book = getBook(id);

  const events = useMemo(() => (book ? eventsInBook(book.id) : []), [book]);

  /** Welche Kapitel sind durch Ereignisse belegt? Zeigt die Abdeckung ehrlich an. */
  const coveredChapters = useMemo(() => {
    const set = new Set<number>();
    for (const event of events) {
      const ref =
        event.ref?.bookId === book?.id
          ? event.ref
          : event.parallelRefs?.find((r) => r.bookId === book?.id);
      if (!ref) continue;
      const last = ref.endChapter ?? ref.chapter;
      for (let c = ref.chapter; c <= last; c++) set.add(c);
    }
    return set;
  }, [events, book]);

  if (!book) return <NotFoundPage what="Buch" id={id} />;

  const author = getPerson(book.authorPersonId);

  return (
    <PageContainer
      eyebrow={
        <>
          <Badge color="var(--bl-node-buch)">Buch</Badge>
          <Badge color={sectionColorVar(book.section)}>{SECTION_LABEL[book.section]}</Badge>
          <Badge variant="soft">{TESTAMENT_LABEL[book.testament]}</Badge>
        </>
      }
      title={book.name}
      subtitle={
        <>
          {book.altName ? <span>{book.altName} · </span> : null}
          <span>
            {book.chapters} Kapitel · Nr. {book.order} im Kanon
          </span>
          {book.writtenYear !== undefined ? (
            <span className="tabular-nums"> · verfasst um {formatYear(book.writtenYear)}</span>
          ) : null}
        </>
      }
    >
      {book.description ? (
        <p className="text-[15px] leading-relaxed text-ink-muted">{book.description}</p>
      ) : null}

      {author ? (
        <p className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-ink-subtle">Überliefert als Verfasser:</span>
          <EntityChip type="person" id={author.id} label={author.name} />
        </p>
      ) : null}

      <p className="mt-4 text-sm">
        <a
          href={bibleserverUrl({ bookId: book.id, chapter: 1 })}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent hover:underline"
        >
          {book.name} auf bibleserver.com lesen
        </a>
      </p>

      <PageSection title="Kapitel mit erfassten Ereignissen" count={coveredChapters.size}>
        <ol className="flex flex-wrap gap-1">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => {
            const covered = coveredChapters.has(chapter);
            return (
              <li key={chapter}>
                <a
                  href={bibleserverUrl({ bookId: book.id, chapter })}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={`${book.name} ${chapter}${covered ? ' — Ereignis erfasst' : ''}`}
                  className={
                    covered
                      ? 'grid size-7 place-items-center rounded-md text-xs tabular-nums text-accent-contrast transition-opacity hover:opacity-85'
                      : 'grid size-7 place-items-center rounded-md border border-line text-xs tabular-nums text-ink-subtle transition-colors hover:bg-surface-2'
                  }
                  style={covered ? { backgroundColor: sectionColorVar(book.section) } : undefined}
                >
                  {chapter}
                </a>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-ink-subtle">
          Farbig hinterlegt sind Kapitel, zu denen dieser Datensatz ein Ereignis kennt. Die
          übrigen sind nicht leer — sie sind nur (noch) nicht erfasst.
        </p>
      </PageSection>

      <PageSection title="Ereignisse" count={events.length}>
        <EventList events={events} emptyText="Zu diesem Buch ist noch kein Ereignis erfasst." />
      </PageSection>
    </PageContainer>
  );
}
