"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let logoLayerId = null;
  let logoUrl = null;
  let logoBaseW = 0;
  let logoBaseH = 0;

  function waitForStudio() {
    if (!qid("quranStudio") || !qid("qrPhoneStage")) return setTimeout(waitForStudio, 120);
    install();
  }

  function injectStyles() {
    if (qid("qrPublishToolsStyles")) return;
    const style = document.createElement("style");
    style.id = "qrPublishToolsStyles";
    style.textContent = `
      .qr-logo-tools{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)}
      .qr-logo-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
      .qr-logo-head b{font-size:10px}.qr-logo-head small{font-size:8px;color:#8490a3}
      .qr-logo-row{display:grid;grid-template-columns:1fr auto;gap:7px}
      .qr-logo-upload{position:relative;min-height:43px;border:1px dashed rgba(255,255,255,.16);border-radius:11px;background:#111722;display:flex;align-items:center;justify-content:center;gap:7px;font-size:9px;color:#d1d8e4;cursor:pointer}
      .qr-logo-upload input{position:absolute;inset:0;opacity:0;cursor:pointer}
      .qr-logo-remove{min-width:70px}
      .qr-logo-controls{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
      .qr-logo-controls label{display:block;font-size:8px;color:#aeb7c6}
      .qr-logo-controls select,.qr-logo-controls input{width:100%;margin-top:5px}
      .qr-logo-controls select{min-height:39px;border:1px solid rgba(255,255,255,.11);background:#121824;color:#fff;border-radius:10px;padding:7px;font-size:9px}
      .qr-tiktok-tools{width:min(560px,100%);border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(17,23,34,.75);padding:9px 10px}
      .qr-tiktok-tools summary{cursor:pointer;font-size:10px;font-weight:800;color:#eef4fb;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .qr-tiktok-tools summary::-webkit-details-marker{display:none}
      .qr-tiktok-tools summary:after{content:'⌄';color:#94a0b2;font-size:14px}
      .qr-tiktok-tools[open] summary:after{transform:rotate(180deg)}
      .qr-tiktok-grid{display:grid;gap:7px;margin-top:8px}
      .qr-tiktok-field span{display:block;font-size:8px;color:#9aa6b8;margin-bottom:4px}
      .qr-tiktok-field input,.qr-tiktok-field textarea{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#0d131c;color:#fff;padding:8px 9px;font:600 9px Cairo,sans-serif;outline:none;resize:vertical}
      .qr-tiktok-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}
      .qr-tiktok-actions .qr-btn{flex:1;min-width:105px;min-height:39px}
      .qr-tiktok-note{font-size:8px;color:#7f8b9e;line-height:1.6;margin-top:6px}
      .qr-share [data-share="tiktok"]{border-color:rgba(255,64,96,.2);background:linear-gradient(135deg,rgba(37,244,238,.08),rgba(254,44,85,.09));color:#fff}
      @media(max-width:430px){.qr-logo-controls{grid-template-columns:1fr}.qr-tiktok-actions .qr-btn{min-width:0;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function currentSurahName() {
    const option = qid("qrSurah")?.selectedOptions?.[0];
    let name = String(option?.textContent || "سورة القرآن").trim();
    name = name.replace(/^\s*\d+\.?\s*/, "").split("—")[0].trim();
    if (!/^سورة\s/.test(name)) name = `سورة ${name}`;
    return name;
  }

  function currentReciterName() {
    const pickerName = qid("qrReciterPickerBtn")?.querySelector(".qr-reciter-main-name")?.textContent?.trim();
    if (pickerName) return pickerName;
    let text = qid("qrReciter")?.selectedOptions?.[0]?.textContent?.trim() || "القارئ";
    return text.replace(/\s*[—–-]\s*ar\.[a-z0-9._-]+\s*$/i, "").replace(/\s*[—–-]\s*(مرتل|مجود|تجويد|ترتيل)\s*$/i, "").trim();
  }

  function defaultTitle() {
    const from = qid("qrFrom")?.value || 1;
    const to = qid("qrTo")?.value || from;
    return `تلاوة من ${currentSurahName()} | الآيات ${from}–${to} | بصوت ${currentReciterName()}`;
  }

  function defaultHashtags() {
    const surahTag = currentSurahName().replace(/^سورة\s*/, "").trim().replace(/\s+/g, "_").replace(/[^\u0600-\u06FF_]/g, "");
    return `#القرآن_الكريم #قرآن #تلاوة #اسلاميات #Quran${surahTag ? ` #سورة_${surahTag}` : ""}`;
  }

  function refreshPublishText(force = false) {
    const title = qid("qrTikTokTitle"), tags = qid("qrTikTokHashtags");
    if (title && (force || !title.dataset.edited)) title.value = defaultTitle();
    if (tags && (force || !tags.dataset.edited)) tags.value = defaultHashtags();
  }

  async function copyText(text, label) {
    const value = String(text || "").trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    const status = qid("qrStatus");
    if (status) { status.textContent = `تم نسخ ${label} ✅`; status.className = "qr-status ok"; }
  }

  function fullCaption() {
    const title = qid("qrTikTokTitle")?.value?.trim() || defaultTitle();
    const tags = qid("qrTikTokHashtags")?.value?.trim() || defaultHashtags();
    return `${title}\n\n${tags}`.trim();
  }

  async function openTikTokUpload() {
    await copyText(fullCaption(), "العنوان والهاشتاج");
    const win = window.open("https://www.tiktok.com/upload", "_blank", "noopener,noreferrer");
    if (!win) location.href = "https://www.tiktok.com/upload";
    const status = qid("qrStatus");
    if (status) {
      status.textContent = "تم نسخ وصف TikTok وفتح صفحة النشر. اختر الفيديو يدويًا ثم الصق النص.";
      status.className = "qr-status ok";
    }
  }

  function injectPublishTools() {
    if (qid("qrTikTokTools")) return;
    const share = document.querySelector(".qr-share");
    if (!share) return;

    const tiktok = document.createElement("button");
    tiktok.type = "button";
    tiktok.dataset.share = "tiktok";
    tiktok.textContent = "TikTok";
    tiktok.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTikTokUpload();
    }, true);
    share.prepend(tiktok);

    const details = document.createElement("details");
    details.id = "qrTikTokTools";
    details.className = "qr-tiktok-tools";
    details.innerHTML = `
      <summary><span>🎵 تجهيز النشر اليدوي على TikTok</span></summary>
      <div class="qr-tiktok-grid">
        <label class="qr-tiktok-field"><span>العنوان</span><input id="qrTikTokTitle" type="text"></label>
        <label class="qr-tiktok-field"><span>الهاشتاج</span><textarea id="qrTikTokHashtags" rows="2"></textarea></label>
      </div>
      <div class="qr-tiktok-actions">
        <button id="qrCopyTikTokTitle" class="qr-btn" type="button">نسخ العنوان</button>
        <button id="qrCopyTikTokTags" class="qr-btn" type="button">نسخ الهاشتاج</button>
        <button id="qrCopyTikTokAll" class="qr-btn" type="button">نسخ الكل</button>
        <button id="qrOpenTikTok" class="qr-btn primary" type="button">فتح TikTok للنشر</button>
      </div>
      <div class="qr-tiktok-note">النشر يظل يدويًا: الموقع يجهز النص وينسخه لك، ثم ترفع الفيديو من جهازك على TikTok وتلصق العنوان والهاشتاج.</div>`;
    share.insertAdjacentElement("afterend", details);

    qid("qrTikTokTitle")?.addEventListener("input", e => { e.target.dataset.edited = "1"; });
    qid("qrTikTokHashtags")?.addEventListener("input", e => { e.target.dataset.edited = "1"; });
    qid("qrCopyTikTokTitle")?.addEventListener("click", () => copyText(qid("qrTikTokTitle")?.value, "العنوان"));
    qid("qrCopyTikTokTags")?.addEventListener("click", () => copyText(qid("qrTikTokHashtags")?.value, "الهاشتاج"));
    qid("qrCopyTikTokAll")?.addEventListener("click", () => copyText(fullCaption(), "العنوان والهاشتاج"));
    qid("qrOpenTikTok")?.addEventListener("click", openTikTokUpload);
    refreshPublishText(true);
  }

  function logoLayer() {
    try { return state.layers.find(layer => layer.id === logoLayerId) || state.layers.find(layer => layer.quranLogo); } catch { return null; }
  }

  function applyLogoPosition() {
    const layer = logoLayer();
    const canvas = qid("canvas");
    if (!layer || !canvas) return;
    const margin = Math.max(28, canvas.width * .045);
    const pos = qid("qrLogoPosition")?.value || "top-right";
    const halfW = (layer.baseW * (layer.scale || 1)) / 2;
    const halfH = (layer.baseH * (layer.scale || 1)) / 2;
    const map = {
      "top-right": [canvas.width - margin - halfW, margin + halfH],
      "top-left": [margin + halfW, margin + halfH],
      "bottom-right": [canvas.width - margin - halfW, canvas.height - margin - halfH],
      "bottom-left": [margin + halfW, canvas.height - margin - halfH]
    };
    [layer.x, layer.y] = map[pos] || map["top-right"];
    try { if (typeof renderLayersList === "function") renderLayersList(); } catch {}
  }

  function updateLogoScale() {
    const layer = logoLayer();
    if (!layer) return;
    layer.scale = Number(qid("qrLogoSize")?.value || 100) / 100;
    applyLogoPosition();
  }

  function removeLogo() {
    try {
      state.layers = state.layers.filter(layer => !layer.quranLogo && layer.id !== logoLayerId);
      if (state.selected === logoLayerId) state.selected = null;
      if (typeof renderLayersList === "function") renderLayersList();
      if (typeof syncSelectedControls === "function") syncSelectedControls();
    } catch {}
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUrl = null; logoLayerId = null; logoBaseW = 0; logoBaseH = 0;
    const status = qid("qrLogoStatus"); if (status) status.textContent = "لا يوجد لوجو";
  }

  function addLogo(file) {
    if (!file || !file.type.startsWith("image/")) return;
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        state.layers = state.layers.filter(layer => !layer.quranLogo && layer.id !== logoLayerId);
        const canvas = qid("canvas");
        const targetW = Math.max(120, (canvas?.width || 1080) * .18);
        const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
        logoBaseW = targetW; logoBaseH = targetW * ratio;
        const layer = {
          id: `quran-logo-${Date.now()}`, type: "sticker", name: `Logo — ${file.name}`,
          visible: true, x: 0, y: 0, rotation: 0, scale: Number(qid("qrLogoSize")?.value || 100) / 100,
          baseW: logoBaseW, baseH: logoBaseH, image: img, src: logoUrl, localObjectUrl: true, quranLogo: true
        };
        state.layers.push(layer); logoLayerId = layer.id;
        applyLogoPosition();
        if (typeof renderLayersList === "function") renderLayersList();
        const status = qid("qrLogoStatus"); if (status) status.textContent = file.name;
      } catch {}
    };
    img.src = logoUrl;
  }

  function injectLogoTools() {
    if (qid("qrLogoTools")) return;
    const section = qid("qrFont")?.closest(".qr-section");
    if (!section) return;
    const box = document.createElement("div");
    box.id = "qrLogoTools";
    box.className = "qr-logo-tools";
    box.innerHTML = `
      <div class="qr-logo-head"><b>🖼 صورة / لوجو فوق الفيديو</b><small id="qrLogoStatus">لا يوجد لوجو</small></div>
      <div class="qr-logo-row">
        <label class="qr-logo-upload">＋ إضافة صورة أو لوجو<input id="qrLogoUpload" type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml"></label>
        <button id="qrLogoRemove" class="qr-btn danger qr-logo-remove" type="button">إزالة</button>
      </div>
      <div class="qr-logo-controls">
        <label>الموضع<select id="qrLogoPosition"><option value="top-right">أعلى يمين</option><option value="top-left">أعلى يسار</option><option value="bottom-right">أسفل يمين</option><option value="bottom-left">أسفل يسار</option></select></label>
        <label>الحجم <b id="qrLogoSizeOut">100%</b><input id="qrLogoSize" type="range" min="35" max="220" value="100"></label>
      </div>`;
    section.appendChild(box);

    qid("qrLogoUpload")?.addEventListener("change", event => addLogo(event.target.files?.[0]));
    qid("qrLogoRemove")?.addEventListener("click", removeLogo);
    qid("qrLogoPosition")?.addEventListener("change", applyLogoPosition);
    qid("qrLogoSize")?.addEventListener("input", event => {
      qid("qrLogoSizeOut").textContent = `${event.target.value}%`;
      updateLogoScale();
    });
  }

  function installRefreshHooks() {
    ["qrSurah", "qrReciter"].forEach(id => qid(id)?.addEventListener("change", () => refreshPublishText(false)));
    ["qrFrom", "qrTo"].forEach(id => qid(id)?.addEventListener("input", () => refreshPublishText(false)));
    document.addEventListener("click", event => {
      if (event.target.closest?.(".qr-reciter-choose")) setTimeout(() => refreshPublishText(false), 30);
    });
  }

  function install() {
    if (qid("quranStudio")?.dataset.publishTools === "1") return;
    qid("quranStudio").dataset.publishTools = "1";
    injectStyles();
    injectLogoTools();
    injectPublishTools();
    installRefreshHooks();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();
