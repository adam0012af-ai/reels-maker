import baseWorker from "./worker-v3.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TEXT_MODEL = "gemini-3.6-flash";
const DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview";
const LEGACY_TTS_MODEL = "gemini-2.5-flash-preview-tts";

const GEMINI_VOICE_NAMES = new Set([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina",
  "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar", "Alnilam", "Schedar",
  "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi", "Vindemiatrix", "Sadachbia",
  "Sadaltager", "Sulafat"
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

function clean(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

async function safeJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function textModel(env) {
  const configured = clean(env.GEMINI_MODEL, 80);
  if (!configured || /gemini-2\.5-flash/i.test(configured)) return DEFAULT_TEXT_MODEL;
  return configured.replace(/^models\//, "");
}

function ttsModel(env) {
  const configured = clean(env.GEMINI_TTS_MODEL, 100).replace(/^models\//, "");
  if (!configured || /gemini-2\.5-(?:flash|pro).*tts/i.test(configured)) return DEFAULT_TTS_MODEL;
  return configured;
}

function stripMeta(text) {
  const blocked = /word count|ending moral|let'?s check|refine the text|visual clarity|voiceover rhythm|precise word count|grammar check|analysis:/i;
  return String(text || "")
    .split(/\r?\n/)
    .filter(line => !blocked.test(line))
    .join("\n")
    .replace(/^\s*\*{1,3}\s*/gm, "")
    .replace(/\s*\*{1,3}\s*$/gm, "")
    .trim();
}

async function generateText(env, prompt, maxOutputTokens) {
  if (!env.GEMINI_API_KEY) return { error: "GEMINI_API_KEY is not configured.", status: 503 };
  const models = [...new Set([textModel(env), DEFAULT_TEXT_MODEL])];
  let lastError = "تعذر إنشاء النص الآن.";
  let lastStatus = 502;

  for (const model of models) {
    try {
      const upstream = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: {
          "x-goog-api-key": env.GEMINI_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "أعد النتيجة النهائية المطلوبة فقط. لا تعرض التفكير أو التحليل أو فحص عدد الكلمات أو ملاحظات التحرير. عندما يكون الطلب بالعربية اكتب بالعربية فقط، بلا عناوين إنجليزية أو تعليقات داخلية."
            }]
          },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens,
            thinkingConfig: { thinkingLevel: "minimal" }
          }
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        lastStatus = upstream.status;
        lastError = data?.error?.message || `Gemini ${upstream.status}`;
        continue;
      }
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const finalText = parts
        .filter(part => part?.text && part.thought !== true)
        .map(part => part.text)
        .join("\n")
        .trim();
      const text = stripMeta(finalText);
      if (text) return { text, model };
      lastError = "Gemini returned no final text.";
      lastStatus = 502;
    } catch (error) {
      lastError = String(error?.message || error).slice(0, 240);
      lastStatus = 502;
    }
  }

  return { error: lastError, status: lastStatus };
}

function captionPrompt(type, topic) {
  const labels = {
    dua: "دعاء عربي قصير وجميل ومناسب لفيديو ريلز دون نسبة كلام إلى مصدر ديني محدد ما لم تكن متأكدًا",
    wisdom: "حكمة عربية قصيرة وعصرية",
    quote: "اقتباس تحفيزي عربي قصير وأصلي",
    travel: "كابشن عربي قصير لفيديو سفر",
    business: "كابشن عربي قصير للأعمال والنجاح",
    custom: "كابشن عربي قصير مناسب للموضوع"
  };
  return `اكتب ${labels[type] || labels.custom}. اجعله سطرًا أو سطرين فقط، طبيعيًا وغير مبالغ فيه، ومن دون هاشتاقات أو علامات اقتباس. الموضوع الاختياري: ${topic || "عام"}. أعد النص النهائي فقط.`;
}

async function aiCaption(request, env) {
  const body = await safeJson(request);
  const type = clean(body.type, 30);
  const topic = clean(body.prompt, 200);
  const result = await generateText(env, captionPrompt(type, topic), 180);
  if (result.error) return json({ error: result.error }, result.status || 502);
  return json({ text: result.text, model: result.model });
}

async function islamicStory(request, env) {
  const body = await safeJson(request);
  const mode = body.mode === "kids" ? "kids" : "general";
  const topic = clean(body.topic, 180) || (mode === "kids" ? "قصة طفل عن الصدق والشجاعة" : "قيمة إسلامية جميلة");
  const length = ["short", "medium", "long"].includes(body.length) ? body.length : "medium";
  const specs = {
    short: "بين 90 و130 كلمة، مناسبة لتعليق صوتي قرابة 45 ثانية",
    medium: "بين 180 و260 كلمة، مناسبة لتعليق صوتي قرابة 90 ثانية",
    long: "بين 330 و450 كلمة، قصة كاملة مناسبة لمقطع مدته دقيقتان إلى ثلاث دقائق"
  };

  const generalPrompt = `اكتب قصة عربية تربوية أصلية بطابع إسلامي عن: ${topic}. اجعلها ${specs[length]}.\nالشروط:\n- القصة أصلية للتربية والعبرة وليست نقلًا عن حادثة دينية ثابتة.\n- لا تنسب أي قول إلى الله أو النبي ﷺ أو الصحابة، ولا تخترع آية أو حديثًا.\n- لغة عربية واضحة، مشاهد قابلة للتحويل إلى ريلز، بداية جذابة ونهاية فيها عِبرة قصيرة.\n- لا تكتب عناوين إنجليزية ولا فحص عدد كلمات ولا شرحًا لطريقة كتابتك.\n- أعد القصة العربية النهائية فقط.`;

  const kidsPrompt = `اكتب قصة أطفال عربية أصلية مناسبة للأعمار من 6 إلى 12 سنة عن: ${topic}. اجعلها ${specs[length]}.\nالشروط:\n- قصة دافئة وممتعة ذات قيمة إسلامية وتربوية عامة مثل الصدق أو الأمانة أو الرحمة أو بر الوالدين.\n- لا تنسب أي كلام إلى الله أو النبي ﷺ أو الصحابة، ولا تخترع آية أو حديثًا أو واقعة دينية تاريخية.\n- استخدم شخصيات أطفال وأحداثًا آمنة وغير مخيفة، وجملًا سهلة وواضحة للتعليق الصوتي.\n- اجعل المشاهد بصرية وقابلة للتحويل إلى فيديو أو أنيميشن، مع بداية جذابة ونهاية سعيدة وعبرة قصيرة.\n- لا تكتب عناوين إنجليزية ولا فحص عدد كلمات ولا شرحًا لطريقة كتابتك.\n- أعد القصة العربية النهائية فقط.`;

  const tokens = length === "long" ? 1800 : length === "medium" ? 1100 : 620;
  const result = await generateText(env, mode === "kids" ? kidsPrompt : generalPrompt, tokens);
  if (result.error) return json({ error: result.error }, result.status || 502);
  return json({ text: result.text, model: result.model, mode });
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
  const value = String(data || "").replace(/\s/g, "");
  const binary = atob(value);
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

async function tts(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "مفتاح Gemini غير موجود في Cloudflare." }, 503);
  const body = await safeJson(request);
  const text = String(body.text || "").trim().slice(0, 4000);
  if (!text) return json({ error: "لا يوجد نص لإنشاء الصوت." }, 400);

  const requestedVoice = clean(body.voice || body.voiceId, 40);
  const voice = GEMINI_VOICE_NAMES.has(requestedVoice) ? requestedVoice : "Kore";
  const style = clean(body.style, 30) || "fusha";
  const models = [...new Set([ttsModel(env), DEFAULT_TTS_MODEL, LEGACY_TTS_MODEL])];
  let lastError = "تعذر إنشاء الصوت الآن.";
  let lastStatus = 502;

  for (const model of models) {
    try {
      const upstream = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: {
          "x-goog-api-key": env.GEMINI_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${ttsDirection(style, text)}\n\nRead only this transcript:\n${text}` }] }],
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
      if (!upstream.ok) {
        lastStatus = upstream.status;
        lastError = data?.error?.message || `Gemini TTS ${upstream.status}`;
        continue;
      }
      const part = data?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
      if (!part?.inlineData?.data) {
        lastStatus = 502;
        lastError = "Gemini TTS لم يرجع ملف صوت.";
        continue;
      }
      const raw = decodeBase64(part.inlineData.data);
      const mimeType = String(part.inlineData.mimeType || "audio/L16;codec=pcm;rate=24000");
      const bytes = mimeType.toLowerCase().includes("wav") ? raw : pcm16ToWav(raw, 24000, 1);
      const mime = mimeType.toLowerCase().includes("wav") ? mimeType : "audio/wav";
      return new Response(bytes, {
        status: 200,
        headers: {
          "content-type": mime,
          "cache-control": "no-store",
          "content-disposition": `inline; filename=\"gemini-${voice}.wav\"`,
          "x-gemini-tts-model": model
        }
      });
    } catch (error) {
      lastStatus = 502;
      lastError = String(error?.message || error).slice(0, 300);
    }
  }

  if (lastStatus === 429 || /quota|rate limit|resource_exhausted/i.test(lastError)) {
    return json({ error: "وصلت حصة تحويل النص إلى صوت المجانية مؤقتًا. جرّب بعد قليل أو فعّل Billing في مشروع Gemini. تم تجربة موديل الصوت الجديد Gemini 3.1 أيضًا." }, 429);
  }
  return json({ error: `تعذر إنشاء الصوت: ${lastError}` }, lastStatus || 502);
}

function modelStatus(env) {
  const configuredText = clean(env.GEMINI_MODEL, 100).replace(/^models\//, "") || null;
  const configuredTts = clean(env.GEMINI_TTS_MODEL, 100).replace(/^models\//, "") || null;
  return json({
    text_model_effective: textModel(env),
    text_model_configured: configuredText,
    tts_model_effective: ttsModel(env),
    tts_model_configured: configuredTts,
    text_note: "Text generation uses Gemini 3.6 Flash by default.",
    tts_note: "TTS uses Gemini 3.1 Flash TTS Preview by default. The legacy 2.5 TTS model is fallback only."
  });
}

async function injectV2Runtime(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();
  html = html.replace(/islamic-content-v2\.js\?v=\d+/g, "islamic-content-v2.js?v=2");
  if (!html.includes("islamic-content-v2.js")) {
    html = html.replace("</body>", '<script src="islamic-content-v2.js?v=2"></script></body>');
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/islamic-story" && request.method === "POST") return islamicStory(request, env);
    if (url.pathname === "/api/ai-caption" && request.method === "POST") return aiCaption(request, env);
    if (url.pathname === "/api/tts" && request.method === "POST") return tts(request, env);
    if (url.pathname === "/api/model-status" && request.method === "GET") return modelStatus(env);

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

    const response = await baseWorker.fetch(request, env, ctx);
    return injectV2Runtime(response);
  }
};
