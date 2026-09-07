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
    b.innerHTML=gold?'<span class="rm-theme-icon">◐</span><span><b>الوضع الداكن</b><small>العودة للواجهة الداكنة</small></span>':'<span class="rm-theme-icon">☀</span><span><b>الوضع الذهبي</b><small>أبيض + ذهبي</small></span>';
  }
  function toggleTheme(){
    const next=document.documentElement.dataset.rmTheme==="gold"?"dark":"gold";
    document.documentElement.dataset.rmTheme=next;localStorage.setItem("reels-shell-theme",next);syncThemeButton();
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
      if(close)close.click();
      else studio.classList.remove("open");
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
          right:calc(var(--rm-shell-w) + 28px)!important;
          width:auto!important;
          max-width:none!important;
        }
        body.rm-shell-v2 .rmp2-shell{
          left:20px!important;
          right:20px!important;
        }
      }
      @media (max-width:1000px){
        body.rm-shell-v2 .qr-studio,
        body.rm-shell-v2 .rmi,
        body.rm-shell-v2 .rmp2{
          inset:0!important;
          width:auto!important;
          max-width:none!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildShell(){
    if($("rmShellSidebar"))return;
    const side=document.createElement("aside");side.id="rmShellSidebar";side.className="rm-shell-sidebar";side.setAttribute("aria-label","القائمة الرئيسية");
    side.innerHTML=`<div class="rm-shell-head"><div class="rm-shell-logo">R</div><div class="rm-shell-brand"><b>Reels Maker AI</b><span>Creative Studio</span></div><button id="rmMobileClose" class="rm-mobile-close" type="button" aria-label="إغلاق القائمة">×</button></div><div class="rm-shell-caption">الخدمات</div><nav class="rm-shell-nav">${items.map(([key,icon,label,desc,tone])=>`<button class="rm-shell-item" data-rm-tool="${key}" data-tone="${tone}" type="button"><span class="rm-shell-icon">${icon}</span><span class="rm-shell-copy"><b>${label}</b><small>${desc}</small></span><span class="rm-shell-arrow">‹</span></button>`).join("")}</nav><div class="rm-shell-footer"><button id="rmThemeToggle" class="rm-theme-toggle" type="button"></button><div class="rm-shell-actions"><button type="button" data-rm-action="new"><span>＋</span> مشروع جديد</button><button type="button" data-rm-action="export"><span>⇩</span> تصدير الريل</button></div></div>`;
    const toggle=document.createElement("button");toggle.id="rmMobileMenu";toggle.className="rm-mobile-menu";toggle.type="button";toggle.setAttribute("aria-label","فتح القائمة");toggle.setAttribute("aria-expanded","false");toggle.innerHTML="<span></span><span></span><span></span>";
    const overlay=document.createElement("button");overlay.id="rmMobileOverlay";overlay.className="rm-mobile-overlay";overlay.type="button";overlay.setAttribute("aria-label","إغلاق القائمة");
    document.body.append(side,overlay,toggle);document.body.classList.add("rm-shell-v2");
    side.addEventListener("click",e=>{
      const tool=e.target.closest("[data-rm-tool]");if(tool)return navigate(tool.dataset.rmTool);
      const action=e.target.closest("[data-rm-action]");if(action?.dataset.rmAction==="new"){closeMobile();closeOtherSurfaces();return $("resetBtn")?.click();}if(action?.dataset.rmAction==="export"){closeMobile();return $("exportBtn")?.click();}
      if(e.target.closest("#rmThemeToggle"))toggleTheme();
    });
    toggle.onclick=()=>mobileOpen?closeMobile():openMobile();overlay.onclick=closeMobile;$("rmMobileClose").onclick=closeMobile;
    syncThemeButton();setActive("home");
  }

  function upgradeHome(){
    const home=$("transparentHome");if(!home||home.dataset.shellV2==="1")return;
    home.dataset.shellV2="1";home.classList.add("rm-home-v2");
    const sub=home.querySelector(".th-brand-copy span");if(sub)sub.textContent="Creative Content Studio";
    const pill=home.querySelector(".th-pill");if(pill)pill.innerHTML='<i></i><span>منصة صناعة المحتوى جاهزة</span> READY';
    home.querySelector(".th-top-actions .th-main-btn")?.remove();home.querySelector(".th-hero-actions")?.remove();home.querySelector(".th-quick")?.remove();home.querySelector(".th-section")?.remove();
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
    const studio=$("reelsImageStudio");if(!studio||studio.dataset.shellV2Patched==="1")return;studio.dataset.shellV2Patched="1";
    const auto=studio.querySelector(".rmi-auto");if(auto)auto.textContent="SMART MODE";
    const note=studio.querySelector(".rmi-note");if(note)note.textContent="الوضع الذكي يختار أفضل مسار متاح تلقائيًا ويحافظ على استمرارية العمل بدون إظهار التفاصيل التقنية للمستخدم.";
  }

  function observe(){
    let queued=false;
    new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;upgradeHome();sanitizeProviders(document.body);patchImageStudio();});}).observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function init(){
    loadTheme();installWorkspaceGuards();buildShell();upgradeHome();patchEditorLabels();sanitizeProviders(document.body);patchImageStudio();observe();
    document.addEventListener("click",e=>{
      const tab=e.target.closest?.(".tab[data-tab]");if(tab?.dataset.tab)setActive(tab.dataset.tab);
      if(e.target.closest?.("#qrOpenEditor"))setTimeout(()=>setActive("video"),0);
    },true);
    window.addEventListener("resize",()=>{if(window.innerWidth>MOBILE)closeMobile();});
    window.addEventListener("popstate",()=>{if(location.hash==="#images")setActive("images");});
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();