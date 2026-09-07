import baseWorker from "./worker-v12.js";

async function injectMobilePolish(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  let html = await response.text();

  html = html.replace(/mobile-polish-v1\.css\?v=\d+/g, "mobile-polish-v1.css?v=2");
  html = html.replace(/mobile-polish-v1\.js\?v=\d+/g, "mobile-polish-v1.js?v=2");
  html = html.replace(/mobile-menu-v2\.css\?v=\d+/g, "mobile-menu-v2.css?v=3");
  html = html.replace(/mobile-menu-v2\.js\?v=\d+/g, "mobile-menu-v2.js?v=3");
  html = html.replace(/mobile-editor-v3\.css\?v=\d+/g, "mobile-editor-v3.css?v=3");
  html = html.replace(/mobile-editor-v3\.js\?v=\d+/g, "mobile-editor-v3.js?v=3");

  if (!html.includes("mobile-polish-v1.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="mobile-polish-v1.css?v=2"></head>');
  }
  if (!html.includes("mobile-menu-v2.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="mobile-menu-v2.css?v=3"></head>');
  }
  if (!html.includes("mobile-editor-v3.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="mobile-editor-v3.css?v=3"></head>');
  }
  if (!html.includes("mobile-polish-v1.js")) {
    html = html.replace("</body>", '<script src="mobile-polish-v1.js?v=2"></script></body>');
  }
  if (!html.includes("mobile-menu-v2.js")) {
    html = html.replace("</body>", '<script src="mobile-menu-v2.js?v=3"></script></body>');
  }
  if (!html.includes("mobile-editor-v3.js")) {
    html = html.replace("</body>", '<script src="mobile-editor-v3.js?v=3"></script></body>');
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    return injectMobilePolish(response);
  }
};
