"use strict";
(()=>{
  if(window.__RM_AI_MENU_V20__)return;window.__RM_AI_MENU_V20__=1;
  const STORAGE_KEY="rm-ai-menu-v20";
  function saved(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{}}catch{return{}}}
  function persist(x){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(x))}catch{}}
  function itemsAfter(title){const out=[];let n=title.nextElementSibling;while(n&&!n.classList.contains("rm-ai-suite-title")){if(n.classList.contains("rm-ai-suite-item"))out.push(n);else if(n.matches?.('[data-rm-tool="settings"]'))break;n=n.nextElementSibling}return out}
  function apply(title,items,open){title.dataset.open=open?"1":"0";title.setAttribute("aria-expanded",open?"true":"false");items.forEach(x=>{x.hidden=!open});}
  function enhance(){const nav=document.querySelector("#rmShellSidebar .rm-shell-nav");if(!nav)return false;const titles=[...nav.querySelectorAll(".rm-ai-suite-title")];if(!titles.length)return false;const state=saved();titles.forEach((title,i)=>{if(title.dataset.aiCollapseReady)return;title.dataset.aiCollapseReady="1";title.tabIndex=0;title.setAttribute("role","button");const original=title.textContent.trim(),items=itemsAfter(title),key=original||`section-${i}`;title.innerHTML=`<span class="rm-ai-section-name">${original}</span><span class="rm-ai-section-meta">${items.length} أدوات</span><span class="rm-ai-section-chevron">⌄</span>`;const open=state[key]===true;apply(title,items,open);const toggle=()=>{const next=title.dataset.open!=="1";apply(title,items,next);state[key]=next;persist(state)};title.addEventListener("click",toggle);title.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle()}})});return true}
  function boot(){if(enhance())return;const mo=new MutationObserver(()=>{if(enhance())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true})}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot,{once:true}):boot();
})();
