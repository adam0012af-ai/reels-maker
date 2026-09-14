import {initVisualStoryStudio} from './visual-story-v1.js';
import {initVisualProjects} from './projects-visual-v1.js';
import {initImageReferenceGuard} from './image-reference-guard-v37.js';
import {initImageTool,initWriterTool} from './tools-v21.js';

const $=id=>document.getElementById(id);
const pages={
  home:['الرئيسية','استوديو القصص والصور في مكان واحد'],
  story:['القصة البصرية','من الفكرة إلى مشاهد وصور وفيديو'],
  projects:['مشاريعي','القصص والمشاريع المحفوظة على هذا الجهاز'],
  voices:['الأصوات','مؤجل للمرحلة التالية'],
  images:['مولد الصور','صور AI مع صورة مرجعية اختيارية'],
  writer:['الكاتب الذكي','كتابة وقصص وترجمة وصياغة'],
  transcribe:['الصوت إلى نص','مؤجل للمرحلة التالية'],
  quran:['ريلز القرآن','الاستوديو القرآني'],
  settings:['الإعدادات','حالة خدمات الذكاء الاصطناعي']
};

function go(route,push=true){
  if(!pages[route]||route==='voices'||route==='transcribe')route='home';
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===route));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
  $('pageTitle').textContent=pages[route][0];
  $('pageSub').textContent=pages[route][1];
  document.body.classList.remove('menu-open');
  if(push&&location.hash!==`#${route}`)history.pushState({route},'',`#${route}`);
  window.scrollTo({top:0,behavior:'instant'});
}

function initNav(){
  document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.route)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  $('menuBtn')?.addEventListener('click',()=>document.body.classList.add('menu-open'));
  $('scrim')?.addEventListener('click',()=>document.body.classList.remove('menu-open'));
  window.addEventListener('popstate',()=>go((location.hash||'#home').slice(1),false));
  go((location.hash||'#home').slice(1),false);
}

function quranBridge(){
  const host=document.querySelector('.quran-copy');
  if(!host||host.querySelector('.quran-launch-host'))return;
  const bar=document.createElement('div');
  bar.className='topbar quran-launch-host';
  bar.style.cssText='position:static;height:auto;padding:0;background:transparent;border:0;backdrop-filter:none;margin-top:16px';
  bar.innerHTML='<div class="actions"></div>';
  host.appendChild(bar);
}

async function health(){
  try{
    const r=await fetch('/api/health',{cache:'no-store'}),j=await r.json();
    $('healthPill').textContent=j.ok?'AI جاهز':'AI غير جاهز';
    $('settingsAi').textContent=j.ai?'جاهز':'غير متاح';
    if($('settingsTts'))$('settingsTts').textContent='مؤجل';
  }catch{
    $('healthPill').textContent='حالة غير معروفة';
    $('settingsAi').textContent='غير معروف';
    if($('settingsTts'))$('settingsTts').textContent='مؤجل';
  }
}

initImageReferenceGuard();
quranBridge();
initVisualProjects();
initVisualStoryStudio();
initNav();
initImageTool();
initWriterTool();
health();
