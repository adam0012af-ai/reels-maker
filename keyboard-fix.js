"use strict";

(() => {
  if (window.__RM_STUDIO_SHELL_V2__) return;
  window.__RM_STUDIO_SHELL_V2__ = true;

  const $ = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];
  const shellState = {
    activeTool: "video",
    drawerOpen: true,
    zoomed: false,
    aspect: "9:16",
    undo: [],
    redo: [],
    historyBusy: false,
    previewObjectUrl: null
  };

  const TOOL_META = {
    templates: ["القوالب", "بدايات سريعة لمشروعك"],
    video: ["الوسائط", "Pexels • Pixabay • رفع فيديو"],
    text: ["النصوص و AI Captions", "كتابة وتنسيق وتوليد النص"],
    quran: ["استوديو القرآن", "الآيات • القرّاء • المزامنة"],
    audio: ["الصوت و Gemini TTS", "تعليق صوتي ومؤثرات SFX"],
    stickers: ["الملصقات و GIF", "GIPHY وملفاتك المحلية"],
    layers: ["الطبقات", "ترتيب وتحويل عناصر التصميم"],
    settings: ["الإعدادات", "الجودة والأداء والتصدير"]
  };

  function injectCss() {
    if ($("studioShellV2Css")) return;
    const link = document.createElement("link");
    link.id = "studioShellV2Css";
    link.rel = "stylesheet";
    link.href = "studio-shell-v2.css?v=2";
    document.head.appendChild(link);
  }

  function fmt(sec) {
    sec = Number.isFinite(sec) ? Math.max(0, sec) : 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function movePanelsHome() {
    const panels = qs(".panels");
    const mobile = $("mobilePanelHost");
    if (!panels || !mobile) return;
    qsa("#mobilePanelHost > .panel").forEach(p => panels.appendChild(p));
    $("mobileSheet")?.classList.remove("open");
    if (typeof window.syncResponsivePanels === "function") {
      try { window.removeEventListener("resize", window.syncResponsivePanels); } catch {}
    }
  }

  function buildTemplatesPanel() {
    const panels = qs(".panels");
    if (!panels || $("panel-templates")) return;
    const panel = document.createElement("section");
    panel.id = "panel-templates";
    panel.className = "panel rm-template-panel";
    panel.innerHTML = `
      <div class="rm-template-hero">
        <b>ابدأ بسرعة من مسار جاهز</b>
        <p>القالب هنا يفتح أدوات المشروع الحقيقية ويضبط نقطة البداية فقط، بدون فصل المشروع عن المحرر.</p>
      </div>
      <div class="rm-template-grid">
        <button class="rm-template-card" type="button" data-template-tool="video"><strong>🎬 Reel 9:16</strong><span>فيديو عمودي Full HD مع مكتبة الوسائط.</span></button>
        <button class="rm-template-card" type="button" data-template-tool="quran"><strong>📖 Quran Reel</strong><span>آيات وقارئ وخلفية ومزامنة تلقائية.</span></button>
        <button class="rm-template-card" type="button" data-template-tool="audio"><strong>🎙️ Voiceover</strong><span>ابدأ مباشرة من Gemini TTS والصوت.</span></button>
        <button class="rm-template-card" type="button" data-template-tool="text"><strong>✍️ Caption Reel</strong><span>ابدأ من النصوص والكابشن والذكاء الاصطناعي.</span></button>
      </div>`;
    panels.prepend(panel);
    panel.querySelectorAll("[data-template-tool]").forEach(btn => btn.addEventListener("click", () => activateTool(btn.dataset.templateTool)));
  }

  function buildRail(app) {
    if ($("rmToolRail")) return;
    const rail = document.createElement("aside");
    rail.id = "rmToolRail";
    rail.className = "rm-rail";
    rail.setAttribute("aria-label", "أدوات الاستوديو");
    rail.innerHTML = `
      <div class="rm-rail-logo">R</div>
      <div class="rm-rail-separator"></div>
      <button class="rm-tool-btn" data-rm-tool="templates" type="button" title="Templates">📁<small>قوالب</small></button>
      <button class="rm-tool-btn active" data-rm-tool="video" type="button" title="Media">🎥<small>وسائط</small></button>
      <button class="rm-tool-btn" data-rm-tool="text" type="button" title="AI Captions & Text">✍️<small>نص</small></button>
      <button class="rm-tool-btn" data-rm-tool="quran" type="button" title="Quran Studio">📖<small>قرآن</small></button>
      <button class="rm-tool-btn" data-rm-tool="audio" type="button" title="Audio & Gemini TTS">🎙️<small>صوت</small></button>
      <button class="rm-tool-btn" data-rm-tool="stickers" type="button" title="Stickers & GIFs">🎨<small>ملصقات</small></button>
      <button class="rm-tool-btn" data-rm-tool="layers" type="button" title="Layers">🥞<small>طبقات</small></button>
      <div class="rm-rail-spacer"></div>
      <button class="rm-tool-btn" data-rm-tool="settings" type="button" title="Settings">⚙️<small>إعدادات</small></button>`;
    app.prepend(rail);
    rail.querySelectorAll("[data-rm-tool]").forEach(btn => btn.addEventListener("click", () => {
      const tool = btn.dataset.rmTool;
      if (tool === shellState.activeTool && shellState.drawerOpen && tool !== "quran") return setDrawer(false);
      activateTool(tool);
    }));
  }

  function buildDrawerHead() {
    const controls = $("controlsPanel");
    if (!controls || $("rmDrawerHead")) return;
    const head = document.createElement("div");
    head.id = "rmDrawerHead";
    head.className = "rm-drawer-head";
    head.innerHTML = `<div><b id="rmDrawerTitle">الوسائط</b><span id="rmDrawerSubtitle">Pexels • Pixabay • رفع فيديو</span></div><button id="rmDrawerClose" class="rm-drawer-close" type="button" aria-label="إغلاق">×</button>`;
    controls.prepend(head);
    $("rmDrawerClose").addEventListener("click", () => setDrawer(false));
  }

  function rebuildHeader() {
    const topbar = qs(".topbar");
    if (!topbar || $("rmProjectTitle")) return;
    const exportBtn = $("exportBtn");
    const resetBtn = $("resetBtn");
    exportBtn?.remove();
    resetBtn?.remove();
    topbar.innerHTML = "";

    const brand = document.createElement("div");
    brand.className = "rm-header-brand";
    brand.innerHTML = `<div class="rm-logo">R</div><div class="rm-brand-copy"><b>Reels Maker AI</b><span>Professional Video Studio</span></div><span class="rm-pro-badge">PRO AI</span>`;

    const center = document.createElement("div");
    center.className = "rm-header-center";
    center.innerHTML = `<button id="rmUndo" class="rm-icon-btn" type="button" title="Undo" disabled>↶</button><input id="rmProjectTitle" class="rm-project-input" type="text" maxlength="80" value="${escapeHtml(localStorage.getItem("reels-project-title") || "Untitled Reel")}" aria-label="اسم المشروع"><button id="rmRedo" class="rm-icon-btn" type="button" title="Redo" disabled>↷</button>`;

    const actions = document.createElement("div");
    actions.className = "rm-header-actions actions";
    actions.innerHTML = `<div class="rm-status"><i></i><span>READY</span></div>`;
    if (resetBtn) actions.appendChild(resetBtn);
    if (exportBtn) { exportBtn.textContent = "Export Reel (HD)"; actions.appendChild(exportBtn); }

    topbar.append(brand, center, actions);
    $("rmProjectTitle").addEventListener("input", e => localStorage.setItem("reels-project-title", e.target.value));
    $("rmUndo").addEventListener("click", undo);
    $("rmRedo").addEventListener("click", redo);
  }

  function buildWorkArea() {
    const workspace = qs(".workspace");
    const stageWrap = qs(".stage-wrap");
    if (!workspace || !stageWrap || $("rmWorkArea")) return;
    const transport = qs(".transport");
    const area = document.createElement("div");
    area.id = "rmWorkArea";
    area.className = "rm-work-area";
    workspace.insertBefore(area, stageWrap);
    area.appendChild(stageWrap);
    if (transport) area.appendChild(transport);

    const controls = document.createElement("div");
    controls.className = "rm-floating-controls";
    controls.innerHTML = `
      <button id="rmPlay" class="rm-play" type="button" aria-label="تشغيل">▶</button>
      <span id="rmTime" class="rm-time">00:00 / 00:00</span>
      <select id="rmAspect" class="rm-control-select" aria-label="نسبة العرض"><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="16:9">16:9</option></select>
      <button id="rmZoom" class="rm-zoom" type="button">Fit 100%</button>`;
    area.appendChild(controls);
    $("rmPlay").addEventListener("click", () => {
      const old = $("playBtn");
      if (old) old.click();
      else toggleVideo();
      setTimeout(syncPlaybackUi, 30);
    });
    $("rmAspect").addEventListener("change", e => {
      shellState.aspect = e.target.value;
      $("stage")?.setAttribute("data-aspect", shellState.aspect);
    });
    $("rmZoom").addEventListener("click", () => {
      shellState.zoomed = !shellState.zoomed;
      const stage = $("stage");
      if (stage) stage.style.transform = shellState.zoomed ? "scale(.86)" : "scale(1)";
      $("rmZoom").textContent = shellState.zoomed ? "Fit 86%" : "Fit 100%";
    });
  }

  function buildTimeline() {
    const workspace = qs(".workspace");
    if (!workspace || $("rmTimeline")) return;
    const el = document.createElement("section");
    el.id = "rmTimeline";
    el.className = "rm-timeline";
    el.innerHTML = `
      <div class="rm-timeline-top"><div class="rm-timeline-title"><b>Timeline</b><span id="rmTimelineDuration">00:00</span></div><div class="rm-timeline-actions"><button type="button" id="rmTimelineMinus">−</button><button type="button" id="rmTimelinePlus">＋</button></div></div>
      <div class="rm-ruler" id="rmRuler"></div>
      <div class="rm-track-stack" id="rmTrackStack">
        <div class="rm-track-row"><div class="rm-track-label">🟣 Video</div><div class="rm-track-lane"><div id="rmVideoClip" class="rm-track-clip rm-video-clip">Background video</div></div></div>
        <div class="rm-track-row"><div class="rm-track-label">🟢 Text</div><div class="rm-track-lane"><div id="rmTextClip" class="rm-track-clip rm-text-clip">Text & Captions</div></div></div>
        <div class="rm-track-row"><div class="rm-track-label">🟡 Audio</div><div class="rm-track-lane"><div id="rmAudioClip" class="rm-track-clip rm-audio-clip">Audio & SFX</div></div></div>
        <div id="rmPlayhead" class="rm-playhead"></div><div id="rmSeekSurface" class="rm-seek-surface"></div>
      </div>`;
    workspace.appendChild(el);
    let zoom = 1;
    const applyZoom = () => {
      const stack = $("rmTrackStack");
      if (!stack) return;
      stack.style.setProperty("--timeline-zoom", String(zoom));
      qsa(".rm-track-clip").forEach(c => c.style.transformOrigin = "left center");
    };
    $("rmTimelinePlus").addEventListener("click", () => { zoom = Math.min(2, zoom + .25); applyZoom(); });
    $("rmTimelineMinus").addEventListener("click", () => { zoom = Math.max(.75, zoom - .25); applyZoom(); });

    const surface = $("rmSeekSurface");
    let seeking = false;
    const seek = e => {
      const video = $("sourceVideo");
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const r = surface.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
      const ratio = r.width ? x / r.width : 0;
      video.currentTime = ratio * video.duration;
      const oldTimeline = $("timeline");
      if (oldTimeline) {
        const max = Number(oldTimeline.max) || 1000;
        oldTimeline.value = String(ratio * max);
        oldTimeline.dispatchEvent(new Event("input", { bubbles: true }));
      }
      syncPlaybackUi();
    };
    surface.addEventListener("pointerdown", e => { seeking = true; surface.setPointerCapture?.(e.pointerId); seek(e); });
    surface.addEventListener("pointermove", e => { if (seeking) seek(e); });
    surface.addEventListener("pointerup", () => { seeking = false; });
    surface.addEventListener("pointercancel", () => { seeking = false; });
  }

  function setDrawer(open) {
    shellState.drawerOpen = !!open;
    qs(".app")?.classList.toggle("drawer-closed", !shellState.drawerOpen);
  }

  function activateTool(tool) {
    if (!TOOL_META[tool]) tool = "video";
    shellState.activeTool = tool;
    qsa("[data-rm-tool]").forEach(b => b.classList.toggle("active", b.dataset.rmTool === tool));
    const [title, sub] = TOOL_META[tool];
    if ($("rmDrawerTitle")) $("rmDrawerTitle").textContent = title;
    if ($("rmDrawerSubtitle")) $("rmDrawerSubtitle").textContent = sub;

    if (tool === "quran") {
      setDrawer(false);
      openQuranStudio();
      return;
    }

    movePanelsHome();
    qsa(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${tool}`));
    qsa(".tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tool));
    setDrawer(true);
  }

  function openQuranStudio(tries = 0) {
    const launch = $("quranStudioLaunch");
    if (launch) { launch.click(); return; }
    if (tries < 35) setTimeout(() => openQuranStudio(tries + 1), 100);
  }

  function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function valueOf(el) {
    if (!el) return null;
    if (el.type === "checkbox" || el.type === "radio") return el.checked;
    return el.value;
  }

  function applyValue(el, value) {
    if (!el?.isConnected) return;
    shellState.historyBusy = true;
    if (el.type === "checkbox" || el.type === "radio") el.checked = !!value;
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    shellState.historyBusy = false;
  }

  const editStart = new WeakMap();
  function bindHistory() {
    document.addEventListener("focusin", e => {
      const el = e.target;
      if (el.matches?.("input,textarea,select")) editStart.set(el, valueOf(el));
    }, true);
    document.addEventListener("change", e => {
      if (shellState.historyBusy) return;
      const el = e.target;
      if (!el.matches?.("input,textarea,select") || el.id === "rmProjectTitle") return;
      const before = editStart.has(el) ? editStart.get(el) : valueOf(el);
      const after = valueOf(el);
      if (String(before) === String(after)) return;
      shellState.undo.push({ el, before, after });
      if (shellState.undo.length > 80) shellState.undo.shift();
      shellState.redo.length = 0;
      editStart.set(el, after);
      updateHistoryButtons();
    }, true);
  }

  function undo() {
    const item = shellState.undo.pop();
    if (!item) return;
    applyValue(item.el, item.before);
    shellState.redo.push(item);
    updateHistoryButtons();
  }
  function redo() {
    const item = shellState.redo.pop();
    if (!item) return;
    applyValue(item.el, item.after);
    shellState.undo.push(item);
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    if ($("rmUndo")) $("rmUndo").disabled = shellState.undo.length === 0;
    if ($("rmRedo")) $("rmRedo").disabled = shellState.redo.length === 0;
  }

  function toggleVideo() {
    const video = $("sourceVideo");
    if (!video?.src) return;
    if (video.paused) video.play().catch(() => {}); else video.pause();
  }

  function renderRuler(duration) {
    const ruler = $("rmRuler");
    if (!ruler) return;
    const total = Number.isFinite(duration) && duration > 0 ? duration : 20;
    const step = total <= 30 ? 5 : total <= 90 ? 10 : 30;
    ruler.innerHTML = "";
    for (let t = 0; t <= total + .001; t += step) {
      const s = document.createElement("span");
      s.className = "rm-ruler-label";
      s.style.left = `${Math.min(100,(t/total)*100)}%`;
      s.textContent = fmt(t);
      ruler.appendChild(s);
    }
  }

  function syncTracks() {
    const video = $("sourceVideo");
    const audio = $("sourceAudio");
    const duration = Number.isFinite(video?.duration) && video.duration > 0 ? video.duration : 0;
    if ($("rmTimelineDuration")) $("rmTimelineDuration").textContent = fmt(duration);
    if ($("rmVideoClip")) $("rmVideoClip").style.width = duration ? "calc(100% - 6px)" : "18%";
    const layerCount = $("layers")?.children?.length || 0;
    if ($("rmTextClip")) { $("rmTextClip").style.width = layerCount ? "58%" : "12%"; $("rmTextClip").style.opacity = layerCount ? "1" : ".28"; }
    const ad = Number.isFinite(audio?.duration) && audio.duration > 0 ? audio.duration : 0;
    if ($("rmAudioClip")) { $("rmAudioClip").style.width = ad && duration ? `${Math.max(12,Math.min(100,ad/duration*100))}%` : "14%"; $("rmAudioClip").style.opacity = ad ? "1" : ".28"; }
    renderRuler(duration || 20);
  }

  function syncPlaybackUi() {
    const video = $("sourceVideo");
    const current = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
    const duration = Number.isFinite(video?.duration) ? video.duration : 0;
    if ($("rmTime")) $("rmTime").textContent = `${fmt(current)} / ${fmt(duration)}`;
    if ($("rmPlay")) $("rmPlay").textContent = video && !video.paused ? "❚❚" : "▶";
    const ratio = duration > 0 ? Math.max(0,Math.min(1,current/duration)) : 0;
    const surface = $("rmSeekSurface");
    const playhead = $("rmPlayhead");
    if (surface && playhead) {
      const surfaceRect = surface.getBoundingClientRect();
      const stackRect = $("rmTrackStack")?.getBoundingClientRect();
      if (stackRect && surfaceRect.width) playhead.style.left = `${surfaceRect.left - stackRect.left + ratio * surfaceRect.width}px`;
    }
  }

  function bindPlayback() {
    const video = $("sourceVideo");
    if (!video) return;
    ["loadedmetadata","durationchange","emptied"].forEach(ev => video.addEventListener(ev, () => { syncTracks(); syncPlaybackUi(); }));
    ["timeupdate","play","pause","seeked"].forEach(ev => video.addEventListener(ev, syncPlaybackUi));
    const mo = new MutationObserver(syncTracks);
    if ($("layers")) mo.observe($("layers"), { childList:true, subtree:true });
    if ($("audioCard")) mo.observe($("audioCard"), { attributes:true, attributeFilter:["class"] });
    window.addEventListener("resize", syncPlaybackUi);
    setInterval(syncPlaybackUi, 350);
  }

  function isEditable(el) {
    return !!el && (el.matches?.('input:not([type="range"]):not([type="color"]):not([type="file"]),textarea,select,[contenteditable="true"]') || el.isContentEditable);
  }

  function bindKeyboardProtection() {
    document.addEventListener("focusin", e => {
      if (!isEditable(e.target)) return;
      document.documentElement.classList.add("keyboard-editing");
      setTimeout(() => { if (document.activeElement === e.target) e.target.scrollIntoView?.({ block:"center", behavior:"smooth" }); }, 180);
    }, true);
    document.addEventListener("focusout", e => {
      if (!isEditable(e.target)) return;
      setTimeout(() => { if (!isEditable(document.activeElement)) document.documentElement.classList.remove("keyboard-editing"); }, 160);
    }, true);
  }

  function ttsText() {
    return $("ttsText")?.value?.trim() || $("textContent")?.value?.trim() || "";
  }
  function setTtsStatus(message) { if ($("ttsStatus")) $("ttsStatus").textContent = message; }
  function clearGeminiPreview(player) {
    try { player?.pause(); } catch {}
    if (player) { player.removeAttribute("src"); player.hidden = true; }
    if (shellState.previewObjectUrl) { URL.revokeObjectURL(shellState.previewObjectUrl); shellState.previewObjectUrl = null; }
  }
  async function fetchGeminiVoice(text, voice, style) {
    const response = await fetch("/api/tts", { method:"POST", headers:{"content-type":"application/json"}, cache:"no-store", body:JSON.stringify({ text, voice, style, voiceId:voice }) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return response.blob();
  }
  function enhanceGemini() {
    const box = qs(".tts-box"), voiceSelect = $("geminiVoice"), styleSelect = $("geminiStyle"), oldGenerate = $("ttsGenerateBtn"), oldPreview = $("ttsPreviewBtn");
    if (!box || !voiceSelect || !styleSelect || !oldGenerate || !oldPreview) return false;
    if (box.dataset.geminiShellV2 === "1") return true;
    box.dataset.geminiShellV2 = "1";
    const savedVoice = localStorage.getItem("reels-gemini-voice");
    if (savedVoice && [...voiceSelect.options].some(o => o.value === savedVoice)) voiceSelect.value = savedVoice;
    const savedStyle = localStorage.getItem("reels-gemini-style");
    if (savedStyle && [...styleSelect.options].some(o => o.value === savedStyle)) styleSelect.value = savedStyle;
    const previewBtn = oldPreview.cloneNode(true), generateBtn = oldGenerate.cloneNode(true);
    oldPreview.replaceWith(previewBtn); oldGenerate.replaceWith(generateBtn);
    previewBtn.textContent = "▶ معاينة الصوت"; generateBtn.textContent = "✦ إضافة للمشروع";
    let player = $("geminiPreviewPlayer");
    if (!player) { player = document.createElement("audio"); player.id="geminiPreviewPlayer"; player.controls=true; player.preload="none"; player.hidden=true; player.style.cssText="width:100%;margin-top:8px"; box.appendChild(player); }
    const label = () => voiceSelect.options[voiceSelect.selectedIndex]?.textContent || voiceSelect.value;
    const announce = () => { clearGeminiPreview(player); localStorage.setItem("reels-gemini-voice", voiceSelect.value); setTtsStatus(`الصوت المختار: ${label()}`); };
    voiceSelect.addEventListener("change", announce);
    styleSelect.addEventListener("change", () => { clearGeminiPreview(player); localStorage.setItem("reels-gemini-style", styleSelect.value); setTtsStatus(`الصوت: ${label()} — تم تغيير أسلوب الإلقاء.`); });
    previewBtn.addEventListener("click", async e => {
      e.preventDefault(); const text = ttsText(); if (!text) return setTtsStatus("اكتب نص التعليق الصوتي أولًا.");
      previewBtn.disabled = generateBtn.disabled = true; setTtsStatus(`جاري إنشاء معاينة بصوت ${label()}...`);
      try { const blob = await fetchGeminiVoice(text.slice(0,220), voiceSelect.value, styleSelect.value); clearGeminiPreview(player); shellState.previewObjectUrl = URL.createObjectURL(blob); player.src=shellState.previewObjectUrl; player.hidden=false; try{await player.play();}catch{} setTtsStatus(`المعاينة الحالية بصوت ${label()} ✅`); }
      catch(error){ setTtsStatus(`Gemini TTS: ${String(error.message||error).slice(0,420)}`); }
      finally{ previewBtn.disabled = generateBtn.disabled = false; }
    });
    generateBtn.addEventListener("click", async e => {
      e.preventDefault(); const text = ttsText(); if (!text) return setTtsStatus("اكتب نص التعليق الصوتي أولًا.");
      previewBtn.disabled = generateBtn.disabled = true; setTtsStatus(`جاري إنشاء التعليق بصوت ${label()}...`);
      try { const blob = await fetchGeminiVoice(text, voiceSelect.value, styleSelect.value); if (typeof window.loadAudioBlob === "function") window.loadAudioBlob(blob, `Gemini ${voiceSelect.value}.wav`); setTtsStatus(`تم إنشاء ${label()} وإضافته للمشروع ✅`); }
      catch(error){ setTtsStatus(`Gemini TTS: ${String(error.message||error).slice(0,420)}`); }
      finally{ previewBtn.disabled = generateBtn.disabled = false; }
    });
    announce();
    return true;
  }

  function hideQuranLauncher() {
    const launch = $("quranStudioLaunch");
    if (launch) launch.style.display = "none";
  }

  function boot() {
    injectCss();
    document.body.classList.add("studio-shell-active");
    document.body.classList.remove("th-home-open");
    $("transparentHome")?.remove();
    movePanelsHome();
    const app = qs(".app");
    if (!app) return;
    buildTemplatesPanel();
    buildRail(app);
    buildDrawerHead();
    rebuildHeader();
    buildWorkArea();
    buildTimeline();
    bindHistory();
    bindPlayback();
    bindKeyboardProtection();
    activateTool("video");
    syncTracks();
    syncPlaybackUi();
    setTimeout(enhanceGemini,0); setTimeout(enhanceGemini,300); setTimeout(enhanceGemini,900);
    const mo = new MutationObserver(() => { hideQuranLauncher(); enhanceGemini(); });
    mo.observe(document.body,{childList:true,subtree:true});
    setTimeout(hideQuranLauncher,600);
  }

  window.addEventListener("beforeunload", () => { if (shellState.previewObjectUrl) URL.revokeObjectURL(shellState.previewObjectUrl); });
  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", () => setTimeout(boot,0), { once:true });
  else setTimeout(boot,0);
})();
