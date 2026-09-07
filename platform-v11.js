"use strict";

(() => {
  if (window.__REELS_PLATFORM_V11__) return;
  window.__REELS_PLATFORM_V11__ = true;
  window.__REELS_MODERN_SHELL__ = true;
  document.documentElement.classList.add("modern-platform");

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const ROUTES = new Set(["dashboard", "quran", "projects", "video", "stickers", "text", "audio", "layers", "settings"]);
  const LABELS = {
    dashboard:["الرئيسية", "لوحة صناعة المحتوى"],
    quran:["استوديو ريلز القرآن", "السورة • الآيات • القارئ • التصميم • التصدير"],
    projects:["مشاريعي", "الفيديوهات التي صدّرتها محفوظة على هذا الجهاز"],
    video:["الفيديو والخلفيات", "Pexels • Pixabay • رفع من الجهاز"],
    stickers:["الملصقات و GIF", "GIPHY • رفع ملصقات • تحريك فوق الفيديو"],
    text:["النصوص والذكاء الاصطناعي", "نصوص • خطوط • ألوان • Gemini"],
    audio:["الصوت و Gemini", "تعليق صوتي • موسيقى • مؤثرات"],
    layers:["إدارة الطبقات", "ترتيب • حجم • دوران • ظهور"],
    settings:["الإعدادات والتصدير", "الجودة • FPS • الأداء • التصدير"]
  };

  let currentRoute = "dashboard";
  let legacyObserver = null;
  let resizeQueued = false;

  function normalize(value) {
    value = String(value || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
    if (!value || value === "home") return "dashboard";
    return ROUTES.has(value) ? value : "dashboard";
  }

  function ensureCss(id, href) {
    if ($(`#${id}`)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(id, src) {
    if ($(`#${id}`)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function ensureProjectLibraryAssets() {
    ensureCss("projectLibraryCss", "project-library-v1.css?v=11");
    ensureScript("projectLibraryJs", "project-library-v1.js?v=11");
  }

  function ensureBootCover() {
    if ($("#modernBootCover")) return;
    const cover = document.createElement("div");
    cover.id = "modernBootCover";
    cover.innerHTML = '<div class="boot-mark">R</div>';
    document.body.prepend(cover);
  }

  function ensureProjectsUi() {
    const projectBlock = $$('.nav-block').find(block => (block.querySelector('.nav-caption')?.textContent || '').includes('المشروع'));
    if (projectBlock && !projectBlock.querySelector('[data-route="projects"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-link';
      btn.dataset.route = 'projects';
      btn.type = 'button';
      btn.innerHTML = '<span class="nav-icon">▦</span><span>مشاريعي</span>';
      const settings = projectBlock.querySelector('[data-route="settings"]');
      projectBlock.insertBefore(btn, settings || null);
    }

    const serviceGrid = $('.service-grid');
    if (serviceGrid && !serviceGrid.querySelector('[data-route="projects"]')) {
      const card = document.createElement('button');
      card.className = 'service-card';
      card.dataset.tone = 'blue';
      card.dataset.route = 'projects';
      card.type = 'button';
      card.innerHTML = '<div class="service-top"><span class="service-icon">▦</span><span class="service-tag">PROJECTS</span></div><h3>مشاريعي السابقة</h3><p>كل فيديو تم تصديره يُحفظ تلقائيًا على هذا الجهاز للتنزيل أو المشاركة لاحقًا.</p>';
      serviceGrid.appendChild(card);
    }

    const quickStack = $('.quick-stack');
    if (quickStack && !quickStack.querySelector('[data-route="projects"]')) {
      const btn = document.createElement('button');
      btn.className = 'quick-action quick-card';
      btn.dataset.route = 'projects';
      btn.type = 'button';
      btn.innerHTML = '<b>▦ مشاريعي السابقة</b><span>الفيديوهات التي صدّرتها</span>';
      quickStack.appendChild(btn);
    }

    const workspace = $('.workspace');
    if (workspace && !$('#projectsPage')) {
      const page = document.createElement('section');
      page.id = 'projectsPage';
      page.className = 'projects-page hidden';
      page.innerHTML = `
        <div class="projects-page-head">
          <div><h1>مشاريعي السابقة</h1><p>الفيديوهات التي تصدّرها من المحرر أو استوديو ريلز القرآن تُحفظ هنا على هذا الجهاز.</p></div>
          <div class="projects-head-actions"><span id="projectsCount" class="projects-count">0 فيديو</span><button id="clearProjectsBtn" class="projects-clear" type="button">حذف الكل</button></div>
        </div>
        <div class="projects-info"><i>✓</i><div><b>حفظ محلي تلقائي</b><br>لا يتم رفع الفيديوهات إلى حساب خارجي من هذه المكتبة. يتم الاحتفاظ بها داخل تخزين المتصفح على هذا الجهاز.</div></div>
        <div id="projectsGrid" class="projects-grid"><div class="projects-empty"><div class="projects-empty-inner"><div class="projects-empty-icon">▱</div><h2>جاري فتح مكتبة المشاريع...</h2></div></div></div>
        <div class="project-storage-note">قد يحذف المتصفح البيانات المحلية إذا تم مسح بيانات الموقع أو التخزين.</div>`;
      workspace.appendChild(page);
    }
  }

  function killLegacy() {
    $$("#homeShell,.home-shell,.home-preview,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop,#mobileSheetBackdrop").forEach(el => el.remove());
    ["homeV1Styles", "homePremiumV2Styles", "businessRefreshV3Styles", "premiumLayoutStyles", "premiumPlusStyles", "mobileUiV3Styles"].forEach(id => document.getElementById(id)?.remove());
    document.body.classList.remove("home-mode", "v4-ready");
    document.documentElement.classList.remove("nav-open", "keyboard-editing");
    $("#mobileSheet")?.classList.remove("open", "expanded");
  }

  function restorePanels() {
    const panels = $(".panels");
    const mobileHost = $("#mobilePanelHost");
    if (panels && mobileHost) $$(".panel", mobileHost).forEach(panel => panels.appendChild(panel));
    const mobileSheet = $("#mobileSheet");
    if (mobileSheet) {
      mobileSheet.classList.remove("open", "expanded");
      mobileSheet.style.removeProperty("transform");
    }
  }

  function ensureSidebarProjectActions() {
    if ($("#sideProjectBlock")) return;
    const controls = $("#controlsPanel");
    const foot = $(".sidebar-foot", controls || document);
    if (!controls) return;
    const block = document.createElement("div");
    block.id = "sideProjectBlock";
    block.className = "side-project-block";
    block.innerHTML = '<div class="nav-caption"><i></i>إدارة المشروع</div><button class="side-project-action" data-project-action="reset" type="button"><span class="nav-icon">＋</span><span>مشروع جديد</span></button><button class="side-project-action primary" data-project-action="export" type="button"><span class="nav-icon">⬇</span><span>تصدير وتحميل الريل</span></button>';
    controls.insertBefore(block, foot || null);
  }

  function showPage(id) {
    ["dashboardPage", "editorPage", "quranPage", "projectsPage"].forEach(pageId => {
      const page = document.getElementById(pageId);
      if (!page) return;
      const active = pageId === id;
      page.classList.toggle("hidden", !active);
      page.classList.toggle("active-page", active);
      page.hidden = !active;
      page.style.display = active ? "block" : "none";
      page.setAttribute("aria-hidden", active ? "false" : "true");
    });
  }

  function activateEditor(name) {
    restorePanels();
    $$(".panel").forEach(panel => {
      const active = panel.id === `panel-${name}`;
      panel.classList.toggle("active", active);
      panel.style.display = active ? "block" : "none";
      panel.hidden = !active;
    });
    $$(".tab[data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name));
    const info = LABELS[name] || LABELS.video;
    if ($("#editorTitle")) $("#editorTitle").textContent = info[0];
    if ($("#editorSubtitle")) $("#editorSubtitle").textContent = info[1];
    const toolHead = $(".tool-card-head b");
    const toolSub = $(".tool-card-head span");
    if (toolHead) toolHead.textContent = info[0];
    if (toolSub) toolSub.textContent = "كل الأدوات الخاصة بهذا القسم هنا";
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
    studio.style.removeProperty("max-height");
    document.body.style.overflow = "";
    return true;
  }

  function waitForQuran() {
    if (mountQuran()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (mountQuran() || tries >= 80) clearInterval(timer);
    }, 75);
  }

  function markNav(name) {
    $$(".nav-link").forEach(btn => {
      const target = normalize(btn.dataset.route || btn.dataset.tool || btn.dataset.tab);
      btn.classList.toggle("active", target === name);
      if (target === name) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
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

  function updateRouteIdentity(name) {
    const info = LABELS[name] || LABELS.dashboard;
    const title = $(".project b");
    const subtitle = $(".project span");
    if (title) title.textContent = info[0];
    if (subtitle) subtitle.textContent = info[1];
    document.title = `${info[0]} — Reels Maker AI`;
  }

  function animatePage() {
    const workspace = $(".workspace");
    if (!workspace) return;
    workspace.classList.remove("route-enter");
    void workspace.offsetWidth;
    workspace.classList.add("route-enter");
    setTimeout(() => workspace.classList.remove("route-enter"), 280);
  }

  function scrollTopHard() {
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }
    catch { window.scrollTo(0, 0); }
    const workspace = $(".workspace");
    if (workspace && workspace.scrollTop) workspace.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  }

  function apply(raw, shouldScroll = true) {
    killLegacy();
    restorePanels();
    ensureProjectsUi();
    const next = normalize(raw);
    currentRoute = next;
    document.body.dataset.route = next;
    closeSidebar();

    if (next === "dashboard") {
      showPage("dashboardPage");
    } else if (next === "quran") {
      showPage("quranPage");
      waitForQuran();
    } else if (next === "projects") {
      showPage("projectsPage");
      setTimeout(() => window.ReelsProjects?.render?.(), 0);
    } else {
      showPage("editorPage");
      activateEditor(next);
    }

    markNav(next);
    updateRouteIdentity(next);
    if (shouldScroll) scrollTopHard();
    animatePage();
  }

  function go(raw, replace = false) {
    const next = normalize(raw);
    const hash = `#${next}`;
    if (replace) history.replaceState({ route: next }, "", `${location.pathname}${location.search}${hash}`);
    else if (location.hash !== hash) history.pushState({ route: next }, "", hash);
    apply(next, true);
  }

  function routeFromElement(el) {
    if (!el) return null;
    if (el.matches("[data-open-quran]")) return "quran";
    return normalize(el.dataset.route || el.dataset.tool || el.dataset.page || el.dataset.tab);
  }

  function projectAction(action) {
    if (action === "reset") { $("#resetBtn")?.click(); scrollTopHard(); return; }
    if (action === "export") $("#exportBtn")?.click();
  }

  function handleNavigationEvent(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    if (target.closest("#menuBtn")) { event.preventDefault(); event.stopImmediatePropagation(); openSidebar(); return; }
    if (target.closest("#sidebarClose,#sidebarBackdrop")) { event.preventDefault(); event.stopImmediatePropagation(); closeSidebar(); return; }
    const action = target.closest("[data-project-action]");
    if (action) { event.preventDefault(); event.stopImmediatePropagation(); projectAction(action.dataset.projectAction); return; }
    const nav = target.closest("[data-route],[data-tool],[data-open-quran],[data-page]");
    if (!nav) return;
    const next = routeFromElement(nav);
    if (!next) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    go(next);
  }

  function bindNavigation() {
    if (document.documentElement.dataset.p11Nav === "1") return;
    document.documentElement.dataset.p11Nav = "1";
    document.addEventListener("click", handleNavigationEvent, true);
    window.addEventListener("hashchange", () => apply(location.hash, true));
    window.addEventListener("popstate", () => apply(location.hash, true));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSidebar(); });
  }

  function bindSearch() {
    const input = $("#globalSearch");
    if (!input || input.dataset.p11 === "1") return;
    input.dataset.p11 = "1";
    input.addEventListener("focus", () => { if (currentRoute !== "dashboard") go("dashboard"); });
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
      let foundLegacy = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.("#homeShell,.home-shell,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop,#mobileSheetBackdrop") || node.querySelector?.("#homeShell,.home-shell,.creator-drawer,.creator-drawer-backdrop,.creator-backdrop,#mobileSheetBackdrop")) { foundLegacy = true; break; }
        }
        if (foundLegacy) break;
      }
      if (foundLegacy) killLegacy();
      restorePanels();
      if (currentRoute === "quran") mountQuran();
    });
    legacyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function keepResponsiveStable() {
    window.addEventListener("resize", () => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        restorePanels();
        if (currentRoute === "quran") mountQuran();
      });
    }, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(() => {
      restorePanels();
      scrollTopHard();
      if (currentRoute === "quran") mountQuran();
    }, 180), { passive: true });
  }

  function finalizeReady() {
    document.documentElement.classList.add("platform-ready");
    setTimeout(() => $("#modernBootCover")?.remove(), 260);
  }

  function init() {
    ensureCss("platformV10Css", "platform-v10.css?v=11");
    ensureProjectLibraryAssets();
    ensureBootCover();
    killLegacy();
    restorePanels();
    ensureProjectsUi();
    ensureSidebarProjectActions();
    bindNavigation();
    bindSearch();
    setupGreeting();
    keepLegacyDead();
    keepResponsiveStable();
    let initial = normalize(location.hash);
    if (!location.hash || location.hash === "#home") {
      initial = "dashboard";
      history.replaceState({ route: initial }, "", `${location.pathname}${location.search}#dashboard`);
    }
    apply(initial, false);
    finalizeReady();
  }

  function afterLegacyInit() {
    killLegacy();
    restorePanels();
    ensureProjectsUi();
    if (currentRoute === "quran") waitForQuran();
    apply(currentRoute, false);
    finalizeReady();
  }

  ensureBootCover();
  init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", afterLegacyInit, { once: true });
  else setTimeout(afterLegacyInit, 0);

  window.ReelsPlatform = { go, apply, openSidebar, closeSidebar, restorePanels };
})();
