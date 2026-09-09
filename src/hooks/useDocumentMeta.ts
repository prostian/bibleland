import { useEffect } from 'react';

/**
 * Titel und Metadaten der aktuellen Seite.
 *
 * Eine Einzelseiten-Anwendung hat genau einen `<title>` — den aus der
 * `index.html`. Für 700 Entitätsseiten ist das derselbe, und was ein Messenger
 * als Linkvorschau zeigt, ebenfalls. Dieser Hook setzt beides pro Seite und
 * stellt beim Verlassen wieder her, was vorher stand.
 *
 * Kein `react-helmet`: Das wäre eine Abhängigkeit für dreißig Zeilen, die
 * dazu noch einen Provider durch den Baum zieht.
 *
 * Für Suchmaschinen und Vorschaudienste, die kein JavaScript ausführen, reicht
 * das nicht — die bekommen die vorgerenderten Dateien aus
 * `scripts/prerender.mjs`. Beides zusammen ergibt das Bild: die Datei für den
 * ersten Abruf, dieser Hook für jede Navigation danach.
 */

const SITE_NAME = 'Bibleland';

export type MetaType = 'website' | 'article' | 'profile';

export interface DocumentMeta {
  /** Ohne Namenszusatz — den hängt der Hook an. */
  title: string;
  description?: string | undefined;
  /** `og:type`: Ereignisse sind `article`, Personen `profile`, alles andere `website`. */
  type?: MetaType;
}

function metaTag(kind: 'name' | 'property', key: string): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
  if (existing) return existing;
  const node = document.createElement('meta');
  node.setAttribute(kind, key);
  document.head.appendChild(node);
  return node;
}

function canonicalTag(): HTMLLinkElement {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (existing) return existing;
  const node = document.createElement('link');
  node.rel = 'canonical';
  document.head.appendChild(node);
  return node;
}

export default function useDocumentMeta({ title, description, type = 'website' }: DocumentMeta): void {
  useEffect(() => {
    const fullTitle = `${title} — ${SITE_NAME}`;
    // Ohne Query-Anteil: Der Filterzustand gehört in einen geteilten Link,
    // aber nicht in die kanonische Adresse einer Entität.
    const url = `${window.location.origin}${window.location.pathname}`;

    const nodes = {
      description: metaTag('name', 'description'),
      ogTitle: metaTag('property', 'og:title'),
      ogDescription: metaTag('property', 'og:description'),
      ogType: metaTag('property', 'og:type'),
      ogUrl: metaTag('property', 'og:url'),
      ogSiteName: metaTag('property', 'og:site_name'),
      twitterCard: metaTag('name', 'twitter:card'),
      canonical: canonicalTag(),
    };

    // Den Zustand vor dieser Seite festhalten. React räumt die alte Route ab,
    // bevor die neue ihre Effekte ausführt — dadurch reiht sich das sauber
    // aneinander, und der Zurück-Weg zum Atlas findet seinen Titel wieder.
    const before = {
      title: document.title,
      description: nodes.description.content,
      ogTitle: nodes.ogTitle.content,
      ogDescription: nodes.ogDescription.content,
      ogType: nodes.ogType.content,
      ogUrl: nodes.ogUrl.content,
      ogSiteName: nodes.ogSiteName.content,
      twitterCard: nodes.twitterCard.content,
      canonical: nodes.canonical.href,
    };

    const text = description?.trim() ?? '';

    document.title = fullTitle;
    if (text) nodes.description.content = text;
    nodes.ogTitle.content = fullTitle;
    if (text) nodes.ogDescription.content = text;
    nodes.ogType.content = type;
    nodes.ogUrl.content = url;
    nodes.ogSiteName.content = SITE_NAME;
    nodes.twitterCard.content = 'summary_large_image';
    nodes.canonical.href = url;

    return () => {
      document.title = before.title;
      nodes.description.content = before.description;
      nodes.ogTitle.content = before.ogTitle;
      nodes.ogDescription.content = before.ogDescription;
      nodes.ogType.content = before.ogType;
      nodes.ogUrl.content = before.ogUrl;
      nodes.ogSiteName.content = before.ogSiteName;
      nodes.twitterCard.content = before.twitterCard;
      nodes.canonical.href = before.canonical;
    };
  }, [title, description, type]);
}
