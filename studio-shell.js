"use strict";
(() => {
  if (window.__REELS_STUDIO_SHELL__) return;
  window.__REELS_STUDIO_SHELL__ = true;
  const $ = id => document.getElementById(id);
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const tools = {
    templates:["📁","Templates","القوالب","ابدأ من إعداد جاهز"],
    video:["🎥","Media","الميديا","Pexels و Pixabay والرفع"],
    text:["✍️","Text","النص والـ AI","النصوص والكابشن والذكاء الاصطناعي"],
    quran:["📖","Quran","استوديو القرآن","السورة والآيات والقارئ والتصدير"],
    audio:["🎙️","Audio","الصوت و Gemini","TTS و SFX وملفات الصوت"],
    stickers:["🎨","Stickers","الملصقات و GIF","GIPHY والرفع من الجهاز"],
    layers:["🥞","Layers","الطبقات","ترتيب العناصر والتحويلات"],
    settings:["⚙️","Settings","الإعدادات","الجودة والأداء والتصدير"]
  };
  const ui = window.ReelsModernStudio = {
    activeTool:"video", drawerOpen:true, tools,
    coreState(){ try { return typeof state!=="undefined" ? state : null; } catch { return null; } },
    coreVideo(){ return $("sourceVideo"); }
  };

  function restoreLegacyMobile(){
    const panels=qs("#controlsPanel .panels"), host=$("mobilePanelHost");
    if(panels&&host) qsa(":scope>.panel",host).forEach(p=>panels.appendChild(p));
    $("mobileSheet")?.classList.remove("open");
    try{ if(typeof syncResponsivePanels==="function") window.removeEventListener("resize",syncResponsivePanels); }catch{}
    try{ const s=ui.coreState(); if(s) s.mobilePanel=null; }catch{}
  }
  ui.restoreLegacyMobile=restoreLegacyMobile;

  function addTemplates(){
    const panels=qs("#controlsPanel .panels"); if(!panels||$("panel-templates")) return;
    const p=document.createElement("section"); p.id="panel-templates"; p.className="panel modern-template-panel";
    p.innerHTML=`<div class="panel-title"><h2>قوالب بداية سريعة</h2><p>اختصارات حقيقية للأدوات الموجودة بالفعل.</p></div><div class="studio-template-grid">
      <button class="studio-template-card" data-template="blank"><i class="studio-template-visual">＋</i><b>Blank Reel</b><small>مشروع جديد فارغ</small></button>
      <button class="studio-template-card" data-template="cinematic"><i class="studio-template-visual template-video">🎬</i><b>Cinematic</b><small>بحث فيديو سينمائي</small></button>
      <button class="studio-template-card" data-template="quran"><i class="studio-template-visual template-quran">☪</i><b>Quran Reel</b><small>فتح استوديو القرآن</small></button>
      <button class="studio-template-card" data-template="text"><i class="studio-template-visual template-text">T</i><b>Text First</b><small>بدء المشروع بنص</small></button>
    </div>`;
    p.addEventListener("click",e=>{
      const b=e.target.closest("[data-template]"); if(!b)return;
      const a=b.dataset.template;
      if(a==="blank"){ $("resetBtn")?.click(); ui.openTool("video"); }
      if(a==="cinematic"){ ui.openTool("video"); setTimeout(()=>{ const i=$("videoSearch"); if(i)i.value="cinematic"; $("videoSearchBtn")?.click(); },100); }
      if(a==="quran") ui.openTool("quran");
      if(a==="text"){ ui.openTool("text"); setTimeout(()=>$("newText")?.focus(),100); }
    });
    panels.prepend(p);
  }

  function buildRail(){
    if($("modernToolRail"))return;
    const rail=document.createElement("nav"); rail.id="modernToolRail"; rail.className="studio-rail"; rail.setAttribute("aria-label","Studio tools");
    rail.innerHTML=`<div class="studio-rail-top"><div class="studio-rail-logo">R</div></div><div class="studio-rail-tools">${Object.entries(tools).map(([k,v])=>`<button class="studio-rail-btn${k==="video"?" active":""}" data-modern-tool="${k}" title="${v[2]}"><span>${v[0]}</span><em>${v[1]}</em></button>`).join("")}</div>`;
    rail.addEventListener("click",e=>{ const b=e.target.closest("[data-modern-tool]"); if(b)ui.openTool(b.dataset.modernTool); });
    document.body.appendChild(rail);
  }

  function buildDrawer(){
    const c=$("controlsPanel"), panels=qs(".panels",c); if(!c||!panels||$("modernDrawerHead"))return;
    const h=document.createElement("div"); h.id="modernDrawerHead"; h.className="studio-drawer-head";
    h.innerHTML=`<div class="studio-drawer-heading"><span id="modernDrawerIcon">🎥</span><div><b id="modernDrawerTitle">الميديا</b><small id="modernDrawerSub">Pexels و Pixabay والرفع</small></div></div><button id="studioDrawerClose" type="button">×</button>`;
    c.insertBefore(h,panels); $("studioDrawerClose").onclick=()=>ui.closeDrawer();
  }

  function setPanel(tool){
    const panels=qs("#controlsPanel .panels"); if(!panels)return;
    qsa(":scope>.panel",panels).forEach(p=>p.classList.toggle("active",p.id===`panel-${tool}`));
    qsa("#controlsPanel>.tabs .tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===tool));
  }
  function updateDrawer(tool){
    const m=tools[tool]||tools.video;
    if($("modernDrawerIcon"))$("modernDrawerIcon").textContent=m[0];
    if($("modernDrawerTitle"))$("modernDrawerTitle").textContent=m[2];
    if($("modernDrawerSub"))$("modernDrawerSub").textContent=m[3];
    qsa(".studio-rail-btn").forEach(b=>b.classList.toggle("active",b.dataset.modernTool===tool));
  }
  function openQuran(n=0){ const b=$("quranStudioLaunch"); if(b)return b.click(); if(n<40)setTimeout(()=>openQuran(n+1),100); }
  ui.openTool=function(tool){
    if(!tools[tool])tool="video"; ui.activeTool=tool; updateDrawer(tool);
    if(tool==="quran"){ ui.closeDrawer(); openQuran(); return; }
    restoreLegacyMobile();
    if(tool==="templates") setPanel("templates"); else { qs(`#controlsPanel>.tabs .tab[data-tab="${tool}"]`)?.click(); restoreLegacyMobile(); setPanel(tool); }
    $("controlsPanel")?.classList.add("studio-drawer-open"); document.body.classList.add("modern-drawer-visible"); ui.drawerOpen=true;
  };
  ui.closeDrawer=function(){ $("controlsPanel")?.classList.remove("studio-drawer-open"); document.body.classList.remove("modern-drawer-visible"); ui.drawerOpen=false; };

  function buildHeader(){
    const top=qs(".workspace>.topbar"); if(!top||top.dataset.modern)return; top.dataset.modern="1";
    const reset=$("resetBtn"), exp=$("exportBtn"), quranLaunch=$("quranStudioLaunch"); reset?.remove(); exp?.remove(); quranLaunch?.remove();
    top.innerHTML=`<div class="studio-head-left"><div class="studio-head-logo">R</div><div class="studio-head-brand"><b>Reels Maker AI</b><span>PRO AI</span></div></div>
      <div class="studio-head-center"><button id="modernUndo" class="studio-history-btn" disabled title="Undo">↶</button><label class="studio-project-title-wrap"><input id="studioProjectTitle" maxlength="80" aria-label="Project title"></label><button id="modernRedo" class="studio-history-btn" disabled title="Redo">↷</button></div>
      <div class="studio-head-right"><label id="modernStatus" class="studio-status"><i></i><em>READY</em></label><div id="modernActionHost" class="studio-head-actions actions"></div></div>`;
    const host=$("modernActionHost");
    if(reset){ reset.textContent="New"; reset.classList.add("studio-new-btn"); host.appendChild(reset); }
    if(exp){ exp.textContent="Export Reel (HD)"; exp.classList.add("studio-export-btn"); host.appendChild(exp); }
    if(quranLaunch) host.appendChild(quranLaunch);
    const title=$("studioProjectTitle"); title.value=localStorage.getItem("reels-project-title")||"Untitled Reel";
    title.oninput=()=>localStorage.setItem("reels-project-title",title.value.trim()||"Untitled Reel");
  }

  function buildStage(){
    const sw=qs(".stage-wrap"), st=$("stage"), tr=qs(".transport"); if(!sw||!st||!tr)return;
    sw.classList.add("studio-stage-wrap"); st.classList.add("studio-stage"); tr.classList.add("studio-transport");
    if(!$("modernStageBadge")){ const b=document.createElement("div"); b.id="modernStageBadge"; b.className="studio-stage-badge"; b.innerHTML="<span><i></i> LIVE PREVIEW</span><em>9:16</em>"; sw.prepend(b); }
    if(!$("modernZoom")){ const r=document.createElement("button"); r.id="modernRatio"; r.className="round studio-transport-chip"; r.textContent="9:16"; r.title="Reels ratio"; const z=document.createElement("button"); z.id="modernZoom"; z.className="round studio-transport-chip"; z.textContent="Fit"; let n=0,m=["fit","90","100"]; z.onclick=()=>{n=(n+1)%m.length;st.dataset.zoom=m[n];z.textContent=m[n]==="fit"?"Fit":m[n]+"%"}; tr.append(r,z); }
  }

  function statusLoop(){
    const el=$("modernStatus"), s=ui.coreState(), v=ui.coreVideo();
    if(el){ let t="READY",mode="ready"; if(s?.exporting){t="EXPORTING";mode="busy"} else if(v&&!v.paused&&!v.ended){t="PLAYING";mode="playing"} el.dataset.mode=mode; qs("em",el).textContent=t; }
    requestAnimationFrame(statusLoop);
  }

  function init(){
    $("transparentHome")?.remove(); $("transparentHomeBack")?.remove(); document.body.classList.remove("th-home-open");
    document.body.classList.add("modern-studio"); restoreLegacyMobile(); addTemplates(); buildRail(); buildDrawer(); buildHeader(); buildStage(); ui.openTool("video");
    window.addEventListener("resize",()=>{ restoreLegacyMobile(); if(innerWidth<760&&ui.drawerOpen)ui.closeDrawer(); });
    qs(".workspace")?.addEventListener("pointerdown",e=>{ if(innerWidth<=1100&&ui.drawerOpen&&!e.target.closest("#controlsPanel,#modernToolRail"))ui.closeDrawer(); });
    statusLoop(); document.dispatchEvent(new CustomEvent("reels-modern-shell-ready"));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(init,0),{once:true}); else setTimeout(init,0);
})();
