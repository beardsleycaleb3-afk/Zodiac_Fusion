// ═══════════════════════════════════════════════════════
//  OPHIUCHUS: SERPENT THRONE — Service Worker
//  Strategy: Cache-first for assets, network-first for HTML
//  Scope: All game assets cached for offline play
// ═══════════════════════════════════════════════════════

const CACHE      = 'ophiuchus-v0.1.0';
const CACHE_OLD  = ['ophiuchus-v0.0.1', 'ophiuchus-v0.0.2'];

const CORE_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/main.js',
  './js/data.js',
  './js/engine.js',
  './js/ui.js',
  './js/battle.js',
  './js/vm.js',
  './js/audio.js',
  './manifest.json',
  './assets/icon.svg',
];

// Aquarian sprites — offline playable with embedded base64 fallback
// but cache real files if present
const SPRITE_ASSETS = [
  './assets/sprites/aquarian/monkey.jpeg',
  './assets/sprites/aquarian/dragon.jpeg',
  './assets/sprites/aquarian/snake.jpeg',
  './assets/sprites/aquarian/horse.jpeg',
  './assets/sprites/aquarian/rabbit.jpeg',
  './assets/sprites/aquarian/dog.jpeg',
  './assets/sprites/aquarian/rooster.jpeg',
  './assets/sprites/aquarian/ox.jpeg',
  './assets/sprites/aquarian/tiger.jpeg',
  // Placeholders — will cache when files are added:
  './assets/sprites/aquarian/rat.jpeg',
  './assets/sprites/aquarian/goat.jpeg',
  './assets/sprites/aquarian/pig.jpeg',
  // Backgrounds (cache when added):
  './assets/sprites/backgrounds/bg1.png',
  './assets/sprites/backgrounds/bg2.png',
  './assets/sprites/backgrounds/bg3.png',
  './assets/sprites/backgrounds/bg4.png',
  // Tiles (cache when added):
  './assets/sprites/tiles/f1.png',
  './assets/sprites/tiles/f2.png',
  './assets/sprites/tiles/w1.png',
  './assets/sprites/tiles/w2.png',
  // Spritesheets:
  './spritesheet/layer1.png',
  './spritesheet/layer2.jpeg',
  './spritesheet/layer1.jpg',
];

// ── INSTALL: cache core assets ───────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clear old caches ───────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => CACHE_OLD.includes(k)).map(k => caches.delete(k))
      )
    ).then(() => {
      // Eagerly cache sprites (don't block activation)
      caches.open(CACHE).then(c => {
        SPRITE_ASSETS.forEach(url => {
          fetch(url).then(r => { if (r.ok) c.put(url, r); }).catch(() => {});
        });
      });
      return self.clients.claim();
    })
  );
});

// ── FETCH: serve from cache, update in background ────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // HTML: network-first (always get latest game version)
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Assets: cache-first (instant load, update in background)
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => null);
      return cached || networkFetch;
    })
  );
});

// ── MESSAGE: force update ────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
