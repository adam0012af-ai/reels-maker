"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const MOBILE = 1000;
  const items = [
    ["home","⌂","الصفحة الرئيسية","مساحة البداية وإدارة المشروع","blue"],
    ["quran","☪","استوديو القرآن","إنشاء وتصميم ريلز القرآن","green"],
    ["video","🎬","محرر الفيديو","إضافة وتحرير الفيديو والخلفيات","blue"],
    ["images","◇","استوديو الصور","إنشاء وتعديل الصور والأغلفة","gold"],
    ["audio","♫","نص → صوت","تحويل النص إلى تعليق صوتي","pink"],
    ["text","T","النصوص","إضافة وتنسيق النصوص","violet"],
    ["stickers","✦","العناصر والملصقات","عناصر بصرية وملصقات وصور","orange"],
    ["layers","▱","الطبقات","ترتيب وإدارة عناصر المشروع","cyan"],
    ["settings","⚙","الإعدادات","الجودة والأداء والتصدير","slate"]
  ];
  let mobileOpen = false;

  const providerReplacements = [
    [/Pexels\s*(?:أو|\/|&)?\s*Pixabay/gi,"مكتبة الفيديو"],
    [/Pexels/gi,"مكتبة الفيديو"],[/Pixabay/gi,"مكتبة الفيديو"],
    [/Powered by\s*GIPHY/gi,"مكتبة العناصر"],[/GIPHY/gi,"مكتبة العناصر"],
    [/Gemini AI Text-to-Speech/gi,"نص → صوت"],[/Gemini TTS/gi,"نص → صوت"],
    [/Gemini/gi,"الذكاء الصوتي"],[/Nano Banana/gi,"المعالجة الذكية"],
    [/ElevenLabs/gi,"الخدمة الصوتية"],[/AUTO FALLBACK/gi,"SMART MODE"]
  ];

  function sanitizeText(value){
    let out=value;
    providerReplacements.forEach(([rx,to])=>{out=out.replace(rx,to);});
    return out;
  }

  function sanitizeProviders(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const next=sanitizeText(node.nodeValue||"");if(next!==node.nodeValue)node.nodeValue=next;});
  }

  function loadTheme(){
    document.documentElement.dataset.rmTheme=localStorage.getItem("reels-shell-theme")==="gold"?"gold":"dark";
  }
  function syncThemeButton(){
    const b=$("rmThemeToggle"); if(!b)return;
    const gold=document.documentElement.dataset.rmTheme==="gold";
    b.innerHTML=gold?'<span class="rm-head-theme-icon">◐</span><span>داكن</span>':'<span class="rm-head-theme-icon">☀</span><span>فاتح</span>';
    b.title=gold?"تفعيل الوضع الداكن":"تفعيل الوضع الأبيض والذهبي";
    b.setAttribute("aria-label",b.title);
  }
  function toggleTheme(){
    const next=document.documentElement.dataset.rmTheme==="gold"?"dark":"gold";
    document.documentElement.dataset.rmTheme=next;
    localStorage.setItem("reels-shell-theme",next);
    syncThemeButton();
  }

  function setActive(key){
    document.querySelectorAll("[data-rm-tool]").forEach(b=>{
      const active=b.dataset.rmTool===key;b.classList.toggle("active",active);
      active?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current");
    });
  }
  function closeMobile(){mobileOpen=false;document.body.classList.remove("rm-mobile-open");$("rmMobileMenu")?.setAttribute("aria-expanded","false");}
  function openMobile(){mobileOpen=true;document.body.classList.add("rm-mobile-open");$("rmMobileMenu")?.setAttribute("aria-expanded","true");}

  function closeQuran(){
    const studio=$("quranStudio");
    if(!studio)return;
    if(studio.classList.contains("open")){
      const close=$("qrClose");
      if(close)close.click(); else studio.classList.remove("open");
    }
  }
  function closeProjects(){
    window.ReelsProjectsV2?.close?.();
    $("rmProjectsV2")?.classList.remove("open");
  }
  function closeOtherSurfaces(keep=""){
    if(keep!=="quran")closeQuran();
    if(keep!=="images")window.ReelsImageStudio?.close?.();
    if(keep!=="projects")closeProjects();
    if(keep!=="story")$("storyStudio")?.classList.remove("open");
  }

  function hideHome(){
    const home=$("transparentHome");if(home){home.classList.remove("open");home.setAttribute("aria-hidden","true");}
    document.body.classList.remove("th-home-open");document.body.style.overflow="";
    if($("transparentHomeBack"))$("transparentHomeBack").hidden=true;
  }
  function showHome(){
    closeOtherSurfaces("home");
    const home=$("transparentHome");if(home){home.classList.add("open");home.setAttribute("aria-hidden","false");}
    document.body.classList.add("th-home-open");document.body.style.overflow="hidden";
    if($("transparentHomeBack"))$("transparentHomeBack").hidden=true;
    setActive("home");
  }
  function openQuran(){
    hideHome();closeOtherSurfaces("quran");
    const click=(n=0)=>{const b=$("quranStudioLaunch");if(b){b.click();setActive("quran");}else if(n<30)setTimeout(()=>click(n+1),100);};click();
  }
  function openImages(){
    hideHome();closeOtherSurfaces("images");
    const open=(n=0)=>{if(window.ReelsImageStudio?.open){window.ReelsImageStudio.open();setActive("images");patchImageStudio();sanitizeProviders(document.body);}else if(n<30)setTimeout(()=>open(n+1),100);};open();
  }
  function openEditor(key){
    hideHome();closeOtherSurfaces(key);
    document.querySelector(`.tab[data-tab="${key}"]`)?.click();
    setActive(key);
  }
  function navigate(key){
    closeMobile();
    if(key==="home")showHome();
    else if(key==="quran")openQuran();
    else if(key==="images")openImages();
    else openEditor(key);
  }

  function installWorkspaceGuards(){
    if($("rmShellWorkspaceGuard"))return;
    const style=document.createElement("style");
    style.id="rmShellWorkspaceGuard";
    style.textContent=`
      @media (min-width:1001px){
        body.rm-shell-v2 .qr-studio,
        body.rm-shell-v2 .rmi,
        body.rm-shell-v2 .rmp2{
          left:0!important;
          right:var(--rm-shell-w)!important;
          width:auto!important;
          max-width:none!important;
        }
        body.rm-shell-v2 .rmp2-shell{left:16px!important;right:16px!important;}
      }
      @media (max-width:1000px){
        body.rm-shell-v2 .qr-studio,
        body.rm-shell-v2 .rmi,
        body.rm-shell-v2 .rmp2{inset:0!important;width:auto!important;max-width:none!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function installVisualFixes(){
    if($("rmShellV4Fixes"))return;
    const style=document.createElement("style");
    style.id="rmShellV4Fixes";
    style.textContent=`
      /* Header theme button */
      .rm-head-theme{height:40px;min-width:67px;border:1px solid var(--rm-line);border-radius:12px;background:rgba(255,255,255,.045);color:#edf1f7;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;font:800 8px Cairo;white-space:nowrap}
      .rm-head-theme:hover{background:rgba(255,255,255,.075);border-color:rgba(120,136,255,.28)}
      .rm-head-theme-icon{font-size:15px;line-height:1;color:#ffd477}
      .rm-shell-footer{padding:10px 12px 13px!important;text-align:center!important}
      .rm-shell-credit{display:block;color:#68768b;font:700 8px Cairo;letter-spacing:.01em}
      .rm-shell-credit b{color:#aeb9ca;font-weight:800}

      /* Remove old navigation/header actions; keep only project identity */
      body.rm-shell-v2 .topbar .actions{display:none!important}
      body.rm-shell-v2 .topbar{justify-content:flex-start!important}
      body.rm-shell-v2 .project{margin-inline-start:auto!important}
      body.rm-shell-v2 #quranStudioLaunch{display:none!important}
      body.rm-shell-v2 .topbar [data-rmplus-route],
      body.rm-shell-v2 #rmPlusNav,
      body.rm-shell-v2 .rm-plus-nav{display:none!important}

      /* One global navigation only: image studio internal sections become horizontal tabs */
      @media(min-width:1001px){
        body.rm-shell-v2 .rmi.open{grid-template-rows:70px minmax(0,1fr)!important;overflow:hidden!important}
        body.rm-shell-v2 .rmi-shell{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:auto minmax(0,1fr)!important;min-height:0!important}
        body.rm-shell-v2 .rmi-side{display:flex!important;align-items:center!important;gap:7px!important;overflow-x:auto!important;overflow-y:hidden!important;padding:9px 14px!important;border-left:0!important;border-bottom:1px solid rgba(255,255,255,.08)!important;background:#070d15!important}
        body.rm-shell-v2 .rmi-side button{width:auto!important;min-width:max-content!important;min-height:38px!important;margin:0!important;padding:0 13px!important;border-radius:10px!important;text-align:center!important}
        body.rm-shell-v2 .rmi-main{min-height:0!important;overflow:auto!important}
        body.rm-shell-v2 .rmi-content{max-width:1180px!important;padding:18px 20px 28px!important}
      }

      /* Quran studio: clean contained body */
      body.rm-shell-v2 .qr-studio{overflow:hidden!important}
      body.rm-shell-v2 .qr-head{box-sizing:border-box!important}
      body.rm-shell-v2 .qr-body{min-height:0!important;overflow:hidden!important}
      body.rm-shell-v2 .qr-settings{min-height:0!important}
      body.rm-shell-v2 .qr-preview-col{min-height:0!important}

      /* Editor proportions */
      @media(min-width:1001px){
        body.rm-shell-v2 .workspace{grid-template-rows:52px minmax(0,1fr) 60px!important}
        body.rm-shell-v2 .topbar{height:52px!important;min-height:52px!important;padding:0 18px!important}
        body.rm-shell-v2 .controls{width:380px!important;min-width:380px!important;padding:18px 16px 22px!important}
        body.rm-shell-v2 .stage-wrap{padding:16px 24px!important;display:flex!important;align-items:center!important;justify-content:center!important}
        body.rm-shell-v2 .stage{height:min(73vh,760px)!important;max-height:calc(100vh - 145px)!important}
      }

      /* Gold mode must apply to the actual studios too */
      html[data-rm-theme="gold"] .rm-head-theme{background:#fff!important;color:#3b2a0f!important;border-color:rgba(143,103,27,.16)!important}
      html[data-rm-theme="gold"] .rm-shell-credit{color:#9a8664!important}html[data-rm-theme="gold"] .rm-shell-credit b{color:#5e4722!important}

      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-studio{background:linear-gradient(145deg,#f8f3e8,#eee6d8)!important;color:#20180d!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-head{background:rgba(255,253,248,.96)!important;border-bottom-color:rgba(143,103,27,.13)!important;color:#241b0f!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-head-title b{color:#241b0f!important}html[data-rm-theme="gold"] body.rm-shell-v2 .qr-head-title span{color:#84745c!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-head button{background:#fff!important;color:#2c2111!important;border-color:rgba(143,103,27,.14)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-settings{background:#f8f2e7!important;border-left-color:rgba(143,103,27,.13)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-preview-col{background:#f3ecdf!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-section{background:#fff!important;border-color:rgba(143,103,27,.13)!important;box-shadow:0 8px 24px rgba(98,70,18,.04)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-section-title b{color:#2a2012!important}html[data-rm-theme="gold"] body.rm-shell-v2 .qr-section-title small,html[data-rm-theme="gold"] body.rm-shell-v2 .qr-field>span{color:#7e705b!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-field select,html[data-rm-theme="gold"] body.rm-shell-v2 .qr-field input[type=text],html[data-rm-theme="gold"] body.rm-shell-v2 .qr-field input[type=search],html[data-rm-theme="gold"] body.rm-shell-v2 .qr-field input[type=number]{background:#fcfaf5!important;color:#251d12!important;border-color:rgba(143,103,27,.16)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-btn,html[data-rm-theme="gold"] body.rm-shell-v2 .qr-chip{background:#fffaf0!important;color:#5f4e31!important;border-color:rgba(143,103,27,.15)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-btn.primary{background:linear-gradient(135deg,#c99b38,#e0b958)!important;color:#261b09!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-btn.ai{background:linear-gradient(135deg,#7868d9,#967ae8)!important;color:#fff!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .qr-ready-note,html[data-rm-theme="gold"] body.rm-shell-v2 .qr-status{color:#776b58!important}

      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi{background:#f6f0e5!important;color:#20180d!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-head{background:rgba(255,253,248,.97)!important;border-bottom-color:rgba(143,103,27,.13)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-head h2{color:#261d10!important}html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-head p{color:#82745d!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-close{background:#fff!important;color:#241b0f!important;border-color:rgba(143,103,27,.15)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-side{background:#f5eddf!important;border-bottom-color:rgba(143,103,27,.13)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-side button{color:#75664e!important;background:transparent!important}html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-side button.active{color:#5b4215!important;background:#fff!important;border-color:rgba(174,126,31,.2)!important;box-shadow:inset 0 -3px 0 #c99730!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-main{background:#f7f1e6!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-card,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-result,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-toolbox{background:#fff!important;border-color:rgba(143,103,27,.13)!important;box-shadow:0 10px 30px rgba(98,70,18,.045)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-title h3,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-toolbox b{color:#261d10!important}html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-title p,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-toolbox p{color:#81725a!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-field textarea,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-field input,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-field select{background:#fcfaf5!important;color:#241b0f!important;border-color:rgba(143,103,27,.16)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-seg button,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-style,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-btn{background:#fffaf0!important;color:#6c5a3d!important;border-color:rgba(143,103,27,.14)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-seg button.active,html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-style.active{background:rgba(214,168,74,.14)!important;color:#644711!important;border-color:rgba(174,126,31,.22)!important}
      html[data-rm-theme="gold"] body.rm-shell-v2 .rmi-btn.primary{background:linear-gradient(135deg,#c99a35,#dbb04b)!important;color:#271c09!important;border-color:transparent!important}

      @media(max-width:1000px){
        .rm-head-theme{min-width:58px;height:38px}
        body.rm-shell-v2 .rmi-side{display:flex!important;overflow-x:auto!important;overflow-y:hidden!important}
      }
    `;
    document.head.appendChild(style);
  }

  function cleanLegacyUi(){
    const exact=new Set(["الأقسام","ريل القرآن","مشروع جديد","تصدير وتحميل الريل","تصدير وتحميل الريل HD"]);
    document.querySelectorAll("button").forEach(btn=>{
      if(btn.closest("#rmShellSidebar"))return;
      const text=(btn.textContent||"").replace(/\s+/g," ").trim();
      if(exact.has(text))btn.style.setProperty("display","none","important");
    });
    const pill=$("transparentHome")?.querySelector(".th-pill");if(pill)pill.remove();
  }

  function buildShell(){
    if($("rmShellSidebar"))return;
    const side=document.createElement("aside");side.id="rmShellSidebar";side.className="rm-shell-sidebar";side.setAttribute("aria-label","القائمة الرئيسية");
    side.innerHTML=`<div class="rm-shell-head"><div class="rm-shell-logo">R</div><div class="rm-shell-brand"><b>Reels Maker AI</b><span>Creative Studio</span></div><button id="rmThemeToggle" class="rm-head-theme" type="button"></button><button id="rmMobileClose" class="rm-mobile-close" type="button" aria-label="إغلاق القائمة">×</button></div><div class="rm-shell-caption">الخدمات</div><nav class="rm-shell-nav">${items.map(([key,icon,label,desc,tone])=>`<button class="rm-shell-item" data-rm-tool="${key}" data-tone="${tone}" type="button"><span class="rm-shell-icon">${icon}</span><span class="rm-shell-copy"><b>${label}</b><small>${desc}</small></span><span class="rm-shell-arrow">‹</span></button>`).join("")}</nav><div class="rm-shell-footer"><span class="rm-shell-credit">برمجة وتطوير <b>Adam</b></span></div>`;
    const toggle=document.createElement("button");toggle.id="rmMobileMenu";toggle.className="rm-mobile-menu";toggle.type="button";toggle.setAttribute("aria-label","فتح القائمة");toggle.setAttribute("aria-expanded","false");toggle.innerHTML="<span></span><span></span><span></span>";
    const overlay=document.createElement("button");overlay.id="rmMobileOverlay";overlay.className="rm-mobile-overlay";overlay.type="button";overlay.setAttribute("aria-label","إغلاق القائمة");
    document.body.append(side,overlay,toggle);document.body.classList.add("rm-shell-v2");
    side.addEventListener("click",e=>{
      const tool=e.target.closest("[data-rm-tool]");if(tool)return navigate(tool.dataset.rmTool);
      if(e.target.closest("#rmThemeToggle"))return toggleTheme();
    });
    toggle.onclick=()=>mobileOpen?closeMobile():openMobile();overlay.onclick=closeMobile;$("rmMobileClose").onclick=closeMobile;
    syncThemeButton();setActive("home");
  }

  function upgradeHome(){
    const home=$("transparentHome");if(!home)return;
    home.classList.add("rm-home-v2");home.dataset.shellV2="1";
    const sub=home.querySelector(".th-brand-copy span");if(sub)sub.textContent="Creative Content Studio";
    home.querySelector(".th-pill")?.remove();home.querySelector(".th-top-actions .th-main-btn")?.remove();home.querySelector(".th-hero-actions")?.remove();home.querySelector(".th-quick")?.remove();home.querySelector(".th-section")?.remove();
    const eyebrow=home.querySelector(".th-eyebrow");if(eyebrow)eyebrow.textContent="✦ مساحة واحدة لصناعة المحتوى";
    const title=home.querySelector(".th-hero h1");if(title)title.innerHTML="حوّل فكرتك إلى محتوى<br><em>جاهز للنشر.</em>";
    const p=home.querySelector(".th-hero-main > p");if(p)p.textContent="أنشئ مشروعك، عدّل التفاصيل، وأخرج النتيجة النهائية من مساحة عمل موحّدة. اختر الخدمة التي تحتاجها من القائمة الجانبية وابدأ مباشرة.";
    const main=home.querySelector(".th-hero-main");if(main&&!home.querySelector(".rm-home-highlights"))main.insertAdjacentHTML("beforeend",'<div class="rm-home-highlights"><div><strong>01</strong><span>مساحة عمل موحّدة</span></div><div><strong>02</strong><span>تحكم كامل في المشروع</span></div><div><strong>03</strong><span>تصدير بجودة عالية</span></div></div><div class="rm-home-hint"><span>←</span> اختر الخدمة من القائمة الجانبية للبدء</div>');
    const hero=home.querySelector(".th-hero");if(hero&&!home.querySelector(".rm-home-showcase"))hero.insertAdjacentHTML("beforeend",'<aside class="rm-home-showcase" aria-hidden="true"><div class="rm-showcase-orbit orbit-a"></div><div class="rm-showcase-orbit orbit-b"></div><div class="rm-showcase-core"><span>REELS MAKER</span><strong>AI</strong><small>CREATE • EDIT • PUBLISH</small></div><div class="rm-showcase-chip chip-a">VIDEO</div><div class="rm-showcase-chip chip-b">VOICE</div><div class="rm-showcase-chip chip-c">IMAGE</div></aside>');
    if($("transparentHomeBack"))$("transparentHomeBack").hidden=true;
  }

  function patchEditorLabels(){
    if(document.body.dataset.rmLabelsV2==="1")return;document.body.dataset.rmLabelsV2="1";
    const video=$("panel-video")?.querySelector(".panel-title");if(video)video.innerHTML="<h2>مكتبة الفيديو</h2><p>ابحث عن فيديو مناسب لمشروعك أو ارفع ملفًا من جهازك.</p>";
    const vs=document.querySelectorAll("#videoSourceSwitch button");if(vs[0])vs[0].textContent="المكتبة الرئيسية";if(vs[1])vs[1].textContent="مكتبة إضافية";
    const stickers=$("panel-stickers")?.querySelector(".panel-title");if(stickers)stickers.innerHTML="<h2>العناصر والملصقات</h2><p>ابحث عن عناصر بصرية جاهزة أو ارفع ملفاتك الخاصة.</p>";
    const ss=document.querySelectorAll("#stickerTypeSwitch button");if(ss[0])ss[0].textContent="ملصقات";if(ss[1])ss[1].textContent="صور متحركة";
    if(document.querySelector(".powered"))document.querySelector(".powered").textContent="مكتبة العناصر جاهزة للاستخدام.";
    if($("aiStatus"))$("aiStatus").textContent="التوليد الذكي جاهز لاقتراح النصوص داخل المشروع.";
    const audio=$("panel-audio")?.querySelector(".panel-title");if(audio)audio.innerHTML="<h2>نص → صوت والصوت</h2><p>حوّل النص إلى تعليق صوتي، أضف ملفاتك، وتحكم في مستويات الصوت والمؤثرات.</p>";
    const tt=document.querySelector(".tts-box > b");if(tt)tt.textContent="نص → صوت";
    if($("ttsStatus"))$("ttsStatus").textContent="اكتب النص، اختر الصوت وأسلوب الإلقاء، ثم أضفه إلى المشروع.";
    const notice=$("panel-settings")?.querySelector(".notice");if(notice)notice.innerHTML="<b>الخدمات الذكية متصلة</b><p>يمكنك استخدام مكتبات الوسائط، أدوات الذكاء الاصطناعي، رفع ملفاتك، وإنشاء المشروع كاملًا من داخل الاستوديو.</p>";
    const empty=$("emptyState")?.querySelector("p");if(empty)empty.textContent="اختر فيديو من المكتبة أو ارفع ملفًا من جهازك للبدء.";
  }

  function patchImageStudio(){
    const studio=$("reelsImageStudio");if(!studio)return;
    studio.dataset.shellV2Patched="1";
    const auto=studio.querySelector(".rmi-auto");if(auto)auto.textContent="SMART MODE";
    const note=studio.querySelector(".rmi-note");if(note)note.textContent="الوضع الذكي يختار أفضل مسار متاح تلقائيًا ويحافظ على استمرارية العمل بدون إظهار التفاصيل التقنية للمستخدم.";
  }

  function observe(){
    let queued=false;
    new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;upgradeHome();sanitizeProviders(document.body);patchImageStudio();cleanLegacyUi();});}).observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function init(){
    loadTheme();installWorkspaceGuards();installVisualFixes();buildShell();upgradeHome();patchEditorLabels();sanitizeProviders(document.body);patchImageStudio();cleanLegacyUi();observe();
    document.addEventListener("click",e=>{
      const tab=e.target.closest?.(".tab[data-tab]");if(tab?.dataset.tab)setActive(tab.dataset.tab);
      if(e.target.closest?.("#qrOpenEditor"))setTimeout(()=>setActive("video"),0);
    },true);
    window.addEventListener("resize",()=>{if(window.innerWidth>MOBILE)closeMobile();});
    window.addEventListener("popstate",()=>{if(location.hash==="#images")setActive("images");});
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();