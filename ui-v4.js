"use strict";

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const titles = {
    video: ["مكتبة الفيديو", "ابحث عن خلفيات وفيديوهات أو ارفع ملفك مباشرة"],
    stickers: ["الملصقات و GIF", "أضف عناصر متحركة وملصقات فوق الفيديو"],
    text: ["النصوص والذكاء الاصطناعي", "اكتب وصمّم النصوص أو ولّدها بالذكاء الاصطناعي"],
    audio: ["الصوت والتعليق", "Gemini TTS والموسيقى والمؤثرات الصوتية في مكان واحد"],
    layers: ["إدارة الطبقات", "رتّب كل عناصر المشروع وعدّل الحجم والدوران"],
    settings: ["الإعدادات والتصدير", "اضبط الجودة والأداء ثم صدّر الريل النهائي"]
  };

  let currentTool = "video";

  function setPage(name) {
    const dashboard = $("#dashboardPage");
    const editor = $("#editorPage");
    if (!dashboard || !editor) return;
    const isDashboard = name === "dashboard";
    dashboard.classList.toggle("hidden", !isDashboard);
    editor.classList.toggle("hidden", isDashboard);
    document.body.dataset.page = name;
    $$("[data-page='dashboard']").forEach(b => b.classList.toggle("active", isDashboard));
    if (isDashboard) $$(".controls .tab").forEach(b => b.classList.remove("active"));
    closeSidebar();
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }

  function setEditorHeading(tool) {
    currentTool = tool || currentTool;
    const [title, sub] = titles[currentTool] || ["المحرر", "أدوات صناعة الريلز"];
    const t = $("#editorTitle");
    const s = $("#editorSubtitle");
    if (t) t.textContent = title;
    if (s) s.textContent = sub;
  }

  function openTool(tool) {
    if (!tool) return;
    setPage("editor");
    setEditorHeading(tool);
    if (typeof window.activateTab === "function") window.activateTab(tool);
    else setTimeout(() => typeof window.activateTab === "function" && window.activateTab(tool), 0);
  }

  function openSidebar() {
    $("#controlsPanel")?.classList.add("drawer-open");
    $("#sidebarBackdrop")?.classList.add("show");
    document.documentElement.classList.add("nav-open");
  }

  function closeSidebar() {
    $("#controlsPanel")?.classList.remove("drawer-open");
    $("#sidebarBackdrop")?.classList.remove("show");
    document.documentElement.classList.remove("nav-open");
  }

  function openQuran() {
    const launcher = $("#quranStudioLaunch");
    if (launcher) {
      launcher.click();
      closeSidebar();
      return;
    }
    setTimeout(() => $("#quranStudioLaunch")?.click(), 250);
  }

  function bindNavigation() {
    $("#menuBtn")?.addEventListener("click", openSidebar);
    $("#sidebarBackdrop")?.addEventListener("click", closeSidebar);
    $("#sidebarClose")?.addEventListener("click", closeSidebar);

    $$("[data-page='dashboard']").forEach(btn => btn.addEventListener("click", () => setPage("dashboard")));
    $$("[data-tool]").forEach(btn => btn.addEventListener("click", () => openTool(btn.dataset.tool)));
    $$("[data-open-quran]").forEach(btn => btn.addEventListener("click", openQuran));

    $$(".controls .tab[data-tab]").forEach(btn => btn.addEventListener("click", () => {
      setPage("editor");
      setEditorHeading(btn.dataset.tab);
      closeSidebar();
    }));

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeSidebar();
    });
  }

  function setupMobileToolSlot() {
    const sheet = $("#mobileSheet");
    const slot = $("#mobileToolSlot");
    if (sheet && slot && sheet.parentElement !== slot) slot.appendChild(sheet);
  }

  function bindDashboardSearch() {
    const input = $("#globalSearch");
    if (!input) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      $$(".service-card").forEach(card => {
        const hay = (card.textContent || "").toLowerCase();
        card.classList.toggle("search-hidden", !!q && !hay.includes(q));
      });
    });
  }

  function enhanceQuranMobile(root) {
    if (!root || root.dataset.v4Enhanced === "1") return;
    root.dataset.v4Enhanced = "1";
    const settings = $(".qr-settings", root);
    const sections = $$(".qr-section", root);
    if (!settings || !sections.length) return;

    sections.forEach((section, index) => {
      section.dataset.step = String(index + 1);
      if (index === 0) section.classList.add("open-step");
      const head = $(".qr-section-title", section);
      if (!head) return;
      head.setAttribute("role", "button");
      head.setAttribute("tabindex", "0");
      const toggle = () => {
        if (innerWidth > 900) return;
        sections.forEach(s => s.classList.toggle("open-step", s === section));
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        syncStepPills(index);
      };
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });

    const stepper = document.createElement("div");
    stepper.className = "qr-mobile-stepper";
    stepper.innerHTML = sections.map((_, i) => `<button type="button" data-qr-step="${i}" class="${i === 0 ? "active" : ""}">${i + 1}</button>`).join("");
    settings.prepend(stepper);
    stepper.addEventListener("click", e => {
      const b = e.target.closest("[data-qr-step]");
      if (!b) return;
      const i = Number(b.dataset.qrStep);
      sections.forEach((s, n) => s.classList.toggle("open-step", n === i));
      sections[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
      syncStepPills(i);
    });

    function syncStepPills(active) {
      $$('[data-qr-step]', stepper).forEach((b, i) => b.classList.toggle("active", i === active));
    }

    const dock = document.createElement("div");
    dock.className = "qr-mobile-dock";
    dock.innerHTML = '<button type="button" class="qr-mobile-back">رجوع</button><button type="button" class="qr-mobile-create">☪ إنشاء ريل القرآن</button>';
    root.appendChild(dock);
    $(".qr-mobile-back", dock)?.addEventListener("click", () => $("#qrClose")?.click());
    $(".qr-mobile-create", dock)?.addEventListener("click", () => $("#qrPrepare")?.click());
  }

  function watchQuranStudio() {
    enhanceQuranMobile($("#quranStudio"));
    const mo = new MutationObserver(() => {
      const root = $("#quranStudio");
      if (root) enhanceQuranMobile(root);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    setupMobileToolSlot();
    bindNavigation();
    bindDashboardSearch();
    watchQuranStudio();
    setEditorHeading(currentTool);
    setPage("dashboard");
  }

  window.addEventListener("DOMContentLoaded", init);
  window.ReelsUI = { openTool, openQuran, setPage, closeSidebar };
})();
