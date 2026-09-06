import baseWorker from "./worker.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function safeHttpsUrl(raw, allowedHost) {
  try {
    const url = new URL(String(raw || ""));
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== allowedHost) return null;
    return url;
  } catch {
    return null;
  }
}

async function proxyQuranJson(request) {
  const requestUrl = new URL(request.url);
  const target = safeHttpsUrl(requestUrl.searchParams.get("url"), "api.alquran.cloud");
  if (!target) return json({ error: "Invalid Quran API URL." }, 400);

  try {
    const upstream = await fetch(target, {
      headers: { accept: "application/json" },
      cf: { cacheEverything: true, cacheTtl: 3600 }
    });
    const headers = new Headers(upstream.headers);
    headers.set("access-control-allow-origin", "*");
    headers.set("cache-control", "public, max-age=3600");
    headers.delete("set-cookie");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  } catch (error) {
    return json({ error: `Unable to reach Quran API: ${String(error?.message || error).slice(0, 200)}` }, 502);
  }
}

async function proxyQuranAudio(request) {
  const requestUrl = new URL(request.url);
  const target = safeHttpsUrl(requestUrl.searchParams.get("url"), "cdn.islamic.network");
  if (!target) return json({ error: "Invalid Quran audio URL." }, 400);

  try {
    const headers = new Headers({ accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8" });
    const range = request.headers.get("range");
    if (range) headers.set("range", range);

    const upstream = await fetch(target, {
      headers,
      cf: { cacheEverything: true, cacheTtl: 86400 }
    });

    if (!upstream.ok && upstream.status !== 206) {
      return json({ error: `Quran audio upstream ${upstream.status}` }, upstream.status);
    }

    const out = new Headers(upstream.headers);
    out.set("access-control-allow-origin", "*");
    out.set("cross-origin-resource-policy", "cross-origin");
    out.set("cache-control", "public, max-age=86400");
    out.delete("set-cookie");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: out
    });
  } catch (error) {
    return json({ error: `Unable to fetch Quran audio: ${String(error?.message || error).slice(0, 200)}` }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quran-json" && request.method === "GET") return proxyQuranJson(request);
    if (url.pathname === "/api/quran-media" && request.method === "GET") return proxyQuranAudio(request);
    return baseWorker.fetch(request, env, ctx);
  }
};
