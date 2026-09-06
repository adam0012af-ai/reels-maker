const PEXELS_API = "https://api.pexels.com/videos/search";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
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

function injectCloudflareBridge(html) {
  const bridge = `
<script>
(() => {
  window.searchPexels = async function(query) {
    query = (query || "").trim();
    if (!query) return toast("اكتب كلمة للبحث أولاً.", "error");

    controls.results.innerHTML = '<div class="results-msg">جاري البحث...</div>';
    try {
      const r = await fetch('/api/pexels?query=' + encodeURIComponent(query) + '&per_page=18');
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || ('Pexels ' + r.status));
      showResults(data.videos || []);
    } catch (err) {
      console.error(err);
      controls.results.innerHTML = '<div class="results-msg">تعذر تحميل النتائج حاليًا.</div>';
      toast("تعذر الاتصال بـ Pexels. تحقق من إعداد Cloudflare.", "error");
    }
  };

  const hideKeyField = () => {
    const key = document.getElementById('pexelsKey');
    const save = document.getElementById('saveKeyBtn');
    const field = key && key.closest('.field');
    if (field) field.style.display = 'none';
    if (key) key.value = '';
    if (save) save.style.display = 'none';
    try { localStorage.removeItem('reelsMakerPexelsKey'); } catch (_) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideKeyField, { once: true });
  } else {
    hideKeyField();
  }
})();
</script>`;

  return html.includes("</body>") ? html.replace("</body>", `${bridge}\n</body>`) : html + bridge;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/pexels") {
      return handlePexels(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const type = assetResponse.headers.get("content-type") || "";

    if (!type.includes("text/html")) return assetResponse;

    const html = await assetResponse.text();
    const headers = new Headers(assetResponse.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "no-cache");

    return new Response(injectCloudflareBridge(html), {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
