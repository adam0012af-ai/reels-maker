import baseWorker from "./worker-v7.js";

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

async function safeJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function clean(value, max = 12000) {
  return String(value || "").trim().slice(0, max);
}

function extractText(result) {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  if (typeof result.response === "string") return result.response.trim();
  if (typeof result.result === "string") return result.result.trim();
  if (typeof result.output_text === "string") return result.output_text.trim();
  const choice = result.choices?.[0];
  if (typeof choice?.message?.content === "string") return choice.message.content.trim();
  if (Array.isArray(choice?.message?.content)) return choice.message.content.map(x => x?.text || x?.content || "").join("\n").trim();
  return "";
}

async function workersText(env, system, prompt, maxTokens = 1400, temperature = 0.55) {
  if (!env.AI?.run) return null;
  for (const model of CF_TEXT_MODELS) {
    try {
      const result = await env.AI.run(model, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: maxTokens,
        temperature,
        stream: false,
        chat_template_kwargs: { enable_thinking: false }
      });
      const text = extractText(result);
      if (text) return { text, model };
    } catch {}
  }
  return null;
}

function localGenericStory(topic, length) {
  const subject = clean(topic, 180) || "الصدق والأمانة";
  const base = [
    `كان ياسين فتى هادئًا يعيش مع أسرته في حي بسيط، وكان يحاول كل يوم أن يفهم معنى ${subject} من خلال المواقف الصغيرة التي يمر بها.`,
    `في صباح جميل خرج لقضاء حاجة لأسرته، وبينما يسير في الطريق وجد شيئًا يخص شخصًا آخر. توقف لحظة، ونظر حوله، ثم قرر ألا يتعامل مع الموقف على أنه فرصة سهلة.`,
    `حاول أن يعرف صاحب الشيء، وسأل بهدوء من حوله حتى وصل إلى الشخص الذي كان يبحث عنه منذ وقت. كان القلق ظاهرًا على وجهه، لذلك شعر ياسين أن قراره كان مهمًا فعلًا.`,
    `سلّمه ياسين ما فقده من غير أن يطلب مقابلًا، فابتسم الرجل وشكره بحرارة. عندها فهم ياسين أن القيمة الحقيقية تظهر عندما يختار الإنسان الصواب من نفسه.`,
    `عاد إلى بيته أكثر ثقة وطمأنينة، وحكى لأسرته ما حدث. لم تكن القصة عن شيء ضائع فقط، بل عن قرار صغير كشف له كيف تصنع الأخلاق أثرًا كبيرًا.`,
    `ومن ذلك اليوم صار ياسين يتذكر أن ${subject} ليست كلمات جميلة، بل أفعال نختارها عندما تأتي الفرصة.`
  ];
  const count = length === "short" ? 4 : length === "long" ? 6 : 5;
  return base.slice(0, count).join("\n\n");
}

async function genericStory(request, env) {
  const body = await safeJson(request);
  const topic = clean(body.topic, 180) || "الصدق والأمانة";
  const length = ["short", "medium", "long"].includes(body.length) ? body.length : "medium";
  const spec = length === "short"
    ? "100 إلى 140 كلمة، مناسبة لنحو 45 ثانية"
    : length === "long"
      ? "320 إلى 430 كلمة، مناسبة لدقيقتين إلى ثلاث دقائق"
      : "180 إلى 250 كلمة، مناسبة لنحو 70 إلى 100 ثانية";
  const prompt = `اكتب قصة عربية أصلية عن: ${topic}. الطول: ${spec}. اجعلها قابلة للتحويل إلى فيديو قصصي، بشخصيات واضحة، تسلسل بصري، بداية جذابة، مواقف متدرجة ونهاية مرضية. لا تكتب تعليمات أو عناوين إنجليزية أو تحليلًا. لا تخترع آيات أو أحاديث ولا تنسب أقوالًا دينية لمصدر. أعد القصة العربية النهائية فقط.`;
  const result = await workersText(env, "أنت كاتب قصص عربية احترافي للريلز والفيديو القصير. أعد النص النهائي فقط.", prompt, length === "long" ? 2100 : 1350, 0.72);
  return json({ text: result?.text || localGenericStory(topic, length), model: result?.model || "local-generic-story", fallback: !result });
}

function splitSentences(text) {
  const value = clean(text, 16000).replace(/\s+/g, " ").trim();
  if (!value) return [];
  return (value.match(/[^.!؟؛]+[.!؟؛]?/g) || [value]).map(x => x.trim()).filter(Boolean);
}

function groupScenes(text, wanted) {
  const sentences = splitSentences(text);
  if (!sentences.length) return [];
  wanted = Math.max(1, Math.min(wanted, sentences.length));
  const totalWords = sentences.reduce((n, s) => n + s.split(/\s+/).filter(Boolean).length, 0);
  const targetWords = Math.max(6, totalWords / wanted);
  const groups = [];
  let current = [];
  let words = 0;
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    current.push(s);
    words += s.split(/\s+/).filter(Boolean).length;
    const remainingSentences = sentences.length - i - 1;
    const remainingGroups = wanted - groups.length - 1;
    const shouldClose = groups.length < wanted - 1 && (words >= targetWords || remainingSentences <= remainingGroups);
    if (shouldClose) {
      groups.push(current.join(" ").trim());
      current = [];
      words = 0;
    }
  }
  if (current.length) groups.push(current.join(" ").trim());
  return groups.filter(Boolean);
}

function subtitleChunks(text, maxWords = 8) {
  const words = clean(text, 4000).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks = [];
  let current = [];
  for (const word of words) {
    current.push(word);
    const endPunct = /[.!؟؛,:،]$/.test(word);
    if (current.length >= maxWords || (endPunct && current.length >= 4)) {
      chunks.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks.length ? chunks : [clean(text, 4000)];
}

function stripCodeFence(text) {
  return String(text || "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
}

function parseStoryboardJson(raw, count) {
  const text = stripCodeFence(raw);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1));
    if (!data || !Array.isArray(data.scenes) || data.scenes.length !== count) return null;
    const characterBible = clean(data.character_bible || data.characterBible, 1800);
    const scenes = data.scenes.map(scene => ({
      prompt: clean(typeof scene === "string" ? scene : scene?.prompt, 2200),
      shot: clean(scene?.shot, 140),
      motion: clean(scene?.motion, 140)
    }));
    if (!characterBible || scenes.some(x => !x.prompt)) return null;
    return { characterBible, scenes };
  } catch {
    return null;
  }
}

function fallbackCharacterBible(style) {
  const look = style === "realistic" ? "cinematic realistic film" : style === "cartoon2d" ? "premium 2D storybook animation" : "premium 3D animated family film";
  return `${look}; keep the SAME recurring main character in every scene: Middle Eastern boy about 10 years old, warm olive skin, short dark wavy hair, expressive brown eyes, teal long-sleeve top, beige trousers, white sneakers; same face, hairstyle, age, body proportions and exact outfit colors in every scene.`;
}

function fallbackPrompt(sceneText, topic, style, bible, index) {
  const look = style === "realistic" ? "cinematic realistic film still" : style === "cartoon2d" ? "premium 2D animated storybook illustration" : "premium 3D animated family movie illustration";
  return `${look}, vertical 9:16 composition. ${bible} Scene ${index + 1}: ${clean(sceneText, 1000)}. Strong visual storytelling, natural expressive body language, coherent Middle Eastern environment, cinematic lighting, clean composition, no written text, no captions, no logo, no watermark.`;
}

async function storyboardV2(request, env) {
  const body = await safeJson(request);
  const story = clean(body.story || body.text, 16000);
  if (!story) return json({ error: "لا يوجد نص قصة." }, 400);
  const duration = Math.max(20, Math.min(240, Number(body.duration) || 60));
  const requested = Math.round(duration / 4.7);
  const count = Math.max(6, Math.min(18, Number(body.count) || requested));
  const topic = clean(body.topic, 180) || "قصة عربية";
  const style = ["cartoon3d", "cartoon2d", "realistic"].includes(body.style) ? body.style : "cartoon3d";
  const captions = groupScenes(story, count);
  if (!captions.length) return json({ error: "تعذر تقسيم القصة." }, 400);

  const numbered = captions.map((caption, i) => `${i + 1}) ${caption}`).join("\n");
  const styleText = style === "realistic" ? "cinematic realistic film" : style === "cartoon2d" ? "premium 2D storybook animation" : "premium 3D animated family film";
  const prompt = `Analyze the Arabic story and create a visual continuity bible plus exactly ${captions.length} scene prompts.\nIMPORTANT CONTINUITY RULES:\n- Define the main recurring character once with exact age, face, hair, skin tone, clothing and colors.\n- Repeat the SAME character description and SAME clothing in EVERY scene prompt.\n- Keep one visual style throughout: ${styleText}.\n- Keep recurring locations visually coherent.\n- Each prompt must match the action of its numbered Arabic scene.\n- Vertical 9:16, cinematic composition, no written text, no captions, no logo, no watermark.\nReturn STRICT JSON only in this shape:\n{"character_bible":"...","scenes":[{"prompt":"...","shot":"...","motion":"..."}]}\nThe scenes array must contain exactly ${captions.length} items.\nTopic: ${topic}\nArabic scenes:\n${numbered}`;

  let planned = null;
  let model = "local-continuity-planner";
  const result = await workersText(env, "You are a storyboard continuity director. Return strict JSON only.", prompt, Math.min(3600, 1100 + captions.length * 170), 0.28);
  if (result?.text) {
    planned = parseStoryboardJson(result.text, captions.length);
    if (planned) model = result.model;
  }

  const bible = planned?.characterBible || fallbackCharacterBible(style);
  const scenes = captions.map((caption, index) => {
    const words = caption.split(/\s+/).filter(Boolean).length;
    return {
      index,
      narration: caption,
      displayText: caption,
      subtitles: subtitleChunks(caption, 8),
      weight: Math.max(5, words),
      prompt: planned?.scenes?.[index]?.prompt || fallbackPrompt(caption, topic, style, bible, index),
      shot: planned?.scenes?.[index]?.shot || "medium cinematic shot",
      motion: planned?.scenes?.[index]?.motion || (index % 2 ? "slow pan" : "slow push in")
    };
  });

  return json({
    scenes,
    count: scenes.length,
    characterBible: bible,
    model,
    seedBase: Math.max(1, Math.floor(Number(body.seedBase) || Math.random() * 900000000 + 10000000)),
    strategy: "weighted-scene-timing-short-subtitles-continuity-v2"
  });
}

async function modelStatus(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  const data = await response.json().catch(() => ({}));
  return json({
    ...data,
    story_studio_v2: true,
    story_review_before_editor: true,
    story_scene_max: 18,
    story_timing: "weighted by narration words instead of equal scene duration",
    story_subtitles: "short chunks, maximum about 8 words each",
    story_continuity: "one generated character bible repeated in every scene prompt",
    story_menu_location: "outside Islamic library"
  });
}

async function injectStoryStudio(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();
  html = html.replace(/<script[^>]+src=["']story-video-v1\.js(?:\?v=\d+)?["'][^>]*><\/script>/gi, "");
  html = html.replace(/story-studio-v2\.js\?v=\d+/g, "story-studio-v2.js?v=2");
  if (!html.includes("story-studio-v2.js")) html = html.replace("</body>", '<script src="story-studio-v2.js?v=2"></script></body>');
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/story-text" && request.method === "POST") return genericStory(request, env);
    if (url.pathname === "/api/story-scenes-v2" && request.method === "POST") return storyboardV2(request, env);
    if (url.pathname === "/api/model-status" && request.method === "GET") return modelStatus(request, env, ctx);
    const response = await baseWorker.fetch(request, env, ctx);
    return injectStoryStudio(response);
  }
};
