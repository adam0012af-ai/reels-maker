"use strict";

(() => {
  if (window.__RM_ROUTE_NATIVE_V10__) return;
  window.__RM_ROUTE_NATIVE_V10__ = true;

  const ROUTES = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);
  const EDITOR = new Set(["video","audio","text","stickers","layers","settings"]);
  const PLAYER = new Set(["video","text","stickers","layers"]);
  const NO_PREVIEW = new Set(["audio","settings"]);
  const $ = id => document.getElementById(id);
  let generation = 0;
  let applying = false;

  function current(){
    let route="";
    try { route=decodeURIComponent((location.hash||"").replace(/^#\/?/,"").split("?")[0]); } catch {}
    return ROUTES.has(route)?route:"home";
  }

  function setUrl(route,mode="push"){
    if(!ROUTES.has(route)) route="home";
    const hash=`#${route}`;
    if(location.hash===hash) return;
    try{
      const state={...(history.state||{}),rmRouteV10:route};
      if(mode==="replace") history.replaceState(state,"",hash);
      else history.pushState(state,"",hash);
    }catch{ location.hash=hash; }
  }

  function shellReady(){
    return !!($("rmShellSidebar") && document.body?.classList.contains("rm-shell-v2"));
  }

  function setActive(route){
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(btn=>{
      const active=btn.dataset.rmTool===route;
      btn.classList.toggle("active",active);
      active?btn.setAttribute("aria-current","page"):btn.removeAttribute("aria-current");
    });
  }

  function closeDrawer(){
    document.body.classList.remove("rm-mobile-open");
    $("rmMobileMenu")?.setAttribute("aria-expanded","false");
  }

  function normalizePanels(){
    const panels=document.querySelector(".panels");
    const host=$("mobilePanelHost");
    if(panels&&host){
      [...host.querySelectorAll(".panel[id^='panel-']")].forEach(panel=>panels.appendChild(panel));
    }
    $("mobileSheet")?.classList.remove("open");
  }

  function setMobileMode(route){
    document.body.dataset.rmMobileRoute=route;
    document.body.classList.toggle("rm-mobile-player",PLAYER.has(route));
    document.body.classList.toggle("rm-mobile-no-preview",NO_PREVIEW.has(route));
  }

  function closeQuran(){
    $("quranStudio")?.classList.remove("open");
    document.querySelector(".qr-studio.open")?.classList.remove("open");
  }

  function closeImages(){
    try{ window.ReelsImageStudio?.close?.(); }catch{}
    $("reelsImageStudio")?.classList.remove("open");
    document.querySelector(".rmi.open")?.classList.remove("open");
  }

  function closeProjects(){
    try{ window.ReelsProjectsV2?.close?.(); }catch{}
    $("rmProjectsV2")?.classList.remove("open");
    $("rmProjects")?.classList.remove("open");
  }

  function closeStory(){ $("storyStudio")?.classList.remove("open"); }

  function hideHome(){
    [$("transparentHome"),$("homeShell")].forEach(home=>{
      if(!home) return;
      home.classList.remove("open");
      home.setAttribute?.("aria-hidden","true");
    });
    document.body.classList.remove("th-home-open","home-mode");
    if($("transparentHomeBack")) $("transparentHomeBack").hidden=true;
    document.body.style.overflow="";
  }

  function closeOther(route){
    if(route!=="quran") closeQuran();
    if(route!=="images") closeImages();
    closeProjects();
    closeStory();
    if(route!=="home") hideHome();
  }

  function activatePanel(route){
    normalizePanels();
    const wanted=$("panel-"+route);
    if(!wanted) return false;
    const panels=document.querySelector(".panels");
    if(panels&&wanted.parentElement!==panels) panels.appendChild(wanted);
    document.querySelectorAll(".panel[id^='panel-']").forEach(panel=>panel.classList.toggle("active",panel===wanted));
    document.querySelectorAll(".tab[data-tab]").forEach(tab=>tab.classList.toggle("active",tab.dataset.tab===route));
    return true;
  }

  function resetScroll(route){
    try{ window.scrollTo({top:0,left:0,behavior:"auto"}); }catch{ window.scrollTo(0,0); }
    if(route==="quran"){
      const s=$("quranStudio")||document.querySelector(".qr-studio.open");
      if(s) s.scrollTop=0;
    }
    if(route==="images"){
      const s=$("reelsImageStudio")||document.querySelector(".rmi.open");
      if(s) s.scrollTop=0;
    }
  }

  function clearBoot(){
    document.documentElement.classList.remove("rm-v8-boot","rm-route-booting","rm-stable-boot");
    $("rmV8BootStyle")?.remove();
    $("rmRouteBootStyle")?.remove();
    $("rmStableBootStyle")?.remove();
    $("rmStableBoot")?.remove();
  }

  function finish(route,token,attempt=0){
    if(token!==generation||current()!==route) return;
    if(!shellReady() && attempt<240){
      setTimeout(()=>finish(route,token,attempt+1),25);
      return;
    }
    normalizePanels();
    setMobileMode(route);
    setActive(route);
    closeDrawer();
    resetScroll(route);
    requestAnimationFrame(()=>{
      if(token!==generation||current()!==route) return;
      setActive(route);
      clearBoot();
      applying=false;
    });
  }

  function waitForHome(route,token,attempt=0){
    if(token!==generation||current()!==route) return;
    closeOther("home");
    const home=$("transparentHome");
    const ready=!!(home && home.classList.contains("rm-home-v2") && home.dataset.shellV2==="1" && shellReady());
    if(ready){
      home.classList.add("open");
      home.setAttribute?.("aria-hidden","false");
      document.body.classList.add("th-home-open");
      document.body.style.overflow="hidden";
      setMobileMode("home");
      finish("home",token);
      return;
    }
    if(attempt<240){
      setTimeout(()=>waitForHome(route,token,attempt+1),25);
      return;
    }
    const fallback=$("transparentHome")||$("homeShell");
    if(fallback){
      fallback.classList.add("open");
      fallback.setAttribute?.("aria-hidden","false");
      document.body.classList.add("th-home-open");
    }
    finish("home",token);
  }

  function waitForQuran(route,token,attempt=0){
    if(token!==generation||current()!==route) return;
    closeOther("quran");
    hideHome();
    setMobileMode("quran");
    const studio=$("quranStudio")||document.querySelector(".qr-studio");
    if(studio){
      studio.classList.add("open");
      document.body.style.overflow="";
      finish("quran",token);
      return;
    }
    const launch=$("quranStudioLaunch");
    if(launch) try{ launch.click(); }catch{}
    if(attempt<240){ setTimeout(()=>waitForQuran(route,token,attempt+1),25); return; }
    finish("quran",token);
  }

  function waitForImages(route,token,attempt=0){
    if(token!==generation||current()!==route) return;
    closeOther("images");
    hideHome();
    setMobileMode("images");
    if(window.ReelsImageStudio?.open){
      try{ window.ReelsImageStudio.open(); }catch{}
      const studio=$("reelsImageStudio")||document.querySelector(".rmi");
      if(studio?.classList.contains("open")){ finish("images",token); return; }
    }
    const studio=$("reelsImageStudio")||document.querySelector(".rmi");
    if(studio){ studio.classList.add("open"); finish("images",token); return; }
    if(attempt<240){ setTimeout(()=>waitForImages(route,token,attempt+1),25); return; }
    finish("images",token);
  }

  function apply(route=current()){
    if(!ROUTES.has(route)) route="home";
    const token=++generation;
    applying=true;
    closeDrawer();
    setActive(route);
    setMobileMode(route);

    if(route==="home"){ waitForHome(route,token); return; }
    if(route==="quran"){ waitForQuran(route,token); return; }
    if(route==="images"){ waitForImages(route,token); return; }

    closeOther(route);
    hideHome();
    if(EDITOR.has(route)&&activatePanel(route)) finish(route,token);
    else if(EDITOR.has(route)){
      let attempt=0;
      const retry=()=>{
        if(token!==generation||current()!==route) return;
        if(activatePanel(route)){ finish(route,token); return; }
        if(attempt++<240) setTimeout(retry,25);
        else finish(route,token);
      };
      retry();
    }
  }

  function navigate(route,mode="push"){
    if(!ROUTES.has(route)) route="home";
    setUrl(route,mode);
    apply(route);
  }

  document.addEventListener("click",event=>{
    const tool=event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if(tool){
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(tool.dataset.rmTool,"push");
      return;
    }
    const tab=event.target.closest?.(".tab[data-tab]");
    if(tab&&EDITOR.has(tab.dataset.tab)&&!applying){
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(tab.dataset.tab,"replace");
    }
  },true);

  window.addEventListener("popstate",()=>apply(current()));
  window.addEventListener("hashchange",()=>{ if(!applying) apply(current()); });
  window.addEventListener("pageshow",()=>setTimeout(()=>apply(current()),0));
  window.addEventListener("resize",()=>{
    if(innerWidth<=1000) setTimeout(()=>{ normalizePanels(); setMobileMode(current()); },0);
  },{passive:true});

  function installPanelGuard(){
    const host=$("mobilePanelHost");
    if(!host) return;
    new MutationObserver(()=>{
      if(innerWidth<=1000&&window.__RM_MODERN_MOBILE__) queueMicrotask(normalizePanels);
    }).observe(host,{childList:true});
  }

  function start(){
    installPanelGuard();
    apply(current());
    setTimeout(()=>setActive(current()),80);
    setTimeout(()=>setActive(current()),280);
  }

  window.ReelsRouterV10={navigate,current,apply};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
