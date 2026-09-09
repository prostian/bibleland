/* eslint-env serviceworker */
/**
 * Service Worker — Bibleland offline.
 *
 * Die Ausgangslage ist ungewöhnlich günstig: Sämtliche Sachdaten liegen im
 * Bundle, die einzige Laufzeitverbindung sind die Kartenkacheln. Offline zu
 * funktionieren kostet deshalb keinen Umbau, sondern nur diesen Zwischenspeicher.
 *
 * Drei Strategien, je nach Art der Anfrage:
 *
 * 1. **Seitenaufrufe: erst Netz, dann Cache.** Sonst bekäme man nach einem
 *    neuen Build so lange die alte Hülle, bis der Cache abläuft. Offline
 *    greift die Hülle aus dem Cache, und das Routing macht der Browser.
 * 2. **Eigene Dateien: erst Cache.** Ihre Namen tragen einen Hash, ein
 *    einmal geladener Chunk ändert sich also nie wieder.
 * 3. **Kacheln: aus dem Cache und im Hintergrund erneuern**, mit Deckel.
 *    Ohne Obergrenze wächst der Speicher bei jeder Fahrt über die Karte.
 *
 * Version und Vorladeliste trägt `scripts/build-sw.mjs` nach dem Build ein —
 * die Dateinamen kennt erst Vite.
 */

const VERSION = '__VERSION__';
const APP_CACHE = `bibleland-app-${VERSION}`;
const TILE_CACHE = 'bibleland-tiles';
const PRECACHE = __PRECACHE__;

/**
 * Wie viele Kacheln höchstens liegen bleiben.
 *
 * Geräumt wird die älteste zuerst, nicht die am längsten unbenutzte: Für
 * echtes LRU müsste jeder Treffer den Eintrag neu schreiben, und das kostet
 * mehr als es einbringt. Bei 300 Kacheln — grob zwei Bildschirmfüllungen —
 * fällt der Unterschied nicht auf.
 */
const TILE_LIMIT = 300;

const TILE_HOSTS = ['tile.openstreetmap.de', 'basemaps.cartocdn.com', 'tile.openstreetmap.org'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      // `reload` umgeht den HTTP-Cache des Browsers: Sonst legt ein neuer
      // Service Worker unter Umständen die alten Dateien ab.
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('bibleland-app-') && name !== APP_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trimTiles() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  if (keys.length <= TILE_LIMIT) return;
  await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map((key) => cache.delete(key)));
}

async function handleTile(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);

  const fromNetwork = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        await trimTiles();
      }
      return response;
    })
    .catch(() => undefined);

  // Offline und nicht im Cache: Der Aufrufer bekommt einen Fehlschlag, und
  // die Karte meldet das selbst — eine leere graue Fläche ohne Erklärung
  // sähe nach einem Defekt aus.
  return cached ?? (await fromNetwork) ?? Response.error();
}

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(APP_CACHE);
    return (await cache.match(request)) ?? (await cache.match('/index.html')) ?? Response.error();
  }
}

async function handleAsset(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (TILE_HOSTS.includes(url.hostname)) {
    event.respondWith(handleTile(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleAsset(request));
});
