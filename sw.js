self.addEventListener('fetch', function(event) {
  // This is a basic service worker to allow PWA installation
  event.respondWith(fetch(event.request));
});
