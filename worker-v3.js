import baseWorker from "./worker-v2.js";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      ...headers
    }
  });
}

function clean(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

async function pagedVideoSearch(request, env) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") === "pixabay" ? "pixabay" : "pexels";
  const query = clean(url.searchParams.get("query"));
  const page = Math.max(1, Math.min(80, Number(url.searchParams.get("page")) || 1));
  const perPage = Math.max(6, Math.min(source === "pixabay" ? 50 : 30, Number(url.searchParams.get("per_page")) || 30));
  if (!query) return json({ error: "Missing query." }, 400);

  try {
    if (source === "pixabay") {
      if (!env.PIXABAY_API_KEY) return json({ error: "PIXABAY_API_KEY is not configured." }, 503);
      const upstreamUrl = new URL("https://pixabay.com/api/videos/");
      upstreamUrl.searchParams.set("key", env.PIXABAY_API_KEY);
      upstreamUrl.searchParams.set("q", query);
      upstreamUrl.searchParams.set("page", String(page));
      upstreamUrl.searchParams.set("per_page", String(perPage));
      upstreamUrl.searchParams.set("safesearch", "true");
      upstreamUrl.searchParams.set("order", page % 2 === 0 ? "latest" : "popular");
      const upstream = await fetch(upstreamUrl, {
        headers: { accept: "application/json" },
        cf: { cacheEverything: true, cacheTtl: 300 }
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return json({ error: data?.message || `Pixabay ${upstream.status}` }, upstream.status);
      return json({ ...data, page, per_page: perPage, source }, 200, { "cache-control": "public, max-age=300" });
    }

    if (!env.PEXELS_API_KEY) return json({ error: "PEXELS_API_KEY is not configured." }, 503);
    const upstreamUrl = new URL("https://api.pexels.com/videos/search");
    upstreamUrl.searchParams.set("query", query);
    upstreamUrl.searchParams.set("orientation", "portrait");
    upstreamUrl.searchParams.set("size", "medium");
    upstreamUrl.searchParams.set("page", String(page));
    upstreamUrl.searchParams.set("per_page", String(perPage));
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: env.PEXELS_API_KEY, accept: "application/json" },
      cf: { cacheEverything: true, cacheTtl: 180 }
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error || `Pexels ${upstream.status}` }, upstream.status);
    return json({ ...data, page, per_page: perPage, source }, 200, { "cache-control": "public, max-age=180" });
  } catch (error) {
    return json({ error: `Unable to search videos: ${String(error?.message || error).slice(0, 180)}` }, 502);
  }
}

async function injectEditorRuntime(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();
  html = html.replace(/editor-pro-v2\.js\?v=\d+/g, "editor-pro-v2.js?v=1");
  if (!html.includes("editor-pro-v2.js")) {
    html = html.replace("</body>", '<script src="editor-pro-v2.js?v=1"></script></body>');
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/video-search" && request.method === "GET") {
      return pagedVideoSearch(request, env);
    }
    const response = await baseWorker.fetch(request, env, ctx);
    return injectEditorRuntime(response);
  }
};
