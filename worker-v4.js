import baseWorker from "./worker-v3.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TEXT_MODEL = "gemini-3.6-flash";

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

async function generateText(env, prompt, maxOutputTokens, temperature = 0.78) {
  if (!env.GEMINI_API_KEY) return { error: "GEMINI_API_KEY is not configured.", status: 503 };
  const models = [...new Set([textModel(env), DEFAULT_TEXT_MODEL])];
  let lastError = "Gemini text generation failed.";
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
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens }
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        lastStatus = upstream.status;
        lastError = data?.error?.message || `Gemini ${upstream.status}`;
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("\n").trim();
      if (text) return { text, model };
      lastError = "Gemini returned no text.";
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
  return `اكتب ${labels[type] || labels.custom}. اجعله سطرًا أو سطرين فقط، طبيعيًا وغير مبالغ فيه، ومن دون هاشتاقات أو علامات اقتباس. الموضوع الاختياري: ${topic || "عام"}. أعد النص فقط.`;
}

async function aiCaption(request, env) {
  const body = await safeJson(request);
  const type = clean(body.type, 30);
  const topic = clean(body.prompt, 200);
  const result = await generateText(env, captionPrompt(type, topic), 180, 0.8);
  if (result.error) return json({ error: result.error }, result.status || 502);
  return json({ text: result.text, model: result.model });
}

async function islamicStory(request, env) {
  const body = await safeJson(request);
  const topic = clean(body.topic, 180) || "قيمة إسلامية جميلة";
  const length = ["short", "medium", "long"].includes(body.length) ? body.length : "medium";
  const specs = {
    short: "بين 90 و130 كلمة، مناسبة لتعليق صوتي قرابة 45 ثانية",
    medium: "بين 180 و260 كلمة، مناسبة لتعليق صوتي قرابة 90 ثانية",
    long: "بين 330 و450 كلمة، قصة كاملة مناسبة لمقطع مدته دقيقتان إلى ثلاث دقائق"
  };
  const prompt = `اكتب قصة عربية تربوية أصلية بطابع إسلامي عن: ${topic}. اجعلها ${specs[length]}.\nالشروط:\n- القصة أصلية للتربية والعبرة وليست نقلًا عن حادثة دينية ثابتة.\n- لا تنسب أي قول إلى الله أو النبي ﷺ أو الصحابة، ولا تخترع آية أو حديثًا.\n- لغة عربية واضحة، مشاهد قابلة للتحويل إلى ريلز، بداية جذابة ونهاية فيها عِبرة قصيرة.\n- لا تكتب هاشتاقات ولا مقدمات عن كونك ذكاءً اصطناعيًا.\nأعد القصة فقط.`;
  const tokens = length === "long" ? 1800 : length === "medium" ? 1100 : 620;
  const result = await generateText(env, prompt, tokens, 0.78);
  if (result.error) return json({ error: result.error }, result.status || 502);
  return json({ text: result.text, model: result.model });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/islamic-story" && request.method === "POST") {
      return islamicStory(request, env);
    }
    if (url.pathname === "/api/ai-caption" && request.method === "POST") {
      return aiCaption(request, env);
    }

    // The reciter picker historically routes preview audio through /api/quran-media.
    // HQ Quran metadata now points to our own /api/quran-hq endpoint, so bridge
    // that same-origin URL back into worker-v3 instead of rejecting it as a
    // third-party media URL.
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

    return baseWorker.fetch(request, env, ctx);
  }
};
