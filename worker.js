const PEXELS_API = "https://api.pexels.com/videos/search";
const PIXABAY_API = "https://pixabay.com/api/videos/";
const GIPHY_GIFS_API = "https://api.giphy.com/v1/gifs/search";
const GIPHY_STICKERS_API = "https://api.giphy.com/v1/stickers/search";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const GEMINI_TTS_VOICES = [
  ["Zephyr", "Bright"], ["Puck", "Upbeat"], ["Charon", "Informative"], ["Kore", "Firm"],
  ["Fenrir", "Excitable"], ["Leda", "Youthful"], ["Orus", "Firm"], ["Aoede", "Breezy"],
  ["Callirrhoe", "Easy-going"], ["Autonoe", "Bright"], ["Enceladus", "Breathy"], ["Iapetus", "Clear"],
  ["Umbriel", "Easy-going"], ["Algieba", "Smooth"], ["Despina", "Smooth"], ["Erinome", "Clear"],
  ["Algenib", "Gravelly"], ["Rasalgethi", "Informative"], ["Laomedeia", "Upbeat"], ["Achernar", "Soft"],
  ["Alnilam", "Firm"], ["Schedar", "Even"], ["Gacrux", "Mature"], ["Pulcherrima", "Forward"],
  ["Achird", "Friendly"], ["Zubenelgenubi", "Casual"], ["Vindemiatrix", "Gentle"], ["Sadachbia", "Lively"],
  ["Sadaltager", "Knowledgeable"], ["Sulafat", "Warm"]
];
const GEMINI_VOICE_NAMES = new Set(GEMINI_TTS_VOICES.map(v => v[0]));

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
function readQuery(request) { return new URL(request.url).searchParams; }
function cleanQuery(value, max = 100) { return String(value || "").trim().slice(0, max); }
async function safeJson(request) { try { return await request.json(); } catch { return {}; } }

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
  const p = readQuery(request), query = cleanQuery(p.get("query"));
  if (!query) return json({ error: "Missing query." }, 400);
  const url = new URL(PEXELS_API);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", String(Math.max(1, Math.min(30, Number(p.get("per_page")) || 18))));
  try { return await proxyJson(url, { headers: { Authorization: env.PEXELS_API_KEY, Accept: "application/json" } }, 120); }
  catch { return json({ error: "Unable to reach Pexels." }, 502); }
}

async function handlePixabay(request, env) {
  if (!env.PIXABAY_API_KEY) return json({ error: "PIXABAY_API_KEY is not configured." }, 503);
  const p = readQuery(request), query = cleanQuery(p.get("query"));
  if (!query) return json({ error: "Missing query." }, 400);
  const url = new URL(PIXABAY_API);
  url.searchParams.set("key", env.PIXABAY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(Math.max(3, Math.min(50, Number(p.get("per_page")) || 18))));
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("order", "popular");
  try { return await proxyJson(url, { headers: { Accept: "application/json" } }, 86400); }
  catch { return json({ error: "Unable to reach Pixabay." }, 502); }
}

async function handleGiphy(request, env) {
  if (!env.GIPHY_API_KEY) return json({ error: "GIPHY_API_KEY is not configured." }, 503);
  const p = readQuery(request), query = cleanQuery(p.get("query"), 50);
  if (!query) return json({ error: "Missing query." }, 400);
  const type = p.get("type") === "gifs" ? "gifs" : "stickers";
  const url = new URL(type === "gifs" ? GIPHY_GIFS_API : GIPHY_STICKERS_API);
  url.searchParams.set("api_key", env.GIPHY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.max(1, Math.min(25, Number(p.get("limit")) || 20))));
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
      return { id: item.id, title: item.title || "GIPHY", preview: preview.url || preview.webp || urlValue, url: urlValue };
    }).filter(item => item.preview && item.url);
    return json({ items }, 200, { "cache-control": "public, max-age=300" });
  } catch { return json({ error: "Unable to reach GIPHY." }, 502); }
}

function aiPrompt(type, topic) {
  const labels = {
    dua: "دعاء عربي قصير وجميل ومناسب لفيديو ريلز دون نسبة كلام إلى مصدر ديني محدد ما لم تكن متأكدًا",
    wisdom: "حكمة عربية قصيرة وعصرية",
    quote: "اقتباس تحفيزي عربي قصير وأصلي",
    travel: "كابشن عربي قصير لفيديو سفر",
    business: "كابشن عربي قصير للأعمال والنجاح",
    custom: "كابشن عربي قصير مناسب للموضوع"
  };
  return `اكتب ${labels[type] || labels.custom}. اجعله سطرًا أو سطرين فقط، طبيعيًا وغير مبالغ فيه، ومن دون هاشتاقات أو علامات اقتباس. الموضوع الاختياري: ${topic || "عام"}. أعد النص فقط.`;
}

async function handleAiCaption(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY is not configured." }, 503);
  const body = await safeJson(request);
  const type = cleanQuery(body.type, 30);
  const topic = cleanQuery(body.prompt, 200);
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`;
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: aiPrompt(type, topic) }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 120 }
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error?.message || "Gemini request failed." }, upstream.status);
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join(" ").trim();
    return text ? json({ text }) : json({ error: "Gemini returned no text." }, 502);
  } catch { return json({ error: "Unable to reach Gemini." }, 502); }
}

function ttsDirection(style, text) {
  const hasArabic = /[\u0600-\u06ff]/.test(text);
  const styles = {
    egyptian: "Speak naturally in a clear Egyptian Arabic accent, warm and conversational, with realistic pacing.",
    fusha: "Speak in clear Modern Standard Arabic with polished pronunciation and balanced pacing.",
    calm: "Speak calmly, softly, and reassuringly with a relaxed pace.",
    energetic: "Speak with energetic, upbeat delivery and confident pacing without shouting.",
    story: "Narrate like a professional storyteller: warm, expressive, cinematic, and natural.",
    ad: "Deliver it like a polished premium advertisement: confident, engaging, concise, and persuasive.",
    natural: hasArabic ? "Speak naturally in Arabic with clear pronunciation and human-like pacing." : "Speak naturally with clear pronunciation and human-like pacing."
  };
  return styles[style] || styles.natural;
}

function decodeBase64(data) {
  const clean = String(data || "").replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcm16ToWav(pcm, sampleRate = 24000, channels = 1) {
  const dataLength = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const write = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataLength, true);
  new Uint8Array(buffer, 44).set(pcm);
  return new Uint8Array(buffer);
}

async function handleTts(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY is not configured." }, 503);
  const body = await safeJson(request);
  const text = cleanQuery(body.text, 4000);
  if (!text) return json({ error: "Missing text." }, 400);

  const requestedVoice = cleanQuery(body.voice || body.voiceId, 40);
  const voice = GEMINI_VOICE_NAMES.has(requestedVoice) ? requestedVoice : "Kore";
  const style = cleanQuery(body.style, 30) || "egyptian";
  const model = env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`;
  const prompt = `${ttsDirection(style, text)}\n\nRead only this transcript:\n${text}`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            languageCode: /[\u0600-\u06ff]/.test(text) ? "ar-XA" : "en-US",
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
          }
        }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error?.message || `Gemini TTS request failed (${upstream.status}).` }, upstream.status);

    const part = data?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
    if (!part?.inlineData?.data) return json({ error: "Gemini TTS returned no audio data." }, 502);

    const raw = decodeBase64(part.inlineData.data);
    const mimeType = String(part.inlineData.mimeType || "audio/L16;codec=pcm;rate=24000");
    let bytes = raw;
    let mime = mimeType;
    if (!mimeType.toLowerCase().includes("wav")) {
      bytes = pcm16ToWav(raw, 24000, 1);
      mime = "audio/wav";
    }

    return new Response(bytes, {
      status: 200,
      headers: { "content-type": mime, "cache-control": "no-store", "content-disposition": `inline; filename="gemini-${voice}.wav"` }
    });
  } catch (e) {
    return json({ error: `Unable to reach Gemini TTS: ${String(e?.message || e).slice(0, 300)}` }, 502);
  }
}

function allowedMediaHost(hostname) {
  const h = hostname.toLowerCase();
  return h === "pexels.com" || h.endsWith(".pexels.com") || h === "pixabay.com" || h.endsWith(".pixabay.com") || h === "giphy.com" || h.endsWith(".giphy.com");
}

async function handleMedia(request) {
  const raw = readQuery(request).get("url");
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
  } catch { return json({ error: "Unable to fetch media." }, 502); }
}

const GEMINI_TTS_UI = `<script>
(() => {
  const voices = ${JSON.stringify(GEMINI_TTS_VOICES)};
  const boot = () => {
    const box = document.querySelector('.tts-box');
    const btn = document.getElementById('ttsGenerateBtn');
    const status = document.getElementById('ttsStatus');
    if (!box || !btn) return;

    document.getElementById('elevenVoice')?.closest('.field')?.remove();
    document.getElementById('geminiTtsControls')?.remove();

    const title = box.querySelector(':scope > b');
    if (title) title.textContent = 'Gemini AI Text-to-Speech';
    if (status) status.textContent = 'Gemini TTS — يدعم العربية، 30 صوتًا، والصوت يدخل في التصدير.';

    const panel = document.createElement('div');
    panel.id = 'geminiTtsControls';
    panel.innerHTML = '<label class="field"><span>صوت Gemini</span><select id="geminiVoice"></select><small>30 صوتًا جاهزًا من Gemini.</small></label>' +
      '<label class="field"><span>أسلوب الإلقاء</span><select id="geminiStyle">' +
      '<option value="egyptian">مصري طبيعي ودافئ</option>' +
      '<option value="fusha">عربي فصحى واضح</option>' +
      '<option value="natural">طبيعي</option>' +
      '<option value="calm">هادئ وناعم</option>' +
      '<option value="energetic">حماسي</option>' +
      '<option value="story">راوي قصصي سينمائي</option>' +
      '<option value="ad">إعلاني احترافي</option>' +
      '</select></label>';
    box.insertBefore(panel, btn.parentElement);

    const select = panel.querySelector('#geminiVoice');
    voices.forEach(([name, tone]) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name + ' • ' + tone;
      select.appendChild(option);
    });
    select.value = 'Kore';

    btn.addEventListener('click', async event => {
      event.stopImmediatePropagation();
      event.preventDefault();
      let text = (document.getElementById('ttsText')?.value || '').trim();
      if (!text) text = (document.getElementById('textContent')?.value || '').trim();
      if (!text) {
        if (status) status.textContent = 'اكتب نص التعليق الصوتي أولًا.';
        return;
      }
      const voice = select.value || 'Kore';
      const style = panel.querySelector('#geminiStyle')?.value || 'egyptian';
      btn.disabled = true;
      if (status) status.textContent = 'جاري إنشاء التعليق الصوتي عبر Gemini...';
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, voice, style })
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || ('HTTP ' + response.status));
        }
        const blob = await response.blob();
        if (typeof loadAudioBlob === 'function') loadAudioBlob(blob, 'Gemini ' + voice + '.wav');
        if (status) status.textContent = 'تم إنشاء صوت Gemini ✅ وإضافته للمشروع والتصدير.';
      } catch (error) {
        if (status) status.textContent = 'Gemini TTS: ' + String(error.message || error).slice(0, 450);
      } finally {
        btn.disabled = false;
      }
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
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html.replace("</body>", GEMINI_TTS_UI + "</body>"), { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/pexels" && request.method === "GET") return handlePexels(request, env);
    if (url.pathname === "/api/pixabay" && request.method === "GET") return handlePixabay(request, env);
    if (url.pathname === "/api/giphy" && request.method === "GET") return handleGiphy(request, env);
    if (url.pathname === "/api/ai-caption" && request.method === "POST") return handleAiCaption(request, env);
    if (url.pathname === "/api/tts" && request.method === "POST") return handleTts(request, env);
    if (url.pathname === "/api/gemini-voices" && request.method === "GET") return json({ voices: GEMINI_TTS_VOICES.map(([name, tone]) => ({ name, tone })) }, 200, { "cache-control": "public, max-age=86400" });
    if (url.pathname === "/api/media" && request.method === "GET") return handleMedia(request);
    if (url.pathname.startsWith("/api/")) return json({ error: "API endpoint not found." }, 404);
    return serveAsset(request, env);
  }
};
