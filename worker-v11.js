import baseWorker from "./worker-v10.js";

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
  data.scenes = data.scenes.map(scene => ({ ...scene, prompt: rewritePrompt(scene.prompt, composition) }));
  data.outputAspect = aspect;
  data.outputComposition = composition;
  data.outputWidth = Number(body.outputWidth) || null;
  data.outputHeight = Number(body.outputHeight) || null;
  return json(data, response.status);
}

async function injectPremiumSystem(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();

  html = html.replace(/premium-design-system-v1\.css\?v=\d+/g, "premium-design-system-v1.css?v=3");
  html = html.replace(/premium-layout-v1\.js\?v=\d+/g, "premium-layout-v1.js?v=3");
  html = html.replace(/business-refresh-v3\.css\?v=\d+/g, "business-refresh-v3.css?v=1");
  html = html.replace(/business-refresh-v3\.js\?v=\d+/g, "business-refresh-v3.js?v=1");

  if (!html.includes("premium-design-system-v1.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="premium-design-system-v1.css?v=3"></head>');
  }
  if (!html.includes("business-refresh-v3.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="business-refresh-v3.css?v=1"></head>');
  }
  if (!html.includes("premium-layout-v1.js")) {
    html = html.replace("</body>", '<script src="premium-layout-v1.js?v=3"></script></body>');
  }
  if (!html.includes("business-refresh-v3.js")) {
    html = html.replace("</body>", '<script src="business-refresh-v3.js?v=1"></script></body>');
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/story-scenes-v2" && request.method === "POST") {
      return aspectAwareStoryboard(request, env, ctx);
    }
    const response = await baseWorker.fetch(request, env, ctx);
    return injectPremiumSystem(response);
  }
};
