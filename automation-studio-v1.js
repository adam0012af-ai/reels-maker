"use strict";
(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const state={idea:"",script:"",caption:"",voiceUrl:"",media:[]};

  function installSidebarButton(){
    if(document.querySelector('[data-rm-tool="automation"]')) return;
    const settings=document.querySelector('[data-rm-tool="settings"]');
    if(!settings||!settings.parentElement){setTimeout(installSidebarButton,300);return;}
    const btn=settings.cloneNode(true);
    btn.dataset.rmTool="automation";
    btn.classList.remove("active");
    btn.classList.add("rm-auto-sidebar-btn");
    btn.removeAttribute("aria-current");
    const text=btn.querySelector("b")||btn.querySelector("span:last-child");
    if(text) text.textContent="المحتوى التلقائي";
    else btn.textContent="⚡ المحتوى التلقائي";
    btn.title="إنشاء فيديو كامل بالذكاء الاصطناعي";
    btn.addEventListener("click",e=>{e.preventDefault();open();});
    settings.parentElement.insertBefore(btn,settings);
  }

  function mount(){
    if(document.getElementById("rmAutoContent")) return;
    const root=document.createElement("section");
    root.id="rmAutoContent";
    root.innerHTML=`<div class="rm-auto-shell" dir="rtl">
      <div class="rm-auto-head"><div class="rm-auto-title"><b>المحتوى التلقائي</b><span>فكرة ← سكربت ← صوت ← مشاهد ← كابشن</span></div><button class="rm-auto-close" type="button">إغلاق</button></div>
      <div class="rm-auto-grid">
        <aside class="rm-auto-card">
          <h3>إعداد الفيديو</h3>
          <label class="rm-auto-field"><span>الموضوع</span><textarea id="rmAutoTopic" placeholder="مثال: حقائق نفسية غريبة ومفاجئة"></textarea></label>
          <label class="rm-auto-field"><span>اللغة</span><select id="rmAutoLanguage"><option value="Arabic">العربية</option><option value="English">English</option></select></label>
          <label class="rm-auto-field"><span>المنصة</span><select id="rmAutoPlatform"><option>TikTok</option><option>Instagram Reels</option><option>YouTube Shorts</option></select></label>
          <label class="rm-auto-field"><span>الأسلوب</span><select id="rmAutoTone"><option value="Engaging and natural">جذاب وطبيعي</option><option value="Storytelling">قصصي</option><option value="Calm">هادئ</option><option value="Energetic">حماسي</option></select></label>
          <label class="rm-auto-field"><span>المدة</span><select id="rmAutoDuration"><option value="30">30 ثانية</option><option value="45" selected>45 ثانية</option><option value="60">60 ثانية</option></select></label>
          <button id="rmAutoRun" class="rm-auto-btn" type="button">إنشاء المحتوى الكامل</button>
          <div id="rmAutoStatus" class="rm-auto-status"></div>
          <div class="rm-auto-note">لن تتم إضافة أي كتابة على الصور أو الفيديو.</div>
        </aside>
        <main class="rm-auto-card"><div id="rmAutoSteps" class="rm-auto-steps">
          <div class="rm-auto-step"><div class="rm-auto-step-head"><b>01 · الفكرة</b><span class="rm-auto-pill">جاهز</span></div><div id="rmAutoIdea" class="rm-auto-out">—</div></div>
          <div class="rm-auto-step"><div class="rm-auto-step-head"><b>02 · السكربت</b><span class="rm-auto-pill">جاهز</span></div><div id="rmAutoScript" class="rm-auto-out">—</div></div>
          <div class="rm-auto-step"><div class="rm-auto-step-head"><b>03 · الصوت</b><span class="rm-auto-pill">جاهز</span></div><div id="rmAutoVoice" class="rm-auto-out">—</div></div>
          <div class="rm-auto-step"><div class="rm-auto-step-head"><b>04 · المشاهد</b><span class="rm-auto-pill">جاهز</span></div><div id="rmAutoMedia" class="rm-auto-media"></div></div>
          <div class="rm-auto-step"><div class="rm-auto-step-head"><b>05 · الكابشن</b><span class="rm-auto-pill">جاهز</span></div><div id="rmAutoCaption" class="rm-auto-out">—</div></div>
        </div></main>
      </div></div>`;
    document.body.appendChild(root);
    root.querySelector(".rm-auto-close").addEventListener("click",close);
    $("#rmAutoRun",root).addEventListener("click",runWorkflow);
  }

  function open(){mount();document.body.style.overflow="hidden";document.getElementById("rmAutoContent").classList.add("open");}
  function close(){document.getElementById("rmAutoContent")?.classList.remove("open");document.body.style.overflow="";}
  function status(t){const el=document.getElementById("rmAutoStatus");if(el)el.textContent=t;}
  function setText(id,t){const el=document.getElementById(id);if(el)el.textContent=t||"—";}
  async function post(url,body){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});if(!r.ok){const text=await r.text().catch(()=>"");throw new Error(text||`HTTP ${r.status}`)}return r.headers.get("content-type")?.includes("application/json")?r.json():r.blob();}

  async function generate(task,topic,language,platform,tone,durationSeconds){
    return post("/api/autocontent/generate",{task,topic,language,platform,tone,durationSeconds});
  }

  async function makeVoice(script,tone){
    const r=await fetch("/api/tts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:script,voice:"Kore",style:tone.toLowerCase().includes("story")?"story":"egyptian"})});
    if(!r.ok) throw new Error(await r.text().catch(()=>"تعذر إنشاء الصوت"));
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);state.voiceUrl=url;
    const host=document.getElementById("rmAutoVoice");host.innerHTML="";const a=document.createElement("audio");a.controls=true;a.className="rm-auto-audio";a.src=url;host.appendChild(a);
  }

  async function searchMedia(topic){
    const q=encodeURIComponent(topic.slice(0,90));
    let data=null;
    for(const endpoint of [`/api/pexels?query=${q}&per_page=6`,`/api/pixabay?query=${q}&per_page=6`]){
      try{const r=await fetch(endpoint);if(!r.ok)continue;data=await r.json();if(data)break;}catch{}
    }
    const items=[];
    if(Array.isArray(data?.videos)) for(const v of data.videos.slice(0,3)){
      const files=(v.video_files||[]).filter(f=>f.link);const f=files.find(x=>x.height>x.width)||files[0];if(f)items.push({type:"video",url:f.link});
    }
    if(Array.isArray(data?.hits)) for(const h of data.hits.slice(0,3)){
      const url=h.videos?.medium?.url||h.videos?.small?.url||h.webformatURL;if(url)items.push({type:url.includes(".mp4")?"video":"image",url});
    }
    state.media=items;
    const host=document.getElementById("rmAutoMedia");host.innerHTML="";
    if(!items.length){host.innerHTML='<div class="rm-auto-out">لم يتم العثور على مشاهد جاهزة. يمكنك استخدام استوديو الصور الموجود في Reels Maker.</div>';return;}
    items.forEach(it=>{const el=document.createElement(it.type==="video"?"video":"img");el.src=it.url;if(it.type==="video"){el.muted=true;el.loop=true;el.playsInline=true;el.autoplay=true;}host.appendChild(el);});
  }

  async function runWorkflow(){
    const btn=document.getElementById("rmAutoRun");
    const topic=document.getElementById("rmAutoTopic").value.trim();
    if(!topic){status("اكتب موضوع الفيديو أولاً.");return;}
    const language=document.getElementById("rmAutoLanguage").value,platform=document.getElementById("rmAutoPlatform").value,tone=document.getElementById("rmAutoTone").value,durationSeconds=Number(document.getElementById("rmAutoDuration").value)||45;
    btn.disabled=true;
    try{
      status("1/5 إنشاء الفكرة...");const idea=await generate("idea",topic,language,platform,tone,durationSeconds);state.idea=idea.text||"";setText("rmAutoIdea",state.idea);
      status("2/5 كتابة السكربت...");const script=await generate("script",topic,language,platform,tone,durationSeconds);state.script=script.text||"";setText("rmAutoScript",state.script);
      status("3/5 إنشاء الصوت العربي...");try{await makeVoice(state.script,tone);}catch(e){setText("rmAutoVoice","تعذر إنشاء الصوت: "+e.message);}
      status("4/5 اختيار المشاهد...");await searchMedia(topic);
      status("5/5 إنشاء الكابشن...");const caption=await generate("caption",topic,language,platform,tone,durationSeconds);state.caption=caption.text||"";setText("rmAutoCaption",state.caption);
      status("اكتمل الـWorkflow بنجاح.");
    }catch(e){status("خطأ: "+(e?.message||e));}finally{btn.disabled=false;}
  }

  const ready=()=>{mount();installSidebarButton();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
  new MutationObserver(installSidebarButton).observe(document.documentElement,{subtree:true,childList:true});
})();