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

  function ensureTransparentHomeCss() {
    if (document.getElementById("transparentHomeCss")) return;
    const link = document.createElement("link");
    link.id = "transparentHomeCss";
    link.rel = "stylesheet";
    link.href = "home-transparent-v1.css?v=1";
    document.head.appendChild(link);
  }

  function openWorkingTool(tool) {
    hideTransparentHome();
    if (tool === "quran") {
      const clickLauncher = (tries = 0) => {
        const launch = document.getElementById("quranStudioLaunch");
        if (launch) return launch.click();
        if (tries < 30) return setTimeout(() => clickLauncher(tries + 1), 100);
      };
      clickLauncher();
      return;
    }
    const tab = document.querySelector(`.tab[data-tab="${tool}"]`);
    if (tab) tab.click();
    if (window.innerWidth <= 900) {
      setTimeout(() => document.getElementById(`panel-${tool}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 120);
    }
  }

  function showTransparentHome() {
    const home = document.getElementById("transparentHome");
    const back = document.getElementById("transparentHomeBack");
    if (!home) return;
    home.classList.add("open");
    home.setAttribute("aria-hidden", "false");
    document.body.classList.add("th-home-open");
    if (back) back.hidden = true;
  }

  function hideTransparentHome() {
    const home = document.getElementById("transparentHome");
    const back = document.getElementById("transparentHomeBack");
    if (!home) return;
    home.classList.remove("open");
    home.setAttribute("aria-hidden", "true");
    document.body.classList.remove("th-home-open");
    if (back) back.hidden = false;
  }

  function buildTransparentHome() {
    if (document.getElementById("transparentHome")) return;
    ensureTransparentHomeCss();

    const home = document.createElement("section");
    home.id = "transparentHome";
    home.className = "open";
    home.setAttribute("aria-label", "الواجهة الرئيسية");
    home.setAttribute("aria-hidden", "false");
    home.innerHTML = `
      <div class="th-shell">
        <header class="th-topbar">
          <div class="th-brand">
            <div class="th-logo">R</div>
            <div class="th-brand-copy"><b>Reels Maker AI</b><span>Creator Workspace • Transparent Edition</span></div>
          </div>
          <div class="th-top-actions">
            <div class="th-pill"><i></i><span>كل الأدوات الأساسية متصلة بالمحرر</span> READY</div>
            <button class="th-main-btn" type="button" data-home-tool="video">فتح المحرر</button>
          </div>
        </header>

        <div class="th-hero">
          <section class="th-hero-main">
            <span class="th-eyebrow">✦ مساحة عمل فعلية — مش واجهة ثابتة</span>
            <h1>ابدأ مشروعك من واجهة<br>شفافة ومرتبة.</h1>
            <p>اختر الأداة التي تريدها، وستدخل مباشرة على الأداة الحقيقية داخل المحرر القديم المستقر. لم يتم تغيير وظائف الفيديو أو الصوت أو النصوص أو التصدير.</p>
            <div class="th-hero-actions">
              <button class="th-main-btn primary" type="button" data-home-tool="quran">☪ إنشاء ريل قرآن</button>
              <button class="th-main-btn" type="button" data-home-tool="video">🎬 مشروع فيديو جديد</button>
              <button class="th-main-btn" type="button" data-home-tool="audio">♫ تعليق صوتي Gemini</button>
            </div>
          </section>

          <aside class="th-quick">
            <div class="th-quick-head"><b>حالة المنصة</b><span>الواجهة الجديدة فوق المحرر الشغال فقط</span></div>
            <div class="th-mini-stats">
              <div class="th-mini-stat"><strong>114</strong><span>سورة في استوديو القرآن</span></div>
              <div class="th-mini-stat"><strong>4K</strong><span>أقصى جودة تصدير</span></div>
              <div class="th-mini-stat"><strong>30</strong><span>صوت Gemini</span></div>
              <div class="th-mini-stat"><strong>6</strong><span>أقسام تحرير أساسية</span></div>
            </div>
            <div class="th-ready">✓ أي بطاقة بالأسفل تفتح أداة حقيقية داخل المشروع، وليس صفحة شكل فقط.</div>
          </aside>
        </div>

        <section class="th-section">
          <div class="th-section-head"><div><h2>أدوات صناعة المحتوى</h2><p>ابدأ من القسم المطلوب ثم كمل شغلك داخل نفس المشروع.</p></div><span>اختر أداة للبدء</span></div>
          <div class="th-grid">
            <button class="th-card" data-tone="green" data-home-tool="quran" type="button">
              <div><div class="th-card-top"><span class="th-icon">☪</span><span class="th-tag">QURAN</span></div><h3>استوديو ريلز القرآن</h3><p>السورة والآيات والقارئ والخلفية والتصميم والمزامنة والتصدير.</p></div><div class="th-card-foot"><span>فتح الاستوديو الحقيقي</span><span class="th-arrow">←</span></div>
            </button>
            <button class="th-card" data-tone="blue" data-home-tool="video" type="button">
              <div><div class="th-card-top"><span class="th-icon">🎬</span><span class="th-tag">VIDEO</span></div><h3>الفيديو والخلفيات</h3><p>Pexels وPixabay أو رفع فيديو من الجهاز وبدء التحرير مباشرة.</p></div><div class="th-card-foot"><span>فتح أدوات الفيديو</span><span class="th-arrow">←</span></div>
            </button>
            <button class="th-card" data-tone="pink" data-home-tool="audio" type="button">
              <div><div class="th-card-top"><span class="th-icon">♫</span><span class="th-tag">GEMINI</span></div><h3>الصوت والتعليق AI</h3><p>رفع صوت، أصوات Gemini، معاينة، مؤثرات SFX والتحكم في المستويات.</p></div><div class="th-card-foot"><span>فتح أدوات الصوت</span><span class="th-arrow">←</span></div>
            </button>
            <button class="th-card" data-tone="violet" data-home-tool="text" type="button">
              <div><div class="th-card-top"><span class="th-icon">T</span><span class="th-tag">TEXT</span></div><h3>النصوص والذكاء الاصطناعي</h3><p>إضافة النصوص وتعديل الخط والحجم واللون والظل وإنشاء كابشن AI.</p></div><div class="th-card-foot"><span>فتح أدوات النص</span><span class="th-arrow">←</span></div>
            </button>
            <button class="th-card" data-tone="orange" data-home-tool="stickers" type="button">
              <div><div class="th-card-top"><span class="th-icon">✨</span><span class="th-tag">GIPHY</span></div><h3>الملصقات و GIF</h3><p>البحث عبر GIPHY أو رفع ملصقات وصور وتحريكها فوق الفيديو.</p></div><div class="th-card-foot"><span>فتح أدوات الملصقات</span><span class="th-arrow">←</span></div>
            </button>
            <button class="th-card" data-tone="blue" data-home-tool="layers" type="button">
              <div><div class="th-card-top"><span class="th-icon">▱</span><span class="th-tag">LAYERS</span></div><h3>الطبقات والترتيب</h3><p>إدارة ترتيب العناصر والحجم والدوران والتقديم والتأخير داخل المشروع.</p></div><div class="th-card-foot"><span>فتح إدارة الطبقات</span><span class="th-arrow">←</span></div>
            </button>
            <button class="th-card" data-tone="violet" data-home-tool="settings" type="button">
              <div><div class="th-card-top"><span class="th-icon">⚙</span><span class="th-tag">EXPORT</span></div><h3>الإعدادات والتصدير</h3><p>الجودة وFPS وCover/Contain ووضع الأداء وتجهيز الفيديو النهائي.</p></div><div class="th-card-foot"><span>فتح إعدادات التصدير</span><span class="th-arrow">←</span></div>
            </button>
          </div>
        </section>
      </div>`;

    const back = document.createElement("button");
    back.id = "transparentHomeBack";
    back.type = "button";
    back.hidden = true;
    back.textContent = "⌂ الرئيسية";

    document.body.appendChild(home);
    document.body.appendChild(back);
    document.body.classList.add("th-home-open");

    home.addEventListener("click", e => {
      const button = e.target.closest("[data-home-tool]");
      if (!button) return;
      e.preventDefault();
      openWorkingTool(button.dataset.homeTool);
    });
    back.addEventListener("click", showTransparentHome);
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
    buildTransparentHome();
    setTimeout(enhanceGemini, 0);
    setTimeout(enhanceGemini, 300);
    setTimeout(enhanceGemini, 900);
    const mo = new MutationObserver(() => { if (enhanceGemini()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
