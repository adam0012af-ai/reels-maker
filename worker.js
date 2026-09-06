const PEXELS_API = "https://api.pexels.com/videos/search";
const PIXABAY_API = "https://pixabay.com/api/videos/";
const GIPHY_GIFS_API = "https://api.giphy.com/v1/gifs/search";
const GIPHY_STICKERS_API = "https://api.giphy.com/v1/stickers/search";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function readQuery(request) {
  return new URL(request.url).searchParams;
}

function cleanQuery(value, max = 100) {
  return String(value || "").trim().slice(0, max);
}

async function safeJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function proxyJson(url, options = {}, cacheSeconds = 0) {
  const init = { ...options };
  if (cacheSeconds > 0) init.cf = { cacheTtl: cacheSeconds, cacheEverything: true };
  const upstream = await fetch(url, init);
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text || `Upstream ${upstream.status}` }; }
  if (!upstream.ok) return json(data, upstream.status);
  return json(data, 200, cacheSeconds > 0 ? { "cache-control": `public, max-age=${cacheSeconds}` } : {});
}

async function handlePexels(request, env) {
  if (!env.PEXELS_API_KEY) return json({ error: "PEXELS_API_KEY is not configured." }, 503);
  const p = readQuery(request);
  const query = cleanQuery(p.get("query"));
  if (!query) return json({ error: "Missing query." }, 400);
  const perPage = Math.max(1, Math.min(30, Number(p.get("per_page")) || 18));
  const url = new URL(PEXELS_API);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", String(perPage));
  try {
    return await proxyJson(url, { headers: { Authorization: env.PEXELS_API_KEY, Accept: "application/json" } }, 120);
  } catch {
    return json({ error: "Unable to reach Pexels." }, 502);
  }
}

async function handlePixabay(request, env) {
  if (!env.PIXABAY_API_KEY) return json({ error: "PIXABAY_API_KEY is not configured." }, 503);
  const p = readQuery(request);
  const query = cleanQuery(p.get("query"));
  if (!query) return json({ error: "Missing query." }, 400);
  const perPage = Math.max(3, Math.min(50, Number(p.get("per_page")) || 18));
  const url = new URL(PIXABAY_API);
  url.searchParams.set("key", env.PIXABAY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  try {
    return await proxyJson(url, { headers: { Accept: "application/json" } }, 86400);
  } catch {
    return json({ error: "Unable to reach Pixabay." }, 502);
  }
}

async function handleGiphy(request, env) {
  if (!env.GIPHY_API_KEY) return json({ error: "GIPHY_API_KEY is not configured." }, 503);
  const p = readQuery(request);
  const query = cleanQuery(p.get("query"), 50);
  if (!query) return json({ error: "Missing query." }, 400);
  const type = p.get("type") === "gifs" ? "gifs" : "stickers";
  const limit = Math.max(1, Math.min(25, Number(p.get("limit")) || 20));
  const url = new URL(type === "gifs" ? GIPHY_GIFS_API : GIPHY_STICKERS_API);
  url.searchParams.set("api_key", env.GIPHY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("rating", "g");
  url.searchParams.set("lang", "en");
  try {
    const upstream = await fetch(url, { headers: { Accept: "application/json" }, cf: { cacheTtl: 300, cacheEverything: true } });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.meta?.msg || "GIPHY request failed." }, upstream.status);
    const items = (data.data || []).map(item => {
      const images = item.images || {};
      const original = images.original || {};
      const preview = images.fixed_width_small || images.fixed_width || images.preview_gif || original;
      const urlValue = original.url || original.webp || original.mp4;
      return {
        id: item.id,
        title: item.title || "GIPHY",
        preview: preview.url || preview.webp || urlValue,
        url: urlValue,
      };
    }).filter(item => item.preview && item.url);
    return json({ items }, 200, { "cache-control": "public, max-age=300" });
  } catch {
    return json({ error: "Unable to reach GIPHY." }, 502);
  }
}

function aiPrompt(type, topic) {
  const labels = {
    dua: "دعاء عربي قصير وجميل ومناسب لفيديو ريلز دون نسبة كلام إلى مصدر ديني محدد ما لم تكن متأكدًا",
    wisdom: "حكمة عربية قصيرة وعصرية",
    quote: "اقتباس تحفيزي عربي قصير وأصلي",
    travel: "كابشن عربي قصير لفيديو سفر",
    business: "كابشن عربي قصير للأعمال والنجاح",
    custom: "كابشن عربي قصير مناسب للموضوع",
  };
  const style = labels[type] || labels.custom;
  return `اكتب ${style}. اجعله سطرًا أو سطرين فقط، طبيعيًا وغير مبالغ فيه، ومن دون هاشتاقات أو علامات اقتباس. الموضوع الاختياري: ${topic || "عام"}. أعد النص فقط.`;
}

async function handleAiCaption(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY is not configured." }, 503);
  const body = await safeJson(request);
  const type = cleanQuery(body.type, 30);
  const topic = cleanQuery(body.prompt, 200);
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const payload = {
    contents: [{ parts: [{ text: aiPrompt(type, topic) }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 120 },
  };
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error?.message || "Gemini request failed." }, upstream.status);
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join(" ").trim();
    if (!text) return json({ error: "Gemini returned no text." }, 502);
    return json({ text });
  } catch {
    return json({ error: "Unable to reach Gemini." }, 502);
  }
}

async function handleTts(request, env) {
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) {
    return json({ error: "ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID is not configured." }, 503);
  }
  const body = await safeJson(request);
  const text = cleanQuery(body.text, 1800);
  if (!text) return json({ error: "Missing text." }, 400);
  const voiceId = env.ELEVENLABS_VOICE_ID;
  const url = `${ELEVENLABS_BASE}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "content-type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL || "eleven_multilingual_v2" }),
    });
    if (!upstream.ok) {
      const message = await upstream.text();
      return json({ error: message.slice(0, 500) || "ElevenLabs request failed." }, upstream.status);
    }
    const headers = new Headers();
    headers.set("content-type", upstream.headers.get("content-type") || "audio/mpeg");
    headers.set("cache-control", "no-store");
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return json({ error: "Unable to reach ElevenLabs." }, 502);
  }
}

function allowedMediaHost(hostname) {
  const h = hostname.toLowerCase();
  return h === "pexels.com" || h.endsWith(".pexels.com") || h === "pixabay.com" || h.endsWith(".pixabay.com") || h === "giphy.com" || h.endsWith(".giphy.com");
}

async function handleMedia(request) {
  const p = readQuery(request);
  const raw = p.get("url");
  if (!raw) return json({ error: "Missing media URL." }, 400);
  let target;
  try { target = new URL(raw); } catch { return json({ error: "Invalid media URL." }, 400); }
  if (target.protocol !== "https:" || !allowedMediaHost(target.hostname)) return json({ error: "Media host is not allowed." }, 403);
  try {
    const headers = new Headers();
    const range = request.headers.get("range");
    if (range) headers.set("range", range);
    const upstream = await fetch(target, { headers, cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!upstream.ok && upstream.status !== 206) return json({ error: `Media upstream ${upstream.status}` }, upstream.status);
    const out = new Headers(upstream.headers);
    out.set("access-control-allow-origin", "*");
    out.set("cross-origin-resource-policy", "cross-origin");
    out.set("cache-control", "public, max-age=3600");
    out.delete("set-cookie");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  } catch {
    return json({ error: "Unable to fetch media." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/pexels" && request.method === "GET") return handlePexels(request, env);
    if (url.pathname === "/api/pixabay" && request.method === "GET") return handlePixabay(request, env);
    if (url.pathname === "/api/giphy" && request.method === "GET") return handleGiphy(request, env);
    if (url.pathname === "/api/ai-caption" && request.method === "POST") return handleAiCaption(request, env);
    if (url.pathname === "/api/tts" && request.method === "POST") return handleTts(request, env);
    if (url.pathname === "/api/media" && request.method === "GET") return handleMedia(request);
    if (url.pathname.startsWith("/api/")) return json({ error: "API endpoint not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
