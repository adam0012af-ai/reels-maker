"use strict";

(() => {
  const mq = window.matchMedia("(max-width:1000px)");
  if (!mq.matches) return;

  const PLAYER_ROUTES = new Set(["video","text","stickers","layers"]);
  const NO_PREVIEW_ROUTES = new Set(["audio","settings"]);
  const KNOWN = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);

  function routeFromHash(){
    let value="";
    try{value=decodeURIComponent((location.hash||"").replace(/^#\/?/,"").split("?")[0]);}catch{}
    return KNOWN.has(value)?value:"home";
  }

  function sync(route=routeFromHash()){
    if(!mq.matches)return;
    if(!KNOWN.has(route))route="home";
    document.body.dataset.rmMobileRoute=route;
    document.body.classList.toggle("rm-mobile-player",PLAYER_ROUTES.has(route));
    document.body.classList.toggle("rm-mobile-no-preview",NO_PREVIEW_ROUTES.has(route));
  }

  document.addEventListener("click",event=>{
    const tool=event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if(tool?.dataset.rmTool)sync(tool.dataset.rmTool);
    const tab=event.target.closest?.(".tab[data-tab]");
    if(tab?.dataset.tab)sync(tab.dataset.tab);
  },true);

  window.addEventListener("hashchange",()=>sync());
  window.addEventListener("popstate",()=>sync());
  window.addEventListener("pageshow",()=>sync());

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>sync(),{once:true});
  else sync();
})();
