"use strict";

(() => {
  const nativeFetch = window.fetch.bind(window);
  const qid = id => document.getElementById(id);

  // Route Quran JSON/audio through the same Cloudflare Worker so Chrome/mobile
  // never depend on third-party CORS or hotlink behaviour.
  window.fetch = function quranSafeFetch(input, init) {
    const raw = typeof input === "string" ? input : input?.url;
    if (raw) {
      try {
        const url = new URL(raw, location.href);
        if (url.hostname === "api.alquran.cloud") {
          return nativeFetch(`/api/quran-json?url=${encodeURIComponent(url.href)}`, init);
        }
        if (url.hostname === "cdn.islamic.network") {
          return nativeFetch(`/api/quran-media?url=${encodeURIComponent(url.href)}`, init);
        }
      } catch {}
    }
    return nativeFetch(input, init);
  };

  let mirror = null;
  let mirrorCtx = null;
  let livePreview = false;

  function mainCanvas() {
    return qid("canvas");
  }

  function isQuranReady() {
    try {
      return !!sourceAudio?.src && !!state?.layers?.some(layer => layer.quranTimed);
    } catch {
      return false;
    }
  }

  function hasVisualProject() {
    try {
      return !!state?.videoLoaded || !!state?.layers?.some(layer => layer.quranTimed || layer.quranMeta || layer.quranLogo || String(layer.id || "").startsWith("qbg-"));
    } catch {
      return false;
    }
  }

  function injectMirrorStyles() {
    if (qid("qrRuntimeV4Styles")) return;
    const style = document.createElement("style");
    style.id = "qrRuntimeV4Styles";
    style.textContent = `
      #qrPhoneStage{position:relative!important;overflow:hidden!important}
      #qrPhoneMirror{
        position:absolute;inset:0;width:100%;height:100%;display:none;z-index:6;
        background:#000;pointer-events:none;border-radius:inherit
      }
      #qrPhoneStage.qr-live #qrPhoneMirror{display:block}
      #qrPhoneStage.qr-live .qr-demo-bg,
      #qrPhoneStage.qr-live .qr-demo-text,
      #qrPhoneStage.qr-live .qr-demo-meta{opacity:0!important}
      @media(min-width:901px){
        .qr-preview-col{justify-content:flex-start!important;padding-top:12px!important;overflow:auto!important}
        .qr-phone{height:min(58dvh,560px)!important;width:auto!important;max-width:94%!important;flex:0 0 auto!important}
        .qr-preview-tools{flex:0 0 auto!important}
        .qr-ready-note,.qr-share{flex:0 0 auto!important}
      }
      @media(max-width:900px){
        .qr-phone{width:min(78vw,330px)!important;height:auto!important;flex:0 0 auto!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureMirror() {
    const stage = qid("qrPhoneStage");
    if (!stage) return false;
    injectMirrorStyles();
    mirror = qid("qrPhoneMirror");
    if (!mirror) {
      mirror = document.createElement("canvas");
      mirror.id = "qrPhoneMirror";
      mirror.width = 1080;
      mirror.height = 1920;
      stage.appendChild(mirror);
    }
    mirrorCtx = mirror.getContext("2d", { alpha: false });
    return !!mirrorCtx;
  }

  function setLivePreview(on = true) {
    livePreview = !!on;
    qid("qrPhoneStage")?.classList.toggle("qr-live", livePreview);
    if (livePreview) {
      try { controls?.emptyState?.classList.add("hidden"); } catch {}
    }
  }

  function drawMirror() {
    const studioOpen = qid("quranStudio")?.classList.contains("open");
    const canvasEl = mainCanvas();
    if (!studioOpen || !livePreview || !mirror || !mirrorCtx || !canvasEl) return;
    try {
      const oldExporting = state.exporting;
      state.exporting = true;
      if (typeof renderCanvas === "function") renderCanvas();
      mirrorCtx.clearRect(0, 0, mirror.width, mirror.height);
      mirrorCtx.drawImage(canvasEl, 0, 0, mirror.width, mirror.height);
      state.exporting = oldExporting;
    } catch {}
  }

  function revealCurrentVisual() {
    if (!qid("quranStudio")?.classList.contains("open")) return;
    if (!hasVisualProject()) return;
    setLivePreview(true);
    try { if (typeof renderCanvas === "function") renderCanvas(); } catch {}
    drawMirror();
  }

  function waitForBuild(timeoutMs = 120000) {
    return new Promise(resolve => {
      const status = qid("qrStatus");
      if (!status) return resolve(false);
      const check = () => {
        const text = status.textContent || "";
        if (/تم تجهيز|جاهز للمراجعة|جاهز:/.test(text)) return true;
        if (/تعذر إنشاء|فشل|تم إلغاء/.test(text)) return false;
        return null;
      };
      const immediate = check();
      if (immediate !== null) return resolve(immediate);
      const observer = new MutationObserver(() => {
        const result = check();
        if (result !== null) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(result);
        }
      });
      observer.observe(status, { childList: true, subtree: true, characterData: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, timeoutMs);
    });
  }

  async function ensurePrepared() {
    if (isQuranReady()) {
      setLivePreview(true);
      return true;
    }
    const prepare = qid("qrPrepare");
    if (!prepare) return false;
    if (!prepare.disabled) prepare.click();
    const ok = await waitForBuild();
    if (ok) revealCurrentVisual();
    return ok;
  }

  async function toggleStudioPreview(button) {
    if (!(await ensurePrepared())) return;
    setLivePreview(true);
    try {
      if (typeof setupAudioGraph === "function") await setupAudioGraph();
      const playingAudio = !sourceAudio.paused && !sourceAudio.ended;
      const playingVideo = state.videoLoaded && !sourceVideo.paused && !sourceVideo.ended;
      if (playingAudio || playingVideo) {
        sourceAudio.pause();
        if (state.videoLoaded) sourceVideo.pause();
        button.textContent = "▶ معاينة مباشرة";
        return;
      }

      if (sourceAudio.ended || sourceAudio.currentTime >= (sourceAudio.duration || Infinity) - .05) sourceAudio.currentTime = 0;
      if (state.videoLoaded) {
        sourceVideo.loop = true;
        const videoDur = Number.isFinite(sourceVideo.duration) ? sourceVideo.duration : 0;
        sourceVideo.currentTime = videoDur > 0 ? Math.min(sourceAudio.currentTime || 0, Math.max(0, videoDur - .05)) : 0;
        await sourceVideo.play().catch(() => {});
      }
      await sourceAudio.play();
      button.textContent = "❚❚ إيقاف المعاينة";
      revealCurrentVisual();
    } catch (error) {
      const status = qid("qrStatus");
      if (status) {
        status.textContent = `تعذر بدء المعاينة: ${error?.message || error}`;
        status.className = "qr-status err";
      }
    }
  }

  function openEditorNow() {
    try {
      qid("quranStudio")?.classList.remove("open");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      controls?.emptyState?.classList.add("hidden");
      const quranLayer = state.layers.find(layer => layer.quranTimed);
      if (quranLayer) state.selected = quranLayer.id;
      if (typeof renderLayersList === "function") renderLayersList();
      if (typeof syncSelectedControls === "function") syncSelectedControls();
      if (typeof renderCanvas === "function") renderCanvas();
    } catch {}
  }

  async function openEditorReliable() {
    if (!(await ensurePrepared())) return;
    openEditorNow();
  }

  function replaceActionButton(id, handler) {
    const old = qid(id);
    if (!old || old.dataset.runtimeV4 === "1") return old;
    const fresh = old.cloneNode(true);
    fresh.dataset.runtimeV4 = "1";
    old.replaceWith(fresh);
    fresh.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler(fresh, event);
    });
    return fresh;
  }

  function installStudioActions() {
    replaceActionButton("qrPlay", button => toggleStudioPreview(button));
    replaceActionButton("qrOpenEditor", () => openEditorReliable());

    const status = qid("qrStatus");
    if (status) {
      const observer = new MutationObserver(() => {
        if (/تم تجهيز|جاهز للمراجعة/.test(status.textContent || "")) revealCurrentVisual();
      });
      observer.observe(status, { childList: true, subtree: true, characterData: true });
    }

    sourceAudio?.addEventListener("ended", () => {
      const btn = qid("qrPlay");
      if (btn) btn.textContent = "▶ معاينة مباشرة";
      if (state.videoLoaded) sourceVideo.pause();
    });
  }

  function installVisualHooks() {
    ["loadedmetadata", "loadeddata", "canplay", "seeked"].forEach(type => {
      sourceVideo?.addEventListener(type, () => {
        if (qid("quranStudio")?.classList.contains("open")) revealCurrentVisual();
      });
    });

    document.addEventListener("click", event => {
      if (event.target.closest?.(".qr-stock-item,.qr-bg")) {
        [80, 350, 900, 1800].forEach(ms => setTimeout(revealCurrentVisual, ms));
      }
    }, true);

    document.addEventListener("change", event => {
      if (["qrBgImage", "qrBgVideo"].includes(event.target?.id)) {
        [120, 500, 1200].forEach(ms => setTimeout(revealCurrentVisual, ms));
      }
    }, true);

    const studio = qid("quranStudio");
    if (studio) {
      const observer = new MutationObserver(() => {
        if (studio.classList.contains("open")) {
          ensureMirror();
          setTimeout(() => {
            if (hasVisualProject()) revealCurrentVisual();
          }, 80);
        }
      });
      observer.observe(studio, { attributes: true, attributeFilter: ["class"] });
    }
  }

  function installAudioOnlyEditorTransport() {
    document.addEventListener("click", async event => {
      const play = event.target.closest?.("#playBtn");
      if (!play || state.videoLoaded || !isQuranReady()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        if (typeof setupAudioGraph === "function") await setupAudioGraph();
        if (sourceAudio.paused) {
          if (sourceAudio.ended) sourceAudio.currentTime = 0;
          await sourceAudio.play();
          play.textContent = "❚❚";
        } else {
          sourceAudio.pause();
          play.textContent = "▶";
        }
      } catch {}
    }, true);

    document.addEventListener("input", event => {
      if (event.target?.id !== "timeline" || state.videoLoaded || !isQuranReady()) return;
      const duration = sourceAudio.duration || 0;
      if (duration > 0) sourceAudio.currentTime = (+event.target.value / 1000) * duration;
    }, true);
  }

  function raf() {
    drawMirror();
    try {
      if (!state.videoLoaded && isQuranReady() && Number.isFinite(sourceAudio.duration) && sourceAudio.duration > 0) {
        controls.timeline.value = Math.round((sourceAudio.currentTime / sourceAudio.duration) * 1000) || 0;
        controls.currentTime.textContent = typeof fmt === "function" ? fmt(sourceAudio.currentTime) : `${Math.floor(sourceAudio.currentTime)}s`;
        controls.duration.textContent = typeof fmt === "function" ? fmt(sourceAudio.duration) : `${Math.floor(sourceAudio.duration)}s`;
      }
      if (sourceAudio?.paused && qid("quranStudio")?.classList.contains("open")) {
        const btn = qid("qrPlay");
        if (btn && btn.textContent.includes("إيقاف")) btn.textContent = "▶ معاينة مباشرة";
      }
    } catch {}
    requestAnimationFrame(raf);
  }

  function install() {
    if (!ensureMirror()) return setTimeout(install, 120);
    installStudioActions();
    installVisualHooks();
    installAudioOnlyEditorTransport();
    requestAnimationFrame(raf);
    if (hasVisualProject()) revealCurrentVisual();
  }

  function waitForStudio() {
    // A top-level `const canvas` from script.js is not a window.canvas property.
    // Use the actual DOM canvas so this runtime always installs.
    if (!qid("quranStudio") || !qid("qrPlay") || !mainCanvas()) return setTimeout(waitForStudio, 100);
    install();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();
