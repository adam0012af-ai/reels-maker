"use strict";

(() => {
  const QAPI = "https://api.alquran.cloud/v1";
  const TEXT_EDITION = "quran-uthmani-quran-academy";
  const qs = s => document.querySelector(s);
  const qid = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? "").replace(/[&<>'\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c]));

  const qr = {
    surahs: [], reciters: [], filteredReciters: [], surahData: null,
    segments: [], mergedBuffer: null, wavBlob: null, quranLayerId: null,
    backgroundLayerId: null, exportedBlob: null, cancel: false, preparing: false,
    active: false, previewRaf: 0, exportClock: null, stockSource: "pexels"
  };

  const saved = (() => { try { return JSON.parse(localStorage.getItem("reels-quran-settings") || "{}"); } catch { return {}; } })();

  function addAssets() {
    if (!qid("quranStudioCss")) {
      const l = document.createElement("link"); l.id = "quranStudioCss"; l.rel = "stylesheet"; l.href = "quran-studio.css?v=1"; document.head.appendChild(l);
    }
    if (!qid("quranFonts")) {
      const l = document.createElement("link"); l.id = "quranFonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Cairo:wght@400;600;700&family=Lateef:wght@400;700&family=Noto+Kufi+Arabic:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Scheherazade+New:wght@400;700&family=Tajawal:wght@400;500;700&display=swap";
      document.head.appendChild(l);
    }
  }

  function injectLauncher() {
    if (qid("quranStudioLaunch")) return;
    const actions = qs(".topbar .actions");
    if (!actions) return;
    const b = document.createElement("button");
    b.id = "quranStudioLaunch"; b.className = "btn qr-launch"; b.type = "button";
    b.innerHTML = '<span class="qr-crescent">☪</span><strong>ريلز القرآن</strong>';
    b.addEventListener("click", openStudio);
    actions.prepend(b);
  }

  function injectStudio() {
    if (qid("quranStudio")) return;
    const root = document.createElement("div");
    root.id = "quranStudio"; root.className = "qr-studio";
    root.innerHTML = `
      <header class="qr-head">
        <div class="qr-head-logo">☪</div>
        <div class="qr-head-title"><b>استوديو ريلز القرآن</b><span>آيات متزامنة • قرّاء متعددون • تصميم وتصدير</span></div>
        <button id="qrClose" type="button" aria-label="إغلاق">×</button>
      </header>
      <div class="qr-body">
        <div class="qr-settings">
          <section class="qr-section">
            <div class="qr-section-title"><b>1. السورة والآيات</b><small>اختيار دقيق للنطاق</small></div>
            <label class="qr-field"><span>السورة</span><select id="qrSurah"><option>جاري تحميل السور...</option></select></label>
            <div class="qr-grid2">
              <label class="qr-field"><span>من آية</span><input id="qrFrom" type="number" min="1" value="1"></label>
              <label class="qr-field"><span>إلى آية</span><input id="qrTo" type="number" min="1" value="7"></label>
            </div>
          </section>

          <section class="qr-section">
            <div class="qr-section-title"><b>2. القارئ</b><small id="qrReciterCount">تحميل القرّاء...</small></div>
            <label class="qr-field"><span>ابحث باسم القارئ</span><input id="qrReciterSearch" type="search" placeholder="مثال: العفاسي، السديس، عبد الباسط"></label>
            <label class="qr-field"><span>القارئ</span><select id="qrReciter"><option>جاري التحميل...</option></select></label>
            <button id="qrReciterPreview" class="qr-btn full" type="button">▶ سماع القارئ على أول آية</button>
            <audio id="qrMiniAudio" preload="none"></audio>
          </section>

          <section class="qr-section">
            <div class="qr-section-title"><b>3. الخلفية</b><small>جاهزة أو من جهازك أو فيديو Stock</small></div>
            <div class="qr-bg-grid">
              <button class="qr-bg active" data-bg="emerald" type="button"><i></i><span>زمردي</span></button>
              <button class="qr-bg" data-bg="night" type="button"><i></i><span>ليلي</span></button>
              <button class="qr-bg" data-bg="warm" type="button"><i></i><span>دافئ</span></button>
              <button class="qr-bg" data-bg="black" type="button"><i></i><span>أسود</span></button>
            </div>
            <div class="qr-upload-row">
              <label class="qr-upload">🖼 رفع صورة<input id="qrBgImage" type="file" accept="image/*"></label>
              <label class="qr-upload">🎬 رفع فيديو<input id="qrBgVideo" type="file" accept="video/*"></label>
            </div>
            <div class="qr-stock">
              <div class="qr-stock-search"><input id="qrStockQuery" type="search" placeholder="خلفية طبيعة، مسجد، سماء..."><button id="qrStockSearchBtn" class="qr-btn" type="button">بحث فيديو</button></div>
              <div class="qr-chip-row" style="margin-top:7px"><button class="qr-chip active" data-stock="pexels" type="button">Pexels</button><button class="qr-chip" data-stock="pixabay" type="button">Pixabay</button></div>
              <div id="qrStockResults" class="qr-stock-results"></div>
            </div>
          </section>

          <section class="qr-section">
            <div class="qr-section-title"><b>4. تصميم الآية</b><small>يظهر فوق الفيديو</small></div>
            <label class="qr-field"><span>الخط</span><select id="qrFont">
              <option value="Amiri">نسخ — Amiri</option><option value="Scheherazade New">عثماني — Scheherazade</option>
              <option value="Noto Naskh Arabic">Noto Naskh Arabic</option><option value="Aref Ruqaa">رقعة — Aref Ruqaa</option>
              <option value="Lateef">لطيف — Lateef</option><option value="Noto Kufi Arabic">كوفي — Noto Kufi</option>
              <option value="Tajawal">تجول — Tajawal</option><option value="Cairo">القاهرة — Cairo</option>
            </select></label>
            <div class="qr-grid3">
              <label class="qr-field"><span>لون الخط</span><input id="qrColor" type="color" value="#ffffff"></label>
              <label class="qr-field"><span>لون خلفية النص</span><input id="qrTextBg" type="color" value="#000000"></label>
              <label class="qr-field"><span>حجم الخط <b id="qrSizeOut">72</b></span><input id="qrSize" type="range" min="38" max="150" value="72"></label>
            </div>
            <div class="qr-grid2">
              <label class="qr-field"><span>شفافية خلفية النص <b id="qrOpacityOut">28%</b></span><input id="qrOpacity" type="range" min="0" max="80" value="28"></label>
              <label class="qr-field"><span>موضع الآية</span><select id="qrPosition"><option value="center">منتصف</option><option value="upper">أعلى الوسط</option><option value="lower">أسفل الوسط</option></select></label>
            </div>
            <div class="qr-chip-row">
              <label class="qr-check"><input id="qrVerseNumber" type="checkbox" checked> رقم الآية</label>
              <label class="qr-check"><input id="qrSurahLabel" type="checkbox" checked> اسم السورة</label>
              <label class="qr-check"><input id="qrShadow" type="checkbox" checked> ظل واضح</label>
            </div>
          </section>

          <section class="qr-section">
            <div class="qr-section-title"><b>5. الجودة والإنشاء</b><small>4K للأجهزة القوية</small></div>
            <div class="qr-grid2">
              <label class="qr-field"><span>الجودة</span><select id="qrQuality"><option value="360">360p — سريع</option><option value="480">480p — متوسط</option><option value="720">720p — HD</option><option value="1080" selected>1080p — Full HD</option><option value="2160">4K — Ultra HD</option></select></label>
              <label class="qr-field"><span>الإطارات</span><select id="qrFps"><option value="24">24 FPS</option><option value="30" selected>30 FPS</option><option value="60">60 FPS</option></select></label>
            </div>
            <div class="qr-actions">
              <button id="qrPrepare" class="qr-btn primary qr-build" type="button">☪ إنشاء ريل القرآن وتجهيزه للمحرر</button>
              <button id="qrCancel" class="qr-btn danger" type="button">إلغاء</button>
              <button id="qrSavePreset" class="qr-btn" type="button">حفظ الإعدادات</button>
            </div>
            <div id="qrProgressWrap" class="qr-progress-wrap"><div class="qr-progress"><i id="qrProgressBar"></i></div><div class="qr-progress-text"><span id="qrProgressText">0%</span><span id="qrProgressLabel">جاري التحضير...</span></div></div>
            <div id="qrStatus" class="qr-status">اختر السورة والقارئ ثم اضغط إنشاء.</div>
          </section>
        </div>

        <div class="qr-preview-col">
          <div class="qr-phone"><div id="qrPhoneStage" class="qr-phone-stage"><div class="qr-demo-bg"></div><div id="qrDemoText" class="qr-demo-text">﴿ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴾</div><div id="qrDemoMeta" class="qr-demo-meta">سورة الفاتحة</div></div></div>
          <div class="qr-preview-tools">
            <button id="qrPlay" class="qr-btn" type="button">▶ معاينة مباشرة</button>
            <button id="qrExport" class="qr-btn primary" type="button">⬇ تصدير الفيديو</button>
            <button id="qrOpenEditor" class="qr-btn ai" type="button">✦ فتح في المحرر</button>
            <button id="qrShareFile" class="qr-btn" type="button">↗ مشاركة الفيديو</button>
          </div>
          <div id="qrPreviewStatus" class="qr-ready-note">بعد التجهيز ستظهر الآيات في وقتها مع التلاوة. يمكنك بعدها إضافة النصوص والملصقات وGemini من المحرر.</div>
          <div class="qr-share"><button data-share="whatsapp">واتساب</button><button data-share="facebook">فيسبوك</button><button data-share="telegram">تيليجرام</button><button data-share="x">X</button><button data-share="email">Gmail</button></div>
        </div>
      </div>`;
    document.body.appendChild(root);
  }

  function openStudio() {
    qid("quranStudio")?.classList.add("open");
    document.documentElement.classList.remove("keyboard-editing");
    document.body.style.overflow = "hidden";
    updateDemo();
  }
  function closeStudio() { qid("quranStudio")?.classList.remove("open"); document.body.style.overflow = ""; }

  function setStatus(text, type = "") {
    const el = qid("qrStatus"); if (!el) return; el.textContent = text; el.className = `qr-status ${type}`;
  }
  function setProgress(p, label) {
    const wrap = qid("qrProgressWrap"); if (wrap) wrap.classList.add("show");
    p = Math.max(0, Math.min(100, p));
    if (qid("qrProgressBar")) qid("qrProgressBar").style.width = `${p}%`;
    if (qid("qrProgressText")) qid("qrProgressText").textContent = `${Math.round(p)}%`;
    if (label && qid("qrProgressLabel")) qid("qrProgressLabel").textContent = label;
  }

  async function getJson(url) {
    const r = await fetch(url, { cache: "force-cache" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.code && d.code !== 200) throw new Error(d.status || d.data || `HTTP ${r.status}`);
    return d.data ?? d;
  }

  async function loadCatalogs() {
    try {
      const [surahs, editions] = await Promise.all([getJson(`${QAPI}/surah`), getJson(`${QAPI}/edition/format/audio`)]);
      qr.surahs = Array.isArray(surahs) ? surahs : [];
      qr.reciters = (Array.isArray(editions) ? editions : []).filter(x => x.format === "audio" && (x.language === "ar" || String(x.identifier || "").startsWith("ar.")));
      qr.reciters.sort((a,b) => String(a.name || a.englishName).localeCompare(String(b.name || b.englishName), "ar"));
      renderSurahs(); renderReciters(); restoreSettings();
    } catch (e) {
      setStatus(`تعذر تحميل بيانات القرآن: ${e.message}`, "err");
    }
  }

  function renderSurahs() {
    const s = qid("qrSurah"); if (!s) return;
    s.innerHTML = qr.surahs.map(x => `<option value="${x.number}" data-count="${x.numberOfAyahs}">${x.number}. ${esc(x.name)} — ${esc(x.englishName)}</option>`).join("");
    updateAyahLimits();
  }

  function renderReciters() {
    const q = (qid("qrReciterSearch")?.value || "").trim().toLowerCase();
    qr.filteredReciters = qr.reciters.filter(r => !q || `${r.name} ${r.englishName} ${r.identifier}`.toLowerCase().includes(q));
    const s = qid("qrReciter"); if (!s) return;
    s.innerHTML = qr.filteredReciters.map(r => `<option value="${esc(r.identifier)}">${esc(r.name || r.englishName || r.identifier)} — ${esc(r.identifier)}</option>`).join("");
    if (qid("qrReciterCount")) qid("qrReciterCount").textContent = `${qr.filteredReciters.length} قارئًا متاحًا`;
  }

  function updateAyahLimits() {
    const opt = qid("qrSurah")?.selectedOptions?.[0];
    const count = Number(opt?.dataset.count || 7);
    const from = qid("qrFrom"), to = qid("qrTo");
    if (!from || !to) return;
    from.max = to.max = String(count);
    from.value = String(Math.max(1, Math.min(count, Number(from.value) || 1)));
    to.value = String(Math.max(Number(from.value), Math.min(count, Number(to.value) || count)));
    if (Number(to.value) < Number(from.value)) to.value = from.value;
    updateDemo();
  }

  function currentSurah() { return qr.surahs.find(s => s.number === Number(qid("qrSurah")?.value)) || qr.surahs[0]; }
  function selectedReciter() { return qr.reciters.find(r => r.identifier === qid("qrReciter")?.value); }

  function settingsSnapshot() {
    return {
      surah: qid("qrSurah")?.value, from: qid("qrFrom")?.value, to: qid("qrTo")?.value,
      reciter: qid("qrReciter")?.value, font: qid("qrFont")?.value, color: qid("qrColor")?.value,
      textBg: qid("qrTextBg")?.value, size: qid("qrSize")?.value, opacity: qid("qrOpacity")?.value,
      position: qid("qrPosition")?.value, verseNumber: qid("qrVerseNumber")?.checked,
      surahLabel: qid("qrSurahLabel")?.checked, shadow: qid("qrShadow")?.checked,
      quality: qid("qrQuality")?.value, fps: qid("qrFps")?.value
    };
  }
  function saveSettings() { localStorage.setItem("reels-quran-settings", JSON.stringify(settingsSnapshot())); setStatus("تم حفظ إعدادات ريلز القرآن على هذا الجهاز.", "ok"); }
  function restoreSettings() {
    const apply = (id, val) => { const e = qid(id); if (e && val != null) e.value = val; };
    apply("qrSurah", saved.surah); updateAyahLimits(); apply("qrFrom", saved.from); apply("qrTo", saved.to);
    apply("qrReciter", saved.reciter); apply("qrFont", saved.font); apply("qrColor", saved.color); apply("qrTextBg", saved.textBg);
    apply("qrSize", saved.size); apply("qrOpacity", saved.opacity); apply("qrPosition", saved.position); apply("qrQuality", saved.quality); apply("qrFps", saved.fps);
    if (saved.verseNumber != null) qid("qrVerseNumber").checked = saved.verseNumber;
    if (saved.surahLabel != null) qid("qrSurahLabel").checked = saved.surahLabel;
    if (saved.shadow != null) qid("qrShadow").checked = saved.shadow;
    updateOutputs(); updateDemo();
  }

  function updateOutputs() {
    if (qid("qrSizeOut")) qid("qrSizeOut").textContent = qid("qrSize")?.value || "72";
    if (qid("qrOpacityOut")) qid("qrOpacityOut").textContent = `${qid("qrOpacity")?.value || 28}%`;
  }

  function formatVerse(a) {
    if (!a) return "﴿ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴾";
    const n = qid("qrVerseNumber")?.checked ? ` ﴿${toArabicNumber(a.numberInSurah)}﴾` : "";
    return `${a.text}${n}`;
  }
  function toArabicNumber(n) { return String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]); }

  function updateDemo() {
    const d = qid("qrDemoText"), meta = qid("qrDemoMeta"), stage = qid("qrPhoneStage"); if (!d) return;
    const a = qr.segments[0]?.ayah || qr.surahData?.ayahs?.[0]; d.textContent = formatVerse(a);
    d.style.fontFamily = `'${qid("qrFont")?.value || "Amiri"}', serif`;
    d.style.color = qid("qrColor")?.value || "#fff";
    d.style.fontSize = `${Math.max(18, Number(qid("qrSize")?.value || 72) * .36)}px`;
    d.style.background = hexAlpha(qid("qrTextBg")?.value || "#000000", Number(qid("qrOpacity")?.value || 28) / 100);
    d.style.borderRadius = "14px";
    d.style.textShadow = qid("qrShadow")?.checked ? "0 4px 16px rgba(0,0,0,.95)" : "none";
    const pos = qid("qrPosition")?.value || "center";
    d.style.transform = pos === "upper" ? "translateY(-85%)" : pos === "lower" ? "translateY(85%)" : "";
    const surah = currentSurah(); if (meta) meta.textContent = qid("qrSurahLabel")?.checked && surah ? `${surah.name} • ${qid("qrFrom")?.value || 1}–${qid("qrTo")?.value || 1}` : "";
    if (stage) stage.dataset.bg = qs(".qr-bg.active")?.dataset.bg || "emerald";
  }

  function hexAlpha(hex, a) {
    const h = String(hex || "#000000").replace("#", ""); const v = parseInt(h.length === 3 ? h.split("").map(x => x+x).join("") : h,16) || 0;
    return `rgba(${(v>>16)&255},${(v>>8)&255},${v&255},${Math.max(0,Math.min(1,a))})`;
  }

  async function previewReciter() {
    const rec = qid("qrReciter")?.value, surah = Number(qid("qrSurah")?.value || 1), from = Number(qid("qrFrom")?.value || 1);
    if (!rec) return;
    try {
      setStatus("جاري تحميل معاينة القارئ...");
      const data = await getJson(`${QAPI}/surah/${surah}/${encodeURIComponent(rec)}`);
      const ayah = data.ayahs?.find(a => a.numberInSurah === from) || data.ayahs?.[0];
      if (!ayah?.audio) throw new Error("لا يوجد ملف صوت لهذه الآية");
      const a = qid("qrMiniAudio"); a.src = ayah.audio; await a.play();
      setStatus(`معاينة: ${selectedReciter()?.name || rec}`, "ok");
    } catch (e) { setStatus(`تعذر تشغيل المعاينة: ${e.message}`, "err"); }
  }

  async function mapLimit(items, limit, fn) {
    const out = new Array(items.length); let i = 0;
    const workers = Array.from({length: Math.min(limit, items.length)}, async () => { while (true) { const idx = i++; if (idx >= items.length) return; out[idx] = await fn(items[idx], idx); } });
    await Promise.all(workers); return out;
  }

  async function decodeAudio(url, ctx) {
    const r = await fetch(url); if (!r.ok) throw new Error(`audio ${r.status}`);
    return ctx.decodeAudioData(await r.arrayBuffer());
  }

  function mergeBuffers(buffers, ctx) {
    const rate = ctx.sampleRate; const channels = Math.max(1, ...buffers.map(b => b.numberOfChannels));
    const lengths = buffers.map(b => Math.ceil(b.duration * rate)); const total = lengths.reduce((a,b) => a+b,0);
    const merged = ctx.createBuffer(channels, total, rate); let offset = 0;
    buffers.forEach((b,bi) => {
      const len = lengths[bi];
      for (let c=0;c<channels;c++) {
        const src = b.getChannelData(Math.min(c,b.numberOfChannels-1)); const dst = merged.getChannelData(c);
        if (b.sampleRate === rate) dst.set(src.subarray(0,Math.min(src.length,len)), offset);
        else {
          for (let j=0;j<len;j++) { const p = j * b.sampleRate / rate; const i0 = Math.floor(p); const i1 = Math.min(src.length-1,i0+1); const f = p-i0; dst[offset+j] = (src[i0]||0)*(1-f)+(src[i1]||0)*f; }
        }
      }
      offset += len;
    });
    return merged;
  }

  function audioBufferToWav(buffer) {
    const ch = Math.min(2, buffer.numberOfChannels), rate = buffer.sampleRate, frames = buffer.length;
    const ab = new ArrayBuffer(44 + frames*ch*2), v = new DataView(ab); let p=0;
    const str=s=>{for(let i=0;i<s.length;i++)v.setUint8(p++,s.charCodeAt(i));};
    str("RIFF");v.setUint32(p,36+frames*ch*2,true);p+=4;str("WAVEfmt ");v.setUint32(p,16,true);p+=4;v.setUint16(p,1,true);p+=2;v.setUint16(p,ch,true);p+=2;v.setUint32(p,rate,true);p+=4;v.setUint32(p,rate*ch*2,true);p+=4;v.setUint16(p,ch*2,true);p+=2;v.setUint16(p,16,true);p+=2;str("data");v.setUint32(p,frames*ch*2,true);p+=4;
    for(let i=0;i<frames;i++) for(let c=0;c<ch;c++){let s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]||0));v.setInt16(p,s<0?s*0x8000:s*0x7fff,true);p+=2;}
    return new Blob([ab],{type:"audio/wav"});
  }

  async function prepareQuran() {
    if (qr.preparing) return;
    qr.cancel = false; qr.preparing = true; qid("qrPrepare").disabled = true; setProgress(2,"تحميل بيانات السورة...");
    try {
      const surahNo = Number(qid("qrSurah").value), from = Number(qid("qrFrom").value), to = Number(qid("qrTo").value), rec = qid("qrReciter").value;
      if (!rec) throw new Error("اختر قارئًا"); if (from > to) throw new Error("بداية الآيات يجب أن تكون قبل النهاية");
      const maxRange = /Android|iPhone|iPad/i.test(navigator.userAgent) ? 30 : 80;
      if (to-from+1 > maxRange) throw new Error(`اختر حتى ${maxRange} آية في الريل الواحد للحفاظ على أداء الجهاز`);
      const [textData,audioData] = await Promise.all([getJson(`${QAPI}/surah/${surahNo}/${TEXT_EDITION}`), getJson(`${QAPI}/surah/${surahNo}/${encodeURIComponent(rec)}`)]);
      qr.surahData = textData;
      const texts = textData.ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to);
      const audios = audioData.ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to);
      if (!texts.length || texts.length !== audios.length) throw new Error("تعذر مطابقة نصوص الآيات مع ملفات التلاوة");
      if (qr.cancel) throw new Error("تم الإلغاء");
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw new Error("المتصفح لا يدعم Web Audio");
      const ctx = new AC();
      setProgress(10,"تحميل تلاوة الآيات...");
      const buffers = await mapLimit(audios, 4, async (a,i) => { if(qr.cancel) throw new Error("تم الإلغاء"); const b=await decodeAudio(a.audio,ctx); setProgress(10+Math.round(((i+1)/audios.length)*58),`تحميل الآيات ${i+1}/${audios.length}`); return b; });
      if (qr.cancel) throw new Error("تم الإلغاء");
      const merged = mergeBuffers(buffers, ctx); qr.mergedBuffer = merged; qr.wavBlob = audioBufferToWav(merged);
      let t=0; qr.segments = texts.map((ayah,i)=>{const seg={ayah,start:t,end:t+buffers[i].duration};t=seg.end;return seg;});
      setProgress(72,"إضافة الصوت للمشروع...");
      if (typeof window.loadAudioBlob === "function") window.loadAudioBlob(qr.wavBlob, `${textData.englishName || "Quran"} - ${selectedReciter()?.name || rec}.wav`);
      else loadAudioBlob(qr.wavBlob, "Quran Reel.wav");
      createOrUpdateQuranLayer();
      if (!state.videoLoaded && !qr.backgroundLayerId) await setBuiltinBackground(qs(".qr-bg.active")?.dataset.bg || "emerald");
      sourceVideo.loop = true; qr.active = true; startVerseSync(); saveSettings();
      setProgress(100,"جاهز للمراجعة والتصدير"); setStatus(`تم تجهيز ${texts.length} آية بصوت ${selectedReciter()?.name || rec} ✅`,"ok");
      qid("qrPreviewStatus").textContent = `جاهز: ${textData.name} • ${texts.length} آية • ${Math.round(merged.duration)} ثانية. يمكنك المعاينة أو التصدير أو فتح المحرر.`;
      await ctx.close().catch(()=>{}); updateDemo();
    } catch (e) {
      setStatus(e.message === "تم الإلغاء" ? "تم إلغاء العملية." : `تعذر إنشاء الريل: ${e.message}`, e.message === "تم الإلغاء" ? "" : "err");
    } finally { qr.preparing=false; qid("qrPrepare").disabled=false; }
  }

  function quranY() {
    const p = qid("qrPosition")?.value; return p === "upper" ? canvas.height*.32 : p === "lower" ? canvas.height*.69 : canvas.height*.50;
  }

  function createOrUpdateQuranLayer() {
    let l = state.layers.find(x => x.id === qr.quranLayerId);
    const first = qr.segments[0]?.ayah;
    if (!l) {
      l = { id:`quran-${Date.now()}`,type:"text",name:"Quran Timed Ayah",text:formatVerse(first),visible:true,x:canvas.width/2,y:quranY(),rotation:0,scale:1,font:qid("qrFont").value,size:Number(qid("qrSize").value),color:qid("qrColor").value,bg:qid("qrTextBg").value,bgOpacity:Number(qid("qrOpacity").value)/100,shadow:"#000000",shadowBlur:qid("qrShadow").checked?18:0,padX:34,padY:22,quranTimed:true };
      state.layers.push(l); qr.quranLayerId=l.id;
    } else updateLayerStyle(l);
    state.selected=l.id; renderLayersList(); syncSelectedControls();
  }

  function updateLayerStyle(l) {
    if (!l) return; l.font=qid("qrFont").value;l.size=Number(qid("qrSize").value);l.color=qid("qrColor").value;l.bg=qid("qrTextBg").value;l.bgOpacity=Number(qid("qrOpacity").value)/100;l.shadowBlur=qid("qrShadow").checked?18:0;l.y=quranY();
  }

  function segmentAt(time) { return qr.segments.find(s => time >= s.start && time < s.end) || qr.segments.at(-1); }
  function applyVerseAt(time) {
    const seg=segmentAt(Math.max(0,time)); const l=state.layers.find(x=>x.id===qr.quranLayerId); if(!seg||!l)return;
    const text=formatVerse(seg.ayah); if(l.text!==text){l.text=text;l.name=`آية ${seg.ayah.numberInSurah}`;}
    updateLayerStyle(l);
    const d=qid("qrDemoText"); if(d)d.textContent=text;
    const m=qid("qrDemoMeta"); if(m&&qid("qrSurahLabel").checked)m.textContent=`${qr.surahData?.name || currentSurah()?.name || ""} • الآية ${seg.ayah.numberInSurah}`;
  }

  function startVerseSync() {
    cancelAnimationFrame(qr.previewRaf);
    const tick=()=>{ if(qr.active){ const t=qr.exportClock!=null?qr.exportClock:(sourceAudio?.currentTime||0); applyVerseAt(t); } qr.previewRaf=requestAnimationFrame(tick); }; tick();
  }

  function gradientSpec(name, c) {
    const g=c.createLinearGradient(0,0,1080,1920);
    if(name==="night"){g.addColorStop(0,"#050817");g.addColorStop(.55,"#17244d");g.addColorStop(1,"#060914");}
    else if(name==="warm"){g.addColorStop(0,"#3c2119");g.addColorStop(.5,"#9a5836");g.addColorStop(1,"#180f0d");}
    else if(name==="black"){g.addColorStop(0,"#151821");g.addColorStop(.45,"#050607");g.addColorStop(1,"#000000");}
    else{g.addColorStop(0,"#08221a");g.addColorStop(.5,"#155744");g.addColorStop(1,"#06100d");} return g;
  }

  async function setBuiltinBackground(name) {
    document.querySelectorAll(".qr-bg").forEach(b=>b.classList.toggle("active",b.dataset.bg===name));
    const c=document.createElement("canvas");c.width=1080;c.height=1920;const x=c.getContext("2d");x.fillStyle=gradientSpec(name,x);x.fillRect(0,0,c.width,c.height);
    const rg=x.createRadialGradient(280,300,0,280,300,650);rg.addColorStop(0,"rgba(255,255,255,.14)");rg.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=rg;x.fillRect(0,0,c.width,c.height);
    for(let i=0;i<90;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.18})`;x.beginPath();x.arc(Math.random()*1080,Math.random()*1920,Math.random()*2.4+.4,0,Math.PI*2);x.fill();}
    await setImageBackground(c.toDataURL("image/jpeg",.93),`Quran ${name}`); updateDemo();
  }

  async function setImageBackground(url,name="Quran Background") {
    return new Promise((resolve,reject)=>{ const img=new Image();img.onload=()=>{ if(qr.backgroundLayerId) state.layers=state.layers.filter(x=>x.id!==qr.backgroundLayerId); const l={id:`qbg-${Date.now()}`,type:"sticker",name,visible:true,x:canvas.width/2,y:canvas.height/2,rotation:0,scale:1,baseW:canvas.width,baseH:canvas.height,image:img,src:url,localObjectUrl:url.startsWith("blob:")};state.layers.unshift(l);qr.backgroundLayerId=l.id;renderLayersList();resolve();};img.onerror=reject;img.src=url; });
  }

  async function onBgImage(file) { if(!file)return; const url=URL.createObjectURL(file); await setImageBackground(url,file.name); setStatus("تم تطبيق الصورة كخلفية.","ok"); }
  function onBgVideo(file) { if(!file)return; loadVideoBlob(file,file.name); sourceVideo.loop=true; setStatus("تم تطبيق الفيديو كخلفية وسيتم تكراره إذا كان أقصر من التلاوة.","ok"); }

  async function searchStock() {
    const q=qid("qrStockQuery").value.trim(); if(!q)return setStatus("اكتب كلمة للبحث عن الخلفية.","err");
    const box=qid("qrStockResults");box.innerHTML='<div class="qr-stock-msg">جاري البحث...</div>';
    try {
      const endpoint=qr.stockSource==="pixabay"?"/api/pixabay":"/api/pexels";const r=await fetch(`${endpoint}?query=${encodeURIComponent(q)}&per_page=9`);const d=await r.json();if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);
      const items=qr.stockSource==="pixabay"?(d.hits||[]).map(v=>{const a=Object.values(v.videos||{}).filter(x=>x?.url);a.sort((x,y)=>(y.height||0)-(x.height||0));return{thumb:a[0]?.thumbnail,url:a[0]?.url};}):(d.videos||[]).map(v=>{const a=(v.video_files||[]).filter(x=>x.link);a.sort((x,y)=>Math.abs((x.width||0)/(x.height||1)-9/16)-Math.abs((y.width||0)/(y.height||1)-9/16));return{thumb:v.image,url:a[0]?.link};});
      box.innerHTML="";items.filter(x=>x.url).slice(0,9).forEach((it,i)=>{const b=document.createElement("button");b.className="qr-stock-item";b.type="button";b.innerHTML=`<img src="${esc(it.thumb||"")}" alt=""><span>استخدام الخلفية</span>`;b.onclick=async()=>{setStatus("جاري تحميل فيديو الخلفية...");await loadRemoteVideo(it.url,`Quran stock ${i+1}`);sourceVideo.loop=true;setStatus("تم اختيار فيديو الخلفية ✅","ok");};box.appendChild(b);}); if(!box.children.length)box.innerHTML='<div class="qr-stock-msg">لا توجد نتائج.</div>';
    } catch(e){box.innerHTML=`<div class="qr-stock-msg">${esc(e.message)}</div>`;}
  }

  async function playPrepared() {
    if(!qr.wavBlob)return setStatus("أنشئ ريل القرآن أولًا.","err");
    try { sourceAudio.currentTime=0; if(state.videoLoaded){sourceVideo.currentTime=0;sourceVideo.loop=true;await sourceVideo.play();} await sourceAudio.play(); qr.active=true; startVerseSync(); setStatus("المعاينة تعمل الآن.","ok"); } catch(e){setStatus(`تعذر بدء المعاينة: ${e.message}`,"err");}
  }

  function chooseMime() { const c=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];return c.find(x=>MediaRecorder.isTypeSupported?.(x))||""; }

  function cloneBuffer(buffer,ctx){const b=ctx.createBuffer(Math.min(2,buffer.numberOfChannels),buffer.length,buffer.sampleRate);for(let c=0;c<b.numberOfChannels;c++)b.copyToChannel(buffer.getChannelData(c),c);return b;}

  async function exportQuran() {
    if(!qr.mergedBuffer)return setStatus("أنشئ ريل القرآن أولًا قبل التصدير.","err");
    if(!window.MediaRecorder||!canvas.captureStream)return setStatus("المتصفح لا يدعم التصدير. استخدم Chrome حديثًا.","err");
    qr.cancel=false; const quality=Number(qid("qrQuality").value),fps=Number(qid("qrFps").value); if(quality===2160&&/Android|iPhone|iPad/i.test(navigator.userAgent)) setStatus("4K على الهاتف قد يكون ثقيلًا جدًا؛ لو فشل استخدم 1080p.");
    const oldW=canvas.width,oldH=canvas.height,targetW=quality,targetH=Math.round(quality*16/9); let stream,rec,ac,src; const chunks=[]; state.exporting=true; setProgress(2,"بدء التصدير...");
    try {
      canvas.width=targetW;canvas.height=targetH;scaleProject(oldW,oldH,targetW,targetH);updateLayerStyle(state.layers.find(x=>x.id===qr.quranLayerId));
      stream=canvas.captureStream(fps); ac=new (window.AudioContext||window.webkitAudioContext)({sampleRate:qr.mergedBuffer.sampleRate}); const dest=ac.createMediaStreamDestination();src=ac.createBufferSource();src.buffer=cloneBuffer(qr.mergedBuffer,ac);src.connect(dest);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
      const mime=chooseMime(),bps=quality>=2160?28_000_000:quality>=1080?11_000_000:quality>=720?6_000_000:3_000_000;rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:bps}:{videoBitsPerSecond:bps});rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};const stopped=new Promise((res,rej)=>{rec.onstop=res;rec.onerror=e=>rej(e.error||e);});
      sourceAudio.pause();if(state.videoLoaded){sourceVideo.pause();sourceVideo.currentTime=0;sourceVideo.loop=true;sourceVideo.muted=true;await sourceVideo.play().catch(()=>{});}qr.exportClock=0;rec.start(300);src.start();const start=ac.currentTime,dur=qr.mergedBuffer.duration;
      while(ac.currentTime-start<dur){if(qr.cancel)break;qr.exportClock=ac.currentTime-start;applyVerseAt(qr.exportClock);setProgress(5+qr.exportClock/dur*90,`تصدير ${Math.floor(qr.exportClock)} / ${Math.ceil(dur)} ث`);await sleep(80);}try{src.stop();}catch{} if(rec.state!=="inactive")rec.stop();await stopped;
      if(qr.cancel){setStatus("تم إلغاء التصدير.");return;}
      const type=rec.mimeType||mime||"video/webm",blob=new Blob(chunks,{type});qr.exportedBlob=blob;const ext=type.includes("mp4")?"mp4":"webm";downloadBlob(blob,`quran-reel-${Date.now()}.${ext}`);setProgress(100,"اكتمل التصدير");setStatus(`تم تصدير ريل القرآن ${quality===2160?"4K":quality+"p"} ✅`,"ok");qid("qrPreviewStatus").textContent=`تم إنشاء الفيديو النهائي (${ext.toUpperCase()}). استخدم زر مشاركة الفيديو لإرساله مباشرة إذا كان هاتفك يدعم Web Share.`;
    } catch(e){setStatus(`فشل التصدير: ${e.message}. جرّب جودة أقل أو Chrome أحدث.`,"err");}
    finally{qr.exportClock=null;state.exporting=false;sourceVideo.pause();sourceVideo.muted=false;stream?.getTracks().forEach(t=>t.stop());await ac?.close().catch(()=>{});canvas.width=oldW;canvas.height=oldH;scaleProject(targetW,targetH,oldW,oldH);updateLayerStyle(state.layers.find(x=>x.id===qr.quranLayerId));}
  }

  async function shareFile() {
    if(!qr.exportedBlob)return setStatus("صدّر الفيديو أولًا ثم اضغط مشاركة.","err");
    const ext=qr.exportedBlob.type.includes("mp4")?"mp4":"webm",file=new File([qr.exportedBlob],`quran-reel.${ext}`,{type:qr.exportedBlob.type});
    try { if(navigator.canShare?.({files:[file]})){await navigator.share({title:"ريل قرآن كريم",text:"مقطع قرآن كريم",files:[file]});} else if(navigator.share){await navigator.share({title:"ريل قرآن كريم",text:"مقطع قرآن كريم",url:location.href});} else throw new Error("المشاركة المباشرة غير مدعومة"); } catch(e){ if(e.name!=="AbortError")setStatus(e.message,"err"); }
  }

  function shareSite(kind) {
    const url=encodeURIComponent(location.href),text=encodeURIComponent("أنشئ ريلز قرآن كريم من هذا المحرر");
    const map={whatsapp:`https://wa.me/?text=${text}%20${url}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${url}`,telegram:`https://t.me/share/url?url=${url}&text=${text}`,x:`https://twitter.com/intent/tweet?text=${text}&url=${url}`,email:`mailto:?subject=${text}&body=${text}%0A${url}`};
    window.open(map[kind]||location.href,"_blank","noopener,noreferrer");
  }

  function openEditor() { closeStudio(); if(qr.quranLayerId){state.selected=qr.quranLayerId;renderLayersList();syncSelectedControls();} }

  function bind() {
    qid("qrClose").onclick=closeStudio; qid("qrSurah").onchange=updateAyahLimits; qid("qrFrom").oninput=()=>{if(Number(qid("qrTo").value)<Number(qid("qrFrom").value))qid("qrTo").value=qid("qrFrom").value;updateDemo();};qid("qrTo").oninput=updateDemo;
    qid("qrReciterSearch").oninput=renderReciters; qid("qrReciterPreview").onclick=previewReciter;
    document.querySelectorAll(".qr-bg").forEach(b=>b.onclick=()=>setBuiltinBackground(b.dataset.bg));
    qid("qrBgImage").onchange=e=>onBgImage(e.target.files?.[0]);qid("qrBgVideo").onchange=e=>onBgVideo(e.target.files?.[0]);
    document.querySelectorAll("[data-stock]").forEach(b=>b.onclick=()=>{qr.stockSource=b.dataset.stock;document.querySelectorAll("[data-stock]").forEach(x=>x.classList.toggle("active",x===b));});qid("qrStockSearchBtn").onclick=searchStock;qid("qrStockQuery").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();searchStock();}};
    ["qrFont","qrColor","qrTextBg","qrSize","qrOpacity","qrPosition","qrVerseNumber","qrSurahLabel","qrShadow"].forEach(id=>qid(id)?.addEventListener("input",()=>{updateOutputs();updateDemo();const l=state.layers.find(x=>x.id===qr.quranLayerId);if(l)updateLayerStyle(l);}));
    qid("qrPrepare").onclick=prepareQuran;qid("qrCancel").onclick=()=>{qr.cancel=true;};qid("qrSavePreset").onclick=saveSettings;qid("qrPlay").onclick=playPrepared;qid("qrExport").onclick=exportQuran;qid("qrOpenEditor").onclick=openEditor;qid("qrShareFile").onclick=shareFile;
    document.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>shareSite(b.dataset.share));
  }

  function addQualityOptions() {
    const q=qid("quality");if(!q)return;const current=new Set([...q.options].map(o=>o.value));[["360","360 × 640 — سريع"],["480","480 × 854 — متوسط"],["2160","2160 × 3840 — 4K Ultra HD"]].forEach(([v,t])=>{if(!current.has(v)){const o=document.createElement("option");o.value=v;o.textContent=t;q.appendChild(o);}});
  }

  window.addEventListener("DOMContentLoaded", async () => {
    addAssets(); injectLauncher(); injectStudio(); bind(); addQualityOptions(); updateOutputs(); await loadCatalogs();
  });
})();
