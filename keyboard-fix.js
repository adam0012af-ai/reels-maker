"use strict";

(() => {
  if (window.__RM_STUDIO_LOADER_V2__) return;
  window.__RM_STUDIO_LOADER_V2__ = true;

  const load = () => {
    if (document.getElementById("studioShellV2Runtime")) return;
    const script = document.createElement("script");
    script.id = "studioShellV2Runtime";
    script.src = "studio-shell-v2.js?v=2";
    script.async = false;
    document.body.appendChild(script);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else load();
})();
