// Service Worker for GPX Go!
const CACHE_NAME = "gpx-go-v6";
const urlsToCache = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./fk.json",
  "./manifest.json",
  "./favicon.png",
  "./assets/icon-72x72.png",
  "./assets/icon-96x96.png",
  "./assets/icon-128x128.png",
  "./assets/icon-144x144.png",
  "./assets/icon-152x152.png",
  "./assets/icon-192x192.png",
  "./assets/icon-384x384.png",
  "./assets/icon-512x512.png",
  "./modules/config.js",
  "./modules/coordinates.js",
  "./modules/gpxProcessor.js",
  "./modules/locationTracker.js",
  "./modules/markers.js",
  "./modules/pointFilter.js",
  "./modules/storage.js",
  "./modules/uiController.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.5.1/gpx.min.js",
  "https://cdn.jsdelivr.net/npm/proj4@2.9.0/dist/proj4.js",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});
