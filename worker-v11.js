import baseWorker from "./worker-v10.js";

const CF_IMAGE_MODELS = [
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/black-forest-labs/flux-1-schnell"
];
const NANO_IMAGE_MODELS = [
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image"
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

function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function compositionFor(body) {
  const aspect = clean(body.aspect, 20) || "9:16";
  const supplied = clean(body.composition, 120);
  if (supplied) return { aspect, composition: supplied };
  const map = {
    "9:16": "vertical 9:16 portrait composition",
    "16:9": "horizontal cinematic 16:9 composition",
    "1:1": "square 1:1 composition",
    "4:5": "vertical social 4:5 composition",
    "3:4": "vertical classic 3:4 composition"
  };
  return { aspect, composition: map[aspect] || map["9:16"] };
}

function rewritePrompt(prompt, composition) {
  let value = String(prompt || "");
  value = value
    .replace(/vertical\s*9\s*:\s*16\s*composition/gi, composition)
    .replace(/vertical\s*9\s*:\s*16/gi, composition)
    .replace(/\b9\s*:\s*16\s*composition\b/gi, composition);
  if (!value.toLowerCase().includes(composition.toLowerCase())) value += `. ${composition}`;
  value += ". Keep all important faces, bodies, hands and story objects safely inside the chosen frame with generous composition margins. No text, no captions, no logo, no watermark.";
  return value;
}

async function aspectAwareStoryboard(request, env, ctx) {
  const body = await safeJson(request.clone());
  const response = await baseWorker.fetch(request, env, ctx);
  if (!response.ok) return response;
  const data = await response.json().catch(() => null);
  if (!data || !Array.isArray(data.scenes)) return response;
  const { aspect, composition } = compositionFor(body);
  const continuity = clean(data.characterBible || data.character_bible, 1800);
  data.scenes = data.scenes.map((scene, index) => ({
    ...scene,
    prompt: rewritePrompt(
      `${scene.prompt || ""}. ${continuity ? `CONTINUITY: ${continuity}.` : ""} Same recurring faces and wardrobe. One coherent visual style. Avoid extreme eye close-ups, split screens, double exposure, collages, duplicated faces and unrelated symbolic shots. Show the actual story action in scene ${index + 1}.`,
      composition
    )
  }));
  data.outputAspect = aspect;
  data.outputComposition = composition;
  data.outputWidth = Number(body.outputWidth) || null;
  data.outputHeight = Number(body.outputHeight) || null;
  data.qualityProfile = "premium-continuity-v3";
  return json(data, response.status);
}

function bytesToBase64(bytes) {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(binary);
}

async function resultToDataUri(result) {
  if (!result) return null;
  if (typeof result?.image === "string" && result.image) return `data:image/jpeg;base64,${result.image}`;
  if (result instanceof Response) {
    const type = result.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await result.arrayBuffer());
    return bytes.length ? `data:${type};base64,${bytesToBase64(bytes)}` : null;
  }
  if (result instanceof ReadableStream) {
    const bytes = new Uint8Array(await new Response(result).arrayBuffer());
    return bytes.length ? `data:image/jpeg;base64,${bytesToBase64(bytes)}` : null;
  }
  if (result instanceof ArrayBuffer || ArrayBuffer.isView(result)) {
    const bytes = result instanceof ArrayBuffer ? new Uint8Array(result) : new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
    return bytes.length ? `data:image/jpeg;base64,${bytesToBase64(bytes)}` : null;
  }
  return null;
}

function aspectDims(aspect) {
  return ({
    "9:16": [576, 1024],
    "16:9": [1024, 576],
    "1:1": [896, 896],
    "4:5": [768, 960],
    "3:4": [768, 1024]
  })[aspect] || [576, 1024];
}

function stylePrompt(style) {
  const map = {
    realistic: "photorealistic cinematic photography, natural skin texture, realistic anatomy, professional lens, believable lighting",
    cinematic: "premium cinematic film still, dramatic but natural lighting, coherent production design, realistic depth",
    kids3d: "premium 3D animated family film, warm expressive characters, polished cinematic lighting, consistent character design",
    kids2d: "premium 2D storybook animation, clean shapes, expressive characters, consistent illustration language",
    islamic: "elegant peaceful Islamic visual mood, refined architecture and nature, premium editorial composition, no sacred text generated in image",
    business: "high-end commercial advertising photography, clean premium business art direction, realistic materials, sophisticated lighting",
    social: "high-impact premium social media visual, clean focal point, modern editorial composition, safe negative space for later captions"
  };
  return map[style] || map.realistic;
}

function normalizeReference(reference) {
  const raw = String(reference || "");
  const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

function findImageBlock(data) {
  if (!data || typeof data !== "object") return null;
  const direct = data.output_image || data.outputImage;
  if (direct && typeof direct.data === "string") return { data: direct.data, mime: direct.mime_type || direct.mimeType || "image/png" };
  const seen = new Set();
  const walk = value => {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if ((value.type === "image" || value.mime_type?.startsWith?.("image/") || value.mimeType?.startsWith?.("image/")) && typeof value.data === "string" && value.data.length > 100) {
      return { data: value.data, mime: value.mime_type || value.mimeType || "image/png" };
    }
    const preferred = [value.output_image, value.outputImage, value.outputs, value.output, value.steps, value.candidates, value.content, value.parts].filter(Boolean);
    for (const child of preferred) {
      if (Array.isArray(child)) { for (const item of child) { const found = walk(item); if (found) return found; } }
      else { const found = walk(child); if (found) return found; }
    }
    for (const child of Object.values(value)) {
      if (!child || typeof child !== "object" || preferred.includes(child)) continue;
      const found = walk(child); if (found) return found;
    }
    return null;
  };
  return walk(data);
}

async function geminiImage(env, prompt, aspect, reference = null, preferPro = false) {
  if (!env.GEMINI_API_KEY) return null;
  const models = reference || preferPro ? ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image"] : NANO_IMAGE_MODELS;
  const input = [{ type: "text", text: prompt }];
  if (reference) input.push({ type: "image", mime_type: reference.mime, data: reference.data });
  for (const model of models) {
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          model,
          input,
          response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: aspect, image_size: "1K" }
        })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) continue;
      const image = findImageBlock(data);
      if (image?.data) return { image: `data:${image.mime};base64,${image.data}`, model, provider: "Nano Banana" };
    } catch {}
  }
  return null;
}

async function cloudflareImage(env, prompt, aspect, seed) {
  if (!env.AI?.run) return null;
  const [width, height] = aspectDims(aspect);
  const negative = "text, letters, captions, subtitles, watermark, logo, signature, duplicate face, extra fingers, deformed hands, split screen, collage, double exposure";
  for (const model of CF_IMAGE_MODELS) {
    try {
      const result = model.includes("stable-diffusion")
        ? await env.AI.run(model, { prompt, negative_prompt: negative, width, height, num_steps: 4, guidance: 7, seed })
        : await env.AI.run(model, { prompt, seed, steps: 5 });
      const image = await resultToDataUri(result);
      if (image) return { image, model, provider: "Cloudflare Workers AI" };
    } catch {}
  }
  return null;
}

async function imageStudio(request, env) {
  const body = await safeJson(request);
  const base = clean(body.prompt, 2200);
  if (!base) return json({ error: "اكتب وصف الصورة أولًا." }, 400);
  const aspect = ["9:16","16:9","1:1","4:5","3:4"].includes(body.aspect) ? body.aspect : "9:16";
  const style = clean(body.style, 30) || "realistic";
  const seed = Math.max(1, Math.floor(Number(body.seed) || Math.random() * 1_000_000_000));
  const reference = normalizeReference(body.reference);
  const mode = reference ? "edit" : "generate";
  const { composition } = compositionFor({ aspect });
  const prompt = `${base}. ${stylePrompt(style)}. ${composition}. Premium professional composition. Preserve a clear subject and coherent environment. ${reference ? "Use the supplied reference image faithfully for identity, subject, colors or style as requested." : ""} No generated captions, no watermark, no logo unless the user explicitly asks for text.`;

  let result = null;
  const provider = clean(body.provider, 30) || "auto";
  if (mode === "edit" || provider === "nano") result = await geminiImage(env, prompt, aspect, reference, true);
  if (!result && provider !== "nano") result = await cloudflareImage(env, prompt, aspect, seed);
  if (!result && provider !== "cloudflare") result = await geminiImage(env, prompt, aspect, reference, false);
  if (!result) return json({ error: "تعذر توليد الصورة من كل الخدمات المتاحة حاليًا. حاول بعد قليل." }, 503);
  return json({ ...result, aspect, style, seed, mode, fallback: provider === "auto" && result.provider !== "Cloudflare Workers AI" });
}

async function modelStatus(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx);
  const data = await response.json().catch(() => ({}));
  return json({
    ...data,
    image_studio: true,
    image_generation_strategy: "auto fallback",
    image_cloudflare_models: CF_IMAGE_MODELS,
    image_nano_banana_models: NANO_IMAGE_MODELS,
    image_editing: "Nano Banana reference-image editing when Gemini key/quota is available"
  });
}

async function injectPremiumSystem(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();

  html = html.replace(/premium-design-system-v1\.css\?v=\d+/g, "premium-design-system-v1.css?v=4");
  html = html.replace(/premium-layout-v1\.js\?v=\d+/g, "premium-layout-v1.js?v=4");
  html = html.replace(/premium-plus-v1\.css\?v=\d+/g, "premium-plus-v1.css?v=2");
  html = html.replace(/premium-plus-v1\.js\?v=\d+/g, "premium-plus-v1.js?v=2");

  const boot = `<style id="rmRouteBootStyle">html.rm-route-booting body{visibility:hidden!important;background:#04070b!important}</style><script id="rmRouteBoot">document.documentElement.classList.add('rm-route-booting');setTimeout(function(){document.documentElement.classList.remove('rm-route-booting')},2200);</script>`;
  if (!html.includes('id="rmRouteBoot"')) html = html.replace("<head>", `<head>${boot}`);

  const css = [
    ["premium-design-system-v1.css","4"],
    ["premium-plus-v1.css","2"],
    ["premium-plus-v2.css","1"],
    ["projects-v2.css","1"],
    ["image-studio-v1.css","1"]
  ];
  for (const [file, version] of css) if (!html.includes(file)) html = html.replace("</head>", `<link rel="stylesheet" href="${file}?v=${version}"></head>`);

  const scripts = [
    ["premium-layout-v1.js","4"],
    ["premium-plus-v1.js","2"],
    ["projects-v2.js","1"],
    ["image-studio-v1.js","1"],
    ["story-quality-v3.js","1"],
    ["premium-plus-v2.js","1"]
  ];
  for (const [file, version] of scripts) if (!html.includes(file)) html = html.replace("</body>", `<script src="${file}?v=${version}"></script></body>`);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/story-scenes-v2" && request.method === "POST") return aspectAwareStoryboard(request, env, ctx);
    if (url.pathname === "/api/image-studio" && request.method === "POST") return imageStudio(request, env);
    if (url.pathname === "/api/model-status" && request.method === "GET") return modelStatus(request, env, ctx);
    const response = await baseWorker.fetch(request, env, ctx);
    return injectPremiumSystem(response);
  }
};