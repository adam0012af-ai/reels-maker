import baseWorker from "./worker-v6.js";

const STORY_IMAGE_MODELS = [
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/bytedance/stable-diffusion-xl-lightning"
];
const FREE_TTS_MODEL = "@cf/myshell-ai/melotts";

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

function bytesToBase64(bytes) {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

async function resultToDataUri(result) {
  if (!result) return null;
  if (typeof result?.image === "string" && result.image) {
    return `data:image/jpeg;base64,${result.image}`;
  }
  if (result instanceof Response) {
    const type = result.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await result.arrayBuffer());
    if (bytes.length) return `data:${type};base64,${bytesToBase64(bytes)}`;
  }
  if (result instanceof ReadableStream) {
    const bytes = new Uint8Array(await new Response(result).arrayBuffer());
    if (bytes.length) return `data:image/jpeg;base64,${bytesToBase64(bytes)}`;
  }
  if (result instanceof ArrayBuffer) {
    const bytes = new Uint8Array(result);
    if (bytes.length) return `data:image/jpeg;base64,${bytesToBase64(bytes)}`;
  }
  if (ArrayBuffer.isView(result)) {
    const bytes = new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
    if (bytes.length) return `data:image/jpeg;base64,${bytesToBase64(bytes)}`;
  }
  return null;
}

async function freeStoryImage(request, env) {
  if (!env.AI?.run) return json({ error: "مولد الصور المجاني غير متاح الآن." }, 503);
  const body = await safeJson(request);
  const prompt = clean(body.prompt, 2000);
  if (!prompt) return json({ error: "لا يوجد وصف للمشهد." }, 400);
  const seed = Math.max(1, Math.floor(Number(body.seed) || Math.random() * 1_000_000_000));
  const negative = "text, Arabic letters, English letters, captions, subtitles, watermark, logo, signature, gore, violence, deformed hands, extra fingers";

  for (const model of STORY_IMAGE_MODELS) {
    try {
      const result = model.includes("flux-1-schnell")
        ? await env.AI.run(model, { prompt, seed, steps: 4 })
        : await env.AI.run(model, {
            prompt,
            negative_prompt: negative,
            width: 576,
            height: 1024,
            num_steps: 4,
            guidance: 7,
            seed
          });
      const image = await resultToDataUri(result);
      if (image) return json({ image, model });
    } catch {}
  }

  return json({ error: "تعذر توليد صورة المشهد الآن." }, 503);
}

async function cloudflareTts(text, env) {
  if (!env.AI?.run || !text) return null;
  try {
    const result = await env.AI.run(FREE_TTS_MODEL, { prompt: text, lang: "ar" });
    if (result instanceof Response) {
      const headers = new Headers(result.headers);
      headers.set("content-type", headers.get("content-type") || "audio/mpeg");
      headers.set("cache-control", "no-store");
      headers.set("x-tts-provider", "cloudflare-melotts");
      return new Response(result.body, { status: result.status, headers });
    }
    if (result instanceof ReadableStream) {
      return new Response(result, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-tts-provider": "cloudflare-melotts" } });
    }
    if (result instanceof ArrayBuffer) {
      return new Response(result, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-tts-provider": "cloudflare-melotts" } });
    }
    if (ArrayBuffer.isView(result)) {
      return new Response(result.buffer, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-tts-provider": "cloudflare-melotts" } });
    }
    if (typeof result?.audio === "string" && result.audio) {
      const binary = atob(result.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Response(bytes, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-tts-provider": "cloudflare-melotts" } });
    }
  } catch {}
  return null;
}

async function freeStoryVoice(request, env, ctx) {
  const backup = request.clone();
  const primary = await baseWorker.fetch(request.clone(), env, ctx);
  if (primary.ok) return primary;

  const body = await safeJson(backup);
  const text = clean(body.text, 6000);
  const fallback = await cloudflareTts(text, env);
  return fallback || primary;
}

async function modelStatus(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  const data = await response.json().catch(() => ({}));
  return json({
    ...data,
    story_video_free_mode: true,
    story_scene_images: STORY_IMAGE_MODELS,
    story_voice_fallback: FREE_TTS_MODEL,
    story_video_behavior: "One Story + Video button builds a storyboard from the full story, generates multiple illustrated scenes, overlays story captions, synchronizes narration, and loads the finished vertical video into the editor."
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/story-image" && request.method === "POST") return freeStoryImage(request, env);
    if (url.pathname === "/api/story-voice" && request.method === "POST") return freeStoryVoice(request, env, ctx);
    if (url.pathname === "/api/model-status" && request.method === "GET") return modelStatus(request, env, ctx);
    return baseWorker.fetch(request, env, ctx);
  }
};
