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

  const activeIsEditable = () => isEditable(document.activeElement);

  function keepFocusedFieldVisible(el) {
    if (!isEditable(el)) return;
    setTimeout(() => {
      if (document.activeElement !== el) return;
      try { el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" }); } catch {}
    }, 220);
  }

  function installMobileUiOverrides() {
    if (document.getElementById("mobileUiCompactFix")) return;
    const style = document.createElement("style");
    style.id = "mobileUiCompactFix";
    style.textContent = `
      @media (max-width: 900px) {
        .mobile-sheet {
          max-height: 38dvh !important;
          border-radius: 20px 20px 0 0 !important;
          transition: transform .22s ease, max-height .22s ease !important;
          will-change: transform, max-height;
        }
        .mobile-sheet.expanded { max-height: 68dvh !important; }
        .mobile-sheet .panel {
          max-height: calc(38dvh - 18px) !important;
          padding: 10px 14px calc(16px + env(safe-area-inset-bottom)) !important;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .mobile-sheet.expanded .panel { max-height: calc(68dvh - 18px) !important; }
        .sheet-handle {
          width: 58px !important;
          height: 6px !important;
          margin: 8px auto 2px !important;
          touch-action: none;
          cursor: grab;
          position: relative;
          z-index: 5;
        }
        .sheet-handle:after {
          content: '';
          position: absolute;
          inset: -10px -26px;
        }
        #mobileSheetCloseBtn {
          position: absolute;
          top: 7px;
          right: 12px;
          z-index: 6;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 50%;
          background: rgba(255,255,255,.07);
          color: #e5e7ef;
          font-size: 18px;
          line-height: 1;
          display: grid;
          place-items: center;
          -webkit-tap-highlight-color: transparent;
        }
        #mobileSheetCloseBtn:active { transform: scale(.94); }
        .mobile-sheet .panel-title h2 { font-size: 15px !important; padding-inline-end: 38px; }
        .mobile-sheet .panel-title p {
          font-size: 9px !important;
          margin: 2px 0 9px !important;
          line-height: 1.55 !important;
        }
        #panel-audio .upload {
          min-height: 54px !important;
          padding: 7px 10px !important;
          gap: 2px !important;
        }
        #panel-audio .upload > span { width: 30px !important; height: 30px !important; }
        #panel-audio .tts-box,
        #panel-audio .sfx-box {
          padding: 9px !important;
          margin-bottom: 8px !important;
          border-radius: 12px !important;
        }
        #panel-audio .tts-box textarea {
          min-height: 72px !important;
          max-height: 96px !important;
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
        html.keyboard-editing .mobile-sheet,
        html.keyboard-editing .mobile-sheet.expanded {
          bottom: 0 !important;
          max-height: 72dvh !important;
        }
        html.keyboard-editing .mobile-sheet .panel,
        html.keyboard-editing .mobile-sheet.expanded .panel {
          max-height: calc(72dvh - 18px) !important;
        }
      }
      @media (max-width: 520px) {
        .mobile-sheet { max-height: 36dvh !important; }
        .mobile-sheet.expanded { max-height: 66dvh !important; }
        .mobile-sheet .panel { max-height: calc(36dvh - 18px) !important; }
        .mobile-sheet.expanded .panel { max-height: calc(66dvh - 18px) !important; }
        #panel-audio .panel-title p { display: none; }
        #panel-audio .upload small { display: none; }
        #panel-audio .upload { min-height: 50px !important; }
        html.keyboard-editing .mobile-sheet,
        html.keyboard-editing .mobile-sheet.expanded { max-height: 74dvh !important; }
        html.keyboard-editing .mobile-sheet .panel,
        html.keyboard-editing .mobile-sheet.expanded .panel { max-height: calc(74dvh - 18px) !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function installMobileSheetControls() {
    const sheet = document.getElementById("mobileSheet");
    const handle = sheet?.querySelector(".sheet-handle");
    if (!sheet || !handle || sheet.dataset.dismissReady === "2") return;
    sheet.dataset.dismissReady = "2";

    const setExpanded = expanded => {
      sheet.classList.toggle("expanded", !!expanded);
      handle.setAttribute("aria-expanded", expanded ? "true" : "false");
    };

    const closeSheet = ({ blur = true } = {}) => {
      if (blur && isEditable(document.activeElement)) {
        try { document.activeElement.blur(); } catch {}
      }
      sheet.classList.remove("open", "expanded");
      sheet.style.transform = "";
      sheet.style.transition = "";
      document.documentElement.classList.remove("keyboard-editing");
      editing = false;
      handle.setAttribute("aria-expanded", "false");
    };

    const closeBtn = document.getElementById("mobileSheetCloseBtn") || document.createElement("button");
    closeBtn.id = "mobileSheetCloseBtn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "إغلاق لوحة الأدوات");
    closeBtn.textContent = "×";
    if (!closeBtn.parentElement) sheet.appendChild(closeBtn);
    closeBtn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      closeSheet();
    });

    handle.setAttribute("role", "button");
    handle.setAttribute("aria-label", "اسحب لتكبير أو إغلاق لوحة الأدوات");
    handle.setAttribute("aria-expanded", "false");

    document.addEventListener("click", event => {
      if (window.innerWidth > 900) return;
      const tab = event.target.closest?.(".mobile-tabs .tab");
      if (!tab) return;
      const sameTab = tab.classList.contains("active");
      if (sameTab && sheet.classList.contains("open")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSheet();
      } else {
        setExpanded(false);
      }
    }, true);

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
      dragY = event.clientY - startY;
      if (dragY > 0) sheet.style.transform = `translateY(${Math.min(dragY, 220)}px)`;
      event.preventDefault();
    });

    const finishDrag = event => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(event.pointerId); } catch {}
      sheet.style.transition = "";

      if (dragY > 55) {
        closeSheet();
        return;
      }
      if (dragY < -35) {
        sheet.style.transform = "";
        setExpanded(true);
        return;
      }
      if (Math.abs(dragY) < 8) {
        sheet.style.transform = "";
        setExpanded(!sheet.classList.contains("expanded"));
        return;
      }
      sheet.style.transform = "";
    };

    handle.addEventListener("pointerup", finishDrag);
    handle.addEventListener("pointercancel", finishDrag);
  }

  const selectedGeminiVoice = () => document.getElementById("geminiVoice")?.value || "Kore";
  const selectedGeminiStyle = () => document.getElementById("geminiStyle")?.value || "egyptian";

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
      cache: "no-store",
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
    if (box.dataset.geminiVoiceFixed === "2") return true;
    box.dataset.geminiVoiceFixed = "2";

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

    const clearPreview = () => {
      try { player.pause(); } catch {}
      player.removeAttribute("src");
      player.hidden = true;
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
    };

    const announceVoice = () => {
      clearPreview();
      localStorage.setItem("reels-gemini-voice", select.value);
      const label = select.options[select.selectedIndex]?.textContent || select.value;
      setTtsStatus(`الصوت المختار الآن: ${label}`);
    };

    select.addEventListener("change", announceVoice);
    styleSelect.addEventListener("change", () => {
      clearPreview();
      localStorage.setItem("reels-gemini-style", styleSelect.value);
      const label = select.options[select.selectedIndex]?.textContent || select.value;
      setTtsStatus(`الصوت: ${label} — تم تغيير أسلوب الإلقاء.`);
    });

    previewBtn.addEventListener("click", async event => {
      event.preventDefault();
      const fullText = ttsText();
      if (!fullText) return setTtsStatus("اكتب نص التعليق الصوتي أولًا.");
      const text = fullText.slice(0, 220);
      const voice = selectedGeminiVoice();
      const style = selectedGeminiStyle();
      const label = select.options[select.selectedIndex]?.textContent || voice;
      previewBtn.disabled = true;
      generateBtn.disabled = true;
      setTtsStatus(`جاري إنشاء معاينة بصوت ${label}...`);
      try {
        const blob = await fetchGeminiVoice(text, voice, style);
        clearPreview();
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
        if (typeof window.loadAudioBlob === "function") window.loadAudioBlob(blob, `Gemini ${voice}.wav`);
        else if (typeof loadAudioBlob === "function") loadAudioBlob(blob, `Gemini ${voice}.wav`);
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

  window.addEventListener("beforeunload", () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  });
})();
