"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const state = { mode: "all", lastCount: -1, observer: null };

  function waitForStudio() {
    const studio = qid("quranStudio");
    const select = qid("qrReciter");
    if (!studio || !select) return setTimeout(waitForStudio, 140);
    install(studio, select);
  }

  function injectStyles() {
    if (qid("qrReciterPickerStyles")) return;
    const style = document.createElement("style");
    style.id = "qrReciterPickerStyles";
    style.textContent = `
      #qrReciterSearch { display:none!important; }
      #qrReciterSearchDisplayFix { display:none!important; }
      .qr-reciter-native-field { display:none!important; }
      .qr-reciter-picker-block { margin:0 0 10px; }
      .qr-reciter-picker-btn {
        width:100%; min-height:58px; border:1px solid rgba(255,255,255,.13); border-radius:15px;
        background:linear-gradient(135deg,rgba(28,104,81,.24),rgba(125,92,255,.10)),#121722;
        color:#fff; padding:10px 12px; display:flex; align-items:center; gap:10px; text-align:right;
        cursor:pointer; -webkit-tap-highlight-color:transparent;
      }
      .qr-reciter-picker-btn:active { transform:scale(.992); }
      .qr-reciter-picker-icon { width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:0 0 38px;background:rgba(56,211,159,.14);font-size:18px; }
      .qr-reciter-picker-copy { flex:1;min-width:0; }
      .qr-reciter-picker-copy b { display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .qr-reciter-picker-copy small { display:block;color:#8f99ad;font-size:9px;margin-top:2px; }
      .qr-reciter-picker-arrow { color:#aeb7c8;font-size:15px; }

      .qr-reciter-picker-overlay {
        position:fixed;z-index:12050;inset:0;background:rgba(4,6,10,.88);backdrop-filter:blur(14px);
        display:none;align-items:center;justify-content:center;padding:16px;direction:rtl;
      }
      .qr-reciter-picker-overlay.open { display:flex; }
      .qr-reciter-picker-card {
        width:min(620px,100%);max-height:min(760px,92dvh);display:flex;flex-direction:column;overflow:hidden;
        border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#0e121a;box-shadow:0 28px 90px rgba(0,0,0,.6);
      }
      .qr-reciter-picker-head { display:flex;align-items:center;gap:10px;padding:14px 15px;border-bottom:1px solid rgba(255,255,255,.08);background:#121722; }
      .qr-reciter-picker-head-copy { flex:1;min-width:0; }
      .qr-reciter-picker-head-copy b { display:block;font-size:15px; }
      .qr-reciter-picker-head-copy span { color:#8993a7;font-size:10px; }
      .qr-reciter-picker-close { width:38px;height:38px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;font-size:20px;cursor:pointer; }
      .qr-reciter-modes { display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.07); }
      .qr-reciter-mode { min-height:42px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:#151a25;color:#9ba5b8;font:700 10px Cairo,sans-serif;cursor:pointer; }
      .qr-reciter-mode.active { color:#fff;border-color:rgba(56,211,159,.42);background:rgba(56,211,159,.12);box-shadow:inset 0 0 0 1px rgba(56,211,159,.07); }
      .qr-reciter-list { overflow:auto;padding:10px;display:flex;flex-direction:column;gap:7px;-webkit-overflow-scrolling:touch; }
      .qr-reciter-row { display:flex;align-items:stretch;gap:7px; }
      .qr-reciter-item {
        flex:1;min-width:0;min-height:58px;border:1px solid rgba(255,255,255,.085);border-radius:14px;background:#131823;color:#fff;
        display:flex;align-items:center;gap:10px;padding:9px 11px;text-align:right;cursor:pointer;
      }
      .qr-reciter-item.selected { border-color:rgba(56,211,159,.5);background:rgba(56,211,159,.09); }
      .qr-reciter-item-num { width:30px;height:30px;border-radius:10px;display:grid;place-items:center;flex:0 0 30px;background:rgba(255,255,255,.055);color:#9fa9bc;font-size:9px; }
      .qr-reciter-item-copy { flex:1;min-width:0; }
      .qr-reciter-item-copy b { display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .qr-reciter-item-copy small { display:block;color:#788397;font-size:8px;margin-top:2px;direction:ltr;text-align:right; }
      .qr-reciter-badge { flex:0 0 auto;border-radius:99px;padding:4px 7px;font-size:8px;font-weight:800;background:rgba(125,92,255,.12);color:#c8beff;border:1px solid rgba(125,92,255,.18); }
      .qr-reciter-badge.tajwid { background:rgba(255,191,71,.10);color:#f0ce82;border-color:rgba(255,191,71,.2); }
      .qr-reciter-play { width:50px;flex:0 0 50px;border:1px solid rgba(56,211,159,.22);border-radius:14px;background:rgba(56,211,159,.09);color:#92e8ca;font-size:15px;cursor:pointer; }
      .qr-reciter-empty { padding:34px 14px;text-align:center;color:#8d97aa;font-size:11px; }
      @media(max-width:700px){
        .qr-reciter-picker-overlay { padding:0;align-items:stretch; }
        .qr-reciter-picker-card { width:100%;max-height:100dvh;height:100dvh;border-radius:0;border:0; }
        .qr-reciter-picker-head { padding-top:calc(12px + env(safe-area-inset-top)); }
        .qr-reciter-list { padding-bottom:calc(14px + env(safe-area-inset-bottom)); }
        .qr-reciter-item { min-height:62px; }
      }
    `;
    document.head.appendChild(style);
  }

  function modeFor(option) {
    const hay = `${option.value || ""} ${option.textContent || ""}`.toLowerCase();
    return /(mujawwad|mujawad|tajw|مجود|تجويد)/i.test(hay) ? "tajwid" : "tartil";
  }

  function cleanName(option) {
    let text = String(option.textContent || option.value || "قارئ").trim();
    text = text.replace(/\s*[—–-]\s*ar\.[a-z0-9._-]+\s*$/i, "").trim();
    return text || option.value || "قارئ";
  }

  function currentOptions(select) {
    const seen = new Set();
    return [...select.options].filter(option => {
      const value = String(option.value || "").trim();
      const text = String(option.textContent || "");
      if (!value || /جاري|تحميل|غير متاح/i.test(text) || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function closePicker() {
    qid("qrReciterPicker")?.classList.remove("open");
    document.documentElement.style.overflow = "";
  }

  function openPicker() {
    renderList();
    qid("qrReciterPicker")?.classList.add("open");
    document.documentElement.style.overflow = "hidden";
  }

  function updateMainButton() {
    const select = qid("qrReciter"), button = qid("qrReciterPickerBtn");
    if (!select || !button) return;
    const options = currentOptions(select);
    const selected = select.selectedOptions?.[0] || options[0];
    const name = selected ? cleanName(selected) : "اختر القارئ";
    const mode = selected ? modeFor(selected) : "tartil";
    button.querySelector("b").textContent = name;
    button.querySelector("small").textContent = `${options.length} صوت تلاوة فعلي • ${mode === "tajwid" ? "تجويد" : "ترتيل"}`;
    const count = qid("qrReciterCount");
    if (count) count.textContent = `${options.length} صوتًا متاحًا — اضغط لاختيار القارئ`;
  }

  function chooseOption(value, { preview = false, close = true } = {}) {
    const select = qid("qrReciter");
    if (!select || ![...select.options].some(o => o.value === value)) return;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    updateMainButton();
    renderList();
    if (close) closePicker();
    if (preview) setTimeout(() => qid("qrReciterPreview")?.click(), 80);
  }

  function renderList() {
    const select = qid("qrReciter"), list = qid("qrReciterList"), title = qid("qrReciterPickerCount");
    if (!select || !list) return;
    const all = currentOptions(select);
    const items = all.filter(option => state.mode === "all" || modeFor(option) === state.mode);
    if (title) {
      const tartil = all.filter(o => modeFor(o) === "tartil").length;
      const tajwid = all.filter(o => modeFor(o) === "tajwid").length;
      title.textContent = `${all.length} صوت فعلي • ${tartil} ترتيل • ${tajwid} تجويد`;
    }
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<div class="qr-reciter-empty">لا توجد أصوات في هذا القسم حاليًا.</div>';
      return;
    }
    items.forEach((option, index) => {
      const mode = modeFor(option);
      const row = document.createElement("div");
      row.className = "qr-reciter-row";

      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = `qr-reciter-item${select.value === option.value ? " selected" : ""}`;
      choose.innerHTML = `<span class="qr-reciter-item-num">${index + 1}</span><span class="qr-reciter-item-copy"><b></b><small></small></span><span class="qr-reciter-badge ${mode === "tajwid" ? "tajwid" : ""}">${mode === "tajwid" ? "تجويد" : "ترتيل"}</span>`;
      choose.querySelector("b").textContent = cleanName(option);
      choose.querySelector("small").textContent = option.value;
      choose.addEventListener("click", () => chooseOption(option.value));

      const play = document.createElement("button");
      play.type = "button";
      play.className = "qr-reciter-play";
      play.setAttribute("aria-label", `معاينة ${cleanName(option)}`);
      play.textContent = "▶";
      play.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        chooseOption(option.value, { preview: true, close: false });
      });

      row.append(choose, play);
      list.appendChild(row);
    });
  }

  function injectPicker(select) {
    if (qid("qrReciterPickerBtn")) return;

    const search = qid("qrReciterSearch");
    const searchField = search?.closest("label");
    if (searchField) searchField.id = "qrReciterSearchDisplayFix";

    const nativeField = select.closest("label");
    nativeField?.classList.add("qr-reciter-native-field");

    const previewBtn = qid("qrReciterPreview");
    const block = document.createElement("div");
    block.className = "qr-reciter-picker-block";
    block.innerHTML = `
      <button id="qrReciterPickerBtn" class="qr-reciter-picker-btn" type="button">
        <span class="qr-reciter-picker-icon">🎙</span>
        <span class="qr-reciter-picker-copy"><b>اختر القارئ</b><small>تحميل أصوات التلاوة...</small></span>
        <span class="qr-reciter-picker-arrow">⌄</span>
      </button>`;
    if (previewBtn?.parentElement) previewBtn.parentElement.insertBefore(block, previewBtn);
    else nativeField?.insertAdjacentElement("afterend", block);

    const overlay = document.createElement("div");
    overlay.id = "qrReciterPicker";
    overlay.className = "qr-reciter-picker-overlay";
    overlay.innerHTML = `
      <div class="qr-reciter-picker-card" role="dialog" aria-modal="true" aria-label="اختيار قارئ القرآن">
        <div class="qr-reciter-picker-head">
          <div class="qr-reciter-picker-head-copy"><b>اختر القارئ وطريقة التلاوة</b><span id="qrReciterPickerCount">جاري تجهيز الأصوات...</span></div>
          <button id="qrReciterPickerClose" class="qr-reciter-picker-close" type="button" aria-label="إغلاق">×</button>
        </div>
        <div class="qr-reciter-modes">
          <button class="qr-reciter-mode active" data-mode="all" type="button">كل القرّاء</button>
          <button class="qr-reciter-mode" data-mode="tartil" type="button">ترتيل</button>
          <button class="qr-reciter-mode" data-mode="tajwid" type="button">تجويد</button>
        </div>
        <div id="qrReciterList" class="qr-reciter-list"></div>
      </div>`;
    document.body.appendChild(overlay);

    qid("qrReciterPickerBtn")?.addEventListener("click", openPicker);
    qid("qrReciterPickerClose")?.addEventListener("click", closePicker);
    overlay.addEventListener("click", event => { if (event.target === overlay) closePicker(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && overlay.classList.contains("open")) closePicker(); });

    overlay.querySelectorAll(".qr-reciter-mode").forEach(button => button.addEventListener("click", () => {
      state.mode = button.dataset.mode || "all";
      overlay.querySelectorAll(".qr-reciter-mode").forEach(x => x.classList.toggle("active", x === button));
      renderList();
    }));
  }

  function watchOptions(select) {
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver(() => {
      const count = currentOptions(select).length;
      if (count === state.lastCount) return;
      state.lastCount = count;
      updateMainButton();
      if (qid("qrReciterPicker")?.classList.contains("open")) renderList();
    });
    state.observer.observe(select, { childList: true, subtree: true, characterData: true });
  }

  function install(studio, select) {
    if (studio.dataset.reciterPicker === "1") return;
    studio.dataset.reciterPicker = "1";
    injectStyles();
    injectPicker(select);
    watchOptions(select);
    select.addEventListener("change", updateMainButton);
    [120, 700, 1700, 3500, 6000].forEach(ms => setTimeout(() => {
      updateMainButton();
      if (qid("qrReciterPicker")?.classList.contains("open")) renderList();
    }, ms));
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();
