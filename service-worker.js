const CACHE_NAME = "hj-v1";

const FILES = [
    "./",
    "./index.html",

    "./css/styles.css",

    "./js/game.js",

    "./img/space_bg.png"
];

self.addEventListener("install", e => {

    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES))
    );

});

self.addEventListener("fetch", e => {

    e.respondWith(

        caches.match(e.request)
            .then(r => r || fetch(e.request))

    );

});

