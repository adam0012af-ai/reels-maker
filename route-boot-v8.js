"use strict";

(() => {
  const VALID=new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);
  const EDITOR=new Set(["video","audio","text","stickers","layers","settings"]);

  try{localStorage.removeItem("reelsMaker.route.v2");}catch{}
  window.__RM_DISABLE_LEGACY_PREMIUM_ROUTER__=true;

  function route(){
    let value="";
    try{value=decodeURIComponent((location.hash||"").replace(/^#\/?/,"").split("?")[0]);}catch{}
    return VALID.has(value)?value:"home";
  }

  function ready(r){
    if(r==="home")return !!document.querySelector("#transparentHome.open");
    if(r==="quran")return !!document.querySelector("#quranStudio.open,.qr-studio.open");
    if(r==="images")return !!document.querySelector("#reelsImageStudio.open,.rmi.open");
    if(EDITOR.has(r))return !!document.querySelector(`#panel-${r}.active`)&&!document.querySelector("#transparentHome.open,#quranStudio.open,.qr-studio.open,.rmi.open,#rmProjectsV2.open");
    return true;
  }

  function syncActive(r){
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(btn=>{
      const active=btn.dataset.rmTool===r;
      btn.classList.toggle("active",active);
      active?btn.setAttribute("aria-current","page"):btn.removeAttribute("aria-current");
    });
  }

  function reveal(){
    document.documentElement.classList.remove("rm-v8-boot");
    document.getElementById("rmV8BootStyle")?.remove();
  }

  function settle(tries=0){
    const r=route();
    syncActive(r);
    if(ready(r)||tries>120)return reveal();
    setTimeout(()=>settle(tries+1),25);
  }

  function install(){
    const r=route();
    syncActive(r);
    settle();
    setTimeout(reveal,3500);
  }

  window.addEventListener("hashchange",()=>setTimeout(()=>{syncActive(route());settle();},0));
  window.addEventListener("pageshow",()=>setTimeout(()=>{syncActive(route());settle();},0));

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
