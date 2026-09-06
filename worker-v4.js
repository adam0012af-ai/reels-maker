import baseWorker from "./worker-v3.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // The reciter picker historically routes preview audio through /api/quran-media.
    // HQ Quran metadata now points to our own /api/quran-hq endpoint, so bridge
    // that same-origin URL back into worker-v3 instead of rejecting it as a
    // third-party media URL.
    if (url.pathname === "/api/quran-media" && request.method === "GET") {
      const raw = url.searchParams.get("url");
      if (raw) {
        try {
          const target = new URL(raw, url.origin);
          if (target.origin === url.origin && target.pathname === "/api/quran-hq") {
            const headers = new Headers(request.headers);
            const bridged = new Request(target.toString(), { method: "GET", headers });
            return baseWorker.fetch(bridged, env, ctx);
          }
        } catch {}
      }
    }

    return baseWorker.fetch(request, env, ctx);
  }
};
