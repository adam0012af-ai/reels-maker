"use strict";

(() => {
  const MOBILE_BREAKPOINT = 900;
  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
  const isEditable = el => !!el && (
    el.matches?.('input:not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable="true"]') ||
    el.isContentEditable
  );

  let editing = false;
  let currentTool = null;
  let previewObjectUrl = null;
  let originalResponsiveSync = null;

  const activeIsEditable = () => isEditable(document.activeElement);

  function injectMobileV3Styles() {
    if (document.getElementById("mobileUiV3Styles")) return;
    const style = document.createElement("style");
    style.id = "mobileUiV3Styles";
    style.textContent = `
      @media (max-width: 900px) {
        body { overscroll-behavior: none; }
        .workspace { height: 100dvh !important; }
        .topbar {
          min-height: 58px !important;
          height: 58px !important;
          padding: 0 12px !important;
          background: rgba(8,10,15,.92) !important;
          backdrop-filter: blur(18px) !important;
        }
        .topbar .project b { font-size: 10px !important; }
        .topbar .project span { font-size: 7px !important; }
        .topbar .btn.export {
          min-height: 38px !important;
          border-radius: 12px !important;
          padding: 8px 12px !important;
        }
        .stage-wrap { padding: 8px 8px 3px !important; }
        .stage {
          height: min(calc(100dvh - 188px), 68vh) !important;
          max-width: calc(100vw - 18px) !important;
          border-radius: 18px !important;
          box-shadow: 0 16px 48px rgba(0,0,0,.46) !important;
        }
        .transport {
          height: 54px !important;
          min-height: 54px !important;
          padding: 0 10px !important;
          gap: 7px !important;
          background: rgba(11,14,20,.96) !important;
        }
        .transport .round { width: 38px !important; height: 38px !important; }

        .mobile-tabs {
          position: relative;
          z-index: 70;
          display: grid !important;
          grid-template-columns: repeat(6,1fr) !important;
          height: calc(64px + env(safe-area-inset-bottom)) !important;
          min-height: calc(64px + env(safe-area-inset-bottom)) !important;
          padding: 5px 4px env(safe-area-inset-bottom) !important;
          background: rgba(9,12,18,.98) !important;
          border-top: 1px solid rgba(255,255,255,.08) !important;
          box-shadow: 0 -8px 24px rgba(0,0,0,.28) !important;
        }
        .mobile-tabs .tab {
          min-height: 48px !important;
          border-radius: 14px !important;
          padding: 5px 1px !important;
          gap: 2px !important;
          font-size: 15px !important;
        }
        .mobile-tabs .tab span { font-size: 8px !important; }
        .mobile-tabs .tab.active {
          background: linear-gradient(180deg,rgba(125,92,255,.22),rgba(125,92,255,.10)) !important;
          box-shadow: inset 0 0 0 1px rgba(125,92,255,.18) !important;
        }

        #mobileSheetBackdrop {
          position: fixed;
          z-index: 44;
          inset: 0 0 calc(64px + env(safe-area-inset-bottom)) 0;
          background: rgba(0,0,0,.38);
          opacity: 0;
          visibility: hidden;
          transition: opacity .18s ease, visibility .18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        #mobileSheetBackdrop.visible { opacity: 1; visibility: visible; }

        .mobile-sheet {
          display: block !important;
          position: fixed !important;
          z-index: 50 !important;
          left: 8px !important;
          right: 8px !important;
          bottom: calc(64px + env(safe-area-inset-bottom)) !important;
          max-height: 50dvh !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,.10) !important;
          border-bottom: 0 !important;
          border-radius: 22px 22px 0 0 !important;
          background: linear-gradient(180deg,#111520 0%,#0d1017 100%) !important;
          box-shadow: 0 -18px 50px rgba(0,0,0,.52) !important;
          transform: translateY(calc(100% + 18px)) !important;
          transition: transform .22s cubic-bezier(.2,.72,.2,1), max-height .2s ease !important;
          direction: rtl !important;
        }
        .mobile-sheet.open { transform: translateY(0) !important; }
        .mobile-sheet[data-size="expanded"] { max-height: 76dvh !important; }
        .sheet-handle { display: none !important; }

        .mobile-sheet-header {
          position: sticky;
          top: 0;
          z-index: 8;
          height: 52px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px 7px;
          background: rgba(15,19,28,.97);
          border-bottom: 1px solid rgba(255,255,255,.07);
          backdrop-filter: blur(14px);
        }
        .mobile-sheet-title {
          flex: 1;
          min-width: 0;
          font-weight: 800;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-sheet-action {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 12px;
          background: rgba(255,255,255,.055);
          color: #eef0f8;
          display: grid;
          place-items: center;
          font-size: 15px;
          -webkit-tap-highlight-color: transparent;
        }
        .mobile-sheet-action:active { transform: scale(.95); }

        .mobile-sheet .panel {
          display: block !important;
          max-height: calc(50dvh - 52px) !important;
          padding: 12px 13px 18px !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          scrollbar-width: thin;
        }
        .mobile-sheet[data-size="expanded"] .panel { max-height: calc(76dvh - 52px) !important; }
        .mobile-sheet .panel-title { margin-bottom: 10px !important; }
        .mobile-sheet .panel-title h2 { display: none !important; }
        .mobile-sheet .panel-title p {
          margin: 0 !important;
          font-size: 9px !important;
          line-height: 1.55 !important;
          color: #8992a6 !important;
        }

        .mobile-sheet .field { margin-bottom: 10px !important; }
        .mobile-sheet .field > span { font-size: 10px !important; margin-bottom: 5px !important; }
        .mobile-sheet input[type=text],
        .mobile-sheet input[type=password],
        .mobile-sheet input[type=search],
        .mobile-sheet textarea,
        .mobile-sheet select,
        .mobile-sheet .inline > input {
          min-height: 46px !important;
          font-size: 13px !important;
          border-radius: 12px !important;
          padding: 10px 12px !important;
        }
        .mobile-sheet textarea { min-height: 84px !important; max-height: 150px !important; }
        .mobile-sheet .btn {
          min-height: 44px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          padding: 9px 12px !important;
        }
        .mobile-sheet .inline { gap: 7px !important; }
        .mobile-sheet .inline > * { min-width: 0 !important; }

        .mobile-sheet .upload {
          min-height: 54px !important;
          padding: 8px 10px !important;
          display: grid !important;
          grid-template-columns: 34px 1fr !important;
          grid-template-rows: auto auto !important;
          column-gap: 9px !important;
          row-gap: 0 !important;
          justify-items: stretch !important;
          align-items: center !important;
          text-align: right !important;
          border-radius: 13px !important;
        }
        .mobile-sheet .upload > span {
          grid-row: 1 / 3 !important;
          width: 34px !important;
          height: 34px !important;
          border-radius: 10px !important;
        }
        .mobile-sheet .upload b { font-size: 11px !important; }
        .mobile-sheet .upload small { font-size: 8px !important; margin: 0 !important; }

        .mobile-sheet .ai-box,
        .mobile-sheet .tts-box,
        .mobile-sheet .sfx-box,
        .mobile-sheet .notice {
          border-radius: 14px !important;
          padding: 10px !important;
          margin-bottom: 10px !important;
        }
        .mobile-sheet .source-switch,
        .mobile-sheet .chips { gap: 6px !important; margin-bottom: 10px !important; }
        .mobile-sheet .source-switch button,
        .mobile-sheet .chips button,
        .mobile-sheet .sfx-grid button { min-height: 38px !important; font-size: 9px !important; }

        .mobile-sheet .results,
        .mobile-sheet .sticker-grid { grid-template-columns: repeat(3,1fr) !important; gap: 7px !important; }
        .mobile-sheet .result-card { aspect-ratio: 9 / 12 !important; border-radius: 11px !important; }
        .mobile-sheet .sticker-card { border-radius: 11px !important; }
        .mobile-sheet .grid2 { gap: 8px !important; }
        .mobile-sheet .sfx-grid { grid-template-columns: repeat(2,1fr) !important; gap: 7px !important; }

        #geminiPreviewPlayer {
          width: 100%;
          height: 42px;
          margin-top: 8px;
          border-radius: 11px;
        }

        html.keyboard-editing .mobile-tabs { display: none !important; }
        html.keyboard-editing .mobile-sheet,
        html.keyboard-editing .mobile-sheet[data-size="expanded"] {
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          max-height: 76dvh !important;
          border-radius: 18px 18px 0 0 !important;
        }
        html.keyboard-editing .mobile-sheet .panel,
        html.keyboard-editing .mobile-sheet[data-size="expanded"] .panel {
          max-height: calc(76dvh - 52px) !important;
        }
      }

      @media (max-width: 520px) {
        .mobile-sheet { left: 5px !important; right: 5px !important; max-height: 48dvh !important; }
        .mobile-sheet .panel { max-height: calc(48dvh - 52px) !important; padding: 10px 11px 16px !important; }
        .mobile-sheet[data-size="expanded"] { max-height: 74dvh !important; }
        .mobile-sheet[data-size="expanded"] .panel { max-height: calc(74dvh - 52px) !important; }
        .mobile-sheet .panel-title p { display: none !important; }
        .mobile-sheet .results,
        .mobile-sheet .sticker-grid { grid-template-columns: repeat(2,1fr) !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function mobileElements() {
    return {
      sheet: document.getElementById("mobileSheet"),
      host: document.getElementById("mobilePanelHost"),
      tabs: document.querySelector(".mobile-tabs")
    };
  }

  function toolTitle(name) {
    return ({
      video: "الفيديو والمصادر",
      stickers: "الملصقات و GIF",
      text: "النصوص والذكاء الاصطناعي",
      audio: "الصوت والتعليق",
      layers: "الطبقات",
      settings: "الإعدادات والتصدير"
    })[name] || "أدوات التحرير";
  }

  function setBackdrop(visible) {
    const backdrop = document.getElementById("mobileSheetBackdrop");
    backdrop?.classList.toggle("visible", !!visible);
  }

  function updateSheetHeader(name) {
    const title = document.querySelector(".mobile-sheet-title");
    if (title) title.textContent = toolTitle(name);
  }

  function closeMobileSheet({ blur = true } = {}) {
    const { sheet } = mobileElements();
    if (!sheet) return;
    if (blur && activeIsEditable()) {
      try { document.activeElement.blur(); } catch {}
    }
    sheet.classList.remove("open");
    sheet.dataset.size = "compact";
    setBackdrop(false);
    document.documentElement.classList.remove("keyboard-editing");
    editing = false;
  }

  function normalizeOpenSheet(name) {
    const { sheet } = mobileElements();
    if (!sheet || !isMobile()) return;
    currentTool = name || document.querySelector(".mobile-tabs .tab.active")?.dataset.tab || currentTool || "video";
    updateSheetHeader(currentTool);
    sheet.dataset.size = "compact";
    sheet.classList.add("open");
    setBackdrop(true);
    const panel = document.getElementById(`panel-${currentTool}`);
    if (panel) panel.scrollTop = 0;
  }

  function installMobileShell() {
    const { sheet, tabs } = mobileElements();
    if (!sheet || !tabs || sheet.dataset.mobileV3 === "1") return;
    sheet.dataset.mobileV3 = "1";
    sheet.dataset.size = "compact";

    let backdrop = document.getElementById("mobileSheetBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "mobileSheetBackdrop";
      backdrop.setAttribute("aria-hidden", "true");
      document.body.appendChild(backdrop);
    }
    backdrop.addEventListener("click", () => closeMobileSheet());

    const header = document.createElement("div");
    header.className = "mobile-sheet-header";
    header.innerHTML = `
      <div class="mobile-sheet-title">أدوات التحرير</div>
      <button type="button" class="mobile-sheet-action" id="mobileSheetExpandBtn" aria-label="تكبير أو تصغير القائمة">⤢</button>
      <button type="button" class="mobile-sheet-action" id="mobileSheetCloseBtn" aria-label="إغلاق القائمة">×</button>
    `;
    sheet.insertBefore(header, sheet.firstChild);

    document.getElementById("mobileSheetCloseBtn")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      closeMobileSheet();
    });

    document.getElementById("mobileSheetExpandBtn")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const expanded = sheet.dataset.size === "expanded";
      sheet.dataset.size = expanded ? "compact" : "expanded";
      event.currentTarget.textContent = expanded ? "⤢" : "↙";
    });

    tabs.addEventListener("click", event => {
      const tab = event.target.closest?.(".tab[data-tab]");
      if (!tab || !isMobile()) return;
      const name = tab.dataset.tab;
      if (sheet.classList.contains("open") && currentTool === name) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMobileSheet();
        return;
      }
      currentTool = name;
      requestAnimationFrame(() => normalizeOpenSheet(name));
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && sheet.classList.contains("open")) closeMobileSheet();
    });

    setTimeout(() => {
      currentTool = document.querySelector(".mobile-tabs .tab.active")?.dataset.tab || "video";
      closeMobileSheet({ blur: false });
    }, 0);
  }

  function protectResponsiveLayout() {
    if (typeof window.syncResponsivePanels !== "function") return;
    originalResponsiveSync = window.syncResponsivePanels;
    window.removeEventListener("resize", originalResponsiveSync);

    let wasMobile = isMobile();
    window.addEventListener("resize", () => {
      const nowMobile = isMobile();
      if (editing || activeIsEditable()) return;
      if (nowMobile !== wasMobile) {
        wasMobile = nowMobile;
        if (!nowMobile) {
          closeMobileSheet({ blur: false });
          originalResponsiveSync();
        } else {
          originalResponsiveSync();
          setTimeout(() => closeMobileSheet({ blur: false }), 0);
        }
      }
    }, { passive: true });

    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        if (isMobile()) closeMobileSheet({ blur: false });
        else originalResponsiveSync();
      }, 250);
    }, { passive: true });
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
    if (box.dataset.geminiVoiceFixed === "3") return true;
    box.dataset.geminiVoiceFixed = "3";

    const savedVoice = localStorage.getItem("reels-gemini-voice");
    if (savedVoice && Array.from(select.options).some(o => o.value === savedVoice)) select.value = savedVoice;
    const savedStyle = localStorage.getItem("reels-gemini-style");
    if (savedStyle && Array.from(styleSelect.options).some(o => o.value === savedStyle)) styleSelect.value = savedStyle;

    const generateBtn = oldGenerate.cloneNode(true);
    const previewBtn = oldPreview.cloneNode(true);
    oldGenerate.replaceWith(generateBtn);
    oldPreview.replaceWith(previewBtn);
    previewBtn.textContent = "▶ معاينة الصوت";
    generateBtn.textContent = "✦ إضافة للمشروع";

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
      setTtsStatus(`الصوت المختار: ${label}`);
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
      const voice = selectedGeminiVoice();
      const style = selectedGeminiStyle();
      const label = select.options[select.selectedIndex]?.textContent || voice;
      previewBtn.disabled = true;
      generateBtn.disabled = true;
      setTtsStatus(`جاري إنشاء معاينة بصوت ${label}...`);
      try {
        const blob = await fetchGeminiVoice(fullText.slice(0, 220), voice, style);
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
        setTtsStatus(`تم إنشاء ${label} ✅ وإضافته للمشروع.`);
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

  function installKeyboardProtection() {
    document.addEventListener("focusin", event => {
      if (!isEditable(event.target)) return;
      editing = true;
      document.documentElement.classList.add("keyboard-editing");
      const { sheet } = mobileElements();
      if (isMobile() && sheet?.classList.contains("open")) sheet.dataset.size = "expanded";
      setTimeout(() => {
        if (document.activeElement !== event.target) return;
        try { event.target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" }); } catch {}
      }, 220);
    }, true);

    document.addEventListener("focusout", event => {
      if (!isEditable(event.target)) return;
      setTimeout(() => {
        editing = activeIsEditable();
        if (!editing) {
          document.documentElement.classList.remove("keyboard-editing");
          const { sheet } = mobileElements();
          if (sheet) sheet.dataset.size = "compact";
        }
      }, 180);
    }, true);
  }

  window.addEventListener("DOMContentLoaded", () => {
    injectMobileV3Styles();
    installMobileShell();
    protectResponsiveLayout();
    installKeyboardProtection();

    setTimeout(enhanceGeminiTts, 0);
    setTimeout(enhanceGeminiTts, 250);
    setTimeout(enhanceGeminiTts, 900);

    const observer = new MutationObserver(() => {
      if (enhanceGeminiTts()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
