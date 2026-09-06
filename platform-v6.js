"use strict";

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const EDITOR_ROUTES = new Set(["video", "stickers", "text", "audio", "layers", "settings"]);
  let activeRoute = "dashboard";
  let quranMounted = false;
  let geminiPreviewUrl = null;

  function removeLegacyShells() {
    $$("#homeShell,.home-shell").forEach(el => el.remove());
    ["homeV1Styles", "homePremiumV2Styles", "businessRefreshV3Styles"].forEach(id => document.getElementById(id)?.remove());
    document.body.classList.remove("home-mode", "v4-ready");
    try { sessionStorage.removeItem("reelsMaker.currentView"); } catch {}
  }

  function disableLegacyMobilePanels() {
    const panels = $(".panels");
    const host = $("#mobilePanelHost");
    if (panels && host) {
      $$(".panel", host).forEach(panel => panels.appendChild(panel));
    }
    $("#mobileSheet")?.classList.remove("open");
    if (typeof window.syncResponsivePanels === "function") {
      try { window.removeEventListener("resize", window.syncResponsivePanels); } catch {}
      window.syncResponsivePanels = () => {};
    }
    if (typeof window.openMobilePanel === "function") window.openMobilePanel = () => {};
  }

  function normalizeRoute(raw) {
    const value = String(raw || "").replace(/^#/, "").trim().toLowerCase();
    if (!value || value === "home" || value === "dashboard") return "dashboard";
    if (value === "quran") return "quran";
    if (EDITOR_ROUTES.has(value)) return value;
    return "dashboard";
  }

  function setHash(route, replace = false) {
    const hash = `#${route}`;
    if (location.hash === hash) return applyRoute(route);
    if (replace) history.replaceState(null, "", hash);
    else history.pushState(null, "", hash);
    applyRoute(route);
  }

  function showOnlyPage(id) {
    ["dashboardPage", "editorPage", "quranPage"].forEach(pageId => {
      const page = document.getElementById(pageId);
      if (!page) return;
      page.classList.toggle("hidden", pageId !== id);
      page.classList.toggle("active-page", pageId === id);
    });
  }

  function markNav(route) {
    $$('[data-route]').forEach(btn => btn.classList.toggle("active", btn.dataset.route === route));
    if (EDITOR_ROUTES.has(route)) {
      $$('.nav-link[data-route="editor-group"]').forEach(btn => btn.classList.add("active"));
    }
  }

  function closeSidebar() {
    $("#controlsPanel")?.classList.remove("drawer-open");
    $("#sidebarBackdrop")?.classList.remove("show");
    document.documentElement.classList.remove("nav-open");
  }

  function openSidebar() {
    $("#controlsPanel")?.classList.add("drawer-open");
    $("#sidebarBackdrop")?.classList.add("show");
    document.documentElement.classList.add("nav-open");
  }

  function ensurePanelsHome() {
    const panels = $(".panels");
    const host = $("#mobilePanelHost");
    if (!panels || !host) return;
    $$(".panel", host).forEach(panel => panels.appendChild(panel));
  }

  function activateEditorTool(tool) {
    ensurePanelsHome();
    if (typeof window.activateTab === "function") {
      window.activateTab(tool);
      ensurePanelsHome();
      $("#mobileSheet")?.classList.remove("open");
    } else {
      $$(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${tool}`));
      $$(".tab[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tool));
    }
    const labels = {
      video: ["الفيديو والخلفيات", "ابحث في مكتبة الفيديو أو ارفع ملفًا وابدأ مشروعك."],
      stickers: ["الملصقات و GIF", "أضف ملصقات وصورًا متحركة وحرّكها فوق الفيديو."],
      text: ["النصوص والذكاء الاصطناعي", "ولّد نصًا أو اكتبه وصممه مباشرة على الفيديو."],
      audio: ["الصوت والتعليق", "Gemini TTS والموسيقى والمؤثرات الصوتية في صفحة واحدة."],
      layers: ["إدارة الطبقات", "رتّب النصوص والملصقات وعدّل الحجم والدوران والظهور."],
      settings: ["الإعدادات والتصدير", "اختر الجودة ومعدل الإطارات ثم صدّر الفيديو النهائي."]
    };
    const [title, sub] = labels[tool] || labels.video;
    if ($("#editorTitle")) $("#editorTitle").textContent = title;
    if ($("#editorSubtitle")) $("#editorSubtitle").textContent = sub;
  }

  function mountQuran() {
    const studio = $("#quranStudio");
    const host = $("#quranHost");
    if (!studio || !host) return false;
    if (studio.parentElement !== host) host.appendChild(studio);
    studio.classList.add("open", "platform-quran-embedded");
    studio.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "";
    quranMounted = true;
    enhanceQuranSections(studio);
    return true;
  }

  function waitForQuran() {
    if (mountQuran()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (mountQuran() || tries > 40) clearInterval(timer);
    }, 100);
  }

  function enhanceQuranSections(root) {
    if (!root || root.dataset.platformV6 === "1") return;
    root.dataset.platformV6 = "1";
    const settings = $(".qr-settings", root);
    const sections = $$(".qr-section", root);
    sections.forEach((section, index) => {
      section.dataset.qrStep = String(index + 1);
      if (index === 0) section.classList.add("mobile-open");
      const head = $(".qr-section-title", section);
      if (!head) return;
      head.setAttribute("role", "button");
      head.setAttribute("tabindex", "0");
      const toggle = () => {
        if (window.innerWidth > 760) return;
        sections.forEach(s => s.classList.toggle("mobile-open", s === section));
        $$(".platform-qr-step").forEach((b, i) => b.classList.toggle("active", i === index));
        setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
      };
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); }
      });
    });
    if (settings && !$(".platform-qr-steps", root)) {
      const stepper = document.createElement("div");
      stepper.className = "platform-qr-steps";
      stepper.innerHTML = sections.map((section, i) => `<button type="button" class="platform-qr-step ${i === 0 ? "active" : ""}" data-step-index="${i}"><span>${i + 1}</span><b>${$(".qr-section-title b", section)?.textContent?.replace(/^\d+\.\s*/, "") || `خطوة ${i + 1}`}</b></button>`).join("");
      settings.prepend(stepper);
      stepper.addEventListener("click", event => {
        const btn = event.target.closest("[data-step-index]");
        if (!btn) return;
        const index = Number(btn.dataset.stepIndex);
        if (window.innerWidth <= 760) {
          sections.forEach((s, i) => s.classList.toggle("mobile-open", i === index));
        }
        sections[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
        $$(".platform-qr-step", stepper).forEach((b, i) => b.classList.toggle("active", i === index));
      });
    }
  }

  function applyRoute(route) {
    route = normalizeRoute(route);
    activeRoute = route;
    document.body.dataset.route = route;
    closeSidebar();

    if (route === "dashboard") {
      showOnlyPage("dashboardPage");
    } else if (route === "quran") {
      showOnlyPage("quranPage");
      waitForQuran();
    } else {
      showOnlyPage("editorPage");
      activateEditorTool(route);
    }
    markNav(route);
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch { window.scrollTo(0, 0); }
  }

  function bindNavigation() {
    $("#menuBtn")?.addEventListener("click", openSidebar);
    $("#sidebarClose")?.addEventListener("click", closeSidebar);
    $("#sidebarBackdrop")?.addEventListener("click", closeSidebar);
    $$('[data-route]').forEach(btn => btn.addEventListener("click", event => {
      const route = btn.dataset.route;
      if (!route || route === "editor-group") return;
      event.preventDefault();
      setHash(route);
    }));
    $$('[data-tool]').forEach(btn => btn.addEventListener("click", event => {
      event.preventDefault();
      setHash(btn.dataset.tool || "video");
    }));
    $$('[data-open-quran]').forEach(btn => btn.addEventListener("click", event => {
      event.preventDefault();
      setHash("quran");
    }));
    window.addEventListener("hashchange", () => applyRoute(location.hash));
    window.addEventListener("popstate", () => applyRoute(location.hash));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSidebar(); });
  }

  function setupGreeting() {
    const hour = new Date().getHours();
    const text = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";
    const el = $("#welcomeText");
    if (el) el.textContent = text;
  }

  function setupSearch() {
    const input = $("#globalSearch");
    if (!input) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      $$(".service-card,.quick-card").forEach(card => {
        const hit = !q || (card.textContent || "").toLowerCase().includes(q);
        card.classList.toggle("search-hidden", !hit);
      });
    });
  }

  function setupDashboardStats() {
    const projectCount = (() => {
      try {
        const raw = localStorage.getItem("reels-projects-v2") || localStorage.getItem("reelsProjects") || "[]";
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch { return 0; }
    })();
    const el = $("#statProjects");
    if (el) el.textContent = String(projectCount);
  }

  async function geminiPreview() {
    const btn = $("#ttsPreviewBtn");
    const status = $("#ttsStatus");
    const text = ($("#ttsText")?.value || $("#textContent")?.value || "").trim();
    if (!text) { if (status) status.textContent = "اكتب نص التعليق الصوتي أولًا."; return; }
    const voice = $("#geminiVoice")?.value || "Kore";
    const style = $("#geminiStyle")?.value || "egyptian";
    if (btn) btn.disabled = true;
    if (status) status.textContent = `جاري تجهيز معاينة ${voice}...`;
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ text: text.slice(0, 240), voice, style })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      if (geminiPreviewUrl) URL.revokeObjectURL(geminiPreviewUrl);
      geminiPreviewUrl = URL.createObjectURL(blob);
      let audio = $("#geminiPreviewPlayer");
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = "geminiPreviewPlayer";
        audio.controls = true;
        audio.className = "gemini-preview-player";
        $(".tts-box")?.appendChild(audio);
      }
      audio.src = geminiPreviewUrl;
      audio.hidden = false;
      try { await audio.play(); } catch {}
      if (status) status.textContent = `المعاينة تعمل بصوت ${voice} ✅`;
    } catch (error) {
      if (status) status.textContent = `تعذر إنشاء المعاينة: ${String(error.message || error).slice(0, 260)}`;
    } finally { if (btn) btn.disabled = false; }
  }

  function enhanceGemini() {
    const voice = $("#geminiVoice");
    const style = $("#geminiStyle");
    const preview = $("#ttsPreviewBtn");
    if (!voice || !style || !preview || preview.dataset.platformGemini === "1") return false;
    preview.dataset.platformGemini = "1";
    const savedVoice = localStorage.getItem("reels-gemini-voice");
    const savedStyle = localStorage.getItem("reels-gemini-style");
    if (savedVoice && [...voice.options].some(o => o.value === savedVoice)) voice.value = savedVoice;
    if (savedStyle && [...style.options].some(o => o.value === savedStyle)) style.value = savedStyle;
    voice.addEventListener("change", () => localStorage.setItem("reels-gemini-voice", voice.value));
    style.addEventListener("change", () => localStorage.setItem("reels-gemini-style", style.value));
    preview.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      geminiPreview();
    }, true);
    return true;
  }

  function watchDynamicUi() {
    enhanceGemini();
    const observer = new MutationObserver(() => {
      enhanceGemini();
      if (activeRoute === "quran" && !quranMounted) mountQuran();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    removeLegacyShells();
    disableLegacyMobilePanels();
    setupGreeting();
    setupSearch();
    setupDashboardStats();
    bindNavigation();
    watchDynamicUi();
    const initial = normalizeRoute(location.hash);
    if (!location.hash || location.hash === "#home") history.replaceState(null, "", `#${initial}`);
    applyRoute(initial);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.PlatformV6 = { route: setHash, applyRoute, openSidebar, closeSidebar };
})();
