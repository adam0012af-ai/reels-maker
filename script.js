"use strict";

const $ = id => document.getElementById(id);
const PEXELS_ENDPOINT = "/api/pexels";
const canvas = $("canvas"), ctx = canvas.getContext("2d", {alpha:false});
const stage = $("stage"), sourceVideo = $("sourceVideo"), sourceAudio = $("sourceAudio");
const desktopPanels = document.querySelector(".panels"), mobileSheet = $("mobileSheet"), mobileHost = $("mobilePanelHost");

const state = {
  videoLoaded:false, videoUrl:null, audioUrl:null, layers:[], selected:null,
  dragging:null, dragDX:0, dragDY:0, exporting:false, cancelExport:false,
  muted:false, audioCtx:null, videoSource:null, musicSource:null,
  videoGain:null, musicGain:null, monitorVideo:null, monitorMusic:null, recordDest:null,
  mobilePanel:null
};

const controls = {
  pexelsSearch:$("pexelsSearch"), searchBtn:$("searchBtn"), results:$("results"), videoUpload:$("videoUpload"), videoStatus:$("videoStatus"),
  newText:$("newText"), addTextBtn:$("addTextBtn"), layers:$("layers"), textEditor:$("textEditor"), textContent:$("textContent"), fontFamily:$("fontFamily"), fontSize:$("fontSize"), fontSizeOut:$("fontSizeOut"), textColor:$("textColor"), bgColor:$("bgColor"), shadowColor:$("shadowColor"), bgOpacity:$("bgOpacity"), bgOpacityOut:$("bgOpacityOut"), shadowBlur:$("shadowBlur"), shadowBlurOut:$("shadowBlurOut"), duplicateTextBtn:$("duplicateTextBtn"), deleteTextBtn:$("deleteTextBtn"),
  audioUpload:$("audioUpload"), audioCard:$("audioCard"), audioName:$("audioName"), audioDuration:$("audioDuration"), removeAudioBtn:$("removeAudioBtn"), musicVolume:$("musicVolume"), musicVolumeOut:$("musicVolumeOut"), videoVolume:$("videoVolume"), videoVolumeOut:$("videoVolumeOut"),
  quality:$("quality"), fps:$("fps"), fit:$("fit"), playBtn:$("playBtn"), timeline:$("timeline"), currentTime:$("currentTime"), duration:$("duration"), muteBtn:$("muteBtn"), resetBtn:$("resetBtn"), exportBtn:$("exportBtn"), emptyState:$("emptyState"), exportModal:$("exportModal"), progressBar:$("progressBar"), progressText:$("progressText"), cancelExportBtn:$("cancelExportBtn"), toasts:$("toasts")
};

window.addEventListener("DOMContentLoaded", init);
function init(){
  bindTabs(); bindVideo(); bindText(); bindAudio(); bindTransport(); bindExport(); bindStage();
  window.addEventListener("resize", syncResponsivePanels);
  syncResponsivePanels(); requestAnimationFrame(renderLoop);
}

function bindTabs(){
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>activateTab(btn.dataset.tab)));
}
function activateTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active",p.id===`panel-${name}`));
  if(innerWidth<=900){ openMobilePanel(name); }
}
function openMobilePanel(name){
  const panel=$(`panel-${name}`); if(!panel)return;
  if(state.mobilePanel && state.mobilePanel!==panel) desktopPanels.appendChild(state.mobilePanel);
  state.mobilePanel=panel; mobileHost.appendChild(panel); mobileSheet.classList.add("open");
}
function syncResponsivePanels(){
  if(innerWidth>900){ if(state.mobilePanel){ desktopPanels.appendChild(state.mobilePanel); state.mobilePanel=null; } mobileSheet.classList.remove("open"); }
  else { const active=document.querySelector(".mobile-tabs .tab.active")?.dataset.tab||"video"; openMobilePanel(active); }
}

function bindVideo(){
  controls.searchBtn.addEventListener("click",()=>searchPexels(controls.pexelsSearch.value.trim()));
  controls.pexelsSearch.addEventListener("keydown",e=>{if(e.key==="Enter")searchPexels(controls.pexelsSearch.value.trim())});
  document.querySelectorAll(".chips button").forEach(b=>b.addEventListener("click",()=>{controls.pexelsSearch.value=b.dataset.q;searchPexels(b.dataset.q)}));
  controls.videoUpload.addEventListener("change",()=>{const file=controls.videoUpload.files?.[0];if(!file)return;if(!file.type.startsWith("video/"))return toast("اختر ملف فيديو صالحًا.","error");loadVideoBlob(file,file.name)});
}
async function searchPexels(query){
  if(!query)return toast("اكتب كلمة للبحث أولاً.","error");
  controls.results.innerHTML='<div class="results-msg">جاري البحث...</div>';
  try{
    const url=`${PEXELS_ENDPOINT}?query=${encodeURIComponent(query)}&per_page=18`;
    const r=await fetch(url); const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||`Pexels ${r.status}`);
    showResults(data.videos||[]);
  }catch(err){console.error(err);controls.results.innerHTML='<div class="results-msg">تعذر تحميل النتائج حاليًا.</div>';toast("تعذر الاتصال بـ Pexels. حاول مرة أخرى.","error")}
}
function showResults(videos){
  controls.results.innerHTML="";
  if(!videos.length){controls.results.innerHTML='<div class="results-msg">لا توجد نتائج.</div>';return}
  videos.forEach(v=>{
    const f=bestPexelsFile(v.video_files||[]); if(!f)return;
    const card=document.createElement("div");card.className="result-card";card.innerHTML=`<img loading="lazy" src="${escapeHTML(v.image||"")}" alt="Pexels">`;
    card.addEventListener("click",()=>loadPexelsVideo(f.link,`Pexels #${v.id}`));controls.results.appendChild(card);
  });
}
function bestPexelsFile(files){
  const portrait=files.filter(f=>f.link&&f.width&&f.height&&f.height>f.width);
  const pool=portrait.length?portrait:files.filter(f=>f.link);
  return pool.sort((a,b)=>Math.abs((a.width||0)*(a.height||0)-2073600)-Math.abs((b.width||0)*(b.height||0)-2073600))[0]||null;
}
async function loadPexelsVideo(url,name){
  controls.videoStatus.textContent="جاري تنزيل فيديو Pexels إلى المتصفح...";
  try{const r=await fetch(url);if(!r.ok)throw new Error(r.status);const blob=await r.blob();loadVideoBlob(blob,name)}
  catch(err){console.error(err);controls.videoStatus.textContent="تعذر تجهيز الفيديو";toast("تعذر تحميل هذا الفيديو للتصدير بسبب قيود المصدر. جرّب نتيجة أخرى.","error")}
}
function loadVideoBlob(blob,name){
  revokeVideoUrl();state.videoUrl=URL.createObjectURL(blob);sourceVideo.src=state.videoUrl;sourceVideo.load();
  sourceVideo.onloadedmetadata=()=>{state.videoLoaded=true;sourceVideo.currentTime=0;controls.emptyState.classList.add("hidden");controls.videoStatus.textContent=`${name} — ${fmt(sourceVideo.duration)}`;controls.duration.textContent=fmt(sourceVideo.duration);controls.timeline.value=0;setupAudioGraph();toast("تم تحميل الفيديو.","ok")};
  sourceVideo.onerror=()=>toast("المتصفح لم يتمكن من قراءة الفيديو.","error");
}
function revokeVideoUrl(){if(state.videoUrl){URL.revokeObjectURL(state.videoUrl);state.videoUrl=null}}
function revokeAudioUrl(){if(state.audioUrl){URL.revokeObjectURL(state.audioUrl);state.audioUrl=null}}

function bindText(){
  controls.addTextBtn.addEventListener("click",()=>addLayer(controls.newText.value.trim()||"اكتب النص هنا"));
  controls.newText.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addLayer(controls.newText.value.trim()||"اكتب النص هنا")}});
  [controls.textContent,controls.textColor,controls.bgColor,controls.shadowColor].forEach(el=>el.addEventListener("input",updateLayer));
  controls.fontFamily.addEventListener("change",updateLayer);
  controls.fontSize.addEventListener("input",()=>{controls.fontSizeOut.textContent=controls.fontSize.value;updateLayer()});
  controls.bgOpacity.addEventListener("input",()=>{controls.bgOpacityOut.textContent=`${controls.bgOpacity.value}%`;updateLayer()});
  controls.shadowBlur.addEventListener("input",()=>{controls.shadowBlurOut.textContent=controls.shadowBlur.value;updateLayer()});
  controls.deleteTextBtn.addEventListener("click",deleteLayer);controls.duplicateTextBtn.addEventListener("click",duplicateLayer);
}
function addLayer(text){
  const l={id:`t-${Date.now()}-${Math.random().toString(16).slice(2)}`,text,x:canvas.width/2,y:canvas.height/2,font:"Cairo",size:72,color:"#ffffff",bg:"#000000",bgOpacity:.35,shadow:"#000000",shadowBlur:10,visible:true,padX:28,padY:16};
  state.layers.push(l);state.selected=l.id;controls.newText.value="";renderLayers();syncEditor();activateTab("text");
}
function selectedLayer(){return state.layers.find(l=>l.id===state.selected)}
function updateLayer(){const l=selectedLayer();if(!l)return;l.text=controls.textContent.value;l.font=controls.fontFamily.value;l.size=+controls.fontSize.value;l.color=controls.textColor.value;l.bg=controls.bgColor.value;l.bgOpacity=+controls.bgOpacity.value/100;l.shadow=controls.shadowColor.value;l.shadowBlur=+controls.shadowBlur.value;renderLayers()}
function syncEditor(){
  const l=selectedLayer();if(!l){controls.textEditor.classList.add("hidden");return}
  controls.textEditor.classList.remove("hidden");controls.textContent.value=l.text;controls.fontFamily.value=l.font;controls.fontSize.value=l.size;controls.fontSizeOut.textContent=l.size;controls.textColor.value=l.color;controls.bgColor.value=l.bg;controls.shadowColor.value=l.shadow;controls.bgOpacity.value=Math.round(l.bgOpacity*100);controls.bgOpacityOut.textContent=`${Math.round(l.bgOpacity*100)}%`;controls.shadowBlur.value=l.shadowBlur;controls.shadowBlurOut.textContent=l.shadowBlur;
}
function renderLayers(){
  controls.layers.innerHTML="";state.layers.forEach(l=>{const row=document.createElement("div");row.className=`layer${l.id===state.selected?" active":""}`;row.innerHTML=`<b>T</b><span>${escapeHTML(l.text||"نص فارغ")}</span><button class="eye">${l.visible?"◉":"○"}</button>`;row.addEventListener("click",()=>{state.selected=l.id;renderLayers();syncEditor()});row.querySelector(".eye").addEventListener("click",e=>{e.stopPropagation();l.visible=!l.visible;renderLayers()});controls.layers.appendChild(row)})
}
function deleteLayer(){if(!state.selected)return;state.layers=state.layers.filter(l=>l.id!==state.selected);state.selected=state.layers.at(-1)?.id||null;renderLayers();syncEditor()}
function duplicateLayer(){const l=selectedLayer();if(!l)return;const copy={...l,id:`t-${Date.now()}-${Math.random().toString(16).slice(2)}`,x:l.x+40,y:l.y+40};state.layers.push(copy);state.selected=copy.id;renderLayers();syncEditor()}

function bindAudio(){
  controls.audioUpload.addEventListener("change",()=>{const f=controls.audioUpload.files?.[0];if(!f)return;if(!f.type.startsWith("audio/"))return toast("اختر ملفًا صوتيًا صالحًا.","error");revokeAudioUrl();state.audioUrl=URL.createObjectURL(f);sourceAudio.src=state.audioUrl;sourceAudio.load();controls.audioName.textContent=f.name;controls.audioCard.classList.remove("hidden");sourceAudio.onloadedmetadata=()=>{controls.audioDuration.textContent=fmt(sourceAudio.duration);setupAudioGraph();toast("تمت إضافة الصوت.","ok")}});
  controls.removeAudioBtn.addEventListener("click",removeAudio);
  controls.musicVolume.addEventListener("input",()=>{controls.musicVolumeOut.textContent=`${controls.musicVolume.value}%`;updateAudioGains()});
  controls.videoVolume.addEventListener("input",()=>{controls.videoVolumeOut.textContent=`${controls.videoVolume.value}%`;updateAudioGains()});
}
function removeAudio(){sourceAudio.pause();sourceAudio.removeAttribute("src");sourceAudio.load();revokeAudioUrl();controls.audioUpload.value="";controls.audioCard.classList.add("hidden");toast("تمت إزالة الصوت.","ok")}
async function setupAudioGraph(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    if(!state.audioCtx){state.audioCtx=new AC();state.recordDest=state.audioCtx.createMediaStreamDestination();state.videoGain=state.audioCtx.createGain();state.musicGain=state.audioCtx.createGain();state.monitorVideo=state.audioCtx.createGain();state.monitorMusic=state.audioCtx.createGain()}
    if(state.audioCtx.state==="suspended")await state.audioCtx.resume().catch(()=>{});
    if(!state.videoSource){state.videoSource=state.audioCtx.createMediaElementSource(sourceVideo);state.videoSource.connect(state.videoGain);state.videoGain.connect(state.recordDest);state.videoGain.connect(state.monitorVideo);state.monitorVideo.connect(state.audioCtx.destination)}
    if(!state.musicSource){state.musicSource=state.audioCtx.createMediaElementSource(sourceAudio);state.musicSource.connect(state.musicGain);state.musicGain.connect(state.recordDest);state.musicGain.connect(state.monitorMusic);state.monitorMusic.connect(state.audioCtx.destination)}
    updateAudioGains();
  }catch(err){console.warn("Audio graph:",err)}
}
function updateAudioGains(){
  const vv=+controls.videoVolume.value/100,mv=+controls.musicVolume.value/100,mon=state.muted?0:1;
  if(state.videoGain)state.videoGain.gain.value=vv;if(state.musicGain)state.musicGain.gain.value=mv;if(state.monitorVideo)state.monitorVideo.gain.value=mon;if(state.monitorMusic)state.monitorMusic.gain.value=mon;
}

function bindTransport(){
  controls.playBtn.addEventListener("click",togglePlay);controls.muteBtn.addEventListener("click",()=>{state.muted=!state.muted;controls.muteBtn.textContent=state.muted?"🔇":"🔊";updateAudioGains()});
  controls.timeline.addEventListener("input",()=>{if(!state.videoLoaded)return;const t=(+controls.timeline.value/1000)*sourceVideo.duration;sourceVideo.currentTime=t;if(sourceAudio.src&&Number.isFinite(sourceAudio.duration))sourceAudio.currentTime=Math.min(t,Math.max(0,sourceAudio.duration-.05))});
  sourceVideo.addEventListener("ended",()=>{controls.playBtn.textContent="▶";if(!state.exporting)sourceAudio.pause()});
  controls.resetBtn.addEventListener("click",resetProject);
}
async function togglePlay(){
  if(!state.videoLoaded)return toast("اختر فيديو أولاً.","error");await setupAudioGraph();
  if(sourceVideo.paused){try{await sourceVideo.play();if(sourceAudio.src){sourceAudio.currentTime=Math.min(sourceVideo.currentTime,Math.max(0,(sourceAudio.duration||0)-.05));await sourceAudio.play().catch(()=>{})}controls.playBtn.textContent="❚❚"}catch(e){toast("تعذر بدء التشغيل.","error")}}
  else{sourceVideo.pause();sourceAudio.pause();controls.playBtn.textContent="▶"}
}
function resetProject(){
  sourceVideo.pause();sourceAudio.pause();sourceVideo.removeAttribute("src");sourceAudio.removeAttribute("src");sourceVideo.load();sourceAudio.load();revokeVideoUrl();revokeAudioUrl();state.videoLoaded=false;state.layers=[];state.selected=null;controls.videoUpload.value="";controls.audioUpload.value="";controls.emptyState.classList.remove("hidden");controls.videoStatus.textContent="لم يتم اختيار فيديو";controls.duration.textContent="00:00";controls.currentTime.textContent="00:00";controls.timeline.value=0;controls.audioCard.classList.add("hidden");renderLayers();syncEditor();toast("تم إنشاء مشروع جديد.","ok")
}

function bindStage(){
  stage.addEventListener("pointerdown",pointerDown);stage.addEventListener("pointermove",pointerMove);stage.addEventListener("pointerup",pointerUp);stage.addEventListener("pointercancel",pointerUp);stage.addEventListener("lostpointercapture",pointerUp);
}
function stagePoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}}
function pointerDown(e){const p=stagePoint(e),hit=findLayerAt(p.x,p.y);if(!hit)return;state.selected=hit.id;state.dragging=hit.id;state.dragDX=p.x-hit.x;state.dragDY=p.y-hit.y;renderLayers();syncEditor();try{stage.setPointerCapture(e.pointerId)}catch{}e.preventDefault()}
function pointerMove(e){if(!state.dragging)return;const l=state.layers.find(x=>x.id===state.dragging);if(!l)return;const p=stagePoint(e);l.x=clamp(p.x-state.dragDX,0,canvas.width);l.y=clamp(p.y-state.dragDY,0,canvas.height);e.preventDefault()}
function pointerUp(e){if(!state.dragging)return;state.dragging=null;try{stage.releasePointerCapture(e.pointerId)}catch{}e.preventDefault()}
function findLayerAt(x,y){for(let i=state.layers.length-1;i>=0;i--){const l=state.layers[i];if(!l.visible)continue;const b=measureLayer(l);if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)return l}return null}

function renderLoop(){renderCanvas();if(state.videoLoaded&&Number.isFinite(sourceVideo.duration)&&sourceVideo.duration>0){controls.timeline.value=Math.round((sourceVideo.currentTime/sourceVideo.duration)*1000)||0;controls.currentTime.textContent=fmt(sourceVideo.currentTime)}requestAnimationFrame(renderLoop)}
function renderCanvas(){
  ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width,canvas.height);
  if(state.videoLoaded&&sourceVideo.readyState>=2)drawVideo();
  state.layers.filter(l=>l.visible).forEach(drawTextLayer);ctx.restore();
}
function drawVideo(){
  const vw=sourceVideo.videoWidth||1,vh=sourceVideo.videoHeight||1,cw=canvas.width,ch=canvas.height,fit=controls.fit.value;
  const s=fit==="contain"?Math.min(cw/vw,ch/vh):Math.max(cw/vw,ch/vh),dw=vw*s,dh=vh*s,dx=(cw-dw)/2,dy=(ch-dh)/2;ctx.drawImage(sourceVideo,dx,dy,dw,dh);
}
function textLines(l){return String(l.text||"").split(/\n/)}
function measureLayer(l){
  ctx.save();ctx.font=`700 ${l.size}px "${l.font}"`;const lines=textLines(l),lineH=l.size*1.25,w=Math.max(1,...lines.map(t=>ctx.measureText(t||" ").width))+l.padX*2,h=lines.length*lineH+l.padY*2;ctx.restore();return{left:l.x-w/2,right:l.x+w/2,top:l.y-h/2,bottom:l.y+h/2,w,h,lineH}
}
function drawTextLayer(l){
  const b=measureLayer(l);ctx.save();ctx.fillStyle=hexAlpha(l.bg,l.bgOpacity);roundRect(ctx,b.left,b.top,b.w,b.h,Math.max(8,l.size*.16));ctx.fill();ctx.font=`700 ${l.size}px "${l.font}"`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=l.color;ctx.shadowColor=l.shadow;ctx.shadowBlur=l.shadowBlur;ctx.shadowOffsetY=Math.max(1,l.shadowBlur*.25);const lines=textLines(l),start=l.y-((lines.length-1)*b.lineH)/2;lines.forEach((t,i)=>ctx.fillText(t||" ",l.x,start+i*b.lineH));ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  if(l.id===state.selected&&!state.exporting){ctx.strokeStyle="rgba(145,119,255,.95)";ctx.lineWidth=Math.max(2,canvas.width/420);ctx.setLineDash([12,8]);ctx.strokeRect(b.left-6,b.top-6,b.w+12,b.h+12)}ctx.restore();
}
function roundRect(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

function bindExport(){controls.exportBtn.addEventListener("click",exportReel);controls.cancelExportBtn.addEventListener("click",()=>state.cancelExport=true)}
async function exportReel(){
  if(!state.videoLoaded)return toast("اختر فيديو قبل التصدير.","error");if(state.exporting)return;
  if(!window.MediaRecorder||!canvas.captureStream)return toast("متصفحك لا يدعم MediaRecorder للتصدير. جرّب Chrome أو Edge حديثًا.","error");
  state.exporting=true;state.cancelExport=false;controls.exportModal.classList.remove("hidden");setProgress(0);
  const oldW=canvas.width,oldH=canvas.height;const q=+controls.quality.value;canvas.width=q;canvas.height=Math.round(q*16/9);scaleLayerPositions(oldW,oldH,canvas.width,canvas.height);
  let recorder,stream,chunks=[];
  try{
    await document.fonts.ready;await setupAudioGraph();sourceVideo.pause();sourceAudio.pause();await seek(sourceVideo,0);if(sourceAudio.src)await seek(sourceAudio,0).catch(()=>{});
    stream=canvas.captureStream(+controls.fps.value);
    if(state.recordDest){state.recordDest.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}
    const mime=pickMime();recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:q===1080?12000000:6500000}:undefined);
    recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||e)});
    recorder.start(250);await sourceVideo.play();if(sourceAudio.src){sourceAudio.currentTime=0;await sourceAudio.play().catch(()=>{})}
    await monitorExport();sourceVideo.pause();sourceAudio.pause();if(recorder.state!=="inactive")recorder.stop();await stopped;
    if(state.cancelExport){toast("تم إلغاء التصدير.");return}
    const type=recorder.mimeType||"video/webm",blob=new Blob(chunks,{type});downloadBlob(blob,`reels-maker-${Date.now()}.webm`);setProgress(100);toast("تم تصدير الريل وتحميله.","ok");
  }catch(err){console.error(err);toast("حدث خطأ أثناء التصدير. جرّب Chrome/Edge أو فيديو محليًا.","error")}
  finally{sourceVideo.pause();sourceAudio.pause();if(stream)stream.getTracks().forEach(t=>t.stop());canvas.width=oldW;canvas.height=oldH;scaleLayerPositions(q,Math.round(q*16/9),oldW,oldH);state.exporting=false;setTimeout(()=>controls.exportModal.classList.add("hidden"),300)}
}
async function monitorExport(){return new Promise(resolve=>{const tick=()=>{if(state.cancelExport||sourceVideo.ended||sourceVideo.currentTime>=sourceVideo.duration-.06){resolve();return}setProgress((sourceVideo.currentTime/sourceVideo.duration)*100);setTimeout(tick,120)};tick()})}
function pickMime(){return["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(t=>MediaRecorder.isTypeSupported(t))||""}
function seek(media,time){return new Promise((resolve,reject)=>{if(!Number.isFinite(media.duration)||Math.abs(media.currentTime-time)<.03){media.currentTime=time;resolve();return}const done=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error("seek failed"))},cleanup=()=>{media.removeEventListener("seeked",done);media.removeEventListener("error",bad)};media.addEventListener("seeked",done,{once:true});media.addEventListener("error",bad,{once:true});media.currentTime=Math.min(Math.max(0,time),Math.max(0,media.duration-.01))})}
function scaleLayerPositions(fromW,fromH,toW,toH){const sx=toW/fromW,sy=toH/fromH;state.layers.forEach(l=>{l.x*=sx;l.y*=sy;l.size*=sx;l.padX*=sx;l.padY*=sy;l.shadowBlur*=sx})}
function setProgress(v){v=clamp(v,0,100);controls.progressBar.style.width=`${v}%`;controls.progressText.textContent=`${Math.round(v)}%`}
function downloadBlob(blob,name){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}

function fmt(sec){sec=Number.isFinite(sec)?Math.max(0,sec):0;const m=Math.floor(sec/60),s=Math.floor(sec%60);return`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function escapeHTML(s){return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function hexAlpha(hex,a){const h=hex.replace("#","");const n=parseInt(h.length===3?h.split("").map(x=>x+x).join(""):h,16);return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${clamp(a,0,1)})`}
function toast(msg,type=""){const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=msg;controls.toasts.appendChild(el);setTimeout(()=>el.remove(),3200)}