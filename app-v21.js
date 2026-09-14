import {initStoryStudio,initVoiceStudio} from './story-v21.js';
import {initImageTool,initWriterTool,initTranscribeTool} from './tools-v21.js';

const $=id=>document.getElementById(id);
const pages={home:['الرئيسية','كل أدوات الذكاء الاصطناعي في مكان واحد'],story:['فيديو قصة AI','من الفكرة إلى فيديو نهائي'],voices:['الأصوات','اختيار ومعاينة الراوي'],images:['مولد الصور','صور AI خفيفة بدون GPU خارجي'],writer:['الكاتب الذكي','كتابة وقصص وترجمة وصياغة'],transcribe:['الصوت إلى نص','Whisper لتحويل الكلام إلى نص'],quran:['ريلز القرآن','الاستوديو القرآني'],settings:['الإعدادات','حالة خدمات الذكاء الاصطناعي']};

function go(route,push=true){if(!pages[route])route='home';document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===route));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.route===route));$('pageTitle').textContent=pages[route][0];$('pageSub').textContent=pages[route][1];document.body.classList.remove('menu-open');if(push&&location.hash!==`#${route}`)history.pushState({route},'',`#${route}`);window.scrollTo({top:0,behavior:'instant'});}

function initNav(){document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.route)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));$('menuBtn')?.addEventListener('click',()=>document.body.classList.add('menu-open'));$('scrim')?.addEventListener('click',()=>document.body.classList.remove('menu-open'));window.addEventListener('popstate',()=>go((location.hash||'#home').slice(1),false));go((location.hash||'#home').slice(1),false)}

async function health(){try{const r=await fetch('/api/health',{cache:'no-store'}),j=await r.json();$('healthPill').textContent=j.ok?'AI جاهز':'AI غير جاهز';$('settingsAi').textContent=j.ai?'جاهز':'غير متاح';$('settingsTts').textContent=j.tts?'جاهز':'غير متاح'}catch{$('healthPill').textContent='حالة غير معروفة';$('settingsAi').textContent='غير معروف';$('settingsTts').textContent='غير معروف'}}

initNav();initStoryStudio();initVoiceStudio();initImageTool();initWriterTool();initTranscribeTool();health();