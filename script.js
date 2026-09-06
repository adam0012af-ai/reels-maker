"use strict";

const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const stage = $("stage");
const sourceVideo = $("sourceVideo");
const sourceAudio = $("sourceAudio");
const desktopPanels = document.querySelector(".panels");
const mobileSheet = $("mobileSheet");
const mobileHost = $("mobilePanelHost");

const state = {
  videoLoaded: false,
  videoUrl: null,
  audioUrl: null,
  videoSource: "pexels",
  stickerType: "stickers",
  layers: [],
  selected: null,
  pointer: null,
  exporting: false,
  cancelExport: false,
  muted: false,
  audioCtx: null,
  videoNode: null,
  musicNode: null,
  videoGain: null,
  musicGain: null,
  sfxGain: null,
  monitorVideo: null,
  monitorMusic: null,
  monitorSfx: null,
  recordDest: null,
  sfxEvents: [],
  mobilePanel: null,
  lastVideoTime: 0,
  lastSfxPreviewTime: -1
};

const controls = {
  videoSearch: $("videoSearch"), videoSearchBtn: $("videoSearchBtn"), videoResults: $("videoResults"), videoUpload: $("videoUpload"), videoStatus: $("videoStatus"), mediaNotice: $("mediaNotice"),
  stickerSearch: $("stickerSearch"), stickerSearchBtn: $("stickerSearchBtn"), stickerResults: $("stickerResults"), stickerUpload: $("stickerUpload"), stickerNotice: $("stickerNotice"),
  aiCaptionType: $("aiCaptionType"), aiCaptionPrompt: $("aiCaptionPrompt"), generateCaptionBtn: $("generateCaptionBtn"), aiStatus: $("aiStatus"),
  newText: $("newText"), addTextBtn: $("addTextBtn"), textEditor: $("textEditor"), textContent: $("textContent"), fontFamily: $("fontFamily"), fontSize: $("fontSize"), fontSizeOut: $("fontSizeOut"), textRotation: $("textRotation"), textRotationOut: $("textRotationOut"), textColor: $("textColor"), bgColor: $("bgColor"), shadowColor: $("shadowColor"), bgOpacity: $("bgOpacity"), bgOpacityOut: $("bgOpacityOut"), shadowBlur: $("shadowBlur"), shadowBlurOut: $("shadowBlurOut"), duplicateTextBtn: $("duplicateTextBtn"), speakSelectedTextBtn: $("speakSelectedTextBtn"), deleteTextBtn: $("deleteTextBtn"),
  audioUpload: $("audioUpload"), audioCard: $("audioCard"), audioName: $("audioName"), audioDuration: $("audioDuration"), removeAudioBtn: $("removeAudioBtn"), ttsText: $("ttsText"), ttsPreviewBtn: $("ttsPreviewBtn"), ttsGenerateBtn: $("ttsGenerateBtn"), ttsStatus: $("ttsStatus"), musicVolume: $("musicVolume"), musicVolumeOut: $("musicVolumeOut"), videoVolume: $("videoVolume"), videoVolumeOut: $("videoVolumeOut"), sfxVolume: $("sfxVolume"), sfxVolumeOut: $("sfxVolumeOut"),
  layers: $("layers"), layerTools: $("layerTools"), bringForwardBtn: $("bringForwardBtn"), sendBackwardBtn: $("sendBackwardBtn"), bringFrontBtn: $("bringFrontBtn"), sendBackBtn: $("sendBackBtn"), layerScale: $("layerScale"), layerScaleOut: $("layerScaleOut"), layerRotation: $("layerRotation"), layerRotationOut: $("layerRotationOut"), duplicateLayerBtn: $("duplicateLayerBtn"), deleteLayerBtn: $("deleteLayerBtn"),
  quality: $("quality"), fps: $("fps"), fit: $("fit"), performanceMode: $("performanceMode"), playBtn: $("playBtn"), timeline: $("timeline"), currentTime: $("currentTime"), duration: $("duration"), muteBtn: $("muteBtn"), resetBtn: $("resetBtn"), exportBtn: $("exportBtn"), emptyState: $("emptyState"), transformHud: $("transformHud"), exportModal: $("exportModal"), progressBar: $("progressBar"), progressText: $("progressText"), cancelExportBtn: $("cancelExportBtn"), toasts: $("toasts")
};

window.addEventListener("DOMContentLoaded", init);

function init() {
  bindTabs();
  bindMedia();
  bindStickers();
  bindText();
  bindAudio();
  bindLayers();
  bindTransport();
  bindStage();
  bindExport();
  window.addEventListener("resize", syncResponsivePanels);
  syncResponsivePanels();
  requestAnimationFrame(renderLoop);
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));
}

function activateTab(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${name}`));
  if (innerWidth <= 900) openMobilePanel(name);
}

function openMobilePanel(name) {
  const panel = $(`panel-${name}`);
  if (!panel) return;
  if (state.mobilePanel && state.mobilePanel !== panel) desktopPanels.appendChild(state.mobilePanel);
  state.mobilePanel = panel;
  mobileHost.appendChild(panel);
  mobileSheet.classList.add("open");
}

function syncResponsivePanels() {
  if (innerWidth > 900) {
    if (state.mobilePanel) desktopPanels.appendChild(state.mobilePanel);
    state.mobilePanel = null;
    mobileSheet.classList.remove("open");
  } else {
    const active = document.querySelector(".mobile-tabs .tab.active")?.dataset.tab || "video";
    openMobilePanel(active);
  }
}

function bindMedia() {
  document.querySelectorAll("#videoSourceSwitch button").forEach(btn => btn.addEventListener("click", () => {
    state.videoSource = btn.dataset.source;
    document.querySelectorAll("#videoSourceSwitch button").forEach(b => b.classList.toggle("active", b === btn));
    controls.videoResults.innerHTML = "";
    hideNotice(controls.mediaNotice);
  }));
  controls.videoSearchBtn.addEventListener("click", () => searchVideos(controls.videoSearch.value.trim()));
  controls.videoSearch.addEventListener("keydown", e => { if (e.key === "Enter") searchVideos(controls.videoSearch.value.trim()); });
  document.querySelectorAll("[data-video-q]").forEach(btn => btn.addEventListener("click", () => {
    controls.videoSearch.value = btn.dataset.videoQ;
    searchVideos(btn.dataset.videoQ);
  }));
  controls.videoUpload.addEventListener("change", () => {
    const file = controls.videoUpload.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) return toast("اختر ملف فيديو صالحًا.", "error");
    loadVideoBlob(file, file.name);
  });
}

async function searchVideos(query) {
  if (!query) return toast("اكتب كلمة للبحث أولاً.", "error");
  controls.videoResults.innerHTML = '<div class="results-msg">جاري البحث...</div>';
  hideNotice(controls.mediaNotice);
  const endpoint = state.videoSource === "pixabay" ? "/api/pixabay" : "/api/pexels";
  try {
    const r = await fetch(`${endpoint}?query=${encodeURIComponent(query)}&per_page=18`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    const items = state.videoSource === "pixabay" ? normalizePixabay(data) : normalizePexels(data);
    showVideoResults(items);
  } catch (err) {
    console.error(err);
    if (state.videoSource === "pixabay") {
      showNotice(controls.mediaNotice, "Pixabay غير متاح الآن أو المفتاح غير مضاف. تم التحويل تلقائيًا إلى Pexels.");
      state.videoSource = "pexels";
      document.querySelectorAll("#videoSourceSwitch button").forEach(b => b.classList.toggle("active", b.dataset.source === "pexels"));
      return searchVideos(query);
    }
    controls.videoResults.innerHTML = '<div class="results-msg">تعذر تحميل النتائج. يمكنك رفع فيديو من جهازك.</div>';
    toast("تعذر الاتصال بمصدر الفيديو.", "error");
  }
}

function normalizePexels(data) {
  return (data.videos || []).map(v => {
    const files = (v.video_files || []).filter(f => f.link);
    const portrait = files.filter(f => (f.height || 0) > (f.width || 0));
    const pool = portrait.length ? portrait : files;
    pool.sort((a, b) => Math.abs((a.width || 0) * (a.height || 0) - 2073600) - Math.abs((b.width || 0) * (b.height || 0) - 2073600));
    return { id: v.id, source: "Pexels", thumb: v.image, url: pool[0]?.link, label: `Pexels #${v.id}` };
  }).filter(x => x.url);
}

function normalizePixabay(data) {
  return (data.hits || []).map(v => {
    const versions = Object.values(v.videos || {}).filter(x => x?.url);
    versions.sort((a, b) => Math.abs((a.width || 0) * (a.height || 0) - 2073600) - Math.abs((b.width || 0) * (b.height || 0) - 2073600));
    const pick = versions[0];
    return { id: v.id, source: "Pixabay", thumb: pick?.thumbnail, url: pick?.url, label: `Pixabay #${v.id}` };
  }).filter(x => x.url);
}

function showVideoResults(items) {
  controls.videoResults.innerHTML = "";
  if (!items.length) {
    controls.videoResults.innerHTML = '<div class="results-msg">لا توجد نتائج.</div>';
    return;
  }
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `<img loading="lazy" src="${escapeHTML(item.thumb || "")}" alt="${item.source}"><span class="src">${item.source}</span>`;
    card.addEventListener("click", () => loadRemoteVideo(item.url, item.label));
    controls.videoResults.appendChild(card);
  });
}

async function loadRemoteVideo(remoteUrl, name) {
  controls.videoStatus.textContent = "جاري تجهيز الفيديو...";
  try {
    const r = await fetch(`/api/media?url=${encodeURIComponent(remoteUrl)}`);
    if (!r.ok) throw new Error(`media ${r.status}`);
    const blob = await r.blob();
    loadVideoBlob(blob, name);
  } catch (err) {
    console.error(err);
    controls.videoStatus.textContent = "تعذر تجهيز الفيديو";
    toast("تعذر تحميل هذا الفيديو. جرّب نتيجة أخرى أو ارفع فيديو محليًا.", "error");
  }
}

function loadVideoBlob(blob, name) {
  revokeVideoUrl();
  state.videoUrl = URL.createObjectURL(blob);
  sourceVideo.src = state.videoUrl;
  sourceVideo.load();
  sourceVideo.onloadedmetadata = () => {
    state.videoLoaded = true;
    sourceVideo.currentTime = 0;
    state.lastVideoTime = 0;
    controls.emptyState.classList.add("hidden");
    controls.videoStatus.textContent = `${name} — ${fmt(sourceVideo.duration)}`;
    controls.duration.textContent = fmt(sourceVideo.duration);
    controls.timeline.value = 0;
    setupAudioGraph();
    toast("تم تحميل الفيديو.", "ok");
  };
  sourceVideo.onerror = () => toast("المتصفح لم يتمكن من قراءة الفيديو.", "error");
}

function bindStickers() {
  document.querySelectorAll("#stickerTypeSwitch button").forEach(btn => btn.addEventListener("click", () => {
    state.stickerType = btn.dataset.stickerType;
    document.querySelectorAll("#stickerTypeSwitch button").forEach(b => b.classList.toggle("active", b === btn));
  }));
  controls.stickerSearchBtn.addEventListener("click", () => searchStickers(controls.stickerSearch.value.trim()));
  controls.stickerSearch.addEventListener("keydown", e => { if (e.key === "Enter") searchStickers(controls.stickerSearch.value.trim()); });
  controls.stickerUpload.addEventListener("change", () => {
    const file = controls.stickerUpload.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("اختر صورة أو GIF صالحًا.", "error");
    const url = URL.createObjectURL(file);
    addStickerLayer(url, file.name, true);
  });
}

async function searchStickers(query) {
  if (!query) return toast("اكتب كلمة للبحث عن ملصق.", "error");
  controls.stickerResults.innerHTML = '<div class="results-msg">جاري البحث...</div>';
  hideNotice(controls.stickerNotice);
  try {
    const r = await fetch(`/api/giphy?query=${encodeURIComponent(query)}&type=${state.stickerType}&limit=20`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    showStickerResults(data.items || []);
  } catch (err) {
    console.error(err);
    controls.stickerResults.innerHTML = "";
    showNotice(controls.stickerNotice, "GIPHY غير متاح أو المفتاح غير مضاف. يمكنك رفع PNG / WebP / GIF من جهازك وسيعمل كملصق.");
  }
}

function showStickerResults(items) {
  controls.stickerResults.innerHTML = "";
  if (!items.length) {
    controls.stickerResults.innerHTML = '<div class="results-msg">لا توجد نتائج.</div>';
    return;
  }
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "sticker-card";
    card.innerHTML = `<img loading="lazy" src="${escapeHTML(item.preview)}" alt="GIPHY">`;
    card.addEventListener("click", () => addStickerLayer(`/api/media?url=${encodeURIComponent(item.url)}`, item.title || "GIPHY Sticker", false));
    controls.stickerResults.appendChild(card);
  });
}

function addStickerLayer(url, label, localObjectUrl) {
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    const maxW = canvas.width * 0.42;
    const maxH = canvas.height * 0.28;
    const ratio = Math.min(maxW / (img.naturalWidth || 1), maxH / (img.naturalHeight || 1), 1);
    const layer = {
      id: uid("sticker"), type: "sticker", name: label || "Sticker", visible: true,
      x: canvas.width / 2, y: canvas.height / 2, rotation: 0, scale: 1,
      baseW: Math.max(120, (img.naturalWidth || 300) * ratio), baseH: Math.max(120, (img.naturalHeight || 300) * ratio),
      image: img, src: url, localObjectUrl
    };
    state.layers.push(layer);
    state.selected = layer.id;
    renderLayersList();
    syncSelectedControls();
    activateTab("layers");
    toast("تمت إضافة الملصق. اسحبه أو استخدم المقبض للتكبير والتدوير.", "ok");
  };
  img.onerror = () => toast("تعذر تحميل الملصق.", "error");
  img.src = url;
}

function bindText() {
  controls.addTextBtn.addEventListener("click", () => addTextLayer(controls.newText.value.trim() || "اكتب النص هنا"));
  controls.newText.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addTextLayer(controls.newText.value.trim() || "اكتب النص هنا"); } });
  controls.generateCaptionBtn.addEventListener("click", generateCaption);
  [controls.textContent, controls.textColor, controls.bgColor, controls.shadowColor].forEach(el => el.addEventListener("input", updateSelectedText));
  controls.fontFamily.addEventListener("change", updateSelectedText);
  controls.fontSize.addEventListener("input", () => { controls.fontSizeOut.textContent = controls.fontSize.value; updateSelectedText(); });
  controls.textRotation.addEventListener("input", () => { controls.textRotationOut.textContent = `${controls.textRotation.value}°`; updateSelectedText(); });
  controls.bgOpacity.addEventListener("input", () => { controls.bgOpacityOut.textContent = `${controls.bgOpacity.value}%`; updateSelectedText(); });
  controls.shadowBlur.addEventListener("input", () => { controls.shadowBlurOut.textContent = controls.shadowBlur.value; updateSelectedText(); });
  controls.duplicateTextBtn.addEventListener("click", duplicateSelectedLayer);
  controls.deleteTextBtn.addEventListener("click", deleteSelectedLayer);
  controls.speakSelectedTextBtn.addEventListener("click", () => {
    const l = selectedLayer();
    if (l?.type !== "text") return;
    speakBrowser(l.text);
  });
}

function addTextLayer(text) {
  const layer = {
    id: uid("text"), type: "text", name: text.slice(0, 32) || "نص", text,
    visible: true, x: canvas.width / 2, y: canvas.height / 2,
    rotation: 0, scale: 1, font: "Cairo", size: 72, color: "#ffffff",
    bg: "#000000", bgOpacity: .35, shadow: "#000000", shadowBlur: 10,
    padX: 28, padY: 16
  };
  state.layers.push(layer);
  state.selected = layer.id;
  controls.newText.value = "";
  renderLayersList();
  syncSelectedControls();
  activateTab("text");
}

async function generateCaption() {
  const type = controls.aiCaptionType.value;
  const prompt = controls.aiCaptionPrompt.value.trim();
  controls.generateCaptionBtn.disabled = true;
  controls.aiStatus.textContent = "جاري توليد الاقتراح...";
  let text = "";
  try {
    const r = await fetch("/api/ai-caption", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, prompt }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    text = String(data.text || "").trim();
    controls.aiStatus.textContent = "تم التوليد عبر الذكاء الاصطناعي.";
  } catch (err) {
    console.warn(err);
    text = localCaption(type, prompt);
    controls.aiStatus.textContent = "تم استخدام اقتراح محلي لأن خدمة AI غير متاحة.";
  } finally {
    controls.generateCaptionBtn.disabled = false;
  }
  if (!text) text = localCaption(type, prompt);
  controls.newText.value = text;
  addTextLayer(text);
}

function localCaption(type, prompt) {
  const bank = {
    dua: ["اللهم اجعل القادم أجمل مما مضى", "اللهم اكتب لنا الخير حيث كان", "يا رب ارزقنا طمأنينة القلب وجمال الأقدار"],
    wisdom: ["البدايات الصغيرة تصنع نتائج كبيرة", "ما تزرعه اليوم تحصده غدًا", "هدوءك قوة عندما يزدحم كل شيء"],
    quote: ["استمر، فالخطوة القادمة قد تغيّر كل شيء", "لا تنتظر اللحظة المثالية، اصنعها", "ابدأ بما لديك واصنع ما تريد"],
    travel: ["كل طريق جديد يحكي قصة تستحق أن تُعاش", "رحلة قصيرة، ذكرى طويلة", "اخرج من المعتاد واكتشف عالمًا جديدًا"],
    business: ["الفكرة تبدأ صغيرة، والتنفيذ يصنع الفرق", "ركّز على القيمة والنتائج ستتبع", "كل تقدم حقيقي يبدأ بخطوة واضحة"],
    custom: [prompt ? `فكرة اليوم: ${prompt}` : "اكتب قصتك بالطريقة التي تستحق أن تُروى"]
  };
  const arr = bank[type] || bank.custom;
  return arr[Math.floor(Math.random() * arr.length)];
}

function updateSelectedText() {
  const l = selectedLayer();
  if (!l || l.type !== "text") return;
  l.text = controls.textContent.value;
  l.name = l.text.slice(0, 32) || "نص";
  l.font = controls.fontFamily.value;
  l.size = +controls.fontSize.value;
  l.rotation = +controls.textRotation.value;
  l.color = controls.textColor.value;
  l.bg = controls.bgColor.value;
  l.bgOpacity = +controls.bgOpacity.value / 100;
  l.shadow = controls.shadowColor.value;
  l.shadowBlur = +controls.shadowBlur.value;
  controls.layerRotation.value = l.rotation;
  controls.layerRotationOut.textContent = `${Math.round(l.rotation)}°`;
  renderLayersList();
}

function bindAudio() {
  controls.audioUpload.addEventListener("change", () => {
    const file = controls.audioUpload.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) return toast("اختر ملفًا صوتيًا صالحًا.", "error");
    loadAudioBlob(file, file.name);
  });
  controls.removeAudioBtn.addEventListener("click", removeAudio);
  controls.musicVolume.addEventListener("input", () => { controls.musicVolumeOut.textContent = `${controls.musicVolume.value}%`; updateAudioGains(); });
  controls.videoVolume.addEventListener("input", () => { controls.videoVolumeOut.textContent = `${controls.videoVolume.value}%`; updateAudioGains(); });
  controls.sfxVolume.addEventListener("input", () => { controls.sfxVolumeOut.textContent = `${controls.sfxVolume.value}%`; updateAudioGains(); });
  controls.ttsPreviewBtn.addEventListener("click", () => speakBrowser(ttsInputText()));
  controls.ttsGenerateBtn.addEventListener("click", generateTTS);
  document.querySelectorAll("[data-sfx]").forEach(btn => btn.addEventListener("click", () => addSfx(btn.dataset.sfx)));
}

function ttsInputText() {
  const direct = controls.ttsText.value.trim();
  if (direct) return direct;
  const l = selectedLayer();
  return l?.type === "text" ? l.text : "";
}

function speakBrowser(text) {
  text = String(text || "").trim();
  if (!text) return toast("اكتب أو حدّد نصًا أولًا.", "error");
  if (!("speechSynthesis" in window)) return toast("Web Speech غير مدعوم في هذا المتصفح.", "error");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = /[\u0600-\u06ff]/.test(text) ? "ar-EG" : "en-US";
  u.rate = .95;
  speechSynthesis.speak(u);
}

async function generateTTS() {
  const text = ttsInputText();
  if (!text) return toast("اكتب نص التعليق الصوتي أولًا.", "error");
  controls.ttsGenerateBtn.disabled = true;
  controls.ttsStatus.textContent = "جاري إنشاء التعليق الصوتي...";
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${r.status}`);
    }
    const blob = await r.blob();
    loadAudioBlob(blob, "AI Voiceover.mp3");
    controls.ttsStatus.textContent = "تم إنشاء التعليق الصوتي وإضافته للمشروع.";
  } catch (err) {
    console.warn(err);
    controls.ttsStatus.textContent = "ElevenLabs غير متاح؛ تم التحويل إلى Web Speech للمعاينة فقط.";
    speakBrowser(text);
    toast("أضف ELEVENLABS_API_KEY لتوليد ملف صوتي يدخل في التصدير.");
  } finally {
    controls.ttsGenerateBtn.disabled = false;
  }
}

function loadAudioBlob(blob, name) {
  revokeAudioUrl();
  state.audioUrl = URL.createObjectURL(blob);
  sourceAudio.src = state.audioUrl;
  sourceAudio.load();
  controls.audioName.textContent = name;
  controls.audioCard.classList.remove("hidden");
  sourceAudio.onloadedmetadata = () => {
    controls.audioDuration.textContent = fmt(sourceAudio.duration);
    setupAudioGraph();
    toast("تمت إضافة الصوت.", "ok");
  };
}

function removeAudio() {
  sourceAudio.pause();
  sourceAudio.removeAttribute("src");
  sourceAudio.load();
  revokeAudioUrl();
  controls.audioUpload.value = "";
  controls.audioCard.classList.add("hidden");
  toast("تمت إزالة المسار الصوتي.", "ok");
}

async function setupAudioGraph() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!state.audioCtx) {
      state.audioCtx = new AC();
      state.recordDest = state.audioCtx.createMediaStreamDestination();
      state.videoGain = state.audioCtx.createGain();
      state.musicGain = state.audioCtx.createGain();
      state.sfxGain = state.audioCtx.createGain();
      state.monitorVideo = state.audioCtx.createGain();
      state.monitorMusic = state.audioCtx.createGain();
      state.monitorSfx = state.audioCtx.createGain();
      state.videoGain.connect(state.recordDest); state.videoGain.connect(state.monitorVideo); state.monitorVideo.connect(state.audioCtx.destination);
      state.musicGain.connect(state.recordDest); state.musicGain.connect(state.monitorMusic); state.monitorMusic.connect(state.audioCtx.destination);
      state.sfxGain.connect(state.recordDest); state.sfxGain.connect(state.monitorSfx); state.monitorSfx.connect(state.audioCtx.destination);
    }
    if (state.audioCtx.state === "suspended") await state.audioCtx.resume().catch(() => {});
    if (!state.videoNode) { state.videoNode = state.audioCtx.createMediaElementSource(sourceVideo); state.videoNode.connect(state.videoGain); }
    if (!state.musicNode) { state.musicNode = state.audioCtx.createMediaElementSource(sourceAudio); state.musicNode.connect(state.musicGain); }
    updateAudioGains();
  } catch (err) { console.warn("Audio graph", err); }
}

function updateAudioGains() {
  const mon = state.muted ? 0 : 1;
  if (state.videoGain) state.videoGain.gain.value = +controls.videoVolume.value / 100;
  if (state.musicGain) state.musicGain.gain.value = +controls.musicVolume.value / 100;
  if (state.sfxGain) state.sfxGain.gain.value = +controls.sfxVolume.value / 100;
  if (state.monitorVideo) state.monitorVideo.gain.value = mon;
  if (state.monitorMusic) state.monitorMusic.gain.value = mon;
  if (state.monitorSfx) state.monitorSfx.gain.value = mon;
}

async function addSfx(type) {
  await setupAudioGraph();
  const time = state.videoLoaded ? sourceVideo.currentTime : 0;
  state.sfxEvents.push({ id: uid("sfx"), type, time });
  playSfx(type);
  toast(`${type} تمت إضافته عند ${fmt(time)} وسيظهر في التصدير.`, "ok");
}

function playSfx(type, when = 0) {
  if (!state.audioCtx || !state.sfxGain) return;
  const ac = state.audioCtx;
  const start = ac.currentTime + Math.max(0, when);
  if (type === "whoosh") {
    const len = Math.floor(ac.sampleRate * .42);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * .32;
    const src = ac.createBufferSource(); const filter = ac.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.setValueAtTime(350, start); filter.frequency.exponentialRampToValueAtTime(2500, start + .4);
    src.buffer = buffer; src.connect(filter); filter.connect(state.sfxGain); src.start(start);
    return;
  }
  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.connect(gain); gain.connect(state.sfxGain);
  const map = { pop: [520, .12], ding: [880, .35], click: [1200, .045] };
  const [freq, dur] = map[type] || map.pop;
  osc.frequency.setValueAtTime(freq, start);
  if (type === "pop") osc.frequency.exponentialRampToValueAtTime(220, start + dur);
  gain.gain.setValueAtTime(.001, start); gain.gain.exponentialRampToValueAtTime(.35, start + .008); gain.gain.exponentialRampToValueAtTime(.001, start + dur);
  osc.start(start); osc.stop(start + dur + .02);
}

function scheduleSfxForExport() {
  state.sfxEvents.forEach(ev => playSfx(ev.type, ev.time));
}

function bindLayers() {
  controls.bringForwardBtn.addEventListener("click", () => moveLayer(1));
  controls.sendBackwardBtn.addEventListener("click", () => moveLayer(-1));
  controls.bringFrontBtn.addEventListener("click", () => moveLayer(999));
  controls.sendBackBtn.addEventListener("click", () => moveLayer(-999));
  controls.layerScale.addEventListener("input", () => {
    const l = selectedLayer(); if (!l) return;
    l.scale = +controls.layerScale.value / 100;
    controls.layerScaleOut.textContent = `${controls.layerScale.value}%`;
  });
  controls.layerRotation.addEventListener("input", () => {
    const l = selectedLayer(); if (!l) return;
    l.rotation = +controls.layerRotation.value;
    controls.layerRotationOut.textContent = `${Math.round(l.rotation)}°`;
    if (l.type === "text") { controls.textRotation.value = l.rotation; controls.textRotationOut.textContent = `${Math.round(l.rotation)}°`; }
  });
  controls.duplicateLayerBtn.addEventListener("click", duplicateSelectedLayer);
  controls.deleteLayerBtn.addEventListener("click", deleteSelectedLayer);
}

function selectedLayer() { return state.layers.find(l => l.id === state.selected) || null; }

function renderLayersList() {
  controls.layers.innerHTML = "";
  [...state.layers].reverse().forEach(layer => {
    const row = document.createElement("div");
    row.className = `layer${layer.id === state.selected ? " active" : ""}`;
    row.innerHTML = `<span class="type">${layer.type === "text" ? "T" : "✨"}</span><span class="name">${escapeHTML(layer.name || layer.text || "Layer")}</span><button class="eye">${layer.visible ? "◉" : "○"}</button>`;
    row.addEventListener("click", () => { state.selected = layer.id; renderLayersList(); syncSelectedControls(); });
    row.querySelector(".eye").addEventListener("click", e => { e.stopPropagation(); layer.visible = !layer.visible; renderLayersList(); });
    controls.layers.appendChild(row);
  });
}

function syncSelectedControls() {
  const l = selectedLayer();
  controls.layerTools.classList.toggle("hidden", !l);
  controls.textEditor.classList.toggle("hidden", !l || l.type !== "text");
  controls.transformHud.classList.toggle("hidden", !l);
  if (!l) return;
  controls.layerScale.value = Math.round((l.scale || 1) * 100);
  controls.layerScaleOut.textContent = `${controls.layerScale.value}%`;
  controls.layerRotation.value = Math.round(l.rotation || 0);
  controls.layerRotationOut.textContent = `${controls.layerRotation.value}°`;
  if (l.type === "text") {
    controls.textContent.value = l.text;
    controls.fontFamily.value = l.font;
    controls.fontSize.value = l.size; controls.fontSizeOut.textContent = Math.round(l.size);
    controls.textRotation.value = Math.round(l.rotation); controls.textRotationOut.textContent = `${Math.round(l.rotation)}°`;
    controls.textColor.value = l.color; controls.bgColor.value = l.bg; controls.shadowColor.value = l.shadow;
    controls.bgOpacity.value = Math.round(l.bgOpacity * 100); controls.bgOpacityOut.textContent = `${Math.round(l.bgOpacity * 100)}%`;
    controls.shadowBlur.value = Math.round(l.shadowBlur); controls.shadowBlurOut.textContent = Math.round(l.shadowBlur);
    if (!controls.ttsText.value.trim()) controls.ttsText.value = l.text;
  }
}

function moveLayer(delta) {
  const i = state.layers.findIndex(l => l.id === state.selected);
  if (i < 0) return;
  let ni = delta > 100 ? state.layers.length - 1 : delta < -100 ? 0 : clamp(i + delta, 0, state.layers.length - 1);
  if (ni === i) return;
  const [l] = state.layers.splice(i, 1);
  state.layers.splice(ni, 0, l);
  renderLayersList();
}

function duplicateSelectedLayer() {
  const l = selectedLayer(); if (!l) return;
  const copy = { ...l, id: uid(l.type), x: l.x + 35, y: l.y + 35, name: `${l.name || "Layer"} copy` };
  if (l.type === "sticker") copy.image = l.image;
  state.layers.push(copy);
  state.selected = copy.id;
  renderLayersList(); syncSelectedControls();
}

function deleteSelectedLayer() {
  const l = selectedLayer(); if (!l) return;
  if (l.type === "sticker" && l.localObjectUrl) URL.revokeObjectURL(l.src);
  state.layers = state.layers.filter(x => x.id !== l.id);
  state.selected = state.layers.at(-1)?.id || null;
  renderLayersList(); syncSelectedControls();
}

function bindTransport() {
  controls.playBtn.addEventListener("click", togglePlay);
  controls.muteBtn.addEventListener("click", () => { state.muted = !state.muted; controls.muteBtn.textContent = state.muted ? "🔇" : "🔊"; updateAudioGains(); });
  controls.timeline.addEventListener("input", () => {
    if (!state.videoLoaded) return;
    const t = (+controls.timeline.value / 1000) * sourceVideo.duration;
    sourceVideo.currentTime = t; state.lastVideoTime = t;
    if (sourceAudio.src && Number.isFinite(sourceAudio.duration)) sourceAudio.currentTime = Math.min(t, Math.max(0, sourceAudio.duration - .05));
  });
  sourceVideo.addEventListener("ended", () => { controls.playBtn.textContent = "▶"; if (!state.exporting) sourceAudio.pause(); });
  controls.resetBtn.addEventListener("click", resetProject);
}

async function togglePlay() {
  if (!state.videoLoaded) return toast("اختر فيديو أولًا.", "error");
  await setupAudioGraph();
  if (sourceVideo.paused) {
    try {
      state.lastVideoTime = sourceVideo.currentTime;
      await sourceVideo.play();
      if (sourceAudio.src) {
        sourceAudio.currentTime = Math.min(sourceVideo.currentTime, Math.max(0, (sourceAudio.duration || 0) - .05));
        await sourceAudio.play().catch(() => {});
      }
      controls.playBtn.textContent = "❚❚";
    } catch { toast("تعذر بدء التشغيل.", "error"); }
  } else {
    sourceVideo.pause(); sourceAudio.pause(); controls.playBtn.textContent = "▶";
  }
}

function resetProject() {
  sourceVideo.pause(); sourceAudio.pause();
  sourceVideo.removeAttribute("src"); sourceAudio.removeAttribute("src"); sourceVideo.load(); sourceAudio.load();
  revokeVideoUrl(); revokeAudioUrl();
  state.layers.forEach(l => { if (l.type === "sticker" && l.localObjectUrl) URL.revokeObjectURL(l.src); });
  state.videoLoaded = false; state.layers = []; state.selected = null; state.sfxEvents = [];
  controls.videoUpload.value = ""; controls.audioUpload.value = ""; controls.stickerUpload.value = "";
  controls.emptyState.classList.remove("hidden"); controls.transformHud.classList.add("hidden");
  controls.videoStatus.textContent = "لم يتم اختيار فيديو"; controls.duration.textContent = "00:00"; controls.currentTime.textContent = "00:00"; controls.timeline.value = 0;
  controls.audioCard.classList.add("hidden"); renderLayersList(); syncSelectedControls();
  toast("تم إنشاء مشروع جديد.", "ok");
}

function bindStage() {
  stage.addEventListener("pointerdown", pointerDown);
  stage.addEventListener("pointermove", pointerMove);
  stage.addEventListener("pointerup", pointerUp);
  stage.addEventListener("pointercancel", pointerUp);
  stage.addEventListener("lostpointercapture", pointerUp);
}

function stagePoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
}

function pointerDown(e) {
  const p = stagePoint(e);
  const selected = selectedLayer();
  if (selected && selected.visible) {
    const handle = layerHandle(selected);
    if (dist(p, handle) < Math.max(36, canvas.width * .035)) {
      const dx = p.x - selected.x, dy = p.y - selected.y;
      state.pointer = { mode: "transform", id: selected.id, startAngle: Math.atan2(dy, dx), startDist: Math.hypot(dx, dy), startScale: selected.scale, startRotation: selected.rotation };
      stage.setPointerCapture?.(e.pointerId); e.preventDefault(); return;
    }
  }
  const hit = findLayerAt(p.x, p.y);
  if (!hit) { state.selected = null; renderLayersList(); syncSelectedControls(); return; }
  state.selected = hit.id;
  state.pointer = { mode: "drag", id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y };
  renderLayersList(); syncSelectedControls();
  stage.setPointerCapture?.(e.pointerId); e.preventDefault();
}

function pointerMove(e) {
  if (!state.pointer) return;
  const l = state.layers.find(x => x.id === state.pointer.id); if (!l) return;
  const p = stagePoint(e);
  if (state.pointer.mode === "drag") {
    l.x = clamp(p.x - state.pointer.dx, 0, canvas.width);
    l.y = clamp(p.y - state.pointer.dy, 0, canvas.height);
  } else {
    const dx = p.x - l.x, dy = p.y - l.y;
    const d = Math.max(10, Math.hypot(dx, dy));
    l.scale = clamp(state.pointer.startScale * (d / Math.max(10, state.pointer.startDist)), .2, 3);
    const a = Math.atan2(dy, dx);
    l.rotation = normalizeDegrees(state.pointer.startRotation + (a - state.pointer.startAngle) * 180 / Math.PI);
    syncSelectedControls();
  }
  e.preventDefault();
}

function pointerUp(e) {
  if (!state.pointer) return;
  state.pointer = null;
  try { stage.releasePointerCapture?.(e.pointerId); } catch {}
  e.preventDefault();
}

function findLayerAt(x, y) {
  for (let i = state.layers.length - 1; i >= 0; i--) {
    const l = state.layers[i]; if (!l.visible) continue;
    const p = toLayerLocal(l, x, y);
    const b = baseBounds(l);
    if (Math.abs(p.x) <= b.w / 2 && Math.abs(p.y) <= b.h / 2) return l;
  }
  return null;
}

function toLayerLocal(l, x, y) {
  const rad = -(l.rotation || 0) * Math.PI / 180;
  const dx = x - l.x, dy = y - l.y;
  const s = l.scale || 1;
  return { x: (dx * Math.cos(rad) - dy * Math.sin(rad)) / s, y: (dx * Math.sin(rad) + dy * Math.cos(rad)) / s };
}

function baseBounds(l) {
  if (l.type === "sticker") return { w: l.baseW, h: l.baseH };
  ctx.save(); ctx.font = `700 ${l.size}px "${l.font}"`;
  const lines = String(l.text || "").split(/\n/); const lineH = l.size * 1.25;
  const w = Math.max(1, ...lines.map(t => ctx.measureText(t || " ").width)) + l.padX * 2;
  const h = lines.length * lineH + l.padY * 2;
  ctx.restore(); return { w, h, lineH };
}

function layerHandle(l) {
  const b = baseBounds(l); const s = l.scale || 1; const rad = (l.rotation || 0) * Math.PI / 180;
  const lx = b.w / 2 * s, ly = b.h / 2 * s;
  return { x: l.x + lx * Math.cos(rad) - ly * Math.sin(rad), y: l.y + lx * Math.sin(rad) + ly * Math.cos(rad) };
}

function renderLoop() {
  renderCanvas();
  if (state.videoLoaded && Number.isFinite(sourceVideo.duration) && sourceVideo.duration > 0) {
    controls.timeline.value = Math.round((sourceVideo.currentTime / sourceVideo.duration) * 1000) || 0;
    controls.currentTime.textContent = fmt(sourceVideo.currentTime);
    if (!sourceVideo.paused && !state.exporting) triggerPreviewSfx(state.lastVideoTime, sourceVideo.currentTime);
    state.lastVideoTime = sourceVideo.currentTime;
  }
  requestAnimationFrame(renderLoop);
}

function triggerPreviewSfx(from, to) {
  if (to < from) return;
  state.sfxEvents.forEach(ev => {
    if (ev.time > from && ev.time <= to + .05 && Math.abs(ev.time - state.lastSfxPreviewTime) > .02) {
      state.lastSfxPreviewTime = ev.time; playSfx(ev.type);
    }
  });
}

function renderCanvas() {
  ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (state.videoLoaded && sourceVideo.readyState >= 2) drawVideo();
  state.layers.filter(l => l.visible).forEach(drawLayer);
  ctx.restore();
}

function drawVideo() {
  const vw = sourceVideo.videoWidth || 1, vh = sourceVideo.videoHeight || 1, cw = canvas.width, ch = canvas.height;
  const s = controls.fit.value === "contain" ? Math.min(cw / vw, ch / vh) : Math.max(cw / vw, ch / vh);
  const dw = vw * s, dh = vh * s;
  ctx.drawImage(sourceVideo, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

function drawLayer(l) {
  ctx.save(); ctx.translate(l.x, l.y); ctx.rotate((l.rotation || 0) * Math.PI / 180); ctx.scale(l.scale || 1, l.scale || 1);
  if (l.type === "sticker") {
    try { ctx.drawImage(l.image, -l.baseW / 2, -l.baseH / 2, l.baseW, l.baseH); } catch {}
  } else drawTextLayerLocal(l);
  if (l.id === state.selected && !state.exporting) drawSelectionLocal(l);
  ctx.restore();
  if (l.id === state.selected && !state.exporting) drawHandle(l);
}

function drawTextLayerLocal(l) {
  const b = baseBounds(l); const lines = String(l.text || "").split(/\n/); const lineH = b.lineH || l.size * 1.25;
  ctx.fillStyle = hexAlpha(l.bg, l.bgOpacity); roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, Math.max(8, l.size * .16)); ctx.fill();
  ctx.font = `700 ${l.size}px "${l.font}"`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = l.color;
  ctx.shadowColor = l.shadow; ctx.shadowBlur = l.shadowBlur; ctx.shadowOffsetY = Math.max(1, l.shadowBlur * .25);
  const start = -((lines.length - 1) * lineH) / 2;
  lines.forEach((t, i) => ctx.fillText(t || " ", 0, start + i * lineH));
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
}

function drawSelectionLocal(l) {
  const b = baseBounds(l); ctx.strokeStyle = "rgba(145,119,255,.98)"; ctx.lineWidth = Math.max(2, canvas.width / 480) / (l.scale || 1);
  ctx.setLineDash([12 / (l.scale || 1), 8 / (l.scale || 1)]); ctx.strokeRect(-b.w / 2 - 6, -b.h / 2 - 6, b.w + 12, b.h + 12);
}

function drawHandle(l) {
  const h = layerHandle(l); const r = Math.max(13, canvas.width * .014);
  ctx.save(); ctx.fillStyle = "#7d5cff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, canvas.width / 540);
  ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = `${Math.max(12, canvas.width * .012)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("↻", h.x, h.y); ctx.restore();
}

function bindExport() {
  controls.exportBtn.addEventListener("click", exportReel);
  controls.cancelExportBtn.addEventListener("click", () => { state.cancelExport = true; });
}

async function exportReel() {
  if (!state.videoLoaded) return toast("اختر فيديو قبل التصدير.", "error");
  if (state.exporting) return;
  if (!window.MediaRecorder || !canvas.captureStream) return toast("هذا المتصفح لا يدعم تصدير Canvas. جرّب Chrome/Edge حديثًا.", "error");
  state.exporting = true; state.cancelExport = false; controls.exportModal.classList.remove("hidden"); setProgress(0);
  const oldW = canvas.width, oldH = canvas.height;
  let targetW = +controls.quality.value;
  const mobileAuto = controls.performanceMode.value === "auto" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobileAuto && targetW > 720) targetW = 720;
  const targetH = Math.round(targetW * 16 / 9);
  canvas.width = targetW; canvas.height = targetH; scaleProject(oldW, oldH, targetW, targetH);
  let recorder = null, stream = null, chunks = [];
  try {
    await document.fonts.ready; await setupAudioGraph();
    sourceVideo.pause(); sourceAudio.pause(); await seek(sourceVideo, 0); if (sourceAudio.src) await seek(sourceAudio, 0).catch(() => {});
    stream = canvas.captureStream(effectiveFps());
    if (state.recordDest) state.recordDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    const mime = pickMime();
    const bps = targetW >= 1080 ? 11_000_000 : targetW >= 720 ? 6_500_000 : 3_500_000;
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: bps } : { videoBitsPerSecond: bps });
    recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise((resolve, reject) => { recorder.onstop = resolve; recorder.onerror = e => reject(e.error || e); });
    recorder.start(300);
    scheduleSfxForExport();
    await sourceVideo.play();
    if (sourceAudio.src) { sourceAudio.currentTime = 0; await sourceAudio.play().catch(() => {}); }
    await monitorExport();
    sourceVideo.pause(); sourceAudio.pause();
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    if (state.cancelExport) { toast("تم إلغاء التصدير."); return; }
    const type = recorder.mimeType || mime || "video/webm";
    const blob = new Blob(chunks, { type });
    const ext = type.includes("mp4") ? "mp4" : "webm";
    downloadBlob(blob, `reels-maker-${Date.now()}.${ext}`);
    setProgress(100); toast(`تم تصدير الريل ${targetW}p بنجاح.`, "ok");
  } catch (err) {
    console.error(err); toast("حدث خطأ أثناء التصدير. جرّب جودة 720p أو Chrome/Edge.", "error");
  } finally {
    sourceVideo.pause(); sourceAudio.pause(); if (stream) stream.getTracks().forEach(t => t.stop());
    canvas.width = oldW; canvas.height = oldH; scaleProject(targetW, targetH, oldW, oldH);
    state.exporting = false; setTimeout(() => controls.exportModal.classList.add("hidden"), 300);
  }
}

function effectiveFps() {
  const selected = +controls.fps.value;
  if (controls.performanceMode.value === "mobile") return Math.min(30, selected);
  if (controls.performanceMode.value === "auto" && /iPhone|iPad|Android/i.test(navigator.userAgent)) return Math.min(30, selected);
  return selected;
}

function pickMime() {
  const candidates = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find(t => MediaRecorder.isTypeSupported?.(t)) || "";
}

function monitorExport() {
  return new Promise(resolve => {
    const tick = () => {
      if (state.cancelExport || sourceVideo.ended || sourceVideo.currentTime >= sourceVideo.duration - .06) return resolve();
      setProgress((sourceVideo.currentTime / sourceVideo.duration) * 100); setTimeout(tick, 120);
    };
    tick();
  });
}

function scaleProject(fromW, fromH, toW, toH) {
  const sx = toW / fromW, sy = toH / fromH;
  state.layers.forEach(l => {
    l.x *= sx; l.y *= sy;
    if (l.type === "text") { l.size *= sx; l.padX *= sx; l.padY *= sy; l.shadowBlur *= sx; }
    else { l.baseW *= sx; l.baseH *= sy; }
  });
}

function seek(media, time) {
  return new Promise((resolve, reject) => {
    if (!Number.isFinite(media.duration) || Math.abs(media.currentTime - time) < .03) { media.currentTime = time; resolve(); return; }
    const done = () => { cleanup(); resolve(); }, bad = () => { cleanup(); reject(new Error("seek failed")); }, cleanup = () => { media.removeEventListener("seeked", done); media.removeEventListener("error", bad); };
    media.addEventListener("seeked", done, { once: true }); media.addEventListener("error", bad, { once: true });
    media.currentTime = Math.min(Math.max(0, time), Math.max(0, media.duration - .01));
  });
}

function revokeVideoUrl() { if (state.videoUrl) { URL.revokeObjectURL(state.videoUrl); state.videoUrl = null; } }
function revokeAudioUrl() { if (state.audioUrl) { URL.revokeObjectURL(state.audioUrl); state.audioUrl = null; } }
function setProgress(v) { v = clamp(v, 0, 100); controls.progressBar.style.width = `${v}%`; controls.progressText.textContent = `${Math.round(v)}%`; }
function downloadBlob(blob, name) { const a = document.createElement("a"), url = URL.createObjectURL(blob); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
function showNotice(el, text) { el.textContent = text; el.classList.remove("hidden"); }
function hideNotice(el) { el.classList.add("hidden"); el.textContent = ""; }
function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function fmt(sec) { sec = Number.isFinite(sec) ? Math.max(0, sec) : 0; const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function normalizeDegrees(v) { while (v > 180) v -= 360; while (v < -180) v += 360; return v; }
function escapeHTML(s) { return String(s).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
function hexAlpha(hex, a) { const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1)})`; }
function roundRect(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function toast(msg, type = "") { const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = msg; controls.toasts.appendChild(el); setTimeout(() => el.remove(), 3400); }
