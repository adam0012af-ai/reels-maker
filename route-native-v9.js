"use strict";

(() => {
  if (window.__RM_ROUTE_NATIVE_V9__) return;
  window.__RM_ROUTE_NATIVE_V9__ = true;

  const ROUTES = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);
  const EDITOR = new Set(["video","audio","text","stickers","layers","settings"]);
  const $ = id => document.getElementById(id);
  let applying = false;

  function readRoute(){
    let value="";
    try { value = decodeURIComponent((location.hash || "").replace(/^#\/?/, "").split("?")[0]); } catch {}
    return ROUTES.has(value) ? value : "home";
  }

  function setUrl(route, mode="push"){
    if (!ROUTES.has(route)) route="home";
    const hash=`#${route}`;
    if (location.hash===hash) return;
    try {
      const state={...(history.state||{}), rmRouteV9:route};
      if (mode==="replace") history.replaceState(state,"",hash);
      else history.pushState(state,"",hash);
    } catch { location.hash=hash; }
  }

  function setActive(route){
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(btn=>{
      const active=btn.dataset.rmTool===route;
      btn.classList.toggle("active",active);
      active ? btn.setAttribute("aria-current","page") : btn.removeAttribute("aria-current");
    });
  }

  function closeDrawer(){
    document.body.classList.remove("rm-mobile-open");
    $("rmMobileMenu")?.setAttribute("aria-expanded","false");
  }

  function hideHome(){
    [$("transparentHome"),$("homeShell")].forEach(home=>{
      if (!home) return;
      home.classList.remove("open");
      home.setAttribute?.("aria-hidden","true");
    });
    document.body.classList.remove("th-home-open","home-mode");
    if ($("transparentHomeBack")) $("transparentHomeBack").hidden=true;
  }

  function showHome(){
    closeQuran(); closeImages(); closeProjects(); closeStory();
    const home=$("transparentHome") || $("homeShell");
    if (home){ home.classList.add("open"); home.setAttribute?.("aria-hidden","false"); }
    document.body.classList.add("th-home-open");
    document.body.classList.remove("rm-mobile-no-preview","rm-mobile-player");
    document.body.dataset.rmMobileRoute="home";
  }

  function closeQuran(){
    $("quranStudio")?.classList.remove("open");
    document.querySelector(".qr-studio.open")?.classList.remove("open");
  }
  function closeImages(){
    try { window.ReelsImageStudio?.close?.(); } catch {}
    $("reelsImageStudio")?.classList.remove("open");
    document.querySelector(".rmi.open")?.classList.remove("open");
  }
  function closeProjects(){
    try { window.ReelsProjectsV2?.close?.(); } catch {}
    $("rmProjectsV2")?.classList.remove("open");
    $("rmProjects")?.classList.remove("open");
  }
  function closeStory(){ $("storyStudio")?.classList.remove("open"); }

  function setMobileMode(route){
    document.body.dataset.rmMobileRoute=route;
    document.body.classList.toggle("rm-mobile-no-preview", route==="audio" || route==="settings");
    document.body.classList.toggle("rm-mobile-player", route==="video" || route==="text" || route==="stickers" || route==="layers");
  }

  function activatePanel(route){
    const tab=document.querySelector(`.tab[data-tab="${route}"]`);
    if (tab) tab.click();
    const wanted=$("panel-"+route);
    if (wanted && !wanted.classList.contains("active")){
      document.querySelectorAll(".panel[id^='panel-']").forEach(p=>p.classList.toggle("active",p===wanted));
      document.querySelectorAll(".tab[data-tab]").forEach(t=>t.classList.toggle("active",t.dataset.tab===route));
    }
  }

  function openEditor(route){
    hideHome(); closeQuran(); closeImages(); closeProjects(); closeStory();
    activatePanel(route);
    setMobileMode(route);
  }

  function openQuran(tries=0){
    hideHome(); closeImages(); closeProjects(); closeStory();
    document.body.classList.remove("rm-mobile-no-preview","rm-mobile-player");
    document.body.dataset.rmMobileRoute="quran";
    const studio=$("quranStudio") || document.querySelector(".qr-studio");
    if (studio){
      studio.classList.add("open");
      document.body.style.overflow="";
      return true;
    }
    const launch=$("quranStudioLaunch");
    if (launch){ launch.click(); return true; }
    if (tries<50) setTimeout(()=>{ if(readRoute()==="quran") openQuran(tries+1); },40);
    return false;
  }

  function openImages(tries=0){
    hideHome(); closeQuran(); closeProjects(); closeStory();
    document.body.classList.remove("rm-mobile-no-preview","rm-mobile-player");
    document.body.dataset.rmMobileRoute="images";
    if (window.ReelsImageStudio?.open){ window.ReelsImageStudio.open(); return true; }
    const studio=$("reelsImageStudio") || document.querySelector(".rmi");
    if (studio){ studio.classList.add("open"); return true; }
    if (tries<50) setTimeout(()=>{ if(readRoute()==="images") openImages(tries+1); },40);
    return false;
  }

  function clearBoot(){
    document.documentElement.classList.remove("rm-v8-boot","rm-route-booting");
    $("rmV8BootStyle")?.remove();
    $("rmRouteBootStyle")?.remove();
  }

  function apply(route=readRoute()){
    if (!ROUTES.has(route)) route="home";
    applying=true;
    setActive(route);
    closeDrawer();
    if (route==="home") showHome();
    else if (route==="quran") openQuran();
    else if (route==="images") openImages();
    else if (EDITOR.has(route)) openEditor(route);
    setActive(route);
    requestAnimationFrame(()=>{ setActive(route); clearBoot(); applying=false; });
  }

  function enforceInitial(){
    const expected=readRoute();
    apply(expected);
    [80,180,360,700,1200].forEach(ms=>setTimeout(()=>{
      if (readRoute()===expected) apply(expected);
    },ms));
    setTimeout(clearBoot,1600);
  }

  document.addEventListener("click",event=>{
    const tool=event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if (tool){
      event.preventDefault();
      event.stopImmediatePropagation();
      const route=tool.dataset.rmTool;
      setUrl(route,"push");
      apply(route);
      return;
    }
    const tab=event.target.closest?.(".tab[data-tab]");
    if (tab && EDITOR.has(tab.dataset.tab) && !applying){
      const route=tab.dataset.tab;
      setUrl(route,"replace");
      setTimeout(()=>apply(route),0);
    }
  },true);

  window.addEventListener("popstate",()=>apply(readRoute()));
  window.addEventListener("hashchange",()=>{ if(!applying) apply(readRoute()); });
  window.addEventListener("pageshow",()=>setTimeout(()=>apply(readRoute()),0));

  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",enforceInitial,{once:true});
  else enforceInitial();
})();
