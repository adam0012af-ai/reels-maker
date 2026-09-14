"use strict";
(()=>{
  const isMobile=()=>matchMedia("(max-width:1000px)").matches;
  const route=(key)=>{
    const shell=document.querySelector(`#rmShellSidebar [data-rm-tool="${key}"]`);
    if(shell){shell.click();return;}
    location.hash=`#${key}`;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  const html=()=>`<div class="rmh-wrap" dir="rtl">
    <div class="rmh-top"><div class="rmh-logo">R</div><div class="rmh-brand"><b>Reels Maker AI</b><span>استوديو صناعة المحتوى على الموبايل</span></div></div>
    <section class="rmh-hero"><span class="rmh-kicker">✦ MOBILE STUDIO</span><h1>اعمل الريل كامل من الموبايل</h1><p>ابدأ بفكرة، ولّد السكربت والصوت والمشاهد، وبعدها عدّل وصدّر من نفس المكان.</p><button class="rmh-primary" type="button" data-route="automation">ابدأ بالمحتوى التلقائي</button></section>
    <div class="rmh-section-title"><b>الأدوات الأساسية</b><span>اختار وابدأ فورًا</span></div>
    <div class="rmh-grid">
      <button class="rmh-card" type="button" data-route="automation"><span class="rmh-ico">⚡</span><b>المحتوى التلقائي</b><small>فكرة، سكربت، صوت ومشاهد في Workflow واحد</small></button>
      <button class="rmh-card" type="button" data-route="video"><span class="rmh-ico">🎬</span><b>محرر الفيديو</b><small>رتب الفيديو والصوت والتوقيت والتصدير</small></button>
      <button class="rmh-card" type="button" data-route="images"><span class="rmh-ico">◇</span><b>استوديو الصور</b><small>إنشاء وتعديل الصور والأغلفة</small></button>
      <button class="rmh-card" type="button" data-route="audio"><span class="rmh-ico">♫</span><b>نص إلى صوت</b><small>تعليق صوتي جاهز للمحتوى</small></button>
      <button class="rmh-card" type="button" data-route="quran"><span class="rmh-ico">☪</span><b>استوديو القرآن</b><small>إعداد محتوى القرآن والريلز الإسلامية</small></button>
      <button class="rmh-card" type="button" data-route="settings"><span class="rmh-ico">⚙</span><b>الإعدادات</b><small>الجودة والأداء وخيارات التصدير</small></button>
    </div>
    <div class="rmh-foot">Reels Maker AI · Mobile First</div>
  </div>`;
  function install(){
    if(!isMobile())return;
    const home=document.getElementById("transparentHome");
    if(!home){setTimeout(install,120);return;}
    if(home.dataset.mobileHome==="v1")return;
    home.dataset.mobileHome="v1";home.classList.add("rm-mobile-home-v1");home.innerHTML=html();
    home.addEventListener("click",e=>{const b=e.target.closest("[data-route]");if(!b)return;e.preventDefault();route(b.dataset.route);});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  window.addEventListener("resize",install,{passive:true});
  new MutationObserver(()=>{if(isMobile()&&!document.querySelector("#transparentHome[data-mobile-home='v1']"))install();}).observe(document.documentElement,{childList:true,subtree:true});
})();
