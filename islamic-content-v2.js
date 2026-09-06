"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let installed = false;
  const sessionTracks = [];

  const EXTRA_HADITHS = [
    { text: "من لا يَرحم لا يُرحم.", source: "متفق عليه" },
    { text: "خيركم من تعلم القرآن وعلمه.", source: "رواه البخاري" },
    { text: "أحب الأعمال إلى الله أدومها وإن قل.", source: "متفق عليه" },
    { text: "المؤمن للمؤمن كالبنيان يشد بعضه بعضًا.", source: "متفق عليه" },
    { text: "من كان في حاجة أخيه كان الله في حاجته.", source: "متفق عليه" },
    { text: "لا تغضب.", source: "رواه البخاري" },
    { text: "من سلك طريقًا يلتمس فيه علمًا سهل الله له به طريقًا إلى الجنة.", source: "رواه مسلم" },
    { text: "والله في عون العبد ما كان العبد في عون أخيه.", source: "رواه مسلم" },
    { text: "من دل على خير فله مثل أجر فاعله.", source: "رواه مسلم" },
    { text: "إن الله رفيق يحب الرفق.", source: "متفق عليه" },
    { text: "ما كان الرفق في شيء إلا زانه، ولا نزع من شيء إلا شانه.", source: "رواه مسلم" },
    { text: "من غشنا فليس منا.", source: "رواه مسلم" },
    { text: "أقرب ما يكون العبد من ربه وهو ساجد فأكثروا الدعاء.", source: "رواه مسلم" },
    { text: "إن الله لا ينظر إلى صوركم وأموالكم ولكن ينظر إلى قلوبكم وأعمالكم.", source: "رواه مسلم" },
    { text: "من كان يؤمن بالله واليوم الآخر فليكرم ضيفه.", source: "متفق عليه" },
    { text: "ليس الشديد بالصرعة، إنما الشديد الذي يملك نفسه عند الغضب.", source: "متفق عليه" },
    { text: "اليد العليا خير من اليد السفلى.", source: "متفق عليه" },
    { text: "من أحب أن يبسط له في رزقه وينسأ له في أثره فليصل رحمه.", source: "متفق عليه" }
  ];

  const EXTRA_ADHKAR = [
    { text: "سُبْحَانَ اللهِ وَبِحَمْدِهِ.", source: "ذكر مأثور" },
    { text: "سُبْحَانَ اللهِ العَظِيمِ.", source: "ذكر مأثور" },
    { text: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.", source: "ذكر مأثور" },
    { text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ.", source: "من سيد الاستغفار" },
    { text: "رَضِيتُ بِاللهِ رَبًّا، وَبِالإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا.", source: "ذكر الصباح والمساء" },
    { text: "بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ العَلِيمُ.", source: "ذكر الصباح والمساء" },
    { text: "أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.", source: "ذكر مأثور" },
    { text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ العَفْوَ وَالعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ.", source: "دعاء مأثور" },
    { text: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ.", source: "دعاء مأثور" },
    { text: "حَسْبُنَا اللهُ وَنِعْمَ الوَكِيلُ.", source: "آل عمران 173" },
    { text: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ.", source: "الأنبياء 87" },
    { text: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ.", source: "استغفار مأثور" },
    { text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ.", source: "الصلاة على النبي ﷺ" },
    { text: "سُبْحَانَ اللهِ، وَالحَمْدُ للهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ.", source: "الباقيات الصالحات" }
  ];

  const EXTRA_DUAS = [
    { text: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ العَلِيمُ", source: "البقرة 127" },
    { text: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا", source: "البقرة 250" },
    { text: "رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا", source: "البقرة 286" },
    { text: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا", source: "آل عمران 147" },
    { text: "حَسْبِيَ اللهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ العَرْشِ العَظِيمِ", source: "التوبة 129" },
    { text: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ", source: "إبراهيم 40" },
    { text: "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الحِسَابُ", source: "إبراهيم 41" },
    { text: "رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ", source: "الإسراء 80" },
    { text: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا", source: "الفرقان 74" },
    { text: "رَبِّ هَبْ لِي حُكْمًا وَأَلْحِقْنِي بِالصَّالِحِينَ", source: "الشعراء 83" },
    { text: "رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ", source: "النمل 19" },
    { text: "رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَحْمَةً وَعِلْمًا فَاغْفِرْ لِلَّذِينَ تَابُوا", source: "غافر 7" }
  ];

  const VIDEO_QUERIES = {
    hadith: "mosque peaceful islamic architecture vertical",
    adhkar: "sunrise peaceful nature vertical",
    dua: "sky clouds mosque peaceful vertical",
    story: "cinematic family nature vertical",
    kids: "happy children family nature vertical"
  };

  function toastSafe(message, type = "ok") {
    if (typeof window.toast === "function") window.toast(message, type);
  }

  async function copyText(text) {
    const value = String(text || "").trim();
    if (!value) return;
    try { await navigator.clipboard.writeText(value); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = value; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    toastSafe("تم النسخ.");
  }

  function closeLibrary() {
    qid("icClose")?.click();
  }

  function triggerVideoSearch(query) {
    closeLibrary();
    if (typeof window.activateTab === "function") window.activateTab("video");
    const input = qid("videoSearch");
    if (input) input.value = query;
    setTimeout(() => qid("videoSearchBtn")?.click(), 80);
  }

  async function createVoice(text, options = {}) {
    const value = String(text || "").trim();
    if (!value) throw new Error("لا يوجد نص لإنشاء الصوت.");
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        text: value.slice(0, 4000),
        voice: options.voice || "Kore",
        style: options.style || "fusha"
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `TTS ${response.status}`);
    }
    const blob = await response.blob();
    if (typeof window.loadAudioBlob !== "function") throw new Error("محرر الصوت غير جاهز.");
    window.loadAudioBlob(blob, options.name || "Islamic voice.wav");
    return blob;
  }

  async function videoWithVoice(text, kind = "story") {
    const query = VIDEO_QUERIES[kind] || VIDEO_QUERIES.story;
    toastSafe("جاري تجهيز الصوت...");
    try {
      await createVoice(text, { voice: kind === "kids" ? "Leda" : "Kore", style: "story", name: `${kind}-voice.wav` });
      triggerVideoSearch(query);
      toastSafe("الصوت اتضاف للمشروع ✅ اختَر الفيديو المناسب من النتائج.");
    } catch (error) {
      toastSafe(`تعذر تجهيز الصوت: ${error?.message || error}`, "error");
    }
  }

  function addText(text, source = "") {
    const value = String(text || "").trim();
    if (!value) return;
    closeLibrary();
    if (typeof window.addTextLayer === "function") window.addTextLayer(source ? `${value}\n${source}` : value);
  }

  function makeCard(item, kind) {
    const card = document.createElement("article");
    card.className = "ic-card ic-v2-card";
    card.innerHTML = `
      <div class="ic-card-text"></div>
      <div class="ic-card-source"></div>
      <div class="ic-actions">
        <button class="ic-btn primary" data-v2="text" type="button">إضافة للنص</button>
        <button class="ic-btn" data-v2="voice" type="button">تعليق صوتي</button>
        <button class="ic-btn ai" data-v2="video" type="button">🎬 فيديو + صوت</button>
        <button class="ic-btn" data-v2="copy" type="button">نسخ</button>
      </div>`;
    card.querySelector(".ic-card-text").textContent = item.text;
    card.querySelector(".ic-card-source").textContent = item.source || "";
    card.querySelector('[data-v2="text"]').onclick = () => addText(item.text, item.source);
    card.querySelector('[data-v2="voice"]').onclick = async () => {
      try {
        toastSafe("جاري إنشاء التعليق الصوتي...");
        await createVoice(item.text, { style: "fusha", name: `${kind}-voice.wav` });
        closeLibrary();
        if (typeof window.activateTab === "function") window.activateTab("audio");
        toastSafe("تمت إضافة الصوت للمشروع ✅");
      } catch (e) { toastSafe(`تعذر إنشاء الصوت: ${e?.message || e}`, "error"); }
    };
    card.querySelector('[data-v2="video"]').onclick = () => videoWithVoice(item.text, kind);
    card.querySelector('[data-v2="copy"]').onclick = () => copyText(`${item.text}${item.source ? `\n${item.source}` : ""}`);
    return card;
  }

  function appendExtraCards() {
    const groups = [
      ["icHadithGrid", EXTRA_HADITHS, "hadith"],
      ["icAdhkarGrid", EXTRA_ADHKAR, "adhkar"],
      ["icDuaGrid", EXTRA_DUAS, "dua"]
    ];
    groups.forEach(([id, items, kind]) => {
      const grid = qid(id);
      if (!grid || grid.dataset.v2Expanded === "1") return;
      grid.dataset.v2Expanded = "1";
      items.forEach(item => grid.appendChild(makeCard(item, kind)));
    });
  }

  function enhanceExistingCards() {
    [
      ["icHadithGrid", "hadith"],
      ["icAdhkarGrid", "adhkar"],
      ["icDuaGrid", "dua"]
    ].forEach(([id, kind]) => {
      qid(id)?.querySelectorAll(".ic-card").forEach(card => {
        if (card.querySelector('[data-v2-existing="video"]')) return;
        const text = card.querySelector(".ic-card-text")?.textContent?.trim() || "";
        const actions = card.querySelector(".ic-actions");
        if (!text || !actions) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ic-btn ai";
        btn.dataset.v2Existing = "video";
        btn.textContent = "🎬 فيديو + صوت";
        btn.onclick = () => videoWithVoice(text, kind);
        actions.insertBefore(btn, actions.lastElementChild || null);
      });
    });
  }

  async function generateStory(mode = "general") {
    const topic = qid("icStoryTopic")?.value?.trim() || (mode === "kids" ? "قصة طفل عن الصدق والشجاعة" : "قيمة إسلامية جميلة");
    const length = qid("icStoryLength")?.value || "medium";
    const response = await fetch("/api/islamic-story", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ topic, length, mode })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    const text = String(data.text || "").trim();
    if (!text) throw new Error("لم يرجع نص للقصة.");
    const output = qid("icStoryOutput");
    if (output) output.value = text;
    return { text, topic, model: data.model || "" };
  }

  async function buildStory(mode = "general") {
    const status = qid("icV2StoryStatus");
    const button = mode === "kids" ? qid("icKidsVideoVoice") : qid("icStoryVideoVoice");
    if (button) button.disabled = true;
    if (status) status.textContent = mode === "kids" ? "جاري إنشاء قصة الأطفال ثم الصوت..." : "جاري تجهيز القصة والصوت...";
    try {
      let text = qid("icStoryOutput")?.value?.trim() || "";
      let topic = qid("icStoryTopic")?.value?.trim() || "قصة إسلامية";
      if (!text || mode === "kids") {
        const result = await generateStory(mode);
        text = result.text; topic = result.topic;
      }
      await createVoice(text, { voice: mode === "kids" ? "Leda" : "Kore", style: "story", name: mode === "kids" ? "kids-story.wav" : "story.wav" });
      if (typeof window.addTextLayer === "function") window.addTextLayer(mode === "kids" ? `قصة أطفال: ${topic}` : `قصة: ${topic}`);
      triggerVideoSearch(VIDEO_QUERIES[mode === "kids" ? "kids" : "story"]);
      toastSafe("جهزت القصة والصوت ✅ اختَر فيديو من النتائج وأكمل المونتاج.");
    } catch (error) {
      if (status) status.textContent = `تعذر التجهيز: ${error?.message || error}`;
      toastSafe(`تعذر التجهيز: ${error?.message || error}`, "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function enhanceStories() {
    const box = document.querySelector('[data-ic-pane="stories"] .ic-story-box');
    if (!box || qid("icStoryVideoVoice")) return;
    const actions = box.querySelector(".ic-actions");
    const video = document.createElement("button");
    video.id = "icStoryVideoVoice";
    video.type = "button";
    video.className = "ic-btn ai";
    video.textContent = "🎬 قصة + فيديو + صوت";
    video.onclick = () => buildStory("general");

    const kids = document.createElement("button");
    kids.id = "icKidsVideoVoice";
    kids.type = "button";
    kids.className = "ic-btn primary";
    kids.textContent = "🧒 قصة أطفال + فيديو + صوت";
    kids.onclick = () => buildStory("kids");

    const clips = document.createElement("button");
    clips.type = "button";
    clips.className = "ic-btn";
    clips.textContent = "🎞 فيديوهات أطفال";
    clips.onclick = () => triggerVideoSearch(VIDEO_QUERIES.kids);

    actions?.append(video, kids, clips);
    const status = document.createElement("div");
    status.id = "icV2StoryStatus";
    status.className = "ic-note";
    status.textContent = "تقدر تعمل القصة كنص فقط، أو تضغط فيديو + صوت علشان يتجهز التعليق الصوتي وتفتح لك خلفيات الفيديو مباشرة.";
    box.appendChild(status);
  }

  function renderTrackList() {
    const list = qid("icNasheedV2List");
    if (!list) return;
    list.innerHTML = "";
    sessionTracks.forEach((track, index) => {
      const row = document.createElement("div");
      row.className = "ic-v2-track";
      row.innerHTML = `<div class="ic-v2-track-name"></div><audio controls preload="metadata"></audio><button class="ic-btn primary" type="button">إضافة للمشروع</button><button class="ic-btn danger" type="button">حذف</button>`;
      row.querySelector(".ic-v2-track-name").textContent = track.file.name;
      row.querySelector("audio").src = track.url;
      const buttons = row.querySelectorAll("button");
      buttons[0].onclick = () => {
        if (typeof window.loadAudioBlob === "function") window.loadAudioBlob(track.file, track.file.name);
        closeLibrary();
        if (typeof window.activateTab === "function") window.activateTab("audio");
      };
      buttons[1].onclick = () => {
        URL.revokeObjectURL(track.url);
        sessionTracks.splice(index, 1);
        renderTrackList();
      };
      list.appendChild(row);
    });
  }

  function enhanceNasheed() {
    const pane = document.querySelector('[data-ic-pane="nasheed"]');
    if (!pane || qid("icNasheedV2Upload")) return;
    const box = document.createElement("div");
    box.className = "ic-nasheed-box ic-v2-nasheed";
    box.innerHTML = `
      <b>مكتبتك الصوتية داخل الجلسة</b>
      <div class="ic-note">ارفع أكثر من نشيد أو صوت تملك حق استخدامه، اسمعه هنا، وبعدها أضفه للمشروع بضغطة واحدة.</div>
      <label class="ic-upload"><input id="icNasheedV2Upload" type="file" accept="audio/*" multiple><span>♫ رفع مجموعة ملفات صوتية</span></label>
      <div id="icNasheedV2List" class="ic-v2-track-list"></div>`;
    pane.appendChild(box);
    qid("icNasheedV2Upload")?.addEventListener("change", event => {
      [...(event.target.files || [])].filter(file => file.type.startsWith("audio/")).forEach(file => {
        sessionTracks.push({ file, url: URL.createObjectURL(file) });
      });
      event.target.value = "";
      renderTrackList();
    });
  }

  function injectStyles() {
    if (qid("islamicContentV2Styles")) return;
    const style = document.createElement("style");
    style.id = "islamicContentV2Styles";
    style.textContent = `
      .ic-v2-track-list{display:grid;gap:8px;margin-top:10px}
      .ic-v2-track{display:grid;grid-template-columns:minmax(120px,1fr) minmax(180px,1.2fr) auto auto;gap:7px;align-items:center;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#0b1119}
      .ic-v2-track-name{font:700 9px Cairo,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ic-v2-track audio{width:100%;height:34px}
      .ic-v2-nasheed{margin-top:14px}
      @media(max-width:800px){.ic-v2-track{grid-template-columns:1fr}.ic-v2-track audio{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyles();
    enhanceExistingCards();
    appendExtraCards();
    enhanceStories();
    enhanceNasheed();
  }

  function wait() {
    if (qid("islamicContentLibrary")) install();
    else setTimeout(wait, 120);
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", wait);
  else wait();
})();
