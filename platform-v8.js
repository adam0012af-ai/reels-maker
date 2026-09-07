"use strict";

(() => {
  if (window.__REELS_NAV_HOTFIX_V12__) return;
  window.__REELS_NAV_HOTFIX_V12__ = true;
  window.__REELS_MODERN_SHELL__ = true;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const ROUTES = new Set(["dashboard","quran","video","stickers","text","audio","layers","settings"]);
  const LABELS = {
    dashboard:["الرئيسية","لوحة صناعة المحتوى"],
    quran:["استوديو ريلز القرآن","السورة • الآيات • القارئ • التصميم • التصدير"],
    video:["الفيديو والخلفيات","Pexels • Pixabay • رفع من الجهاز"],
    stickers:["الملصقات و GIF","GIPHY • رفع ملصقات • تحريك فوق الفيديو"],
    text:["النصوص والذكاء الاصطناعي","نصوص • خطوط • ألوان • Gemini"],
    audio:["الصوت و Gemini","تعليق صوتي • موسيقى • مؤثرات"],
    layers:["إدارة الطبقات","ترتيب • حجم • دوران • ظهور"],
    settings:["الإعدادات والتصدير","الجودة • FPS • الأداء • التصدير"]
  };

  function normalize(value) {
    const v = String(value || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
    return ROUTES.has(v) ? v : "dashboard";
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

  function restorePanels() {
    const panels = $(".panels");
    const mobileHost = $("#mobilePanelHost");
    if (panels && mobileHost) $$(".panel", mobileHost).forEach(p => panels.appendChild(p));
    const sheet = $("#mobileSheet");
    if (sheet) {
      sheet.classList.remove("open", "expanded");
      sheet.style.removeProperty("transform");
    }
    $("#mobileSheetBackdrop")?.classList.remove("visible");
  }

  function showOnly(pageId) {
    ["dashboardPage","editorPage","quranPage","projectsPage"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const active = id === pageId;
      el.hidden = !active;
      el.classList.toggle("hidden", !active);
      el.classList.toggle("active-page", active);
      el.style.display = active ? "block" : "none";
      el.setAttribute("aria-hidden", active ? "false" : "true");
    });
  }

  function setEditorTool(tool) {
    restorePanels();
    $$(".panel").forEach(panel => {
      const active = panel.id === `panel-${tool}`;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
      panel.style.display = active ? "block" : "none";
    });
    $$(".tab[data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tool));
    const info = LABELS[tool] || LABELS.video;
    if ($("#editorTitle")) $("#editorTitle").textContent = info[0];
    if ($("#editorSubtitle")) $("#editorSubtitle").textContent = info[1];
    if ($(".tool-card-head b")) $(".tool-card-head b").textContent = info[0];
    if ($(".tool-card-head span")) $(".tool-card-head span").textContent = "كل أدوات القسم تعمل من هذه الصفحة";
  }

  function mountQuran() {
    const studio = $("#quranStudio");
    const host = $("#quranHost");
    if (!studio || !host) return false;
    if (studio.parentElement !== host) host.appendChild(studio);
    studio.classList.add("open", "platform-quran-embedded");
    studio.style.removeProperty("position");
    studio.style.removeProperty("inset");
    studio.style.removeProperty("height");
    studio.style.removeProperty("max-height");
    studio.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "";
    return true;
  }

  function waitForQuran() {
    if (mountQuran()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (mountQuran() || tries > 80) clearInterval(timer);
    }, 75);
  }

  function markNav(route) {
    $$(".nav-link").forEach(btn => {
      const target = normalize(btn.dataset.route || btn.dataset.tool || btn.dataset.tab);
      btn.classList.toggle("active", target === route);
    });
  }

  function updateHeader(route) {
    const info = LABELS[route] || LABELS.dashboard;
    if ($(".project b")) $(".project b").textContent = info[0];
    if ($(".project span")) $(".project span").textContent = info[1];
    document.title = `${info[0]} — Reels Maker AI`;
  }

  function apply(route, updateHash = true) {
    route = normalize(route);
    document.body.dataset.route = route;
    closeSidebar();
    restorePanels();

    if (route === "dashboard") {
      showOnly("dashboardPage");
    } else if (route === "quran") {
      showOnly("quranPage");
      waitForQuran();
    } else {
      showOnly("editorPage");
      setEditorTool(route);
    }

    markNav(route);
    updateHeader(route);
    if (updateHash && location.hash !== `#${route}`) history.pushState({route}, "", `#${route}`);
    try { window.scrollTo({top:0,left:0,behavior:"auto"}); } catch { window.scrollTo(0,0); }
  }

  function routeFrom(el) {
    if (!el) return null;
    if (el.hasAttribute("data-open-quran")) return "quran";
    const raw = el.dataset.route || el.dataset.tool || el.dataset.tab;
    return raw ? normalize(raw) : null;
  }

  function onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest("#menuBtn")) {
      event.preventDefault(); event.stopImmediatePropagation(); openSidebar(); return;
    }
    if (target.closest("#sidebarClose,#sidebarBackdrop")) {
      event.preventDefault(); event.stopImmediatePropagation(); closeSidebar(); return;
    }

    const nav = target.closest("[data-route],[data-tool],[data-open-quran]");
    if (!nav) return;
    const route = routeFrom(nav);
    if (!route) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    apply(route, true);
  }

  function bindSearch() {
    const input = $("#globalSearch");
    if (!input) return;
    input.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const candidates = $$("[data-route],[data-tool]").filter(el => (el.textContent || "").toLowerCase().includes(q));
      const route = routeFrom(candidates[0]);
      if (route) apply(route, true);
    });
  }

  function boot() {
    document.documentElement.classList.add("modern-platform", "platform-ready");
    document.documentElement.classList.remove("keyboard-editing");
    restorePanels();
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", () => apply(location.hash, false));
    window.addEventListener("popstate", () => apply(location.hash, false));
    bindSearch();

    const h = new Date().getHours();
    const welcome = $("#welcomeText");
    if (welcome) welcome.textContent = h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "أهلاً بك";

    apply(location.hash || "dashboard", false);
    window.ReelsPlatform = { go: r => apply(r, true), apply, openSidebar, closeSidebar };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
