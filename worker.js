const PEXELS_API = "https://api.pexels.com/videos/search";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function handlePexels(request, env) {
  if (!env.PEXELS_API_KEY) {
    return json({ error: "PEXELS_API_KEY is not configured in Cloudflare." }, 503);
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("query") || "").trim();
  if (!query) return json({ error: "Missing query." }, 400);
  if (query.length > 100) return json({ error: "Query is too long." }, 400);

  const perPage = Math.max(1, Math.min(30, Number(url.searchParams.get("per_page")) || 18));
  const pexelsUrl = new URL(PEXELS_API);
  pexelsUrl.searchParams.set("query", query);
  pexelsUrl.searchParams.set("orientation", "portrait");
  pexelsUrl.searchParams.set("size", "medium");
  pexelsUrl.searchParams.set("per_page", String(perPage));

  try {
    const upstream = await fetch(pexelsUrl, {
      headers: {
        Authorization: env.PEXELS_API_KEY,
        Accept: "application/json",
      },
    });

    const headers = new Headers(upstream.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", upstream.ok ? "public, max-age=120" : "no-store");
    headers.delete("set-cookie");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    return json({ error: "Unable to reach Pexels right now." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/pexels") {
      return handlePexels(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};