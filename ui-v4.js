"use strict";

(() => {
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];

  const routes = {
    dashboard: { title: "الرئيسية" },
    quran: { title: "ريلز القرآن" },
    editor: { title: "المحرر الاحترافي" },
    video: { title: "صناعة الفيديو", editorTab: "video" },
    stickers: { title: "الملصقات", editorTab: "stickers" },
    text: { title: "النصوص والذكاء الاصطناعي", editorTab: "text" },
    audio: { title: "الصوت والتعليق", editorTab: "audio" },
    layers: { title: "الطبقات", editorTab: "layers" },
    settings: { title: "الإعدادات والتصدير", editorTab: "settings" }
  };

  let content, sidebar, editorApp;

  function make(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }

  function navButton(route, icon, label) {
    return `<button class="v4-nav" type="button" data-v4-route="${route}"><span class="ico">${icon}</span><span>${label}</span></button>`;
  }

  function buildSidebar() {
    sidebar = make("aside", "v4-side");
    sidebar.innerHTML = `
      <div class="v4-brand"><div class="v4-brand-logo">R</div><div><b>Reels Maker AI</b><span>Creator Studio V4</span></div></div>
      <div class="v4-group general"><div class="v4-group-title">المنصة الرئيسية</div>
        ${navButton("dashboard","⌂","الرئيسية")}
        ${navButton("editor","✦","المحرر الاحترافي")}
        ${navButton("quran","☪","ريلز القرآن")}
      </div>
      <div class="v4-group creator"><div class="v4-group-title">صناعة المحتوى</div>
        ${navButton("video","🎬","الفيديو والخلفيات")}
        ${navButton("text","T","النصوص والكابشن")}
        ${navButton("stickers","✨","الملصقات و GIF")}
        ${navButton("layers","▱","إدارة الطبقات")}
      </div>
      <div class="v4-group ai"><div class="v4-group-title">الصوت والذكاء الاصطناعي</div>
        ${navButton("audio","♫","Gemini والصوت")}
        ${navButton("settings","⚙","التصدير والإعدادات")}
      </div>
      <div class="v4-group quran"><div class="v4-group-title">أدوات القرآن</div>
        ${navButton("quran","☪","إنشاء ريل قرآن")}
      </div>
      <div class="v4-side-spacer"></div>
      <div class="v4-profile"><div class="v4-avatar">A</div><div><b>Creator Workspace</b><span>Cloudflare Production</span></div></div>`;
    sidebar.addEventListener("click", e => {
      const btn = e.target.closest("[data-v4-route]");
      if (btn) navigate(btn.dataset.v4Route);
    });
  }

  function buildTopbar() {
    const top = make("header", "v4-topbar");
    top.innerHTML = `
      <div class="v4-welcome"><div class="v4-avatar">R</div><div><b>صباح الخير 👋</b><span>اصنع محتوى احترافي من مكان واحد</span></div></div>
      <div class="v4-top-actions">
        <div class="v4-search"><span>⌕</span><input id="v4Search" type="search" placeholder="ابحث عن أداة أو ميزة..."></div>
        <button class="v4-icon-btn" type="button" title="المحرر" data-top-route="editor">✦</button>
        <button class="v4-icon-btn v4-menu-btn" id="v4MenuBtn" type="button" aria-label="القائمة">☰</button>
      </div>`;
    top.addEventListener("click", e => {
      const btn = e.target.closest("[data-top-route]");
      if (btn) navigate(btn.dataset.topRoute);
    });
    top.querySelector("#v4MenuBtn")?.addEventListener("click", () => toggleDrawer(true));
    top.querySelector("#v4Search")?.addEventListener("input", e => filterDashboard(e.target.value));
    return top;
  }

  function dashboardHtml() {
    return `
      <section class="v4-hero">
        <div><span class="v4-pill">✦ Creator Suite</span><h1>كل أدوات صناعة الريلز في منصة واحدة</h1><p>ريلز قرآن، فيديو، نصوص، ملصقات، Gemini TTS، طبقات وتصدير حتى 4K — بواجهة مرتبة وسريعة.</p></div>
        <div class="v4-hero-badge">Production • Cloudflare</div>
      </section>
      <div class="v4-grid" id="v4Cards">
        <article class="v4-card tone-green" data-route="quran" data-search="قرآن ريلز سورة آيات قارئ"><small>مميز</small><div class="v4-card-icon">☪</div><h3>ريلز القرآن</h3><p>اختر السورة والآيات والقارئ والخلفية ثم أنشئ فيديو متزامن.</p></article>
        <article class="v4-card tone-purple" data-route="editor" data-search="محرر فيديو ريلز"><small>PRO</small><div class="v4-card-icon">✦</div><h3>المحرر الاحترافي</h3><p>حرّك الطبقات والنصوص والملصقات وصدّر المشروع.</p></article>
        <article class="v4-card tone-blue" data-route="video" data-search="فيديو خلفيات pexels pixabay"><div class="v4-card-icon">🎬</div><h3>الفيديو والخلفيات</h3><p>بحث Pexels وPixabay أو رفع فيديو من جهازك.</p></article>
        <article class="v4-card tone-cyan" data-route="audio" data-search="صوت Gemini تعليق tts"><div class="v4-card-icon">♫</div><h3>Gemini Voice</h3><p>تعليق صوتي عربي واختيار أصوات متعددة ومعاينة مباشرة.</p></article>
        <article class="v4-card tone-pink" data-route="text" data-search="نص كابشن ذكاء اصطناعي"><div class="v4-card-icon">T</div><h3>النصوص والكابشن</h3><p>اكتب أو ولّد نصًا وعدّل الخط والحجم واللون والظل.</p></article>
        <article class="v4-card tone-orange" data-route="stickers" data-search="ملصقات gif giphy"><div class="v4-card-icon">✨</div><h3>ملصقات و GIF</h3><p>ابحث عبر GIPHY أو ارفع ملصقات من هاتفك.</p></article>
        <article class="v4-card tone-purple" data-route="layers" data-search="طبقات ترتيب تحريك"><div class="v4-card-icon">▱</div><h3>إدارة الطبقات</h3><p>ترتيب، نسخ، حذف، تكبير، تصغير ودوران العناصر.</p></article>
        <article class="v4-card tone-green" data-route="settings" data-search="تصدير جودة 4k fps"><div class="v4-card-icon">⚙</div><h3>التصدير والجودة</h3><p>360p إلى 4K مع 24/30/60 FPS حسب جهازك.</p></article>
      </div>
      <section class="v4-section">
        <div class="v4-section-head"><h2>سير العمل المقترح</h2><span>ابدأ بسرعة</span></div>
        <div class="v4-info-grid">
          <div class="v4-panel"><div class="v4-list">
            <div class="v4-list-row"><i>1</i><div><b>ابدأ من ريلز القرآن أو الفيديو</b><span>اختر المحتوى الأساسي أولًا.</span></div></div>
            <div class="v4-list-row"><i>2</i><div><b>أضف النص والصوت والملصقات</b><span>كل عنصر يظل قابلًا للتعديل داخل المحرر.</span></div></div>
            <div class="v4-list-row"><i>3</i><div><b>راجع ثم صدّر</b><span>استخدم 1080p للموبايل و4K للأجهزة القوية.</span></div></div>
          </div></div>
          <div class="v4-panel"><div class="v4-list"><div class="v4-list-row"><i>☁</i><div><b>Cloudflare Production</b><span>النسخة المنشورة مرتبطة بالمستودع مباشرة.</span></div></div><div class="v4-list-row"><i>AI</i><div><b>Gemini متصل</b><span>التعليق الصوتي متاح من قسم الصوت.</span></div></div></div></div>
        </div>
      </section>`;
  }

  function createPages() {
    const dashboard = make("section", "v4-page active");
    dashboard.dataset.page = "dashboard";
    dashboard.innerHTML = dashboardHtml();
    dashboard.addEventListener("click", e => {
      const card = e.target.closest("[data-route]");
      if (card) navigate(card.dataset.route);
    });
    content.appendChild(dashboard);

    const editor = make("section", "v4-page");
    editor.dataset.page = "editor";
    editor.innerHTML = `<div class="v4-page-title"><div><h1>المحرر الاحترافي</h1><p>كل أدوات التحرير الأصلية في مساحة عمل كاملة.</p></div><button class="v4-back" type="button" data-back>الرئيسية</button></div><div class="v4-editor-wrap"></div>`;
    editor.querySelector(".v4-editor-wrap").appendChild(editorApp);
    editor.querySelector("[data-back]").onclick = () => navigate("dashboard");
    content.appendChild(editor);

    const qpage = make("section", "v4-page");
    qpage.dataset.page = "quran";
    qpage.innerHTML = `<div class="v4-page-title"><div><h1>استوديو ريلز القرآن</h1><p>السورة، الآيات، القارئ، الخلفية، التصميم والتصدير في صفحة واحدة.</p></div><button class="v4-back" type="button" data-back>الرئيسية</button></div><div id="v4QuranHost"><div class="v4-empty-state">جاري تجهيز استوديو ريلز القرآن...</div></div>`;
    qpage.querySelector("[data-back]").onclick = () => navigate("dashboard");
    content.appendChild(qpage);
  }

  function mountQuranStudio() {
    const studio = qs("#quranStudio");
    const host = qs("#v4QuranHost");
    if (!studio || !host) return false;
    host.querySelector(".v4-empty-state")?.remove();
    if (studio.parentElement !== host) host.appendChild(studio);
    studio.classList.add("v4-quran-page");
    studio.classList.remove("open");
    return true;
  }

  function setEditorTab(tab) {
    if (!tab) return;
    const btn = qs(`.controls .tab[data-tab="${tab}"]`);
    btn?.click();
  }

  function navigate(route) {
    const cfg = routes[route] || routes.dashboard;
    const page = route === "quran" ? "quran" : route === "dashboard" ? "dashboard" : "editor";
    qsa(".v4-page").forEach(p => p.classList.toggle("active", p.dataset.page === page));
    qsa(".v4-nav").forEach(b => b.classList.toggle("active", b.dataset.v4Route === route));
    if (page === "editor") setEditorTab(cfg.editorTab);
    if (page === "quran" && !mountQuranStudio()) setTimeout(mountQuranStudio, 140);
    const input = qs("#v4Search");
    if (input) input.value = "";
    filterDashboard("");
    toggleDrawer(false);
    try { history.replaceState(null, "", route === "dashboard" ? location.pathname : `#${route}`); } catch {}
  }

  function filterDashboard(term) {
    const q = String(term || "").trim().toLowerCase();
    qsa("#v4Cards .v4-card").forEach(card => {
      const text = `${card.textContent} ${card.dataset.search || ""}`.toLowerCase();
      card.style.display = !q || text.includes(q) ? "" : "none";
    });
  }

  function toggleDrawer(open) {
    sidebar?.classList.toggle("open", !!open);
    qs(".v4-drawer-backdrop")?.classList.toggle("show", !!open);
  }

  function init() {
    if (document.body.classList.contains("v4-ready")) return;
    editorApp = qs("body > .app");
    if (!editorApp) return;

    document.body.classList.add("v4-ready");
    const shell = make("div", "v4-shell");
    const main = make("main", "v4-main");
    content = make("div", "v4-content");
    buildSidebar();
    main.append(buildTopbar(), content);
    shell.append(main, sidebar);
    document.body.prepend(shell);

    const backdrop = make("div", "v4-drawer-backdrop");
    backdrop.onclick = () => toggleDrawer(false);
    document.body.appendChild(backdrop);

    createPages();
    setTimeout(mountQuranStudio, 0);
    setTimeout(mountQuranStudio, 550);
    const requested = location.hash.replace("#", "");
    navigate(routes[requested] ? requested : "dashboard");
  }

  window.addEventListener("DOMContentLoaded", init);
})();