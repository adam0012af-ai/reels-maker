"use strict";

(() => {
  const qid=id=>document.getElementById(id);
  const qs=s=>document.querySelector(s);
  const qsa=s=>[...document.querySelectorAll(s)];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const CHAR_PREFIX="reelsMaker.storyCharacters.v4.";
  const SERIES_PREFIX="reelsMaker.storySeries.v4.";
  const ACTIVE_PROJECT_KEY="reelsMaker.activeProject.v1";
  const DB_NAME="reelsMaker.storySeriesMedia.v4";
  const DB_STORE="parts";
  let installed=false, currentPlan=null, planGate=null, imageQueue=Promise.resolve(), lastPreviewSrc="";

  const safeJson=(raw,fallback)=>{try{return JSON.parse(raw);}catch{return fallback;}};
  const uid=(p="id")=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const toast=(m,t="ok")=>{if(typeof window.toast==="function")window.toast(m,t);};
  function projectScope(){const a=safeJson(localStorage.getItem(ACTIVE_PROJECT_KEY)||"{}",{});return a.projectId||"draft";}
  function charKey(){return CHAR_PREFIX+projectScope();}
  function seriesKey(){return SERIES_PREFIX+projectScope();}
  function loadChars(){const v=safeJson(localStorage.getItem(charKey())||"[]",[]);return Array.isArray(v)?v:[];}
  function saveChars(v){localStorage.setItem(charKey(),JSON.stringify(v));renderCharacters();}
  function loadSeries(){const v=safeJson(localStorage.getItem(seriesKey())||"{}",{});return {id:v.id||uid("series"),part:Math.max(1,Number(v.part)||1),total:Math.max(1,Number(v.total)||3),previous:v.previous||[],lastFrame:v.lastFrame||null,...v};}
  function saveSeries(v){localStorage.setItem(seriesKey(),JSON.stringify(v));syncSeriesUI();}

  function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DB_STORE))r.result.createObjectStore(DB_STORE,{keyPath:"id"});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function putPart(item){try{const d=await db();await new Promise((res,rej)=>{const tx=d.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put(item);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});d.close();}catch{}}
  async function getParts(seriesId){try{const d=await db();const all=await new Promise((res,rej)=>{const r=d.transaction(DB_STORE,"readonly").objectStore(DB_STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});d.close();return all.filter(x=>x.seriesId===seriesId).sort((a,b)=>a.part-b.part);}catch{return[];}}

  function injectUI(){
    const pane=qid("ssCreatePane"); if(!pane||qid("sd4Characters"))return false;
    const anchor=qid("ssProSetup")||pane.querySelector(".ss-grid3");
    const box=document.createElement("section");box.id="sd4Characters";box.className="sd4-panel";
    box.innerHTML=`<div class="sd4-head"><div><b>الشخصيات واستمرارية القصة</b><span>عرّف الشخصيات مرة واحدة، والنظام يوزعها تلقائيًا على المشاهد والأجزاء.</span></div><button id="sd4AddCharacter" class="sd4-btn" type="button">＋ إضافة شخصية</button></div><div id="sd4CharacterGrid" class="sd4-char-grid"></div><div class="sd4-series"><div><b>سلسلة القصة</b><span id="sd4SeriesStatus"></span></div><div class="sd4-series-actions"><button id="sd4Continue" class="sd4-btn primary" type="button">⤵ تكملة القصة</button><button id="sd4Merge" class="sd4-btn" type="button">⧉ دمج الأجزاء</button><button id="sd4NewSeries" class="sd4-btn ghost" type="button">↻ سلسلة جديدة</button></div></div>`;
    anchor?.insertAdjacentElement("beforebegin",box);
    qid("sd4AddCharacter").onclick=()=>addCharacter();
    qid("sd4Continue").onclick=continueStory;
    qid("sd4Merge").onclick=mergeSeries;
    qid("sd4NewSeries").onclick=()=>{if(!confirm("بدء سلسلة جديدة؟ ستبقى المشاريع والفيديوهات السابقة محفوظة في مشاريعي."))return;localStorage.removeItem(seriesKey());syncSeriesUI();toast("بدأت سلسلة جديدة.");};
    upgradeStyles(); renderCharacters(); syncSeriesUI(); installMenuButtons(); return true;
  }

  function upgradeStyles(){
    const s=qid("ssStyle");if(!s||s.dataset.sd4)return;s.dataset.sd4="1";
    const labels={cartoon3d:"3D أطفال سينمائي فاخر",cartoon2d:"2D قصصي للأطفال",realistic:"سينمائي واقعي"};
    [...s.options].forEach(o=>{if(labels[o.value])o.textContent=labels[o.value];});
  }

  function addCharacter(seed={}){const chars=loadChars();chars.push({id:uid("char"),name:seed.name||"",role:seed.role||"",notes:seed.notes||"",image:seed.image||""});saveChars(chars);setTimeout(()=>qs(".sd4-char:last-child input[data-field=name]")?.focus(),40);}
  function updateChar(id,field,value){const chars=loadChars();const c=chars.find(x=>x.id===id);if(!c)return;c[field]=value;localStorage.setItem(charKey(),JSON.stringify(chars));}
  function renderCharacters(){
    const root=qid("sd4CharacterGrid");if(!root)return;const chars=loadChars();root.innerHTML="";
    if(!chars.length){root.innerHTML='<div class="sd4-empty">لا توجد شخصيات بعد. أضف صورة + اسم مثل «عمر» أو «مريم». لو لم تضف شخصيات سيولد النظام المشاهد تلقائيًا كالمعتاد.</div>';return;}
    chars.forEach(c=>{const card=document.createElement("article");card.className="sd4-char";card.innerHTML=`<label class="sd4-photo"><input type="file" accept="image/*" hidden><span class="sd4-photo-body">${c.image?`<img src="${c.image}" alt="">`:'<i>＋</i><b>صورة الشخصية</b>'}</span></label><div class="sd4-char-fields"><input data-field="name" placeholder="اسم الشخصية" value=""><input data-field="role" placeholder="الدور: بطل، أم، عم..." value=""><textarea data-field="notes" placeholder="وصف اختياري: العمر، الملابس، ملامح ثابتة..."></textarea></div><button class="sd4-remove" type="button" title="حذف">×</button>`;
      card.querySelector('[data-field=name]').value=c.name||"";card.querySelector('[data-field=role]').value=c.role||"";card.querySelector('[data-field=notes]').value=c.notes||"";
      card.querySelectorAll("[data-field]").forEach(el=>el.addEventListener("input",()=>updateChar(c.id,el.dataset.field,el.value)));
      card.querySelector("input[type=file]").onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{updateChar(c.id,"image",r.result);renderCharacters();};r.readAsDataURL(f);};
      card.querySelector(".sd4-remove").onclick=()=>saveChars(chars.filter(x=>x.id!==c.id));root.appendChild(card);
    });
  }

  function syncSeriesUI(){const s=loadSeries(),el=qid("sd4SeriesStatus");if(el)el.textContent=`الجزء ${s.part} من ${s.total} • نفس الشخصيات والستايل محفوظان`;const b=qid("sd4Continue");if(b)b.textContent=s.part>=s.total?"＋ جزء إضافي":"⤵ تكملة القصة";}

  function namesInText(text,chars){const t=String(text||"");return chars.filter(c=>c.name&&t.includes(c.name)).map(c=>c.id);}
  function enrichPlan(data){
    const chars=loadChars(); if(!Array.isArray(data?.scenes))return data;
    let last=[];data.scenes=data.scenes.map((scene,index)=>{let assigned=namesInText(scene.narration||scene.displayText||"",chars);if(!assigned.length&&last.length&&index>0)assigned=last.slice(0,2);if(!assigned.length&&chars.length===1)assigned=[chars[0].id];last=assigned;
      const marker=` RM_SCENE_${index} `;const charNames=assigned.map(id=>chars.find(c=>c.id===id)?.name).filter(Boolean);
      const speaker=assigned.find(id=>{const n=chars.find(c=>c.id===id)?.name||"";return n&&new RegExp(`(?:قال|قالت|سأل|سألت|أجاب|أجابت|همس|همست)\\s+${n}|${n}\\s+(?:قال|قالت|سأل|سألت|أجاب|أجابت|همس|همست)`).test(scene.narration||scene.displayText||"");})||assigned[0]||null;
      return {...scene,sd4Index:index,sd4Characters:assigned,sd4Speaker:speaker,prompt:`${scene.prompt||""}.${marker} ${charNames.length?`The ONLY named recurring characters required in this scene are: ${charNames.join(", ")}. Match their reference identities exactly.`:"Do not invent a recurring named character unless the story requires one."}`};});
    currentPlan={scenes:data.scenes,approved:false};return data;
  }

  function planModal(){
    let root=qid("sd4PlanModal");if(root)return root;root=document.createElement("div");root.id="sd4PlanModal";root.className="sd4-modal";document.body.appendChild(root);return root;
  }
  function ensurePlanApproved(){
    if(!currentPlan||currentPlan.approved)return Promise.resolve();if(planGate)return planGate;
    planGate=new Promise(resolve=>{const root=planModal(),chars=loadChars();root.innerHTML=`<section class="sd4-plan"><header><div><h3>مراجعة توزيع الشخصيات قبل توليد الصور</h3><p>النظام وزّع الشخصيات تلقائيًا. عدّل أي مشهد ثم ابدأ التوليد.</p></div></header><div class="sd4-plan-list"></div><footer><button class="sd4-btn" data-cancel type="button">رجوع للقصة</button><button class="sd4-btn primary" data-ok type="button">✓ اعتماد المشاهد وبدء الصور</button></footer></section>`;
      const list=root.querySelector(".sd4-plan-list");currentPlan.scenes.forEach((scene,i)=>{const row=document.createElement("article");row.className="sd4-plan-row";row.innerHTML=`<div class="sd4-plan-num">${i+1}</div><div><b>${(scene.narration||scene.displayText||"").slice(0,135)}</b><div class="sd4-char-checks"></div></div>`;const checks=row.querySelector(".sd4-char-checks");
        if(!chars.length)checks.innerHTML='<span class="sd4-muted">توليد تلقائي بدون مرجع شخصية</span>';else {chars.forEach(c=>{const lab=document.createElement("label");lab.innerHTML=`<input type="checkbox" ${scene.sd4Characters?.includes(c.id)?"checked":""}> <span>${c.name||"شخصية بدون اسم"}</span>`;lab.querySelector("input").onchange=e=>{const set=new Set(scene.sd4Characters||[]);e.target.checked?set.add(c.id):set.delete(c.id);scene.sd4Characters=[...set];};checks.appendChild(lab);});const sp=document.createElement("select");sp.className="sd4-speaker";sp.innerHTML=`<option value="">المتحدث: تلقائي</option>${chars.map(c=>`<option value="${c.id}">المتحدث: ${c.name||"شخصية"}</option>`).join("")}`;sp.value=scene.sd4Speaker||"";sp.onchange=()=>scene.sd4Speaker=sp.value||null;checks.appendChild(sp);}list.appendChild(row);});
      root.classList.add("open");root.querySelector("[data-ok]").onclick=()=>{currentPlan.approved=true;root.classList.remove("open");const r=resolve;planGate=null;r();};root.querySelector("[data-cancel]").onclick=()=>{root.classList.remove("open");const r=resolve;planGate=null;currentPlan.approved=true;toast("تم المتابعة بدون تعديل إضافي.");r();};
    });return planGate;
  }

  async function compositeReference(sceneIndex){
    const scene=currentPlan?.scenes?.[sceneIndex];const chars=loadChars();const selected=(scene?.sd4Characters||[]).map(id=>chars.find(c=>c.id===id)).filter(c=>c?.image);
    const series=loadSeries();const sources=[...selected.map(c=>({name:c.name,image:c.image}))];if(sceneIndex===0&&series.part>1&&series.lastFrame)sources.push({name:"آخر لقطة من الجزء السابق",image:series.lastFrame});
    if(!sources.length)return null;if(sources.length===1)return sources[0].image;
    const loaded=[];for(const s of sources.slice(0,4)){try{const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=s.image;});loaded.push({...s,img});}catch{}}
    if(!loaded.length)return null;const cell=420,w=cell*loaded.length,h=520,c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.fillStyle="#111820";x.fillRect(0,0,w,h);loaded.forEach((s,i)=>{const ratio=Math.max(cell/(s.img.naturalWidth||1),440/(s.img.naturalHeight||1)),dw=s.img.naturalWidth*ratio,dh=s.img.naturalHeight*ratio;x.drawImage(s.img,i*cell+(cell-dw)/2,(440-dh)/2,dw,dh);x.fillStyle="#0a0d12";x.fillRect(i*cell,440,cell,80);x.fillStyle="#fff";x.font="700 24px Arial";x.textAlign="center";x.fillText(s.name||`Character ${i+1}`,i*cell+cell/2,488,cell-20);});return c.toDataURL("image/jpeg",.9);
  }

  function patchFetch(){
    if(window.__sd4FetchPatched)return;window.__sd4FetchPatched=true;const native=window.fetch.bind(window);
    window.fetch=async function(input,init){const url=typeof input==="string"?input:input?.url||"";const method=String(init?.method||"GET").toUpperCase();
      if(/\/api\/story-scenes-v2(?:\?|$)/.test(url)&&method==="POST"){
        let next=init;try{const b=JSON.parse(init?.body||"{}");b.characters=loadChars().map(c=>({name:c.name,role:c.role,notes:c.notes,hasReference:!!c.image}));const s=loadSeries();b.series={part:s.part,total:s.total,continuation:s.part>1};next={...init,body:JSON.stringify(b)};}catch{}
        const r=await native(input,next);const d=await r.clone().json().catch(()=>null);if(!r.ok||!d?.scenes)return r;const out=enrichPlan(d);return new Response(JSON.stringify(out),{status:r.status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
      }
      if(/\/api\/story-image(?:\?|$)/.test(url)&&method==="POST"){
        const task=async()=>{await ensurePlanApproved();let b={};try{b=JSON.parse(init?.body||"{}");}catch{}const m=String(b.prompt||"").match(/RM_SCENE_(\d+)/);const idx=m?Number(m[1]):0;const chars=loadChars(),scene=currentPlan?.scenes?.[idx];const selected=(scene?.sd4Characters||[]).map(id=>chars.find(c=>c.id===id)).filter(Boolean);if(selected.length){const speaker=chars.find(c=>c.id===scene?.sd4Speaker);b.prompt=`${b.prompt||""}. Reference identity instructions: ${selected.map(c=>`${c.name}: ${c.role||"recurring character"}; ${c.notes||"keep exact face, age, hair, wardrobe and colors"}`).join(" | ")}. Do not swap identities or merge faces.${speaker?` Visual focus: ${speaker.name} is the speaking/acting focus of this scene; direct body language and eye-line toward the addressed character naturally.`:""}`;const ref=await compositeReference(idx);if(ref)b.reference=ref;}
          const old=window.__reelsStoryReferenceImage;if(b.reference)window.__reelsStoryReferenceImage=b.reference;try{return await native(input,{...init,body:JSON.stringify(b)});}finally{window.__reelsStoryReferenceImage=old;}};
        const chained=imageQueue.then(task,task);imageQueue=chained.then(()=>undefined,()=>undefined);return chained;
      }
      return native(input,init);
    };
  }

  async function captureLastFrame(){const src=qid("ssPreview")?.src;if(!src)return null;return new Promise(resolve=>{const v=document.createElement("video");v.muted=true;v.playsInline=true;v.onloadedmetadata=()=>{v.currentTime=Math.max(0,(v.duration||.1)-.08);};v.onseeked=()=>{try{const c=document.createElement("canvas");c.width=v.videoWidth||720;c.height=v.videoHeight||1280;c.getContext("2d").drawImage(v,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.88));}catch{resolve(null);}finally{v.removeAttribute("src");v.load();}};v.onerror=()=>resolve(null);v.src=src;});}
  async function persistCurrentPart(){const video=qid("ssPreview");if(!video?.src)return;try{const blob=await fetch(video.src).then(r=>r.blob());const s=loadSeries();await putPart({id:`${s.id}:${s.part}`,seriesId:s.id,part:s.part,blob,story:qid("ssStory")?.value||"",topic:qid("ssTopic")?.value||"",createdAt:Date.now()});}catch{}}

  async function continueStory(){
    const story=qid("ssStory")?.value?.trim();if(!story)return toast("اكتب أو ولّد الجزء الحالي أولًا.","error");const btn=qid("sd4Continue");btn.disabled=true;const old=btn.textContent;btn.textContent="⏳ تجهيز الجزء التالي...";
    try{await persistCurrentPart();const s=loadSeries();s.lastFrame=await captureLastFrame();s.previous=[...(s.previous||[]),story].slice(-3);const nextPart=s.part+1;const r=await fetch("/api/story-continue",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({previousStory:story,history:s.previous,part:nextPart,total:s.total,topic:qid("ssTopic")?.value||"",characters:loadChars().map(c=>({name:c.name,role:c.role,notes:c.notes}))})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.text)throw new Error(d.error||`HTTP ${r.status}`);s.part=nextPart;saveSeries(s);qid("ssStory").value=d.text;qid("ssStory").dispatchEvent(new Event("input",{bubbles:true}));qid("ssReviewPane")?.classList.remove("show");currentPlan=null;imageQueue=Promise.resolve();toast(`تم تجهيز الجزء ${nextPart}. راجعه ثم اضغط إنشاء القصة والفيديو.`);qid("ssStory")?.scrollIntoView({behavior:"smooth",block:"center"});}catch(e){toast(`تعذر إنشاء التكملة: ${e.message||e}`,"error");}finally{btn.disabled=false;btn.textContent=old;syncSeriesUI();}
  }

  async function videoMeta(blob){return new Promise((res,rej)=>{const v=document.createElement("video"),u=URL.createObjectURL(blob);v.onloadedmetadata=()=>{res({w:v.videoWidth||720,h:v.videoHeight||1280,d:v.duration||0});URL.revokeObjectURL(u);};v.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("تعذر قراءة الفيديو"));};v.src=u;});}
  function mimeChoice(){const a=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm"];return a.find(x=>MediaRecorder.isTypeSupported?.(x))||"";}
  async function mergeBlobs(parts,onProgress){
    const first=await videoMeta(parts[0].blob),canvas=document.createElement("canvas");canvas.width=first.w;canvas.height=first.h;const x=canvas.getContext("2d",{alpha:false});const AC=window.AudioContext||window.webkitAudioContext,ac=new AC();await ac.resume();const dest=ac.createMediaStreamDestination(),stream=canvas.captureStream(30);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));const mime=mimeChoice(),chunks=[],rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6_000_000}:{videoBitsPerSecond:6_000_000});rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};const stopped=new Promise((res,rej)=>{rec.onstop=res;rec.onerror=e=>rej(e.error||e);});rec.start(400);
    for(let pi=0;pi<parts.length;pi++){const u=URL.createObjectURL(parts[pi].blob),v=document.createElement("video");v.src=u;v.playsInline=true;await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=rej;});const src=ac.createMediaElementSource(v);src.connect(dest);await v.play();while(!v.ended){x.fillStyle="#000";x.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/(v.videoWidth||canvas.width),canvas.height/(v.videoHeight||canvas.height)),dw=(v.videoWidth||canvas.width)*scale,dh=(v.videoHeight||canvas.height)*scale;x.drawImage(v,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);onProgress?.(pi,v.currentTime/(v.duration||1));await new Promise(r=>requestAnimationFrame(r));}src.disconnect();v.pause();URL.revokeObjectURL(u);}
    await new Promise(r=>setTimeout(r,100));rec.stop();await stopped;stream.getTracks().forEach(t=>t.stop());await ac.close();return new Blob(chunks,{type:rec.mimeType||mime||"video/webm"});
  }
  function showMergeResult(blob){let root=qid("sd4MergeResult");if(!root){root=document.createElement("div");root.id="sd4MergeResult";root.className="sd4-modal";document.body.appendChild(root);}const u=URL.createObjectURL(blob);root.innerHTML=`<section class="sd4-merge-result"><h3>الفيديو المدمج جاهز</h3><video controls playsinline src="${u}"></video><div><button class="sd4-btn" data-close type="button">إغلاق</button><button class="sd4-btn primary" data-download type="button">⬇ تحميل الفيديو المدمج</button></div></section>`;root.classList.add("open");root.querySelector("[data-close]").onclick=()=>{root.classList.remove("open");};root.querySelector("[data-download]").onclick=()=>{const a=document.createElement("a");a.href=u;a.download=`story-series-${Date.now()}.${blob.type.includes("mp4")?"mp4":"webm"}`;a.click();};}
  async function mergeSeries(){await persistCurrentPart();const s=loadSeries(),parts=await getParts(s.id);if(parts.length<2)return toast("لازم يكون عندك جزئين فيديو على الأقل داخل نفس السلسلة.","error");const btn=qid("sd4Merge");btn.disabled=true;const old=btn.textContent;try{btn.textContent="⏳ دمج 0%";const blob=await mergeBlobs(parts,(pi,p)=>{const total=(pi+p)/parts.length;btn.textContent=`⏳ دمج ${Math.round(total*100)}%`;});showMergeResult(blob);toast("تم دمج أجزاء القصة ✅");}catch(e){toast(`تعذر الدمج: ${e.message||e}`,"error");}finally{btn.disabled=false;btn.textContent=old;}}

  function watchPreview(){const v=qid("ssPreview");if(!v||v.dataset.sd4watch)return;v.dataset.sd4watch="1";new MutationObserver(async()=>{if(v.src&&v.src!==lastPreviewSrc){lastPreviewSrc=v.src;setTimeout(persistCurrentPart,500);}}).observe(v,{attributes:true,attributeFilter:["src"]});}

  function installMenuButtons(){
    const specs=[[".story-studio .ss-head","ssClose"],["#reelsImageStudio .rmi-head","rmiClose"],["#quranStudio .qr-head","qrClose"]];specs.forEach(([sel,closeId])=>{const head=qs(sel);if(!head)return;qid(closeId)?.style.setProperty("display","none","important");if(head.querySelector(".sd4-menu"))return;const b=document.createElement("button");b.type="button";b.className="sd4-menu";b.textContent="☰ الأقسام";b.onclick=()=>{qid("creatorDrawerMask")?.classList.add("open");};head.appendChild(b);});
    const top=qid("creatorMenuLaunch");if(top&&!top.dataset.sd4fast){top.dataset.sd4fast="1";top.addEventListener("pointerdown",()=>qid("creatorDrawerMask")?.classList.add("open"),true);}
  }

  function installScrollTop(){if(qid("sd4Top"))return;const b=document.createElement("button");b.id="sd4Top";b.className="sd4-top";b.type="button";b.textContent="↑";b.title="رجوع لأعلى";b.onclick=()=>{const targets=[qs(".ss-main"),qs(".rmi-main"),qs(".qr-body"),document.scrollingElement].filter(Boolean);targets.forEach(t=>{try{t.scrollTo({top:0,behavior:"smooth"});}catch{}});};document.body.appendChild(b);const update=()=>{const y=Math.max(window.scrollY||0,qs(".ss-main")?.scrollTop||0,qs(".rmi-main")?.scrollTop||0,qs(".qr-body")?.scrollTop||0);b.classList.toggle("show",y>420);requestAnimationFrame(update);};update();}

  function tick(){injectUI();upgradeStyles();renderCharacters();syncSeriesUI();watchPreview();installMenuButtons();setTimeout(tick,700);}
  function install(){if(installed)return;installed=true;patchFetch();installScrollTop();tick();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();