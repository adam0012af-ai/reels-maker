"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let installed = false;
  let preparedSignature = "";
  let preparingPreview = false;

  function wait() {
    try {
      if (installed) return;
      if (typeof state === "undefined" || typeof canvas === "undefined" || typeof ctx === "undefined" || typeof baseBounds !== "function" || typeof drawTextLayerLocal !== "function" || !qid("quranStudio")) {
        return setTimeout(wait, 100);
      }
      install();
    } catch {
      setTimeout(wait, 120);
    }
  }

  function isQuranTextLayer(layer) {
    return !!(layer?.quranTimed || layer?.quranDisplay);
  }

  function quranFontSize(layer) {
    const requested = Number(layer?.size || 72);
    const readableMin = Math.max(42, canvas.width * .044);
    return Math.max(readableMin, requested);
  }

  function wrapWords(text, font, maxWidth) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return [" "];
    ctx.save();
    ctx.font = font;
    const words = clean.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    ctx.restore();
    return lines.length ? lines : [clean];
  }

  function quranLayout(layer) {
    const size = quranFontSize(layer);
    const font = `700 ${size}px "${layer.font || "Amiri"}"`;
    const padX = Math.max(Number(layer.padX || 28), canvas.width * .025);
    const padY = Math.max(Number(layer.padY || 16), canvas.width * .015);
    const maxTextWidth = canvas.width * .78;
    const lines = wrapWords(layer.text, font, maxTextWidth);
    const lineH = size * 1.48;
    ctx.save();
    ctx.font = font;
    const measured = Math.max(1, ...lines.map(line => ctx.measureText(line || " ").width));
    ctx.restore();
    return {
      size,
      font,
      lines,
      lineH,
      padX,
      padY,
      w: Math.min(canvas.width * .88, measured + padX * 2),
      h: lines.length * lineH + padY * 2
    };
  }

  function installQuranWrapping() {
    if (baseBounds.__quranWrapV5) return;
    const nativeBounds = baseBounds;
    const nativeDraw = drawTextLayerLocal;

    baseBounds = function quranWrappedBounds(layer) {
      if (!isQuranTextLayer(layer)) return nativeBounds(layer);
      const layout = quranLayout(layer);
      return { w: layout.w, h: layout.h, lineH: layout.lineH, quranLayout: layout };
    };
    baseBounds.__quranWrapV5 = true;

    drawTextLayerLocal = function quranWrappedDraw(layer) {
      if (!isQuranTextLayer(layer)) return nativeDraw(layer);
      const layout = quranLayout(layer);
      const radius = Math.max(12, layout.size * .17);
      ctx.fillStyle = typeof hexAlpha === "function"
        ? hexAlpha(layer.bg || "#000000", Number(layer.bgOpacity ?? .28))
        : "rgba(0,0,0,.28)";
      if (typeof roundRect === "function") {
        roundRect(ctx, -layout.w / 2, -layout.h / 2, layout.w, layout.h, radius);
        ctx.fill();
      } else {
        ctx.fillRect(-layout.w / 2, -layout.h / 2, layout.w, layout.h);
      }
      ctx.font = layout.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "rtl";
      ctx.fillStyle = layer.color || "#ffffff";
      ctx.shadowColor = layer.shadow || "#000000";
      ctx.shadowBlur = Number(layer.shadowBlur || 0);
      ctx.shadowOffsetY = Math.max(1, Number(layer.shadowBlur || 0) * .22);
      const start = -((layout.lines.length - 1) * layout.lineH) / 2;
      layout.lines.forEach((line, index) => ctx.fillText(line || " ", 0, start + index * layout.lineH, canvas.width * .78));
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    };
    drawTextLayerLocal.__quranWrapV5 = true;
  }

  function selectionSignature() {
    return [
      qid("qrSurah")?.value || "",
      qid("qrFrom")?.value || "",
      qid("qrTo")?.value || "",
      qid("qrReciter")?.value || ""
    ].join("|");
  }

  function projectReady() {
    try {
      return !!sourceAudio?.src && !!state.layers?.some(layer => layer.quranTimed);
    } catch {
      return false;
    }
  }

  function setStudioStatus(text, type = "") {
    const status = qid("qrStatus");
    if (!status) return;
    status.textContent = text;
    status.className = `qr-status ${type}`;
  }

  function markSelectionDirty() {
    if (!preparedSignature && !projectReady()) return;
    preparedSignature = "";
    try {
      sourceAudio?.pause();
      if (state.videoLoaded) sourceVideo?.pause();
    } catch {}
    const play = qid("qrPlay");
    if (play) play.textContent = "▶ معاينة الاختيار الحالي";
    setStudioStatus("تم تغيير السورة/الآيات/القارئ. اضغط المعاينة لتجهيز الاختيار الجديد.");
  }

  function waitForPrepareCycle(timeoutMs = 120000) {
    const button = qid("qrPrepare");
    const status = qid("qrStatus");
    return new Promise(resolve => {
      const started = Date.now();
      let sawBusy = !!button?.disabled;
      const tick = () => {
        if (button?.disabled) sawBusy = true;
        const text = status?.textContent || "";
        const success = /تم تجهيز|جاهز للمراجعة|جاهز:/.test(text);
        const failure = /تعذر إنشاء|فشل|تم إلغاء/.test(text);
        if (failure) return resolve(false);
        if (success && (!button?.disabled) && (sawBusy || Date.now() - started > 500)) return resolve(true);
        if (Date.now() - started > timeoutMs) return resolve(false);
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  async function ensureCurrentPrepared() {
    const signature = selectionSignature();
    if (signature && preparedSignature === signature && projectReady()) return true;
    const prepare = qid("qrPrepare");
    if (!prepare || prepare.disabled) return false;

    preparingPreview = true;
    try {
      try {
        sourceAudio?.pause();
        if (state.videoLoaded) sourceVideo?.pause();
      } catch {}
      setStudioStatus("جاري تجهيز الآيات والقارئ المختارين للمعاينة الآن...");
      prepare.click();
      const ok = await waitForPrepareCycle();
      if (ok) preparedSignature = selectionSignature();
      return ok;
    } finally {
      preparingPreview = false;
    }
  }

  async function toggleCurrentPreview(button) {
    if (preparingPreview) return;
    const isPlaying = (!sourceAudio?.paused && !sourceAudio?.ended) || (state.videoLoaded && !sourceVideo?.paused && !sourceVideo?.ended);
    if (isPlaying) {
      sourceAudio?.pause();
      if (state.videoLoaded) sourceVideo?.pause();
      button.textContent = "▶ معاينة الاختيار الحالي";
      return;
    }

    if (!(await ensureCurrentPrepared())) {
      setStudioStatus("تعذر تجهيز الاختيار الحالي. جرّب قارئًا آخر أو أعد المحاولة.", "err");
      return;
    }

    try {
      if (typeof setupAudioGraph === "function") await setupAudioGraph();
      sourceAudio.currentTime = 0;
      if (state.videoLoaded) {
        sourceVideo.currentTime = 0;
        sourceVideo.loop = true;
        await sourceVideo.play().catch(() => {});
      }
      await sourceAudio.play();
      button.textContent = "❚❚ إيقاف المعاينة";
      setStudioStatus("المعاينة تعمل على السورة والآيات والقارئ المختارين الآن ✅", "ok");
    } catch (error) {
      setStudioStatus(`تعذر تشغيل المعاينة: ${error?.message || error}`, "err");
    }
  }

  function replacePreviewButton() {
    const old = qid("qrPlay");
    if (!old || old.dataset.currentPreviewV5 === "1") return;
    const fresh = old.cloneNode(true);
    fresh.dataset.currentPreviewV5 = "1";
    fresh.textContent = "▶ معاينة الاختيار الحالي";
    old.replaceWith(fresh);
    fresh.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleCurrentPreview(fresh);
    }, true);
  }

  function installSelectionFreshness() {
    ["qrSurah", "qrReciter"].forEach(id => qid(id)?.addEventListener("change", markSelectionDirty));
    ["qrFrom", "qrTo"].forEach(id => qid(id)?.addEventListener("input", markSelectionDirty));

    const status = qid("qrStatus");
    if (status) {
      const observer = new MutationObserver(() => {
        if (/تم تجهيز|جاهز للمراجعة|جاهز:/.test(status.textContent || "")) preparedSignature = selectionSignature();
      });
      observer.observe(status, { childList: true, subtree: true, characterData: true });
      if (/تم تجهيز|جاهز للمراجعة|جاهز:/.test(status.textContent || "")) preparedSignature = selectionSignature();
    }

    sourceAudio?.addEventListener("ended", () => {
      const play = qid("qrPlay");
      if (play) play.textContent = "▶ معاينة الاختيار الحالي";
      if (state.videoLoaded) sourceVideo?.pause();
    });
  }

  function injectHintStyles() {
    if (qid("quranUxV5Styles")) return;
    const style = document.createElement("style");
    style.id = "quranUxV5Styles";
    style.textContent = `
      .quran-readable-note{font-size:8px;color:#8da0b6;line-height:1.7;margin-top:6px}
    `;
    document.head.appendChild(style);
    const fontField = qid("qrFont")?.closest(".qr-field");
    if (fontField && !qid("quranReadableNote")) {
      const note = document.createElement("div");
      note.id = "quranReadableNote";
      note.className = "quran-readable-note";
      note.textContent = "الآيات الطويلة تُقسّم تلقائيًا إلى عدة أسطر مع الحفاظ على حجم خط مقروء.";
      fontField.insertAdjacentElement("afterend", note);
    }
  }

  function install() {
    installed = true;
    installQuranWrapping();
    injectHintStyles();
    replacePreviewButton();
    installSelectionFreshness();
    setTimeout(replacePreviewButton, 500);
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", wait);
  else wait();
})();
