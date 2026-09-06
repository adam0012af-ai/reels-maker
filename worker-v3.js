import baseWorker from "./worker-v2.js";

const HQ_RECITERS = new Map([
  ["ar.alafasy", { folder: "Alafasy_128kbps", kbps: 128 }],
  ["ar.husary", { folder: "Husary_128kbps", kbps: 128 }],
  ["ar.abdulbasitmurattal", { folder: "Abdul_Basit_Murattal_192kbps", kbps: 192 }],
  ["ar.abdurrahmaansudais", { folder: "Abdurrahmaan_As-Sudais_192kbps", kbps: 192 }],
  ["ar.minshawi", { folder: "Minshawy_Murattal_128kbps", kbps: 128 }],
  ["ar.minshawimujawwad", { folder: "Minshawy_Mujawwad_192kbps", kbps: 192 }],
  ["ar.abdulbasitmujawwad", { folder: "Abdul_Basit_Mujawwad_128kbps", kbps: 128 }],
  ["ar.hudhaify", { folder: "Hudhaify_128kbps", kbps: 128 }],
  ["ar.shuraym", { folder: "Saood_ash-Shuraym_128kbps", kbps: 128 }],
  ["ar.muhammadjibreel", { folder: "Muhammad_Jibreel_128kbps", kbps: 128 }],
  ["ar.muhammadayyoub", { folder: "Muhammad_Ayyoub_128kbps", kbps: 128 }],
  ["ar.mahermuaiqly", { folder: "MaherAlMuaiqly128kbps", kbps: 128 }],
  ["ar.basfar", { folder: "Abdullah_Basfar_192kbps", kbps: 192 }],
  ["ar.ahmedajamy", { folder: "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net", kbps: 128 }]
]);

const FALLBACK_QURAN_HOSTS = new Set([
  "cdn.islamic.network",
  "islamic-network.fra1.cdn.digitaloceanspaces.com",
  "cdn.alquran.cloud"
]);

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

function safeFallbackAudio(raw) {
  try {
    const url = new URL(String(raw || ""));
    return url.protocol === "https:" && FALLBACK_QURAN_HOSTS.has(url.hostname.toLowerCase()) ? url : null;
  } catch {
    return null;
  }
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

async function quranHqAudio(request) {
  const url = new URL(request.url);
  const identifier = clean(url.searchParams.get("identifier"), 80);
  const reciter = HQ_RECITERS.get(identifier);
  const surah = Math.max(1, Math.min(114, Number(url.searchParams.get("surah")) || 1));
  const ayah = Math.max(1, Math.min(400, Number(url.searchParams.get("ayah")) || 1));
  if (!reciter) return json({ error: "HQ reciter is not configured." }, 404);

  const file = `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
  const target = `https://everyayah.com/data/${encodeURIComponent(reciter.folder)}/${file}`;
  const headers = new Headers({ accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.5" });
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  let upstream;
  try {
    upstream = await fetch(target, { headers, cf: { cacheEverything: true, cacheTtl: 86400 } });
  } catch {
    upstream = null;
  }

  if (!upstream?.ok && upstream?.status !== 206) {
    const fallback = safeFallbackAudio(url.searchParams.get("fallback"));
    if (!fallback) return json({ error: "HQ audio unavailable and no safe fallback exists." }, 502);
    try {
      upstream = await fetch(fallback, { headers, cf: { cacheEverything: true, cacheTtl: 21600 } });
    } catch {
      return json({ error: "Unable to reach Quran audio source." }, 502);
    }
  }

  if (!upstream.ok && upstream.status !== 206) return json({ error: `Quran audio ${upstream.status}` }, upstream.status);
  const outHeaders = new Headers(upstream.headers);
  outHeaders.set("access-control-allow-origin", "*");
  outHeaders.set("cache-control", "public, max-age=86400");
  outHeaders.set("x-quran-audio-quality", `${reciter.kbps}kbps`);
  outHeaders.delete("set-cookie");
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: outHeaders });
}

function parseReciterRequest(raw) {
  try {
    const target = new URL(raw);
    if (target.hostname !== "api.alquran.cloud") return null;
    const match = target.pathname.match(/\/v1\/surah\/(\d+)\/([^/?#]+)/i);
    if (!match) return null;
    return { surah: Number(match[1]), identifier: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

async function quranJsonWithHq(request, env, ctx) {
  const url = new URL(request.url);
  const info = parseReciterRequest(url.searchParams.get("url"));
  if (!info || !HQ_RECITERS.has(info.identifier)) return baseWorker.fetch(request, env, ctx);

  const base = await baseWorker.fetch(request, env, ctx);
  if (!base.ok) return base;
  const payload = await base.json().catch(() => null);
  const ayahs = payload?.data?.ayahs;
  if (!payload || !Array.isArray(ayahs)) return json({ error: "Invalid Quran audio metadata." }, 502);
  const origin = url.origin;
  ayahs.forEach(ayah => {
    if (!ayah?.numberInSurah || !ayah?.audio) return;
    const params = new URLSearchParams({
      identifier: info.identifier,
      surah: String(info.surah),
      ayah: String(ayah.numberInSurah),
      fallback: String(ayah.audio)
    });
    ayah.audio = `${origin}/api/quran-hq?${params.toString()}`;
  });
  payload.hqAudio = { identifier: info.identifier, kbps: HQ_RECITERS.get(info.identifier).kbps, source: "EveryAyah" };
  return json(payload, 200, { "cache-control": "public, max-age=3600" });
}

async function islamicStory(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY is not configured." }, 503);
  const body = await request.json().catch(() => ({}));
  const topic = clean(body.topic, 180) || "قيمة إسلامية جميلة";
  const length = ["short", "medium", "long"].includes(body.length) ? body.length : "medium";
  const specs = {
    short: "بين 90 و130 كلمة، مناسبة لتعليق صوتي قرابة 45 ثانية",
    medium: "بين 180 و260 كلمة، مناسبة لتعليق صوتي قرابة 90 ثانية",
    long: "بين 330 و450 كلمة، قصة كاملة مناسبة لمقطع مدته دقيقتان إلى ثلاث دقائق"
  };
  const prompt = `اكتب قصة عربية تربوية أصلية بطابع إسلامي عن: ${topic}. اجعلها ${specs[length]}.\nالشروط:\n- القصة أصلية للتربية والعبرة وليست نقلًا عن حادثة دينية ثابتة.\n- لا تنسب أي قول إلى الله أو النبي ﷺ أو الصحابة، ولا تخترع آية أو حديثًا.\n- لغة عربية واضحة، مشاهد قابلة للتحويل إلى ريلز، بداية جذابة ونهاية فيها عِبرة قصيرة.\n- لا تكتب هاشتاقات ولا مقدمات عن كونك ذكاءً اصطناعيًا.\nأعد القصة فقط.`;
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.78, maxOutputTokens: length === "long" ? 1600 : length === "medium" ? 950 : 520 }
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error?.message || `Gemini ${upstream.status}` }, upstream.status);
    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("\n").trim();
    return text ? json({ text }) : json({ error: "Gemini returned no story." }, 502);
  } catch (error) {
    return json({ error: `Unable to generate story: ${String(error?.message || error).slice(0, 200)}` }, 502);
  }
}

async function injectEditorRuntime(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();
  const scripts = [
    ["editor-pro-v2.js", 3],
    ["quran-editor-proxy.js", 3],
    ["quran-ux-v5.js", 1],
    ["islamic-content-studio.js", 1]
  ];
  for (const [name, version] of scripts) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`${escaped}\\?v=\\d+`, "g"), `${name}?v=${version}`);
    if (!html.includes(name)) html = html.replace("</body>", `<script src="${name}?v=${version}"></script></body>`);
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/video-search" && request.method === "GET") return pagedVideoSearch(request, env);
    if (url.pathname === "/api/quran-hq" && request.method === "GET") return quranHqAudio(request);
    if (url.pathname === "/api/quran-json" && request.method === "GET") return quranJsonWithHq(request, env, ctx);
    if (url.pathname === "/api/islamic-story" && request.method === "POST") return islamicStory(request, env);
    const response = await baseWorker.fetch(request, env, ctx);
    return injectEditorRuntime(response);
  }
};
