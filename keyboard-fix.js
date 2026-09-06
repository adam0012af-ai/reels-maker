"use strict";

(() => {
  const isEditable = el => !!el && (
    el.matches?.('input:not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable="true"]') || el.isContentEditable
  );
  let previewObjectUrl = null;

  function ttsText() {
    const direct = document.getElementById("ttsText")?.value?.trim();
    if (direct) return direct;
    return document.getElementById("textContent")?.value?.trim() || "";
  }

  function setStatus(message) {
    const el = document.getElementById("ttsStatus");
    if (el) el.textContent = message;
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

  function clearPreview(player) {
    try { player?.pause(); } catch {}
    if (player) { player.removeAttribute("src"); player.hidden = true; }
    if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); previewObjectUrl = null; }
  }

  function enhanceGemini() {
    const box = document.querySelector(".tts-box");
    const voiceSelect = document.getElementById("geminiVoice");
    const styleSelect = document.getElementById("geminiStyle");
    const oldGenerate = document.getElementById("ttsGenerateBtn");
    const oldPreview = document.getElementById("ttsPreviewBtn");
    if (!box || !voiceSelect || !styleSelect || !oldGenerate || !oldPreview) return false;
    if (box.dataset.geminiV4 === "1") return true;
    box.dataset.geminiV4 = "1";

    const savedVoice = localStorage.getItem("reels-gemini-voice");
    if (savedVoice && [...voiceSelect.options].some(o => o.value === savedVoice)) voiceSelect.value = savedVoice;
    const savedStyle = localStorage.getItem("reels-gemini-style");
    if (savedStyle && [...styleSelect.options].some(o => o.value === savedStyle)) styleSelect.value = savedStyle;

    const previewBtn = oldPreview.cloneNode(true);
    const generateBtn = oldGenerate.cloneNode(true);
    oldPreview.replaceWith(previewBtn);
    oldGenerate.replaceWith(generateBtn);
    previewBtn.textContent = "▶ معاينة الصوت";
    generateBtn.textContent = "✦ إضافة للمشروع";

    let player = document.getElementById("geminiPreviewPlayer");
    if (!player) {
      player = document.createElement("audio");
      player.id = "geminiPreviewPlayer";
      player.controls = true;
      player.preload = "none";
      player.hidden = true;
      player.style.width = "100%";
      player.style.marginTop = "8px";
      box.appendChild(player);
    }

    const label = () => voiceSelect.options[voiceSelect.selectedIndex]?.textContent || voiceSelect.value;
    const announce = () => {
      clearPreview(player);
      localStorage.setItem("reels-gemini-voice", voiceSelect.value);
      setStatus(`الصوت المختار: ${label()}`);
    };

    voiceSelect.addEventListener("change", announce);
    styleSelect.addEventListener("change", () => {
      clearPreview(player);
      localStorage.setItem("reels-gemini-style", styleSelect.value);
      setStatus(`الصوت: ${label()} — تم تغيير أسلوب الإلقاء.`);
    });

    previewBtn.addEventListener("click", async e => {
      e.preventDefault();
      const text = ttsText();
      if (!text) return setStatus("اكتب نص التعليق الصوتي أولًا.");
      previewBtn.disabled = generateBtn.disabled = true;
      setStatus(`جاري إنشاء معاينة بصوت ${label()}...`);
      try {
        const blob = await fetchGeminiVoice(text.slice(0, 220), voiceSelect.value, styleSelect.value);
        clearPreview(player);
        previewObjectUrl = URL.createObjectURL(blob);
        player.src = previewObjectUrl;
        player.hidden = false;
        try { await player.play(); } catch {}
        setStatus(`المعاينة الحالية بصوت ${label()} ✅`);
      } catch (error) {
        setStatus(`Gemini TTS: ${String(error.message || error).slice(0, 420)}`);
      } finally {
        previewBtn.disabled = generateBtn.disabled = false;
      }
    });

    generateBtn.addEventListener("click", async e => {
      e.preventDefault();
      const text = ttsText();
      if (!text) return setStatus("اكتب نص التعليق الصوتي أولًا.");
      previewBtn.disabled = generateBtn.disabled = true;
      setStatus(`جاري إنشاء التعليق بصوت ${label()}...`);
      try {
        const blob = await fetchGeminiVoice(text, voiceSelect.value, styleSelect.value);
        if (typeof window.loadAudioBlob === "function") window.loadAudioBlob(blob, `Gemini ${voiceSelect.value}.wav`);
        setStatus(`تم إنشاء ${label()} وإضافته للمشروع ✅`);
      } catch (error) {
        setStatus(`Gemini TTS: ${String(error.message || error).slice(0, 420)}`);
      } finally {
        previewBtn.disabled = generateBtn.disabled = false;
      }
    });

    announce();
    return true;
  }

  document.addEventListener("focusin", e => {
    if (!isEditable(e.target)) return;
    document.documentElement.classList.add("keyboard-editing");
    setTimeout(() => {
      if (document.activeElement !== e.target) return;
      try { e.target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
    }, 200);
  }, true);

  document.addEventListener("focusout", e => {
    if (!isEditable(e.target)) return;
    setTimeout(() => {
      if (!isEditable(document.activeElement)) document.documentElement.classList.remove("keyboard-editing");
    }, 180);
  }, true);

  window.addEventListener("beforeunload", () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(enhanceGemini, 0);
    setTimeout(enhanceGemini, 300);
    setTimeout(enhanceGemini, 900);
    const mo = new MutationObserver(() => { if (enhanceGemini()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
