"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];
  const ROUTE_KEY = "reelsMaker.route.v2";
  let built = false;
  let phoneIndex = 0;
  let phoneTimer = 0;
  let restoring = false;

  const slides = [
    {
      key:"story", tag:"AI STORY / REVIEW", title:"قصة واحدة، مشاهد متسقة، ومراجعة قبل التصدير",
      text:"المشاهد تتحرك مع السرد، والنص والصوت يفضلوا داخل نفس تجربة العمل.",
      image:"https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=720&q=82"
    },
    {
      key:"quran", tag:"QURAN STUDIO", title:"ريل قرآن بهوية هادئة ومزامنة دقيقة",
      text:"اختيار القارئ والآيات والخلفية ثم معاينة النتيجة قبل المونتاج.",
      image:"https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=720&q=82"
    },
    {
      key:"editor", tag:"FULL EDITOR", title:"محرر فعلي بطبقات وصوت وخط زمني",
      text:"تحكم في المشهد والنص والصورة والصوت والتصدير من مساحة عمل واحدة.",
      image:"https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=720&q=82"
    },
    {
      key:"library", tag:"CONTENT LIBRARY", title:"محتوى جاهز يتحول إلى مشروع بدل مجرد بطاقة",
      text:"قرآن، حديث، أذكار، دعاء وقصص ضمن مكتبة منظمة قابلة للاستخدام في المشاريع.",
      image:"https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=720&q=82"
    }
  ];

  function logoSvg() {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rmg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#7c8cff"/><stop offset=".55" stop-color="#54d6e7"/><stop offset="1" stop-color="#42d6a5"/></linearGradient></defs><path fill="none" stroke="url(#rmg)" stroke-width="5" stroke-linejoin="round" d="M13 15h23c10 0 16 5 16 13 0 7-5 11-12 12l12 10H40L29 40H24v10H13z"/><path fill="url(#rmg)" d="M24 24h12c3.8 0 5.7 1.5 5.7 4.2S39.8 32.5 36 32.5H24z"/><circle cx="15" cy="9" r="3" fill="#f2b75f"/></svg>`;
  }

  function icon(name) {
    const map = {
      story:'<path d="M6 8h20M6 14h15M6 20h11"/><path d="M23 18l5 3-5 3z"/>',
      quran:'<path d="M7 7c6-2 10 0 11 3v18c-1-3-5-5-11-3zM29 7c-6-2-10 0-11 3v18c1-3 5-5 11-3z"/>',
      editor:'<path d="M6 9h22M6 18h22M6 27h22"/><circle cx="12" cy="9" r="3"/><circle cx="23" cy="18" r="3"/><circle cx="16" cy="27" r="3"/>',
      library:'<path d="M9 6h18v24H9zM13 11h10M13 16h10M13 21h7"/>'
    };
    return `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${map[name]||map.story}</svg>`;
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/,"");
    if (["home","story","quran","islamic","editor","projects"].includes(hash)) return hash;
    const saved = localStorage.getItem(ROUTE_KEY);
    return ["home","story","quran","islamic","editor","projects"].includes(saved) ? saved : "home";
  }

  function setRoute(next, push=true) {
    localStorage.setItem(ROUTE_KEY,next);
    const hash = `#${next}`;
    if (location.hash !== hash) {
      try { push ? history.pushState({rmRoute:next},"",hash) : history.replaceState({rmRoute:next},"",hash); } catch { location.hash=hash; }
    }
  }

  function ready() {
    document.documentElement.classList.remove("rm-route-booting");
    document.documentElement.classList.add("rm-route-ready");
  }

  function showHome(push=false) {
    closeOverlays();
    document.body.classList.add("home-mode");
    qid("homeShell")?.classList.add("open");
    setRoute("home",push);
    ready();
  }

  function showEditorBase(push=true) {
    document.body.classList.remove("home-mode");
    qid("homeShell")?.classList.remove("open");
    closeOverlays();
    setRoute("editor",push);
    ready();
  }

  function closeOverlays() {
    ["storyStudio","islamicContentLibrary","quranStudio","rmProjects"].forEach(id=>qid(id)?.classList.remove("open"));
    document.body.style.overflow="";
  }

  function openStory(push=true) {
    document.body.classList.remove("home-mode"); qid("homeShell")?.classList.remove("open");
    const btn=qs('[data-creator-open="story"]') || qs('[data-home-action="story"]');
    if (btn) btn.click(); else setTimeout(()=>openStory(push),180);
    setRoute("story",push); setTimeout(ready,220);
  }
  function openQuran(push=true) {
    document.body.classList.remove("home-mode"); qid("homeShell")?.classList.remove("open");
    const btn=qid("quranStudioLaunch"); if(btn)btn.click(); else setTimeout(()=>openQuran(push),180);
    setRoute("quran",push); setTimeout(ready,220);
  }
  function openIslamic(push=true) {
    document.body.classList.remove("home-mode"); qid("homeShell")?.classList.remove("open");
    const btn=qid("islamicContentLaunch"); if(btn)btn.click(); else {const lib=qid("islamicContentLibrary"); if(lib)lib.classList.add("open"); else setTimeout(()=>openIslamic(push),180);}
    setRoute("islamic",push); setTimeout(ready,220);
  }
  function openProjects(push=true) {
    const old=qs('[data-rm-projects]');
    if(old) old.click(); else setTimeout(()=>openProjects(push),180);
    setRoute("projects",push); setTimeout(ready,180);
  }

  function restoreRoute() {
    if (restoring) return;
    restoring=true;
    const r=route();
    const go=()=>{
      if(r==="home")showHome(false);
      else if(r==="story")openStory(false);
      else if(r==="quran")openQuran(false);
      else if(r==="islamic")openIslamic(false);
      else if(r==="projects")openProjects(false);
      else showEditorBase(false);
      restoring=false;
    };
    setTimeout(go,90);
    setTimeout(()=>{ready();restoring=false;},900);
  }

  function buildHome() {
    const root=qid("homeShell"); if(!root || root.dataset.rmplusBuilt==="1")return false;
    root.dataset.rmplusBuilt="1"; root.className="home-shell rmplus-home";
    root.innerHTML=`
      <header class="rmplus-header">
        <div class="rmplus-brand"><span class="rmplus-logo">${logoSvg()}</span><span class="rmplus-brand-copy"><b>Reels Maker AI</b><span>AI VIDEO CREATION WORKSPACE</span></span></div>
        <button id="rmplusMenu" class="rmplus-menu" type="button">☰ الأقسام</button>
      </header>
      <main class="rmplus-main">
        <section class="rmplus-hero">
          <div class="rmplus-copy">
            <span class="rmplus-kicker"><i></i> منصة واحدة لصناعة محتوى الفيديو</span>
            <h1>حوّل الفكرة إلى <span>فيديو جاهز للنشر</span></h1>
            <p>مساحة عمل احترافية تجمع القصة بالذكاء الاصطناعي، ريلز القرآن، المحتوى الإسلامي والمونتاج الكامل في تجربة واحدة مرتبة من الفكرة حتى التصدير.</p>
            <div class="rmplus-mission"><i></i><div><b>هدف المنصة</b><span>تقليل التنقل بين الأدوات: أنشئ، راجع، عدّل وصدّر مشروعك من مكان واحد مع حفظ العمل تلقائيًا.</span></div></div>
            <div class="rmplus-meta"><div><b>Story → Video</b><span>مشاهد + صوت + Review</span></div><div><b>Quran Studio</b><span>قارئ + آيات + مزامنة</span></div><div><b>Full Editor</b><span>Layers + Audio + Export</span></div></div>
          </div>
          <div class="rmplus-device-wrap"><div id="rmplusDevice" class="rmplus-device" aria-label="معاينة توضيحية قابلة للسحب"><div class="rmplus-screen"><div class="rmplus-island"></div><div class="rmplus-status"><strong>9:41</strong><span>5G&nbsp;&nbsp;▰&nbsp;&nbsp;92%</span></div><div id="rmplusSlides"></div><div class="rmplus-swipehint">اسحب للمعاينة</div><div id="rmplusDots" class="rmplus-dots"></div></div></div></div>
        </section>
        <section class="rmplus-section">
          <div class="rmplus-section-head"><div><h2>كل أدوات الإنتاج في مساحة واحدة</h2><p>العناصر التالية شرح بصري فقط. فتح الأدوات وإدارة المشاريع يتم من قائمة «الأقسام».</p></div><span class="rmplus-chip">واجهة موحّدة • بدون زحمة أزرار</span></div>
          <div class="rmplus-tools">
            <article class="rmplus-tool"> <span class="rmplus-tool-icon">${icon("story")}</span><h3>قصة مع فيديو</h3><p>من نص واحد إلى Storyboard ومشاهد وتعليق صوتي ومراجعة قبل المونتاج.</p><div class="rmplus-tool-foot"><b>AI STORY</b><span>شرح فقط</span></div></article>
            <article class="rmplus-tool"> <span class="rmplus-tool-icon">${icon("quran")}</span><h3>استوديو القرآن</h3><p>اختيار السورة والقارئ والخلفية وتوقيت الآيات ثم تجهيزها للمحرر.</p><div class="rmplus-tool-foot"><b>QURAN</b><span>شرح فقط</span></div></article>
            <article class="rmplus-tool"> <span class="rmplus-tool-icon">${icon("library")}</span><h3>المحتوى الإسلامي</h3><p>مكتبة منظمة للأحاديث والأذكار والأدعية والقصص ومصادر المحتوى.</p><div class="rmplus-tool-foot"><b>LIBRARY</b><span>شرح فقط</span></div></article>
            <article class="rmplus-tool"> <span class="rmplus-tool-icon">${icon("editor")}</span><h3>محرر ومونتاج الفيديو</h3><p>طبقات ونصوص وصور وصوت وخط زمني وتحكم كامل قبل التصدير.</p><div class="rmplus-tool-foot"><b>EDITOR</b><span>شرح فقط</span></div></article>
          </div>
        </section>
        <section class="rmplus-section">
          <div class="rmplus-section-head"><div><h2>من الفكرة إلى التصدير</h2><p>مسار واحد ثابت لكل مشروع بدل القفز بين صفحات وأزرار متكررة.</p></div></div>
          <div class="rmplus-workflow"><div class="rmplus-step"><em>01</em><b>اختر من القائمة</b><p>القائمة الجانبية هي نقطة الدخول الوحيدة للأدوات والمشاريع.</p></div><div class="rmplus-step"><em>02</em><b>أنشئ مشروعك</b><p>النص، المشاهد، الصوت والإعدادات تحفظ تلقائيًا في ملف العمل.</p></div><div class="rmplus-step"><em>03</em><b>راجع النتيجة</b><p>شاهد الفيديو قبل فتح المونتاج وعدّل المشهد الذي يحتاج فقط.</p></div><div class="rmplus-step"><em>04</em><b>عدّل وصدّر</b><p>حمّل النتيجة أو أكملها في المحرر بنفس هوية المشروع.</p></div></div>
        </section>
        <footer class="rmplus-footer"><strong>Reels Maker AI</strong><span>Build stories • Quran reels • edit • review • export</span></footer>
      </main>`;
    qid("rmplusMenu")?.addEventListener("click",()=>qid("creatorMenuLaunch")?.click());
    buildPhone();
    return true;
  }

  function buildPhone() {
    const host=qid("rmplusSlides"), dots=qid("rmplusDots"), device=qid("rmplusDevice"); if(!host||!dots||!device)return;
    host.innerHTML=slides.map((s,i)=>`<section class="rmplus-slide ${i===0?"active":""}" data-rmslide="${i}"><div class="rmplus-media" style="background-image:url('${s.image}')"></div><div class="rmplus-slide-ui"><span class="rmplus-slide-tag">${s.tag}</span><h3>${s.title}</h3><p>${s.text}</p><div class="rmplus-mini-timeline"><div class="rmplus-track"></div><div class="rmplus-wave"></div></div></div></section>`).join("");
    dots.innerHTML=slides.map((_,i)=>`<button type="button" class="rmplus-dot ${i===0?"active":""}" data-rmdot="${i}" aria-label="معاينة ${i+1}"></button>`).join("");
    qsa("[data-rmdot]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();showPhone(+b.dataset.rmdot);restartPhone();}));
    let sx=0,sy=0,drag=false;
    device.addEventListener("pointerdown",e=>{sx=e.clientX;sy=e.clientY;drag=true;try{device.setPointerCapture(e.pointerId);}catch{}});
    device.addEventListener("pointerup",e=>{if(!drag)return;drag=false;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>34&&Math.abs(dx)>Math.abs(dy)){showPhone(phoneIndex+(dx<0?1:-1));restartPhone();}});
    device.addEventListener("pointercancel",()=>drag=false);
    restartPhone();
  }
  function showPhone(i){phoneIndex=(i+slides.length)%slides.length;qsa("[data-rmslide]").forEach((el,n)=>el.classList.toggle("active",n===phoneIndex));qsa("[data-rmdot]").forEach((el,n)=>el.classList.toggle("active",n===phoneIndex));}
  function restartPhone(){clearInterval(phoneTimer);phoneTimer=setInterval(()=>showPhone(phoneIndex+1),4800);}

  function upgradeLogos() {
    qsa(".logo,.home-logo").forEach(el=>{if(el.dataset.rmLogo)return;el.dataset.rmLogo="1";el.classList.add("rm-brand-logo");el.innerHTML=logoSvg();});
  }

  function simplifyNarrator() {
    const s=qid("ssNarrator"); if(!s || s.dataset.rmplusVoice==="1")return;
    const old=s.value;s.innerHTML="";s.add(new Option("راوي رجل — عميق وطبيعي","Charon"));s.add(new Option("راوية امرأة — هادئة وطبيعية","Kore"));s.value=old==="Charon"?"Charon":"Kore";s.dataset.rmplusVoice="1";s.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function cleanTopControls() {
    qid("rmProjectsHomeBtn")?.remove();
    const header=qs(".home-header-actions"); if(header) qsa.call ? null : null;
    qsa(".home-header-actions button").forEach(btn=>{const t=btn.textContent||"";if(!t.includes("الأقسام"))btn.remove();});
    qsa(".home-float").forEach(el=>el.remove());
  }

  function ensureDrawer() {
    const drawer=qs(".creator-drawer"); if(!drawer||qid("rmPlusNav"))return false;
    qsa(".creator-drawer .creator-nav-btn").forEach(b=>b.style.display="none");
    const nav=document.createElement("div");nav.id="rmPlusNav";nav.style.cssText="display:flex;flex-direction:column;gap:0;padding:8px 0";
    const items=[
      ["home","⌂","الرئيسية",()=>showHome(true)],
      ["projects","▦","مشاريعي",()=>{const old=qs('[data-rm-projects]'); if(old){old.click();setRoute('projects',true)}else openProjects(true)}],
      ["story","▤","قصة مع فيديو",()=>openStory(true)],
      ["quran","☪","استوديو القرآن",()=>openQuran(true)],
      ["islamic","◈","المحتوى الإسلامي",()=>openIslamic(true)],
      ["editor","✂","محرر ومونتاج الفيديو",()=>showEditorBase(true)]
    ];
    items.forEach(([key,ic,label,fn])=>{const b=document.createElement("button");b.type="button";b.className="creator-nav-btn rmplus-nav-btn";b.dataset.rmplusRoute=key;b.innerHTML=`<span style="font-size:13px;width:20px;text-align:center">${ic}</span><strong style="flex:1;text-align:right">${label}</strong>`;b.style.display="flex";b.style.alignItems="center";b.style.gap="8px";b.addEventListener("click",()=>{qid("creatorDrawerClose")?.click();fn();});nav.appendChild(b);});
    const head=drawer.querySelector(".creator-drawer-head");head?.insertAdjacentElement("afterend",nav);syncDrawerActive();return true;
  }
  function syncDrawerActive(){const r=route();qsa("[data-rmplus-route]").forEach(b=>b.classList.toggle("active",b.dataset.rmplusRoute===r));}

  function watchSections() {
    ["storyStudio","quranStudio","islamicContentLibrary","rmProjects"].forEach(id=>{
      const el=qid(id);if(!el||el.dataset.rmRouteWatch)return;el.dataset.rmRouteWatch="1";
      new MutationObserver(()=>{if(restoring)return;if(el.classList.contains("open")){const r=id==="storyStudio"?"story":id==="quranStudio"?"quran":id==="islamicContentLibrary"?"islamic":"projects";setRoute(r,false);syncDrawerActive();}}).observe(el,{attributes:true,attributeFilter:["class"]});
    });
  }

  function install() {
    if(built)return;built=true;
    const tick=()=>{
      buildHome(); upgradeLogos(); cleanTopControls(); simplifyNarrator(); ensureDrawer(); watchSections();
      if(!qid("homeShell")||!qs(".creator-drawer"))setTimeout(tick,120);
    };
    tick();
    window.addEventListener("popstate",()=>{restoring=false;restoreRoute();});
    setTimeout(restoreRoute,160);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
