const $=id=>document.getElementById(id);
const OUTRO='كانت هذه القصة من تأليف وإنتاج ريلز ميكر إيه آي، حيث تتحول الأفكار إلى حكايات.';
const st={audioBlob:null,audioDuration:0,scenes:[],urls:[],videoBlob:null,videoUrl:'',busy:false,projectId:''};
const wc=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
const uid=()=>crypto.randomUUID?.()||`p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
function set(t){const e=$('kidsBuildStatus');if(e)e.textContent=t||''}
function selectedFormat(){return $('kidsFormat')?.value==='short'?'short':'youtube'}
function selectedCategory(){const v=$('kidsCategory')?.value||'auto';if(v!=='auto')return v;const t=$('kidsDetectedType')?.textContent||'';const pairs=[['children','أطفال'],['islamic','إسلامية'],['religious','دينية'],['educational','تعليمية'],['moral','تربوية'],['adventure','مغامرات'],['historical','تاريخية'],['fantasy','خيال'],['social','اجتماعية'],['science','علمية']];return pairs.find(x=>t.includes(x[1]))?.[0]||'auto'}
function installFormat(){
  if($('kidsFormat'))return;
  const dur=$('kidsDuration')?.closest('label');if(!dur)return;
  const label=document.createElement('label');label.innerHTML='مقاس الفيديو<select id="kidsFormat"><option value="youtube" selected>▶ YouTube — أفقي 16:9 (1280×720)</option><option value="short">▯ Shorts / Reels — رأسي 9:16 (720×1280)</option></select>';
  dur.insertAdjacentElement('afterend',label);
}
function kstep(name){const all=[...document.querySelectorAll('[data-kstep]')],i=all.findIndex(x=>x.dataset.kstep===name);all.forEach((x,n)=>{x.classList.toggle('active',n===i);x.classList.toggle('done',n<i)})}
function chosenVoice(){const raw=$('kidsVoice')?.value||'';if(raw.startsWith('e:'))return{provider:'elevenlabs',id:raw.slice(2)};if(raw.startsWith('g:'))return{provider:'gemini',id:raw.slice(2)};return raw?{provider:'gemini',id:raw}:null}
async function tts(text){const v=chosenVoice();if(!v)throw new Error('اختر صوت الراوي أولًا.');const url=v.provider==='elevenlabs'?'/api/tts/elevenlabs':'/api/tts',body=v.provider==='elevenlabs'?{text,voiceId:v.id,model:'eleven_multilingual_v2'}:{text,voice:v.id,dialect:$('kidsDialect')?.value||'egyptian',tone:$('kidsTone')?.value||'natural'};const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`TTS ${r.status}`)}const b=await r.blob();if(!b.size)throw new Error('لم يرجع ملف صوت');return b}
async function durationOf(blob){const u=URL.createObjectURL(blob),a=new Audio(u);const d=await new Promise(resolve=>{let done=false;const end=()=>{if(done)return;done=true;resolve(Number.isFinite(a.duration)?a.duration:0)};a.onloadedmetadata=end;a.onerror=end;setTimeout(end,8000)});URL.revokeObjectURL(u);return d}
async function post(url,data){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}
async function image(prompt,refs,format){const fd=new FormData();fd.append('prompt',prompt);fd.append('format',format);refs.slice(0,2).forEach((b,i)=>fd.append(`reference${i}`,b,`ref-${i}.jpg`));const r=await fetch('/api/image',{method:'POST',body:fd});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`Image ${r.status}`)}return r.blob()}
function revoke(){if(st.videoUrl)URL.revokeObjectURL(st.videoUrl);for(const u of st.urls)try{URL.revokeObjectURL(u)}catch{}st.urls=[];st.videoUrl='';st.videoBlob=null}
async function buildImages(plan,format){const out=[];st.urls=[];for(let i=0;i<plan.length;i++){set(`توليد الصورة ${i+1} من ${plan.length}...`);const refs=i===0?[]:[out[0].blob,...(i>1?[out[i-1].blob]:[])],blob=await image(plan[i].prompt,refs,format),url=URL.createObjectURL(blob);st.urls.push(url);out.push({...plan[i],blob,url})}st.scenes=out;const host=$('kidsSceneGrid');if(host){host.innerHTML='';out.forEach((s,i)=>{const d=document.createElement('div');d.className='scene';d.innerHTML=`<img src="${s.url}" alt="مشهد ${i+1}"><span>مشهد ${i+1}</span>`;host.appendChild(d)})}}
async function imgs(){const out=[];for(const s of st.scenes){const im=new Image();im.src=s.url;await im.decode();out.push(im)}return out}
function drawCover(ctx,img,w,h,p,i,alpha=1){const sw=img.naturalWidth,sh=img.naturalHeight,base=Math.max(w/sw,h/sh),zoom=1.01+.045*(i%2?p:1-p),sc=base*zoom,dw=sw*sc,dh=sh*sc,dx=(w-dw)/2+(i%2?1:-1)*14*(p-.5),dy=(h-dh)/2;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,dx,dy,dw,dh);ctx.restore()}
async function render(){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('المتصفح لا يدعم إنشاء الفيديو المباشر');
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext غير مدعوم');
  const ac=new AC();await ac.resume().catch(()=>{});const audio=await ac.decodeAudioData((await st.audioBlob.arrayBuffer()).slice(0)),total=audio.duration,images=await imgs();if(!images.length)throw new Error('لا توجد صور للمشاهد');
  const weights=st.scenes.map(s=>Math.max(1,wc(s.narration)));weights[weights.length-1]+=wc(OUTRO);const sum=weights.reduce((a,b)=>a+b,0),ends=[];let acc=0;for(const wgt of weights){acc+=total*(wgt/sum);ends.push(acc)}
  const format=selectedFormat(),W=format==='youtube'?1280:720,H=format==='youtube'?720:1280,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d',{alpha:false}),vs=canvas.captureStream(24),dest=ac.createMediaStreamDestination(),src=ac.createBufferSource();src.buffer=audio;src.connect(dest);
  const stream=new MediaStream([...vs.getVideoTracks(),...dest.stream.getAudioTracks()]),mime=['video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'',rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:format==='youtube'?3200000:2600000,audioBitsPerSecond:128000}:{videoBitsPerSecond:2800000}),chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const stopped=new Promise(r=>rec.onstop=r),start=performance.now();rec.start(1000);src.start();
  await new Promise(resolve=>{const tick=()=>{const t=(performance.now()-start)/1000;if(t>=total)return resolve();let i=ends.findIndex(x=>t<x);if(i<0)i=images.length-1;const s=i?ends[i-1]:0,e=ends[i],local=t-s,per=Math.max(.1,e-s),p=Math.min(1,local/per),fade=Math.min(.55,per*.14);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);drawCover(ctx,images[i],W,H,p,i,1);if(i<images.length-1&&local>per-fade){const a=(local-(per-fade))/fade;drawCover(ctx,images[i+1],W,H,0,i+1,a)}set(`ريندر ${format==='youtube'?'YouTube 16:9':'9:16'} · ${Math.round(t)} / ${Math.round(total)} ثانية...`);requestAnimationFrame(tick)};tick()});
  try{src.stop()}catch{}rec.stop();await stopped;ac.close().catch(()=>{});if(!chunks.length)throw new Error('لم ينتج ملف فيديو');return new Blob(chunks,{type:rec.mimeType||'video/webm'})
}
function projectDetail(blob){return{id:st.projectId||(st.projectId=uid()),idea:$('kidsIdea')?.value.trim()||'',story:$('kidsScript')?.value.trim()||'',category:selectedCategory(),format:selectedFormat(),duration:Number($('kidsDuration')?.value)||120,audience:$('kidsAge')?.value||'auto',tone:$('kidsTone')?.value||'natural',dialect:$('kidsDialect')?.value||'egyptian',voice:$('kidsVoice')?.value||'',audioDuration:st.audioDuration,sceneCount:st.scenes.length,blob}}
async function build(){
  if(st.busy)return;const script=$('kidsScript')?.value.trim();if(!script)return set('اكتب أو أنشئ نص القصة أولًا.');if(!chosenVoice())return set('اختر صوت الراوي أولًا.');st.busy=true;const btn=$('kidsBuildBtn');if(btn)btn.disabled=true;revoke();$('kidsProgressCard')?.classList.remove('hidden');$('kidsFinal')?.classList.add('hidden');if($('kidsSceneGrid'))$('kidsSceneGrid').innerHTML='';
  try{
    const format=selectedFormat(),duration=Number($('kidsDuration')?.value)||120,category=selectedCategory();
    kstep('voice');set('1/4 إنشاء الصوت الكامل للقصة...');st.audioBlob=await tts(`${script}\n\n${OUTRO}`);st.audioDuration=await durationOf(st.audioBlob);
    kstep('plan');set('2/4 تقسيم القصة إلى مشاهد...');const plan=await post('/api/kids/scenes',{story:script,duration,category,format});
    kstep('images');set(`3/4 توليد ${plan.scenes.length} صورة بمقاس ${format==='youtube'?'16:9':'9:16'}...`);await buildImages(plan.scenes,format);
    kstep('render');set('4/4 تركيب الصوت والصور...');st.videoBlob=await render();st.videoUrl=URL.createObjectURL(st.videoBlob);const v=$('kidsVideo'),d=$('kidsDownload');if(v)v.src=st.videoUrl;if(d){d.href=st.videoUrl;d.download=format==='youtube'?'reels-maker-youtube-story.webm':'reels-maker-short-story.webm'}$('kidsFinal')?.classList.remove('hidden');document.querySelectorAll('[data-kstep]').forEach(x=>{x.classList.add('done');x.classList.remove('active')});set(`اكتمل الفيديو · ${Math.round(st.audioDuration)} ثانية · ${st.scenes.length} مشهد · ${format==='youtube'?'1280×720':'720×1280'}`);window.dispatchEvent(new CustomEvent('reels-project-ready',{detail:projectDetail(st.videoBlob)}));
  }catch(e){set('خطأ: '+String(e?.message||e))}finally{st.busy=false;if(btn)btn.disabled=false}
}
function draftEvent(){const story=$('kidsScript')?.value.trim();if(!story)return;st.projectId=uid();window.dispatchEvent(new CustomEvent('reels-project-draft',{detail:projectDetail(null)}))}
export function initStoryOutputV38(){
  installFormat();
  document.addEventListener('click',e=>{const b=e.target.closest?.('#kidsBuildBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();build()},true);
  $('kidsWriteBtn')?.addEventListener('click',()=>setTimeout(draftEvent,1800));
}
