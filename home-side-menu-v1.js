"use strict";

(() => {
  const items = [
    { key: "home", icon: "⌂", label: "الصفحة الرئيسية", hint: "العودة لبداية الموقع" },
    { key: "quran", icon: "☪", label: "استوديو ريلز القرآن", hint: "السور والآيات والقارئ والتصدير" },
    { key: "video", icon: "🎬", label: "الفيديو والخلفيات", hint: "Pexels و Pixabay ورفع فيديو" },
    { key: "audio", icon: "♫", label: "الصوت و Gemini AI", hint: "تعليق صوتي وموسيقى ومؤثرات" },
    { key: "text", icon: "T", label: "النصوص والذكاء الاصطناعي", hint: "نصوص وكابشن وتنسيق كامل" },
    { key: "stickers", icon: "✨", label: "الملصقات و GIF", hint: "GIPHY ورفع الصور والملصقات" },
    { key: "layers", icon: "▱", label: "إدارة الطبقات", hint: "ترتيب ونسخ وحذف وتحويل العناصر" },
    { key: "settings", icon: "⚙", label: "الإعدادات والتصدير", hint: "الجودة و FPS وتجهيز الريل" }
  ];

  let activeKey = "home";
  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

  function homeElements() {
    return {
      home: document.getElementById("transparentHome"),
      back: document.getElementById("transparentHomeBack")
    };
  }

  function setActive(key) {
    activeKey = key;
    document.querySelectorAll("#homeSideMenu [data-menu-key]").forEach(button => {
      const active = button.dataset.menuKey === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function showHome() {
    const { home, back } = homeElements();
    if (!home) return;
    home.classList.add("open");
    home.setAttribute("aria-hidden", "false");
    document.body.classList.add("th-home-open");
    if (back) back.hidden = true;
    setActive("home");
    try { home.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }

  function hideHome() {
    const { home, back } = homeElements();
    if (!home) return;
    home.classList.remove("open");
    home.setAttribute("aria-hidden", "true");
    document.body.classList.remove("th-home-open");
    if (back) back.hidden = true;
  }

  function closeMobileMenu() {
    document.body.classList.remove("hsm-mobile-open");
    const toggle = document.getElementById("homeMenuToggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function openMobileMenu() {
    if (!isMobile()) return;
    document.body.classList.add("hsm-mobile-open");
    const toggle = document.getElementById("homeMenuToggle");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
  }

  function toggleMobileMenu() {
    if (document.body.classList.contains("hsm-mobile-open")) closeMobileMenu();
    else openMobileMenu();
  }

  function openQuran(tries = 0) {
    const launch = document.getElementById("quranStudioLaunch");
    if (launch) {
      launch.click();
      return;
    }
    if (tries < 35) setTimeout(() => openQuran(tries + 1), 100);
  }

  function openTool(key) {
    if (key === "home") {
      showHome();
      closeMobileMenu();
      return;
    }

    hideHome();
    setActive(key);

    if (key === "quran") {
      openQuran();
    } else {
      const tab = document.querySelector(`.tab[data-tab="${key}"]`);
      if (tab) tab.click();
      if (isMobile()) {
        setTimeout(() => {
          const panel = document.getElementById(`panel-${key}`);
          if (panel) panel.scrollIntoView({ block: "start", behavior: "smooth" });
        }, 120);
      }
    }

    closeMobileMenu();
  }

  function newProject() {
    hideHome();
    const reset = document.getElementById("resetBtn");
    if (reset) reset.click();
    const videoTab = document.querySelector('.tab[data-tab="video"]');
    if (videoTab) videoTab.click();
    setActive("video");
    closeMobileMenu();
  }

  function exportProject() {
    hideHome();
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.click();
    closeMobileMenu();
  }

  function buildMenu() {
    if (document.getElementById("homeSideMenu")) return true;
    if (!document.getElementById("transparentHome")) return false;

    const menu = document.createElement("aside");
    menu.id = "homeSideMenu";
    menu.className = "hsm-sidebar";
    menu.setAttribute("aria-label", "القائمة الرئيسية وأدوات الموقع");
    menu.innerHTML = `
      <div class="hsm-head">
        <div class="hsm-brand-mark">R</div>
        <div class="hsm-brand-copy"><b>Reels Maker AI</b><span>جميع أدوات صناعة الريلز</span></div>
        <button class="hsm-close" type="button" aria-label="إغلاق القائمة">×</button>
      </div>
      <div class="hsm-section-label">القائمة الرئيسية</div>
      <nav class="hsm-nav">
        ${items.map(item => `
          <button class="hsm-item${item.key === "home" ? " active" : ""}" type="button" data-menu-key="${item.key}" aria-current="${item.key === "home" ? "page" : "false"}">
            <span class="hsm-icon">${item.icon}</span>
            <span class="hsm-copy"><b>${item.label}</b><small>${item.hint}</small></span>
            <span class="hsm-arrow">‹</span>
          </button>`).join("")}
      </nav>
      <div class="hsm-footer">
        <button class="hsm-quick" type="button" data-menu-action="new"><span>＋</span><b>مشروع جديد</b></button>
        <button class="hsm-quick primary" type="button" data-menu-action="export"><span>⇩</span><b>تصدير الريل</b></button>
      </div>`;

    const toggle = document.createElement("button");
    toggle.id = "homeMenuToggle";
    toggle.className = "hsm-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "فتح القائمة");
    toggle.setAttribute("aria-controls", "homeSideMenu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<i></i><i></i><i></i>";

    const backdrop = document.createElement("button");
    backdrop.id = "homeMenuBackdrop";
    backdrop.className = "hsm-backdrop";
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "إغلاق القائمة");

    document.body.appendChild(menu);
    document.body.appendChild(backdrop);
    document.body.appendChild(toggle);
    document.body.classList.add("hsm-menu-ready");

    menu.addEventListener("click", event => {
      const item = event.target.closest("[data-menu-key]");
      if (item) {
        event.preventDefault();
        openTool(item.dataset.menuKey);
        return;
      }
      const action = event.target.closest("[data-menu-action]");
      if (action) {
        event.preventDefault();
        if (action.dataset.menuAction === "new") newProject();
        if (action.dataset.menuAction === "export") exportProject();
      }
    });

    menu.querySelector(".hsm-close")?.addEventListener("click", closeMobileMenu);
    toggle.addEventListener("click", toggleMobileMenu);
    backdrop.addEventListener("click", closeMobileMenu);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMobileMenu();
    });

    window.addEventListener("resize", () => {
      if (!isMobile()) closeMobileMenu();
    });

    const oldBack = document.getElementById("transparentHomeBack");
    if (oldBack) oldBack.hidden = true;
    return true;
  }

  function init() {
    if (buildMenu()) return;
    const observer = new MutationObserver(() => {
      if (buildMenu()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
