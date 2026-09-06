"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const STORE = "reelsMaker.storyStudio.v2";
  let installed = false;
  let busy = false;
  let drawerOpen = false;

  const project = {
    story: "",
    topic: "",
    length: "medium",
    style: "cartoon3d",
    voiceBlob: null,
    duration: 0,
    scenes: [],
    imageUris: [],
    movieBlob: null,
    movieUrl: null,
    seedBase: 0,
    captions: true,
    captionSize: 36,
    captionPosition: 76,
    transition: "fade",
    trimStart: 0,
    trimEnd: 0
  };

  function toastSafe(message, type = "ok") {
    if (typeof window.toast === "function") window.toast(message, type);
  }

  function saveState(open = null) {
    try {
      const data = {
        open: open == null ? qid("storyStudio")?.classList.contains("open") : !!open,
        topic: qid("ssTopic")?.value || project.topic,
        length: qid("ssLength")?.value || project.length,
        style: qid("ssStyle")?.value || project.style,
        story: qid("ssStory")?.value || project.story
      };
      sessionStorage.setItem(STORE, JSON.stringify(data));
    } catch {}
  }

  function loadState() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || "{}") || {}; }
    catch { return {}; }
  }

  function injectStyles() {
    if (qid("storyStudioV2Styles")) return;
    const style = document.createElement("style");
    style.id = "storyStudioV2Styles";
    style.textContent = `
      #islamicContentLaunch{display:none!important}
      .creator-menu-btn{min-height:38px!important;padding-inline:13px!important}
      .creator-drawer-mask{display:none;position:fixed;inset:0;z-index:2600;background:rgba(2,5,9,.62);backdrop-filter:blur(3px)}
      .creator-drawer-mask.open{display:block}.creator-drawer{position:absolute;right:0;top:0;bottom:0;width:min(330px,88vw);background:#0b1017;border-left:1px solid rgba(255,255,255,.08);padding:18px;direction:rtl;box-shadow:-20px 0 70px rgba(0,0,0,.45)}
      .creator-drawer-head{display:flex;align-items:center;gap:10px;margin-bottom:18px}.creator-drawer-head b{flex:1;font:800 16px Cairo,sans-serif;color:#fff}.creator-drawer-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#121a25;color:#fff;font-size:20px;cursor:pointer}
      .creator-nav-btn{width:100%;min-height:54px;margin-bottom:8px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:#101720;color:#dfe6ef;text-align:right;padding:0 14px;font:700 11px Cairo,sans-serif;cursor:pointer}
      .creator-nav-btn.primary{background:linear-gradient(135deg,rgba(122,91,255,.2),rgba(44,205,156,.12));border-color:rgba(122,91,255,.32);color:#fff}
      .story-studio{display:none;position:fixed;inset:0;z-index:2400;background:#070b10;color:#fff;direction:rtl;font-family:Cairo,Tajawal,sans-serif}
      .story-studio.open{display:grid;grid-template-columns:230px 1fr}
      .ss-side{background:#0a0f16;border-left:1px solid rgba(255,255,255,.08);padding:14px;overflow:auto}.ss-brand{display:flex;align-items:center;gap:9px;margin-bottom:16px}.ss-logo{width:42px;height:42px;border-radius:13px;background:linear-gradient(135deg,#7b5cff,#29c799);display:grid;place-items:center;font-size:20px}.ss-brand b{font-size:13px}.ss-brand span{display:block;font-size:8px;color:#8090a5;margin-top:2px}
      .ss-side .creator-nav-btn{min-height:48px}.ss-side .creator-nav-btn.active{background:rgba(122,91,255,.14);border-color:rgba(122,91,255,.3);color:#fff}
      .ss-main{min-width:0;overflow:auto}.ss-head{position:sticky;top:0;z-index:5;height:64px;background:rgba(8,12,18,.94);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;padding:0 18px;gap:10px}.ss-head h2{margin:0;font-size:17px;flex:1}.ss-head p{margin:0;color:#7f8ca0;font-size:8px}.ss-close{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#121a25;color:#fff;font-size:20px;cursor:pointer}
      .ss-content{padding:18px;max-width:1180px;margin:auto}.ss-card{border:1px solid rgba(255,255,255,.09);border-radius:18px;background:#0e151e;padding:16px;margin-bottom:14px}.ss-title{font-size:18px;margin:0 0 5px}.ss-sub{font-size:9px;line-height:1.8;color:#8391a5;margin:0 0 14px}.ss-grid3{display:grid;grid-template-columns:1fr 170px 190px;gap:9px}.ss-field{display:flex;flex-direction:column;gap:6px}.ss-field span{font-size:8px;color:#8e9aad;font-weight:700}.ss-field input,.ss-field select,.ss-field textarea{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#090f16;color:#fff;padding:10px;font:600 10px Cairo,sans-serif;outline:none}.ss-field textarea{min-height:220px;resize:vertical;font-family:Amiri,"Noto Naskh Arabic",serif;font-size:18px;line-height:1.9}.ss-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.ss-btn{min-height:40px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#151d28;color:#e7edf5;padding:0 13px;font:800 9px Cairo,sans-serif;cursor:pointer}.ss-btn:disabled{opacity:.55;cursor:wait}.ss-btn.primary{background:linear-gradient(135deg,#7657ff,#9c65ff);border-color:transparent}.ss-btn.green{background:linear-gradient(135deg,#21b98a,#36cda0);border-color:transparent;color:#06130f}.ss-btn.danger{color:#ff9aaa;border-color:rgba(255,85,107,.25)}
      .ss-progress{display:none;margin-top:12px}.ss-progress.show{display:block}.ss-progress-line{height:7px;border-radius:99px;background:#171f2a;overflow:hidden}.ss-progress-line i{display:block;width:0;height:100%;background:linear-gradient(90deg,#7657ff,#35cda0);transition:.18s width}.ss-progress-text{font-size:9px;color:#99a7ba;margin-top:7px}
      .ss-review{display:none}.ss-review.show{display:block}.ss-review-grid{display:grid;grid-template-columns:minmax(280px,430px) 1fr;gap:16px}.ss-video-wrap{background:#05080d;border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:12px;position:sticky;top:80px;align-self:start}.ss-video-wrap video{display:block;width:100%;max-height:72vh;background:#000;border-radius:13px;aspect-ratio:9/16}.ss-review-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.ss-mini{border:1px solid rgba(255,255,255,.09);border-radius:12px;background:#0b1119;padding:9px}.ss-mini span{display:block;font-size:8px;color:#8491a5;margin-bottom:5px}.ss-mini input,.ss-mini select{width:100%;min-height:34px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#111925;color:#fff;padding:0 8px;font:700 9px Cairo,sans-serif}.ss-check{display:flex;align-items:center;gap:7px;font-size:9px;color:#dfe6ef}.ss-check input{width:auto}.ss-scenes h3{margin:0 0 9px;font-size:14px}.ss-scene{display:grid;grid-template-columns:122px 1fr;gap:10px;border:1px solid rgba(255,255,255,.08);background:#0d141d;border-radius:14px;padding:10px;margin-bottom:9px}.ss-scene img{width:122px;height:174px;object-fit:cover;border-radius:10px;background:#111}.ss-scene textarea{width:100%;min-height:74px;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:#080e15;color:#fff;padding:8px;font:600 10px/1.7 Cairo,sans-serif;resize:vertical}.ss-scene-meta{font-size:8px;color:#8390a3;margin:4px 0 7px}.ss-scene-actions{display:flex;gap:6px;flex-wrap:wrap}.ss-scene .ss-btn{min-height:34px;font-size:8px;padding-inline:9px}.ss-note{font-size:8px;color:#7f8b9e;line-height:1.9;margin-top:8px}
      @media(max-width:900px){.story-studio.open{grid-template-columns:1fr}.ss-side{display:none}.ss-content{padding:12px}.ss-grid3{grid-template-columns:1fr}.ss-review-grid{grid-template-columns:1fr}.ss-video-wrap{position:static}.ss-review-controls{grid-template-columns:1fr 1fr}.ss-head p{display:none}.ss-scene{grid-template-columns:92px 1fr}.ss-scene img{width:92px;height:132px}}
    `;
    document.head.appendChild(style);
  }

  function injectDrawer() {
    if (qid("creatorDrawerMask")) return;
    const mask = document.createElement("div");
    mask.id = "creatorDrawerMask";
    mask.className = "creator-drawer-mask";
    mask.innerHTML = `
      <aside class="creator-drawer">
        <div class="creator-drawer-head"><b>الأقسام</b><button id="creatorDrawerClose" class="creator-drawer-close" type="button">×</button></div>
        <button class="creator-nav-btn primary" data-creator-open="story" type="button">🎬 قصة مع فيديو</button>
        <button class="creator-nav-btn" data-creator-open="islamic" type="button">☪ المحتوى الإسلامي</button>
        <button class="creator-nav-btn" data-creator-open="editor" type="button">✂️ محرر ومونتاج الفيديو</button>
      </aside>`;
    document.body.appendChild(mask);
    qid("creatorDrawerClose")?.addEventListener("click", closeDrawer);
    mask.addEventListener("pointerdown", event => { if (event.target === mask) closeDrawer(); });
    mask.querySelectorAll("[data-creator-open]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.creatorOpen)));
  }

  function injectLauncher() {
    if (qid("creatorMenuLaunch")) return;
    const actions = document.querySelector(".topbar .actions");
    if (!actions) return;
    const btn = document.createElement("button");
    btn.id = "creatorMenuLaunch";
    btn.type = "button";
    btn.className = "btn creator-menu-btn";
    btn.textContent = "☰ الأقسام";
    btn.addEventListener("click", openDrawer);
    actions.prepend(btn);
  }

  function openDrawer() {
    drawerOpen = true;
    qid("creatorDrawerMask")?.classList.add("open");
  }

  function closeDrawer() {
    drawerOpen = false;
    qid("creatorDrawerMask")?.classList.remove("open");
  }

  function navigate(target) {
    closeDrawer();
    if (target === "story") return openStoryStudio();
    if (target === "islamic") {
      closeStoryStudio(false);
      const lib = qid("islamicContentLibrary");
      if (lib) {
        lib.classList.add("open");
        document.body.style.overflow = "hidden";
      } else qid("islamicContentLaunch")?.click();
      return;
    }
    if (target === "editor") {
      closeStoryStudio(false);
      qid("icClose")?.click();
    }
  }

  function injectStoryStudio() {
    if (qid("storyStudio")) return;
    const root = document.createElement("div");
    root.id = "storyStudio";
    root.className = "story-studio";
    root.innerHTML = `
      <aside class="ss-side">
        <div class="ss-brand"><div class="ss-logo">🎬</div><div><b>Story Studio</b><span>صناعة قصة كاملة بالفيديو</span></div></div>
        <button class="creator-nav-btn active" type="button">🎬 قصة مع فيديو</button>
        <button class="creator-nav-btn" data-ss-nav="islamic" type="button">☪ المحتوى الإسلامي</button>
        <button class="creator-nav-btn" data-ss-nav="editor" type="button">✂️ محرر الفيديو</button>
      </aside>
      <main class="ss-main">
        <header class="ss-head"><div><h2>قصة مع فيديو</h2><p>نص → مشاهد متناسقة → صوت → مونتاج → مراجعة قبل المحرر</p></div><button id="ssClose" class="ss-close" type="button">×</button></header>
        <div class="ss-content">
          <section id="ssCreatePane" class="ss-card">
            <h3 class="ss-title">إنشاء القصة</h3><p class="ss-sub">اكتب قصتك بنفسك أو اكتب موضوعًا ودع النظام يولد النص، ثم ينشئ مشاهد متعددة متناسقة ويزامنها مع الصوت.</p>
            <div class="ss-grid3">
              <label class="ss-field"><span>موضوع القصة</span><input id="ssTopic" type="text" placeholder="مثال: الصدق والأمانة، بر الوالدين، المغامرة..."></label>
              <label class="ss-field"><span>طول القصة</span><select id="ssLength"><option value="short">قصيرة ~45 ثانية</option><option value="medium" selected>متوسطة ~70–100 ثانية</option><option value="long">كاملة 2–3 دقائق</option></select></label>
              <label class="ss-field"><span>شكل المشاهد</span><select id="ssStyle"><option value="cartoon3d" selected>كرتوني 3D سينمائي</option><option value="cartoon2d">رسوم 2D</option><option value="realistic">سينمائي واقعي</option></select></label>
            </div>
            <div class="ss-actions"><button id="ssGenerateText" class="ss-btn" type="button">✦ توليد نص القصة</button></div>
            <label class="ss-field" style="margin-top:10px"><span>نص القصة الكامل</span><textarea id="ssStory" placeholder="اكتب القصة هنا أو اضغط «توليد نص القصة»..."></textarea></label>
            <div class="ss-actions"><button id="ssBuildVideo" class="ss-btn primary" type="button">🎬 إنشاء قصة مع فيديو</button></div>
            <div id="ssProgress" class="ss-progress"><div class="ss-progress-line"><i id="ssProgressBar"></i></div><div id="ssProgressText" class="ss-progress-text"></div></div>
          </section>

          <section id="ssReviewPane" class="ss-review">
            <div class="ss-card"><h3 class="ss-title">مراجعة الفيديو قبل المحرر</h3><p class="ss-sub">شاهد النتيجة هنا أولًا. لو مناسبة حمّلها مباشرة، ولو محتاجة شغل افتح المونتاج أو عدّل المشاهد ثم أعد التركيب.</p></div>
            <div class="ss-review-grid">
              <div class="ss-video-wrap">
                <video id="ssPreview" controls playsinline></video>
                <div class="ss-actions">
                  <button id="ssDownload" class="ss-btn green" type="button">⬇ تحميل الفيديو</button>
                  <button id="ssMontage" class="ss-btn primary" type="button">✂️ مونتاج الفيديو</button>
                  <button id="ssRebuild" class="ss-btn" type="button">↻ إعادة تركيب</button>
                  <button id="ssBackEdit" class="ss-btn" type="button">← تعديل القصة</button>
                </div>
                <div class="ss-review-controls">
                  <label class="ss-mini"><span>النص على الفيديو</span><label class="ss-check"><input id="ssCaptions" type="checkbox" checked> إظهار الترجمة</label></label>
                  <label class="ss-mini"><span>حجم النص</span><select id="ssCaptionSize"><option value="30">صغير</option><option value="36" selected>متوسط</option><option value="42">كبير</option></select></label>
                  <label class="ss-mini"><span>مكان النص</span><select id="ssCaptionPos"><option value="66">منتصف سفلي</option><option value="76" selected>أسفل</option><option value="84">أسفل جدًا</option></select></label>
                  <label class="ss-mini"><span>الانتقالات</span><select id="ssTransition"><option value="fade" selected>Fade ناعم</option><option value="cut">قص مباشر</option><option value="soft">حركة ناعمة</option></select></label>
                  <label class="ss-mini"><span>بداية القص (ث)</span><input id="ssTrimStart" type="number" min="0" step="0.1" value="0"></label>
                  <label class="ss-mini"><span>نهاية القص (ث)</span><input id="ssTrimEnd" type="number" min="1" step="0.1" value="0"></label>
                </div>
                <div class="ss-note">تعديل القص/النص/الانتقال يحتاج الضغط على «إعادة تركيب». زر «مونتاج الفيديو» يرسل النسخة الحالية للمحرر الكامل.</div>
              </div>
              <div class="ss-scenes"><h3>المشاهد</h3><div id="ssScenes"></div></div>
            </div>
          </section>
        </div>
      </main>`;
    document.body.appendChild(root);

    qid("ssClose")?.addEventListener("click", () => closeStoryStudio(true));
    root.querySelectorAll("[data-ss-nav]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.ssNav)));
    qid("ssGenerateText")?.addEventListener("click", generateStoryText);
    qid("ssBuildVideo")?.addEventListener("click", buildStoryVideo);
    qid("ssDownload")?.addEventListener("click", downloadCurrentMovie);
    qid("ssMontage")?.addEventListener("click", sendToMontage);
    qid("ssRebuild")?.addEventListener("click", rebuildFromReview);
    qid("ssBackEdit")?.addEventListener("click", () => showCreatePane());
    ["ssTopic","ssLength","ssStyle","ssStory"].forEach(id => qid(id)?.addEventListener("input", () => saveState()));
    ["ssCaptions","ssCaptionSize","ssCaptionPos","ssTransition","ssTrimStart","ssTrimEnd"].forEach(id => qid(id)?.addEventListener("change", syncReviewSettings));
  }

  function restoreInputs() {
    const saved = loadState();
    if (saved.topic != null) qid("ssTopic").value = saved.topic;
    if (saved.length) qid("ssLength").value = saved.length;
    if (saved.style) qid("ssStyle").value = saved.style;
    if (saved.story != null) qid("ssStory").value = saved.story;
    project.topic = saved.topic || "";
    project.length = saved.length || "medium";
    project.style = saved.style || "cartoon3d";
    project.story = saved.story || "";
    if (saved.open) setTimeout(openStoryStudio, 50);
  }

  function openStoryStudio() {
    const root = qid("storyStudio");
    if (!root) return;
    qid("icClose")?.click();
    root.classList.add("open");
    document.body.style.overflow = "hidden";
    saveState(true);
  }

  function closeStoryStudio(remember = true) {
    qid("storyStudio")?.classList.remove("open");
    document.body.style.overflow = "";
    if (remember) saveState(false);
  }

  function setProgress(text, value = null) {
    const wrap = qid("ssProgress");
    if (wrap) wrap.classList.toggle("show", value != null);
    if (qid("ssProgressText")) qid("ssProgressText").textContent = text || "";
    if (qid("ssProgressBar") && value != null) qid("ssProgressBar").style.width = `${clamp(value, 0, 100)}%`;
  }

  function showCreatePane() {
    qid("ssCreatePane")?.scrollIntoView({ behavior: "smooth", block: "start" });
    qid("ssReviewPane")?.classList.remove("show");
  }

  function showReviewPane() {
    qid("ssReviewPane")?.classList.add("show");
    qid("ssReviewPane")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function generateStoryText() {
    if (busy) return;
    const btn = qid("ssGenerateText");
    const topic = qid("ssTopic")?.value?.trim() || "الصدق والأمانة";
    const length = qid("ssLength")?.value || "medium";
    busy = true;
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "جاري كتابة القصة...";
    setProgress("جاري توليد نص القصة...", 5);
    try {
      const response = await fetch("/api/story-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ topic, length })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.text) throw new Error(data.error || `HTTP ${response.status}`);
      qid("ssStory").value = String(data.text).trim();
      project.story = qid("ssStory").value;
      project.topic = topic;
      project.length = length;
      saveState();
      setProgress("تم إنشاء النص. راجعه ثم اضغط «إنشاء قصة مع فيديو».", null);
    } catch (error) {
      setProgress(`تعذر توليد النص: ${error?.message || error}`, null);
      toastSafe("تعذر إنشاء القصة الآن.", "error");
    } finally {
      busy = false;
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  async function createNarration(text) {
    setProgress("جاري إنشاء التعليق الصوتي...", 8);
    const response = await fetch("/api/story-voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ text, voice: "Kore" })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `تعذر إنشاء الصوت (${response.status})`);
    }
    return response.blob();
  }

  async function audioDuration(blob) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("AudioContext غير مدعوم.");
    const ac = new AC();
    try {
      await ac.resume().catch(() => {});
      const bytes = await blob.arrayBuffer();
      const buffer = await ac.decodeAudioData(bytes.slice(0));
      return buffer.duration;
    } finally {
      try { await ac.close(); } catch {}
    }
  }

  async function createStoryboard(story, duration) {
    project.style = qid("ssStyle")?.value || "cartoon3d";
    project.topic = qid("ssTopic")?.value?.trim() || "قصة عربية";
    const count = clamp(Math.round(duration / 4.7), 6, 18);
    setProgress(`جاري إخراج القصة إلى حوالي ${count} مشهد...`, 14);
    const response = await fetch("/api/story-scenes-v2", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ story, duration, count, topic: project.topic, style: project.style })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.scenes) || !data.scenes.length) throw new Error(data.error || "تعذر تجهيز المشاهد.");
    project.seedBase = Number(data.seedBase || Date.now() % 900000000);
    return data.scenes.map(scene => ({ ...scene, regen: 0 }));
  }

  function fallbackSceneDataUri(index, text = "") {
    const c = document.createElement("canvas");
    c.width = 720; c.height = 1280;
    const x = c.getContext("2d");
    const palettes = [["#0d2130","#24586b"],["#21172d","#65416a"],["#142a20","#497055"],["#2d1d12","#785336"],["#10172d","#3c4f7c"]];
    const p = palettes[index % palettes.length];
    const g = x.createLinearGradient(0,0,720,1280); g.addColorStop(0,p[0]); g.addColorStop(1,p[1]);
    x.fillStyle = g; x.fillRect(0,0,720,1280);
    x.globalAlpha = .16; x.fillStyle = "#fff";
    for (let i=0;i<16;i++){x.beginPath();x.arc((i*151)%720,(i*211)%1280,24+(i%5)*15,0,Math.PI*2);x.fill();}
    x.globalAlpha = 1;
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(0,1000,720,280);
    x.fillStyle = "#fff"; x.font = "700 28px Cairo, sans-serif"; x.textAlign="center"; x.direction="rtl";
    const words = String(text||"").split(/\s+/).slice(0,10).join(" "); x.fillText(words || `المشهد ${index+1}`,360,1130,610);
    return c.toDataURL("image/jpeg", .88);
  }

  async function generateSceneImage(scene, index, retry = false) {
    const seed = project.seedBase + (scene.regen || 0) * 101;
    try {
      const response = await fetch("/api/story-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ prompt: scene.prompt, seed })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.image) return data.image;
      if (!retry) {
        scene.regen = (scene.regen || 0) + 1;
        return generateSceneImage(scene, index, true);
      }
    } catch {}
    return project.imageUris[index - 1] || fallbackSceneDataUri(index, scene.displayText || scene.narration);
  }

  async function createImages(scenes) {
    const images = new Array(scenes.length);
    let cursor = 0, done = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= scenes.length) return;
        images[index] = await generateSceneImage(scenes[index], index, false);
        done++;
        setProgress(`تم تجهيز المشهد ${done} من ${scenes.length}...`, 18 + (done / scenes.length) * 38);
      }
    }
    await Promise.all([worker(), worker()]);
    return images;
  }

  function computeTimeline(scenes, duration) {
    const weights = scenes.map(scene => clamp(Math.sqrt(Math.max(4, Number(scene.weight) || 8)), 2.2, 5.5));
    const total = weights.reduce((a,b)=>a+b,0) || 1;
    let durations = weights.map(w => clamp(duration * w / total, 3.2, 7.5));
    const sum = durations.reduce((a,b)=>a+b,0) || 1;
    const factor = duration / sum;
    durations = durations.map(d => d * factor);
    let cursor = 0;
    scenes.forEach((scene, i) => {
      scene.start = cursor;
      scene.duration = durations[i];
      scene.end = cursor + durations[i];
      cursor = scene.end;
    });
    if (scenes.length) scenes[scenes.length - 1].end = duration;
  }

  function splitDisplayText(text) {
    const words = String(text || "").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
    const chunks = [];
    let current = [];
    for (const word of words) {
      current.push(word);
      const punct = /[.!؟؛,:،]$/.test(word);
      if (current.length >= 8 || (punct && current.length >= 4)) { chunks.push(current.join(" ")); current=[]; }
    }
    if (current.length) chunks.push(current.join(" "));
    return chunks.length ? chunks : [String(text||"")];
  }

  function syncSceneSubtitles() {
    project.scenes.forEach(scene => { scene.subtitles = splitDisplayText(scene.displayText || scene.narration); });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.decoding = "async";
      img.onload = () => resolve(img); img.onerror = reject; img.src = src;
    });
  }

  function drawCover(ctx, img, width, height, zoom = 1, panX = 0, panY = 0) {
    const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
    const scale = Math.max(width/iw,height/ih) * zoom;
    const dw = iw*scale, dh = ih*scale;
    ctx.drawImage(img,(width-dw)/2+panX,(height-dh)/2+panY,dw,dh);
  }

  function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}

  function wrapTwoLines(ctx, text, maxWidth) {
    const words = String(text||"").split(/\s+/).filter(Boolean);
    const lines=[]; let line="";
    for(const word of words){const next=line?`${line} ${word}`:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}
    if(line)lines.push(line);
    if(lines.length<=2)return lines;
    const all=words; const mid=Math.ceil(all.length/2); return [all.slice(0,mid).join(" "),all.slice(mid).join(" ")].filter(Boolean);
  }

  function drawCaption(ctx,text,w,h){
    if(!project.captions)return;
    const value=String(text||"").trim(); if(!value)return;
    let size=project.captionSize||36; const maxW=w*.82;
    ctx.direction="rtl";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`800 ${size}px Cairo,Tajawal,sans-serif`;
    let lines=wrapTwoLines(ctx,value,maxW);
    while(lines.some(line=>ctx.measureText(line).width>maxW)&&size>26){size-=2;ctx.font=`800 ${size}px Cairo,Tajawal,sans-serif`;lines=wrapTwoLines(ctx,value,maxW);}
    const lineH=size*1.5, boxH=lines.length*lineH+30, centerY=h*(project.captionPosition/100), y=centerY-boxH/2;
    ctx.fillStyle="rgba(0,0,0,.56)";roundRect(ctx,w*.07,y,w*.86,boxH,20);ctx.fill();
    ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,.9)";ctx.shadowBlur=8;
    const start=y+15+lineH/2;lines.slice(0,2).forEach((line,i)=>ctx.fillText(line,w/2,start+i*lineH,maxW));ctx.shadowBlur=0;
  }

  function sceneAt(time) {
    return project.scenes.findIndex(scene => time >= scene.start && time < scene.end) >= 0
      ? project.scenes.findIndex(scene => time >= scene.start && time < scene.end)
      : Math.max(0, project.scenes.length - 1);
  }

  function subtitleAt(scene, time) {
    const chunks = scene.subtitles?.length ? scene.subtitles : [scene.displayText || scene.narration || ""];
    const local = clamp((time - scene.start) / Math.max(.01, scene.duration), 0, .9999);
    return chunks[Math.min(chunks.length - 1, Math.floor(local * chunks.length))] || "";
  }

  function chooseMime() {
    const types=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
    return types.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||"";
  }

  async function decodeAudio(blob, ac) {
    const bytes=await blob.arrayBuffer(); return ac.decodeAudioData(bytes.slice(0));
  }

  async function renderMovie() {
    if(!window.MediaRecorder)throw new Error("المتصفح لا يدعم تركيب الفيديو. استخدم Chrome أو Edge حديثًا.");
    syncSceneSubtitles();
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error("AudioContext غير مدعوم.");
    const ac=new AC();await ac.resume().catch(()=>{});
    const audioBuffer=await decodeAudio(project.voiceBlob,ac);
    project.duration=audioBuffer.duration;computeTimeline(project.scenes,project.duration);
    const images=await Promise.all(project.imageUris.map((uri,index)=>loadImage(uri).catch(()=>loadImage(fallbackSceneDataUri(index,project.scenes[index]?.displayText)))));
    const canvas=document.createElement("canvas");canvas.width=720;canvas.height=1280;const ctx=canvas.getContext("2d",{alpha:false});
    const startTrim=clamp(Number(project.trimStart)||0,0,Math.max(0,project.duration-.5));
    const endTrim=clamp(Number(project.trimEnd)||project.duration,startTrim+.5,project.duration);
    const outputDuration=endTrim-startTrim;

    const drawFrame=globalT=>{
      const idx=sceneAt(globalT), scene=project.scenes[idx], img=images[idx]||images[Math.max(0,idx-1)];
      const local=clamp((globalT-scene.start)/Math.max(.01,scene.duration),0,1);
      ctx.save();ctx.fillStyle="#0a0d12";ctx.fillRect(0,0,canvas.width,canvas.height);
      const zoom=1.025+local*.055;const panX=Math.sin((idx+1)*1.37)*14*local;const panY=-13*local;
      drawCover(ctx,img,canvas.width,canvas.height,zoom,panX,panY);
      if(project.transition!=="cut"&&idx<images.length-1&&local>.86){const f=(local-.86)/.14;ctx.globalAlpha=project.transition==="soft"?f*.72:f;drawCover(ctx,images[idx+1],canvas.width,canvas.height,1.025,0,0);ctx.globalAlpha=1;}
      const shade=ctx.createLinearGradient(0,0,0,canvas.height);shade.addColorStop(0,"rgba(0,0,0,.05)");shade.addColorStop(.6,"rgba(0,0,0,.02)");shade.addColorStop(1,"rgba(0,0,0,.32)");ctx.fillStyle=shade;ctx.fillRect(0,0,canvas.width,canvas.height);
      drawCaption(ctx,subtitleAt(scene,globalT),canvas.width,canvas.height);ctx.restore();
    };

    drawFrame(startTrim);
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const stream=canvas.captureStream(30);const dest=ac.createMediaStreamDestination();const src=ac.createBufferSource();src.buffer=audioBuffer;src.connect(dest);dest.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
    const mime=chooseMime(),chunks=[];const recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:5_800_000}:{videoBitsPerSecond:5_800_000});recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};const stopped=new Promise((res,rej)=>{recorder.onstop=res;recorder.onerror=e=>rej(e.error||e);});
    recorder.start(400);const startAt=ac.currentTime+.06;src.start(startAt,startTrim,outputDuration);
    while(true){const t=ac.currentTime-startAt;if(t>=outputDuration)break;const safe=Math.max(0,t);drawFrame(startTrim+safe);setProgress(`جاري تركيب الفيديو... ${Math.round((safe/outputDuration)*100)}%`,62+(safe/outputDuration)*36);await sleep(30);}
    drawFrame(endTrim-.001);await sleep(80);try{src.stop();}catch{}if(recorder.state!=="inactive")recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());try{await ac.close();}catch{}
    return new Blob(chunks,{type:recorder.mimeType||mime||"video/webm"});
  }

  async function buildStoryVideo() {
    if(busy)return;const button=qid("ssBuildVideo");const story=qid("ssStory")?.value?.trim();if(!story)return toastSafe("اكتب أو ولّد نص القصة أولًا.","error");
    busy=true;button.disabled=true;const old=button.textContent;button.textContent="⏳ جاري إنشاء الفيديو...";qid("ssReviewPane")?.classList.remove("show");
    try{
      project.story=story;project.topic=qid("ssTopic")?.value?.trim()||"قصة عربية";project.length=qid("ssLength")?.value||"medium";project.style=qid("ssStyle")?.value||"cartoon3d";saveState();
      project.voiceBlob=await createNarration(story);project.duration=await audioDuration(project.voiceBlob);if(!Number.isFinite(project.duration)||project.duration<2)throw new Error("لم أتمكن من قراءة مدة الصوت.");
      project.scenes=await createStoryboard(story,project.duration);project.imageUris=await createImages(project.scenes);computeTimeline(project.scenes,project.duration);project.trimStart=0;project.trimEnd=project.duration;
      setProgress(`تم تجهيز ${project.scenes.length} مشهد. جاري المونتاج النهائي...`,60);project.movieBlob=await renderMovie();showReview();setProgress("تم إنشاء الفيديو. راجعه قبل فتح المحرر ✅",100);setTimeout(()=>setProgress("",null),900);
    }catch(error){console.error(error);setProgress(`تعذر إنشاء الفيديو: ${error?.message||error}`,null);toastSafe(`تعذر إنشاء الفيديو: ${error?.message||error}`,"error");}
    finally{busy=false;button.disabled=false;button.textContent=old;}
  }

  function revokeMovieUrl(){if(project.movieUrl){try{URL.revokeObjectURL(project.movieUrl);}catch{}project.movieUrl=null;}}

  function showReview(){
    revokeMovieUrl();project.movieUrl=URL.createObjectURL(project.movieBlob);const video=qid("ssPreview");video.src=project.movieUrl;video.load();
    qid("ssCaptions").checked=project.captions;qid("ssCaptionSize").value=String(project.captionSize);qid("ssCaptionPos").value=String(project.captionPosition);qid("ssTransition").value=project.transition;qid("ssTrimStart").value=String(project.trimStart.toFixed(1));qid("ssTrimEnd").value=String(project.trimEnd.toFixed(1));qid("ssTrimEnd").max=String(project.duration.toFixed(1));qid("ssTrimStart").max=String(Math.max(0,project.duration-.5).toFixed(1));
    renderSceneCards();showReviewPane();
  }

  function renderSceneCards(){
    const root=qid("ssScenes");if(!root)return;root.innerHTML="";project.scenes.forEach((scene,index)=>{
      const card=document.createElement("article");card.className="ss-scene";card.innerHTML=`<img alt="المشهد ${index+1}"><div><b>المشهد ${index+1}</b><div class="ss-scene-meta"></div><textarea></textarea><div class="ss-scene-actions"><button class="ss-btn" data-action="regen" type="button">↻ إعادة صورة المشهد</button></div></div>`;
      card.querySelector("img").src=project.imageUris[index];card.querySelector(".ss-scene-meta").textContent=`${scene.start?.toFixed?.(1)||"0.0"}ث — ${scene.end?.toFixed?.(1)||"0.0"}ث • ${scene.subtitles?.length||1} مقطع نصي`;
      const ta=card.querySelector("textarea");ta.value=scene.displayText||scene.narration||"";ta.addEventListener("input",()=>{scene.displayText=ta.value;scene.subtitles=splitDisplayText(ta.value);});
      card.querySelector('[data-action="regen"]').addEventListener("click",()=>regenerateScene(index,card));root.appendChild(card);
    });
  }

  async function regenerateScene(index,card){
    const scene=project.scenes[index];const btn=card.querySelector('[data-action="regen"]');btn.disabled=true;btn.textContent="جاري التوليد...";scene.regen=(scene.regen||0)+1;
    try{const uri=await generateSceneImage(scene,index,false);project.imageUris[index]=uri;card.querySelector("img").src=uri;toastSafe(`تم تحديث المشهد ${index+1}. اضغط «إعادة تركيب».`);}
    finally{btn.disabled=false;btn.textContent="↻ إعادة صورة المشهد";}
  }

  function syncReviewSettings(){
    project.captions=!!qid("ssCaptions")?.checked;project.captionSize=Number(qid("ssCaptionSize")?.value||36);project.captionPosition=Number(qid("ssCaptionPos")?.value||76);project.transition=qid("ssTransition")?.value||"fade";project.trimStart=clamp(Number(qid("ssTrimStart")?.value||0),0,Math.max(0,project.duration-.5));project.trimEnd=clamp(Number(qid("ssTrimEnd")?.value||project.duration),project.trimStart+.5,project.duration);
  }

  async function rebuildFromReview(){
    if(busy||!project.voiceBlob||!project.scenes.length)return;syncReviewSettings();busy=true;const btn=qid("ssRebuild");btn.disabled=true;const old=btn.textContent;btn.textContent="جاري إعادة التركيب...";setProgress("جاري إعادة تركيب الفيديو بالتعديلات...",62);
    try{project.movieBlob=await renderMovie();showReview();setProgress("تم تطبيق التعديلات ✅",100);setTimeout(()=>setProgress("",null),900);}catch(error){toastSafe(`تعذر إعادة التركيب: ${error?.message||error}`,"error");setProgress("",null);}finally{busy=false;btn.disabled=false;btn.textContent=old;}
  }

  function downloadCurrentMovie(){
    if(!project.movieBlob)return toastSafe("أنشئ الفيديو أولًا.","error");const ext=project.movieBlob.type.includes("mp4")?"mp4":"webm";const a=document.createElement("a");a.href=URL.createObjectURL(project.movieBlob);a.download=`story-video-${Date.now()}.${ext}`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
  }

  function sendToMontage(){
    if(!project.movieBlob)return toastSafe("أنشئ الفيديو أولًا.","error");const ext=project.movieBlob.type.includes("mp4")?"mp4":"webm";if(typeof window.loadVideoBlob!=="function")return toastSafe("المحرر غير جاهز الآن.","error");window.loadVideoBlob(project.movieBlob,`story-review-${Date.now()}.${ext}`);closeStoryStudio(true);if(typeof window.activateTab==="function")window.activateTab("video");toastSafe("تم إرسال الفيديو إلى المونتاج. النسخة الأصلية ما زالت متاحة للمراجعة عند الرجوع.");
  }

  function install(){
    if(installed)return;installed=true;injectStyles();injectDrawer();injectStoryStudio();
    const waitLauncher=()=>{injectLauncher();if(!qid("creatorMenuLaunch"))setTimeout(waitLauncher,120);};waitLauncher();restoreInputs();
    document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;if(drawerOpen)closeDrawer();else if(qid("storyStudio")?.classList.contains("open"))closeStoryStudio(true);});
  }

  if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",install);else install();
})();
