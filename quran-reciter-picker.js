"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const state = {
    tartil: true,
    tajwid: true,
    observer: null,
    catalog: [],
    catalogReady: false,
    catalogLoading: false,
    applying: false,
    lastError: ""
  };

  const ARABIC_NAMES = new Map([
    ["ar.alafasy", "مشاري راشد العفاسي"],
    ["ar.husary", "محمود خليل الحصري"],
    ["ar.abdulbasitmurattal", "عبد الباسط عبد الصمد"],
    ["ar.abdurrahmaansudais", "عبد الرحمن السديس"],
    ["ar.minshawi", "محمد صديق المنشاوي"],
    ["ar.minshawimujawwad", "محمد صديق المنشاوي"],
    ["ar.abdulbasitmujawwad", "عبد الباسط عبد الصمد"],
    ["ar.hudhaify", "علي الحذيفي"],
    ["ar.shuraym", "سعود الشريم"],
    ["ar.muhammadjibreel", "محمد جبريل"],
    ["ar.muhammadayyoub", "محمد أيوب"],
    ["ar.mahermuaiqly", "ماهر المعيقلي"],
    ["ar.saadalghamdi", "سعد الغامدي"],
    ["ar.ahmedajamy", "أحمد بن علي العجمي"],
    ["ar.basfar", "عبد الله بصفر"]
  ]);

  function waitForStudio() {
    const studio = qid("quranStudio"), select = qid("qrReciter");
    if (!studio || !select) return setTimeout(waitForStudio, 120);
    install(studio, select);
  }

  function injectStyles() {
    if (qid("qrReciterInlineStyles")) return;
    const style = document.createElement("style");
    style.id = "qrReciterInlineStyles";
    style.textContent = `
      #qrReciterSearch{display:none!important}
      #qrReciterPreview{display:none!important}
      .qr-reciter-native-field{display:none!important}
      .qr-reciter-inline{position:relative;margin-bottom:8px}
      .qr-reciter-main{
        width:100%;min-height:52px;padding:0 13px;border:1px solid rgba(255,255,255,.13);border-radius:14px;
        background:#121823;color:#fff;display:flex;align-items:center;gap:10px;cursor:pointer;text-align:right;
        font:700 12px Cairo,sans-serif;-webkit-tap-highlight-color:transparent
      }
      .qr-reciter-main:disabled{opacity:.7;cursor:wait}
      .qr-reciter-main-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .qr-reciter-main-state{font-size:8px;color:#8390a5;white-space:nowrap}
      .qr-reciter-main-arrow{font-size:18px;color:#9eabc1;transition:.18s transform}
      .qr-reciter-inline.open .qr-reciter-main-arrow{transform:rotate(180deg)}
      .qr-reciter-dropdown{
        display:none;position:absolute;z-index:1000;top:calc(100% + 7px);left:0;right:0;border:1px solid rgba(255,255,255,.12);
        border-radius:15px;background:#0d121a;box-shadow:0 18px 55px rgba(0,0,0,.5);overflow:hidden
      }
      .qr-reciter-inline.open .qr-reciter-dropdown{display:block}
      .qr-reciter-verified-note{padding:8px 10px 0;color:#7f8b9f;font-size:8px;line-height:1.6}
      .qr-reciter-filters{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:9px;border-bottom:1px solid rgba(255,255,255,.07)}
      .qr-reciter-filter{
        min-height:40px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#151c28;color:#9da8ba;
        font:700 11px Cairo,sans-serif;cursor:pointer
      }
      .qr-reciter-filter.on{color:#fff;border-color:rgba(56,211,159,.45);background:rgba(56,211,159,.12)}
      .qr-reciter-refresh-wrap{padding:0 9px 8px;border-bottom:1px solid rgba(255,255,255,.07)}
      .qr-reciter-refresh{width:100%;min-height:34px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#111722;color:#9eabba;font:600 9px Cairo,sans-serif;cursor:pointer}
      .qr-reciter-refresh:disabled{opacity:.55;cursor:wait}
      .qr-reciter-list{max-height:310px;overflow:auto;padding:7px;-webkit-overflow-scrolling:touch}
      .qr-reciter-row{display:flex;align-items:center;gap:6px;margin-bottom:5px}
      .qr-reciter-choose{
        flex:1;min-width:0;min-height:43px;border:1px solid transparent;border-radius:10px;background:#121923;color:#fff;
        padding:0 11px;text-align:right;font:600 11px Cairo,sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
      }
      .qr-reciter-choose.selected{border-color:rgba(56,211,159,.4);background:rgba(56,211,159,.09)}
      .qr-reciter-preview{
        width:43px;height:43px;flex:0 0 43px;border:1px solid rgba(56,211,159,.22);border-radius:10px;
        background:rgba(56,211,159,.09);color:#8ee3c5;cursor:pointer;font-size:14px
      }
      .qr-reciter-preview.loading{opacity:.6;cursor:wait}
      .qr-reciter-empty{padding:24px 10px;text-align:center;color:#8f9aab;font-size:10px;line-height:1.8}
      @media(max-width:700px){.qr-reciter-list{max-height:260px}.qr-reciter-main{min-height:50px}.qr-reciter-main-state{display:none}}
    `;
    document.head.appendChild(style);
  }

  function modeFor(option) {
    if (option?.dataset?.mode === "tajwid") return "tajwid";
    if (option?.dataset?.mode === "tartil") return "tartil";
    const hay = `${option?.value || ""} ${option?.textContent || ""}`.toLowerCase();
    return /(mujawwad|mujawad|tajw|مجود|تجويد)/i.test(hay) ? "tajwid" : "tartil";
  }

  function cleanName(option) {
    if (!option) return "اختر القارئ";
    const mapped = ARABIC_NAMES.get(option.value);
    if (mapped) return mapped;
    let text = String(option.dataset?.name || option.textContent || option.value || "قارئ").trim();
    text = text.replace(/\s*[—–-]\s*ar\.[a-z0-9._-]+\s*$/i, "").trim();
    text = text.replace(/\s*[—–-]\s*(مجود|مرتل|تجويد|ترتيل|معلم)\s*$/i, "").trim();
    return text || option.value || "قارئ";
  }

  function actualOptions(select) {
    if (!state.catalogReady) return [];
    return [...select.options].filter(option => option.value && option.dataset.quranVerified === "1");
  }

  function visibleOptions(select) {
    return actualOptions(select).filter(option => {
      const mode = modeFor(option);
      return (mode === "tartil" && state.tartil) || (mode === "tajwid" && state.tajwid);
    });
  }

  function updateFilterLabels() {
    const select = qid("qrReciter");
    if (!select) return;
    const all = actualOptions(select);
    const tartil = all.filter(o => modeFor(o) === "tartil").length;
    const tajwid = all.filter(o => modeFor(o) === "tajwid").length;
    const a = qid("qrReciterFilterTartil"), b = qid("qrReciterFilterTajwid");
    if (a) a.textContent = `${state.tartil ? "✓" : "○"} ترتيل (${tartil})`;
    if (b) b.textContent = `${state.tajwid ? "✓" : "○"} تجويد (${tajwid})`;
  }

  function updateCount() {
    const select = qid("qrReciter"), count = qid("qrReciterCount"), mainState = qid("qrReciterMainState");
    if (!select) return;
    let text;
    if (state.catalogLoading) text = "جاري فحص الأصوات فعليًا...";
    else if (!state.catalogReady) text = state.lastError || "لم يكتمل فحص الأصوات";
    else text = `${actualOptions(select).length} قارئ تم التحقق من صوته`;
    if (count) count.textContent = text;
    if (mainState) mainState.textContent = state.catalogReady ? `${actualOptions(select).length} شغال` : "فحص...";
    updateFilterLabels();
  }

  function updateMainButton() {
    const select = qid("qrReciter"), button = qid("qrReciterPickerBtn");
    if (!select || !button) return;
    const selected = select.selectedOptions?.[0] || actualOptions(select)[0];
    button.querySelector(".qr-reciter-main-name").textContent = state.catalogLoading
      ? "جاري التحقق من أصوات القراء..."
      : selected ? cleanName(selected) : "لا توجد أصوات مؤكدة الآن";
    button.disabled = state.catalogLoading && !state.catalogReady;
    updateCount();
  }

  function closeDropdown() {
    qid("qrReciterInline")?.classList.remove("open");
  }

  function applyCatalogToSelect(select, preferredValue = "") {
    if (!select || state.applying) return;
    state.applying = true;
    const previous = preferredValue || select.value;
    const fragment = document.createDocumentFragment();
    state.catalog.forEach(reciter => {
      const option = document.createElement("option");
      option.value = reciter.identifier;
      option.textContent = reciter.name || reciter.englishName || reciter.identifier;
      option.dataset.name = reciter.name || "";
      option.dataset.mode = reciter.mode === "tajwid" ? "tajwid" : "tartil";
      option.dataset.quranVerified = "1";
      fragment.appendChild(option);
    });
    select.replaceChildren(fragment);
    if (previous && [...select.options].some(o => o.value === previous)) select.value = previous;
    else if (select.options.length) select.selectedIndex = 0;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    queueMicrotask(() => { state.applying = false; });
  }

  async function loadVerifiedCatalog(force = false) {
    if (state.catalogLoading) return;
    const select = qid("qrReciter");
    if (!select) return;
    const preferred = select.value;
    state.catalogLoading = true;
    state.lastError = "";
    updateMainButton();
    renderList();
    const refresh = qid("qrReciterRefresh");
    if (refresh) refresh.disabled = true;

    try {
      const response = await fetch(`/api/quran-reciter-catalog${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const reciters = Array.isArray(data.reciters) ? data.reciters : [];
      state.catalog = reciters.filter(r => r?.identifier && r?.name).map(r => ({
        identifier: String(r.identifier),
        name: String(r.name),
        englishName: String(r.englishName || ""),
        mode: r.mode === "tajwid" ? "tajwid" : "tartil"
      }));
      state.catalogReady = true;
      applyCatalogToSelect(select, preferred);
      if (!state.catalog.length) state.lastError = "لم ينجح أي قارئ في اختبار الصوت الآن";
    } catch (error) {
      state.catalogReady = false;
      state.catalog = [];
      state.lastError = `تعذر فحص القراء: ${error?.message || error}`;
      state.applying = true;
      select.replaceChildren();
      queueMicrotask(() => { state.applying = false; });
    } finally {
      state.catalogLoading = false;
      if (refresh) refresh.disabled = false;
      updateMainButton();
      renderList();
    }
  }

  function removeFailedReciter(identifier) {
    state.catalog = state.catalog.filter(item => item.identifier !== identifier);
    const select = qid("qrReciter");
    if (select) applyCatalogToSelect(select);
    updateMainButton();
    renderList();
  }

  function renderList() {
    const select = qid("qrReciter"), list = qid("qrReciterInlineList");
    if (!select || !list) return;
    list.innerHTML = "";

    if (state.catalogLoading && !state.catalogReady) {
      list.innerHTML = '<div class="qr-reciter-empty">⏳ بنفحص كل قارئ بصوت حقيقي قبل ما يظهر لك.<br>مش هنظهر أي قارئ غير لما ملف الصوت يشتغل.</div>';
      return;
    }
    if (!state.catalogReady) {
      list.innerHTML = `<div class="qr-reciter-empty">${state.lastError || "تعذر تحميل الأصوات المؤكدة."}<br>اضغط «إعادة فحص الأصوات».</div>`;
      return;
    }

    const items = visibleOptions(select);
    if (!items.length) {
      list.innerHTML = '<div class="qr-reciter-empty">لا توجد أصوات شغالة في الاختيار الحالي.</div>';
      return;
    }

    items.forEach(option => {
      const row = document.createElement("div");
      row.className = "qr-reciter-row";

      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = `qr-reciter-choose${select.value === option.value ? " selected" : ""}`;
      choose.textContent = cleanName(option);
      choose.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        updateMainButton();
        renderList();
        closeDropdown();
      });

      const preview = document.createElement("button");
      preview.type = "button";
      preview.className = "qr-reciter-preview";
      preview.textContent = "▶";
      preview.title = `معاينة ${cleanName(option)}`;
      preview.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        updateMainButton();
        renderList();
        preview.classList.add("loading");
        preview.textContent = "…";
        try {
          await previewSelectedReciter();
          preview.textContent = "❚❚";
        } finally {
          preview.classList.remove("loading");
          setTimeout(() => { if (preview.isConnected) preview.textContent = "▶"; }, 1200);
        }
      });

      row.append(choose, preview);
      list.appendChild(row);
    });
  }

  async function previewSelectedReciter() {
    const select = qid("qrReciter"), audio = qid("qrMiniAudio"), status = qid("qrStatus");
    if (!select || !audio || !select.value) return;
    const identifier = select.value;
    const surah = Number(qid("qrSurah")?.value || 1);
    const from = Number(qid("qrFrom")?.value || 1);
    const name = cleanName(select.selectedOptions?.[0]);

    try {
      audio.pause();
      if (status) {
        status.textContent = `جاري تشغيل ${name}...`;
        status.className = "qr-status";
      }
      const apiUrl = `https://api.alquran.cloud/v1/surah/${surah}/${encodeURIComponent(identifier)}`;
      const response = await fetch(`/api/quran-json?url=${encodeURIComponent(apiUrl)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || (payload.code && payload.code !== 200)) throw new Error(payload.status || payload.error || `HTTP ${response.status}`);
      const data = payload.data ?? payload;
      const ayah = data.ayahs?.find(item => item.numberInSurah === from) || data.ayahs?.[0];
      if (!ayah?.audio) throw new Error("لا يوجد صوت لهذه الآية");

      audio.controls = true;
      audio.preload = "auto";
      audio.style.setProperty("display", "block", "important");
      audio.style.setProperty("width", "100%", "important");
      audio.style.setProperty("height", "44px", "important");
      audio.src = `/api/quran-media?url=${encodeURIComponent(ayah.audio)}`;
      audio.load();
      await audio.play();
      if (status) {
        status.textContent = `يعمل الآن صوت ${name} ✅`;
        status.className = "qr-status ok";
      }
    } catch (error) {
      removeFailedReciter(identifier);
      if (status) {
        status.textContent = `تم استبعاد ${name} لأنه لم يعمل الآن. اضغط إعادة الفحص لاحقًا لإرجاعه إذا عاد المصدر.`;
        status.className = "qr-status err";
      }
      throw error;
    }
  }

  function injectPicker(select) {
    if (qid("qrReciterInline")) return;
    qid("qrReciterSearch")?.closest("label")?.style.setProperty("display", "none", "important");
    select.closest("label")?.classList.add("qr-reciter-native-field");

    const previewButton = qid("qrReciterPreview");
    const block = document.createElement("div");
    block.id = "qrReciterInline";
    block.className = "qr-reciter-inline";
    block.innerHTML = `
      <button id="qrReciterPickerBtn" class="qr-reciter-main" type="button">
        <span class="qr-reciter-main-name">جاري فحص أصوات القراء...</span>
        <span id="qrReciterMainState" class="qr-reciter-main-state">فحص...</span>
        <span class="qr-reciter-main-arrow">⌄</span>
      </button>
      <div class="qr-reciter-dropdown">
        <div class="qr-reciter-verified-note">✓ لا يظهر في هذه القائمة إلا القارئ الذي اجتاز اختبار تشغيل صوت فعلي.</div>
        <div class="qr-reciter-filters">
          <button id="qrReciterFilterTartil" class="qr-reciter-filter on" data-filter="tartil" type="button">✓ ترتيل</button>
          <button id="qrReciterFilterTajwid" class="qr-reciter-filter on" data-filter="tajwid" type="button">✓ تجويد</button>
        </div>
        <div class="qr-reciter-refresh-wrap"><button id="qrReciterRefresh" class="qr-reciter-refresh" type="button">↻ إعادة فحص الأصوات وإضافة المتاح</button></div>
        <div id="qrReciterInlineList" class="qr-reciter-list"></div>
      </div>`;

    if (previewButton?.parentElement) previewButton.parentElement.insertBefore(block, previewButton);
    else select.closest("label")?.insertAdjacentElement("afterend", block);

    qid("qrReciterPickerBtn").addEventListener("click", event => {
      event.preventDefault();
      block.classList.toggle("open");
      if (block.classList.contains("open")) renderList();
    });

    block.querySelectorAll(".qr-reciter-filter").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        const key = button.dataset.filter;
        const next = !state[key];
        if (!next && ((key === "tartil" && !state.tajwid) || (key === "tajwid" && !state.tartil))) return;
        state[key] = next;
        button.classList.toggle("on", next);
        updateFilterLabels();
        renderList();
      });
    });

    qid("qrReciterRefresh")?.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      await loadVerifiedCatalog(true);
    });

    document.addEventListener("pointerdown", event => {
      if (!block.contains(event.target)) closeDropdown();
    });
  }

  function watchOptions(select) {
    state.observer?.disconnect();
    state.observer = new MutationObserver(() => {
      if (state.applying) return;
      if (state.catalogReady) {
        const hasUnverified = [...select.options].some(option => option.value && option.dataset.quranVerified !== "1");
        const verifiedCount = [...select.options].filter(option => option.dataset.quranVerified === "1").length;
        if (hasUnverified || verifiedCount !== state.catalog.length) {
          applyCatalogToSelect(select);
          return;
        }
      }
      updateMainButton();
      if (qid("qrReciterInline")?.classList.contains("open")) renderList();
    });
    state.observer.observe(select, { childList: true, subtree: true, characterData: true });
  }

  function install(studio, select) {
    if (studio.dataset.reciterInlinePicker === "2") return;
    studio.dataset.reciterInlinePicker = "2";
    injectStyles();
    injectPicker(select);
    watchOptions(select);
    select.addEventListener("change", updateMainButton);
    loadVerifiedCatalog(false);
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();
