"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];

  function neutralizeLegacyMobileSheets() {
    try {
      if (typeof syncResponsivePanels === "function") window.removeEventListener("resize", syncResponsivePanels);
      if (typeof desktopPanels !== "undefined" && typeof state !== "undefined" && state.mobilePanel) {
        desktopPanels.appendChild(state.mobilePanel);
        state.mobilePanel = null;
      }
      const sheet = $("mobileSheet");
      if (sheet) sheet.classList.remove("open");
      const backdrop = $("mobileSheetBackdrop");
      if (backdrop) backdrop.classList.remove("visible");
      window.openMobilePanel = () => {};
      window.syncResponsivePanels = () => {
        try {
          if (typeof desktopPanels !== "undefined" && typeof state !== "undefined" && state.mobilePanel) {
            desktopPanels.appendChild(state.mobilePanel);
            state.mobilePanel = null;
          }
          $("mobileSheet")?.classList.remove("open");
        } catch {}
      };
    } catch (e) {
      console.warn("V4 mobile cleanup", e);
    }
  }

  function setPage(name) {
    qsa(".v4-page").forEach(p => p.classList.toggle("active", p.dataset.page === name));
    qsa("[data-v4-page]").forEach(b => b.classList.toggle("active", b.dataset.v4Page === name));
    const title = $("v4PageTitle");
    const subtitle = $("v4PageSubtitle");
    const map = {
      dashboard: ["لوحة التحكم", "كل أدوات صناعة الريلز في مكان واحد"],
      editor: ["المحرر الاحترافي", "فيديو • نص • صوت • ملصقات • طبقات"]
    };
    if (title) title.textContent = map[name]?.[0] || "Reels Maker AI";
    if (subtitle) subtitle.textContent = map[name]?.[1] || "AI Video Studio";
    const scroll = qs(".v4-scroll");
    if (scroll) scroll.scrollTop = 0;
    closeSidebar();
  }

  function openTool(tool) {
    setPage("editor");
    qsa(".tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tool));
    try { if (typeof activateTab === "function") activateTab(tool); } catch (e) { console.warn(e); }
    setTimeout(() => qs(`.panel#panel-${tool}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 40);
  }

  function openQuranStudio() {
    const launch = $("quranStudioLaunch");
    if (launch) {
      launch.click();
      closeSidebar();
      return;
    }
    const studio = $("quranStudio");
    if (studio) {
      studio.classList.add("open");
      closeSidebar();
      return;
    }
    setTimeout(openQuranStudio, 180);
  }

  function closeSidebar() {
    qs(".v4-shell")?.classList.remove("sidebar-open");
  }

  function initSidebar() {
    $("v4MenuBtn")?.addEventListener("click", () => qs(".v4-shell")?.classList.toggle("sidebar-open"));
    $("v4SidebarBackdrop")?.addEventListener("click", closeSidebar);
    $("v4DashboardBtn")?.addEventListener("click", () => setPage("dashboard"));
    $("v4QuranBtn")?.addEventListener("click", openQuranStudio);

    qsa(".tabs .tab[data-tab]").forEach(tab => {
      tab.addEventListener("click", () => {
        setPage("editor");
        qsa("[data-v4-page]").forEach(b => b.classList.remove("active"));
        closeSidebar();
      });
    });

    qsa("[data-open-tool]").forEach(card => card.addEventListener("click", e => {
      const tool = e.currentTarget.dataset.openTool;
      if (tool === "quran") openQuranStudio();
      else openTool(tool);
    }));

    qsa("[data-open-quran]").forEach(el => el.addEventListener("click", openQuranStudio));
  }

  function initSearch() {
    const input = $("v4GlobalSearch");
    if (!input) return;
    const searchable = qsa(".v4-card,.v4-nav-btn,.tabs .tab");
    const run = () => {
      const q = input.value.trim().toLowerCase();
      searchable.forEach(el => {
        const hit = !q || el.textContent.toLowerCase().includes(q);
        if (el.classList.contains("v4-card")) el.style.display = hit ? "" : "none";
        else el.style.opacity = hit ? "1" : q ? ".28" : "1";
      });
    };
    input.addEventListener("input", run);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const first = qsa(".v4-card").find(x => x.style.display !== "none");
        first?.querySelector("button")?.click();
      }
    });
    document.addEventListener("keydown", e => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) {
        e.preventDefault(); input.focus();
      }
      if (e.key === "Escape") closeSidebar();
    });
  }

  function updateWelcome() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "أهلاً بك";
    const el = $("v4Greeting");
    if (el) el.textContent = greeting;
    const date = $("v4Today");
    if (date) {
      try { date.textContent = new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(now); } catch {}
    }
  }

  function makeCardsKeyboardFriendly() {
    qsa(".v4-card[data-open-tool]").forEach(card => {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
      });
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    neutralizeLegacyMobileSheets();
    initSidebar();
    initSearch();
    updateWelcome();
    makeCardsKeyboardFriendly();
    qsa(".tabs .tab").forEach(b => b.classList.remove("active"));
    setPage("dashboard");

    setTimeout(neutralizeLegacyMobileSheets, 80);
    setTimeout(neutralizeLegacyMobileSheets, 450);
  });
})();
