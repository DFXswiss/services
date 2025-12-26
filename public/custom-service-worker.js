self.addEventListener('install', (_event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (_event) => {
  clients.claim();
});

self.addEventListener('fetch', (_event) => {
  // empty, follow default caching strategy
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
