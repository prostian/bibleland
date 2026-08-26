/**
 * Typen für die JSON-Datendateien.
 *
 * `resolveJsonModule` ist in der tsconfig bewusst ausgeschaltet: Bei einer
 * Ereignisdatei mit mehreren hundert Einträgen würde TypeScript sonst einen
 * riesigen Literaltyp ableiten, was den Typecheck spürbar verlangsamt und
 * nichts einbringt. Stattdessen bekommt jede Datei hier ihren exakten Typ.
 *
 * Dass die JSON-Dateien diesen Typen tatsächlich entsprechen, prüft zur
 * Bauzeit `scripts/validate-data.mjs` — der Compiler kann es nicht.
 */

declare module '@/data/books.json' {
  import type { BibleBook } from '@/types';
  const books: BibleBook[];
  export default books;
}

declare module '@/data/periods.json' {
  import type { Period } from '@/types';
  const periods: Period[];
  export default periods;
}

declare module '@/data/places.json' {
  import type { Place } from '@/types';
  const places: Place[];
  export default places;
}

declare module '@/data/persons.json' {
  import type { Person } from '@/types';
  const persons: Person[];
  export default persons;
}

declare module '@/data/events.json' {
  import type { BibleEvent } from '@/types';
  const events: BibleEvent[];
  export default events;
}

declare module '@/data/journeys.json' {
  import type { Journey } from '@/types';
  const journeys: Journey[];
  export default journeys;
}

declare module '@/data/verses/verses.de.public.json' {
  import type { VerseBundle } from '@/types';
  const bundle: VerseBundle;
  export default bundle;
}

declare module '@/data/verses/verses.grc.json' {
  import type { VerseBundle } from '@/types';
  const bundle: VerseBundle;
  export default bundle;
}
