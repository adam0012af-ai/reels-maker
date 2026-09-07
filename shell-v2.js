"use strict";

(() => {
  const DESKTOP_BREAKPOINT = 1000;
  const items = [
    { key: "home", icon: "⌂", label: "الصفحة الرئيسية", desc: "مساحة البداية وإدارة المشروع", tone: "blue" },
    { key: "quran", icon: "☪", label: "استوديو القرآن", desc: "إنشاء وتصميم ريلز القرآن", tone: "green" },
    { key: "video", icon: "🎬", label: "محرر الفيديو", desc: "إضافة وتحرير الفيديو والخلفيات", tone: "blue" },
    { key: "images", icon: "◇", label: "استوديو الصور", desc: "إنشاء وتعديل الصور والأغلفة", tone: "gold" },
    { key: "audio", icon: "♫", label: "نص → صوت", desc: "تحويل النص إلى تعليق صوتي", tone: "pink" },
    { key: "text", icon: "T", label: "النصوص", desc: "إضافة وتنسيق النصوص", tone: "violet" },
    { key: "stickers", icon: "✦", label: "العناصر والملصقات", desc: "عناصر بصرية وملصقات وصور", tone: "orange" },
    { key: "layers", icon: "▱", label: "الطبقات", desc: "ترتيب وإدارة عناصر المشروع", tone: "cyan" },
    { key: "settings", icon: "⚙", label: "الإعدادات", desc: "الجودة والأداء والتصدير", tone: "slate" }
  ];

  let activeKey = "home";
  let mobileOpen = false;

  const $ = id => document.getElementById(id);
  const isMobile = () => window.innerWidth <= DESKTOP_BREAKPOINT;

  function loadTheme() {
    const saved = localStorage.getItem("reels-shell-theme");
    document.documentElement.dataset.rmTheme = saved === "gold" ? "gold" : "dark";
  }

  function setTheme(next) {
    document.documentElement.dataset.rmTheme = next;
    localStorage.setItem("reels-shell-theme", next);
    syncThemeButton();
  }

  function syncThemeButton() {
    const button = $("rmThemeToggle");
    if (!button) return;
    const gold = document.documentElement.dataset.rmTheme === "gold";
    button.innerHTML = gold
      ? '<span class="rm-theme-icon">◐</span><span><b>الوضع الداكن</b><small>العودة للواجهة الداكنة</small></span>'
      : '<span class="rm-theme-icon">☀</span><span><b>الوضع الذهبي</b><small>أبيض + ذهبي</small></span>';
    button.setAttribute("aria-label", gold ? "تفعيل الوضع الداكن" : "تفعيل الوضع الذهبي");
  }

  function showHome() {
    window.ReelsImageStudio?.close?.();
    const home = $("transparentHome");
    if (home) {
      home.classList.add("open");
      home.setAttribute("aria-hidden", "false");
      document.body.classList.add("th-home-open");
      document.body.style.overflow = "hidden";
    }
    const back = $("transparentHomeBack");
    if (back) back.hidden = true;
    setActive("home");
  }

  function hideHome() {
    const home = $("transparentHome");
    if (home) {
      home.classList.remove("open");
      home.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("th-home-open");
    document.body.style.overflow = "";
    const back = $("transparentHomeBack");
    if (back) back.hidden = true;
  }

  function openQuran() {
    hideHome();
    window.ReelsImageStudio?.close?.();
    const clickLauncher = (tries = 0) => {
      const launch = $("quranStudioLaunch");
      if (launch) {
        launch.click();
        setActive("quran");
        return;
      }
      if (tries < 30) setTimeout(() => clickLauncher(tries + 1), 100);
    };
    clickLauncher();
  }

  function openImages() {
    hideHome();
    const open = (tries = 0) => {
      if (window.ReelsImageStudio?.open) {
        window.ReelsImageStudio.open();
        setActive("images");
        sanitizeProviders(document.body);
        patchImageStudio();
        return;
      }
      if (tries < 30) setTimeout(() => open(tries + 1), 100);
    };
    open();
  }

  function openEditorTool(key) {
    hideHome();
    window.ReelsImageStudio?.close?.();
    const tab = document.querySelector(`.tab[data-tab="${key}"]`);
    if (tab) tab.click();
    setActive(key);
  }

  function navigate(key) {
    closeMobile();
    if (key === "home") return showHome();
    if (key === "quran") return openQuran();
    if (key === "images") return openImages();
    openEditorTool(key);
  }

  function buildShell() {
    if ($("rmShellSidebar")) return;

    const sidebar = document.createElement("aside");
    sidebar.id = "rmShellSidebar";
    sidebar.className = "rm-shell-sidebar";
    sidebar.setAttribute("aria-label", "القائمة الرئيسية");
    sidebar.innerHTML = `
      <div class="rm-shell-head">
        <div class="rm-shell-logo">R</div>
        <div class="rm-shell-brand"><b>Reels Maker AI</b><span>Creative Studio</span></div>
        <button id="rmMobileClose" class="rm-mobile-close" type="button" aria-label="إغلاق القائمة">×</button>
      </div>
      <div class="rm-shell-caption">الخدمات</div>
      <nav class="rm-shell-nav">
        ${items.map(item => `
          <button class="rm-shell-item" data-rm-tool="${item.key}" data-tone="${item.tone}" type="button">
            <span class="rm-shell-icon">${item.icon}</span>
            <span class="rm-shell-copy"><b>${item.label}</b><small>${item.desc}</small></span>
            <span class="rm-shell-arrow">‹</span>
          </button>`).join("")}
      </nav>
      <div class="rm-shell-footer">
        <button id="rmThemeToggle" class="rm-theme-toggle" type="button"></button>
        <div class="rm-shell-actions">
          <button type="button" data-rm-action="new"><span>＋</span> مشروع جديد</button>
          <button type="button" data-rm-action="export"><span>⇩</span> تصدير الريل</button>
        </div>
      </div>`;

    const toggle = document.createElement("button");
    toggle.id = "rmMobileMenu";
    toggle.className = "rm-mobile-menu";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "فتح القائمة");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<span></span><span></span><span></span>';

    const overlay = document.createElement("button");
    overlay.id = "rmMobileOverlay";
    overlay.className = "rm-mobile-overlay";
    overlay.type = "button";
    overlay.setAttribute("aria-label", "إغلاق القائمة");

    document.body.append(sidebar, overlay, toggle);
    document.body.classList.add("rm-shell-v2");

    sidebar.addEventListener("click", event => {
      const tool = event.target.closest("[data-rm-tool]");
      if (tool) return navigate(tool.dataset.rmTool);

      const action = event.target.closest("[data-rm-action]");
      if (action?.dataset.rmAction === "new") {
        closeMobile();
        $("resetBtn")?.click();
        return;
      }
      if (action?.dataset.rmAction === "export") {
        closeMobile();
        $("exportBtn")?.click();
        return;
      }
      if (event.target.closest("#rmThemeToggle")) {
        const current = document.documentElement.dataset.rmTheme;
        setTheme(current === "gold" ? "dark" : "gold");
      }
    });

    toggle.addEventListener("click", () => mobileOpen ? closeMobile() : openMobile());
    overlay.addEventListener("click", closeMobile);
    $("rmMobileClose")?.addEventListener("click", closeMobile);

    syncThemeButton();
    setActive("home");
  }

  function setActive(key) {
    activeKey = key;
    document.querySelectorAll("[data-rm-tool]").forEach(button => {
      const active = button.dataset.rmTool === key;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function openMobile() {
    mobileOpen = true;
    document.body.classList.add("rm-mobile-open");
    $("rmMobileMenu")?.setAttribute("aria-expanded", "true");
  }

  function closeMobile() {
    mobileOpen = false;
    document.body.classList.remove("rm-mobile-open");
    $("rmMobileMenu")?.setAttribute("aria-expanded", "false");
  }

  function upgradeHome() {
    const home = $("transparentHome");
    if (!home || home.dataset.shellV2 === "1") return false;
    home.dataset.shellV2 = "1";
    home.classList.add("rm-home-v2");

    const brandSub = home.querySelector(".th-brand-copy span");
    if (brandSub) brandSub.textContent = "Creative Content Studio";

    const pill = home.querySelector(".th-pill");
    if (pill) pill.innerHTML = '<i></i><span>منصة صناعة المحتوى جاهزة</span> READY';

    home.querySelector(".th-top-actions .th-main-btn")?.remove();
    home.querySelector(".th-hero-actions")?.remove();
    home.querySelector(".th-quick")?.remove();
    home.querySelector(".th-section")?.remove();

    const eyebrow = home.querySelector(".th-eyebrow");
    if (eyebrow) eyebrow.textContent = "✦ مساحة واحدة لصناعة المحتوى";

    const title = home.querySelector(".th-hero h1");
    if (title) title.innerHTML = "حوّل فكرتك إلى محتوى<br><em>جاهز للنشر.</em>";

    const paragraph = home.querySelector(".th-hero-main > p");
    if (paragraph) paragraph.textContent = "أنشئ مشروعك، عدّل التفاصيل، وأخرج النتيجة النهائية من مساحة عمل موحّدة. اختر الخدمة التي تحتاجها من القائمة الجانبية وابدأ مباشرة.";

    const heroMain = home.querySelector(".th-hero-main");
    if (heroMain && !home.querySelector(".rm-home-highlights")) {
      heroMain.insertAdjacentHTML("beforeend", `
        <div class="rm-home-highlights">
          <div><strong>01</strong><span>مساحة عمل موحّدة</span></div>
          <div><strong>02</strong><span>تحكم كامل في المشروع</span></div>
          <div><strong>03</strong><span>تصدير بجودة عالية</span></div>
        </div>
        <div class="rm-home-hint"><span>←</span> اختر الخدمة من القائمة الجانبية للبدء</div>`);
    }

    const hero = home.querySelector(".th-hero");
    if (hero && !home.querySelector(".rm-home-showcase")) {
      hero.insertAdjacentHTML("beforeend", `
        <aside class="rm-home-showcase" aria-hidden="true">
          <div class="rm-showcase-orbit orbit-a"></div>
          <div class="rm-showcase-orbit orbit-b"></div>
          <div class="rm-showcase-core">
            <span>REELS MAKER</span>
            <strong>AI</strong>
            <small>CREATE • EDIT • PUBLISH</small>
          </div>
          <div class="rm-showcase-chip chip-a">VIDEO</div>
          <div class="rm-showcase-chip chip-b">VOICE</div>
          <div class="rm-showcase-chip chip-c">IMAGE</div>
        </aside>`);
    }

    $("transparentHomeBack")?.setAttribute("hidden", "");
    return true;
  }

  function patchEditorLabels() {
    const videoTitle = $("panel-video")?.querySelector(".panel-title");
    if (videoTitle) videoTitle.innerHTML = "<h2>مكتبة الفيديو</h2><p>ابحث عن فيديو مناسب لمشروعك أو ارفع ملفًا من جهازك.</p>";

    const sourceButtons = document.querySelectorAll("#videoSourceSwitch button");
    if (sourceButtons[0]) sourceButtons[0].textContent = "المكتبة الرئيسية";
    if (sourceButtons[1]) sourceButtons[1].textContent = "مكتبة إضافية";

    const stickerTitle = $("panel-stickers")?.querySelector(".panel-title");
    if (stickerTitle) stickerTitle.innerHTML = "<h2>العناصر والملصقات</h2><p>ابحث عن عناصر بصرية جاهزة أو ارفع ملفاتك الخاصة.</p>";

    const stickerButtons = document.querySelectorAll("#stickerTypeSwitch button");
    if (stickerButtons[0]) stickerButtons[0].textContent = "ملصقات";
    if (stickerButtons[1]) stickerButtons[1].textContent = "صور متحركة";
    const powered = document.querySelector(".powered");
    if (powered) powered.textContent = "مكتبة العناصر جاهزة للاستخدام.";

    if ($("aiStatus")) $("aiStatus").textContent = "التوليد الذكي جاهز لاقتراح النصوص داخل المشروع.";

    const audioTitle = $("panel-audio")?.querySelector(".panel-title");
    if (audioTitle) audioTitle.innerHTML = "<h2>نص → صوت والصوت</h2><p>حوّل النص إلى تعليق صوتي، أضف ملفاتك، وتحكم في مستويات الصوت والمؤثرات.</p>";
    const ttsTitle = document.querySelector(".tts-box > b");
    if (ttsTitle) ttsTitle.textContent = "نص → صوت";
    if ($("ttsStatus")) $("ttsStatus").textContent = "اكتب النص، اختر الصوت وأسلوب الإلقاء، ثم أضفه إلى المشروع.";

    const notice = $("panel-settings")?.querySelector(".notice");
    if (notice) notice.innerHTML = "<b>الخدمات الذكية متصلة</b><p>يمكنك استخدام مكتبات الوسائط، أدوات الذكاء الاصطناعي، رفع ملفاتك، وإنشاء المشروع كاملًا من داخل الاستوديو.</p>";

    const empty = $("emptyState")?.querySelector("p");
    if (empty) empty.textContent = "اختر فيديو من المكتبة أو ارفع ملفًا من جهازك للبدء.";
  }

  const replacements = [
    [/Pexels\s*(?:أو|\/|&)?\s*Pixabay/gi, "مكتبة الفيديو"],
    [/Pexels/gi, "مكتبة الفيديو"],
    [/Pixabay/gi, "مكتبة الفيديو"],
    [/Powered by\s*GIPHY/gi, "مكتبة العناصر"],
    [/GIPHY/gi, "مكتبة العناصر"],
    [/Gemini AI Text-to-Speech/gi, "نص → صوت"],
    [/Gemini TTS/gi, "نص → صوت"],
    [/Gemini/gi, "الذكاء الصوتي"],
    [/Nano Banana/gi, "المعالجة الذكية"],
    [/ElevenLabs/gi, "الخدمة الصوتية"],
    [/AUTO FALLBACK/gi, "SMART MODE"]
  ];

  function sanitizedText(value) {
    let next = value;
    replacements.forEach(([pattern, replacement]) => { next = next.replace(pattern, replacement); });
    return next;
  }

  function sanitizeProviders(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const next = sanitizedText(node.nodeValue || "");
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function patchImageStudio() {
    const studio = $("reelsImageStudio");
    if (!studio) return;
    const auto = studio.querySelector(".rmi-auto");
    if (auto) auto.textContent = "SMART MODE";
    const note = studio.querySelector(".rmi-note");
    if (note) note.textContent = "الوضع الذكي يختار أفضل مسار متاح تلقائيًا ويحافظ على استمرارية العمل بدون إظهار التفاصيل التقنية للمستخدم.";
    studio.querySelectorAll(".rmi-result-info > div > span").forEach(el => el.textContent = "");
  }

  function observeUi() {
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        upgradeHome();
        patchEditorLabels();
        sanitizeProviders(document.body);
        patchImageStudio();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function bindLegacyTabs() {
    document.addEventListener("click", event => {
      const tab = event.target.closest?.(".tab[data-tab]");
      if (tab?.dataset.tab) setActive(tab.dataset.tab);
    }, true);
  }

  function init() {
    loadTheme();
    buildShell();
    upgradeHome();
    patchEditorLabels();
    sanitizeProviders(document.body);
    patchImageStudio();
    observeUi();
    bindLegacyTabs();

    window.addEventListener("resize", () => {
      if (!isMobile()) closeMobile();
    });

    window.addEventListener("popstate", () => {
      if (location.hash === "#images") setActive("images");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();