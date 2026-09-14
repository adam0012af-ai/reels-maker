const $=id=>document.getElementById(id);
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const DRAFT_KEY='reels-maker-visual-draft-v1';

const state={story:'',scenes:[],sceneUrls:[],finalUrl:'',busy:false};

const STYLE_PRESETS={
  cinematic:'cinematic vertical 9:16 composition, realistic lighting, premium film still, consistent characters and wardrobe, natural skin texture, detailed environment, no text, no watermark',
  realistic:'ultra realistic photography, vertical 9:16, natural light, authentic human details, consistent characters and wardrobe, no text, no watermark',
  animation:'premium 3D animated movie style, vertical 9:16, expressive characters, cinematic lighting, consistent character design, no text, no watermark',
  dramatic:'dramatic cinematic photography, vertical 9:16, strong visual storytelling, moody natural lighting, consistent characters and wardrobe, no text, no watermark'
};

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function set(id,text){const el=$(id);if(el)el.textContent=text||''}
function setBusy(v){state.busy=v;['generateVisualStoryBtn','renderVisualVideoBtn'].forEach(id=>{const b=$(id);if(b)b.disabled=v})}
function revokeUrl(u){if(u)try{URL.revokeObjectURL(u)}catch{}}
function resetMedia(){state.sceneUrls.forEach(revokeUrl);state.sceneUrls=[];state.scenes=[];revokeUrl(state.finalUrl);state.finalUrl='';const v=$('finalVideo');if(v)v.removeAttribute('src');$('finalWrap')?.classList.add('hidden')}

async function jsonPost(url,data){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}
async function generateImage(prompt,refs=[]){const fd=new FormData();fd.append('prompt',prompt);refs.filter(Boolean).slice(0,2).forEach((b,i)=>fd.append(`reference${i}`,b,`scene-ref-${i}.jpg`));const r=await fetch('/api/image',{method:'POST',body:fd});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`Image ${r.status}`)}const blob=await r.blob();if(!blob.size)throw new Error('لم يتم إنشاء الصورة');return blob}

function stylePrompt(prompt){const key=$('visualStyle')?.value||'cinematic';return `${String(prompt||'').trim()}. ${STYLE_PRESETS[key]||STYLE_PRESETS.cinematic}`}
function autoSceneCount(duration){return Math.max(5,Math.min(10,Math.ceil(Number(duration||30)/6)))}
function selectedSceneCount(){const value=$('sceneCount')?.value||'auto';return value==='auto'?autoSceneCount($('storyDuration')?.value):Number(value)}

function pipe(name){const all=qsa('.visual-pipe');const i=all.findIndex(x=>x.dataset.step===name);all.forEach((x,n)=>{x.classList.toggle('active',n===i);x.classList.toggle('done',n<i)})}
function finishPipes(){qsa('.visual-pipe').forEach(x=>{x.classList.add('done');x.classList.remove('active')})}

function saveDraft(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify({idea:$('storyIdea')?.value||'',duration:$('storyDuration')?.value||'30',tone:$('storyTone')?.value||'natural',count:$('sceneCount')?.value||'auto',style:$('visualStyle')?.value||'cinematic',story:state.story,scenePrompts:state.scenes.map(s=>s.prompt)}))}catch{}}
function restoreDraft(){try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(!d)return;if($('storyIdea'))$('storyIdea').value=d.idea||'';if($('storyDuration'))$('storyDuration').value=d.duration||'30';if($('storyTone'))$('storyTone').value=d.tone||'natural';if($('sceneCount'))$('sceneCount').value=d.count||'auto';if($('visualStyle'))$('visualStyle').value=d.style||'cinematic';if(d.story){state.story=d.story;$('storyText').textContent=d.story;$('storyText').classList.remove('empty');set('storyStatus','تم استرجاع آخر مسودة. يمكنك إنشاء المشاهد من جديد.')}}catch{}}

function sceneRefs(i){if(i<=0)return[];const refs=[];if(state.scenes[0]?.blob)refs.push(state.scenes[0].blob);if(i>1&&state.scenes[i-1]?.blob)refs.push(state.scenes[i-1].blob);return refs}
function renderScenes(){const host=$('sceneGrid');if(!host)return;host.innerHTML=state.scenes.map((s,i)=>`<article class="visual-scene" data-index="${i}"><div class="visual-scene-media">${s.url?`<img src="${s.url}" alt="مشهد ${i+1}">`:'<div class="scene-placeholder">جارٍ تجهيز الصورة…</div>'}<span>${String(i+1).padStart(2,'0')}</span></div><label>وصف المشهد<textarea class="scene-prompt" data-index="${i}">${esc(s.prompt)}</textarea></label><div class="scene-actions"><button type="button" class="secondary scene-regenerate" data-index="${i}">↻ إعادة الصورة</button>${s.url?`<a class="secondary scene-download" href="${s.url}" download="scene-${i+1}.jpg">↓ الصورة</a>`:''}</div></article>`).join('');
  host.classList.toggle('empty',!state.scenes.length);
  qsa('.scene-prompt',host).forEach(t=>t.addEventListener('change',e=>{const i=Number(e.currentTarget.dataset.index);if(state.scenes[i])state.scenes[i].prompt=e.currentTarget.value.trim();saveDraft()}));
  qsa('.scene-regenerate',host).forEach(b=>b.addEventListener('click',()=>regenerateScene(Number(b.dataset.index))));
}

async function buildImages(prompts){state.scenes=prompts.map(prompt=>({prompt:String(prompt||'').trim(),blob:null,url:''}));renderScenes();for(let i=0;i<state.scenes.length;i++){set('storyStatus',`توليد الصورة ${i+1} من ${state.scenes.length}…`);const blob=await generateImage(stylePrompt(state.scenes[i].prompt),sceneRefs(i));const url=URL.createObjectURL(blob);state.sceneUrls.push(url);state.scenes[i].blob=blob;state.scenes[i].url=url;renderScenes()}saveDraft()}

async function regenerateScene(i){if(state.busy||!state.scenes[i])return;const button=qs(`.scene-regenerate[data-index="${i}"]`);if(button)button.disabled=true;set('storyStatus',`إعادة توليد المشهد ${i+1}…`);try{const blob=await generateImage(stylePrompt(state.scenes[i].prompt),sceneRefs(i));const old=state.scenes[i].url;const url=URL.createObjectURL(blob);if(old){const p=state.sceneUrls.indexOf(old);if(p>=0)state.sceneUrls.splice(p,1);revokeUrl(old)}state.sceneUrls.push(url);state.scenes[i].blob=blob;state.scenes[i].url=url;renderScenes();set('storyStatus',`تم تحديث المشهد ${i+1}.`)}catch(e){set('storyStatus','خطأ في إعادة الصورة: '+(e?.message||e))}finally{if(button)button.disabled=false}}

async function runVisualStory(){const idea=$('storyIdea')?.value.trim();if(!idea)return set('storyStatus','اكتب فكرة القصة أولًا.');setBusy(true);resetMedia();state.story='';$('storyText').textContent='جاري كتابة القصة…';$('storyText').classList.remove('empty');$('renderVisualVideoBtn')?.classList.add('hidden');try{const duration=Number($('storyDuration')?.value||30),tone=$('storyTone')?.value||'natural',count=selectedSceneCount();pipe('story');set('storyStatus','1/3 كتابة قصة متماسكة…');const storyRes=await jsonPost('/api/story/generate',{idea,duration,tone});if(!storyRes.story)throw new Error('لم يتم إنشاء نص القصة');state.story=storyRes.story;$('storyText').textContent=state.story;saveDraft();pipe('scenes');set('storyStatus',`2/3 تقسيم القصة إلى ${count} مشاهد…`);const scenesRes=await jsonPost('/api/story/scenes',{story:state.story,count});const prompts=(scenesRes.scenes||[]).filter(Boolean);if(!prompts.length)throw new Error('لم يتم إنشاء المشاهد');pipe('images');set('storyStatus',`3/3 توليد ${prompts.length} صور مترابطة…`);await buildImages(prompts);finishPipes();$('renderVisualVideoBtn')?.classList.remove('hidden');set('storyStatus',`جاهز للمراجعة · ${prompts.length} مشاهد. يمكنك تعديل أي وصف أو إعادة أي صورة قبل التصدير.`)}catch(e){set('storyStatus','خطأ: '+(e?.message||e))}finally{setBusy(false)}}

async function imageElements(){const out=[];for(const s of state.scenes){if(!s.url)throw new Error('يوجد مشهد بدون صورة');const img=new Image();img.src=s.url;await img.decode();out.push(img)}return out}
function drawCover(ctx,img,w,h,p,i,alpha=1){const sw=img.naturalWidth,sh=img.naturalHeight,base=Math.max(w/sw,h/sh),zoom=1.02+.065*(i%2?p:1-p),sc=base*zoom,dw=sw*sc,dh=sh*sc,dx=(w-dw)/2+(i%2?1:-1)*10*(p-.5),dy=(h-dh)/2;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,dx,dy,dw,dh);ctx.restore()}

async function renderSilentVideo(){if(!state.scenes.length)throw new Error('أنشئ المشاهد أولًا');if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('المتصفح لا يدعم التصدير المباشر');const imgs=await imageElements(),total=Number($('storyDuration')?.value||30),canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;const ctx=canvas.getContext('2d',{alpha:false}),stream=canvas.captureStream(24);const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];const mime=types.find(x=>MediaRecorder.isTypeSupported(x))||'';const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:2200000}:{videoBitsPerSecond:2200000}),chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const stopped=new Promise(resolve=>rec.onstop=resolve),per=total/imgs.length,fade=Math.min(.45,per*.12),start=performance.now();rec.start(1000);await new Promise(resolve=>{const tick=()=>{const t=(performance.now()-start)/1000;if(t>=total)return resolve();const i=Math.min(imgs.length-1,Math.floor(t/per)),local=t-i*per,p=Math.min(1,local/per);ctx.fillStyle='#000';ctx.fillRect(0,0,540,960);drawCover(ctx,imgs[i],540,960,p,i,1);if(i<imgs.length-1&&local>per-fade){const a=(local-(per-fade))/fade;drawCover(ctx,imgs[i+1],540,960,0,i+1,a)}set('storyStatus',`تصدير الفيديو ${Math.min(total,Math.round(t))}/${total} ثانية…`);requestAnimationFrame(tick)};tick()});rec.stop();await stopped;stream.getTracks().forEach(t=>t.stop());if(!chunks.length)throw new Error('لم ينتج ملف فيديو');return new Blob(chunks,{type:rec.mimeType||'video/webm'})}

async function renderVideo(){if(state.busy)return;setBusy(true);pipe('render');set('storyStatus','جاري تجهيز الفيديو الصامت…');try{const blob=await renderSilentVideo();revokeUrl(state.finalUrl);state.finalUrl=URL.createObjectURL(blob);$('finalVideo').src=state.finalUrl;$('downloadVideo').href=state.finalUrl;$('finalWrap').classList.remove('hidden');finishPipes();set('storyStatus',`اكتمل الفيديو · ${$('storyDuration')?.value||30} ثانية · ${state.scenes.length} مشاهد.`);$('finalWrap').scrollIntoView({behavior:'smooth',block:'center'})}catch(e){set('storyStatus','خطأ التصدير: '+(e?.message||e))}finally{setBusy(false)}}

function installVisualCss(){if(qs('link[data-visual-story]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/visual-story-v1.css?v=1';l.dataset.visualStory='1';document.head.appendChild(l)}
function simplifyNavigation(){qsa('[data-route="voices"],[data-route="transcribe"],[data-go="voices"],[data-go="transcribe"]').forEach(el=>el.style.display='none');const storyNav=qs('[data-route="story"] small');if(storyNav)storyNav.textContent='قصة → مشاهد → صور → فيديو';const side=qs('.side-note');if(side){const span=qs('span',side),small=qs('small',side);if(span)span.textContent='Visual AI Mode';if(small)small.textContent='تطوير الصور والمشاهد الآن'}const settingsTts=$('settingsTts')?.closest('.setting-row');if(settingsTts)settingsTts.style.display='none';const settingsAi=$('settingsAi')?.closest('.setting-row');const note=settingsAi?.querySelector('span');if(note)note.textContent='كتابة القصص وتوليد الصور'}
function refreshHome(){const hero=qs('[data-page="home"] .hero-copy');if(hero){const h=qs('h1',hero),p=qs('p',hero),b=qs('[data-go="story"]',hero);if(h)h.textContent='حوّل أي فكرة إلى قصة بصرية جاهزة للفيديو.';if(p)p.textContent='اكتب الفكرة، وسيبني الاستوديو القصة والمشاهد والصور المترابطة، ثم راجع كل مشهد وصدّر الفيديو.';if(b)b.textContent='ابدأ مشروع بصري جديد'}const stats=qsa('[data-page="home"] .stat span');['اكتب الفكرة','أنشئ القصة','راجع المشاهد','صدّر الفيديو'].forEach((x,i)=>{if(stats[i])stats[i].textContent=x});const title=qs('[data-page="home"] .section-head span');if(title)title.textContent='القصة والصور والكتابة والقرآن في واجهة واحدة'}

function buildStoryPage(){const page=qs('[data-page="story"]');if(!page)return;page.innerHTML=`
  <div class="page-head"><div><span class="eyebrow">VISUAL STORY STUDIO</span><h2>إنشاء قصة بصرية</h2><p>القصة والمشاهد والصور أولًا. الصوت مؤجل للمرحلة التالية.</p></div><span class="health-pill">VISUAL MODE</span></div>
  <div class="story-layout visual-story-layout">
    <div class="card form-card visual-control-card">
      <label>فكرة القصة أو القصة كاملة<textarea id="storyIdea" placeholder="مثال: شاب مصري يرجع إلى بيت جده القديم ويكتشف رسالة تغيّر نظرته لعائلته…"></textarea></label>
      <div class="visual-grid-2">
        <label>مدة الفيديو<select id="storyDuration"><option value="15">15 ثانية</option><option value="30" selected>30 ثانية</option><option value="45">45 ثانية</option><option value="60">60 ثانية</option></select></label>
        <label>أسلوب السرد<select id="storyTone"><option value="natural">طبيعي قصصي</option><option value="calm">هادئ ودافئ</option><option value="dramatic">درامي ومشوق</option></select></label>
        <label>عدد المشاهد<select id="sceneCount"><option value="auto" selected>تلقائي حسب المدة</option><option value="4">4 مشاهد</option><option value="6">6 مشاهد</option><option value="8">8 مشاهد</option><option value="10">10 مشاهد</option></select></label>
        <label>الهوية البصرية<select id="visualStyle"><option value="cinematic">سينمائي</option><option value="realistic">واقعي فوتوغرافي</option><option value="animation">3D Animation</option><option value="dramatic">درامي</option></select></label>
      </div>
      <div class="visual-actions"><button id="generateVisualStoryBtn" class="primary big" type="button">✦ إنشاء القصة والمشاهد</button><button id="renderVisualVideoBtn" class="secondary big hidden" type="button">▶ تصدير فيديو صامت</button></div>
      <div id="storyStatus" class="status">جاهز للبدء. لن يتم إنشاء أو تشغيل أي صوت في هذه المرحلة.</div>
    </div>
    <div class="card progress-card visual-progress-card">
      <div class="pipeline visual-pipeline"><div class="pipe visual-pipe active" data-step="story"><i>1</i><span>القصة</span></div><div class="pipe visual-pipe" data-step="scenes"><i>2</i><span>المشاهد</span></div><div class="pipe visual-pipe" data-step="images"><i>3</i><span>الصور</span></div><div class="pipe visual-pipe" data-step="render"><i>4</i><span>الفيديو</span></div></div>
      <div class="visual-section-title"><div><b>نص القصة</b><span>راجع القصة قبل التصدير</span></div></div>
      <div id="storyText" class="story-text empty">ستظهر القصة هنا بعد إنشائها.</div>
      <div class="visual-section-title scenes-title"><div><b>لوحة المشاهد</b><span>يمكنك تعديل وصف أي مشهد وإعادة صورته فقط</span></div></div>
      <div id="sceneGrid" class="scene-grid visual-scene-grid empty"></div>
      <div id="finalWrap" class="final-wrap hidden"><div class="visual-section-title"><div><b>الفيديو النهائي</b><span>نسخة بصرية بدون صوت</span></div></div><video id="finalVideo" controls playsinline></video><a id="downloadVideo" class="primary download" download="reels-maker-visual-story.webm">تحميل الفيديو</a></div>
    </div>
  </div>`;
  $('generateVisualStoryBtn')?.addEventListener('click',runVisualStory);$('renderVisualVideoBtn')?.addEventListener('click',renderVideo);['storyIdea','storyDuration','storyTone','sceneCount','visualStyle'].forEach(id=>$(id)?.addEventListener('change',saveDraft));$('storyIdea')?.addEventListener('input',saveDraft);restoreDraft()}

export function initVisualStoryStudio(){installVisualCss();simplifyNavigation();refreshHome();buildStoryPage();window.addEventListener('beforeunload',saveDraft)}
