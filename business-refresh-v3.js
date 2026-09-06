"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];
  const PROFILES_KEY = "reelsMaker.localProfiles.v1";
  const ACTIVE_PROFILE_KEY = "reelsMaker.activeLocalProfile.v1";
  const ACTIVE_PROJECT_KEY = "reelsMaker.activeProject.v1";
  const PROJECT_PREFIX = "reelsMaker.projects.v1.";
  let installed = false;
  let phoneTimer = 0;
  let phoneActive = "story";
  const phoneImages = {};

  function uid(prefix="id") { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function safeJson(raw, fallback) { try { return JSON.parse(raw); } catch { return fallback; } }
  function nowText(ts) { try { return new Intl.DateTimeFormat("ar-EG", {dateStyle:"medium", timeStyle:"short"}).format(new Date(ts)); } catch { return new Date(ts).toLocaleString(); } }

  function getProfiles() {
    let profiles = safeJson(localStorage.getItem(PROFILES_KEY) || "[]", []);
    if (!Array.isArray(profiles)) profiles = [];
    if (!profiles.length) {
      profiles = [{ id: uid("profile"), name: "ملف العمل على هذا الجهاز", createdAt: Date.now() }];
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      localStorage.setItem(ACTIVE_PROFILE_KEY, profiles[0].id);
    }
    return profiles;
  }

  function activeProfile() {
    const profiles = getProfiles();
    const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const p = profiles.find(x => x.id === id) || profiles[0];
    if (p?.id !== id) localStorage.setItem(ACTIVE_PROFILE_KEY, p.id);
    return p;
  }

  function projectKey(profileId = activeProfile().id) { return PROJECT_PREFIX + profileId; }
  function getProjects() {
    const list = safeJson(localStorage.getItem(projectKey()) || "[]", []);
    return Array.isArray(list) ? list : [];
  }
  function setProjects(list) { localStorage.setItem(projectKey(), JSON.stringify(list.slice(0,80))); }

  function currentStorySnapshot() {
    const story = qid("ssStory")?.value?.trim() || "";
    const topic = qid("ssTopic")?.value?.trim() || "";
    if (!story && !topic) return null;
    const pro = safeJson(sessionStorage.getItem("reelsMaker.storyPro.v1") || "{}", {});
    return {
      type: "story",
      title: topic || story.slice(0,46) || "قصة جديدة",
      description: story.slice(0,120),
      data: {
        topic,
        story,
        length: qid("ssLength")?.value || "medium",
        style: qid("ssStyle")?.value || "cartoon3d",
        format: pro.format || "portrait",
        quality: pro.quality || "720",
        voice: pro.voice || "Kore"
      }
    };
  }

  function currentQuranSnapshot() {
    if (!qid("quranStudio")?.classList.contains("open")) return null;
    const surah = qid("qrSurah");
    if (!surah) return null;
    const surahName = surah.options?.[surah.selectedIndex]?.textContent?.trim() || "ريل قرآن";
    return {
      type: "quran",
      title: surahName,
      description: `من الآية ${qid("qrFrom")?.value || 1} إلى ${qid("qrTo")?.value || 1}`,
      data: {
        surah: surah.value,
        from: qid("qrFrom")?.value,
        to: qid("qrTo")?.value,
        reciter: qid("qrReciter")?.value,
        font: qid("qrFont")?.value,
        color: qid("qrColor")?.value,
        size: qid("qrSize")?.value,
        position: qid("qrPosition")?.value,
        quality: qid("qrQuality")?.value,
        fps: qid("qrFps")?.value
      }
    };
  }

  function detectSnapshot() {
    return currentQuranSnapshot() || currentStorySnapshot();
  }

  function autosave() {
    const snap = detectSnapshot();
    if (!snap) return;
    const profile = activeProfile();
    const scopedActive = safeJson(localStorage.getItem(ACTIVE_PROJECT_KEY) || "{}", {});
    let id = scopedActive.profileId === profile.id ? scopedActive.projectId : null;
    let list = getProjects();
    let item = id ? list.find(x => x.id === id && x.type === snap.type) : null;
    if (!item) {
      item = { id: uid("project"), type: snap.type, createdAt: Date.now(), updatedAt: Date.now(), ...snap };
      list.unshift(item);
      localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify({ profileId: profile.id, projectId: item.id }));
    } else {
      item.title = snap.title; item.description = snap.description; item.data = snap.data; item.updatedAt = Date.now();
      list = [item, ...list.filter(x => x.id !== item.id)];
    }
    setProjects(list);
    renderProjects();
  }

  function startNewStoryProject() {
    const p = activeProfile();
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify({ profileId:p.id, projectId:null }));
    ["ssTopic","ssStory"].forEach(id => { const el=qid(id); if (el) { el.value=""; el.dispatchEvent(new Event("input",{bubbles:true})); } });
    const len=qid("ssLength"); if(len){len.value="medium";len.dispatchEvent(new Event("change",{bubbles:true}));}
    const style=qid("ssStyle"); if(style){style.value="cartoon3d";style.dispatchEvent(new Event("change",{bubbles:true}));}
    closeProjects();
    openStoryStudio();
  }

  function createProjectOverlay() {
    if (qid("rmProjects")) return;
    const root = document.createElement("div");
    root.id = "rmProjects";
    root.className = "rm-projects";
    root.innerHTML = `
      <section class="rm-projects-shell">
        <header class="rm-projects-head">
          <div><h2>مشاريعي</h2><p>كل ملف عمل على هذا الجهاز له مشاريعه المنفصلة والحفظ يتم تلقائيًا.</p></div>
          <button class="rm-pbtn primary" id="rmNewStory" type="button">＋ مشروع قصة جديد</button>
          <button class="rm-pbtn" id="rmProjectsClose" type="button">×</button>
        </header>
        <div class="rm-projects-body">
          <div class="rm-workspace">
            <label><span>ملف العمل الحالي</span><select id="rmProfileSelect"></select></label>
            <button class="rm-pbtn" id="rmNewProfile" type="button">＋ مستخدم/ملف عمل</button>
            <button class="rm-pbtn" id="rmRenameProfile" type="button">تغيير الاسم</button>
          </div>
          <div id="rmProjectGrid" class="rm-project-grid"></div>
        </div>
      </section>`;
    document.body.appendChild(root);
    qid("rmProjectsClose").addEventListener("click", closeProjects);
    root.addEventListener("pointerdown", e => { if (e.target === root) closeProjects(); });
    qid("rmNewStory").addEventListener("click", startNewStoryProject);
    qid("rmNewProfile").addEventListener("click", () => {
      const name = prompt("اسم ملف العمل الجديد:", "مستخدم جديد")?.trim(); if (!name) return;
      const profiles = getProfiles(); const p={id:uid("profile"),name,createdAt:Date.now()}; profiles.push(p);
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); localStorage.setItem(ACTIVE_PROFILE_KEY,p.id); localStorage.removeItem(ACTIVE_PROJECT_KEY); renderProjects();
    });
    qid("rmRenameProfile").addEventListener("click", () => {
      const current=activeProfile(); const name=prompt("اسم ملف العمل:",current.name)?.trim(); if(!name)return;
      const profiles=getProfiles().map(p=>p.id===current.id?{...p,name}:p); localStorage.setItem(PROFILES_KEY,JSON.stringify(profiles)); renderProjects();
    });
    qid("rmProfileSelect").addEventListener("change", e => {
      localStorage.setItem(ACTIVE_PROFILE_KEY,e.target.value); localStorage.removeItem(ACTIVE_PROJECT_KEY); renderProjects();
    });
  }

  function openProjects() { createProjectOverlay(); renderProjects(); qid("rmProjects")?.classList.add("open"); document.body.style.overflow="hidden"; }
  function closeProjects() { qid("rmProjects")?.classList.remove("open"); document.body.style.overflow=""; }

  function renderProjects() {
    const root=qid("rmProjectGrid"), sel=qid("rmProfileSelect"); if(!root||!sel)return;
    const profiles=getProfiles(), current=activeProfile();
    sel.innerHTML=""; profiles.forEach(p=>sel.add(new Option(p.name,p.id))); sel.value=current.id;
    const list=getProjects(); root.innerHTML="";
    if(!list.length){root.innerHTML='<div class="rm-empty">لا توجد مشاريع في ملف العمل ده حتى الآن. أول ما تبدأ قصة أو ريل قرآن، الحفظ التلقائي هيظهر هنا.</div>';return;}
    list.forEach(item=>{
      const card=document.createElement("article");card.className="rm-project-card";
      const typeLabel=item.type==="quran"?"استوديو القرآن":"قصة مع فيديو";
      card.innerHTML=`<div class="rm-project-type">${typeLabel}</div><h3></h3><p></p><div class="rm-project-time"></div><div class="rm-project-actions"><button class="rm-pbtn primary" data-open>فتح</button><button class="rm-pbtn danger" data-del>حذف</button></div>`;
      card.querySelector("h3").textContent=item.title||"مشروع";card.querySelector("p").textContent=item.description||"";card.querySelector(".rm-project-time").textContent=`آخر حفظ: ${nowText(item.updatedAt||item.createdAt)}`;
      card.querySelector("[data-open]").addEventListener("click",()=>restoreProject(item));
      card.querySelector("[data-del]").addEventListener("click",()=>{if(!confirm("حذف المشروع؟"))return;setProjects(getProjects().filter(x=>x.id!==item.id));renderProjects();});
      root.appendChild(card);
    });
  }

  function openStoryStudio() {
    const homeStory=qs('[data-home-action="story"]'); if(homeStory){homeStory.click();return;}
    qs('[data-creator-open="story"]')?.click();
  }

  function restoreProject(item) {
    const profile=activeProfile(); localStorage.setItem(ACTIVE_PROJECT_KEY,JSON.stringify({profileId:profile.id,projectId:item.id})); closeProjects();
    if(item.type==="story"){
      openStoryStudio(); setTimeout(()=>{
        const d=item.data||{};
        [["ssTopic",d.topic],["ssStory",d.story],["ssLength",d.length],["ssStyle",d.style]].forEach(([id,v])=>{const el=qid(id);if(el&&v!=null){el.value=v;el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}));}});
        const pro={format:d.format||"portrait",quality:d.quality||"720",voice:d.voice||"Kore"};sessionStorage.setItem("reelsMaker.storyPro.v1",JSON.stringify(pro));
      },320); return;
    }
    if(item.type==="quran"){
      qs('[data-home-action="quran"]')?.click(); setTimeout(()=>{
        const d=item.data||{}; [["qrSurah",d.surah],["qrFrom",d.from],["qrTo",d.to],["qrReciter",d.reciter],["qrFont",d.font],["qrColor",d.color],["qrSize",d.size],["qrPosition",d.position],["qrQuality",d.quality],["qrFps",d.fps]].forEach(([id,v])=>{const el=qid(id);if(el&&v!=null){el.value=v;el.dispatchEvent(new Event("change",{bubbles:true}));}});
      },500);
    }
  }

  function installProjectButtons() {
    const header=qs(".home-header-actions"); if(header&&!qid("rmProjectsHomeBtn")){
      const b=document.createElement("button");b.id="rmProjectsHomeBtn";b.className="home-btn";b.type="button";b.textContent="▦ مشاريعي";b.addEventListener("click",openProjects);header.prepend(b);
    }
    const drawer=qs(".creator-drawer"); if(drawer&&!drawer.querySelector('[data-rm-projects]')){
      const b=document.createElement("button");b.type="button";b.className="creator-nav-btn";b.dataset.rmProjects="1";b.textContent="▦ مشاريعي";b.addEventListener("click",()=>{qid("creatorDrawerClose")?.click();openProjects();});
      const home=drawer.querySelector('[data-home-drawer="home"]'); (home||drawer.querySelector(".creator-drawer-head"))?.insertAdjacentElement("afterend",b);
    }
  }

  function installStoryNavigation() {
    const head=qs(".story-studio .ss-head"); if(!head||qid("ssHomeReturn"))return;
    const box=document.createElement("div");box.className="ss-head-actions";
    const home=document.createElement("button");home.id="ssHomeReturn";home.className="ss-home-btn";home.type="button";home.textContent="⌂ الرئيسية";home.addEventListener("click",()=>qs('[data-home-drawer="home"]')?.click());
    const close=qid("ssClose"); if(close){close.parentElement?.insertBefore(box,close);box.append(home);box.append(close);} else head.append(box);
  }

  function simplifyNarrator() {
    const select=qid("ssNarrator"); if(!select||select.dataset.simpleVoice==="1")return;
    const current=select.value; select.innerHTML="";
    select.add(new Option("راوي رجل", "Charon"));
    select.add(new Option("راوية امرأة", "Kore"));
    select.value=current==="Charon"?"Charon":"Kore";
    select.dataset.simpleVoice="1";
    select.dispatchEvent(new Event("change",{bubbles:true}));
    const label=select.closest("label")?.querySelector("span"); if(label) label.textContent="الراوي";
  }

  function removeHomeFloaters() { qsa(".home-float").forEach(el=>el.remove()); }

  function phoneTemplate() {
    return `<div class="hp3-device">
      <div class="hp3-island"></div>
      <div class="hp3-status"><strong>9:41</strong><span>5G  ▰  92%</span></div>
      <div class="hp3-body">
        <section class="hp3-screen active" data-hp3="story"><div class="hp3-media" data-media="story"></div><div class="hp3-top"><div class="hp3-brand"><i>R</i><span>Story</span></div><span class="hp3-state">Review</span></div><div class="hp3-copy"><b>قصة قصيرة جاهزة للمراجعة</b><p>مشاهد واقعية، تعليق صوتي ونص متزامن قبل المونتاج.</p><div class="hp3-meta"><span>9:16</span><span>راوي</span><span>8 مشاهد</span></div></div></section>
        <section class="hp3-screen hp3-quran" data-hp3="quran"><div class="hp3-media" data-media="quran"></div><div class="hp3-top"><div class="hp3-brand"><i>☪</i><span>Quran</span></div><span class="hp3-state">Live preview</span></div><div class="hp3-copy"><b>﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾</b><p>تلاوة متزامنة • خلفية فيديو • تصميم قابل للتعديل</p></div></section>
        <section class="hp3-screen" data-hp3="editor"><div class="hp3-media" data-media="editor"></div><div class="hp3-top"><div class="hp3-brand"><i>✂</i><span>Editor</span></div><span class="hp3-state">Timeline</span></div><div class="hp3-copy" style="bottom:72px"><b>مونتاج كامل داخل المتصفح</b><p>طبقات، نصوص، صوت، قص وتحكم مباشر في المشهد.</p></div><div class="hp3-editor-ui"><div class="hp3-track"></div><div class="hp3-wave"></div></div></section>
        <section class="hp3-screen" data-hp3="islamic"><div class="hp3-media" data-media="islamic"></div><div class="hp3-top"><div class="hp3-brand"><i>◎</i><span>Library</span></div><span class="hp3-state">Content</span></div><div class="hp3-copy"><b>مكتبة محتوى جاهزة للإنتاج</b><p>أحاديث، أذكار، أدعية وخلفيات تدخل مباشرة في التصميم.</p><div class="hp3-meta"><span>حديث</span><span>ذكر</span><span>دعاء</span></div></div></section>
        <div class="hp3-dots"><i class="hp3-dot active" data-dot="story"></i><i class="hp3-dot" data-dot="quran"></i><i class="hp3-dot" data-dot="editor"></i><i class="hp3-dot" data-dot="islamic"></i></div>
      </div></div>`;
  }

  function showPhone(name) {
    phoneActive=name; qsa("[data-hp3]").forEach(el=>el.classList.toggle("active",el.dataset.hp3===name)); qsa("[data-dot]").forEach(el=>el.classList.toggle("active",el.dataset.dot===name));
  }

  async function fetchPexelsImage(query) {
    try {
      const r=await fetch(`/api/pexels?query=${encodeURIComponent(query)}&per_page=8&page=${1+Math.floor(Math.random()*3)}`,{cache:"no-store"});const d=await r.json();
      const v=(d.videos||[]).find(x=>x.image); return v?.image||"";
    } catch { return ""; }
  }

  async function loadPhoneMedia() {
    const jobs={story:"cinematic family storytelling",quran:"mosque sunset islamic architecture",editor:"creative video editing studio",islamic:"quran mosque peaceful"};
    for(const [key,q] of Object.entries(jobs)){
      const img=await fetchPexelsImage(q); if(!img)continue; phoneImages[key]=img; qsa(`[data-media="${key}"]`).forEach(el=>el.style.backgroundImage=`url("${img.replace(/\"/g,"%22")}")`);
    }
  }

  function installPhone() {
    const phone=qs(".home-phone"); if(!phone||phone.dataset.businessV3==="1")return false;
    phone.dataset.businessV3="1"; phone.innerHTML=phoneTemplate(); removeHomeFloaters(); loadPhoneMedia();
    const order=["story","quran","editor","islamic"]; clearInterval(phoneTimer); phoneTimer=setInterval(()=>showPhone(order[(order.indexOf(phoneActive)+1)%order.length]),4200);
    qsa(".home-tool[data-home-action]").forEach(el=>el.addEventListener("mouseenter",()=>{const a=el.dataset.homeAction;if(order.includes(a))showPhone(a);}));
    return true;
  }

  function watch() {
    installPhone(); installProjectButtons(); installStoryNavigation(); simplifyNarrator();
    setTimeout(watch,500);
  }

  function install() {
    if(installed)return;installed=true;createProjectOverlay();watch();
    setInterval(autosave,2600);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&qid("rmProjects")?.classList.contains("open"))closeProjects();});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install); else install();
})();
