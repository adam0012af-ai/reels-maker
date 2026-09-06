"use strict";

(() => {
  if (window.__REELS_PLATFORM_V9__) return;
  window.__REELS_PLATFORM_V9__ = true;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const ROUTES = new Set(["dashboard", "quran", "video", "stickers", "text", "audio", "layers", "settings"]);
  const EDITOR_ROUTES = new Set(["video", "stickers", "text", "audio", "layers", "settings"]);
  let currentRoute = "dashboard";
  let legacyObserver = null;

  function normalize(value) {
    value = String(value || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
    if (!value || value === "home") return "dashboard";
    return ROUTES.has(value) ? value : "dashboard";
  }

  function installRuntimeCss() {
    if ($("#platformV9RuntimeCss")) return;
    const style = document.createElement("style");
    style.id = "platformV9RuntimeCss";
    style.textContent = `
      /* The fixed sidebar is the only section navigation on desktop. */
      .topbar-end.actions{display:none!important}
      #quranStudioLaunch{display:none!important}
      #homeShell,.home-shell,.home-preview,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop{display:none!important;pointer-events:none!important}
      .panel{scroll-margin-top:86px}
      @media (max-width:900px){
        .editor-layout{display:flex!important;flex-direction:column!important}
        .editor-layout .tool-column{order:-1!important;width:100%!important}
        .editor-layout .preview-card{order:0!important;width:100%!important}
        .panel{scroll-margin-top:72px!important}
        .tool-column{scroll-margin-top:72px!important}
        .quran-page{scroll-margin-top:64px!important}
      }
    `;
    document.head.appendChild(style);
  }

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
      const active = pageId === id;
      page.classList.toggle("hidden", !active);
      page.classList.toggle("active-page", active);
      page.hidden = !active;
      page.style.display = active ? "block" : "none";
    });
  }

  function activateEditor(name) {
    movePanelsBack();
    $$(".panel").forEach(panel => {
      const active = panel.id === `panel-${name}`;
      panel.classList.toggle("active", active);
      panel.style.display = active ? "block" : "none";
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
      tries += 1;
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

  function scrollToRoute(name) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (name === "dashboard") {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          return;
        }
        if (name === "quran") {
          const quranPage = $("#quranPage");
          if (quranPage) quranPage.scrollIntoView({ block: "start", behavior: "auto" });
          return;
        }
        if (EDITOR_ROUTES.has(name)) {
          const panel = $(`#panel-${name}`);
          const toolColumn = $(".tool-column");
          const editorPage = $("#editorPage");
          const target = window.innerWidth <= 900 ? (panel || toolColumn || editorPage) : (editorPage || panel);
          if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
        }
      });
    });
  }

  function apply(raw, shouldScroll = true) {
    killLegacy();
    const next = normalize(raw);
    currentRoute = next;
    document.body.dataset.route = next;
    closeSidebar();

    if (next === "dashboard") {
      showPage("dashboardPage");
    } else if (next === "quran") {
      showPage("quranPage");
      waitForQuran();
    } else {
      showPage("editorPage");
      activateEditor(next);
    }

    markNav(next);
    if (shouldScroll) scrollToRoute(next);
  }

  function go(raw, replace = false) {
    const next = normalize(raw);
    const hash = `#${next}`;
    if (replace) history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    else if (location.hash !== hash) history.pushState(null, "", hash);
    apply(next, true);
  }

  function routeFromElement(el) {
    if (!el) return null;
    if (el.matches("[data-open-quran]")) return "quran";
    return normalize(el.dataset.route || el.dataset.tool || el.dataset.page || el.dataset.tab);
  }

  function handleNavigationEvent(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;

    const menu = target.closest("#menuBtn");
    if (menu) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openSidebar();
      return;
    }

    if (target.closest("#sidebarClose,#sidebarBackdrop")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSidebar();
      return;
    }

    const nav = target.closest("[data-route],[data-tool],[data-open-quran],[data-page]");
    if (!nav) return;
    const next = routeFromElement(nav);
    if (!next) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    go(next);
  }

  function bindNavigation() {
    if (document.documentElement.dataset.p9Nav === "1") return;
    document.documentElement.dataset.p9Nav = "1";

    document.addEventListener("click", handleNavigationEvent, true);
    window.addEventListener("hashchange", () => apply(location.hash, true));
    window.addEventListener("popstate", () => apply(location.hash, true));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSidebar(); });

    $$("[data-route],[data-tool],[data-open-quran],[data-page],#menuBtn").forEach(el => {
      el.style.touchAction = "manipulation";
      el.style.webkitTapHighlightColor = "transparent";
    });
  }

  function bindSearch() {
    const input = $("#globalSearch");
    if (!input || input.dataset.p9 === "1") return;
    input.dataset.p9 = "1";
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
      if (currentRoute === "quran") mountQuran();
    });
    legacyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    installRuntimeCss();
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
    apply(initial, false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.ReelsPlatform = { go, apply, openSidebar, closeSidebar };
})();
