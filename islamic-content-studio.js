"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let installed = false;

  const HADITHS = [
    { text: "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى.", source: "متفق عليه" },
    { text: "المسلم من سلم المسلمون من لسانه ويده.", source: "متفق عليه" },
    { text: "لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه.", source: "متفق عليه" },
    { text: "من كان يؤمن بالله واليوم الآخر فليقل خيرًا أو ليصمت.", source: "متفق عليه" },
    { text: "الكلمة الطيبة صدقة.", source: "متفق عليه" },
    { text: "الدين النصيحة.", source: "رواه مسلم" },
    { text: "يسروا ولا تعسروا، وبشروا ولا تنفروا.", source: "متفق عليه" },
    { text: "الطهور شطر الإيمان.", source: "رواه مسلم" }
  ];

  const ADHKAR = [
    { text: "سبحان الله وبحمده، سبحان الله العظيم.", source: "ذكر صحيح" },
    { text: "لا حول ولا قوة إلا بالله.", source: "ذكر صحيح" },
    { text: "سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر.", source: "ذكر صحيح" },
    { text: "أستغفر الله وأتوب إليه.", source: "استغفار" },
    { text: "اللهم صل وسلم على نبينا محمد.", source: "صلاة على النبي ﷺ" },
    { text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", source: "القرآن الكريم — التوبة 129" }
  ];

  const DUAS = [
    { text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", source: "البقرة 201" },
    { text: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي", source: "طه 25–28" },
    { text: "رَبِّ زِدْنِي عِلْمًا", source: "طه 114" },
    { text: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ", source: "آل عمران 8" },
    { text: "رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ", source: "القصص 24" },
    { text: "رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ", source: "الممتحنة 4" }
  ];

  const CLIPS = [
    ["🕌 مساجد", "mosque islamic architecture"],
    ["🕋 مكة", "Mecca Kaaba vertical"],
    ["🌙 رمضان", "Ramadan lantern mosque vertical"],
    ["🌳 طبيعة هادئة", "peaceful green nature vertical"],
    ["💧 شلالات", "waterfall nature vertical"],
    ["☁️ سماء", "sky clouds sunset vertical"],
    ["📖 قرآن", "Quran book mosque vertical"],
    ["🌅 شروق", "sunrise mountains vertical" ]
  ];

  const ANIMATIONS = [
    ["هلال", "crescent moon islamic"],
    ["فانوس", "ramadan lantern"],
    ["نجوم", "sparkle stars"],
    ["مسجد", "mosque"],
    ["دعاء", "prayer hands"],
    ["قلب", "heart glow"]
  ];

  function wait() {
    try {
      if (installed) return;
      if (!document.querySelector(".topbar .actions") || typeof addTextLayer !== "function") return setTimeout(wait, 100);
      install();
    } catch {
      setTimeout(wait, 120);
    }
  }

  function injectStyles() {
    if (qid("islamicContentStyles")) return;
    const style = document.createElement("style");
    style.id = "islamicContentStyles";
    style.textContent = `
      .islamic-library{display:none;position:fixed;inset:0;z-index:1800;background:#080b11;color:#fff;font-family:Cairo,Tajawal,sans-serif;direction:rtl}
      .islamic-library.open{display:flex;flex-direction:column}
      .ic-head{height:66px;flex:0 0 66px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;padding:0 18px;background:#0b1017}
      .ic-head .ic-logo{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#2dc798,#775cff);font-size:19px}
      .ic-head-title{flex:1}.ic-head-title b{display:block;font-size:15px}.ic-head-title span{display:block;color:#8491a5;font-size:9px;margin-top:2px}
      .ic-close{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#111824;color:#fff;font-size:22px;cursor:pointer}
      .ic-shell{display:grid;grid-template-columns:220px 1fr;min-height:0;flex:1}
      .ic-tabs{padding:14px;border-left:1px solid rgba(255,255,255,.08);background:#0a0e15;overflow:auto}
      .ic-tab{width:100%;min-height:48px;border:1px solid transparent;border-radius:12px;background:transparent;color:#9ba7b8;text-align:right;padding:0 13px;margin-bottom:6px;font:700 11px Cairo,sans-serif;cursor:pointer}
      .ic-tab.active{background:rgba(45,199,152,.1);border-color:rgba(45,199,152,.25);color:#fff}
      .ic-body{overflow:auto;padding:20px 22px 28px}
      .ic-pane{display:none}.ic-pane.active{display:block}
      .ic-title{margin-bottom:15px}.ic-title h2{font-size:22px;margin:0 0 4px}.ic-title p{font-size:10px;color:#8290a4;margin:0;line-height:1.8}
      .ic-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:10px}
      .ic-card{border:1px solid rgba(255,255,255,.09);border-radius:14px;background:#101720;padding:13px;min-height:140px;display:flex;flex-direction:column}
      .ic-card-text{font-family:Amiri,"Noto Naskh Arabic",serif;font-size:18px;line-height:1.9;flex:1;color:#f5f7fb}
      .ic-card-source{font-size:8px;color:#7f8da2;margin-top:7px}
      .ic-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      .ic-btn{min-height:37px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#151d28;color:#dfe6ef;padding:0 10px;font:700 9px Cairo,sans-serif;cursor:pointer}
      .ic-btn.primary{background:linear-gradient(135deg,#20b989,#35cba0);border-color:transparent;color:#06130f}
      .ic-btn.ai{background:linear-gradient(135deg,#7657ff,#9a65ff);border-color:transparent;color:#fff}
      .ic-btn.danger{border-color:rgba(255,83,107,.25);color:#ff8da0}
      .ic-story-box,.ic-nasheed-box{max-width:780px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:#0f161f;padding:15px}
      .ic-row{display:grid;grid-template-columns:1fr auto auto;gap:8px}.ic-row input,.ic-row select,.ic-story-output{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#0a1018;color:#fff;padding:10px;font:600 10px Cairo,sans-serif;outline:none}
      .ic-story-output{min-height:180px;margin-top:10px;resize:vertical;font-family:Amiri,serif;font-size:18px;line-height:1.9}
      .ic-note{font-size:8px;color:#7f8c9f;line-height:1.8;margin-top:8px}
      .ic-upload{position:relative;display:flex;align-items:center;justify-content:center;min-height:88px;border:1px dashed rgba(45,199,152,.3);border-radius:13px;background:rgba(45,199,152,.05);cursor:pointer;margin-top:10px}
      .ic-upload input{position:absolute;inset:0;opacity:0;cursor:pointer}.ic-upload span{font-size:11px;color:#c9e9df}
      .ic-presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:9px;max-width:900px}
      .ic-preset{min-height:76px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:#101720;color:#fff;font:700 11px Cairo,sans-serif;cursor:pointer}
      .ic-preset:hover{border-color:rgba(125,92,255,.4);background:#141b28}
      .ic-quran-card{max-width:720px;border:1px solid rgba(45,199,152,.22);border-radius:17px;background:linear-gradient(135deg,rgba(45,199,152,.08),rgba(125,92,255,.07));padding:18px}
      .ic-quran-card h3{font-size:19px;margin:0 0 7px}.ic-quran-card p{font-size:10px;color:#9aa8ba;line-height:1.9}
      @media(max-width:800px){.ic-shell{grid-template-columns:1fr}.ic-tabs{display:flex;gap:6px;overflow-x:auto;border-left:0;border-bottom:1px solid rgba(255,255,255,.08);padding:8px}.ic-tab{width:auto;min-width:105px;margin:0;white-space:nowrap}.ic-body{padding:14px}.ic-grid{grid-template-columns:1fr}.ic-row{grid-template-columns:1fr}.ic-head{height:58px;flex-basis:58px;padding:0 10px}.ic-head-title span{display:none}}
    `;
    document.head.appendChild(style);
  }

  function injectLauncher() {
    if (qid("islamicContentLaunch")) return;
    const actions = document.querySelector(".topbar .actions");
    if (!actions) return;
    const button = document.createElement("button");
    button.id = "islamicContentLaunch";
    button.type = "button";
    button.className = "btn";
    button.innerHTML = "☪ <strong>محتوى إسلامي</strong>";
    button.addEventListener("click", openLibrary);
    actions.prepend(button);
  }

  function injectLibrary() {
    if (qid("islamicContentLibrary")) return;
    const root = document.createElement("div");
    root.id = "islamicContentLibrary";
    root.className = "islamic-library";
    root.innerHTML = `
      <header class="ic-head">
        <div class="ic-logo">☪</div>
        <div class="ic-head-title"><b>مكتبة المحتوى الإسلامي</b><span>قرآن • أحاديث • أذكار • أدعية • قصص • أناشيد • كليبات وأنيميشن</span></div>
        <button id="icClose" class="ic-close" type="button">×</button>
      </header>
      <div class="ic-shell">
        <nav class="ic-tabs">
          <button class="ic-tab active" data-ic-tab="quran">☪ القرآن</button>
          <button class="ic-tab" data-ic-tab="hadith">📜 أحاديث</button>
          <button class="ic-tab" data-ic-tab="adhkar">📿 أذكار</button>
          <button class="ic-tab" data-ic-tab="dua">🤲 أدعية</button>
          <button class="ic-tab" data-ic-tab="stories">📖 قصص</button>
          <button class="ic-tab" data-ic-tab="nasheed">🎙 أناشيد</button>
          <button class="ic-tab" data-ic-tab="clips">🎬 كليبات</button>
          <button class="ic-tab" data-ic-tab="animation">✨ أنيميشن</button>
        </nav>
        <main class="ic-body">
          <section class="ic-pane active" data-ic-pane="quran">
            <div class="ic-title"><h2>ريلز القرآن</h2><p>اختيار السورة والآيات والقارئ والتلاوة والخلفية والتصدير.</p></div>
            <div class="ic-quran-card"><h3>استوديو القرآن الكامل</h3><p>يفتح نفس الاستوديو المخصص للقرآن مع القراء، الترتيل والتجويد، الخلفيات، المعاينة المباشرة والمحرر.</p><button id="icOpenQuran" class="ic-btn primary" type="button">فتح استوديو القرآن</button></div>
          </section>
          <section class="ic-pane" data-ic-pane="hadith"><div class="ic-title"><h2>أحاديث مختارة</h2><p>نصوص قصيرة مشهورة مع ذكر المصدر. النص لا يُولد بالذكاء الاصطناعي.</p></div><div id="icHadithGrid" class="ic-grid"></div></section>
          <section class="ic-pane" data-ic-pane="adhkar"><div class="ic-title"><h2>أذكار</h2><p>أذكار قصيرة مناسبة لمقاطع يومية وتصميمات الريلز.</p></div><div id="icAdhkarGrid" class="ic-grid"></div></section>
          <section class="ic-pane" data-ic-pane="dua"><div class="ic-title"><h2>أدعية</h2><p>أدعية قرآنية مختارة مع المرجع.</p></div><div id="icDuaGrid" class="ic-grid"></div></section>
          <section class="ic-pane" data-ic-pane="stories">
            <div class="ic-title"><h2>قصص إسلامية وتربوية</h2><p>أنشئ قصة عربية أصلية للعبرة والموعظة، ثم أضفها للنص أو التعليق الصوتي.</p></div>
            <div class="ic-story-box">
              <div class="ic-row"><input id="icStoryTopic" type="text" placeholder="موضوع القصة: الصدق، بر الوالدين، الصبر..."><select id="icStoryLength"><option value="short">قصيرة ~45 ثانية</option><option value="medium" selected>متوسطة ~90 ثانية</option><option value="long">كاملة 2–3 دقائق</option></select><button id="icGenerateStory" class="ic-btn ai" type="button">✦ إنشاء القصة</button></div>
              <textarea id="icStoryOutput" class="ic-story-output" placeholder="ستظهر القصة هنا..."></textarea>
              <div class="ic-actions"><button id="icStoryToText" class="ic-btn primary" type="button">إضافة للمحرر</button><button id="icStoryToVoice" class="ic-btn" type="button">إرسال للتعليق الصوتي</button><button id="icStoryCopy" class="ic-btn" type="button">نسخ</button></div>
              <div class="ic-note">القصص المولدة قصص تربوية أصلية، ولا يتم نسبتها إلى القرآن أو السنة أو أحداث تاريخية على أنها نصوص ثابتة.</div>
            </div>
          </section>
          <section class="ic-pane" data-ic-pane="nasheed">
            <div class="ic-title"><h2>أناشيد وصوتيات</h2><p>أضف ملفًا صوتيًا تملك حق استخدامه، ثم عدّل مستواه وادمجه مع الفيديو.</p></div>
            <div class="ic-nasheed-box"><b>رفع نشيد أو صوت من جهازك</b><label class="ic-upload"><input id="icNasheedUpload" type="file" accept="audio/*"><span>♫ اضغط لاختيار MP3 / WAV / M4A / OGG</span></label><div class="ic-note">نحافظ على النشر اليدوي وحقوق المحتوى؛ لذلك لا نضيف مكتبة أناشيد محمية من مصادر غير مرخصة.</div></div>
          </section>
          <section class="ic-pane" data-ic-pane="clips"><div class="ic-title"><h2>كليبات وخلفيات</h2><p>اختيارات جاهزة تنقلك مباشرة لبحث فيديوهات كثيرة ومتنوعة.</p></div><div id="icClipPresets" class="ic-presets"></div></section>
          <section class="ic-pane" data-ic-pane="animation"><div class="ic-title"><h2>Animation وملصقات متحركة</h2><p>اختيارات سريعة للبحث عن GIF وStickers وإضافتها فوق الفيديو.</p></div><div id="icAnimationPresets" class="ic-presets"></div></section>
        </main>
      </div>`;
    document.body.appendChild(root);
  }

  function openLibrary() {
    qid("islamicContentLibrary")?.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLibrary() {
    qid("islamicContentLibrary")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function selectTab(name) {
    document.querySelectorAll(".ic-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.icTab === name));
    document.querySelectorAll(".ic-pane").forEach(pane => pane.classList.toggle("active", pane.dataset.icPane === name));
  }

  async function copy(text) {
    const value = String(text || "").trim();
    if (!value) return;
    try { await navigator.clipboard.writeText(value); }
    catch {
      const ta = document.createElement("textarea"); ta.value = value; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    if (typeof toast === "function") toast("تم النسخ.", "ok");
  }

  function addToEditor(text, source = "") {
    const value = String(text || "").trim();
    if (!value) return;
    closeLibrary();
    addTextLayer(source ? `${value}\n${source}` : value);
  }

  function sendToVoice(text) {
    const value = String(text || "").trim();
    if (!value) return;
    closeLibrary();
    const input = qid("ttsText");
    if (input) input.value = value;
    if (typeof activateTab === "function") activateTab("audio");
    if (typeof toast === "function") toast("تم إرسال النص إلى التعليق الصوتي. اختر الصوت ثم أنشئه.", "ok");
  }

  function card(item) {
    const el = document.createElement("article");
    el.className = "ic-card";
    el.innerHTML = `<div class="ic-card-text"></div><div class="ic-card-source"></div><div class="ic-actions"><button class="ic-btn primary" data-action="text" type="button">إضافة للنص</button><button class="ic-btn" data-action="voice" type="button">تعليق صوتي</button><button class="ic-btn" data-action="copy" type="button">نسخ</button></div>`;
    el.querySelector(".ic-card-text").textContent = item.text;
    el.querySelector(".ic-card-source").textContent = item.source || "";
    el.querySelector('[data-action="text"]').onclick = () => addToEditor(item.text, item.source);
    el.querySelector('[data-action="voice"]').onclick = () => sendToVoice(item.text);
    el.querySelector('[data-action="copy"]').onclick = () => copy(`${item.text}${item.source ? `\n${item.source}` : ""}`);
    return el;
  }

  function renderCards() {
    [["icHadithGrid", HADITHS], ["icAdhkarGrid", ADHKAR], ["icDuaGrid", DUAS]].forEach(([id, items]) => {
      const grid = qid(id); if (!grid) return;
      grid.innerHTML = "";
      items.forEach(item => grid.appendChild(card(item)));
    });
  }

  function triggerVideoSearch(query) {
    closeLibrary();
    if (typeof activateTab === "function") activateTab("video");
    const input = qid("videoSearch");
    if (input) input.value = query;
    setTimeout(() => qid("videoSearchBtn")?.click(), 50);
  }

  function triggerStickerSearch(query) {
    closeLibrary();
    if (typeof activateTab === "function") activateTab("stickers");
    const input = qid("stickerSearch");
    if (input) input.value = query;
    setTimeout(() => qid("stickerSearchBtn")?.click(), 50);
  }

  function renderPresets() {
    const clips = qid("icClipPresets");
    if (clips) {
      clips.innerHTML = "";
      CLIPS.forEach(([label, query]) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "ic-preset"; button.textContent = label; button.onclick = () => triggerVideoSearch(query); clips.appendChild(button);
      });
    }
    const anim = qid("icAnimationPresets");
    if (anim) {
      anim.innerHTML = "";
      ANIMATIONS.forEach(([label, query]) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "ic-preset"; button.textContent = `✨ ${label}`; button.onclick = () => triggerStickerSearch(query); anim.appendChild(button);
      });
    }
  }

  async function generateStory() {
    const topic = qid("icStoryTopic")?.value?.trim() || "قيمة إسلامية جميلة";
    const length = qid("icStoryLength")?.value || "medium";
    const output = qid("icStoryOutput");
    const button = qid("icGenerateStory");
    if (!output || !button) return;
    button.disabled = true;
    button.textContent = "جاري إنشاء القصة...";
    output.value = "";
    try {
      const response = await fetch("/api/islamic-story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, length })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      output.value = String(data.text || "").trim();
    } catch (error) {
      output.value = `تعذر إنشاء القصة الآن: ${error?.message || error}`;
    } finally {
      button.disabled = false;
      button.textContent = "✦ إنشاء القصة";
    }
  }

  function bind() {
    qid("icClose")?.addEventListener("click", closeLibrary);
    document.querySelectorAll(".ic-tab").forEach(btn => btn.addEventListener("click", () => selectTab(btn.dataset.icTab)));
    qid("icOpenQuran")?.addEventListener("click", () => { closeLibrary(); qid("quranStudioLaunch")?.click(); });
    qid("icGenerateStory")?.addEventListener("click", generateStory);
    qid("icStoryToText")?.addEventListener("click", () => addToEditor(qid("icStoryOutput")?.value || ""));
    qid("icStoryToVoice")?.addEventListener("click", () => sendToVoice(qid("icStoryOutput")?.value || ""));
    qid("icStoryCopy")?.addEventListener("click", () => copy(qid("icStoryOutput")?.value || ""));
    qid("icNasheedUpload")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("audio/")) return typeof toast === "function" && toast("اختر ملفًا صوتيًا صالحًا.", "error");
      closeLibrary();
      if (typeof loadAudioBlob === "function") loadAudioBlob(file, file.name);
      if (typeof activateTab === "function") activateTab("audio");
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && qid("islamicContentLibrary")?.classList.contains("open")) closeLibrary(); });
  }

  function install() {
    installed = true;
    injectStyles();
    injectLauncher();
    injectLibrary();
    renderCards();
    renderPresets();
    bind();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", wait);
  else wait();
})();
