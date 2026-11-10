const CACHE = "oleolab-racks-v34-movement-details";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(path => new Request(new URL(path, self.registration.scope), {cache:"reload"})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("oleolab-racks-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({type:"window"});
    await Promise.all(clients.map(client => client.navigate(client.url).catch(() => {})));
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate" || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith(fetch(request, {cache:"no-cache"}).catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(new URL("./index.html", self.registration.scope))) || Response.error();
  }));
});
