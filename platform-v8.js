"use strict";

(() => {
  if (window.__REELS_PLATFORM_V8__) return;
  window.__REELS_PLATFORM_V8__ = true;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const ROUTES = new Set(["dashboard", "quran", "video", "stickers", "text", "audio", "layers", "settings"]);
  const EDITOR = new Set(["video", "stickers", "text", "audio", "layers", "settings"]);
  let route = "dashboard";
  let legacyObserver = null;

  const normalize = value => {
    value = String(value || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
    if (!value || value === "home") return "dashboard";
    return ROUTES.has(value) ? value : "dashboard";
  };

  function killLegacy() {
    $$("#homeShell,.home-shell,.home-preview,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop").forEach(el => el.remove());
    ["homeV1Styles", "homePremiumV2Styles", "businessRefreshV3Styles", "premiumLayoutStyles", "premiumPlusStyles"].forEach(id => document.getElementById(id)?.remove());
    document.body.classList.remove("home-mode", "v4-ready");
    document.documentElement.classList.remove("nav-open");
  }

  function movePanelsBack() {
    const panels = $(".panels");
    const mobileHost = $("#mobilePanelHost");
    if (panels && mobileHost) $$(".panel", mobileHost).forEach(panel => panels.appendChild(panel));
    $("#mobileSheet")?.classList.remove("open", "expanded");
  }

  function showPage(id) {
    ["dashboardPage", "editorPage", "quranPage"].forEach(pageId => {
      const page = document.getElementById(pageId);
      if (!page) return;
      const on = pageId === id;
      page.classList.toggle("hidden", !on);
      page.classList.toggle("active-page", on);
      page.hidden = !on;
      page.style.display = on ? "block" : "none";
    });
  }

  function activateEditor(name) {
    movePanelsBack();
    $$(".panel").forEach(panel => {
      const on = panel.id === `panel-${name}`;
      panel.classList.toggle("active", on);
      panel.style.display = on ? "block" : "none";
    });
    $$(".tab[data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name));

    const labels = {
      video:["الفيديو والخلفيات", "ابحث في Pexels وPixabay أو ارفع فيديو من جهازك."],
      stickers:["الملصقات و GIF", "أضف ملصقات وGIF وحركها فوق الفيديو."],
      text:["النصوص والذكاء الاصطناعي", "اكتب أو ولّد النص ثم عدّل الخط والحجم والألوان."],
      audio:["الصوت و Gemini", "التعليق الصوتي والموسيقى والمؤثرات في صفحة واحدة."],
      layers:["إدارة الطبقات", "رتّب العناصر وتحكم في الحجم والدوران والظهور."],
      settings:["الإعدادات والتصدير", "الجودة وFPS والأداء ثم تصدير الريل النهائي."]
    };
    const info = labels[name] || labels.video;
    if ($("#editorTitle")) $("#editorTitle").textContent = info[0];
    if ($("#editorSubtitle")) $("#editorSubtitle").textContent = info[1];
  }

  function mountQuran() {
    const studio = $("#quranStudio");
    const host = $("#quranHost");
    if (!studio || !host) return false;
    if (studio.parentElement !== host) host.appendChild(studio);
    studio.classList.add("open", "platform-quran-embedded");
    studio.setAttribute("aria-hidden", "false");
    studio.style.removeProperty("position");
    studio.style.removeProperty("inset");
    studio.style.removeProperty("height");
    document.body.style.overflow = "";
    return true;
  }

  function waitForQuran() {
    if (mountQuran()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (mountQuran() || tries >= 60) clearInterval(timer);
    }, 100);
  }

  function markNav(name) {
    $$(".nav-link").forEach(btn => {
      const target = normalize(btn.dataset.route || btn.dataset.tool || btn.dataset.tab);
      btn.classList.toggle("active", target === name);
    });
  }

  function closeSidebar() {
    $("#controlsPanel")?.classList.remove("drawer-open");
    $("#sidebarBackdrop")?.classList.remove("show");
    document.documentElement.classList.remove("nav-open");
  }

  function openSidebar() {
    if (window.innerWidth > 900) return;
    $("#controlsPanel")?.classList.add("drawer-open");
    $("#sidebarBackdrop")?.classList.add("show");
    document.documentElement.classList.add("nav-open");
  }

  function apply(raw) {
    killLegacy();
    route = normalize(raw);
    document.body.dataset.route = route;
    closeSidebar();

    if (route === "dashboard") showPage("dashboardPage");
    else if (route === "quran") {
      showPage("quranPage");
      waitForQuran();
    } else {
      showPage("editorPage");
      activateEditor(route);
    }

    markNav(route);
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch { window.scrollTo(0, 0); }
  }

  function go(raw, replace = false) {
    const next = normalize(raw);
    const hash = `#${next}`;
    if (replace) history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    else if (location.hash !== hash) history.pushState(null, "", hash);
    apply(next);
  }

  function targetRoute(el) {
    if (!el) return null;
    if (el.matches("[data-open-quran]")) return "quran";
    return normalize(el.dataset.route || el.dataset.tool || el.dataset.page || el.dataset.tab);
  }

  function bindNavigation() {
    if (document.documentElement.dataset.p8Nav === "1") return;
    document.documentElement.dataset.p8Nav = "1";

    document.addEventListener("click", event => {
      const menu = event.target.closest?.("#menuBtn");
      if (menu) {
        event.preventDefault();
        event.stopPropagation();
        openSidebar();
        return;
      }

      if (event.target.closest?.("#sidebarClose,#sidebarBackdrop")) {
        event.preventDefault();
        event.stopPropagation();
        closeSidebar();
        return;
      }

      const nav = event.target.closest?.("[data-route],[data-tool],[data-open-quran],[data-page]");
      if (!nav) return;
      const next = targetRoute(nav);
      if (!next) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      go(next);
    }, true);

    window.addEventListener("hashchange", () => apply(location.hash));
    window.addEventListener("popstate", () => apply(location.hash));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSidebar(); });
  }

  function bindSearch() {
    const input = $("#globalSearch");
    if (!input || input.dataset.p8 === "1") return;
    input.dataset.p8 = "1";
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      $$(".service-card,.quick-card,.activity-row").forEach(card => {
        card.style.display = !q || (card.textContent || "").toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  function setupGreeting() {
    const el = $("#welcomeText");
    if (!el) return;
    const h = new Date().getHours();
    el.textContent = h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "مساء النور";
  }

  function keepLegacyDead() {
    if (legacyObserver || !window.MutationObserver) return;
    legacyObserver = new MutationObserver(records => {
      let found = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.("#homeShell,.home-shell,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop") || node.querySelector?.("#homeShell,.home-shell,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop")) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) killLegacy();
      if (route === "quran") mountQuran();
    });
    legacyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    killLegacy();
    movePanelsBack();
    bindNavigation();
    bindSearch();
    setupGreeting();
    keepLegacyDead();

    let initial = normalize(location.hash);
    if (!location.hash || location.hash === "#home") {
      initial = "dashboard";
      history.replaceState(null, "", `${location.pathname}${location.search}#dashboard`);
    }
    apply(initial);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.ReelsPlatform = { go, apply, openSidebar, closeSidebar };
})();
