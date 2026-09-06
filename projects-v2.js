"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const PROFILES_KEY = "reelsMaker.localProfiles.v1";
  const ACTIVE_PROFILE_KEY = "reelsMaker.activeLocalProfile.v1";
  const ACTIVE_PROJECT_KEY = "reelsMaker.activeProject.v1";
  const PROJECT_PREFIX = "reelsMaker.projects.v1.";
  const DB_NAME = "reelsMaker.projectMedia.v2";
  const DB_STORE = "media";
  let filter = "all";
  let selectedId = null;
  let mediaUrl = null;
  let installed = false;

  const safeJson = (raw, fallback) => { try { return JSON.parse(raw); } catch { return fallback; } };
  const uid = (p="id") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const fmtDate = ts => { try { return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(ts)); } catch { return new Date(ts).toLocaleString(); } };
  const fmtDur = s => { s=Math.max(0,Number(s)||0); const m=Math.floor(s/60), x=Math.round(s%60); return `${m}:${String(x).padStart(2,"0")}`; };

  function profiles() {
    let list=safeJson(localStorage.getItem(PROFILES_KEY)||"[]",[]);
    if(!Array.isArray(list)||!list.length){list=[{id:uid("profile"),name:"ملف العمل على هذا الجهاز",createdAt:Date.now()}];localStorage.setItem(PROFILES_KEY,JSON.stringify(list));localStorage.setItem(ACTIVE_PROFILE_KEY,list[0].id);}
    return list;
  }
  function activeProfile(){const list=profiles();const id=localStorage.getItem(ACTIVE_PROFILE_KEY);const p=list.find(x=>x.id===id)||list[0];if(id!==p.id)localStorage.setItem(ACTIVE_PROFILE_KEY,p.id);return p;}
  function key(){return PROJECT_PREFIX+activeProfile().id;}
  function projects(){const v=safeJson(localStorage.getItem(key())||"[]",[]);return Array.isArray(v)?v:[];}
  function saveProjects(list){localStorage.setItem(key(),JSON.stringify(list.slice(0,100)));}
  function activeRef(){return safeJson(localStorage.getItem(ACTIVE_PROJECT_KEY)||"{}",{});}
  function setActive(id){localStorage.setItem(ACTIVE_PROJECT_KEY,JSON.stringify({profileId:activeProfile().id,projectId:id}));}

  function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DB_STORE))r.result.createObjectStore(DB_STORE,{keyPath:"id"});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function mediaPut(id,value){try{const d=await db();await new Promise((res,rej)=>{const tx=d.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put({id,...value,updatedAt:Date.now()});tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});d.close();}catch{}}
  async function mediaGet(id){try{const d=await db();const value=await new Promise((res,rej)=>{const r=d.transaction(DB_STORE,"readonly").objectStore(DB_STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error);});d.close();return value;}catch{return null;}}
  async function mediaDelete(id){try{const d=await db();await new Promise((res,rej)=>{const tx=d.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});d.close();}catch{}}

  function proState(){return safeJson(sessionStorage.getItem("reelsMaker.storyPro.v1")||"{}",{});}
  function currentStory(){
    const saved=safeJson(sessionStorage.getItem("reelsMaker.storyStudio.v2")||"{}",{});
    const story=(qid("ssStory")?.value ?? saved.story ?? "").trim();
    const topic=(qid("ssTopic")?.value ?? saved.topic ?? "").trim();
    if(!story&&!topic)return null;
    const pro=proState();
    return {type:"story",title:topic||story.slice(0,52)||"قصة جديدة",description:story.slice(0,150),data:{topic,story,length:qid("ssLength")?.value||saved.length||"medium",style:qid("ssStyle")?.value||saved.style||"cartoon3d",format:pro.format||"portrait",quality:pro.quality||"720",voice:pro.voice||"Kore"}};
  }

  function upsertStoryDraft() {
    const snap=currentStory(); if(!snap)return null;
    const profile=activeProfile(); const ref=activeRef(); let list=projects();
    let item=ref.profileId===profile.id?list.find(x=>x.id===ref.projectId&&x.type==="story"):null;
    if(!item){
      item={id:uid("project"),createdAt:Date.now(),updatedAt:Date.now(),status:"draft",...snap}; list.unshift(item); setActive(item.id);
    }else{
      item={...item,...snap,data:{...(item.data||{}),...snap.data},updatedAt:Date.now()}; list=[item,...list.filter(x=>x.id!==item.id)];
    }
    saveProjects(list); return item;
  }

  async function posterFromVideo(video){
    try{if(!video.videoWidth||!video.videoHeight)return null;const c=document.createElement("canvas");const max=420,scale=Math.min(1,max/video.videoWidth);c.width=Math.max(1,Math.round(video.videoWidth*scale));c.height=Math.max(1,Math.round(video.videoHeight*scale));c.getContext("2d").drawImage(video,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.72);}catch{return null;}
  }

  async function captureStoryPreview() {
    const video=qid("ssPreview"); if(!video?.src)return;
    const item=upsertStoryDraft(); if(!item)return;
    let blob=null; try{blob=await fetch(video.src).then(r=>r.blob());}catch{}
    if(!blob?.size)return;
    if(!Number.isFinite(video.duration)||video.duration<=0) await new Promise(r=>{const done=()=>r();video.addEventListener("loadedmetadata",done,{once:true});setTimeout(done,900);});
    let poster=await posterFromVideo(video);
    const pro=proState(); const sceneCount=document.querySelectorAll("#ssScenes .ss-scene").length;
    const duration=Number(video.duration)||0;
    await mediaPut(item.id,{blob,poster,mime:blob.type||"video/webm",kind:"video",duration});
    let list=projects(); const idx=list.findIndex(x=>x.id===item.id); if(idx>=0){list[idx]={...list[idx],status:"ready",updatedAt:Date.now(),media:{hasVideo:true,duration,size:blob.size,mime:blob.type,sceneCount,format:pro.format||"portrait",quality:pro.quality||"720",voice:pro.voice||"Kore"}};saveProjects(list);}
    render(); if(selectedId===item.id) selectProject(item.id);
  }

  function createOverlay(){
    if(qid("rmProjectsV2"))return;
    const root=document.createElement("div");root.id="rmProjectsV2";root.className="rmp2";
    root.innerHTML=`<section class="rmp2-shell"><header class="rmp2-head"><div class="rmp2-head-copy"><h2>مشاريعي</h2><p>كل مشروع له بياناته، الفيديو النهائي، الإعدادات وآخر حالة حفظ.</p></div><span class="rmp2-saving"><i></i> حفظ تلقائي</span><button id="rmp2New" class="rmp2-btn primary" type="button">＋ مشروع قصة جديد</button><button id="rmp2Close" class="rmp2-btn rmp2-close" type="button">×</button></header><div class="rmp2-body"><main class="rmp2-main"><div class="rmp2-toolbar"><label class="rmp2-field"><span>ملف العمل</span><select id="rmp2Profile"></select></label><button id="rmp2AddProfile" class="rmp2-btn" type="button">＋ ملف عمل</button><button id="rmp2Rename" class="rmp2-btn" type="button">تغيير الاسم</button></div><div id="rmp2Tabs" class="rmp2-tabs"></div><div id="rmp2Grid" class="rmp2-grid"></div></main><aside class="rmp2-side"><div id="rmp2DetailEmpty" class="rmp2-detail-empty"><div><b>تفاصيل المشروع</b><span>اختار مشروعًا لمعاينته والتحكم فيه.</span></div></div><div id="rmp2Detail" class="rmp2-detail"></div></aside></div></section>`;
    document.body.appendChild(root);
    qid("rmp2Close").onclick=close;
    root.addEventListener("pointerdown",e=>{if(e.target===root)close();});
    qid("rmp2New").onclick=()=>newStory();
    qid("rmp2AddProfile").onclick=()=>{const name=prompt("اسم ملف العمل الجديد:","ملف عمل جديد")?.trim();if(!name)return;const list=profiles(),p={id:uid("profile"),name,createdAt:Date.now()};list.push(p);localStorage.setItem(PROFILES_KEY,JSON.stringify(list));localStorage.setItem(ACTIVE_PROFILE_KEY,p.id);localStorage.removeItem(ACTIVE_PROJECT_KEY);render();};
    qid("rmp2Rename").onclick=()=>{const p=activeProfile(),name=prompt("اسم ملف العمل:",p.name)?.trim();if(!name)return;localStorage.setItem(PROFILES_KEY,JSON.stringify(profiles().map(x=>x.id===p.id?{...x,name}:x)));render();};
    qid("rmp2Profile").onchange=e=>{localStorage.setItem(ACTIVE_PROFILE_KEY,e.target.value);localStorage.removeItem(ACTIVE_PROJECT_KEY);selectedId=null;render();};
    const tabs=[["all","الكل"],["story","قصص وفيديو"],["quran","القرآن"],["image","صور AI"]];
    tabs.forEach(([v,t])=>{const b=document.createElement("button");b.className="rmp2-tab";b.dataset.filter=v;b.textContent=t;b.onclick=()=>{filter=v;render();};qid("rmp2Tabs").appendChild(b);});
  }

  function typeLabel(item){return item.type==="quran"?"استوديو القرآن":item.type==="image"?"صورة AI":"قصة مع فيديو";}
  function metaList(item){const d=item.data||{},m=item.media||{};const arr=[];if(item.type==="story"){arr.push(d.format||"portrait",d.quality?`${d.quality}p`:"",m.duration?fmtDur(m.duration):"");if(m.sceneCount)arr.push(`${m.sceneCount} مشهد`);}if(item.type==="quran")arr.push(d.quality?`${d.quality}p`:"",d.fps?`${d.fps} FPS`:"");if(item.type==="image")arr.push(d.aspect||"",d.style||"");return arr.filter(Boolean);}

  function render(){
    createOverlay(); const sel=qid("rmp2Profile"),grid=qid("rmp2Grid"); if(!sel||!grid)return;
    const ps=profiles(),ap=activeProfile();sel.innerHTML="";ps.forEach(p=>sel.add(new Option(p.name,p.id)));sel.value=ap.id;
    document.querySelectorAll("#rmp2Tabs .rmp2-tab").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
    const list=projects().filter(x=>filter==="all"||x.type===filter);grid.innerHTML="";
    if(!list.length){grid.innerHTML='<div class="rmp2-empty"><b>لا توجد مشاريع هنا حتى الآن</b><span>أول ما تكتب قصة أو تنشئ فيديو/صورة، المشروع هيتحفظ تلقائيًا.</span></div>';clearDetail();return;}
    list.forEach(item=>{
      const card=document.createElement("article");card.className="rmp2-card";card.dataset.id=item.id;
      card.innerHTML=`<div class="rmp2-thumb"><span class="rmp2-badge">${typeLabel(item)}</span>${item.media?.hasVideo?'<i class="rmp2-ready"></i>':''}</div><div class="rmp2-card-body"><h3></h3><p></p><div class="rmp2-meta"></div><div class="rmp2-time"></div></div>`;
      card.querySelector("h3").textContent=item.title||"مشروع";card.querySelector("p").textContent=item.description||"";card.querySelector(".rmp2-meta").innerHTML=metaList(item).map(x=>`<span>${String(x).replace(/[<>]/g,"")}</span>`).join("");card.querySelector(".rmp2-time").textContent=`آخر حفظ: ${fmtDate(item.updatedAt||item.createdAt)}`;
      card.onclick=()=>selectProject(item.id);grid.appendChild(card);
      mediaGet(item.id).then(media=>{if(media?.poster&&card.isConnected)card.querySelector(".rmp2-thumb").style.backgroundImage=`url("${media.poster}")`;else if(media?.kind==="image"&&media?.dataUri&&card.isConnected)card.querySelector(".rmp2-thumb").style.backgroundImage=`url("${media.dataUri}")`;});
    });
    if(selectedId&&!list.some(x=>x.id===selectedId))selectedId=null;
  }

  function clearDetail(){selectedId=null;qid("rmp2Detail")?.classList.remove("show");qid("rmp2DetailEmpty")?.style.setProperty("display","grid");if(mediaUrl){URL.revokeObjectURL(mediaUrl);mediaUrl=null;}}
  async function selectProject(id){
    selectedId=id;const item=projects().find(x=>x.id===id);if(!item)return clearDetail();const media=await mediaGet(id);const root=qid("rmp2Detail");qid("rmp2DetailEmpty").style.display="none";root.classList.add("show");if(mediaUrl){URL.revokeObjectURL(mediaUrl);mediaUrl=null;}
    let preview='<div class="rmp2-preview"><div style="min-height:180px;display:grid;place-items:center;color:#5f7288;font-size:8px">لا توجد معاينة محفوظة بعد</div></div>';
    if(media?.blob){mediaUrl=URL.createObjectURL(media.blob);preview=`<div class="rmp2-preview"><video controls preload="metadata" src="${mediaUrl}"></video></div>`;}else if(media?.dataUri)preview=`<div class="rmp2-preview"><img src="${media.dataUri}" alt=""></div>`;
    const infos=metaList(item);root.innerHTML=`${preview}<h3></h3><div class="rmp2-detail-desc"></div><div class="rmp2-info"><div><span>النوع</span><b>${typeLabel(item)}</b></div><div><span>الحالة</span><b>${item.status==="ready"?"جاهز":"مسودة محفوظة"}</b></div><div><span>آخر حفظ</span><b>${fmtDate(item.updatedAt||item.createdAt)}</b></div><div><span>الإعدادات</span><b>${infos.join(" • ")||"—"}</b></div></div>${item.data?.story?'<div class="rmp2-storytext"></div>':''}<div class="rmp2-actions"><button class="rmp2-btn primary" data-open type="button">فتح المشروع</button>${media?.blob?'<button class="rmp2-btn" data-montage type="button">فتح في المونتاج</button><button class="rmp2-btn wide" data-download type="button">⬇ تحميل الفيديو</button>':''}${media?.dataUri?'<button class="rmp2-btn wide" data-download-image type="button">⬇ تحميل الصورة</button>':''}<button class="rmp2-btn danger wide" data-delete type="button">حذف المشروع</button></div>`;
    root.querySelector("h3").textContent=item.title||"مشروع";root.querySelector(".rmp2-detail-desc").textContent=item.description||"";if(root.querySelector(".rmp2-storytext"))root.querySelector(".rmp2-storytext").textContent=item.data.story;
    root.querySelector("[data-open]").onclick=()=>restore(item);
    root.querySelector("[data-montage]")&&(root.querySelector("[data-montage]").onclick=()=>{if(typeof window.loadVideoBlob==="function"){window.loadVideoBlob(media.blob,`project-${id}.${(media.mime||"").includes("mp4")?"mp4":"webm"}`);close();qs('#rmPlusNav [data-rmplus-route="editor"]')?.click();}});
    root.querySelector("[data-download]")&&(root.querySelector("[data-download]").onclick=()=>downloadBlob(media.blob,`story-${Date.now()}.${(media.mime||"").includes("mp4")?"mp4":"webm"}`));
    root.querySelector("[data-download-image]")&&(root.querySelector("[data-download-image]").onclick=()=>downloadData(media.dataUri,`ai-image-${Date.now()}.jpg`));
    root.querySelector("[data-delete]").onclick=async()=>{if(!confirm("حذف المشروع نهائيًا؟"))return;saveProjects(projects().filter(x=>x.id!==id));await mediaDelete(id);clearDetail();render();};
  }

  function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
  function downloadData(uri,name){const a=document.createElement("a");a.href=uri;a.download=name;document.body.appendChild(a);a.click();a.remove();}

  function newStory(){setActive(null);["ssTopic","ssStory"].forEach(id=>{const el=qid(id);if(el){el.value="";el.dispatchEvent(new Event("input",{bubbles:true}));}});close();qs('#rmPlusNav [data-rmplus-route="story"]')?.click();}
  function restore(item){setActive(item.id);close();if(item.type==="story"){qs('#rmPlusNav [data-rmplus-route="story"]')?.click();setTimeout(()=>{const d=item.data||{};[["ssTopic",d.topic],["ssStory",d.story],["ssLength",d.length],["ssStyle",d.style]].forEach(([id,v])=>{const el=qid(id);if(el&&v!=null){el.value=v;el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}));}});sessionStorage.setItem("reelsMaker.storyPro.v1",JSON.stringify({format:d.format||"portrait",quality:d.quality||"720",voice:d.voice||"Kore"}));},300);}else if(item.type==="quran")qs('#rmPlusNav [data-rmplus-route="quran"]')?.click();else if(item.type==="image")window.ReelsImageStudio?.open?.();}

  function open(push=true){createOverlay();qid("rmProjects")?.classList.remove("open");render();qid("rmProjectsV2").classList.add("open");document.body.style.overflow="hidden";if(push!==false){localStorage.setItem("reelsMaker.route.v2","projects");try{history.pushState({rmRoute:"projects"},"","#projects");}catch{}}document.documentElement.classList.remove("rm-route-booting");}
  function close(){qid("rmProjectsV2")?.classList.remove("open");document.body.style.overflow="";clearDetail();}

  async function saveImageProject(data){
    const item={id:uid("image"),type:"image",title:data.title||data.prompt?.slice(0,50)||"صورة AI",description:data.prompt||"",createdAt:Date.now(),updatedAt:Date.now(),status:"ready",data:{prompt:data.prompt||"",aspect:data.aspect||"1:1",style:data.style||"realistic",provider:data.provider||"",model:data.model||""},media:{hasImage:true}};
    const list=projects();list.unshift(item);saveProjects(list);await mediaPut(item.id,{kind:"image",dataUri:data.image,poster:data.image});render();return item;
  }

  function watchPreview(){
    const v=qid("ssPreview");if(!v||v.dataset.rmp2Watch)return false;v.dataset.rmp2Watch="1";new MutationObserver(()=>{if(v.getAttribute("src"))setTimeout(captureStoryPreview,120);}).observe(v,{attributes:true,attributeFilter:["src"]});if(v.getAttribute("src"))setTimeout(captureStoryPreview,200);return true;
  }

  function migrateSession(){const s=safeJson(sessionStorage.getItem("reelsMaker.storyStudio.v2")||"{}",{});if(!(s.story||s.topic))return;const list=projects();if(list.some(x=>x.type==="story"&&x.data?.story===s.story))return;upsertStoryDraft();}

  function loop(){watchPreview();if(qid("storyStudio")?.classList.contains("open"))upsertStoryDraft();setTimeout(loop,2200);}
  function install(){if(installed)return;installed=true;createOverlay();migrateSession();loop();window.ReelsProjectsV2={open,close,render,saveImageProject,saveNow:upsertStoryDraft,getProjects:projects,activeProfile};document.addEventListener("keydown",e=>{if(e.key==="Escape"&&qid("rmProjectsV2")?.classList.contains("open"))close();});if(location.hash==="#projects")setTimeout(()=>open(false),380);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
