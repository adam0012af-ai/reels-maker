const $=id=>document.getElementById(id);
const OUTRO='كانت هذه القصة من تأليف وإنتاج ريلز ميكر إيه آي، حيث تتحول الأفكار إلى حكايات.';
const VOICE_SAMPLE='مرحبًا بك في ريلز ميكر إيه آي. هذه تجربة للصوت الذي اخترته قبل إنشاء قصة الأطفال.';
const state={catalog:[],audioBlob:null,audioUrl:'',audioDuration:0,scenes:[],sceneUrls:[],videoBlob:null,videoUrl:''};

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function set(id,text){const e=$(id);if(e)e.textContent=text||''}
function wc(t){return String(t||'').trim().split(/\s+/).filter(Boolean).length}
function gender(v){const g=String(v||'neutral').toLowerCase();return g==='male'||g==='female'?g:'neutral'}
async function getJson(url){const r=await fetch(url,{cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}
async function postJson(url,data){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}

function injectUi(){
  if(document.querySelector('[data-route="kids"]'))return;
  const nav=document.getElementById('nav');
  const voiceBtn=nav?.querySelector('[data-route="voices"]');
  const btn=document.createElement('button');
  btn.className='nav-item';btn.dataset.route='kids';
  btn.innerHTML='<span>★</span><div><b>قصص أطفال فيديو</b><small>فكرة → قصة → صوت وصور</small></div>';
  voiceBtn?.insertAdjacentElement('beforebegin',btn);
  const main=document.querySelector('main.main');
  const section=document.createElement('section');
  section.className='page';section.dataset.page='kids';
  section.innerHTML=`
    <div class="page-head"><div><span class="eyebrow">KIDS STORY VIDEO</span><h2>قصص أطفال فيديو</h2><p>اكتب فكرة قصيرة، راجع نص القصة، ثم أنشئ فيديو طويل متزامن مع الصوت والصور.</p></div><span class="health-pill">2–3 دقائق</span></div>
    <div class="kids-v27-grid">
      <div class="card form-card">
        <div class="kids-step"><i>1</i><div><b>اكتب الفكرة</b><small>الذكاء الاصطناعي يكتب القصة كاملة أولًا</small></div></div>
        <label>فكرة القصة<textarea id="kidsIdea" placeholder="مثال: طفل يحب النجوم يجد طائرًا صغيرًا خائفًا، ويساعده على العودة لعائلته..."></textarea></label>
        <div class="form-grid">
          <label>مدة القصة<select id="kidsDuration"><option value="120">دقيقتان</option><option value="180">3 دقائق</option></select></label>
          <label>العمر<select id="kidsAge"><option value="4-7">4–7 سنوات</option><option value="6-10" selected>6–10 سنوات</option><option value="9-12">9–12 سنة</option></select></label>
        </div>
        <label>نوع القصة<select id="kidsTone"><option value="warm">دافئة وتربوية</option><option value="adventure">مغامرة</option><option value="funny">مرحة</option></select></label>
        <button id="kidsWriteBtn" class="primary big">✦ كتابة القصة</button>
        <div id="kidsWriteStatus" class="status">اكتب فكرة قصيرة ثم أنشئ النص.</div>
      </div>

      <div class="card form-card">
        <div class="kids-step"><i>2</i><div><b>راجع نص الفيديو</b><small>هذا هو نفس النص الذي سيقرأه الراوي</small></div></div>
        <label>نص القصة<textarea id="kidsScript" class="kids-script" placeholder="ستظهر القصة هنا ويمكنك تعديلها قبل إنشاء الفيديو."></textarea></label>
        <div class="kids-outro"><b>الخاتمة الصوتية الثابتة</b><span>${esc(OUTRO)}</span></div>
        <div class="form-grid">
          <label>نوع الصوت<select id="kidsGender"><option value="all">الكل</option><option value="male">رجال</option><option value="female">نساء</option><option value="neutral">أخرى</option></select></label>
          <label>الصوت<select id="kidsVoice"></select></label>
        </div>
        <label>أسلوب النطق<select id="kidsDialect"><option value="egyptian">🇪🇬 مصري</option><option value="saudi">🇸🇦 سعودي</option><option value="kuwaiti">🇰🇼 كويتي</option><option value="emirati">🇦🇪 إماراتي</option><option value="iraqi">🇮🇶 عراقي</option><option value="gulf">🌍 خليجي عام</option></select></label>
        <button id="kidsPreviewBtn" class="secondary">▶ تجربة الصوت</button>
        <small class="kids-preview-copy">سيقول الراوي: «${esc(VOICE_SAMPLE)}»</small>
        <audio id="kidsPreviewAudio" controls class="audio-player hidden"></audio>
        <button id="kidsBuildBtn" class="primary big" disabled>★ إنشاء الفيديو</button>
        <div id="kidsBuildStatus" class="status">بعد مراجعة النص اضغط إنشاء الفيديو.</div>
      </div>
    </div>

    <div id="kidsProgressCard" class="card progress-card kids-progress hidden">
      <div class="pipeline kids-pipeline"><div class="pipe" data-kstep="voice"><i>1</i><span>الصوت</span></div><div class="pipe" data-kstep="plan"><i>2</i><span>تقسيم القصة</span></div><div class="pipe" data-kstep="images"><i>3</i><span>الصور</span></div><div class="pipe" data-kstep="render"><i>4</i><span>الفيديو</span></div></div>
      <div id="kidsSceneGrid" class="scene-grid"></div>
      <div id="kidsFinal" class="final-wrap hidden">
        <video id="kidsVideo" controls playsinline></video>
        <div class="kids-actions"><a id="kidsDownload" class="primary download" download="reels-maker-kids-story.webm">تحميل الفيديو</a><button id="kidsShareBtn" class="secondary">↗ نشر مباشر</button></div>
        <div id="kidsShareStatus" class="status"></div>
      </div>
    </div>`;
  main?.appendChild(section);
  const style=document.createElement('style');
  style.textContent=`
    .kids-v27-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.kids-step{display:flex;align-items:center;gap:12px;margin-bottom:16px}.kids-step i{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:rgba(125,92,255,.16);font-style:normal;font-weight:800}.kids-step small{display:block;opacity:.62;margin-top:2px}.kids-script{min-height:280px}.kids-outro{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);margin:10px 0 14px}.kids-outro span,.kids-preview-copy{opacity:.7;line-height:1.8}.kids-preview-copy{display:block;margin:8px 0 12px}.kids-progress{margin-top:18px}.kids-actions{display:flex;gap:10px;flex-wrap:wrap}.kids-actions>*{flex:1;min-width:150px;text-align:center}.kids-scene-meta{font-size:12px;opacity:.7}@media(max-width:900px){.kids-v27-grid{grid-template-columns:1fr}.kids-script{min-height:220px}}
  `;
  document.head.appendChild(style);
}

async function loadCatalog(){
  const out=[];
  try{const g=await getJson('/api/voices');for(const v of g.voices||[])out.push({key:`g:${v.name}`,provider:'gemini',id:v.name,name:v.name,gender:gender(v.gender),detail:v.style||'صوت AI'})}catch{}
  try{const e=await getJson('/api/voices/elevenlabs');for(const v of e.voices||[])out.push({key:`e:${v.id}`,provider:'elevenlabs',id:v.id,name:v.name||'Voice',gender:gender(v.gender),detail:v.accent||v.locale||v.description||'صوت AI'})}catch{}
  const seen=new Set();state.catalog=out.filter(v=>{const k=`${v.provider}:${v.id}`;if(seen.has(k))return false;seen.add(k);return true});
  renderVoices();
}
function renderVoices(){
  const sel=$('kidsVoice'),filter=$('kidsGender')?.value||'all';if(!sel)return;
  const list=filter==='all'?state.catalog:state.catalog.filter(v=>v.gender===filter),groups=[['male','رجال','👨'],['female','نساء','👩'],['neutral','أخرى','🎙️']];
  let html='';for(const [g,title,icon] of groups){const arr=list.filter(v=>v.gender===g);if(arr.length)html+=`<optgroup label="${title} (${arr.length})">${arr.map(v=>`<option value="${esc(v.key)}">${icon} ${esc(v.name)}${v.detail?` — ${esc(v.detail)}`:''}</option>`).join('')}</optgroup>`}sel.innerHTML=html||'<option value="">لا توجد أصوات</option>';
}
function chosenVoice(){return state.catalog.find(v=>v.key===$('kidsVoice')?.value)||null}
async function tts(text){
  const v=chosenVoice();if(!v)throw new Error('اختر صوتًا أولًا.');
  const url=v.provider==='elevenlabs'?'/api/tts/elevenlabs':'/api/tts';
  const body=v.provider==='elevenlabs'?{text,voiceId:v.id,model:'eleven_multilingual_v2'}:{text,voice:v.id,dialect:$('kidsDialect')?.value||'egyptian',tone:'natural'};
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`TTS ${r.status}`)}const blob=await r.blob();if(!blob.size)throw new Error('لم يرجع ملف صوت');return blob
}
async function durationOf(blob){const u=URL.createObjectURL(blob),a=new Audio(u);const d=await new Promise(resolve=>{let done=false;const end=()=>{if(done)return;done=true;resolve(Number.isFinite(a.duration)?a.duration:0)};a.onloadedmetadata=end;a.onerror=end;setTimeout(end,8000)});URL.revokeObjectURL(u);return d}
function revokeMedia(){if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);if(state.videoUrl)URL.revokeObjectURL(state.videoUrl);for(const u of state.sceneUrls)try{URL.revokeObjectURL(u)}catch{}state.audioUrl='';state.videoUrl='';state.sceneUrls=[];state.videoBlob=null}
function kstep(name){const all=[...document.querySelectorAll('[data-kstep]')],i=all.findIndex(x=>x.dataset.kstep===name);all.forEach((x,n)=>{x.classList.toggle('active',n===i);x.classList.toggle('done',n<i)})}
async function generateImage(prompt,refs=[]){const fd=new FormData();fd.append('prompt',prompt);refs.slice(0,2).forEach((b,i)=>fd.append(`reference${i}`,b,`ref-${i}.jpg`));const r=await fetch('/api/image',{method:'POST',body:fd});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`Image ${r.status}`)}return r.blob()}
function renderSceneCards(){const host=$('kidsSceneGrid');if(!host)return;host.innerHTML='';state.scenes.forEach((s,i)=>{const d=document.createElement('div');d.className='scene';d.innerHTML=`<img src="${s.url}" alt="مشهد ${i+1}"><span>مشهد ${i+1}</span><small class="kids-scene-meta">${esc(s.narration.slice(0,80))}${s.narration.length>80?'…':''}</small>`;host.appendChild(d)})}
async function buildImages(plan){const out=[];state.sceneUrls=[];for(let i=0;i<plan.length;i++){set('kidsBuildStatus',`توليد الصورة ${i+1} من ${plan.length}...`);const refs=i===0?[]:[out[0].blob,...(i>1?[out[i-1].blob]:[])],blob=await generateImage(plan[i].prompt,refs),url=URL.createObjectURL(blob);state.sceneUrls.push(url);out.push({...plan[i],blob,url})}state.scenes=out;renderSceneCards()}
async function imageElements(){const out=[];for(const s of state.scenes){const img=new Image();img.src=s.url;await img.decode();out.push(img)}return out}
function drawCover(ctx,img,w,h,p,i,alpha=1){const sw=img.naturalWidth,sh=img.naturalHeight,base=Math.max(w/sw,h/sh),zoom=1.015+.055*(i%2?p:1-p),sc=base*zoom,dw=sw*sc,dh=sh*sc,dx=(w-dw)/2+(i%2?1:-1)*10*(p-.5),dy=(h-dh)/2;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,dx,dy,dw,dh);ctx.restore()}
async function renderVideo(){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('المتصفح لا يدعم الريندر المباشر');
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext غير مدعوم');
  const ac=new AC();await ac.resume().catch(()=>{});const audio=await ac.decodeAudioData((await state.audioBlob.arrayBuffer()).slice(0)),total=audio.duration,imgs=await imageElements();if(!imgs.length)throw new Error('لا توجد صور للمشاهد');
  const weights=state.scenes.map(s=>Math.max(1,wc(s.narration)));weights[weights.length-1]+=wc(OUTRO);const sum=weights.reduce((a,b)=>a+b,0),ends=[];let acc=0;for(const w of weights){acc+=total*(w/sum);ends.push(acc)}
  const canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;const ctx=canvas.getContext('2d',{alpha:false}),vs=canvas.captureStream(24),dest=ac.createMediaStreamDestination(),src=ac.createBufferSource();src.buffer=audio;src.connect(dest);
  const stream=new MediaStream([...vs.getVideoTracks(),...dest.stream.getAudioTracks()]),mime=['video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'',rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:1800000,audioBitsPerSecond:128000}:{videoBitsPerSecond:1800000}),chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const stopped=new Promise(r=>rec.onstop=r),start=performance.now();rec.start(1000);src.start();
  await new Promise(resolve=>{const tick=()=>{const t=(performance.now()-start)/1000;if(t>=total)return resolve();let i=ends.findIndex(x=>t<x);if(i<0)i=imgs.length-1;const st=i?ends[i-1]:0,en=ends[i],local=t-st,per=Math.max(.1,en-st),p=Math.min(1,local/per),fade=Math.min(.55,per*.14);ctx.fillStyle='#000';ctx.fillRect(0,0,540,960);drawCover(ctx,imgs[i],540,960,p,i,1);if(i<imgs.length-1&&local>per-fade){const a=(local-(per-fade))/fade;drawCover(ctx,imgs[i+1],540,960,0,i+1,a)}set('kidsBuildStatus',`ريندر الفيديو ${Math.round(t)} / ${Math.round(total)} ثانية...`);requestAnimationFrame(tick)};tick()});
  try{src.stop()}catch{}rec.stop();await stopped;ac.close().catch(()=>{});if(!chunks.length)throw new Error('لم ينتج ملف فيديو');return new Blob(chunks,{type:rec.mimeType||'video/webm'})
}
async function writeStory(){const idea=$('kidsIdea')?.value.trim();if(!idea)return set('kidsWriteStatus','اكتب فكرة القصة أولًا.');const btn=$('kidsWriteBtn');btn.disabled=true;set('kidsWriteStatus','جاري كتابة قصة أطفال كاملة...');try{const j=await postJson('/api/kids/story',{idea,duration:Number($('kidsDuration').value),age:$('kidsAge').value,tone:$('kidsTone').value});$('kidsScript').value=j.story;$('kidsBuildBtn').disabled=false;set('kidsWriteStatus',`القصة جاهزة · ${j.words} كلمة تقريبًا. راجعها وعدّلها ثم اضغط إنشاء الفيديو.`)}catch(e){set('kidsWriteStatus','خطأ: '+e.message)}finally{btn.disabled=false}}
async function previewVoice(){const btn=$('kidsPreviewBtn'),a=$('kidsPreviewAudio');btn.disabled=true;set('kidsBuildStatus','جاري إنشاء تجربة الصوت...');try{const blob=await tts(VOICE_SAMPLE),u=URL.createObjectURL(blob);if(a.dataset.url)URL.revokeObjectURL(a.dataset.url);a.dataset.url=u;a.src=u;a.classList.remove('hidden');a.load();await a.play().catch(()=>{});set('kidsBuildStatus','تجربة الصوت جاهزة.')}catch(e){set('kidsBuildStatus','خطأ تجربة الصوت: '+e.message)}finally{btn.disabled=false}}
async function buildVideo(){
  const script=$('kidsScript')?.value.trim();if(!script)return set('kidsBuildStatus','اكتب أو أنشئ نص القصة أولًا.');if(!chosenVoice())return set('kidsBuildStatus','اختر صوت الراوي أولًا.');
  const btn=$('kidsBuildBtn');btn.disabled=true;revokeMedia();$('kidsProgressCard').classList.remove('hidden');$('kidsFinal').classList.add('hidden');$('kidsSceneGrid').innerHTML='';
  try{
    kstep('voice');set('kidsBuildStatus','1/4 إنشاء الصوت الكامل للقصة...');state.audioBlob=await tts(`${script}\n\n${OUTRO}`);state.audioDuration=await durationOf(state.audioBlob);state.audioUrl=URL.createObjectURL(state.audioBlob);
    kstep('plan');set('kidsBuildStatus','2/4 تقسيم النص إلى مشاهد متزامنة مع السرد...');const plan=await postJson('/api/kids/scenes',{story:script,duration:Number($('kidsDuration').value)});
    kstep('images');set('kidsBuildStatus',`3/4 توليد ${plan.scenes.length} صورة حسب أحداث القصة...`);await buildImages(plan.scenes);
    kstep('render');set('kidsBuildStatus','4/4 تركيب الصوت والصور وإنشاء الفيديو...');state.videoBlob=await renderVideo();state.videoUrl=URL.createObjectURL(state.videoBlob);$('kidsVideo').src=state.videoUrl;$('kidsDownload').href=state.videoUrl;$('kidsFinal').classList.remove('hidden');document.querySelectorAll('[data-kstep]').forEach(x=>{x.classList.add('done');x.classList.remove('active')});set('kidsBuildStatus',`اكتمل الفيديو · ${Math.round(state.audioDuration)} ثانية · ${state.scenes.length} مشهد`)
  }catch(e){set('kidsBuildStatus','خطأ: '+(e?.message||e))}finally{btn.disabled=false}
}
async function shareVideo(){if(!state.videoBlob)return set('kidsShareStatus','أنشئ الفيديو أولًا.');const file=new File([state.videoBlob],'reels-maker-kids-story.webm',{type:state.videoBlob.type||'video/webm'}),share={title:'قصة أطفال - Reels Maker AI',text:'قصة أطفال تم إنشاؤها وإنتاجها عبر Reels Maker AI.',files:[file]};try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share(share);set('kidsShareStatus','تم فتح خيارات النشر والمشاركة على جهازك.')}else{set('kidsShareStatus','النشر المباشر غير مدعوم في هذا المتصفح؛ استخدم تحميل الفيديو ثم شاركه من جهازك.')}}catch(e){if(e?.name!=='AbortError')set('kidsShareStatus','تعذر فتح المشاركة: '+e.message)}}

export async function initKidsStory(){
  injectUi();
  $('kidsGender')?.addEventListener('change',renderVoices);$('kidsWriteBtn')?.addEventListener('click',writeStory);$('kidsPreviewBtn')?.addEventListener('click',previewVoice);$('kidsBuildBtn')?.addEventListener('click',buildVideo);$('kidsShareBtn')?.addEventListener('click',shareVideo);
  await loadCatalog();
}
