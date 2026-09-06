import baseWorker from "./worker-v5.js";

const CF_TEXT_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/google/gemma-4-26b-a4b-it"
];
const STORY_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

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

function clean(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function splitSentences(text) {
  const value = clean(text, 12000).replace(/\s+/g, " ").trim();
  if (!value) return [];
  return (value.match(/[^.!؟؛]+[.!؟؛]?/g) || [value]).map(x => x.trim()).filter(Boolean);
}

function splitIntoCaptions(text, count) {
  const sentences = splitSentences(text);
  if (!sentences.length) return [];
  const wanted = Math.max(1, Math.min(Number(count) || 8, 14, sentences.length || 1));
  const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  const target = Math.max(40, totalChars / wanted);
  const groups = [];
  let current = [];
  let chars = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const remainingSentences = sentences.length - i;
    const remainingGroups = wanted - groups.length;
    current.push(sentence);
    chars += sentence.length;
    const mustClose = remainingSentences <= remainingGroups;
    if (groups.length < wanted - 1 && (chars >= target || mustClose)) {
      groups.push(current.join(" ").trim());
      current = [];
      chars = 0;
    }
  }
  if (current.length) groups.push(current.join(" ").trim());

  while (groups.length > wanted) {
    const tail = groups.pop();
    groups[groups.length - 1] = `${groups[groups.length - 1]} ${tail}`.trim();
  }
  return groups.filter(Boolean);
}

function extractWorkersText(result) {
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

function parsePromptArray(raw, expected) {
  const text = String(raw || "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    const prompts = parsed.map(item => clean(typeof item === "string" ? item : item?.prompt, 1800)).filter(Boolean);
    return prompts.length === expected ? prompts : null;
  } catch {
    return null;
  }
}

function fallbackPrompt(caption, topic, style) {
  const styleMap = {
    cartoon3d: "high quality 3D animated family friendly movie illustration",
    cartoon2d: "beautiful 2D animated storybook illustration",
    realistic: "cinematic realistic film still"
  };
  return `${styleMap[style] || styleMap.cartoon3d}, vertical 9:16 composition, Middle Eastern environment, expressive characters, warm cinematic lighting, visual storytelling for an Arabic moral story about ${clean(topic, 180) || "good character"}. Scene meaning: ${clean(caption, 900)}. No written text, no captions, no logo, no watermark.`;
}

async function storyScenes(request, env) {
  const body = await safeJson(request);
  const story = clean(body.story || body.text, 12000);
  if (!story) return json({ error: "لا يوجد نص قصة." }, 400);
  const requestedCount = Math.max(4, Math.min(14, Number(body.count) || 8));
  const captions = splitIntoCaptions(story, requestedCount);
  const topic = clean(body.topic, 180) || "قصة تربوية";
  const style = ["cartoon3d", "cartoon2d", "realistic"].includes(body.style) ? body.style : "cartoon3d";
  let prompts = null;
  let model = "local-scene-planner";

  if (env.AI?.run && captions.length) {
    const numbered = captions.map((caption, i) => `${i + 1}) ${caption}`).join("\n");
    const instruction = `Create exactly ${captions.length} concise ENGLISH image-generation prompts, one for each numbered Arabic story scene below. Keep the SAME recurring characters visually consistent across all scenes. The visual style is ${style === "realistic" ? "cinematic realistic" : style === "cartoon2d" ? "2D animated storybook" : "premium 3D cartoon animation"}. Every prompt must describe the action, setting, emotion, camera framing, vertical 9:16 composition, and say: no text, no watermark. Return ONLY a JSON array of strings in the same order, with exactly ${captions.length} items.\nStory topic: ${topic}\nScenes:\n${numbered}`;

    for (const candidate of CF_TEXT_MODELS) {
      try {
        const result = await env.AI.run(candidate, {
          messages: [
            { role: "system", content: "You are a storyboard artist. Return strict JSON only, no markdown and no explanation." },
            { role: "user", content: instruction }
          ],
          max_completion_tokens: Math.min(2600, Math.max(900, captions.length * 180)),
          temperature: 0.35,
          stream: false,
          chat_template_kwargs: { enable_thinking: false }
        });
        prompts = parsePromptArray(extractWorkersText(result), captions.length);
        if (prompts) { model = candidate; break; }
      } catch {}
    }
  }

  if (!prompts) prompts = captions.map(caption => fallbackPrompt(caption, topic, style));

  return json({
    scenes: captions.map((caption, index) => ({ index, caption, prompt: prompts[index] || fallbackPrompt(caption, topic, style) })),
    count: captions.length,
    model,
    captions_preserve_story_text: true
  });
}

async function storyImage(request, env) {
  const body = await safeJson(request);
  const prompt = clean(body.prompt, 2000);
  if (!prompt) return json({ error: "لا يوجد وصف للمشهد." }, 400);
  if (!env.AI?.run) return json({ error: "خدمة توليد الصور غير متاحة الآن." }, 503);

  try {
    const result = await env.AI.run(STORY_IMAGE_MODEL, {
      prompt,
      steps: 4,
      seed: Math.max(1, Math.floor(Number(body.seed) || Math.random() * 1000000000))
    });
    const image = clean(result?.image, 8_000_000);
    if (!image) throw new Error("empty image");
    return json({ image: `data:image/jpeg;base64,${image}`, model: STORY_IMAGE_MODEL });
  } catch (error) {
    return json({ error: "تعذر توليد هذا المشهد الآن.", detail: clean(error?.message || error, 180) }, 503);
  }
}

async function storyVoice(request, env, ctx) {
  const body = await safeJson(request);
  const text = clean(body.text, 6000);
  if (!text) return json({ error: "لا يوجد نص للقصة." }, 400);

  const target = new URL("/api/tts", request.url);
  const ttsRequest = new Request(target.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, voice: body.voice || "Kore", style: "story" })
  });
  return baseWorker.fetch(ttsRequest, env, ctx);
}

async function injectStoryVideo(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();
  html = html.replace(/story-video-v1\.js\?v=\d+/g, "story-video-v1.js?v=1");
  if (!html.includes("story-video-v1.js")) {
    html = html.replace("</body>", '<script src="story-video-v1.js?v=1"></script></body>');
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/story-scenes" && request.method === "POST") return storyScenes(request, env);
    if (url.pathname === "/api/story-image" && request.method === "POST") return storyImage(request, env);
    if (url.pathname === "/api/story-voice" && request.method === "POST") return storyVoice(request, env, ctx);

    const response = await baseWorker.fetch(request, env, ctx);
    return injectStoryVideo(response);
  }
};
