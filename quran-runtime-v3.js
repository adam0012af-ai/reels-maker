"use strict";

(() => {
  const nativeFetch = window.fetch.bind(window);

  // Quran API/audio are routed through the same Cloudflare Worker so browsers never
  // depend on third-party CORS behavior.
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

  const qid = id => document.getElementById(id);
  let mirror = null;
  let mirrorCtx = null;
  let livePreview = false;

  function isQuranReady() {
    try {
      return !!sourceAudio?.src && !!state?.layers?.some(layer => layer.quranTimed);
    } catch {
      return false;
    }
  }

  function injectMirrorStyles() {
    if (qid("qrRuntimeV3Styles")) return;
    const style = document.createElement("style");
    style.id = "qrRuntimeV3Styles";
    style.textContent = `
      #qrPhoneStage { position:relative; overflow:hidden; }
      #qrPhoneMirror {
        position:absolute; inset:0; width:100%; height:100%; display:none;
        z-index:3; background:#000; pointer-events:none;
      }
      #qrPhoneStage.qr-live #qrPhoneMirror { display:block; }
      #qrPhoneStage.qr-live .qr-demo-bg,
      #qrPhoneStage.qr-live .qr-demo-text,
      #qrPhoneStage.qr-live .qr-demo-meta { opacity:0!important; }
    `;
    document.head.appendChild(style);
  }

  function ensureMirror() {
    const stage = qid("qrPhoneStage");
    if (!stage) return;
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
  }

  function setLivePreview(on = true) {
    livePreview = !!on;
    qid("qrPhoneStage")?.classList.toggle("qr-live", livePreview);
  }

  function drawMirror() {
    const studioOpen = qid("quranStudio")?.classList.contains("open");
    if (!studioOpen || !livePreview || !mirror || !mirrorCtx || !window.canvas) return;
    try {
      // Render a clean frame without editor selection handles, then copy it into the phone.
      const oldExporting = state.exporting;
      state.exporting = true;
      if (typeof renderCanvas === "function") renderCanvas();
      mirrorCtx.drawImage(canvas, 0, 0, mirror.width, mirror.height);
      state.exporting = oldExporting;
    } catch {}
  }

  function waitForBuild(timeoutMs = 90000) {
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
    if (isQuranReady()) return true;
    const prepare = qid("qrPrepare");
    if (!prepare) return false;
    if (!prepare.disabled) prepare.click();
    const ok = await waitForBuild();
    if (ok) {
      setLivePreview(true);
      try { controls?.emptyState?.classList.add("hidden"); } catch {}
    }
    return ok;
  }

  async function toggleStudioPreview(button) {
    if (!(await ensurePrepared())) return;
    setLivePreview(true);
    try {
      if (typeof setupAudioGraph === "function") await setupAudioGraph();
      if (!sourceAudio.paused && !sourceAudio.ended) {
        sourceAudio.pause();
        if (state.videoLoaded) sourceVideo.pause();
        button.textContent = "▶ معاينة مباشرة";
        return;
      }

      if (sourceAudio.ended || sourceAudio.currentTime >= (sourceAudio.duration || Infinity) - .05) sourceAudio.currentTime = 0;
      if (state.videoLoaded) {
        sourceVideo.loop = true;
        sourceVideo.currentTime = Math.min(sourceAudio.currentTime || 0, Math.max(0, (sourceVideo.duration || 0) - .05));
        await sourceVideo.play().catch(() => {});
      }
      await sourceAudio.play();
      button.textContent = "❚❚ إيقاف المعاينة";
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
    if (!old || old.dataset.runtimeV3 === "1") return old;
    const fresh = old.cloneNode(true);
    fresh.dataset.runtimeV3 = "1";
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
        if (/تم تجهيز|جاهز للمراجعة/.test(status.textContent || "")) {
          setLivePreview(true);
          try { controls?.emptyState?.classList.add("hidden"); } catch {}
        }
      });
      observer.observe(status, { childList: true, subtree: true, characterData: true });
    }

    sourceAudio?.addEventListener("ended", () => {
      const btn = qid("qrPlay");
      if (btn) btn.textContent = "▶ معاينة مباشرة";
      if (state.videoLoaded) sourceVideo.pause();
    });
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
        if (sourceAudio.paused && qid("quranStudio")?.classList.contains("open")) {
          const btn = qid("qrPlay");
          if (btn && btn.textContent.includes("إيقاف")) btn.textContent = "▶ معاينة مباشرة";
        }
      }
    } catch {}
    requestAnimationFrame(raf);
  }

  function install() {
    ensureMirror();
    installStudioActions();
    installAudioOnlyEditorTransport();
    requestAnimationFrame(raf);
  }

  function waitForStudio() {
    if (!qid("quranStudio") || !qid("qrPlay") || !window.canvas) return setTimeout(waitForStudio, 100);
    install();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();
