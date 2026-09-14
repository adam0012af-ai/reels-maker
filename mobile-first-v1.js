"use strict";
(()=>{
  if(window.__RM_MOBILE_FIRST_V1__)return;window.__RM_MOBILE_FIRST_V1__=true;
  const isMobile=()=>matchMedia("(max-width:1000px)").matches;
  const closeDrawer=()=>{document.body.classList.remove("rm-mobile-open");document.getElementById("rmMobileMenu")?.setAttribute("aria-expanded","false");};
  const ensureViewport=()=>{
    let v=document.querySelector('meta[name="viewport"]');
    if(!v){v=document.createElement("meta");v.name="viewport";document.head.appendChild(v);}
    v.content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover";
  };
  const focusScroll=e=>{
    if(!isMobile())return;
    const t=e.target;if(!(t instanceof HTMLElement))return;
    if(!t.matches("input,textarea,select"))return;
    setTimeout(()=>t.scrollIntoView({block:"center",behavior:"smooth"}),180);
  };
  const wireOverlay=()=>{
    const overlay=document.querySelector(".rm-mobile-overlay");
    if(overlay&&!overlay.dataset.mf){overlay.dataset.mf="1";overlay.addEventListener("click",closeDrawer);}
    const close=document.querySelector(".rm-mobile-close");
    if(close&&!close.dataset.mf){close.dataset.mf="1";close.addEventListener("click",closeDrawer);}
  };
  const normalize=()=>{
    if(!isMobile())return;
    document.documentElement.classList.add("rm-mobile-first");
    wireOverlay();
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(btn=>{
      if(btn.dataset.mf)return;btn.dataset.mf="1";btn.addEventListener("click",()=>setTimeout(closeDrawer,0));
    });
  };
  ensureViewport();
  document.addEventListener("focusin",focusScroll,true);
  window.addEventListener("resize",normalize,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(normalize,120),{passive:true});
  const mo=new MutationObserver(normalize);
  const start=()=>{normalize();mo.observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
