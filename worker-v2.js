import baseWorker from "./worker.js";

const QURAN_API_HOST = "api.alquran.cloud";
const QURAN_AUDIO_HOSTS = new Set([
  "cdn.islamic.network",
  "islamic-network.fra1.cdn.digitaloceanspaces.com",
  "cdn.alquran.cloud"
]);

// We deliberately start with a controlled pool, verify every entry with the live
// API + a real audio byte-range request, and expose only entries that pass.
// More candidates can be added here later without ever showing a dead reader.
const RECITER_CANDIDATES = [
  "ar.alafasy",
  "ar.husary",
  "ar.abdulbasitmurattal",
  "ar.abdurrahmaansudais",
  "ar.minshawi",
  "ar.minshawimujawwad",
  "ar.abdulbasitmujawwad",
  "ar.hudhaify",
  "ar.shuraym",
  "ar.muhammadjibreel",
  "ar.muhammadayyoub",
  "ar.mahermuaiqly",
  "ar.saadalghamdi",
  "ar.ahmedajamy",
  "ar.basfar"
];

const ARABIC_RECITER_NAMES = new Map([
  ["ar.alafasy", "مشاري راشد العفاسي"],
  ["ar.husary", "محمود خليل الحصري"],
  ["ar.abdulbasitmurattal", "عبد الباسط عبد الصمد"],
  ["ar.abdurrahmaansudais", "عبد الرحمن السديس"],
  ["ar.minshawi", "محمد صديق المنشاوي"],
  ["ar.minshawimujawwad", "محمد صديق المنشاوي"],
  ["ar.abdulbasitmujawwad", "عبد الباسط عبد الصمد"],
  ["ar.hudhaify", "علي الحذيفي"],
  ["ar.shuraym", "سعود الشريم"],
  ["ar.muhammadjibreel", "محمد جبريل"],
  ["ar.muhammadayyoub", "محمد أيوب"],
  ["ar.mahermuaiqly", "ماهر المعيقلي"],
  ["ar.saadalghamdi", "سعد الغامدي"],
  ["ar.ahmedajamy", "أحمد بن علي العجمي"],
  ["ar.basfar", "عبد الله بصفر"]
]);

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      ...extraHeaders
    }
  });
}

function safeHttpsUrl(raw, allowedHosts) {
  try {
    const url = new URL(String(raw || ""));
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const allowed = typeof allowedHosts === "string"
      ? host === allowedHosts
      : allowedHosts instanceof Set
        ? allowedHosts.has(host)
        : false;
    return allowed ? url : null;
  } catch {
    return null;
  }
}

function safeQuranAudioUrl(raw) {
  return safeHttpsUrl(raw, QURAN_AUDIO_HOSTS);
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function quranApiData(path, timeoutMs = 7000) {
  const url = `https://${QURAN_API_HOST}/v1/${String(path).replace(/^\/+/, "")}`;
  const response = await fetchWithTimeout(url, {
    headers: { accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 3600 }
  }, timeoutMs);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.code && payload.code !== 200)) {
    throw new Error(payload.status || `Quran API ${response.status}`);
  }
  return payload.data ?? payload;
}

async function proxyQuranJson(request) {
  const requestUrl = new URL(request.url);
  const target = safeHttpsUrl(requestUrl.searchParams.get("url"), QURAN_API_HOST);
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
  const target = safeQuranAudioUrl(requestUrl.searchParams.get("url"));
  if (!target) return json({ error: "Invalid Quran audio URL." }, 400);

  try {
    const headers = new Headers({ accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8" });
    const range = request.headers.get("range");
    if (range) headers.set("range", range);

    const upstream = await fetch(target, {
      headers,
      redirect: "follow",
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

function reciterMode(identifier, edition) {
  const hay = `${identifier} ${edition?.name || ""} ${edition?.englishName || ""}`.toLowerCase();
  return /(mujawwad|mujawad|tajw|مجود|تجويد)/i.test(hay) ? "tajwid" : "tartil";
}

async function audioUrlWorks(rawUrl) {
  const url = safeQuranAudioUrl(rawUrl);
  if (!url) return false;
  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
        range: "bytes=0-2047"
      },
      redirect: "follow"
    }, 6000);
    if (!response.ok && response.status !== 206) return false;
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type.includes("text/html") || type.includes("application/json")) return false;
    const reader = response.body?.getReader();
    if (!reader) return Number(response.headers.get("content-length") || 0) > 0;
    const first = await reader.read();
    try { await reader.cancel(); } catch {}
    return !!first.value?.byteLength;
  } catch {
    return false;
  }
}

async function verifyReciter(edition) {
  const identifier = String(edition?.identifier || "").trim();
  if (!identifier) return null;
  try {
    // Sample the beginning and a distant short surah. The first sample also
    // verifies real MP3 bytes, not just that metadata exists.
    const [fatiha, ikhlas] = await Promise.all([
      quranApiData(`surah/1/${encodeURIComponent(identifier)}`),
      quranApiData(`surah/112/${encodeURIComponent(identifier)}`)
    ]);
    const firstAudio = fatiha?.ayahs?.[0]?.audio;
    const distantAudio = ikhlas?.ayahs?.[0]?.audio;
    if (!firstAudio || !distantAudio || !safeQuranAudioUrl(distantAudio)) return null;
    if (!(await audioUrlWorks(firstAudio))) return null;

    return {
      identifier,
      name: ARABIC_RECITER_NAMES.get(identifier) || edition.name || edition.englishName || identifier,
      englishName: edition.englishName || "",
      mode: reciterMode(identifier, edition),
      previewAudio: firstAudio
    };
  } catch {
    return null;
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

async function buildVerifiedReciterCatalog() {
  const editions = await quranApiData("edition/format/audio", 9000);
  const all = Array.isArray(editions) ? editions : [];
  const byId = new Map(all
    .filter(item => item?.format === "audio" && (item.language === "ar" || String(item.identifier || "").startsWith("ar.")))
    .map(item => [String(item.identifier), item]));

  const candidates = RECITER_CANDIDATES.map(id => byId.get(id)).filter(Boolean);
  const checked = await mapLimit(candidates, 4, verifyReciter);
  const reciters = checked.filter(Boolean);
  reciters.sort((a, b) => {
    if (a.mode !== b.mode) return a.mode === "tartil" ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), "ar");
  });

  return {
    reciters,
    checked: candidates.length,
    sourceCount: all.length,
    generatedAt: new Date().toISOString()
  };
}

async function verifiedReciterCatalog(request, ctx) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(`${url.origin}/__cache/quran-reciter-catalog-v2`);
  const cache = caches.default;

  if (!refresh) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  try {
    const payload = await buildVerifiedReciterCatalog();
    const response = json(payload, 200, { "cache-control": "public, max-age=21600" });
    ctx?.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    const stale = await cache.match(cacheKey);
    if (stale) return stale;
    return json({
      reciters: [],
      checked: 0,
      error: `تعذر فحص أصوات القراء الآن: ${String(error?.message || error).slice(0, 160)}`
    }, 503);
  }
}

async function withQuranRuntime(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  let html = await response.text();
  html = html.replace(/quran-reciter-picker\.js\?v=\d+/g, "quran-reciter-picker.js?v=5");
  html = html.replace(/quran-runtime-v3\.js\?v=\d+/g, "quran-runtime-v3.js?v=4");
  html = html.replace(/quran-publish-tools\.js\?v=\d+/g, "quran-publish-tools.js?v=1");

  const scripts = [];
  if (!html.includes("quran-reciter-picker.js")) scripts.push('<script src="quran-reciter-picker.js?v=5"></script>');
  if (!html.includes("quran-runtime-v3.js")) scripts.push('<script src="quran-runtime-v3.js?v=4"></script>');
  if (!html.includes("quran-publish-tools.js")) scripts.push('<script src="quran-publish-tools.js?v=1"></script>');
  if (scripts.length) html = html.replace("</body>", `${scripts.join("")} </body>`);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quran-json" && request.method === "GET") return proxyQuranJson(request);
    if (url.pathname === "/api/quran-media" && request.method === "GET") return proxyQuranAudio(request);
    if (url.pathname === "/api/quran-reciter-catalog" && request.method === "GET") return verifiedReciterCatalog(request, ctx);
    const response = await baseWorker.fetch(request, env, ctx);
    return withQuranRuntime(response);
  }
};
