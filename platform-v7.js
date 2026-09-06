"use strict";

(() => {
  if (window.__REELS_PLATFORM_V7__) return;
  window.__REELS_PLATFORM_V7__ = true;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const EDITOR_ROUTES = new Set(["video", "stickers", "text", "audio", "layers", "settings"]);
  let currentRoute = "dashboard";
  let observer = null;

  function killLegacyUi() {
    $$("#homeShell,.home-shell,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop").forEach(el => el.remove());
    ["homeV1Styles", "homePremiumV2Styles", "businessRefreshV3Styles", "premiumLayoutStyles", "premiumPlusStyles"].forEach(id => document.getElementById(id)?.remove());
    document.body.classList.remove("home-mode", "v4-ready");
    document.documentElement.classList.remove("nav-open");
    try { sessionStorage.removeItem("reelsMaker.currentView"); } catch {}
  }

  function normalizeRoute(raw) {
    const value = String(raw || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
    if (!value || value === "home" || value === "dashboard") return "dashboard";
    if (value === "quran") return "quran";
    if (EDITOR_ROUTES.has(value)) return value;
    return "dashboard";
  }

  function ensurePanelsAtHome() {
    const panels = $(".panels");
    const mobileHost = $("#mobilePanelHost");
    if (!panels || !mobileHost) return;
    $$(".panel", mobileHost).forEach(panel => panels.appendChild(panel));
    $("#mobileSheet")?.classList.remove("open", "expanded");
  }

  function showPage(id) {
    ["dashboardPage", "editorPage", "quranPage"].forEach(pageId => {
      const page = document.getElementById(pageId);
      if (!page) return;
      const active = pageId === id;
      page.classList.toggle("hidden", !active);
      page.classList.toggle("active-page", active);
      page.style.display = active ? "" : "none";
    });
  }

  function activateEditor(route) {
    ensurePanelsAtHome();
    $$(".panel").forEach(panel => panel.classList.toggle("active", panel.id === `panel-${route}`));
    $$(".tab[data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === route));

    const labels = {
      video:["الفيديو والخلفيات","ابحث في Pexels وPixabay أو ارفع فيديو من جهازك."],
      stickers:["الملصقات و GIF","أضف ملصقات وGIF وحركها فوق الفيديو."],
      text:["النصوص والذكاء الاصطناعي","اكتب أو ولّد النص ثم عدّل الخط والحجم والألوان."],
      audio:["الصوت و Gemini","التعليق الصوتي والموسيقى والمؤثرات في صفحة واحدة."],
      layers:["إدارة الطبقات","رتّب العناصر وتحكم في الحجم والدوران والظهور."],
      settings:["الإعدادات والتصدير","الجودة وFPS والأداء ثم تصدير الريل النهائي."]
    };
    const label = labels[route] || labels.video;
    if ($("#editorTitle")) $("#editorTitle").textContent = label[0];
    if ($("#editorSubtitle")) $("#editorSubtitle").textContent = label[1];
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
    document.body.style.overflow = "";
    $("#qrClose")?.setAttribute("tabindex", "-1");
    return true;
  }

  function waitForQuran() {
    if (mountQuran()) return;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      if (mountQuran() || n > 50) clearInterval(timer);
    }, 100);
  }

  function markNav(route) {
    $$('[data-route]').forEach(btn => btn.classList.toggle("active", normalizeRoute(btn.dataset.route) === route));
    if (EDITOR_ROUTES.has(route)) {
      $$(`.nav-link[data-tab="${route}"]`).forEach(btn => btn.classList.add("active"));
    }
  }

  function closeSidebar() {
    $("#controlsPanel")?.classList.remove("drawer-open");
    $("#sidebarBackdrop")?.classList.remove("show");
  }

  function openSidebar() {
    if (innerWidth > 900) return;
    $("#controlsPanel")?.classList.add("drawer-open");
    $("#sidebarBackdrop")?.classList.add("show");
  }

  function applyRoute(raw) {
    killLegacyUi();
    const route = normalizeRoute(raw);
    currentRoute = route;
    document.body.dataset.route = route;
    closeSidebar();

    if (route === "dashboard") {
      showPage("dashboardPage");
    } else if (route === "quran") {
      showPage("quranPage");
      waitForQuran();
    } else {
      showPage("editorPage");
      activateEditor(route);
    }

    markNav(route);
    const scroller = $(".workspace") || document.scrollingElement;
    try { scroller.scrollTo({ top: 0, behavior: "instant" }); } catch { try { scroller.scrollTop = 0; } catch {} }
  }

  function go(route, replace = false) {
    route = normalizeRoute(route);
    const hash = `#${route}`;
    if (replace) history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    else if (location.hash !== hash) history.pushState(null, "", hash);
    applyRoute(route);
  }

  function routeFromElement(el) {
    if (!el) return null;
    if (el.matches("[data-open-quran]")) return "quran";
    if (el.dataset.tool) return normalizeRoute(el.dataset.tool);
    if (el.dataset.route) return normalizeRoute(el.dataset.route);
    if (el.dataset.page) return normalizeRoute(el.dataset.page);
    return null;
  }

  function bindNavigationCapture() {
    document.addEventListener("click", event => {
      const menu = event.target.closest("#menuBtn");
      if (menu) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSidebar();
        return;
      }
      if (event.target.closest("#sidebarClose,#sidebarBackdrop")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSidebar();
        return;
      }

      const target = event.target.closest("[data-route],[data-tool],[data-open-quran],[data-page]");
      if (!target) return;
      const route = routeFromElement(target);
      if (!route) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      go(route);
    }, true);

    window.addEventListener("hashchange", () => applyRoute(location.hash));
    window.addEventListener("popstate", () => applyRoute(location.hash));
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeSidebar(); });
  }

  function bindSearch() {
    const input = $("#globalSearch");
    if (!input || input.dataset.p7 === "1") return;
    input.dataset.p7 = "1";
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      $$(".service-card,.quick-card,.activity-row").forEach(card => {
        card.style.display = !q || (card.textContent || "").toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  function greeting() {
    const el = $("#welcomeText");
    if (!el) return;
    const h = new Date().getHours();
    el.textContent = h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "مساء النور";
  }

  function projectStat() {
    const el = $("#statProjects");
    if (!el) return;
    let count = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || "";
        if (!/project/i.test(key)) continue;
        const val = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(val)) count += val.length;
      }
    } catch {}
    el.textContent = String(count);
  }

  function keepLegacyDead() {
    if (observer) return;
    observer = new MutationObserver(() => {
      killLegacyUi();
      if (currentRoute === "quran") mountQuran();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    killLegacyUi();
    ensurePanelsAtHome();
    bindNavigationCapture();
    bindSearch();
    greeting();
    projectStat();
    keepLegacyDead();

    let initial = normalizeRoute(location.hash);
    if (!location.hash || location.hash === "#home") {
      initial = "dashboard";
      history.replaceState(null, "", `${location.pathname}${location.search}#dashboard`);
    }
    applyRoute(initial);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();

  window.ReelsPlatformV7 = { go, applyRoute, openSidebar, closeSidebar };
})();
