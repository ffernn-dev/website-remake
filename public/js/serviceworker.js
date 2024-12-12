const assets = [
  "/",
  "/css/index.css",
  "/css/posts.css",
  "/js/index.js",
  "/js/posts.js",
  "/js/thumbhash.js",
  "/icons/favicon-16x16.png",
  "/icons/favicon-32x32.png",
  "/favicon.ico",
  "/icons/icon128_rounded.png",
  "/icons/icon128_maskable.png",
  "/icons/icon192_rounded.png",
  "/icons/icon192_maskable.png",
  "/icons/icon384_rounded.png",
  "/icons/icon384_maskable.png",
  "/icons/icon512_rounded.png",
  "/icons/icon512_maskable.png",
];

const CATALOGUE_ASSETS = "catalogue-assets";

self.addEventListener("install", (installEvt) => {
  installEvt.waitUntil(
    caches.open(CATALOGUE_ASSETS).then((cache) => {
      return Promise.all(
        assets.map((asset) =>
          cache
            .add(asset)
            .catch((err) => console.error(`Failed to cache ${asset}:`, err)),
        ),
      );
    }),
  );
});

self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key === CATALOGUE_ASSETS) {
              console.log("Removed old cache from", key);
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", function (evt) {
  evt.respondWith(
    caches.match(evt.request).then((cachedResponse) => {
      // Serve from cache if available, otherwise fetch from network
      return (
        cachedResponse ||
        fetch(evt.request).catch(() => {
          // Optionally serve a fallback page for failed requests
          if (evt.request.destination === "document") {
            return caches.match("/");
          }
        })
      );
    }),
  );
});
