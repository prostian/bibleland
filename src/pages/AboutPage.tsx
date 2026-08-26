import { datasetStats } from '@/lib/dataset';
import { bundleFor, usingLocalGerman } from '@/lib/verses';
import PageContainer, { PageSection } from '@/components/layout/PageContainer';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line py-1.5 last:border-b-0">
      <dt className="w-44 shrink-0 text-xs text-ink-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-ink-muted">{value}</dd>
    </div>
  );
}

/**
 * Auskunft über Herkunft und Grenzen der Daten.
 *
 * Eine App, die Jahreszahlen auf zehn Jahre genau auf einen Zeitstrahl
 * setzt, schuldet ihren Nutzern die Angabe, woher diese Zahlen kommen und
 * wie belastbar sie sind.
 */
export default function AboutPage() {
  const german = bundleFor('de');
  const greek = bundleFor('grc');

  return (
    <PageContainer
      title="Über die Daten"
      subtitle="Woher die Angaben stammen, wie sie datiert sind und wo ihre Grenzen liegen."
    >
      <PageSection title="Umfang">
        <dl>
          <Row label="Ereignisse" value={datasetStats.events} />
          <Row label="Orte" value={`${datasetStats.places} mit WGS84-Koordinaten`} />
          <Row label="Personen" value={`${datasetStats.persons} mit Beziehungsangaben`} />
          <Row label="Reisen" value={datasetStats.journeys} />
          <Row label="Bücher" value={`${datasetStats.books} — der vollständige Kanon`} />
          <Row label="Epochen" value={datasetStats.periods} />
        </dl>
      </PageSection>

      <PageSection title="Chronologie">
        <p className="text-sm leading-relaxed text-ink-muted">
          Die Datierungen folgen einer konservativ-mittleren Chronologie: Exodus um 1446 v. Chr.,
          Tempelweihe 966 v. Chr., Reichsteilung 931 v. Chr., Fall Samarias 722 v. Chr., Zerstörung
          Jerusalems 586 v. Chr., Kreuzigung 30 n. Chr. Andere Ansätze — etwa ein Spätdatum des
          Exodus im 13. Jahrhundert — sind fachlich gut vertretbar und würden große Teile des
          Alten Testaments um rund zwei Jahrhunderte verschieben.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Jedes Ereignis trägt deshalb eine Angabe zur Verlässlichkeit seiner Datierung. Unsichere
          Daten erscheinen mit „ca.", blasser und mit gestricheltem Rand; die Urgeschichte
          (Genesis 1–11) ist als <em>symbolisch</em> gekennzeichnet — sie bekommt einen Platz auf
          dem Zeitstrahl, damit sie überhaupt darstellbar ist, nicht weil sich dafür ein Jahr
          angeben ließe.
        </p>
      </PageSection>

      <PageSection title="Orte">
        <p className="text-sm leading-relaxed text-ink-muted">
          Die Koordinaten bezeichnen die heute gängige archäologische Identifikation. Bei
          umstrittenen Orten — Berg Sinai, Kadesch-Barnea, Ai, Sodom, Emmaus — steht ein Hinweis
          auf der jeweiligen Ortsseite. Für Reiserouten gilt dasselbe: Die Paulusreisen nennt die
          Apostelgeschichte Hafen für Hafen, die Wüstenwanderung dagegen ist Rekonstruktion und
          wird gestrichelt gezeichnet.
        </p>
      </PageSection>

      <PageSection title="Bibeltexte">
        <dl>
          <Row
            label="Deutsch"
            value={
              <>
                {german.source.name}
                <span className="block text-xs text-ink-subtle">{german.source.license}</span>
              </>
            }
          />
          <Row
            label="Originalsprache"
            value={
              <>
                {greek.source.name}
                <span className="block text-xs text-ink-subtle">{greek.source.license}</span>
              </>
            }
          />
          <Row
            label="Weitere Übersetzungen"
            value="Über Deep-Links zu ERF Bibleserver (Schlachter 2000, Einheitsübersetzung, Luther 2017, Elberfelder)."
          />
        </dl>

        {usingLocalGerman ? (
          <p className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-subtle">
            <strong className="font-medium text-ink-muted">Lokaler Text aktiv.</strong> Diese
            Installation nutzt eine urheberrechtlich geschützte Übersetzung aus{' '}
            <code className="text-ink-muted">verses.de.local.json</code>. Die Datei ist per{' '}
            <code className="text-ink-muted">.gitignore</code> vom Repository ausgeschlossen: Eine
            Privatkopie ist zulässig, eine Weitergabe wäre es nicht.
          </p>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
            Es ist der gemeinfreie Text eingebunden. Mit{' '}
            <code className="text-ink-muted">npm run fetch:verses</code> lässt sich zusätzlich eine
            lokale Ausgabe einspielen, die nicht mitcommittet wird.
          </p>
        )}
      </PageSection>

      <PageSection title="Karte">
        <p className="text-sm leading-relaxed text-ink-muted">
          Kartenkacheln von OpenStreetMap. Sie zeigen die heutige Welt — Staatsgrenzen und
          Ortsnamen der Gegenwart also, unter denen die antiken Orte verortet sind. Die App
          selbst kommt ohne Server aus; die Kacheln sind die einzige Verbindung nach außen.
        </p>
      </PageSection>

      <PageSection title="Was diese App nicht ist">
        <p className="text-sm leading-relaxed text-ink-muted">
          Kein Ersatz für einen wissenschaftlichen Bibelatlas und keine vollständige Erfassung.
          Der Datensatz ist eine kuratierte Auswahl der großen Erzählbögen. Wo ein Buch, ein
          Kapitel oder eine Person fehlt, heißt das nicht, dass dort nichts steht — nur, dass es
          hier nicht erfasst ist.
        </p>
      </PageSection>
    </PageContainer>
  );
}
