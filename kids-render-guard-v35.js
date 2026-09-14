let wakeLock=null;
let observing=false;

async function requestWake(){
  try{
    if('wakeLock' in navigator && !wakeLock)wakeLock=await navigator.wakeLock.request('screen');
  }catch{}
}
async function releaseWake(){
  try{await wakeLock?.release()}catch{}
  wakeLock=null;
}
function statusText(){return String(document.getElementById('kidsBuildStatus')?.textContent||'')}
function isRendering(t){return /إنشاء الصوت الكامل|تقسيم النص|توليد .*صورة|تركيب الصوت والصور|ريندر الفيديو/.test(t)}
function isDone(t){return /اكتمل الفيديو|خطأ:/.test(t)}
function watchStatus(){
  if(observing)return;observing=true;
  const el=document.getElementById('kidsBuildStatus');if(!el)return;
  new MutationObserver(async()=>{
    const t=statusText();
    if(isRendering(t))await requestWake();
    if(isDone(t))await releaseWake();
  }).observe(el,{childList:true,subtree:true,characterData:true});
}
export function initKidsRenderGuard(){
  watchStatus();
  document.addEventListener('click',async e=>{
    if(e.target?.id==='kidsBuildBtn')await requestWake();
  },true);
  document.addEventListener('visibilitychange',async()=>{
    if(document.visibilityState==='visible'&&isRendering(statusText()))await requestWake();
  });
  window.addEventListener('pagehide',releaseWake);
}
