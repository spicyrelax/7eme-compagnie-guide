/* Numero de version : synchronise avec celui de index.html par publier.sh.
   C'est LUI qui declenche les mises a jour. La strategie est "cache d'abord"
   (indispensable au mode hors ligne) : la page enregistree est servie sans
   jamais aller voir si une plus recente existe. Le seul evenement qui purge
   l'ancienne copie, c'est un CHANGEMENT DE NOM DU CACHE — donc un changement
   de version. Tant que ce numero ne bouge pas, aucune mise a jour n'arrive. */
const VERSION = '1.1.0';
const CACHE = '7eme-compagnie-v' + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord : hors réseau, tout répond quand même.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
    )
  );
});
