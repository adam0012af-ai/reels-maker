"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const STORE = "reelsMaker.storyPro.v1";
  const FORMATS = {
    portrait: { ratio: "9:16", label: "vertical 9:16 portrait composition", sizes: {"540":[540,960],"720":[720,1280],"1080":[1080,1920]} },
    landscape: { ratio: "16:9", label: "horizontal cinematic 16:9 composition", sizes: {"540":[960,540],"720":[1280,720],"1080":[1920,1080]} },
    square: { ratio: "1:1", label: "square 1:1 composition", sizes: {"540":[540,540],"720":[720,720],"1080":[1080,1080]} },
    feed: { ratio: "4:5", label: "vertical social 4:5 composition", sizes: {"540":[540,675],"720":[720,900],"1080":[1080,1350]} },
    classic: { ratio: "3:4", label: "vertical classic 3:4 composition", sizes: {"540":[540,720],"720":[720,960],"1080":[1080,1440]} }
  };

  function config() {
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(STORE) || "{}"); } catch {}
    const format = FORMATS[saved.format] ? saved.format : "portrait";
    const quality = ["540","720","1080"].includes(String(saved.quality)) ? String(saved.quality) : "720";
    const f = FORMATS[format];
    const [width,height] = f.sizes[quality] || f.sizes["720"];
    return { format, quality, voice: saved.voice || "Kore", ratio: f.ratio, composition: f.label, width, height };
  }

  function patchFetch() {
    if (window.__storyFormatFetchPatched) return;
    window.__storyFormatFetchPatched = true;
    const previous = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      try {
        const url = typeof input === "string" ? input : input?.url || "";
        if (init?.body && String(init.method || "POST").toUpperCase() === "POST" && (/\/api\/story-scenes-v2(?:\?|$)/.test(url) || /\/api\/story-image(?:\?|$)/.test(url))) {
          const data = JSON.parse(init.body);
          const c = config();
          data.aspect = c.ratio;
          data.format = c.format;
          data.composition = c.composition;
          data.outputWidth = c.width;
          data.outputHeight = c.height;
          if (/\/api\/story-image(?:\?|$)/.test(url) && data.prompt) {
            data.prompt = `${data.prompt}. IMPORTANT OUTPUT FRAMING: ${c.composition}; keep every important face, body and object safely inside the frame with generous margins; no text, no watermark.`;
          }
          init = { ...init, body: JSON.stringify(data) };
        }
      } catch {}
      return previous(input, init);
    };
  }

  function installEditorBranding() {
    const button = qid("exportBtn");
    if (!button || button.dataset.brandHook === "1") return false;
    button.dataset.brandHook = "1";
    button.addEventListener("click", () => {
      try {
        if (typeof state === "undefined" || typeof canvas === "undefined" || !state?.videoLoaded || !Array.isArray(state.layers)) return;
        const existing = state.layers.find(layer => layer?.__reelsMakerBrand);
        if (existing) return;
        const size = Math.max(25, canvas.width * .026);
        const layer = {
          id: `reels-maker-brand-${Date.now()}`,
          type: "text",
          name: "Reels Maker AI",
          text: "R  Reels Maker AI",
          visible: true,
          x: canvas.width * .14,
          y: canvas.height * .042,
          rotation: 0,
          scale: 1,
          font: "Cairo",
          size,
          color: "#ffffff",
          bg: "#07101a",
          bgOpacity: .48,
          shadow: "#000000",
          shadowBlur: 4,
          padX: size * .52,
          padY: size * .28,
          __reelsMakerBrand: true
        };
        state.layers.push(layer);
        const started = Date.now();
        const poll = setInterval(() => {
          try {
            if ((!state.exporting && Date.now() - started > 350) || Date.now() - started > 180000) {
              const i = state.layers.indexOf(layer);
              if (i >= 0) state.layers.splice(i, 1);
              clearInterval(poll);
            }
          } catch { clearInterval(poll); }
        }, 180);
      } catch {}
    }, true);
    return true;
  }

  function install() {
    patchFetch();
    const wait = () => { if (!installEditorBranding()) setTimeout(wait, 150); };
    wait();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install);
  else install();
})();
