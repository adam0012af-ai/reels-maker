"use strict";
(()=>{
  if(window.__RM_MOBILE_NAV_V2__)return;
  window.__RM_MOBILE_NAV_V2__=true;
  const MOBILE=1000;
  const known=new Set(["home","automation","video","images","audio","quran","text","stickers","layers","settings"]);
  const current=()=>{
    const fromBody=document.body?.dataset?.rmMobileRoute;
    if(known.has(fromBody))return fromBody;
    try{const h=decodeURIComponent((location.hash||"").replace(/^#\/?/,"").split("?")[0]);if(known.has(h))return h;}catch{}
    return "home";
  };
  function closeDrawer(){document.body.classList.remove("rm-mobile-open");document.getElementById("rmMobileMenu")?.setAttribute("aria-expanded","false");}
  function openRoute(route){
    if(!known.has(route))route="home";
    closeDrawer();
    if(route==="automation"){
      document.querySelector('[data-rm-tool="automation"]')?.click();
      document.body.dataset.rmMobileRoute="automation";
      return;
    }
    const btn=document.querySelector(`#rmShellSidebar [data-rm-tool="${route}"]`)||document.querySelector(`[data-rm-tool="${route}"]`);
    if(btn){btn.click();document.body.dataset.rmMobileRoute=route;return;}
    location.hash=`#${route}`;
    document.body.dataset.rmMobileRoute=route;
  }
  function installBack(){
    if(innerWidth>MOBILE)return;
    if(document.getElementById("rmMobileBack"))return;
    const b=document.createElement("button");b.id="rmMobileBack";b.type="button";b.setAttribute("aria-label","رجوع");b.textContent="‹";
    b.addEventListener("click",()=>{
      const auto=document.getElementById("rmAutoContent");
      if(auto?.classList.contains("open")){auto.querySelector(".rm-auto-close")?.click();document.body.dataset.rmMobileRoute="home";return;}
      if(current()==="home"){history.back();return;}
      openRoute("home");
    });
    document.body.appendChild(b);
  }
  function reorderAndTrim(){
    if(innerWidth>MOBILE)return;
    const nav=document.querySelector("#rmShellSidebar .rm-shell-nav")||document.querySelector(".rm-shell-nav");
    if(!nav)return;
    const order=["home","automation","video","images","audio","quran","text","stickers","layers","settings"];
    order.forEach(key=>{const el=nav.querySelector(`[data-rm-tool="${key}"]`);if(el)nav.appendChild(el);});
    nav.querySelectorAll("[data-rm-tool]").forEach(el=>{if(!known.has(el.dataset.rmTool))el.style.display="none";});
  }
  function syncRoute(){if(innerWidth<=MOBILE)document.body.dataset.rmMobileRoute=current();}
  function install(){installBack();reorderAndTrim();syncRoute();}
  document.addEventListener("click",e=>{
    if(innerWidth>MOBILE)return;
    const tool=e.target.closest?.("[data-rm-tool]");
    if(tool&&known.has(tool.dataset.rmTool))setTimeout(()=>{document.body.dataset.rmMobileRoute=tool.dataset.rmTool;closeDrawer();},0);
    if(e.target.closest?.(".rm-mobile-overlay"))closeDrawer();
  },true);
  window.addEventListener("hashchange",syncRoute);
  window.addEventListener("popstate",syncRoute);
  window.addEventListener("resize",install);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  new MutationObserver(()=>{if(innerWidth<=MOBILE){installBack();reorderAndTrim();}}).observe(document.documentElement,{childList:true,subtree:true});
})();
