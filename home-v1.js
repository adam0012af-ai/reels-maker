"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let installed = false;

  function injectStyles() {
    if (qid("homeV1Styles")) return;
    const style = document.createElement("style");
    style.id = "homeV1Styles";
    style.textContent = `
      body.home-mode{overflow:auto!important;background:#070b10}
      body.home-mode>.app{display:none!important}
      #quranStudioLaunch,#islamicContentLaunch{display:none!important}
      .home-shell{display:none;min-height:100vh;background:
        radial-gradient(circle at 78% 18%,rgba(118,87,255,.16),transparent 26%),
        radial-gradient(circle at 18% 72%,rgba(42,201,151,.12),transparent 24%),#070b10;color:#fff;font-family:Cairo,Tajawal,sans-serif;direction:rtl}
      .home-shell.open{display:block}
      .home-header{height:76px;display:flex;align-items:center;gap:14px;padding:0 6vw;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(7,11,16,.88);backdrop-filter:blur(16px);position:sticky;top:0;z-index:30}
      .home-brand{display:flex;align-items:center;gap:10px;margin-left:auto}.home-logo{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#7657ff,#35cda0);display:grid;place-items:center;font:900 20px Cairo}.home-brand b{font-size:15px}.home-brand span{display:block;color:#8190a4;font-size:9px;margin-top:2px}
      .home-header-actions{display:flex;align-items:center;gap:8px}.home-btn{min-height:42px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#111925;color:#edf2f7;padding:0 15px;font:800 10px Cairo,sans-serif;cursor:pointer}.home-btn.primary{background:linear-gradient(135deg,#7657ff,#9a64ff);border-color:transparent}.home-btn.green{background:linear-gradient(135deg,#21b98a,#36cda0);border-color:transparent;color:#06130f}
      .home-main{max-width:1220px;margin:auto;padding:64px 24px 56px}.home-hero{display:grid;grid-template-columns:1.08fr .92fr;gap:34px;align-items:center;min-height:520px}.home-kicker{display:inline-flex;gap:7px;align-items:center;border:1px solid rgba(125,92,255,.24);background:rgba(125,92,255,.08);border-radius:999px;padding:8px 12px;color:#cfc6ff;font-size:9px;font-weight:800}.home-copy h1{font-size:clamp(35px,5vw,68px);line-height:1.12;margin:18px 0 16px;letter-spacing:-1.6px}.home-copy h1 em{font-style:normal;background:linear-gradient(90deg,#b8abff,#44d7a8);-webkit-background-clip:text;color:transparent}.home-copy p{max-width:700px;color:#9aa8ba;font-size:14px;line-height:2;margin:0 0 24px}.home-cta{display:flex;gap:10px;flex-wrap:wrap}.home-proof{display:flex;gap:18px;flex-wrap:wrap;margin-top:28px}.home-proof div{min-width:130px}.home-proof b{display:block;font-size:18px}.home-proof span{font-size:9px;color:#7f8da0}
      .home-preview{position:relative;min-height:470px;display:grid;place-items:center}.home-phone{width:250px;aspect-ratio:9/16;border-radius:30px;border:8px solid #111721;background:linear-gradient(180deg,#17213c,#0d151d 45%,#142c28);box-shadow:0 30px 80px rgba(0,0,0,.45);position:relative;overflow:hidden}.home-phone:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 22%,rgba(255,255,255,.12),transparent 18%),linear-gradient(180deg,transparent 54%,rgba(0,0,0,.56));}.home-phone .scene{position:absolute;inset:17% 10% 31%;border-radius:18px;background:linear-gradient(145deg,rgba(112,89,255,.38),rgba(36,204,156,.26));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}.home-phone .caption{position:absolute;bottom:15%;right:11%;left:11%;padding:10px;border-radius:12px;background:rgba(0,0,0,.55);text-align:center;font-size:10px;line-height:1.6}.home-float{position:absolute;padding:11px 13px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(14,21,31,.86);backdrop-filter:blur(10px);box-shadow:0 18px 45px rgba(0,0,0,.28);font-size:9px}.home-float.one{top:16%;right:2%}.home-float.two{bottom:20%;left:0}.home-float.three{top:45%;left:4%}
      .home-section{padding-top:44px}.home-section-head{display:flex;align-items:end;gap:18px;margin-bottom:18px}.home-section-head div{flex:1}.home-section-head h2{font-size:27px;margin:0 0 6px}.home-section-head p{margin:0;color:#8391a4;font-size:10px;line-height:1.8}.home-tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.home-tool{border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(180deg,#0e151e,#0a1017);padding:18px;min-height:190px;cursor:pointer;transition:.2s transform,.2s border-color}.home-tool:hover{transform:translateY(-3px);border-color:rgba(122,91,255,.36)}.home-tool-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(125,92,255,.12);font-size:22px;margin-bottom:20px}.home-tool h3{margin:0 0 8px;font-size:15px}.home-tool p{margin:0;color:#8492a5;font-size:9px;line-height:1.9}.home-tool span{display:inline-block;margin-top:14px;font-size:9px;color:#b7acff;font-weight:800}
      .home-workflow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.home-step{border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px;background:#0b121a}.home-step i{font-style:normal;color:#7c63ff;font-weight:900;font-size:18px}.home-step b{display:block;margin:10px 0 5px;font-size:12px}.home-step p{margin:0;color:#7f8da0;font-size:9px;line-height:1.8}
      .home-footer{border-top:1px solid rgba(255,255,255,.07);margin-top:52px;padding-top:20px;color:#6f7d90;font-size:9px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
      @media(max-width:900px){.home-header{padding:0 14px;height:66px}.home-brand span{display:none}.home-main{padding:35px 14px 40px}.home-hero{grid-template-columns:1fr;min-height:0}.home-preview{min-height:390px}.home-phone{width:205px}.home-tools{grid-template-columns:1fr 1fr}.home-workflow{grid-template-columns:1fr 1fr}.home-copy h1{font-size:38px}.home-copy p{font-size:11px}.home-header-actions .home-btn:first-child{display:none}}
      @media(max-width:560px){.home-tools,.home-workflow{grid-template-columns:1fr}.home-section-head h2{font-size:22px}.home-preview{min-height:350px}.home-phone{width:180px}.home-float{font-size:8px;padding:8px}.home-header-actions{gap:6px}.home-btn{padding:0 10px;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function injectHome() {
    if (qid("homeShell")) return;
    const root = document.createElement("div");
    root.id = "homeShell";
    root.className = "home-shell open";
    root.innerHTML = `
      <header class="home-header">
        <div class="home-brand"><div class="home-logo">R</div><div><b>Reels Maker AI</b><span>AI Video Creation Studio</span></div></div>
        <div class="home-header-actions"><button class="home-btn" data-home-action="sections">☰ الأقسام</button><button class="home-btn primary" data-home-action="editor">فتح المحرر</button></div>
      </header>
      <main class="home-main">
        <section class="home-hero">
          <div class="home-copy">
            <span class="home-kicker">✦ منصة واحدة لصناعة محتوى الفيديو</span>
            <h1>حوّل فكرتك إلى <em>فيديو جاهز للنشر</em></h1>
            <p>أنشئ قصصًا بصوت ومشاهد متناسقة، ريلز قرآن، محتوى إسلامي، وابحث عن فيديوهات وصور ثم عدّل كل شيء داخل محرر ومونتاج كامل — من نفس المكان.</p>
            <div class="home-cta"><button class="home-btn green" data-home-action="story">🎬 ابدأ قصة مع فيديو</button><button class="home-btn" data-home-action="islamic">☪ المحتوى الإسلامي</button><button class="home-btn" data-home-action="editor">✂️ محرر الفيديو</button></div>
            <div class="home-proof"><div><b>AI Story</b><span>قصة → صوت → مشاهد → فيديو</span></div><div><b>Quran Studio</b><span>آيات + قرّاء + خلفيات</span></div><div><b>Full Editor</b><span>نصوص، صوت، طبقات وتصدير</span></div></div>
          </div>
          <div class="home-preview"><div class="home-phone"><div class="scene"></div><div class="caption">مشاهد متناسقة • نص قصير • صوت متزامن</div></div><div class="home-float one">🎬 Story Studio</div><div class="home-float two">☪ Quran Reels</div><div class="home-float three">✂️ Editor</div></div>
        </section>
        <section class="home-section"><div class="home-section-head"><div><h2>كل أدوات الموقع في مكان واحد</h2><p>اختار القسم الذي تحتاجه؛ الرئيسية للتعريف والبدء السريع، والمحرر لا يظهر إلا عندما تطلبه.</p></div></div>
          <div class="home-tools">
            <article class="home-tool" data-home-action="story"><div class="home-tool-icon">🎬</div><h3>قصة مع فيديو</h3><p>اكتب موضوعًا أو قصة، والنظام يقسمها لمشاهد ويولد الصور والصوت والنصوص ويجهز مراجعة قبل المونتاج.</p><span>فتح Story Studio ←</span></article>
            <article class="home-tool" data-home-action="quran"><div class="home-tool-icon">☪</div><h3>استوديو القرآن</h3><p>اختيار السورة والآيات والقارئ والخلفية والتصميم والتصدير مع معاينة مباشرة.</p><span>فتح ريلز القرآن ←</span></article>
            <article class="home-tool" data-home-action="islamic"><div class="home-tool-icon">📚</div><h3>المحتوى الإسلامي</h3><p>أحاديث، أذكار، أدعية، أناشيد، كليبات وخلفيات وأنيميشن ضمن مكتبة مستقلة.</p><span>فتح المكتبة ←</span></article>
            <article class="home-tool" data-home-action="editor"><div class="home-tool-icon">✂️</div><h3>محرر ومونتاج الفيديو</h3><p>قص، نصوص، ملصقات، صوت، طبقات، تحريك، ترتيب وتصدير بجودات مختلفة.</p><span>فتح المحرر ←</span></article>
          </div>
        </section>
        <section class="home-section"><div class="home-section-head"><div><h2>من الفكرة إلى الفيديو</h2><p>تدفق بسيط بدل الشاشة المزدحمة بالأدوات من أول لحظة.</p></div></div>
          <div class="home-workflow"><div class="home-step"><i>01</i><b>اختار القسم</b><p>قصة، قرآن، محتوى إسلامي أو محرر.</p></div><div class="home-step"><i>02</i><b>أنشئ المحتوى</b><p>اكتب أو ولّد النص والصوت والمشاهد.</p></div><div class="home-step"><i>03</i><b>راجع النتيجة</b><p>شاهد الفيديو قبل الدخول للمونتاج.</p></div><div class="home-step"><i>04</i><b>عدّل وصدّر</b><p>حمّل مباشرة أو افتح المحرر لإكمال المونتاج.</p></div></div>
        </section>
        <footer class="home-footer"><span>Reels Maker AI Studio</span><span>Story • Quran • Islamic Content • Full Video Editor</span></footer>
      </main>`;
    document.body.prepend(root);
    root.querySelectorAll("[data-home-action]").forEach(el => el.addEventListener("click", () => navigate(el.dataset.homeAction)));
  }

  function showHome() {
    document.body.classList.add("home-mode");
    qid("homeShell")?.classList.add("open");
    try { sessionStorage.setItem("reelsMaker.currentView", "home"); } catch {}
  }

  function showEditor() {
    document.body.classList.remove("home-mode");
    qid("homeShell")?.classList.remove("open");
    try { sessionStorage.setItem("reelsMaker.currentView", "editor"); } catch {}
  }

  function clickWhenReady(id, fallback) {
    const el = qid(id);
    if (el) return el.click();
    if (fallback) fallback();
    setTimeout(() => { const again = qid(id); if (again) again.click(); }, 240);
  }

  function openSections() {
    const btn = qid("creatorMenuLaunch");
    if (btn) return btn.click();
    setTimeout(() => qid("creatorMenuLaunch")?.click(), 250);
  }

  function navigate(target) {
    if (target === "sections") return openSections();
    if (target === "editor") return showEditor();
    if (target === "story") {
      showEditor();
      clickWhenReady("creatorMenuLaunch", () => setTimeout(() => document.querySelector('[data-creator-open="story"]')?.click(), 120));
      setTimeout(() => document.querySelector('[data-creator-open="story"]')?.click(), 170);
      return;
    }
    if (target === "islamic") {
      showEditor();
      const lib = qid("islamicContentLibrary");
      if (lib) { lib.classList.add("open"); document.body.style.overflow = "hidden"; }
      else setTimeout(() => qid("islamicContentLaunch")?.click(), 220);
      return;
    }
    if (target === "quran") {
      showEditor();
      setTimeout(() => qid("quranStudioLaunch")?.click(), 180);
    }
  }

  function addHomeToDrawer() {
    const drawer = document.querySelector(".creator-drawer");
    if (!drawer || drawer.querySelector('[data-home-drawer="home"]')) return;
    const head = drawer.querySelector(".creator-drawer-head");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "creator-nav-btn";
    btn.dataset.homeDrawer = "home";
    btn.textContent = "🏠 الرئيسية";
    btn.addEventListener("click", () => {
      qid("creatorDrawerClose")?.click();
      qid("storyStudio")?.classList.remove("open");
      qid("islamicContentLibrary")?.classList.remove("open");
      qid("quranStudio")?.classList.remove("open");
      document.body.style.overflow = "";
      showHome();
    });
    head?.after(btn);
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyles();
    injectHome();
    const saved = (() => { try { return sessionStorage.getItem("reelsMaker.currentView") || "home"; } catch { return "home"; } })();
    if (saved === "editor") showEditor(); else showHome();
    const timer = setInterval(() => { addHomeToDrawer(); if (qid("creatorMenuLaunch")) clearInterval(timer); }, 180);
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install);
  else install();
})();