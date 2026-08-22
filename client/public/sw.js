/*
 * Roamaps PWA share target — holds a shared CFD Jaal file only long enough
 * to redirect the installed app to its existing strict import confirmation.
 * No file is sent to a server; cached transfer data is deleted after reading.
 */

const SHARE_ACTION = "/share-cfd";
const SHARE_CACHE = "roamaps-cfd-share-v1";
const SHARE_PARAM = "shared-cfd";
const MAX_SHARED_BYTES = 20 * 1024 * 1024;
const TRANSFER_TTL_MS = 10 * 60 * 1000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function clearExpiredShares(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.map(async (request) => {
    const response = await cache.match(request);
    const createdAt = Number(response?.headers.get("x-roamaps-share-created-at") ?? 0);
    if (!createdAt || Date.now() - createdAt > TRANSFER_TTL_MS) await cache.delete(request);
  }));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.origin !== self.location.origin || url.pathname !== SHARE_ACTION) return;

  event.respondWith((async () => {
    try {
      const formData = await event.request.formData();
      const candidate = formData.get("cfdJaal");
      if (!(candidate instanceof File) || candidate.size > MAX_SHARED_BYTES || !candidate.name.toLowerCase().endsWith(".cfdj")) {
        return Response.redirect(`${self.location.origin}/?shared-cfd=invalid#/`, 303);
      }

      const cache = await caches.open(SHARE_CACHE);
      await clearExpiredShares(cache);
      const key = crypto.randomUUID();
      await cache.put(
        new Request(`${self.location.origin}/__roamaps-share/${key}`),
        new Response(await candidate.arrayBuffer(), {
          headers: {
            "content-type": candidate.type || "application/vnd.roamaps.cfd-jaal+json",
            "x-roamaps-share-created-at": String(Date.now()),
          },
        }),
      );
      return Response.redirect(`${self.location.origin}/?${SHARE_PARAM}=${encodeURIComponent(key)}#/`, 303);
    } catch {
      return Response.redirect(`${self.location.origin}/?shared-cfd=error#/`, 303);
    }
  })());
});
