import apiWorker from "./worker-v12.js";

const LEGACY_FILES = [
  "premium-layout-v1.js","premium-plus-v1.js","premium-plus-v2.js","premium-design-system-v1.css","premium-plus-v1.css","premium-plus-v2.css",
  "projects-v2.js","projects-v2.css","story-quality-v3.js","story-director-v4.js","story-director-v4.css",
  "route-state-v1.js","route-boot-v8.js","route-native-v9.js",
  "mobile-polish-v1.css","mobile-polish-v1.js","mobile-menu-v2.css","mobile-menu-v2.js","mobile-editor-v3.css","mobile-editor-v3.js","mobile-editor-v4.css","mobile-editor-v4.js"
];

function stripLegacy(html) {
  for (const file of LEGACY_FILES) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html
      .replace(new RegExp(`<script[^>]+src=["'][^"']*${escaped}(?:\\?[^"']*)?["'][^>]*><\\/script>`, "gi"), "")
      .replace(new RegExp(`<link[^>]+href=["'][^"']*${escaped}(?:\\?[^"']*)?["'][^>]*>`, "gi"), "");
  }

  /* Remove the old inline route boot that lived in index.html. */
  html = html.replace(/<script>\s*\(\(\)\s*=>\s*\{[\s\S]*?__RM_ROUTE_STATE_INSTALLED__[\s\S]*?<\/script>/i, "");
  return html;
}

function injectCleanRuntime(html) {
  html = stripLegacy(html);

  const boot = `<style id="rmCleanBootStyle">html.rm-clean-boot,html.rm-clean-boot body{background:#070b12!important}html.rm-clean-boot body{visibility:hidden!important}</style><script id="rmCleanBoot">window.__RM_MODERN_MOBILE__=true;window.__RM_ROUTE_STATE_INSTALLED__=true;window.__RM_DISABLE_LEGACY_PREMIUM_ROUTER__=true;document.documentElement.classList.add('rm-clean-boot');try{localStorage.removeItem('reelsMaker.route.v2');localStorage.removeItem('reels-shell-active-route-v1')}catch(e){}</script>`;
  if (!html.includes('id="rmCleanBoot"')) html = html.replace("<head>", `<head>${boot}`);

  if (!html.includes("mobile-clean-v1.css")) html = html.replace("</head>", '<link rel="stylesheet" href="mobile-clean-v1.css?v=1"></head>');
  if (!html.includes("app-router-v1.js")) html = html.replace("</body>", '<script src="app-router-v1.js?v=1"></script></body>');

  return html;
}

async function serveFrontend(request, env) {
  const response = await env.ASSETS.fetch(request);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  const html = injectCleanRuntime(await response.text());
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return apiWorker.fetch(request, env, ctx);
    return serveFrontend(request, env);
  }
};
