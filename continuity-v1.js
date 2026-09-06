"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const VIEW_KEY = "reels-session-view-v1";
  const TAB_KEY = "reels-islamic-tab-v1";
  const STORY_KEY = "reels-islamic-story-v1";
  const QURAN_KEY = "reels-quran-settings";
  let installed = false;
  let desiredReciter = "";
  let lastUserReciter = "";
  let restoringReciter = false;
  let reciterObserver = null;

  function safeGet(storage, key, fallback = null) {
    try {
      const value = storage.getItem(key);
      return value == null ? fallback : value;
    } catch { return fallback; }
  }

  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); } catch {}
  }

  function readJson(storage, key) {
    try { return JSON.parse(storage.getItem(key) || "{}"); } catch { return {}; }
  }

  function writeJson(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function readQuran() {
    return readJson(localStorage, QURAN_KEY);
  }

  function writeQuran(patch) {
    const current = readQuran();
    const next = { ...current, ...patch };
    writeJson(localStorage, QURAN_KEY, next);
    return next;
  }

  function saveQuranControls({ includeReciter = false } = {}) {
    const patch = {
      surah: qid("qrSurah")?.value || undefined,
      from: qid("qrFrom")?.value || undefined,
      to: qid("qrTo")?.value || undefined,
      font: qid("qrFont")?.value || undefined,
      color: qid("qrColor")?.value || undefined,
      textBg: qid("qrTextBg")?.value || undefined,
      size: qid("qrSize")?.value || undefined,
      opacity: qid("qrOpacity")?.value || undefined,
      position: qid("qrPosition")?.value || undefined,
      verseNumber: qid("qrVerseNumber")?.checked,
      surahLabel: qid("qrSurahLabel")?.checked,
      shadow: qid("qrShadow")?.checked,
      quality: qid("qrQuality")?.value || undefined,
      fps: qid("qrFps")?.value || undefined
    };
    if (includeReciter) {
      const reciter = lastUserReciter || desiredReciter || qid("qrReciter")?.value;
      if (reciter) patch.reciter = reciter;
    }
    Object.keys(patch).forEach(key => patch[key] === undefined && delete patch[key]);
    writeQuran(patch);
  }

  function saveIslamicStoryState() {
    const state = {
      topic: qid("icStoryTopic")?.value || "",
      length: qid("icStoryLength")?.value || "medium",
      output: qid("icStoryOutput")?.value || "",
      scrollTop: document.querySelector(".ic-body")?.scrollTop || 0
    };
    writeJson(sessionStorage, STORY_KEY, state);
  }

  function restoreIslamicStoryState() {
    const state = readJson(sessionStorage, STORY_KEY);
    if (qid("icStoryTopic") && state.topic != null) qid("icStoryTopic").value = state.topic;
    if (qid("icStoryLength") && state.length) qid("icStoryLength").value = state.length;
    if (qid("icStoryOutput") && state.output != null) qid("icStoryOutput").value = state.output;
    const body = document.querySelector(".ic-body");
    if (body && Number.isFinite(Number(state.scrollTop))) setTimeout(() => { body.scrollTop = Number(state.scrollTop) || 0; }, 60);
  }

  function markView(view) {
    safeSet(sessionStorage, VIEW_KEY, view);
  }

  function markIslamicTab(tab) {
    if (tab) safeSet(sessionStorage, TAB_KEY, tab);
  }

  function restoreIslamicView() {
    if (safeGet(sessionStorage, VIEW_KEY, "main") !== "islamic") return;
    const launcher = qid("islamicContentLaunch");
    const library = qid("islamicContentLibrary");
    if (!launcher || !library) return false;
    if (!library.classList.contains("open")) launcher.click();
    const tab = safeGet(sessionStorage, TAB_KEY, "quran");
    const button = document.querySelector(`.ic-tab[data-ic-tab="${CSS.escape(tab)}"]`);
    button?.click();
    restoreIslamicStoryState();
    return true;
  }

  function restoreQuranView() {
    if (safeGet(sessionStorage, VIEW_KEY, "main") !== "quran") return;
    const launch = qid("quranStudioLaunch");
    const studio = qid("quranStudio");
    if (!launch || !studio) return false;
    if (!studio.classList.contains("open")) launch.click();
    return true;
  }

  function desiredQuranReciter() {
    return lastUserReciter || desiredReciter || readQuran().reciter || "";
  }

  function restoreReciterOnce() {
    const select = qid("qrReciter");
    const wanted = desiredQuranReciter();
    if (!select || !wanted) return false;
    const exists = [...select.options].some(option => option.value === wanted);
    if (!exists) return false;
    if (select.value !== wanted) {
      restoringReciter = true;
      select.value = wanted;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      queueMicrotask(() => { restoringReciter = false; });
    }
    desiredReciter = wanted;
    return true;
  }

  function restoreReciterRepeated() {
    let tries = 0;
    const tick = () => {
      tries += 1;
      if (restoreReciterOnce() || tries >= 40) return;
      setTimeout(tick, tries < 10 ? 100 : 250);
    };
    tick();
  }

  function restoreQuranFields() {
    const saved = readQuran();
    desiredReciter = saved.reciter || desiredReciter;
    const assign = (id, value) => {
      const el = qid(id);
      if (!el || value == null || value === "") return;
      el.value = String(value);
      el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    };

    if (saved.surah) assign("qrSurah", saved.surah);
    if (saved.from) assign("qrFrom", saved.from);
    if (saved.to) assign("qrTo", saved.to);
    restoreReciterRepeated();
  }

  function protectReciterAfterAyahChange() {
    const wanted = desiredQuranReciter() || qid("qrReciter")?.value || "";
    if (wanted) desiredReciter = wanted;
    [0, 80, 250, 700].forEach(delay => setTimeout(() => {
      restoreReciterOnce();
      saveQuranControls();
    }, delay));
  }

  function protectAyahAfterReciterChange(snapshot) {
    [0, 50, 180].forEach(delay => setTimeout(() => {
      const surah = qid("qrSurah"), from = qid("qrFrom"), to = qid("qrTo");
      if (surah && snapshot.surah && surah.value !== snapshot.surah) {
        surah.value = snapshot.surah;
        surah.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (from && snapshot.from) {
        from.value = snapshot.from;
        from.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (to && snapshot.to) {
        to.value = snapshot.to;
        to.dispatchEvent(new Event("input", { bubbles: true }));
      }
      saveQuranControls({ includeReciter: true });
    }, delay));
  }

  function bindGlobalClicks() {
    document.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (target.closest("#islamicContentLaunch")) {
        markView("islamic");
        setTimeout(restoreIslamicStoryState, 0);
        return;
      }

      const tab = target.closest(".ic-tab[data-ic-tab]");
      if (tab) {
        markView("islamic");
        markIslamicTab(tab.dataset.icTab || "quran");
        setTimeout(saveIslamicStoryState, 0);
        return;
      }

      if (target.closest("#icClose")) {
        saveIslamicStoryState();
        markView("main");
        return;
      }

      if (target.closest("#icOpenQuran") || target.closest("#quranStudioLaunch")) {
        saveIslamicStoryState();
        markView("quran");
        return;
      }

      if (target.closest("#qrClose")) {
        saveQuranControls({ includeReciter: true });
        markView("main");
        return;
      }

      const reciterChoice = target.closest(".qr-reciter-choose, .qr-reciter-preview");
      if (reciterChoice) {
        const snapshot = {
          surah: qid("qrSurah")?.value || "",
          from: qid("qrFrom")?.value || "",
          to: qid("qrTo")?.value || ""
        };
        setTimeout(() => {
          const selected = qid("qrReciter")?.value || "";
          if (selected) {
            lastUserReciter = selected;
            desiredReciter = selected;
            writeQuran({ reciter: selected });
          }
          protectAyahAfterReciterChange(snapshot);
        }, 0);
      }
    }, false);
  }

  function bindIslamicInputs() {
    document.addEventListener("input", event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.matches("#icStoryTopic,#icStoryOutput")) saveIslamicStoryState();
    });
    document.addEventListener("change", event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.matches("#icStoryLength")) saveIslamicStoryState();
    });
    document.querySelector(".ic-body")?.addEventListener("scroll", () => saveIslamicStoryState(), { passive: true });
  }

  function bindQuranControls() {
    const surah = qid("qrSurah"), from = qid("qrFrom"), to = qid("qrTo"), reciter = qid("qrReciter");
    if (!surah || !from || !to || !reciter) return false;

    desiredReciter = readQuran().reciter || reciter.value || "";

    surah.addEventListener("change", () => {
      protectReciterAfterAyahChange();
      saveQuranControls();
    }, true);
    from.addEventListener("input", () => {
      protectReciterAfterAyahChange();
      saveQuranControls();
    }, true);
    to.addEventListener("input", () => {
      protectReciterAfterAyahChange();
      saveQuranControls();
    }, true);

    reciter.addEventListener("change", () => {
      if (restoringReciter) return;
      setTimeout(() => {
        const wanted = desiredQuranReciter();
        if (wanted && reciter.value !== wanted && [...reciter.options].some(option => option.value === wanted)) {
          restoreReciterOnce();
        }
      }, 0);
    }, true);

    ["qrFont","qrColor","qrTextBg","qrSize","qrOpacity","qrPosition","qrVerseNumber","qrSurahLabel","qrShadow","qrQuality","qrFps"].forEach(id => {
      const el = qid(id);
      if (!el) return;
      el.addEventListener("input", () => saveQuranControls());
      el.addEventListener("change", () => saveQuranControls());
    });

    reciterObserver?.disconnect();
    reciterObserver = new MutationObserver(() => {
      const wanted = desiredQuranReciter();
      if (wanted) restoreReciterRepeated();
    });
    reciterObserver.observe(reciter, { childList: true, subtree: true });

    restoreQuranFields();
    return true;
  }

  function restoreOpenView() {
    let tries = 0;
    const tick = () => {
      tries += 1;
      const view = safeGet(sessionStorage, VIEW_KEY, "main");
      const ok = view === "islamic" ? restoreIslamicView() : view === "quran" ? restoreQuranView() : true;
      if (!ok && tries < 50) setTimeout(tick, 100);
    };
    tick();
  }

  function install() {
    if (installed) return;
    installed = true;
    bindGlobalClicks();
    bindIslamicInputs();

    let tries = 0;
    const quranTick = () => {
      tries += 1;
      if (bindQuranControls() || tries >= 50) return;
      setTimeout(quranTick, 120);
    };
    quranTick();

    window.addEventListener("pagehide", () => {
      saveIslamicStoryState();
      saveQuranControls({ includeReciter: true });
    });
    window.addEventListener("beforeunload", () => {
      saveIslamicStoryState();
      saveQuranControls({ includeReciter: true });
    });

    restoreOpenView();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
