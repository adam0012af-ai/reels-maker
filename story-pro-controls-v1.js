"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const STORE = "reelsMaker.storyPro.v1";
  const FORMATS = {
    portrait: { label: "ريلز / TikTok", ratio: "9:16", icon: "▯", sizes: { "540": [540,960], "720": [720,1280], "1080": [1080,1920] } },
    landscape: { label: "YouTube أفقي", ratio: "16:9", icon: "▭", sizes: { "540": [960,540], "720": [1280,720], "1080": [1920,1080] } },
    square: { label: "مربع", ratio: "1:1", icon: "□", sizes: { "540": [540,540], "720": [720,720], "1080": [1080,1080] } },
    feed: { label: "بوست عمودي", ratio: "4:5", icon: "▯", sizes: { "540": [540,675], "720": [720,900], "1080": [1080,1350] } },
    classic: { label: "عمودي كلاسيك", ratio: "3:4", icon: "▯", sizes: { "540": [540,720], "720": [720,960], "1080": [1080,1440] } }
  };
  const VOICES = [
    ["Kore", "Kore — واضح ومتوازن"],
    ["Aoede", "Aoede — هادئ وناعم"],
    ["Puck", "Puck — حيوي وسريع"],
    ["Charon", "Charon — عميق وهادئ"],
    ["Zephyr", "Zephyr — ناعم وحديث"],
    ["Fenrir", "Fenrir — قوي ومباشر"]
  ];
  let installed = false;
  let previewAudio = null;
  let previewUrl = null;

  const state = (() => {
    try { return { format: "portrait", quality: "720", voice: "Kore", ...JSON.parse(sessionStorage.getItem(STORE) || "{}") }; }
    catch { return { format: "portrait", quality: "720", voice: "Kore" }; }
  })();

  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  }

  function dims() {
    const f = FORMATS[state.format] || FORMATS.portrait;
    return f.sizes[state.quality] || f.sizes["720"];
  }

  function injectStyles() {
    if (qid("storyProV1Styles")) return;
    const style = document.createElement("style");
    style.id = "storyProV1Styles";
    style.textContent = `
      .ss-pro-setup{margin:0 0 14px;border:1px solid rgba(112,139,180,.18);border-radius:16px;background:linear-gradient(180deg,rgba(13,20,30,.96),rgba(8,13,20,.96));padding:14px}
      .ss-pro-head{display:flex;align-items:center;gap:10px;margin-bottom:11px}.ss-pro-head div{flex:1}.ss-pro-head b{display:block;font-size:13px}.ss-pro-head span{display:block;color:#7f8da1;font-size:8px;margin-top:3px}.ss-pro-step{font-size:8px;color:#7ee0bd;border:1px solid rgba(46,203,155,.22);border-radius:999px;padding:5px 8px;background:rgba(46,203,155,.06)}
      .ss-format-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}.ss-format-card{position:relative;min-height:86px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#0a1119;color:#cbd4df;padding:9px 7px;cursor:pointer;text-align:center;transition:.18s}.ss-format-card:hover{border-color:rgba(111,140,255,.32);transform:translateY(-1px)}.ss-format-card.active{border-color:rgba(55,211,160,.52);background:linear-gradient(180deg,rgba(38,197,148,.10),rgba(98,86,232,.07));box-shadow:inset 0 0 0 1px rgba(55,211,160,.08)}
      .ss-format-shape{height:35px;display:grid;place-items:center;font-size:30px;line-height:1;color:#aebaff}.ss-format-card.active .ss-format-shape{color:#58ddb1}.ss-format-card b{display:block;font-size:8px;margin-top:5px}.ss-format-card small{display:block;font-size:7px;color:#748297;margin-top:2px}
      .ss-pro-options{display:grid;grid-template-columns:180px 1fr auto;gap:8px;align-items:end;margin-top:10px}.ss-pro-field{display:flex;flex-direction:column;gap:5px}.ss-pro-field span{font-size:8px;color:#8795a9;font-weight:700}.ss-pro-field select{min-height:39px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:#091019;color:#fff;padding:0 10px;font:700 9px Cairo,sans-serif}.ss-voice-preview{min-height:39px;white-space:nowrap}
      .ss-format-summary{margin-top:9px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055);font-size:8px;color:#8d9caf}.ss-format-summary strong{color:#eaf0f7}
      .ss-brand-badge{display:flex;align-items:center;gap:6px;margin-top:8px;color:#7f8da0;font-size:7px}.ss-brand-badge i{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;background:#111b28;border:1px solid rgba(255,255,255,.08);font-style:normal;font-weight:900;color:#dce5ef}
      .ss-review-format{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.ss-review-format span{border:1px solid rgba(255,255,255,.08);border-radius:999px;background:#0e151f;color:#9ba8ba;padding:5px 8px;font-size:7px}.ss-review-format b{color:#fff}
      @media(max-width:800px){.ss-format-grid{grid-template-columns:repeat(3,1fr)}.ss-pro-options{grid-template-columns:1fr}.ss-voice-preview{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function injectControls() {
    const pane = qid("ssCreatePane");
    if (!pane || qid("ssProSetup")) return false;
    const grid = pane.querySelector(".ss-grid3");
    if (!grid) return false;
    const box = document.createElement("div");
    box.id = "ssProSetup";
    box.className = "ss-pro-setup";
    box.innerHTML = `
      <div class="ss-pro-head"><div><b>إعداد الفيديو قبل التوليد</b><span>اختار المقاس والجودة والراوي الأول — وبعدها توليد القصة والفيديو.</span></div><span class="ss-pro-step">الخطوة 1</span></div>
      <div id="ssFormatGrid" class="ss-format-grid"></div>
      <div class="ss-pro-options">
        <label class="ss-pro-field"><span>جودة الإخراج</span><select id="ssOutputQuality"><option value="540">540p — سريع</option><option value="720">720p — HD</option><option value="1080">1080p — Full HD</option></select></label>
        <label class="ss-pro-field"><span>الراوي</span><select id="ssNarrator"></select></label>
        <button id="ssNarratorPreview" class="ss-btn ss-voice-preview" type="button">▶ تجربة الراوي</button>
      </div>
      <div id="ssFormatSummary" class="ss-format-summary"></div>
      <div class="ss-brand-badge"><i>R</i><span>سيظهر شعار <strong>Reels Maker AI</strong> بخفة على الفيديو النهائي لحماية هوية الموقع.</span></div>`;
    pane.insertBefore(box, grid);

    const formatGrid = qid("ssFormatGrid");
    Object.entries(FORMATS).forEach(([key, f]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ss-format-card";
      btn.dataset.format = key;
      btn.innerHTML = `<span class="ss-format-shape">${f.icon}</span><b>${f.label}</b><small>${f.ratio}</small>`;
      btn.addEventListener("click", () => { state.format = key; save(); syncUI(); });
      formatGrid.appendChild(btn);
    });

    const voice = qid("ssNarrator");
    VOICES.forEach(([value,label]) => voice.add(new Option(label, value)));
    qid("ssOutputQuality").value = state.quality;
    voice.value = state.voice;
    qid("ssOutputQuality").addEventListener("change", e => { state.quality = e.target.value; save(); syncUI(); });
    voice.addEventListener("change", e => { state.voice = e.target.value; save(); syncUI(); });
    qid("ssNarratorPreview").addEventListener("click", previewNarrator);

    const reviewVideo = qid("ssPreview");
    if (reviewVideo && !qid("ssReviewFormat")) {
      const info = document.createElement("div");
      info.id = "ssReviewFormat";
      info.className = "ss-review-format";
      reviewVideo.insertAdjacentElement("afterend", info);
    }
    addDeleteButton();
    syncUI();
    return true;
  }

  function addDeleteButton() {
    if (qid("ssDeleteMovie")) return;
    const dl = qid("ssDownload");
    if (!dl?.parentElement) return;
    const btn = document.createElement("button");
    btn.id = "ssDeleteMovie";
    btn.type = "button";
    btn.className = "ss-btn danger";
    btn.textContent = "🗑 حذف الفيديو";
    btn.addEventListener("click", () => {
      const video = qid("ssPreview");
      try { video?.pause(); } catch {}
      if (video) { video.removeAttribute("src"); video.load(); }
      qid("ssReviewPane")?.classList.remove("show");
      qid("ssCreatePane")?.scrollIntoView({ behavior: "smooth", block: "start" });
      ["ssDownload","ssMontage","ssRebuild"].forEach(id => { const b = qid(id); if (b) b.disabled = true; });
      if (typeof window.toast === "function") window.toast("تم حذف المعاينة الحالية. نص القصة ما زال محفوظًا ويمكنك إنشاء نسخة جديدة.");
    });
    dl.insertAdjacentElement("afterend", btn);

    const video = qid("ssPreview");
    if (video) {
      new MutationObserver(() => {
        if (video.getAttribute("src")) ["ssDownload","ssMontage","ssRebuild"].forEach(id => { const b = qid(id); if (b) b.disabled = false; });
      }).observe(video, { attributes: true, attributeFilter: ["src"] });
    }
  }

  function syncUI() {
    document.querySelectorAll(".ss-format-card").forEach(el => el.classList.toggle("active", el.dataset.format === state.format));
    const q = qid("ssOutputQuality"); if (q) q.value = state.quality;
    const v = qid("ssNarrator"); if (v) v.value = state.voice;
    const f = FORMATS[state.format] || FORMATS.portrait;
    const [w,h] = dims();
    const s = qid("ssFormatSummary");
    if (s) s.innerHTML = `الإخراج: <strong>${f.label}</strong> • النسبة <strong>${f.ratio}</strong> • المقاس <strong>${w}×${h}</strong> • الراوي <strong>${state.voice}</strong>`;
    const rv = qid("ssReviewFormat");
    if (rv) rv.innerHTML = `<span>المقاس <b>${f.ratio}</b></span><span>الدقة <b>${w}×${h}</b></span><span>الراوي <b>${state.voice}</b></span><span>Watermark <b>Reels Maker AI</b></span>`;
    const preview = qid("ssPreview");
    if (preview) preview.style.aspectRatio = `${w}/${h}`;
  }

  async function previewNarrator() {
    const btn = qid("ssNarratorPreview");
    if (!btn) return;
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ جاري التجربة...";
    try {
      if (previewAudio) { try { previewAudio.pause(); } catch {} }
      if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} previewUrl = null; }
      const response = await fetch("/api/story-voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ text: "مرحبًا بك في ريلز ميكر. هذه تجربة سريعة لصوت الراوي قبل إنشاء القصة.", voice: state.voice })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      previewUrl = URL.createObjectURL(blob);
      previewAudio = new Audio(previewUrl);
      await previewAudio.play();
      btn.textContent = "🔊 يعمل الآن";
      previewAudio.onended = () => { btn.disabled = false; btn.textContent = old; };
      return;
    } catch (error) {
      if (typeof window.toast === "function") window.toast("تعذر تشغيل تجربة الراوي الآن.", "error");
    }
    btn.disabled = false;
    btn.textContent = old;
  }

  function patchStoryVoiceFetch() {
    if (window.__storyVoiceFetchPatched) return;
    window.__storyVoiceFetchPatched = true;
    const previousFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      try {
        const url = typeof input === "string" ? input : input?.url || "";
        if (/\/api\/story-voice(?:\?|$)/.test(url) && init?.body && String(init.method || "POST").toUpperCase() === "POST") {
          const data = JSON.parse(init.body);
          data.voice = state.voice || data.voice || "Kore";
          init = { ...init, body: JSON.stringify(data) };
        }
      } catch {}
      return previousFetch(input, init);
    };
  }

  function patchStoryCanvas() {
    if (window.__storyCanvasBrandPatched) return;
    window.__storyCanvasBrandPatched = true;
    const proto = HTMLCanvasElement.prototype;
    const wd = Object.getOwnPropertyDescriptor(proto, "width");
    const hd = Object.getOwnPropertyDescriptor(proto, "height");
    if (!wd?.set || !hd?.set) return;

    Object.defineProperty(proto, "width", {
      configurable: true,
      enumerable: wd.enumerable,
      get: wd.get,
      set(value) {
        const stack = (() => { try { return new Error().stack || ""; } catch { return ""; } })();
        if (Number(value) === 720 && /renderMovie/.test(stack)) {
          this.__reelsStoryRender = true;
          const [w] = dims();
          return wd.set.call(this, w);
        }
        return wd.set.call(this, value);
      }
    });
    Object.defineProperty(proto, "height", {
      configurable: true,
      enumerable: hd.enumerable,
      get: hd.get,
      set(value) {
        if (this.__reelsStoryRender && Number(value) === 1280) {
          const [,h] = dims();
          return hd.set.call(this, h);
        }
        return hd.set.call(this, value);
      }
    });

    const ctxProto = CanvasRenderingContext2D.prototype;
    const nativeRestore = ctxProto.restore;
    if (!ctxProto.__reelsStoryRestorePatched) {
      ctxProto.__reelsStoryRestorePatched = true;
      ctxProto.restore = function() {
        const branded = !!this.canvas?.__reelsStoryRender;
        nativeRestore.call(this);
        if (!branded) return;
        const w = this.canvas.width, h = this.canvas.height;
        const scale = Math.max(.72, Math.min(1.7, Math.min(w,h) / 720));
        this.save();
        this.globalAlpha = .52;
        this.textAlign = "left";
        this.textBaseline = "middle";
        const x = Math.round(w * .035), y = Math.round(h * .042);
        const boxW = Math.round(154 * scale), boxH = Math.round(34 * scale), r = Math.round(10 * scale);
        this.fillStyle = "rgba(7,12,18,.72)";
        this.beginPath();
        if (typeof this.roundRect === "function") this.roundRect(x, y, boxW, boxH, r);
        else this.rect(x, y, boxW, boxH);
        this.fill();
        this.strokeStyle = "rgba(255,255,255,.14)";
        this.lineWidth = Math.max(1, scale);
        this.stroke();
        this.fillStyle = "#ffffff";
        this.font = `800 ${Math.round(12 * scale)}px Cairo, sans-serif`;
        this.fillText("R  Reels Maker AI", x + Math.round(12*scale), y + boxH/2 + 1);
        nativeRestore.call(this);
      };
    }
  }

  function watchReview() {
    const review = qid("ssReviewPane");
    if (!review) return;
    new MutationObserver(() => { if (review.classList.contains("show")) syncUI(); }).observe(review, { attributes: true, attributeFilter: ["class"] });
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyles();
    patchStoryVoiceFetch();
    patchStoryCanvas();
    const tryInstall = () => {
      if (!injectControls()) return setTimeout(tryInstall, 120);
      watchReview();
      syncUI();
    };
    tryInstall();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install);
  else install();
})();
