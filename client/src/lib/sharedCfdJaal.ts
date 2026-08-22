/**
 * Roamaps style reminder — local-first data only. This bridge consumes an
 * Android PWA share-target file from same-origin Cache Storage, removes it,
 * and sends the File through the existing strict CFD Jaal parser in Home.
 */

export const SHARED_CFD_QUERY = "shared-cfd";
const SHARE_CACHE = "roamaps-cfd-share-v1";
const SHARE_PREFIX = "/__roamaps-share/";
const KEY_PATTERN = /^[a-f0-9-]{36}$/i;

export async function consumeSharedCfdJaal(): Promise<{ file: File | null; reason: "none" | "invalid" | "error" }> {
  const url = new URL(window.location.href);
  const key = url.searchParams.get(SHARED_CFD_QUERY);
  if (!key) return { file: null, reason: "none" };

  url.searchParams.delete(SHARED_CFD_QUERY);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${window.location.hash || "#/"}`);

  if (key === "invalid") return { file: null, reason: "invalid" };
  if (key === "error" || !KEY_PATTERN.test(key) || !("caches" in window)) return { file: null, reason: "error" };

  try {
    const cache = await caches.open(SHARE_CACHE);
    const request = new Request(`${window.location.origin}${SHARE_PREFIX}${key}`);
    const response = await cache.match(request);
    await cache.delete(request);
    if (!response) return { file: null, reason: "error" };
    return {
      file: new File([await response.blob()], "Shared Roadmap.cfdj", {
        type: response.headers.get("content-type") || "application/vnd.roamaps.cfd-jaal+json",
      }),
      reason: "none",
    };
  } catch {
    return { file: null, reason: "error" };
  }
}
