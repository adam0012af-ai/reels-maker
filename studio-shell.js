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
    p.innerHTML=`<div class="panel-title"><h2>قوالب بداية سريعة</h2><p>اختصارات حقيقية للأدوات الموجودة بالفعل.</p></div><div class="modern-template-grid">
      <button data-template="blank"><i>＋</i><b>Blank Reel</b><small>مشروع جديد فارغ</small></button>
      <button data-template="cinematic"><i>🎬</i><b>Cinematic</b><small>بحث فيديو سينمائي</small></button>
      <button data-template="quran"><i>☪</i><b>Quran Reel</b><small>فتح استوديو القرآن</small></button>
      <button data-template="text"><i>T</i><b>Text First</b><small>بدء المشروع بنص</small></button>
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
    const rail=document.createElement("nav"); rail.id="modernToolRail"; rail.className="modern-tool-rail"; rail.setAttribute("aria-label","Studio tools");
    rail.innerHTML=Object.entries(tools).map(([k,v])=>`<button class="modern-rail-btn${k==="video"?" active":""}" data-modern-tool="${k}" title="${v[2]}"><span>${v[0]}</span><em>${v[1]}</em></button>`).join("");
    rail.addEventListener("click",e=>{ const b=e.target.closest("[data-modern-tool]"); if(b)ui.openTool(b.dataset.modernTool); });
    document.body.appendChild(rail);
  }

  function buildDrawer(){
    const c=$("controlsPanel"), panels=qs(".panels",c); if(!c||!panels||$("modernDrawerHead"))return;
    const h=document.createElement("div"); h.id="modernDrawerHead"; h.className="modern-drawer-head";
    h.innerHTML=`<div><span id="modernDrawerIcon">🎥</span><section><b id="modernDrawerTitle">الميديا</b><small id="modernDrawerSub">Pexels و Pixabay والرفع</small></section></div><button id="modernDrawerClose" type="button">×</button>`;
    c.insertBefore(h,panels); $("modernDrawerClose").onclick=()=>ui.closeDrawer();
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
    qsa(".modern-rail-btn").forEach(b=>b.classList.toggle("active",b.dataset.modernTool===tool));
  }
  function openQuran(n=0){ const b=$("quranStudioLaunch"); if(b)return b.click(); if(n<40)setTimeout(()=>openQuran(n+1),100); }
  ui.openTool=function(tool){
    if(!tools[tool])tool="video"; ui.activeTool=tool; updateDrawer(tool);
    if(tool==="quran"){ ui.closeDrawer(); openQuran(); return; }
    restoreLegacyMobile();
    if(tool==="templates") setPanel("templates"); else { qs(`#controlsPanel>.tabs .tab[data-tab="${tool}"]`)?.click(); restoreLegacyMobile(); setPanel(tool); }
    $("controlsPanel")?.classList.add("modern-drawer-open"); document.body.classList.add("modern-drawer-visible"); ui.drawerOpen=true;
  };
  ui.closeDrawer=function(){ $("controlsPanel")?.classList.remove("modern-drawer-open"); document.body.classList.remove("modern-drawer-visible"); ui.drawerOpen=false; };

  function buildHeader(){
    const top=qs(".workspace>.topbar"); if(!top||top.dataset.modern)return; top.dataset.modern="1";
    const reset=$("resetBtn"), exp=$("exportBtn"); reset?.remove(); exp?.remove();
    top.innerHTML=`<div class="modern-head-brand"><i>R</i><b>Reels Maker AI</b><span>PRO AI</span></div>
      <div class="modern-head-project"><button id="modernUndo" disabled>↶</button><input id="modernProjectTitle" maxlength="80" aria-label="Project title"><button id="modernRedo" disabled>↷</button></div>
      <div class="modern-head-actions"><label id="modernStatus"><i></i><em>READY</em></label><div id="modernActionHost" class="actions"></div></div>`;
    const host=$("modernActionHost");
    if(reset){ reset.textContent="New"; reset.classList.add("modern-new"); host.appendChild(reset); }
    if(exp){ exp.textContent="Export Reel (HD)"; exp.classList.add("modern-export"); host.appendChild(exp); }
    const title=$("modernProjectTitle"); title.value=localStorage.getItem("reels-project-title")||"Untitled Reel";
    title.oninput=()=>localStorage.setItem("reels-project-title",title.value.trim()||"Untitled Reel");
  }

  function buildStage(){
    const sw=qs(".stage-wrap"), st=$("stage"), tr=qs(".transport"); if(!sw||!st||!tr)return;
    sw.classList.add("modern-stage-wrap"); st.classList.add("modern-stage"); tr.classList.add("modern-transport");
    if(!$("modernStageBadge")){ const b=document.createElement("div"); b.id="modernStageBadge"; b.className="modern-stage-badge"; b.innerHTML="<span><i></i> LIVE PREVIEW</span><em>9:16</em>"; sw.prepend(b); }
    if(!$("modernZoom")){ const r=document.createElement("button"); r.id="modernRatio"; r.className="round modern-chip"; r.textContent="9:16"; r.title="Reels ratio"; const z=document.createElement("button"); z.id="modernZoom"; z.className="round modern-chip"; z.textContent="Fit"; let n=0,m=["fit","90","100"]; z.onclick=()=>{n=(n+1)%m.length;st.dataset.zoom=m[n];z.textContent=m[n]==="fit"?"Fit":m[n]+"%"}; tr.append(r,z); }
  }

  function statusLoop(){
    const el=$("modernStatus"), s=ui.coreState(), v=ui.coreVideo();
    if(el){ let t="READY",mode="ready"; if(s?.exporting){t="EXPORTING";mode="busy"} else if(v&&!v.paused&&!v.ended){t="PLAYING";mode="play"} el.dataset.mode=mode; qs("em",el).textContent=t; }
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
