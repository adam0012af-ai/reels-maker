"use strict";
(()=>{
  if(window.__RM_MOBILE_AUTO_UI__)return;window.__RM_MOBILE_AUTO_UI__=1;
  const state={idea:"",script:"",caption:"",voiceUrl:"",voiceBlob:null,media:[]};
  const $=id=>document.getElementById(id);

  function mount(){
    if($("rmMobileAuto"))return;
    const s=document.createElement("section");s.id="rmMobileAuto";s.dir="rtl";
    s.innerHTML=`<div class="rma-head"><div><b>المحتوى التلقائي</b><small>فكرة ← سكربت ← صوت ← مشاهد ← كابشن</small></div><button class="rma-close" type="button">إغلاق</button></div>
    <div class="rma-body">
      <div class="rma-card rma-setup">
        <label>موضوع الفيديو</label><textarea id="rmaTopic" placeholder="مثال: حقائق نفسية غريبة"></textarea>
        <div class="rma-row"><div><label>المنصة</label><select id="rmaPlatform"><option>TikTok</option><option>Instagram Reels</option><option>YouTube Shorts</option></select></div><div><label>المدة</label><select id="rmaDuration"><option value="30">30 ثانية</option><option value="45" selected>45 ثانية</option><option value="60">60 ثانية</option></select></div></div>
        <label>الأسلوب</label><select id="rmaTone"><option value="Engaging and natural">جذاب وطبيعي</option><option value="Storytelling">قصصي</option><option value="Calm">هادئ</option><option value="Energetic">حماسي</option></select>
        <button id="rmaRun" class="rma-run" type="button">إنشاء المحتوى الكامل</button>
        <button id="rmaToEditor" class="rma-run rma-secondary" type="button" disabled>إرسال للمحرر</button>
        <div id="rmaStatus" class="rma-status"></div><div class="rma-note">لن تتم إضافة كتابة على الفيديو أو الصور.</div>
      </div>
      <div class="rma-card"><label>01 · الفكرة</label><div id="rmaIdea" class="rma-out">—</div></div>
      <div class="rma-card"><label>02 · السكربت</label><div id="rmaScript" class="rma-out">—</div></div>
      <div class="rma-card"><label>03 · الصوت</label><div id="rmaVoice" class="rma-out">—</div></div>
      <div class="rma-card"><label>04 · المشاهد</label><div id="rmaMedia" class="rma-media"><div class="rma-out">—</div></div></div>
      <div class="rma-card"><label>05 · الكابشن</label><div id="rmaCaption" class="rma-out">—</div></div>
    </div>`;
    document.body.appendChild(s);
    s.querySelector(".rma-close").onclick=close;
    $("rmaRun").onclick=run;
    $("rmaToEditor").onclick=sendToEditor;
  }
  function open(){mount();const s=$("rmMobileAuto");s.classList.add("open");s.style.setProperty("display","block","important");document.body.classList.remove("rm-mobile-open");document.body.style.overflow="hidden";return true}
  function close(){const s=$("rmMobileAuto");if(s){s.classList.remove("open");s.style.display=""}document.body.style.overflow=""}
  function status(t){$("rmaStatus").textContent=t}
  function setText(id,t){$(id).textContent=t||"—"}
  async function gen(task,topic,durationSeconds,platform,tone){const r=await fetch("/api/autocontent/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task,topic,durationSeconds,platform,tone,language:"Arabic"})});const j=await r.json();if(!r.ok)throw new Error(j.error||"فشل الإنشاء");return j.text||""}
  async function makeVoice(script,tone){const vr=await fetch("/api/tts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:script,voice:"Kore",style:tone.includes("Story")?"story":"egyptian"})});if(!vr.ok)throw new Error("تعذر إنشاء الصوت");const blob=await vr.blob();state.voiceBlob=blob;if(state.voiceUrl)URL.revokeObjectURL(state.voiceUrl);state.voiceUrl=URL.createObjectURL(blob);const a=document.createElement("audio");a.controls=true;a.className="rma-audio";a.src=state.voiceUrl;const host=$("rmaVoice");host.textContent="";host.appendChild(a)}
  async function searchMedia(topic){const q=encodeURIComponent(topic.slice(0,90));let data=null;for(const url of [`/api/pexels?query=${q}&per_page=6`,`/api/pixabay?query=${q}&per_page=6`]){try{const r=await fetch(url);if(!r.ok)continue;data=await r.json();if(data)break}catch{}}
    const items=[];if(Array.isArray(data?.videos))for(const v of data.videos.slice(0,3)){const f=(v.video_files||[]).filter(x=>x.link).find(x=>x.height>x.width)||(v.video_files||[])[0];if(f?.link)items.push({type:"video",url:f.link})}
    if(Array.isArray(data?.hits))for(const h of data.hits.slice(0,3)){const url=h.videos?.medium?.url||h.videos?.small?.url||h.webformatURL;if(url)items.push({type:url.includes(".mp4")?"video":"image",url})}
    state.media=items;const host=$("rmaMedia");host.innerHTML="";if(!items.length){host.innerHTML='<div class="rma-out">لم يتم العثور على مشاهد جاهزة.</div>';return}
    items.forEach((it,i)=>{const w=document.createElement("div");w.className="rma-media-item";const el=document.createElement(it.type==="video"?"video":"img");el.src=it.url;if(it.type==="video"){el.muted=true;el.loop=true;el.playsInline=true;el.autoplay=true}const b=document.createElement("span");b.textContent=`مشهد ${i+1}`;w.append(el,b);host.appendChild(w)})}
  function putFile(input,file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event("change",{bubbles:true}))}
  async function fetchVideo(item){const r=await fetch(`/api/media?url=${encodeURIComponent(item.url)}`);if(!r.ok)throw new Error("تعذر تحميل الفيديو للمحرر");const blob=await r.blob();return new File([blob],"auto-scene.mp4",{type:blob.type||"video/mp4"})}
  async function sendToEditor(){const btn=$("rmaToEditor");btn.disabled=true;try{status("جاري إرسال الفيديو والصوت للمحرر...");const video=state.media.find(x=>x.type==="video");if(!video)throw new Error("لا يوجد فيديو جاهز للإرسال");const vi=$("videoUpload");if(!vi)throw new Error("محرر الفيديو غير جاهز");putFile(vi,await fetchVideo(video));if(state.voiceBlob){const ai=$("audioUpload");if(ai){const ext=state.voiceBlob.type.includes("wav")?"wav":"mp3";putFile(ai,new File([state.voiceBlob],`auto-voice.${ext}`,{type:state.voiceBlob.type||"audio/wav"}))}}close();document.querySelector('.tab[data-tab="video"]')?.click();status("تم إرسال الناتج للمحرر") }catch(e){status("خطأ: "+e.message)}finally{btn.disabled=false}}
  async function run(){const topic=$("rmaTopic").value.trim();if(!topic)return status("اكتب موضوع الفيديو أولاً");const d=Number($("rmaDuration").value)||45,platform=$("rmaPlatform").value,tone=$("rmaTone").value,btn=$("rmaRun"),editor=$("rmaToEditor");btn.disabled=true;editor.disabled=true;state.voiceBlob=null;state.media=[];setText("rmaIdea","—");setText("rmaScript","—");setText("rmaVoice","—");setText("rmaCaption","—");$("rmaMedia").innerHTML='<div class="rma-out">—</div>';
    try{status("1/5 إنشاء الفكرة...");state.idea=await gen("idea",topic,d,platform,tone);setText("rmaIdea",state.idea);status("2/5 كتابة السكربت...");state.script=await gen("script",topic,d,platform,tone);setText("rmaScript",state.script);status("3/5 إنشاء الصوت...");try{await makeVoice(state.script,tone)}catch(e){setText("rmaVoice","تعذر إنشاء الصوت: "+e.message)}status("4/5 اختيار المشاهد...");await searchMedia(topic);status("5/5 إنشاء الكابشن...");state.caption=await gen("caption",topic,d,platform,tone);setText("rmaCaption",state.caption);editor.disabled=!state.media.some(x=>x.type==="video");status(editor.disabled?"اكتمل المحتوى. المشاهد غير متاحة حاليًا.":"اكتمل كل شيء. يمكنك تشغيل الصوت ومراجعة المشاهد أو إرسالها للمحرر.")}catch(e){status("خطأ: "+e.message)}finally{btn.disabled=false}}
  function ensureMenu(){const nav=document.querySelector("#rmShellSidebar .rm-shell-nav");if(!nav)return false;let b=nav.querySelector('[data-rm-tool="automation"]');if(!b){const settings=nav.querySelector('[data-rm-tool="settings"]');b=document.createElement("button");b.type="button";b.className="rm-shell-item rm-auto-live-item";b.dataset.rmTool="automation";b.innerHTML='<span class="rm-shell-icon">⚡</span><span class="rm-shell-copy"><b>المحتوى التلقائي</b><small>إنشاء محتوى كامل بالذكاء الاصطناعي</small></span><span class="rm-shell-arrow">‹</span>';if(settings)nav.insertBefore(b,settings);else nav.appendChild(b)}return true}
  function capture(e){const b=e.target?.closest?.('[data-rm-tool="automation"]');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();open()}
  document.addEventListener("click",capture,true);document.addEventListener("pointerup",capture,true);
  function start(){mount();if(ensureMenu())return;const mo=new MutationObserver(()=>{if(ensureMenu())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true})}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();window.ReelsAutomation={open};
})();
