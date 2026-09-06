"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const MAIN_QUICK = [
    ["مساجد", "mosque islamic architecture"],
    ["مكة", "Mecca Kaaba"],
    ["المدينة", "Medina mosque"],
    ["أشجار", "green trees forest nature"],
    ["شلالات", "waterfall nature vertical"],
    ["سماء وغيوم", "sky clouds sunset vertical"]
  ];
  const EXTRA_FONTS = [
    ["El Messiri", "المسيري — El Messiri"],
    ["Changa", "شانجا — Changa"],
    ["Markazi Text", "مركزي — Markazi Text"],
    ["Reem Kufi", "ريم كوفي — Reem Kufi"],
    ["Harmattan", "هَرمتان — Harmattan"],
    ["IBM Plex Sans Arabic", "IBM Plex Sans Arabic"]
  ];

  const mainSearch = { query: "", source: "pexels", page: 0, loading: false, seen: new Set() };
  const quranSearch = { query: "", source: "pexels", page: 0, loading: false, seen: new Set() };
  let lastSelected = null;
  let editingQuranPosition = false;

  function waitForCore() {
    try {
      if (typeof state === "undefined" || typeof canvas === "undefined" || typeof selectedLayer !== "function" || !qid("panel-video")) {
        return setTimeout(waitForCore, 100);
      }
      install();
    } catch {
      setTimeout(waitForCore, 120);
    }
  }

  function injectStyles() {
    if (qid("editorProV2Styles")) return;
    const style = document.createElement("style");
    style.id = "editorProV2Styles";
    style.textContent = `
      .islamic-quick-title{font-size:9px;color:#8692a5;margin:9px 0 5px}
      .islamic-video-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}
      .islamic-video-chips button{border:1px solid rgba(255,255,255,.1);background:#111722;color:#cbd3df;border-radius:999px;padding:7px 10px;font:600 9px Cairo,sans-serif;cursor:pointer}
      .islamic-video-chips button:hover{border-color:rgba(125,92,255,.45);color:#fff}
      .pro-more-wrap{grid-column:1/-1;display:flex;justify-content:center;padding:9px 0 4px}
      .pro-more-btn{min-width:145px;min-height:39px;border:1px solid rgba(125,92,255,.35);border-radius:11px;background:rgba(125,92,255,.11);color:#e8e2ff;font:700 10px Cairo,sans-serif;cursor:pointer}
      .pro-more-btn:disabled{opacity:.55;cursor:wait}
      .pro-image-tools{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
      .pro-image-tools.hidden{display:none!important}
      .pro-image-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
      .pro-image-head b{font-size:11px}.pro-image-head small{font-size:8px;color:#8390a3}
      .pro-image-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .pro-image-grid label{font-size:9px;color:#b9c2d0}.pro-image-grid input{width:100%;margin-top:5px}
      .pro-image-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
      .pro-image-actions button{min-height:38px}
      .quran-lock-note{display:none;margin:0 0 8px;padding:8px 9px;border:1px solid rgba(56,211,159,.16);border-radius:10px;background:rgba(56,211,159,.06);color:#91cdb7;font-size:8px;line-height:1.7}
      .quran-lock-note.show{display:block}
      #textContent.quran-locked{opacity:.72;cursor:not-allowed;background:#0c1118}
      .quran-meta-badge{display:none;margin:0 0 8px;padding:7px 9px;border:1px solid rgba(125,92,255,.2);border-radius:10px;background:rgba(125,92,255,.08);color:#cfc5ff;font-size:8px}
      .quran-meta-badge.show{display:block}
      .qr-stock-quick{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
      .qr-stock-quick button{border:1px solid rgba(255,255,255,.09);background:#111722;color:#c7cfdb;border-radius:999px;padding:6px 8px;font:600 8px Cairo,sans-serif;cursor:pointer}
      @media(max-width:900px){.pro-image-grid{grid-template-columns:1fr}.pro-image-actions{grid-template-columns:1fr 1fr}.islamic-video-chips{overflow-x:auto;flex-wrap:nowrap;padding-bottom:3px}.islamic-video-chips button{white-space:nowrap}}
    `;
    document.head.appendChild(style);
  }

  function injectFonts() {
    if (!qid("editorProArabicFonts")) {
      const link = document.createElement("link");
      link.id = "editorProArabicFonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Changa:wght@400;500;600;700&family=El+Messiri:wght@400;500;600;700&family=Harmattan:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Markazi+Text:wght@400;500;600;700&family=Reem+Kufi:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    [qid("fontFamily"), qid("qrFont")].filter(Boolean).forEach(select => {
      const current = new Set([...select.options].map(option => option.value));
      EXTRA_FONTS.forEach(([value, label]) => {
        if (current.has(value)) return;
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
    });
  }

  function installQuickSearchChips() {
    const panel = qid("panel-video");
    const old = panel?.querySelector(".chips");
    if (!panel || !old) return;
    old.innerHTML = "";
    old.className = "islamic-video-chips";
    MAIN_QUICK.forEach(([label, query]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.islamicVideoQ = query;
      button.textContent = label;
      old.appendChild(button);
    });
    const input = qid("videoSearch");
    if (input) input.placeholder = "مثال: مسجد، مكة، المدينة، أشجار، شلالات...";
  }

  function normalizeItems(data, source) {
    if (source === "pixabay") {
      return (data.hits || []).map(v => {
        const versions = Object.values(v.videos || {}).filter(item => item?.url);
        const portrait = versions.filter(item => (item.height || 0) >= (item.width || 0));
        const pool = portrait.length ? portrait : versions;
        pool.sort((a, b) => Math.abs((a.width || 1) / (a.height || 1) - 9 / 16) - Math.abs((b.width || 1) / (b.height || 1) - 9 / 16));
        const pick = pool[0];
        return { id: `pixabay-${v.id}`, source: "Pixabay", thumb: pick?.thumbnail, url: pick?.url, label: `Pixabay #${v.id}` };
      }).filter(item => item.url);
    }
    return (data.videos || []).map(v => {
      const files = (v.video_files || []).filter(item => item?.link);
      const portrait = files.filter(item => (item.height || 0) >= (item.width || 0));
      const pool = portrait.length ? portrait : files;
      pool.sort((a, b) => Math.abs((a.width || 1) / (a.height || 1) - 9 / 16) - Math.abs((b.width || 1) / (b.height || 1) - 9 / 16));
      return { id: `pexels-${v.id}`, source: "Pexels", thumb: v.image, url: pool[0]?.link, label: `Pexels #${v.id}` };
    }).filter(item => item.url);
  }

  async function fetchPage(store, query, source, append, target, renderer) {
    if (store.loading) return;
    if (!append || store.query !== query || store.source !== source) {
      store.query = query;
      store.source = source;
      store.page = 0;
      store.seen.clear();
      target.innerHTML = '<div class="results-msg">جاري البحث عن فيديوهات كثيرة ومتنوعة...</div>';
    }
    store.loading = true;
    const nextPage = store.page + 1;
    try {
      const response = await fetch(`/api/video-search?source=${encodeURIComponent(source)}&query=${encodeURIComponent(query)}&page=${nextPage}&per_page=30`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const items = normalizeItems(data, source).filter(item => {
        const key = `${item.source}:${item.id}:${item.url}`;
        if (store.seen.has(key)) return false;
        store.seen.add(key);
        return true;
      });
      store.page = nextPage;
      if (!append) target.innerHTML = "";
      renderer(items, target, store);
    } catch (error) {
      if (!append) target.innerHTML = `<div class="results-msg">تعذر البحث: ${String(error?.message || error)}</div>`;
      else if (typeof toast === "function") toast("تعذر تحميل نتائج إضافية.", "error");
    } finally {
      store.loading = false;
      target.querySelectorAll(".pro-more-btn").forEach(button => button.disabled = false);
    }
  }

  function renderMainItems(items, target, store) {
    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `<img loading="lazy" src="${typeof escapeHTML === "function" ? escapeHTML(item.thumb || "") : item.thumb || ""}" alt="${item.source}"><span class="src">${item.source}</span>`;
      card.addEventListener("click", () => loadRemoteVideo(item.url, item.label));
      target.appendChild(card);
    });
    if (!target.children.length) target.innerHTML = '<div class="results-msg">لا توجد نتائج.</div>';
    if (items.length >= 10) addMoreButton(target, () => runMainSearch(true));
  }

  function addMoreButton(target, fn) {
    target.querySelector(".pro-more-wrap")?.remove();
    const wrap = document.createElement("div");
    wrap.className = "pro-more-wrap";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pro-more-btn";
    button.textContent = "＋ تحميل فيديوهات أكثر";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "جاري تحميل المزيد...";
      await fn();
    });
    wrap.appendChild(button);
    target.appendChild(wrap);
  }

  function runMainSearch(append = false, forcedQuery = "") {
    const input = qid("videoSearch");
    const query = String(forcedQuery || input?.value || "").trim();
    if (!query) return typeof toast === "function" && toast("اكتب كلمة للبحث أولًا.", "error");
    if (forcedQuery && input) input.value = forcedQuery;
    const source = state.videoSource === "pixabay" ? "pixabay" : "pexels";
    return fetchPage(mainSearch, query, source, append, qid("videoResults"), renderMainItems);
  }

  function installMainSearchInterceptors() {
    document.addEventListener("click", event => {
      const quick = event.target.closest?.("[data-islamic-video-q]");
      if (quick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return runMainSearch(false, quick.dataset.islamicVideoQ);
      }
      if (event.target.closest?.("#videoSearchBtn")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return runMainSearch(false);
      }
      if (event.target.closest?.("#videoSourceSwitch button")) {
        setTimeout(() => { mainSearch.page = 0; mainSearch.seen.clear(); }, 0);
      }
    }, true);
    document.addEventListener("keydown", event => {
      if (event.target?.id === "videoSearch" && event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        runMainSearch(false);
      }
    }, true);
  }

  function installQuranQuickSearch() {
    const stock = qid("qrStockResults")?.closest(".qr-stock");
    if (!stock || qid("qrStockQuick")) return;
    const row = document.createElement("div");
    row.id = "qrStockQuick";
    row.className = "qr-stock-quick";
    MAIN_QUICK.forEach(([label, query]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.qrStockQuick = query;
      button.textContent = label;
      row.appendChild(button);
    });
    const switchRow = stock.querySelector(".qr-chip-row");
    switchRow?.insertAdjacentElement("afterend", row);
  }

  function activeQuranStockSource() {
    return document.querySelector("[data-stock].active")?.dataset.stock === "pixabay" ? "pixabay" : "pexels";
  }

  function renderQuranItems(items, target) {
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.className = "qr-stock-item";
      button.type = "button";
      button.innerHTML = `<img loading="lazy" src="${item.thumb || ""}" alt=""><span>استخدام الخلفية</span>`;
      button.addEventListener("click", async () => {
        const status = qid("qrStatus");
        if (status) { status.textContent = "جاري تحميل فيديو الخلفية..."; status.className = "qr-status"; }
        try {
          await loadRemoteVideo(item.url, `Quran stock ${quranSearch.page}-${index + 1}`);
          sourceVideo.loop = true;
          if (status) { status.textContent = "تم اختيار فيديو الخلفية ✅"; status.className = "qr-status ok"; }
        } catch {}
      });
      target.appendChild(button);
    });
    if (!target.children.length) target.innerHTML = '<div class="qr-stock-msg">لا توجد نتائج.</div>';
    if (items.length >= 10) addMoreButton(target, () => runQuranSearch(true));
  }

  function runQuranSearch(append = false, forcedQuery = "") {
    const input = qid("qrStockQuery");
    const query = String(forcedQuery || input?.value || "").trim();
    if (!query) {
      const status = qid("qrStatus");
      if (status) { status.textContent = "اكتب كلمة للبحث عن الخلفية."; status.className = "qr-status err"; }
      return;
    }
    if (forcedQuery && input) input.value = forcedQuery;
    return fetchPage(quranSearch, query, activeQuranStockSource(), append, qid("qrStockResults"), renderQuranItems);
  }

  function installQuranSearchInterceptors() {
    document.addEventListener("click", event => {
      const quick = event.target.closest?.("[data-qr-stock-quick]");
      if (quick) {
        event.preventDefault(); event.stopImmediatePropagation();
        return runQuranSearch(false, quick.dataset.qrStockQuick);
      }
      if (event.target.closest?.("#qrStockSearchBtn")) {
        event.preventDefault(); event.stopImmediatePropagation();
        return runQuranSearch(false);
      }
      if (event.target.closest?.("[data-stock]")) {
        setTimeout(() => { quranSearch.page = 0; quranSearch.seen.clear(); }, 0);
      }
    }, true);
    document.addEventListener("keydown", event => {
      if (event.target?.id === "qrStockQuery" && event.key === "Enter") {
        event.preventDefault(); event.stopImmediatePropagation();
        runQuranSearch(false);
      }
    }, true);
  }

  function installImageTransformSupport() {
    if (typeof drawLayer !== "function" || drawLayer.__proV2) return;
    const nativeDrawLayer = drawLayer;
    const nativeToLayerLocal = toLayerLocal;
    const nativeLayerHandle = layerHandle;

    drawLayer = function proDrawLayer(layer) {
      if (!layer || layer.type !== "sticker") return nativeDrawLayer(layer);
      const sx = (layer.scale || 1) * (layer.scaleX || 1);
      const sy = (layer.scale || 1) * (layer.scaleY || 1);
      ctx.save();
      ctx.globalAlpha = layer.opacity == null ? 1 : Math.max(0, Math.min(1, layer.opacity));
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation || 0) * Math.PI / 180);
      ctx.scale(sx, sy);
      try { ctx.drawImage(layer.image, -layer.baseW / 2, -layer.baseH / 2, layer.baseW, layer.baseH); } catch {}
      if (layer.id === state.selected && !state.exporting) drawSelectionLocal(layer);
      ctx.restore();
      if (layer.id === state.selected && !state.exporting) drawHandle(layer);
    };
    drawLayer.__proV2 = true;

    toLayerLocal = function proToLayerLocal(layer, x, y) {
      if (!layer || layer.type !== "sticker") return nativeToLayerLocal(layer, x, y);
      const rad = -(layer.rotation || 0) * Math.PI / 180;
      const dx = x - layer.x, dy = y - layer.y;
      const sx = Math.max(.0001, (layer.scale || 1) * (layer.scaleX || 1));
      const sy = Math.max(.0001, (layer.scale || 1) * (layer.scaleY || 1));
      return {
        x: (dx * Math.cos(rad) - dy * Math.sin(rad)) / sx,
        y: (dx * Math.sin(rad) + dy * Math.cos(rad)) / sy
      };
    };

    layerHandle = function proLayerHandle(layer) {
      if (!layer || layer.type !== "sticker") return nativeLayerHandle(layer);
      const b = baseBounds(layer);
      const sx = (layer.scale || 1) * (layer.scaleX || 1);
      const sy = (layer.scale || 1) * (layer.scaleY || 1);
      const rad = (layer.rotation || 0) * Math.PI / 180;
      const lx = b.w / 2 * sx, ly = b.h / 2 * sy;
      return { x: layer.x + lx * Math.cos(rad) - ly * Math.sin(rad), y: layer.y + lx * Math.sin(rad) + ly * Math.cos(rad) };
    };
  }

  function injectImageTools() {
    const tools = qid("layerTools");
    if (!tools || qid("proImageTools")) return;
    const box = document.createElement("div");
    box.id = "proImageTools";
    box.className = "pro-image-tools hidden";
    box.innerHTML = `
      <div class="pro-image-head"><b>تحكم كامل في الصورة / اللوجو</b><small>اسحب الصورة مباشرة داخل الشاشة</small></div>
      <div class="pro-image-grid">
        <label>العرض <b id="proImageWidthOut">100%</b><input id="proImageWidth" type="range" min="20" max="400" value="100"></label>
        <label>الطول <b id="proImageHeightOut">100%</b><input id="proImageHeight" type="range" min="20" max="400" value="100"></label>
        <label>الشفافية <b id="proImageOpacityOut">100%</b><input id="proImageOpacity" type="range" min="0" max="100" value="100"></label>
      </div>
      <div class="pro-image-actions">
        <button id="proImageFill" class="btn" type="button">ملء الشاشة</button>
        <button id="proImageReset" class="btn" type="button">إعادة الأبعاد</button>
      </div>`;
    tools.appendChild(box);

    qid("proImageWidth").addEventListener("input", event => {
      const layer = selectedLayer(); if (!layer || layer.type !== "sticker") return;
      layer.scaleX = Number(event.target.value) / 100;
      qid("proImageWidthOut").textContent = `${event.target.value}%`;
    });
    qid("proImageHeight").addEventListener("input", event => {
      const layer = selectedLayer(); if (!layer || layer.type !== "sticker") return;
      layer.scaleY = Number(event.target.value) / 100;
      qid("proImageHeightOut").textContent = `${event.target.value}%`;
    });
    qid("proImageOpacity").addEventListener("input", event => {
      const layer = selectedLayer(); if (!layer || layer.type !== "sticker") return;
      layer.opacity = Number(event.target.value) / 100;
      qid("proImageOpacityOut").textContent = `${event.target.value}%`;
    });
    qid("proImageFill").addEventListener("click", () => {
      const layer = selectedLayer(); if (!layer || layer.type !== "sticker") return;
      const uniform = layer.scale || 1;
      layer.scaleX = canvas.width / Math.max(1, layer.baseW * uniform);
      layer.scaleY = canvas.height / Math.max(1, layer.baseH * uniform);
      layer.x = canvas.width / 2; layer.y = canvas.height / 2; layer.rotation = 0;
      syncProControls();
    });
    qid("proImageReset").addEventListener("click", () => {
      const layer = selectedLayer(); if (!layer || layer.type !== "sticker") return;
      layer.scaleX = 1; layer.scaleY = 1; layer.opacity = 1;
      syncProControls();
    });
  }

  function injectTextProtectionNotices() {
    const editor = qid("textEditor");
    if (!editor || qid("quranLockNote")) return;
    const lock = document.createElement("div");
    lock.id = "quranLockNote";
    lock.className = "quran-lock-note";
    lock.textContent = "نص الآية الأصلي محمي من التعديل. يمكنك تغيير الخط والحجم واللون والظل والمكان فقط.";
    const meta = document.createElement("div");
    meta.id = "quranMetaBadge";
    meta.className = "quran-meta-badge";
    meta.textContent = "هذا هو العنوان السفلي فقط — يمكنك استبدال اسم السورة ورقم الآيات باسم القناة أو أي نص خاص بك.";
    editor.prepend(meta);
    editor.prepend(lock);
  }

  function quranDefaultMeta() {
    const option = qid("qrSurah")?.selectedOptions?.[0];
    let name = String(option?.textContent || "سورة القرآن").trim().replace(/^\s*\d+\.?\s*/, "").split("—")[0].trim();
    if (!/^سورة\s/.test(name)) name = `سورة ${name}`;
    const from = qid("qrFrom")?.value || 1;
    const to = qid("qrTo")?.value || from;
    return `${name} • الآيات ${from}–${to}`;
  }

  function findOrCreateQuranMeta() {
    const quran = state.layers.find(layer => layer.quranTimed);
    if (!quran) return null;
    let meta = state.layers.find(layer => layer.quranMeta);
    if (!meta) {
      meta = state.layers.find(layer => layer.type === "text" && !layer.quranTimed && layer.y > canvas.height * .76 && /(سورة|الآيات|آية)/.test(layer.text || ""));
      if (meta) meta.quranMeta = true;
    }
    if (!meta) {
      const size = Math.max(24, canvas.width * .025);
      meta = {
        id: `quran-meta-${Date.now()}`, type: "text", name: "العنوان السفلي — قابل للتعديل",
        text: quranDefaultMeta(), visible: true, x: canvas.width / 2, y: canvas.height * .92,
        rotation: 0, scale: 1, font: "Cairo", size, color: "#ffffff", bg: "#000000",
        bgOpacity: .45, shadow: "#000000", shadowBlur: 8, padX: 18, padY: 9,
        quranMeta: true, metaManual: false
      };
      state.layers.push(meta);
      renderLayersList();
    }
    return meta;
  }

  function refreshDefaultMeta() {
    const meta = findOrCreateQuranMeta();
    if (!meta || meta.metaManual) return;
    meta.text = quranDefaultMeta();
    meta.name = "العنوان السفلي — قابل للتعديل";
  }

  function rememberQuranOverride(layer) {
    if (!layer?.quranTimed) return;
    layer.quranEditorOverride = {
      x: layer.x, y: layer.y, rotation: layer.rotation, scale: layer.scale,
      font: layer.font, size: layer.size, color: layer.color, bg: layer.bg,
      bgOpacity: layer.bgOpacity, shadow: layer.shadow, shadowBlur: layer.shadowBlur
    };
  }

  function applyQuranOverride() {
    const layer = state.layers.find(item => item.quranTimed && item.quranEditorOverride);
    if (!layer) return;
    Object.assign(layer, layer.quranEditorOverride);
  }

  function syncProControls() {
    const layer = selectedLayer();
    const imageTools = qid("proImageTools");
    if (imageTools) imageTools.classList.toggle("hidden", !layer || layer.type !== "sticker");
    if (layer?.type === "sticker") {
      const width = Math.round((layer.scaleX || 1) * 100);
      const height = Math.round((layer.scaleY || 1) * 100);
      const opacity = Math.round((layer.opacity == null ? 1 : layer.opacity) * 100);
      qid("proImageWidth").value = width; qid("proImageWidthOut").textContent = `${width}%`;
      qid("proImageHeight").value = height; qid("proImageHeightOut").textContent = `${height}%`;
      qid("proImageOpacity").value = opacity; qid("proImageOpacityOut").textContent = `${opacity}%`;
    }

    const text = qid("textContent");
    const lock = qid("quranLockNote");
    const metaBadge = qid("quranMetaBadge");
    const isQuran = !!layer?.quranTimed;
    const isMeta = !!layer?.quranMeta;
    if (text) {
      text.readOnly = isQuran;
      text.classList.toggle("quran-locked", isQuran);
    }
    lock?.classList.toggle("show", isQuran);
    metaBadge?.classList.toggle("show", isMeta);

    if (layer?.type === "text" && typeof activateTab === "function") {
      activateTab("text");
    } else if (layer?.type === "sticker" && typeof activateTab === "function") {
      activateTab("layers");
    }
  }

  function installSelectionHooks() {
    document.addEventListener("pointerdown", event => {
      if (event.target.closest?.("#stage")) {
        const before = selectedLayer();
        editingQuranPosition = !!before?.quranTimed;
        setTimeout(syncProControls, 0);
      }
    }, true);
    document.addEventListener("pointermove", event => {
      if (!editingQuranPosition || !event.target.closest?.("#stage")) return;
      setTimeout(() => {
        const layer = selectedLayer();
        if (layer?.quranTimed) rememberQuranOverride(layer);
      }, 0);
    }, true);
    document.addEventListener("pointerup", event => {
      if (event.target.closest?.("#stage")) {
        setTimeout(() => {
          const layer = selectedLayer();
          if (layer?.quranTimed) rememberQuranOverride(layer);
          editingQuranPosition = false;
          syncProControls();
        }, 0);
      }
    }, true);
    document.addEventListener("click", event => {
      if (event.target.closest?.("#layers .layer")) setTimeout(syncProControls, 0);
    }, true);

    const styleIds = ["fontFamily", "fontSize", "textRotation", "textColor", "bgColor", "shadowColor", "bgOpacity", "shadowBlur", "layerScale", "layerRotation"];
    styleIds.forEach(id => qid(id)?.addEventListener("input", () => {
      const layer = selectedLayer();
      if (layer?.quranTimed) setTimeout(() => rememberQuranOverride(layer), 0);
    }));
    qid("fontFamily")?.addEventListener("change", () => {
      const layer = selectedLayer();
      if (layer?.quranTimed) setTimeout(() => rememberQuranOverride(layer), 0);
    });
    qid("textContent")?.addEventListener("input", () => {
      const layer = selectedLayer();
      if (layer?.quranMeta) {
        layer.metaManual = true;
        const demo = qid("qrDemoMeta"); if (demo) demo.textContent = layer.text;
      }
    });
  }

  function installQuranMetaHooks() {
    ["qrSurah", "qrFrom", "qrTo"].forEach(id => {
      const el = qid(id);
      if (!el) return;
      el.addEventListener(id === "qrSurah" ? "change" : "input", () => setTimeout(refreshDefaultMeta, 0));
    });
    const status = qid("qrStatus");
    if (status) {
      const observer = new MutationObserver(() => {
        if (/تم تجهيز|جاهز للمراجعة|جاهز:/.test(status.textContent || "")) {
          setTimeout(() => { refreshDefaultMeta(); renderLayersList(); }, 20);
        }
      });
      observer.observe(status, { childList: true, subtree: true, characterData: true });
    }
    document.addEventListener("click", event => {
      if (event.target.closest?.("#qrOpenEditor")) setTimeout(() => { refreshDefaultMeta(); syncProControls(); }, 80);
    }, true);
  }

  function raf() {
    try {
      applyQuranOverride();
      const meta = state.layers.find(layer => layer.quranMeta);
      if (meta && qid("qrDemoMeta")) qid("qrDemoMeta").textContent = meta.text || "";
      if (state.selected !== lastSelected) {
        lastSelected = state.selected;
        syncProControls();
      }
    } catch {}
    requestAnimationFrame(raf);
  }

  function install() {
    injectStyles();
    injectFonts();
    installQuickSearchChips();
    installMainSearchInterceptors();
    installImageTransformSupport();
    injectImageTools();
    injectTextProtectionNotices();
    installSelectionHooks();
    if (qid("quranStudio")) {
      installQuranQuickSearch();
      installQuranSearchInterceptors();
      installQuranMetaHooks();
      refreshDefaultMeta();
    } else {
      const timer = setInterval(() => {
        if (!qid("quranStudio")) return;
        clearInterval(timer);
        injectFonts(); installQuranQuickSearch(); installQuranSearchInterceptors(); installQuranMetaHooks(); refreshDefaultMeta();
      }, 120);
    }
    requestAnimationFrame(raf);
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForCore);
  else waitForCore();
})();
