"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let installed = false;

  function wait() {
    try {
      if (installed) return;
      if (typeof state === "undefined" || typeof renderCanvas !== "function" || typeof renderLayersList !== "function" || typeof syncSelectedControls !== "function") {
        return setTimeout(wait, 100);
      }
      install();
    } catch {
      setTimeout(wait, 120);
    }
  }

  function sourceLayer() {
    return state.layers.find(layer => layer.quranTimed) || null;
  }

  function displayLayer() {
    return state.layers.find(layer => layer.quranDisplay) || null;
  }

  function metaLayer() {
    return state.layers.find(layer => layer.quranMeta) || null;
  }

  function ensureDisplay(selectIt = false) {
    const source = sourceLayer();
    if (!source) return null;
    let display = displayLayer();
    if (!display) {
      display = {
        ...source,
        id: `quran-display-${Date.now()}`,
        name: "الآية — تصميم قابل للتحكم",
        visible: true,
        quranTimed: false,
        quranDisplay: true,
        quranSourceId: source.id,
        localObjectUrl: false
      };
      state.layers.push(display);
    }
    source.visible = false;
    source.proHiddenSource = true;
    source.name = "Quran Sync Source";
    display.quranSourceId = source.id;
    display.visible = display.visible !== false;
    if (selectIt || state.selected === source.id) state.selected = display.id;
    return display;
  }

  function syncVerseText() {
    const source = sourceLayer();
    const display = displayLayer();
    if (!source || !display) return;
    if (display.text !== source.text) display.text = source.text;
    const match = String(source.name || "").match(/آية\s*\d+/);
    display.name = match ? `${match[0]} — تصميم` : "الآية — تصميم قابل للتحكم";
  }

  function lockQuranTextEditor() {
    let layer = null;
    try { layer = state.layers.find(item => item.id === state.selected) || null; } catch {}
    const textarea = qid("textContent");
    if (!textarea) return;
    const locked = !!(layer?.quranDisplay || layer?.quranTimed);
    textarea.readOnly = locked;
    textarea.classList.toggle("quran-locked", locked);
    const lock = qid("quranLockNote");
    if (lock) lock.classList.toggle("show", locked);
    const meta = qid("quranMetaBadge");
    if (meta) meta.classList.toggle("show", !!layer?.quranMeta);
    if (locked) {
      textarea.value = layer.text || "";
      textarea.title = "نص الآية محفوظ من المصدر ولا يتم تعديله يدويًا";
    } else {
      textarea.removeAttribute("title");
    }
  }

  function wrapCanvas() {
    if (renderCanvas.__quranProxy) return;
    const native = renderCanvas;
    renderCanvas = function quranProxyRenderCanvas(...args) {
      syncVerseText();
      return native.apply(this, args);
    };
    renderCanvas.__quranProxy = true;
  }

  function wrapSyncControls() {
    if (syncSelectedControls.__quranProxy) return;
    const native = syncSelectedControls;
    syncSelectedControls = function quranProxySyncControls(...args) {
      const result = native.apply(this, args);
      lockQuranTextEditor();
      return result;
    };
    syncSelectedControls.__quranProxy = true;
  }

  function wrapLayersList() {
    if (renderLayersList.__quranProxy) return;
    renderLayersList = function quranProxyLayersList() {
      controls.layers.innerHTML = "";
      [...state.layers].reverse().filter(layer => !layer.proHiddenSource).forEach(layer => {
        const row = document.createElement("div");
        row.className = `layer${layer.id === state.selected ? " active" : ""}`;
        const icon = layer.quranDisplay ? "☪" : layer.quranMeta ? "Aa" : layer.type === "text" ? "T" : "✨";
        row.innerHTML = `<span class="type">${icon}</span><span class="name">${escapeHTML(layer.name || layer.text || "Layer")}</span><button class="eye">${layer.visible ? "◉" : "○"}</button>`;
        row.addEventListener("click", () => {
          state.selected = layer.id;
          renderLayersList();
          syncSelectedControls();
          if (layer.type === "text" && typeof activateTab === "function") activateTab("text");
          else if (layer.type === "sticker" && typeof activateTab === "function") activateTab("layers");
        });
        row.querySelector(".eye").addEventListener("click", event => {
          event.stopPropagation();
          layer.visible = !layer.visible;
          renderLayersList();
        });
        controls.layers.appendChild(row);
      });
    };
    renderLayersList.__quranProxy = true;
  }

  function installHooks() {
    const status = qid("qrStatus");
    if (status) {
      const observer = new MutationObserver(() => {
        if (/تم تجهيز|جاهز للمراجعة|جاهز:/.test(status.textContent || "")) {
          setTimeout(() => {
            ensureDisplay(false);
            syncVerseText();
            renderLayersList();
            lockQuranTextEditor();
          }, 25);
        }
      });
      observer.observe(status, { childList: true, subtree: true, characterData: true });
    }

    document.addEventListener("click", event => {
      if (event.target.closest?.("#qrOpenEditor")) {
        setTimeout(() => {
          const display = ensureDisplay(true);
          if (display) {
            state.selected = display.id;
            renderLayersList();
            syncSelectedControls();
            if (typeof activateTab === "function") activateTab("text");
          }
        }, 100);
      }
    }, true);

    document.addEventListener("pointerup", event => {
      if (!event.target.closest?.("#stage")) return;
      setTimeout(lockQuranTextEditor, 0);
    }, true);

    qid("textContent")?.addEventListener("beforeinput", event => {
      const layer = state.layers.find(item => item.id === state.selected);
      if (layer?.quranDisplay || layer?.quranTimed) event.preventDefault();
    }, true);
  }

  function maintenance() {
    try {
      const source = sourceLayer();
      if (source) {
        const display = ensureDisplay(false);
        if (display) syncVerseText();
      }
      lockQuranTextEditor();
      const meta = metaLayer();
      if (meta && qid("qrDemoMeta")) qid("qrDemoMeta").textContent = meta.text || "";
    } catch {}
    setTimeout(maintenance, 180);
  }

  function install() {
    installed = true;
    wrapCanvas();
    wrapSyncControls();
    wrapLayersList();
    installHooks();
    ensureDisplay(false);
    renderLayersList();
    lockQuranTextEditor();
    maintenance();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", wait);
  else wait();
})();
