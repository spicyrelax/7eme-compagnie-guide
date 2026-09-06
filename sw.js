/* Numero de version : synchronise avec celui de index.html par publier.sh.
   C'est LUI qui declenche les mises a jour. La strategie est "cache d'abord"
   (indispensable au mode hors ligne) : la page enregistree est servie sans
   jamais aller voir si une plus recente existe. Le seul evenement qui purge
   l'ancienne copie, c'est un CHANGEMENT DE NOM DU CACHE — donc un changement
   de version. Tant que ce numero ne bouge pas, aucune mise a jour n'arrive. */
const VERSION = '1.2.0';
const CACHE = '7eme-compagnie-v' + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', e => {
  /* {cache:'reload'} est INDISPENSABLE : GitHub Pages renvoie
     "cache-control: max-age=600", donc sans ca le navigateur sert au service
     worker sa propre copie vieille de 10 minutes — et on range l'ANCIENNE page
     dans le NOUVEAU cache. Bug constate sur le telephone de Vincent le
     06/09/2026 : cache nomme v1.1.1 contenant la page 1.1.0. */
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
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
  /* Pour la page elle-meme : on sert le cache immediatement (donc hors ligne
     et demarrage instantane), MAIS on va chercher la version reseau derriere
     pour que l'ouverture suivante soit a jour. Deuxieme filet contre le cache
     HTTP de GitHub Pages. */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const frais = fetch(new Request(req.url, { cache: 'reload' }))
          .then(res => {
            if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
            return res;
          })
          .catch(() => null);
        return hit || frais.then(r => r || caches.match('./index.html'));
      })
    );
    return;
  }

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
