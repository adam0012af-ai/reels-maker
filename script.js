"use strict";

const PEXELS_API_KEY = "YOUR_API_KEY";
const PEXELS_ENDPOINT = "https://api.pexels.com/videos/search";

const $ = (id) => document.getElementById(id);
const canvas = $("reelCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const canvasStage = $("canvasStage");
const emptyState = $("emptyState");
const sourceVideo = $("sourceVideo");
const sourceAudio = $("sourceAudio");
const pexelsSearchInput = $("pexelsSearchInput");
const pexelsSearchBtn = $("pexelsSearchBtn");
const pexelsResults = $("pexelsResults");
const localVideoInput = $("localVideoInput");
const videoStatus = $("videoStatus");
const addTextBtn = $("addTextBtn");
const textLayersList = $("textLayersList");
const textEditor = $("textEditor");
const textContentInput = $("textContent");
const fontFamilyInput = $("fontFamily");
const fontSizeInput = $("fontSize");
const fontSizeValue = $("fontSizeValue");
const textColorInput = $("textColor");
const backgroundColorInput = $("backgroundColor");
const shadowColorInput = $("shadowColor");
const shadowBlurInput = $("shadowBlur");
const shadowBlurValue = $("shadowBlurValue");
const backgroundOpacityInput = $("backgroundOpacity");
const backgroundOpacityValue = $("backgroundOpacityValue");
const textAlignInput = $("textAlign");
const duplicateTextBtn = $("duplicateTextBtn");
const deleteTextBtn = $("deleteTextBtn");
const audioInput = $("audioInput");
const audioInfo = $("audioInfo");
const audioFileName = $("audioFileName");
const audioDuration = $("audioDuration");
const removeAudioBtn = $("removeAudioBtn");
const audioVolume = $("audioVolume");
const audioVolumeValue = $("audioVolumeValue");
const videoVolume = $("videoVolume");
const videoVolumeValue = $("videoVolumeValue");
const exportQuality = $("exportQuality");
const exportFps = $("exportFps");
const videoFit = $("videoFit");
const playPauseBtn = $("playPauseBtn");
const timeline = $("timeline");
const currentTimeLabel = $("currentTime");
const durationTimeLabel = $("durationTime");
const muteBtn = $("muteBtn");
const exportBtn = $("exportBtn");
const resetBtn = $("resetBtn");
const exportModal = $("exportModal");
const exportProgress = $("exportProgress");
const exportProgressText = $("exportProgressText");
const cancelExportBtn = $("cancelExportBtn");
const toastContainer = $("toastContainer");

const state = {
  videoLoaded: false,
  videoObjectUrl: null,
  audioObjectUrl: null,
  textLayers: [],
  selectedTextId: null,
  draggingTextId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  isExporting: false,
  cancelExport: false,
  muted: false,
  audioContext: null,
  videoAudioSourceNode: null,
  musicAudioSourceNode: null,
  videoGainNode: null,
  musicGainNode: null,
  previewDestinationNode: null
};

document.addEventListener("DOMContentLoaded", () => {
  setupTabs(); setupSearch(); setupMediaControls(); setupTextControls();
  setupAudioControls(); setupCanvasInteractions(); setupExportControls();
  resizeCanvas(1080); renderLoop();
});

function setupTabs() {
  const panels = {media: $("mediaPanel"), text: $("textPanel"), audio: $("audioPanel"), settings: $("settingsPanel")};
  document.querySelectorAll(".tab-btn").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    Object.values(panels).forEach(p => p.classList.remove("active"));
    button.classList.add("active"); panels[button.dataset.tab].classList.add("active");
  }));
}

function setupSearch() {
  pexelsSearchBtn.addEventListener("click", () => searchPexelsVideos(pexelsSearchInput.value.trim()));
  pexelsSearchInput.addEventListener("keydown", e => { if (e.key === "Enter") searchPexelsVideos(pexelsSearchInput.value.trim()); });
  document.querySelectorAll(".quick-search button").forEach(button => button.addEventListener("click", () => {
    pexelsSearchInput.value = button.dataset.query; searchPexelsVideos(button.dataset.query);
  }));
}

async function searchPexelsVideos(query) {
  if (!query) return showToast("اكتب كلمة للبحث أولاً.", "error");
  if (!PEXELS_API_KEY || PEXELS_API_KEY === "YOUR_API_KEY") return showToast("ضع مفتاح Pexels API داخل script.js أولاً.", "error");
  pexelsResults.innerHTML = '<div class="video-loading">جاري البحث عن الفيديوهات...</div>';
  try {
    const url = `${PEXELS_ENDPOINT}?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=16`;
    const response = await fetch(url, {headers: {Authorization: PEXELS_API_KEY}});
    if (!response.ok) throw new Error(`Pexels error: ${response.status}`);
    const data = await response.json(); displayPexelsResults(data.videos || []);
  } catch (error) {
    console.error(error); pexelsResults.innerHTML = '<div class="no-results">تعذر تحميل الفيديوهات. تحقق من مفتاح Pexels أو اتصال الإنترنت.</div>';
    showToast("حدث خطأ أثناء الاتصال بـ Pexels.", "error");
  }
}

function displayPexelsResults(videos) {
  pexelsResults.innerHTML = "";
  if (!videos.length) { pexelsResults.innerHTML = '<div class="no-results">لم يتم العثور على نتائج.</div>'; return; }
  videos.forEach(video => {
    const file = chooseBestPexelsFile(video.video_files); if (!file) return;
    const card = document.createElement("div"); card.className = "video-card";
    card.innerHTML = `<img src="${escapeHtml(video.image)}" alt="Pexels Video" loading="lazy"><div class="video-card-play">▶</div><div class="video-card-overlay"><span>${formatTime(video.duration || 0)}</span></div>`;
    card.addEventListener("click", () => loadRemoteVideo(file.link, video.id)); pexelsResults.appendChild(card);
  });
}

function chooseBestPexelsFile(files = []) {
  const candidates = files.filter(f => f.link && f.width && f.height && f.height >= f.width).sort((a,b) => Math.abs(a.width*a.height-2073600)-Math.abs(b.width*b.height-2073600));
  return candidates[0] || files[0] || null;
}

async function loadRemoteVideo(url, id) {
  videoStatus.textContent = "جاري تجهيز فيديو Pexels...";
  try {
    const response = await fetch(url); if (!response.ok) throw new Error(response.status);
    loadVideoBlob(await response.blob(), `Pexels Video #${id}`);
  } catch (error) {
    sourceVideo.src = url; sourceVideo.crossOrigin = "anonymous"; sourceVideo.load();
    sourceVideo.onloadedmetadata = () => finishVideoLoading(`Pexels Video #${id}`);
    sourceVideo.onerror = () => showToast("تعذر تجهيز الفيديو بسبب قيود CORS. جرّب فيديوًا آخر أو ارفعه من جهازك.", "error");
  }
}

function loadVideoBlob(blob, name) {
  cleanupVideoObjectUrl(); state.videoObjectUrl = URL.createObjectURL(blob); sourceVideo.src = state.videoObjectUrl; sourceVideo.load();
  sourceVideo.onloadedmetadata = () => finishVideoLoading(name); sourceVideo.onerror = () => showToast("المتصفح لم يتمكن من قراءة ملف الفيديو.", "error");
}

function finishVideoLoading(name) {
  state.videoLoaded = true; sourceVideo.currentTime = 0; emptyState.classList.add("hidden");
  videoStatus.textContent = `${name} — ${formatTime(sourceVideo.duration)}`; durationTimeLabel.textContent = formatTime(sourceVideo.duration); timeline.value = 0;
  setupAudioGraph(); showToast("تم تحميل الفيديو بنجاح.", "success");
}

function cleanupVideoObjectUrl(){if(state.videoObjectUrl){URL.revokeObjectURL(state.videoObjectUrl);state.videoObjectUrl=null}}
function cleanupAudioObjectUrl(){if(state.audioObjectUrl){URL.revokeObjectURL(state.audioObjectUrl);state.audioObjectUrl=null}}

function setupMediaControls() {
  localVideoInput.addEventListener("change", () => { const file = localVideoInput.files?.[0]; if (!file) return; if (!file.type.startsWith("video/")) return showToast("اختر ملف فيديو صالح.","error"); loadVideoBlob(file,file.name); });
  playPauseBtn.addEventListener("click", togglePlayback);
  timeline.addEventListener("input", () => { if(!state.videoLoaded)return; const t=(+timeline.value/1000)*sourceVideo.duration; sourceVideo.currentTime=t; if(sourceAudio.src)sourceAudio.currentTime=Math.min(t,sourceAudio.duration||t); });
  muteBtn.addEventListener("click",()=>{state.muted=!state.muted;updateAudioGains();muteBtn.textContent=state.muted?"🔇":"🔊"});
  sourceVideo.addEventListener("ended",()=>{playPauseBtn.textContent="▶";if(!state.isExporting)sourceAudio.pause()});
}

async function togglePlayback(){
  if(!state.videoLoaded)return showToast("اختر فيديو أولاً.","error"); await setupAudioGraph();
  if(sourceVideo.paused){try{await sourceVideo.play();if(sourceAudio.src&&sourceAudio.readyState>=2){sourceAudio.currentTime=Math.min(sourceVideo.currentTime,Math.max(0,(sourceAudio.duration||0)-.01));await sourceAudio.play().catch(()=>{})}playPauseBtn.textContent="❚❚"}catch(e){showToast("المتصفح منع التشغيل التلقائي.","error")}}
  else{sourceVideo.pause();sourceAudio.pause();playPauseBtn.textContent="▶"}
}

function setupAudioControls(){
  audioInput.addEventListener("change",()=>{const file=audioInput.files?.[0];if(!file)return;if(!file.type.startsWith("audio/"))return showToast("اختر ملف صوت صالح.","error");cleanupAudioObjectUrl();state.audioObjectUrl=URL.createObjectURL(file);sourceAudio.src=state.audioObjectUrl;sourceAudio.load();audioFileName.textContent=file.name;audioInfo.classList.remove("hidden");sourceAudio.onloadedmetadata=()=>{audioDuration.textContent=formatTime(sourceAudio.duration);setupAudioGraph();showToast("تم إضافة الملف الصوتي.","success")}});
  removeAudioBtn.addEventListener("click",removeAudio); audioVolume.addEventListener("input",()=>{audioVolumeValue.textContent=`${audioVolume.value}%`;updateAudioGains()}); videoVolume.addEventListener("input",()=>{videoVolumeValue.textContent=`${videoVolume.value}%`;updateAudioGains()});
}
function removeAudio(){sourceAudio.pause();sourceAudio.removeAttribute("src");sourceAudio.load();cleanupAudioObjectUrl();audioInput.value="";audioInfo.classList.add("hidden");showToast("تمت إزالة الصوت.","success")}

async function setupAudioGraph(){
  try{
    if(!state.audioContext){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;state.audioContext=new AC();state.previewDestinationNode=state.audioContext.createMediaStreamDestination();state.videoGainNode=state.audioContext.createGain();state.musicGainNode=state.audioContext.createGain()}
    if(state.audioContext.state==="suspended")await state.audioContext.resume().catch(()=>{});
    if(!state.videoAudioSourceNode){state.videoAudioSourceNode=state.audioContext.createMediaElementSource(sourceVideo);state.videoAudioSourceNode.connect(state.videoGainNode);state.videoGainNode.connect(state.audioContext.destination);state.videoGainNode.connect(state.previewDestinationNode)}
    if(!state.musicAudioSourceNode){state.musicAudioSourceNode=state.audioContext.createMediaElementSource(sourceAudio);state.musicAudioSourceNode.connect(state.musicGainNode);state.musicGainNode.connect(state.audioContext.destination);state.musicGainNode.connect(state.previewDestinationNode)}
    updateAudioGains();
  }catch(e){console.warn(e)}
}
function updateAudioGains(){const v=state.muted?0:+videoVolume.value/100,m=state.muted?0:+audioVolume.value/100;if(state.videoGainNode)state.videoGainNode.gain.value=v;if(state.musicGainNode)state.musicGainNode.gain.value=m;if(!state.videoAudioSourceNode)sourceVideo.volume=v;if(!state.musicAudioSourceNode)sourceAudio.volume=m}

function setupTextControls(){
  addTextBtn.addEventListener("click",addTextLayer); [textContentInput,textColorInput,backgroundColorInput,shadowColorInput].forEach(el=>el.addEventListener("input",updateSelectedTextFromEditor)); fontFamilyInput.addEventListener("change",updateSelectedTextFromEditor); textAlignInput.addEventListener("change",updateSelectedTextFromEditor);
  fontSizeInput.addEventListener("input",()=>{fontSizeValue.textContent=fontSizeInput.value;updateSelectedTextFromEditor()}); shadowBlurInput.addEventListener("input",()=>{shadowBlurValue.textContent=shadowBlurInput.value;updateSelectedTextFromEditor()}); backgroundOpacityInput.addEventListener("input",()=>{backgroundOpacityValue.textContent=`${backgroundOpacityInput.value}%`;updateSelectedTextFromEditor()}); deleteTextBtn.addEventListener("click",deleteSelectedText); duplicateTextBtn.addEventListener("click",duplicateSelectedText);
}
function addTextLayer(){const layer={id:`text-${Date.now()}-${Math.random().toString(16).slice(2)}`,text:"اكتب النص هنا",x:canvas.width/2,y:canvas.height/2,fontFamily:"Cairo",fontSize:64,color:"#ffffff",backgroundColor:"#000000",backgroundOpacity:.35,shadowColor:"#000000",shadowBlur:8,align:"center",visible:true,paddingX:25,paddingY:15};state.textLayers.push(layer);state.selectedTextId=layer.id;renderTextLayersList();syncEditorFromSelectedText()}
function getSelectedTextLayer(){return state.textLayers.find(l=>l.id===state.selectedTextId)}
function updateSelectedTextFromEditor(){const l=getSelectedTextLayer();if(!l)return;l.text=textContentInput.value;l.fontFamily=fontFamilyInput.value;l.fontSize=+fontSizeInput.value;l.color=textColorInput.value;l.backgroundColor=backgroundColorInput.value;l.backgroundOpacity=+backgroundOpacityInput.value/100;l.shadowColor=shadowColorInput.value;l.shadowBlur=+shadowBlurInput.value;l.align=textAlignInput.value;renderTextLayersList()}
function syncEditorFromSelectedText(){const l=getSelectedTextLayer();if(!l){textEditor.classList.add("hidden");return}textEditor.classList.remove("hidden");textContentInput.value=l.text;fontFamilyInput.value=l.fontFamily;fontSizeInput.value=l.fontSize;fontSizeValue.textContent=l.fontSize;textColorInput.value=l.color;backgroundColorInput.value=l.backgroundColor;shadowColorInput.value=l.shadowColor;shadowBlurInput.value=l.shadowBlur;shadowBlurValue.textContent=l.shadowBlur;backgroundOpacityInput.value=Math.round(l.backgroundOpacity*100);backgroundOpacityValue.textContent=`${Math.round(l.backgroundOpacity*100)}%`;textAlignInput.value=l.align}
function renderTextLayersList(){textLayersList.innerHTML="";state.textLayers.forEach(l=>{const item=document.createElement("div");item.className="layer-item"+(l.id===state.selectedTextId?" active":"");item.innerHTML=`<span class="layer-icon">T</span><span class="layer-item-text">${escapeHtml(l.text.trim()||"نص بدون محتوى")}</span><span class="layer-visible">${l.visible?"◉":"○"}</span>`;item.addEventListener("click",()=>{state.selectedTextId=l.id;renderTextLayersList();syncEditorFromSelectedText()});item.querySelector(".layer-visible").addEventListener("click",e=>{e.stopPropagation();l.visible=!l.visible;renderTextLayersList()});textLayersList.appendChild(item)})}
function deleteSelectedText(){if(!state.selectedTextId)return;state.textLayers=state.textLayers.filter(l=>l.id!==state.selectedTextId);state.selectedTextId=state.textLayers.at(-1)?.id||null;renderTextLayersList();syncEditorFromSelectedText()}
function duplicateSelectedText(){const s=getSelectedTextLayer();if(!s)return;const c={...s,id:`text-${Date.now()}-${Math.random().toString(16).slice(2)}`,x:Math.min(canvas.width,s.x+50),y:Math.min(canvas.height,s.y+50)};state.textLayers.push(c);state.selectedTextId=c.id;renderTextLayersList();syncEditorFromSelectedText()}

function setupCanvasInteractions(){canvasStage.addEventListener("pointerdown",handlePointerDown);window.addEventListener("pointermove",handlePointerMove);window.addEventListener("pointerup",()=>state.draggingTextId=null)}
function getCanvasPointerPosition(e){const r=canvasStage.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}}
function handlePointerDown(e){if(state.isExporting)return;const p=getCanvasPointerPosition(e),l=findTextAtPoint(p.x,p.y);if(!l){state.selectedTextId=null;renderTextLayersList();syncEditorFromSelectedText();return}state.selectedTextId=l.id;state.draggingTextId=l.id;state.dragOffsetX=p.x-l.x;state.dragOffsetY=p.y-l.y;renderTextLayersList();syncEditorFromSelectedText()}
function handlePointerMove(e){if(!state.draggingTextId)return;const l=state.textLayers.find(x=>x.id===state.draggingTextId);if(!l)return;const p=getCanvasPointerPosition(e);l.x=clamp(p.x-state.dragOffsetX,0,canvas.width);l.y=clamp(p.y-state.dragOffsetY,0,canvas.height)}
function findTextAtPoint(x,y){for(let i=state.textLayers.length-1;i>=0;i--){const l=state.textLayers[i];if(!l.visible)continue;const b=getTextLayerBounds(l);if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)return l}return null}

function renderLoop(){drawProjectFrame();updatePlaybackUI();requestAnimationFrame(renderLoop)}
function drawProjectFrame(){ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width,canvas.height);if(state.videoLoaded&&sourceVideo.readyState>=2)drawVideoFrame();state.textLayers.forEach(l=>{if(l.visible)drawTextLayer(l)});ctx.restore()}
function drawVideoFrame(){const vw=sourceVideo.videoWidth,vh=sourceVideo.videoHeight;if(!vw||!vh)return;const cr=canvas.width/canvas.height,vr=vw/vh;let w,h,x,y;if(videoFit.value==="contain"?(vr>cr):(vr<=cr)){w=canvas.width;h=canvas.width/vr;x=0;y=(canvas.height-h)/2}else{h=canvas.height;w=canvas.height*vr;y=0;x=(canvas.width-w)/2}try{ctx.drawImage(sourceVideo,x,y,w,h)}catch(e){}}
function drawTextLayer(l){const lines=String(l.text||"").split("\n"),scale=canvas.width/1080,fs=l.fontSize*scale,px=l.paddingX*scale,py=l.paddingY*scale,lh=fs*1.25;ctx.save();ctx.font=`700 ${fs}px "${l.fontFamily}", sans-serif`;ctx.textBaseline="middle";ctx.textAlign=l.align;let max=0;lines.forEach(line=>max=Math.max(max,ctx.measureText(line||" ").width));const bw=max+px*2,bh=lines.length*lh+py*2,left=l.x-bw/2,top=l.y-bh/2;ctx.fillStyle=hexToRgba(l.backgroundColor,l.backgroundOpacity);roundRect(ctx,left,top,bw,bh,16*scale);ctx.fill();ctx.fillStyle=l.color;ctx.shadowColor=l.shadowColor;ctx.shadowBlur=l.shadowBlur*scale;let tx=l.x;if(l.align==="left")tx=left+px;if(l.align==="right")tx=left+bw-px;const fy=l.y-((lines.length-1)*lh)/2;lines.forEach((line,i)=>ctx.fillText(line,tx,fy+i*lh));ctx.shadowBlur=0;if(!state.isExporting&&l.id===state.selectedTextId){ctx.strokeStyle="rgba(155,130,255,.95)";ctx.lineWidth=2*scale;ctx.setLineDash([8*scale,7*scale]);ctx.strokeRect(left-5*scale,top-5*scale,bw+10*scale,bh+10*scale)}ctx.restore()}
function getTextLayerBounds(l){const lines=String(l.text||"").split("\n"),scale=canvas.width/1080,fs=l.fontSize*scale,px=l.paddingX*scale,py=l.paddingY*scale,lh=fs*1.25;ctx.save();ctx.font=`700 ${fs}px "${l.fontFamily}", sans-serif`;let max=0;lines.forEach(line=>max=Math.max(max,ctx.measureText(line||" ").width));ctx.restore();const w=max+px*2,h=lines.length*lh+py*2;return{left:l.x-w/2,right:l.x+w/2,top:l.y-h/2,bottom:l.y+h/2}}
function updatePlaybackUI(){if(!state.videoLoaded)return;const d=sourceVideo.duration||0,c=sourceVideo.currentTime||0;currentTimeLabel.textContent=formatTime(c);durationTimeLabel.textContent=formatTime(d);if(d>0&&!timeline.matches(":active"))timeline.value=Math.round(c/d*1000);playPauseBtn.textContent=!sourceVideo.paused&&!sourceVideo.ended?"❚❚":"▶"}

function setupExportControls(){exportBtn.addEventListener("click",exportReel);cancelExportBtn.addEventListener("click",()=>{if(state.isExporting)state.cancelExport=true});resetBtn.addEventListener("click",resetProject)}
async function exportReel(){
  if(!state.videoLoaded)return showToast("أضف فيديو قبل التصدير.","error"); if(typeof canvas.captureStream!=="function"||typeof MediaRecorder==="undefined")return showToast("استخدم Chrome أو Edge للتصدير.","error");
  state.isExporting=true;state.cancelExport=false;exportModal.classList.remove("hidden");setExportProgress(0);const oldTime=sourceVideo.currentTime,oldWidth=canvas.width;
  try{sourceVideo.pause();sourceAudio.pause();await setupAudioGraph();resizeCanvas(+exportQuality.value);await document.fonts?.ready;const stream=canvas.captureStream(+exportFps.value),output=new MediaStream();stream.getVideoTracks().forEach(t=>output.addTrack(t));state.previewDestinationNode?.stream.getAudioTracks().forEach(t=>output.addTrack(t));const mime=getSupportedMimeType(),opts={videoBitsPerSecond:canvas.width>=1080?12000000:7000000};if(mime)opts.mimeType=mime;const rec=new MediaRecorder(output,opts),chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const done=new Promise((res,rej)=>{rec.onstop=res;rec.onerror=e=>rej(e.error||new Error("record failed"))});sourceVideo.currentTime=0;if(sourceAudio.src)sourceAudio.currentTime=0;await waitForSeek(sourceVideo,0);rec.start(500);await sourceVideo.play();if(sourceAudio.src&&sourceAudio.readyState>=2)await sourceAudio.play().catch(()=>{});const duration=sourceVideo.duration;await new Promise(resolve=>{const tick=()=>{if(state.cancelExport||sourceVideo.ended||sourceVideo.currentTime>=duration-.03)return resolve();setExportProgress(duration?sourceVideo.currentTime/duration:0);requestAnimationFrame(tick)};tick()});sourceVideo.pause();sourceAudio.pause();if(rec.state!=="inactive")rec.stop();await done;output.getTracks().forEach(t=>t.stop());if(!state.cancelExport){const finalMime=rec.mimeType||mime||"video/webm",blob=new Blob(chunks,{type:finalMime});downloadExportedVideo(blob,finalMime);setExportProgress(1);showToast("تم تصدير الريل بنجاح.","success")}}
  catch(e){console.error(e);showToast("فشل التصدير. جرّب Chrome أو Edge.","error")}
  finally{sourceVideo.pause();sourceAudio.pause();resizeCanvas(oldWidth);try{sourceVideo.currentTime=Math.min(oldTime,sourceVideo.duration||0)}catch(e){}state.isExporting=false;state.cancelExport=false;exportModal.classList.add("hidden")}
}
function getSupportedMimeType(){return["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(t=>MediaRecorder.isTypeSupported(t))||""}
function downloadExportedVideo(blob,mime){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`reel-${new Date().toISOString().replace(/[:.]/g,"-")}.${mime.includes("webm")?"webm":"video"}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function setExportProgress(v){const p=Math.round(clamp(v,0,1)*100);exportProgress.style.width=`${p}%`;exportProgressText.textContent=`${p}%`}
function resetProject(){if(state.isExporting)return;sourceVideo.pause();sourceAudio.pause();sourceVideo.removeAttribute("src");sourceAudio.removeAttribute("src");sourceVideo.load();sourceAudio.load();cleanupVideoObjectUrl();cleanupAudioObjectUrl();state.videoLoaded=false;state.textLayers=[];state.selectedTextId=null;localVideoInput.value="";audioInput.value="";emptyState.classList.remove("hidden");audioInfo.classList.add("hidden");videoStatus.textContent="لم يتم اختيار فيديو بعد";timeline.value=0;currentTimeLabel.textContent="00:00";durationTimeLabel.textContent="00:00";playPauseBtn.textContent="▶";renderTextLayersList();syncEditorFromSelectedText()}
function resizeCanvas(width){canvas.width=+width||1080;canvas.height=Math.round(canvas.width*16/9)}
function formatTime(s){if(!Number.isFinite(s))return"00:00";s=Math.max(0,Math.floor(s));return`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function clamp(v,min,max){return Math.min(Math.max(v,min),max)}
function hexToRgba(hex,a){let c=String(hex).replace("#","").trim();if(c.length===3)c=c.split("").map(x=>x+x).join("");const n=parseInt(c,16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${clamp(a,0,1)})`}
function roundRect(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath()}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function showToast(message,type=""){const t=document.createElement("div");t.className=`toast ${type}`;t.textContent=message;toastContainer.appendChild(t);setTimeout(()=>t.remove(),3300)}
function waitForSeek(video,time){return new Promise(resolve=>{if(Math.abs(video.currentTime-time)<.02)return resolve();video.addEventListener("seeked",resolve,{once:true});video.currentTime=time})}
window.addEventListener("beforeunload",()=>{cleanupVideoObjectUrl();cleanupAudioObjectUrl();state.audioContext?.close().catch(()=>{})});