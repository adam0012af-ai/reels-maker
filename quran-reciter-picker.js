"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const state = { tartil: true, tajwid: true, observer: null };

  const ARABIC_NAMES = new Map([
    ["ar.alafasy", "مشاري راشد العفاسي"],
    ["ar.husary", "محمود خليل الحصري"],
    ["ar.minshawi", "محمد صديق المنشاوي"],
    ["ar.minshawimujawwad", "محمد صديق المنشاوي"],
    ["ar.sudais", "عبدالرحمن السديس"],
    ["ar.shuraim", "سعود الشريم"],
    ["ar.abdulbasit", "عبد الباسط عبد الصمد"],
    ["ar.abdulbasitmujawwad", "عبد الباسط عبد الصمد"],
    ["ar.ajamy", "أحمد بن علي العجمي"],
    ["ar.muhammadayoub", "محمد أيوب"],
    ["ar.hudhaify", "علي الحذيفي"],
    ["ar.muhammadjibreel", "محمد جبريل"]
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
      .qr-reciter-native-field{display:none!important}
      .qr-reciter-inline{position:relative;margin-bottom:8px}
      .qr-reciter-main{
        width:100%;min-height:52px;padding:0 13px;border:1px solid rgba(255,255,255,.13);border-radius:14px;
        background:#121823;color:#fff;display:flex;align-items:center;gap:10px;cursor:pointer;text-align:right;
        font:700 12px Cairo,sans-serif;-webkit-tap-highlight-color:transparent
      }
      .qr-reciter-main-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .qr-reciter-main-arrow{font-size:18px;color:#9eabc1;transition:.18s transform}
      .qr-reciter-inline.open .qr-reciter-main-arrow{transform:rotate(180deg)}
      .qr-reciter-dropdown{
        display:none;position:absolute;z-index:1000;top:calc(100% + 7px);left:0;right:0;border:1px solid rgba(255,255,255,.12);
        border-radius:15px;background:#0d121a;box-shadow:0 18px 55px rgba(0,0,0,.5);overflow:hidden
      }
      .qr-reciter-inline.open .qr-reciter-dropdown{display:block}
      .qr-reciter-filters{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:9px;border-bottom:1px solid rgba(255,255,255,.07)}
      .qr-reciter-filter{
        min-height:40px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#151c28;color:#9da8ba;
        font:700 11px Cairo,sans-serif;cursor:pointer
      }
      .qr-reciter-filter.on{color:#fff;border-color:rgba(56,211,159,.45);background:rgba(56,211,159,.12)}
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
      .qr-reciter-empty{padding:24px 10px;text-align:center;color:#8f9aab;font-size:10px}
      @media(max-width:700px){.qr-reciter-list{max-height:260px}.qr-reciter-main{min-height:50px}}
    `;
    document.head.appendChild(style);
  }

  function modeFor(option) {
    const hay = `${option.value || ""} ${option.textContent || ""}`.toLowerCase();
    return /(mujawwad|mujawad|tajw|مجود|تجويد)/i.test(hay) ? "tajwid" : "tartil";
  }

  function cleanName(option) {
    const mapped = ARABIC_NAMES.get(option.value);
    if (mapped) return mapped;
    let text = String(option.textContent || option.value || "قارئ").trim();
    text = text.replace(/\s*[—–-]\s*ar\.[a-z0-9._-]+\s*$/i, "").trim();
    text = text.replace(/\s*[—–-]\s*(مجود|مرتل|تجويد|ترتيل|معلم)\s*$/i, "").trim();
    return text || option.value || "قارئ";
  }

  function actualOptions(select) {
    const all = [...select.options].filter(option => {
      const value = String(option.value || "").trim();
      const text = String(option.textContent || "");
      return value && !/جاري|تحميل|غير متاح/i.test(text);
    });
    const native = all.filter(option => option.dataset.verifiedFallback !== "1");
    const pool = native.length ? native : all;
    const seen = new Set();
    return pool.filter(option => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }

  function visibleOptions(select) {
    return actualOptions(select).filter(option => {
      const mode = modeFor(option);
      return (mode === "tartil" && state.tartil) || (mode === "tajwid" && state.tajwid);
    });
  }

  function updateCount() {
    const select = qid("qrReciter"), count = qid("qrReciterCount");
    if (!select || !count) return;
    count.textContent = `${actualOptions(select).length} قارئ متاح`;
  }

  function updateMainButton() {
    const select = qid("qrReciter"), button = qid("qrReciterPickerBtn");
    if (!select || !button) return;
    const selected = select.selectedOptions?.[0] || actualOptions(select)[0];
    button.querySelector(".qr-reciter-main-name").textContent = selected ? cleanName(selected) : "اختر القارئ";
    updateCount();
  }

  function closeDropdown() {
    qid("qrReciterInline")?.classList.remove("open");
  }

  function renderList() {
    const select = qid("qrReciter"), list = qid("qrReciterInlineList");
    if (!select || !list) return;
    const items = visibleOptions(select);
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<div class="qr-reciter-empty">لا توجد أصوات في الاختيار الحالي.</div>';
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
        await previewSelectedReciter();
      });

      row.append(choose, preview);
      list.appendChild(row);
    });
  }

  async function previewSelectedReciter() {
    const select = qid("qrReciter"), audio = qid("qrMiniAudio"), status = qid("qrStatus");
    if (!select || !audio || !select.value) return;
    const surah = Number(qid("qrSurah")?.value || 1);
    const from = Number(qid("qrFrom")?.value || 1);
    const name = cleanName(select.selectedOptions?.[0]);

    try {
      if (status) {
        status.textContent = `جاري تشغيل ${name}...`;
        status.className = "qr-status";
      }
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/${encodeURIComponent(select.value)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.code && payload.code !== 200) throw new Error(payload.status || `HTTP ${response.status}`);
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
      if (status) {
        status.textContent = `تعذر تشغيل ${name}: ${error?.message || error}`;
        status.className = "qr-status err";
      }
    }
  }

  function installPreviewButton() {
    const old = qid("qrReciterPreview");
    if (!old || old.dataset.inlinePicker === "1") return;
    const fresh = old.cloneNode(true);
    fresh.dataset.inlinePicker = "1";
    old.replaceWith(fresh);
    fresh.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      previewSelectedReciter();
    });
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
        <span class="qr-reciter-main-name">اختر القارئ</span>
        <span class="qr-reciter-main-arrow">⌄</span>
      </button>
      <div class="qr-reciter-dropdown">
        <div class="qr-reciter-filters">
          <button class="qr-reciter-filter on" data-filter="tartil" type="button">✓ ترتيل</button>
          <button class="qr-reciter-filter on" data-filter="tajwid" type="button">✓ تجويد</button>
        </div>
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
        button.textContent = `${next ? "✓" : "○"} ${key === "tartil" ? "ترتيل" : "تجويد"}`;
        renderList();
      });
    });

    document.addEventListener("pointerdown", event => {
      if (!block.contains(event.target)) closeDropdown();
    });
  }

  function watchOptions(select) {
    state.observer?.disconnect();
    state.observer = new MutationObserver(() => {
      updateMainButton();
      if (qid("qrReciterInline")?.classList.contains("open")) renderList();
    });
    state.observer.observe(select, { childList: true, subtree: true, characterData: true });
  }

  function install(studio, select) {
    if (studio.dataset.reciterInlinePicker === "1") return;
    studio.dataset.reciterInlinePicker = "1";
    injectStyles();
    injectPicker(select);
    installPreviewButton();
    watchOptions(select);
    select.addEventListener("change", updateMainButton);
    [100, 600, 1500, 3200, 6000].forEach(ms => setTimeout(() => {
      updateMainButton();
      if (qid("qrReciterInline")?.classList.contains("open")) renderList();
    }, ms));
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();
