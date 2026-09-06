"use strict";

(() => {
  const isEditable = el => !!el && (
    el.matches?.('input:not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable="true"]') ||
    el.isContentEditable
  );

  let editing = false;
  let lastLayoutWidth = window.innerWidth;
  let lastOrientation = screen.orientation?.type || (window.innerWidth > window.innerHeight ? "landscape" : "portrait");
  let previewObjectUrl = null;

  function activeIsEditable() {
    return isEditable(document.activeElement);
  }

  function keepFocusedFieldVisible(el) {
    if (!isEditable(el)) return;
    setTimeout(() => {
      if (document.activeElement !== el) return;
      try {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      } catch {}
    }, 220);
  }

  function installMobileUiOverrides() {
    if (document.getElementById("mobileUiCompactFix")) return;
    const style = document.createElement("style");
    style.id = "mobileUiCompactFix";
    style.textContent = `
      @media (max-width: 900px) {
        .mobile-sheet {
          max-height: 42dvh !important;
          border-radius: 20px 20px 0 0 !important;
          transition: transform .22s ease, max-height .2s ease !important;
        }
        .mobile-sheet .panel {
          max-height: calc(42dvh - 18px) !important;
          padding: 10px 14px 16px !important;
          overscroll-behavior: contain;
          scrollbar-width: thin;
        }
        .sheet-handle {
          width: 56px !important;
          height: 6px !important;
          margin: 8px auto 2px !important;
          touch-action: none;
          cursor: grab;
        }
        #mobileSheetCloseBtn {
          position: absolute;
          top: 7px;
          right: 12px;
          z-index: 4;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 50%;
          background: rgba(255,255,255,.06);
          color: #d8dbea;
          font-size: 15px;
          line-height: 1;
          display: grid;
          place-items: center;
        }
        .mobile-sheet .panel-title h2 { font-size: 15px !important; }
        .mobile-sheet .panel-title p {
          font-size: 9px !important;
          margin: 2px 0 9px !important;
          line-height: 1.55 !important;
        }
        #panel-audio .upload {
          min-height: 58px !important;
          padding: 7px 10px !important;
          gap: 2px !important;
        }
        #panel-audio .upload > span {
          width: 30px !important;
          height: 30px !important;
        }
        #panel-audio .tts-box,
        #panel-audio .sfx-box {
          padding: 9px !important;
          margin-bottom: 8px !important;
          border-radius: 12px !important;
        }
        #panel-audio .tts-box textarea {
          min-height: 76px !important;
          max-height: 105px !important;
          margin-bottom: 7px !important;
        }
        #panel-audio .field { margin-bottom: 8px !important; }
        #panel-audio .field > span { margin-bottom: 4px !important; }
        #panel-audio select { min-height: 42px; }
        #panel-audio .inline { align-items: stretch !important; }
        #panel-audio .inline .btn { flex: 1 1 0; white-space: normal; }
        #geminiPreviewPlayer {
          width: 100%;
          height: 40px;
          margin-top: 7px;
          border-radius: 10px;
        }
        html.keyboard-editing .mobile-tabs { display: none !important; }
        html.keyboard-editing .mobile-sheet {
          bottom: 0 !important;
          max-height: 68dvh !important;
        }
        html.keyboard-editing .mobile-sheet .panel {
          max-height: calc(68dvh - 18px) !important;
        }
      }
      @media (max-width: 520px) {
        .mobile-sheet { max-height: 40dvh !important; }
        .mobile-sheet .panel { max-height: calc(40dvh - 18px) !important; }
        #panel-audio .panel-title p { display: none; }
        #panel-audio .upload small { display: none; }
        #panel-audio .upload { min-height: 54px !important; }
        html.keyboard-editing .mobile-sheet { max-height: 70dvh !important; }
        html.keyboard-editing .mobile-sheet .panel { max-height: calc(70dvh - 18px) !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function installMobileSheetControls() {
    const sheet = document.getElementById("mobileSheet");
    const handle = sheet?.querySelector(".sheet-handle");
    if (!sheet || !handle || sheet.dataset.dismissReady === "1") return;
    sheet.dataset.dismissReady = "1";

    const closeSheet = ({ blur = true } = {}) => {
      if (blur && isEditable(document.activeElement)) {
        try { document.activeElement.blur(); } catch {}
      }
      sheet.classList.remove("open");
      sheet.style.transform = "";
      sheet.style.transition = "";
      document.documentElement.classList.remove("keyboard-editing");
      editing = false;
    };

    const closeBtn = document.createElement("button");
    closeBtn.id = "mobileSheetCloseBtn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "إغلاق لوحة الأدوات");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      closeSheet();
    });
    sheet.appendChild(closeBtn);

    // Tap the currently selected bottom tab again to collapse its panel.
    document.addEventListener("click", event => {
      if (window.innerWidth > 900) return;
      const tab = event.target.closest?.(".mobile-tabs .tab");
      if (!tab) return;
      if (tab.classList.contains("active") && sheet.classList.contains("open")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSheet();
      }
    }, true);

    // Tap anywhere above/outside the drawer to hide it, like a native bottom sheet.
    document.addEventListener("pointerdown", event => {
      if (window.innerWidth > 900 || !sheet.classList.contains("open")) return;
      if (sheet.contains(event.target) || event.target.closest?.(".mobile-tabs")) return;
      closeSheet({ blur: false });
    }, true);

    let startY = 0;
    let dragY = 0;
    let dragging = false;

    handle.addEventListener("pointerdown", event => {
      if (window.innerWidth > 900) return;
      dragging = true;
      startY = event.clientY;
      dragY = 0;
      sheet.style.transition = "none";
      try { handle.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    });

    handle.addEventListener("pointermove", event => {
      if (!dragging) return;
      dragY = Math.max(0, event.clientY - startY);
      sheet.style.transform = `translateY(${Math.min(dragY, 220)}px)`;
      event.preventDefault();
    });

    const finishDrag = event => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(event.pointerId); } catch {}
      const tap = dragY < 8;
      const shouldClose = dragY > 55 || tap;
      sheet.style.transition = "";
      if (shouldClose) {
        closeSheet();
      } else {
        sheet.style.transform = "";
      }
    };

    handle.addEventListener("pointerup", finishDrag);
    handle.addEventListener("pointercancel", finishDrag);
  }

  function selectedGeminiVoice() {
    return document.getElementById("geminiVoice")?.value || "Kore";
  }

  function selectedGeminiStyle() {
    return document.getElementById("geminiStyle")?.value || "egyptian";
  }

  function ttsText() {
    const direct = document.getElementById("ttsText")?.value?.trim();
    if (direct) return direct;
    return document.getElementById("textContent")?.value?.trim() || "";
  }

  function setTtsStatus(message) {
    const status = document.getElementById("ttsStatus");
    if (status) status.textContent = message;
  }

  async function fetchGeminiVoice(text, voice, style) {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voice, style, voiceId: voice })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return response.blob();
  }

  function ensurePreviewPlayer(box) {
    let player = document.getElementById("geminiPreviewPlayer");
    if (player) return player;
    player = document.createElement("audio");
    player.id = "geminiPreviewPlayer";
    player.controls = true;
    player.preload = "none";
    player.hidden = true;
    const status = document.getElementById("ttsStatus");
    if (status?.parentElement === box) status.insertAdjacentElement("afterend", player);
    else box.appendChild(player);
    return player;
  }

  function enhanceGeminiTts() {
    const box = document.querySelector(".tts-box");
    const select = document.getElementById("geminiVoice");
    const styleSelect = document.getElementById("geminiStyle");
    const oldGenerate = document.getElementById("ttsGenerateBtn");
    const oldPreview = document.getElementById("ttsPreviewBtn");
    if (!box || !select || !styleSelect || !oldGenerate || !oldPreview) return false;
    if (box.dataset.geminiVoiceFixed === "1") return true;

    box.dataset.geminiVoiceFixed = "1";

    const savedVoice = localStorage.getItem("reels-gemini-voice");
    if (savedVoice && Array.from(select.options).some(o => o.value === savedVoice)) select.value = savedVoice;
    const savedStyle = localStorage.getItem("reels-gemini-style");
    if (savedStyle && Array.from(styleSelect.options).some(o => o.value === savedStyle)) styleSelect.value = savedStyle;

    const generateBtn = oldGenerate.cloneNode(true);
    const previewBtn = oldPreview.cloneNode(true);
    oldGenerate.replaceWith(generateBtn);
    oldPreview.replaceWith(previewBtn);

    previewBtn.textContent = "▶ معاينة الصوت المختار";
    generateBtn.textContent = "✦ إضافة الصوت للمشروع";

    const player = ensurePreviewPlayer(box);

    const announceVoice = () => {
      localStorage.setItem("reels-gemini-voice", select.value);
      const label = select.options[select.selectedIndex]?.textContent || select.value;
      setTtsStatus(`الصوت المختار الآن: ${label}`);
    };

    select.addEventListener("change", announceVoice);
    styleSelect.addEventListener("change", () => {
      localStorage.setItem("reels-gemini-style", styleSelect.value);
      const voiceLabel = select.options[select.selectedIndex]?.textContent || select.value;
      setTtsStatus(`الصوت: ${voiceLabel} — تم تغيير أسلوب الإلقاء.`);
    });

    previewBtn.addEventListener("click", async event => {
      event.preventDefault();
      const text = ttsText();
      if (!text) return setTtsStatus("اكتب نص التعليق الصوتي أولًا.");
      const voice = selectedGeminiVoice();
      const style = selectedGeminiStyle();
      const label = select.options[select.selectedIndex]?.textContent || voice;
      previewBtn.disabled = true;
      generateBtn.disabled = true;
      setTtsStatus(`جاري إنشاء معاينة بصوت ${label}...`);
      try {
        const blob = await fetchGeminiVoice(text, voice, style);
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = URL.createObjectURL(blob);
        player.src = previewObjectUrl;
        player.hidden = false;
        player.currentTime = 0;
        try { await player.play(); } catch {}
        setTtsStatus(`المعاينة الحالية بصوت ${label} ✅`);
      } catch (error) {
        setTtsStatus(`Gemini TTS: ${String(error.message || error).slice(0, 420)}`);
      } finally {
        previewBtn.disabled = false;
        generateBtn.disabled = false;
      }
    });

    generateBtn.addEventListener("click", async event => {
      event.preventDefault();
      const text = ttsText();
      if (!text) return setTtsStatus("اكتب نص التعليق الصوتي أولًا.");
      const voice = selectedGeminiVoice();
      const style = selectedGeminiStyle();
      const label = select.options[select.selectedIndex]?.textContent || voice;
      previewBtn.disabled = true;
      generateBtn.disabled = true;
      setTtsStatus(`جاري إنشاء التعليق بصوت ${label}...`);
      try {
        const blob = await fetchGeminiVoice(text, voice, style);
        if (typeof window.loadAudioBlob === "function") {
          window.loadAudioBlob(blob, `Gemini ${voice}.wav`);
        } else if (typeof loadAudioBlob === "function") {
          loadAudioBlob(blob, `Gemini ${voice}.wav`);
        }
        setTtsStatus(`تم إنشاء الصوت ${label} ✅ وإضافته للمشروع.`);
      } catch (error) {
        setTtsStatus(`Gemini TTS: ${String(error.message || error).slice(0, 420)}`);
      } finally {
        previewBtn.disabled = false;
        generateBtn.disabled = false;
      }
    });

    announceVoice();
    return true;
  }

  document.addEventListener("focusin", e => {
    if (!isEditable(e.target)) return;
    editing = true;
    document.documentElement.classList.add("keyboard-editing");
    keepFocusedFieldVisible(e.target);
  }, true);

  document.addEventListener("focusout", e => {
    if (!isEditable(e.target)) return;
    setTimeout(() => {
      editing = activeIsEditable();
      if (!editing) document.documentElement.classList.remove("keyboard-editing");
    }, 150);
  }, true);

  window.addEventListener("DOMContentLoaded", () => {
    installMobileUiOverrides();
    installMobileSheetControls();

    if (typeof window.syncResponsivePanels === "function") {
      const originalSync = window.syncResponsivePanels;
      window.removeEventListener("resize", originalSync);

      const safeResponsiveSync = () => {
        const width = window.innerWidth;
        const orientation = screen.orientation?.type || (width > window.innerHeight ? "landscape" : "portrait");
        const widthDelta = Math.abs(width - lastLayoutWidth);
        const breakpointChanged = (width > 900) !== (lastLayoutWidth > 900);
        const orientationChanged = orientation !== lastOrientation;
        if (editing || activeIsEditable()) return;
        if (breakpointChanged || orientationChanged || widthDelta > 120) {
          lastLayoutWidth = width;
          lastOrientation = orientation;
          originalSync();
        }
      };

      window.addEventListener("resize", safeResponsiveSync, { passive: true });
      window.addEventListener("orientationchange", () => {
        setTimeout(() => {
          if (editing || activeIsEditable()) return;
          lastLayoutWidth = window.innerWidth;
          lastOrientation = screen.orientation?.type || (window.innerWidth > window.innerHeight ? "landscape" : "portrait");
          originalSync();
        }, 300);
      }, { passive: true });
    }

    setTimeout(enhanceGeminiTts, 0);
    setTimeout(enhanceGeminiTts, 250);
    setTimeout(enhanceGeminiTts, 900);

    const observer = new MutationObserver(() => {
      if (enhanceGeminiTts()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();