import baseWorker from "./worker-v9.js";

async function injectV10(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();

  html = html.replace(/home-premium-v2\.js\?v=\d+/g, "home-premium-v2.js?v=1");
  html = html.replace(/story-pro-controls-v1\.js\?v=\d+/g, "story-pro-controls-v1.js?v=1");

  if (!html.includes("home-premium-v2.js")) {
    html = html.replace("</body>", '<script src="home-premium-v2.js?v=1"></script></body>');
  }
  if (!html.includes("story-pro-controls-v1.js")) {
    html = html.replace("</body>", '<script src="story-pro-controls-v1.js?v=1"></script></body>');
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    return injectV10(response);
  }
};
