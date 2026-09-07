"use strict";

(() => {
  if (window.__REELS_PLATFORM_V11_LOADER__) return;
  window.__REELS_PLATFORM_V11_LOADER__ = true;
  window.__REELS_MODERN_SHELL__ = true;

  const load = () => {
    if (document.getElementById("platformV11Runtime")) return;
    const script = document.createElement("script");
    script.id = "platformV11Runtime";
    script.src = "platform-v11.js?v=11";
    script.async = false;
    document.body.appendChild(script);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else load();
})();
