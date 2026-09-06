import baseWorker from "./worker-v8.js";

async function injectHome(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  let html = await response.text();
  html = html.replace(/home-v1\.js\?v=\d+/g, "home-v1.js?v=1");
  if (!html.includes("home-v1.js")) {
    html = html.replace("</body>", '<script src="home-v1.js?v=1"></script></body>');
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    return injectHome(response);
  }
};