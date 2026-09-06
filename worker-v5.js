import baseWorker from "./worker-v4.js";

const CF_TEXT_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/google/gemma-4-26b-a4b-it"
];

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

function finalArabicText(value) {
  return String(value || "")
    .split(/\r?\n/)
    .filter(line => !/word count|ending moral|analysis:|let'?s check|reasoning|thinking|grammar check|visual clarity/i.test(line))
    .join("\n")
    .replace(/^\s*\*{1,3}\s*/gm, "")
    .replace(/\s*\*{1,3}\s*$/gm, "")
    .trim();
}

function extractWorkersText(result) {
  if (!result) return "";
  if (typeof result === "string") return finalArabicText(result);
  if (typeof result.response === "string") return finalArabicText(result.response);
  if (typeof result.result === "string") return finalArabicText(result.result);
  if (typeof result.output_text === "string") return finalArabicText(result.output_text);
  const choice = result.choices?.[0];
  if (typeof choice?.message?.content === "string") return finalArabicText(choice.message.content);
  if (Array.isArray(choice?.message?.content)) {
    return finalArabicText(choice.message.content.map(part => part?.text || part?.content || "").join("\n"));
  }
  if (Array.isArray(result.response)) {
    return finalArabicText(result.response.map(part => part?.text || part?.content || "").join("\n"));
  }
  return "";
}

async function workersAiText(env, prompt, maxTokens = 900) {
  if (!env.AI?.run) return null;
  const system = "أنت كاتب عربي محترف. أعد النتيجة النهائية فقط بالعربية، بلا تفكير داخلي أو تحليل أو فحص عدد كلمات أو عناوين إنجليزية. لا تخترع آيات أو أحاديث أو تنسب أقوالًا دينية بلا مصدر.";

  for (const model of CF_TEXT_MODELS) {
    try {
      const result = await env.AI.run(model, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: maxTokens,
        temperature: 0.78,
        stream: false,
        chat_template_kwargs: { enable_thinking: false }
      });
      const text = extractWorkersText(result);
      if (text) return { text, model, provider: "cloudflare-workers-ai" };
    } catch {}
  }
  return null;
}

function storyPrompt(topic, length, mode) {
  const specs = {
    short: "بين 90 و130 كلمة، مناسبة لتعليق صوتي قرابة 45 ثانية",
    medium: "بين 180 و260 كلمة، مناسبة لتعليق صوتي قرابة 90 ثانية",
    long: "بين 330 و450 كلمة، مناسبة لمقطع من دقيقتين إلى ثلاث دقائق"
  };
  const size = specs[length] || specs.medium;
  if (mode === "kids") {
    return `اكتب قصة أطفال عربية أصلية للأعمار من 6 إلى 12 سنة عن: ${topic}. اجعلها ${size}. القصة دافئة وممتعة وبها قيمة تربوية إسلامية عامة مثل الصدق أو الرحمة أو الأمانة أو بر الوالدين. استخدم شخصيات أطفال وأحداثًا آمنة ومشاهد بصرية تصلح لفيديو أو أنيميشن. لا تخترع آية أو حديثًا أو واقعة دينية تاريخية. أعد القصة العربية النهائية فقط.`;
  }
  return `اكتب قصة عربية تربوية أصلية بطابع إسلامي عن: ${topic}. اجعلها ${size}. اجعل البداية جذابة، والمشاهد واضحة وقابلة للتحويل إلى فيديو، والنهاية فيها عِبرة قصيرة. لا تنسب أي قول إلى الله أو النبي ﷺ أو الصحابة، ولا تخترع آية أو حديثًا. أعد القصة العربية النهائية فقط.`;
}

function localStory(topic, length, mode) {
  const subject = clean(topic, 120) || (mode === "kids" ? "الصدق" : "فعل الخير");
  const kids = [
    `كان ياسين طفلًا محبًا للاستكشاف، وكان يسمع كثيرًا عن أهمية ${subject}. في صباح يوم جميل خرج إلى المدرسة وهو يفكر كيف يمكن أن يحول هذه القيمة إلى عمل حقيقي.`,
    `في الطريق وجد موقفًا صغيرًا يحتاج إلى قرار سريع. لم يكن أحد يراقبه، لكنه تذكر أن الإنسان يعرف نفسه من اختياراته عندما يكون وحده. توقف قليلًا، وفكر، ثم اختار التصرف الصحيح بهدوء.`,
    `عندما وصل إلى المدرسة حدث موقف آخر بين أصدقائه. هذه المرة لم يكتف ياسين بالكلام، بل ساعد صديقه بطريقة لطيفة من غير أن يحرجه أمام الآخرين.`,
    `لاحظ المعلم ما حدث، لكنه لم يمدحه أمام الجميع. اقترب منه فقط وقال له إن أجمل الأعمال هي التي تجعل المكان أفضل حتى لو لم ينتظر صاحبها مقابلًا.`,
    `عاد ياسين إلى البيت وهو يشعر بسعادة مختلفة. لم تكن سعادة الحصول على جائزة، بل سعادة أنه استطاع أن يختار الخير أكثر من مرة في يوم واحد.`,
    `وفي المساء حكى لأسرته ما حدث، واتفقوا أن يجعل كل واحد منهم ${subject} عادة صغيرة تتكرر كل يوم. ومن يومها فهم ياسين أن الأخلاق الجميلة تبدأ بخطوة بسيطة ثم تكبر مع التكرار.`,
    `العبرة: القيمة الحقيقية لا تبقى كلامًا جميلًا، بل تظهر في تصرف صغير نختاره عندما تأتي الفرصة.`
  ];
  const general = [
    `كان سامر يعيش أيامًا عادية، لكنه كان يبحث عن معنى عملي لـ${subject}. كان يعرف أن الكلام عن القيم سهل، أما تطبيقها في التفاصيل اليومية فهو الاختبار الحقيقي.`,
    `في أحد الأيام وجد نفسه أمام موقف يستطيع أن يتجاهله من غير أن يلومه أحد. لكنه قرر أن يتوقف، وأن يفعل ما يراه صحيحًا حتى لو أخذ منه وقتًا وجهدًا إضافيين.`,
    `لم يتغير العالم في لحظة، لكن أثر قراره ظهر في شخص آخر شعر بالراحة والتقدير. عندها أدرك سامر أن الخير قد يبدأ صغيرًا جدًا، ثم ينتقل من شخص إلى آخر من غير ضجيج.`,
    `بعد ذلك صار ينتبه أكثر إلى اختياراته: كلمة يقولها، مساعدة يقدمها، وعد يلتزم به، ووقت يخصصه لمن يحتاج إليه. ومع الأيام لم تعد ${subject} موقفًا عابرًا، بل أصبحت عادة.`,
    `وفي لحظة هدوء فهم أن الإنسان لا يحتاج دائمًا إلى فرصة كبيرة ليصنع فرقًا. أحيانًا يكفي أن يكون حاضرًا بقلب صادق، وأن يختار الصحيح في الوقت المناسب.`,
    `العبرة: الأخلاق تبنى بالتكرار، وأجمل أثر هو الذي يبدأ من عمل بسيط ثم يستمر.`
  ];
  const paragraphs = mode === "kids" ? kids : general;
  const count = length === "short" ? 4 : length === "long" ? paragraphs.length : Math.min(6, paragraphs.length);
  return paragraphs.slice(0, count).join("\n\n");
}

function localCaption(type, topic) {
  const subject = clean(topic, 120) || "اليوم";
  const map = {
    dua: `اللهم اجعل ${subject} بابًا للخير والطمأنينة، واكتب لنا فيه ما تحبه وترضاه.`,
    wisdom: `الأثر الجميل يبدأ بخطوة صغيرة تتكرر كل يوم.`,
    quote: `استمر بهدوء؛ التقدم الحقيقي لا يحتاج ضجيجًا.`,
    travel: `رحلة جديدة، منظر مختلف، وذكرى تستحق أن تبقى.`,
    business: `كل نتيجة قوية بدأت بقرار واضح وخطوة محسوبة.`,
    custom: `${subject} — فكرة بسيطة تستحق أن تتحول إلى مشهد جميل.`
  };
  return map[type] || map.custom;
}

async function storyWithFallback(request, env, ctx) {
  const primary = await baseWorker.fetch(request.clone(), env, ctx);
  if (primary.ok) return primary;

  const body = await safeJson(request.clone());
  const mode = body.mode === "kids" ? "kids" : "general";
  const length = ["short", "medium", "long"].includes(body.length) ? body.length : "medium";
  const topic = clean(body.topic, 180) || (mode === "kids" ? "الصدق والشجاعة" : "قيمة إسلامية جميلة");
  const prompt = storyPrompt(topic, length, mode);
  const cf = await workersAiText(env, prompt, length === "long" ? 1700 : length === "medium" ? 1050 : 600);
  if (cf?.text) return json({ text: cf.text, model: cf.model, provider: cf.provider, fallback: true, mode });

  return json({ text: localStory(topic, length, mode), model: "local-story-engine", provider: "local", fallback: true, mode });
}

async function captionWithFallback(request, env, ctx) {
  const primary = await baseWorker.fetch(request.clone(), env, ctx);
  if (primary.ok) return primary;

  const body = await safeJson(request.clone());
  const type = clean(body.type, 30) || "custom";
  const topic = clean(body.prompt, 200);
  const prompt = `اكتب كابشن عربي قصير جدًا مناسب لريلز. النوع: ${type}. الموضوع: ${topic || "عام"}. سطر أو سطران فقط، بلا هاشتاقات وبلا شرح.`;
  const cf = await workersAiText(env, prompt, 180);
  if (cf?.text) return json({ text: cf.text, model: cf.model, provider: cf.provider, fallback: true });

  return json({ text: localCaption(type, topic), model: "local-caption-engine", provider: "local", fallback: true });
}

async function modelStatus(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  const data = await response.json().catch(() => ({}));
  return json({
    ...data,
    workers_ai_bound: !!env.AI,
    text_fallback_order: ["Gemini", "Cloudflare Workers AI GLM-4.7-Flash", "Cloudflare Workers AI Gemma 4", "Local offline text engine"],
    text_fallback_is_silent: true,
    tts_fallback_order: ["Gemini 3.1 Flash TTS", "Gemini 2.5 Flash TTS"],
    note_v5: "Text generation automatically switches providers without exposing provider errors to the editor. Quran and Islamic library state are restored in the browser by continuity-v1.js."
  });
}

async function injectContinuity(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();
  html = html.replace(/continuity-v1\.js\?v=\d+/g, "continuity-v1.js?v=1");
  if (!html.includes("continuity-v1.js")) {
    html = html.replace("</body>", '<script src="continuity-v1.js?v=1"></script></body>');
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/islamic-story" && request.method === "POST") {
      return storyWithFallback(request, env, ctx);
    }
    if (url.pathname === "/api/ai-caption" && request.method === "POST") {
      return captionWithFallback(request, env, ctx);
    }
    if (url.pathname === "/api/model-status" && request.method === "GET") {
      return modelStatus(request, env, ctx);
    }

    const response = await baseWorker.fetch(request, env, ctx);
    return injectContinuity(response);
  }
};
