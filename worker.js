const PEXELS_API = "https://api.pexels.com/videos/search";
const PIXABAY_API = "https://pixabay.com/api/videos/";
const GIPHY_GIFS_API = "https://api.giphy.com/v1/gifs/search";
const GIPHY_STICKERS_API = "https://api.giphy.com/v1/stickers/search";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const ELEVENLABS_TTS = "https://api.elevenlabs.io/v1/text-to-speech";
const ELEVENLABS_VOICES = "https://api.elevenlabs.io/v2/voices";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
function readQuery(request) { return new URL(request.url).searchParams; }
function cleanQuery(value, max = 100) { return String(value || "").trim().slice(0, max); }
async function safeJson(request) { try { return await request.json(); } catch { return {}; } }
async function proxyJson(url, options = {}, cacheSeconds = 0) {
  const init = { ...options };
  if (cacheSeconds > 0) init.cf = { cacheTtl: cacheSeconds, cacheEverything: true };
  const upstream = await fetch(url, init);
  const text = await upstream.text();
  let data; try { data = JSON.parse(text); } catch { data = { error: text || `Upstream ${upstream.status}` }; }
  if (!upstream.ok) return json(data, upstream.status);
  return json(data, 200, cacheSeconds > 0 ? { "cache-control": `public, max-age=${cacheSeconds}` } : {});
}

async function handlePexels(request, env) {
  if (!env.PEXELS_API_KEY) return json({ error: "PEXELS_API_KEY is not configured." }, 503);
  const p = readQuery(request), query = cleanQuery(p.get("query"));
  if (!query) return json({ error: "Missing query." }, 400);
  const url = new URL(PEXELS_API);
  url.searchParams.set("query", query); url.searchParams.set("orientation", "portrait"); url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", String(Math.max(1, Math.min(30, Number(p.get("per_page")) || 18))));
  try { return await proxyJson(url, { headers: { Authorization: env.PEXELS_API_KEY, Accept: "application/json" } }, 120); }
  catch { return json({ error: "Unable to reach Pexels." }, 502); }
}

async function handlePixabay(request, env) {
  if (!env.PIXABAY_API_KEY) return json({ error: "PIXABAY_API_KEY is not configured." }, 503);
  const p = readQuery(request), query = cleanQuery(p.get("query"));
  if (!query) return json({ error: "Missing query." }, 400);
  const url = new URL(PIXABAY_API);
  url.searchParams.set("key", env.PIXABAY_API_KEY); url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(Math.max(3, Math.min(50, Number(p.get("per_page")) || 18))));
  url.searchParams.set("safesearch", "true"); url.searchParams.set("order", "popular");
  try { return await proxyJson(url, { headers: { Accept: "application/json" } }, 86400); }
  catch { return json({ error: "Unable to reach Pixabay." }, 502); }
}

async function handleGiphy(request, env) {
  if (!env.GIPHY_API_KEY) return json({ error: "GIPHY_API_KEY is not configured." }, 503);
  const p = readQuery(request), query = cleanQuery(p.get("query"), 50);
  if (!query) return json({ error: "Missing query." }, 400);
  const type = p.get("type") === "gifs" ? "gifs" : "stickers";
  const url = new URL(type === "gifs" ? GIPHY_GIFS_API : GIPHY_STICKERS_API);
  url.searchParams.set("api_key", env.GIPHY_API_KEY); url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.max(1, Math.min(25, Number(p.get("limit")) || 20)))); url.searchParams.set("rating", "g"); url.searchParams.set("lang", "en");
  try {
    const upstream = await fetch(url, { headers: { Accept: "application/json" }, cf: { cacheTtl: 300, cacheEverything: true } });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.meta?.msg || "GIPHY request failed." }, upstream.status);
    const items = (data.data || []).map(item => {
      const images = item.images || {}, original = images.original || {}, preview = images.fixed_width_small || images.fixed_width || images.preview_gif || original;
      const urlValue = original.url || original.webp || original.mp4;
      return { id: item.id, title: item.title || "GIPHY", preview: preview.url || preview.webp || urlValue, url: urlValue };
    }).filter(item => item.preview && item.url);
    return json({ items }, 200, { "cache-control": "public, max-age=300" });
  } catch { return json({ error: "Unable to reach GIPHY." }, 502); }
}

function aiPrompt(type, topic) {
  const labels = { dua: "دعاء عربي قصير وجميل ومناسب لفيديو ريلز دون نسبة كلام إلى مصدر ديني محدد ما لم تكن متأكدًا", wisdom: "حكمة عربية قصيرة وعصرية", quote: "اقتباس تحفيزي عربي قصير وأصلي", travel: "كابشن عربي قصير لفيديو سفر", business: "كابشن عربي قصير للأعمال والنجاح", custom: "كابشن عربي قصير مناسب للموضوع" };
  return `اكتب ${labels[type] || labels.custom}. اجعله سطرًا أو سطرين فقط، طبيعيًا وغير مبالغ فيه، ومن دون هاشتاقات أو علامات اقتباس. الموضوع الاختياري: ${topic || "عام"}. أعد النص فقط.`;
}
async function handleAiCaption(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY is not configured." }, 503);
  const body = await safeJson(request), type = cleanQuery(body.type, 30), topic = cleanQuery(body.prompt, 200), model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  try {
    const upstream = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt(type, topic) }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 120 } }) });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error?.message || "Gemini request failed." }, upstream.status);
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join(" ").trim();
    return text ? json({ text }) : json({ error: "Gemini returned no text." }, 502);
  } catch { return json({ error: "Unable to reach Gemini." }, 502); }
}

async function getVoices(env) {
  if (!env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured.");
  const url = new URL(ELEVENLABS_VOICES); url.searchParams.set("page_size", "100"); url.searchParams.set("sort", "name"); url.searchParams.set("sort_direction", "asc"); url.searchParams.set("include_total_count", "false");
  const upstream = await fetch(url, { headers: { "xi-api-key": env.ELEVENLABS_API_KEY, Accept: "application/json" } });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(data?.detail?.message || data?.detail || "ElevenLabs voices request failed.");
  return (data.voices || []).map(v => ({ voice_id: v.voice_id, name: v.name || "Voice", category: v.category || "", labels: v.labels || {}, description: v.description || "", preview_url: v.preview_url || "" })).filter(v => v.voice_id);
}
async function handleVoices(env) {
  try { return json({ voices: await getVoices(env) }, 200, { "cache-control": "private, max-age=300" }); }
  catch (e) { return json({ error: String(e.message || e) }, 503); }
}
async function handleTts(request, env) {
  if (!env.ELEVENLABS_API_KEY) return json({ error: "ELEVENLABS_API_KEY is not configured." }, 503);
  const body = await safeJson(request), text = cleanQuery(body.text, 1800);
  if (!text) return json({ error: "Missing text." }, 400);
  let voiceId = cleanQuery(body.voiceId, 100) || cleanQuery(env.ELEVENLABS_VOICE_ID, 100);
  if (!voiceId) {
    try { const voices = await getVoices(env); voiceId = voices[0]?.voice_id || ""; } catch {}
  }
  if (!voiceId) return json({ error: "No ElevenLabs voice is available for this account." }, 503);
  const url = `${ELEVENLABS_TTS}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  try {
    const upstream = await fetch(url, { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL || "eleven_multilingual_v2" }) });
    if (!upstream.ok) {
      const raw = await upstream.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed?.detail?.message || parsed?.detail?.status || parsed?.detail || parsed?.error || raw;
      } catch {}
      return json({ error: String(message || "ElevenLabs request failed.").slice(0, 700), status: upstream.status }, upstream.status);
    }
    return new Response(upstream.body, { status: 200, headers: { "content-type": upstream.headers.get("content-type") || "audio/mpeg", "cache-control": "no-store" } });
  } catch { return json({ error: "Unable to reach ElevenLabs." }, 502); }
}

function allowedMediaHost(hostname) { const h = hostname.toLowerCase(); return h === "pexels.com" || h.endsWith(".pexels.com") || h === "pixabay.com" || h.endsWith(".pixabay.com") || h === "giphy.com" || h.endsWith(".giphy.com"); }
async function handleMedia(request) {
  const raw = readQuery(request).get("url"); if (!raw) return json({ error: "Missing media URL." }, 400);
  let target; try { target = new URL(raw); } catch { return json({ error: "Invalid media URL." }, 400); }
  if (target.protocol !== "https:" || !allowedMediaHost(target.hostname)) return json({ error: "Media host is not allowed." }, 403);
  try {
    const headers = new Headers(), range = request.headers.get("range"); if (range) headers.set("range", range);
    const upstream = await fetch(target, { headers, cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!upstream.ok && upstream.status !== 206) return json({ error: `Media upstream ${upstream.status}` }, upstream.status);
    const out = new Headers(upstream.headers); out.set("access-control-allow-origin", "*"); out.set("cross-origin-resource-policy", "cross-origin"); out.set("cache-control", "public, max-age=3600"); out.delete("set-cookie");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  } catch { return json({ error: "Unable to fetch media." }, 502); }
}

const VOICE_UI = `<script>
(() => {
  const TEST_VOICE_ID = 'wxweiHvoC2r2jFM7mS8b';
  const boot = async () => {
    const box = document.querySelector('.tts-box');
    const btn = document.getElementById('ttsGenerateBtn');
    if (!box || !btn || document.getElementById('elevenVoice')) return;
    const wrap = document.createElement('label'); wrap.className = 'field';
    wrap.innerHTML = '<span>صوت ElevenLabs</span><select id="elevenVoice"><option value="">جاري تحميل الأصوات...</option></select><small id="voiceMeta">يتم جلب الأصوات المتاحة في حسابك تلقائيًا.</small>';
    box.insertBefore(wrap, btn.parentElement);
    const select = wrap.querySelector('select'), meta = wrap.querySelector('#voiceMeta');
    try {
      const r = await fetch('/api/voices'); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'voices');
      select.innerHTML = '';
      for (const v of data.voices || []) { const o = document.createElement('option'); o.value = v.voice_id; const l = v.labels || {}; o.textContent = v.name + (l.gender ? ' • ' + l.gender : '') + (l.accent ? ' • ' + l.accent : ''); select.appendChild(o); }
      let testOption = Array.from(select.options).find(o => o.value === TEST_VOICE_ID);
      if (!testOption) {
        testOption = document.createElement('option');
        testOption.value = TEST_VOICE_ID;
        testOption.textContent = 'Haytham — Voice ID test';
        select.insertBefore(testOption, select.firstChild);
      }
      select.value = TEST_VOICE_ID;
      meta.textContent = 'تم اختيار Voice ID التجريبي تلقائيًا. لو رفضه الحساب سيظهر سبب ElevenLabs الحقيقي أسفل الزر.';
    } catch {
      select.innerHTML = '<option value="' + TEST_VOICE_ID + '">Haytham — Voice ID test</option>';
      meta.textContent = 'تعذر تحميل القائمة، لكن Voice ID التجريبي جاهز للاختبار.';
    }
    btn.addEventListener('click', async e => {
      const voiceId = select.value; if (!voiceId) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const textBox = document.getElementById('ttsText'); let text = (textBox?.value || '').trim();
      if (!text) { const selected = document.querySelector('#textContent'); text = (selected?.value || '').trim(); }
      if (!text) return;
      btn.disabled = true; const status = document.getElementById('ttsStatus'); if (status) status.textContent = 'جاري اختبار الصوت المختار...';
      try {
        const r = await fetch('/api/tts', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({text, voiceId}) });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || ('HTTP ' + r.status));
        }
        const blob = await r.blob();
        if (typeof loadAudioBlob === 'function') loadAudioBlob(blob, select.options[select.selectedIndex]?.textContent + '.mp3');
        if (status) status.textContent = 'نجح الصوت ✅ وتمت إضافته للمشروع.';
      } catch (err) {
        if (status) status.textContent = 'ElevenLabs: ' + String(err.message || err).slice(0, 500);
      } finally { btn.disabled = false; }
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
</script>`;

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const html = await response.text();
  const headers = new Headers(response.headers); headers.delete("content-length");
  return new Response(html.replace("</body>", VOICE_UI + "</body>"), { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/pexels" && request.method === "GET") return handlePexels(request, env);
    if (url.pathname === "/api/pixabay" && request.method === "GET") return handlePixabay(request, env);
    if (url.pathname === "/api/giphy" && request.method === "GET") return handleGiphy(request, env);
    if (url.pathname === "/api/ai-caption" && request.method === "POST") return handleAiCaption(request, env);
    if (url.pathname === "/api/voices" && request.method === "GET") return handleVoices(env);
    if (url.pathname === "/api/tts" && request.method === "POST") return handleTts(request, env);
    if (url.pathname === "/api/media" && request.method === "GET") return handleMedia(request);
    if (url.pathname.startsWith("/api/")) return json({ error: "API endpoint not found." }, 404);
    return serveAsset(request, env);
  }
};
