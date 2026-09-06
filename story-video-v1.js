"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let installed = false;
  let busy = false;
  let observer = null;

  function toastSafe(message, type = "ok") {
    if (typeof window.toast === "function") window.toast(message, type);
  }

  function status(text, progress = null) {
    const el = qid("icStoryMovieStatus");
    if (el) el.textContent = text;
    const bar = qid("icStoryMovieProgressBar");
    const wrap = qid("icStoryMovieProgress");
    if (wrap) wrap.style.display = progress == null ? "none" : "block";
    if (bar && progress != null) bar.style.width = `${clamp(progress, 0, 100)}%`;
  }

  function removeOldStoryButtons(box) {
    qid("icStoryVideoVoice")?.remove();
    qid("icKidsVideoVoice")?.remove();
    box?.querySelectorAll(".ic-actions button").forEach(button => {
      const text = (button.textContent || "").trim();
      if (/فيديوهات أطفال/.test(text)) button.remove();
    });
  }

  function ensureControls() {
    const box = document.querySelector('[data-ic-pane="stories"] .ic-story-box');
    if (!box) return false;
    removeOldStoryButtons(box);

    const actions = box.querySelector(".ic-actions");
    if (!actions) return false;

    if (!qid("icStoryVisualStyle")) {
      const styleWrap = document.createElement("label");
      styleWrap.className = "ic-story-visual-style";
      styleWrap.innerHTML = `
        <span>شكل المشاهد</span>
        <select id="icStoryVisualStyle">
          <option value="cartoon3d" selected>كرتوني 3D سينمائي</option>
          <option value="cartoon2d">رسوم 2D</option>
          <option value="realistic">سينمائي واقعي</option>
        </select>`;
      actions.parentElement?.insertBefore(styleWrap, actions);
    }

    if (!qid("icStoryAutoVideo")) {
      const button = document.createElement("button");
      button.id = "icStoryAutoVideo";
      button.type = "button";
      button.className = "ic-btn ai ic-story-auto-video";
      button.textContent = "🎬 قصة مع فيديو";
      button.addEventListener("click", buildFullStoryVideo);
      actions.prepend(button);
    }

    if (!qid("icStoryMovieStatus")) {
      const info = document.createElement("div");
      info.className = "ic-story-movie-info";
      info.innerHTML = `
        <div id="icStoryMovieStatus">زر «قصة مع فيديو» يحوّل نص القصة كله إلى مشاهد متتابعة مع التعليق الصوتي وكلمات القصة على الفيديو.</div>
        <div id="icStoryMovieProgress" class="ic-story-movie-progress" style="display:none"><i id="icStoryMovieProgressBar"></i></div>`;
      box.appendChild(info);
    }
    return true;
  }

  function injectStyles() {
    if (qid("storyVideoV1Styles")) return;
    const style = document.createElement("style");
    style.id = "storyVideoV1Styles";
    style.textContent = `
      .ic-story-visual-style{display:flex;align-items:center;gap:8px;margin-top:10px;color:#9da9ba;font:700 9px Cairo,sans-serif}
      .ic-story-visual-style select{min-height:38px;flex:1;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#0a1018;color:#fff;padding:0 10px;font:700 9px Cairo,sans-serif}
      .ic-story-auto-video{min-height:42px!important;padding-inline:16px!important;font-size:10px!important}
      .ic-story-movie-info{margin-top:10px;padding:10px;border:1px solid rgba(125,92,255,.2);border-radius:12px;background:rgba(125,92,255,.055);color:#9eabc0;font:600 8px/1.8 Cairo,sans-serif}
      .ic-story-movie-progress{height:6px;margin-top:8px;background:#151c28;border-radius:99px;overflow:hidden}
      .ic-story-movie-progress i{display:block;width:0;height:100%;background:linear-gradient(90deg,#7657ff,#36cfa0);transition:.2s width}
    `;
    document.head.appendChild(style);
  }

  async function waitForGeneratedStory() {
    const output = qid("icStoryOutput");
    const generate = qid("icGenerateStory");
    if (!output) throw new Error("حقل القصة غير موجود.");
    if (output.value.trim()) return output.value.trim();
    if (!generate) throw new Error("زر إنشاء القصة غير موجود.");

    status("جاري إنشاء نص القصة أولًا...", 3);
    generate.click();
    const start = Date.now();
    while (Date.now() - start < 120000) {
      const value = output.value.trim();
      if (value && !/^تعذر/.test(value)) return value;
      if (!generate.disabled && /^تعذر/.test(value)) throw new Error(value);
      await sleep(200);
    }
    throw new Error("استغرق إنشاء القصة وقتًا أطول من المتوقع.");
  }

  async function createNarration(text) {
    status("جاري إنشاء التعليق الصوتي للقصة...", 8);
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

  async function decodeNarration(blob, audioCtx) {
    const bytes = await blob.arrayBuffer();
    return audioCtx.decodeAudioData(bytes.slice(0));
  }

  async function createScenePlan(story, duration) {
    const count = clamp(Math.round(duration / 6), 4, 12);
    const style = qid("icStoryVisualStyle")?.value || "cartoon3d";
    const topic = qid("icStoryTopic")?.value?.trim() || "قصة تربوية";
    status(`جاري تقسيم القصة إلى ${count} مشاهد متزامنة...`, 14);
    const response = await fetch("/api/story-scenes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ story, count, topic, style })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.scenes) || !data.scenes.length) {
      throw new Error(data.error || "تعذر تقسيم القصة إلى مشاهد.");
    }
    return data.scenes;
  }

  function fallbackSceneDataUri(index) {
    const c = document.createElement("canvas");
    c.width = 720; c.height = 1280;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 720, 1280);
    const palettes = [
      ["#0d2130", "#1d5160"], ["#24172d", "#59405f"], ["#17291f", "#42684b"],
      ["#302014", "#765233"], ["#10162d", "#354b78"]
    ];
    const p = palettes[index % palettes.length];
    g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 18; i++) {
      x.globalAlpha = .05 + (i % 4) * .02;
      x.fillStyle = "#ffffff";
      x.beginPath();
      x.arc((i * 113) % 720, (i * 197) % 1280, 30 + (i % 5) * 14, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    return c.toDataURL("image/jpeg", .86);
  }

  async function createImages(scenes) {
    const images = new Array(scenes.length);
    let cursor = 0;
    let done = 0;

    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= scenes.length) return;
        const scene = scenes[index];
        try {
          const response = await fetch("/api/story-image", {
            method: "POST",
            headers: { "content-type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ prompt: scene.prompt, seed: Date.now() % 1000000000 + index * 997 })
          });
          const data = await response.json().catch(() => ({}));
          images[index] = response.ok && data.image ? data.image : fallbackSceneDataUri(index);
        } catch {
          images[index] = fallbackSceneDataUri(index);
        }
        done++;
        status(`تم إنشاء المشهد ${done} من ${scenes.length}...`, 18 + (done / scenes.length) * 42);
      }
    }

    await Promise.all([worker(), worker()]);
    return images;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawCover(ctx, img, width, height, zoom = 1, panX = 0, panY = 0) {
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const base = Math.max(width / iw, height / ih) * zoom;
    const dw = iw * base;
    const dh = ih * base;
    const dx = (width - dw) / 2 + panX;
    const dy = (height - dh) / 2 + panY;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawCaption(ctx, text, width, height) {
    const clean = String(text || "").trim();
    if (!clean) return;
    let fontSize = clean.length > 160 ? 29 : clean.length > 110 ? 33 : 38;
    ctx.font = `700 ${fontSize}px Cairo, Tajawal, sans-serif`;
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const maxWidth = width * .82;
    let lines = wrapLines(ctx, clean, maxWidth);
    while (lines.length > 5 && fontSize > 25) {
      fontSize -= 2;
      ctx.font = `700 ${fontSize}px Cairo, Tajawal, sans-serif`;
      lines = wrapLines(ctx, clean, maxWidth);
    }
    const lineH = fontSize * 1.55;
    const boxH = lines.length * lineH + 38;
    const y = height * .74 - boxH / 2;
    ctx.fillStyle = "rgba(0,0,0,.58)";
    roundRect(ctx, width * .07, y, width * .86, boxH, 24);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,.9)";
    ctx.shadowBlur = 8;
    const startY = y + 19 + lineH / 2;
    lines.forEach((line, index) => ctx.fillText(line, width / 2, startY + index * lineH, maxWidth));
    ctx.shadowBlur = 0;
  }

  function chooseMime() {
    const types = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    return types.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || "";
  }

  async function renderMovie(audioCtx, audioBuffer, scenes, imageUris) {
    if (!window.MediaRecorder) throw new Error("المتصفح لا يدعم إنشاء الفيديو. استخدم Chrome حديثًا.");
    const movieCanvas = document.createElement("canvas");
    movieCanvas.width = 720;
    movieCanvas.height = 1280;
    const movieCtx = movieCanvas.getContext("2d", { alpha: false });
    const images = await Promise.all(imageUris.map((uri, index) => loadImage(uri).catch(() => loadImage(fallbackSceneDataUri(index)))));
    const fps = 30;
    const stream = movieCanvas.captureStream(fps);
    const destination = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));

    const mime = chooseMime();
    const chunks = [];
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5_500_000 } : { videoBitsPerSecond: 5_500_000 });
    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = event => reject(event.error || new Error("MediaRecorder error"));
    });

    recorder.start(500);
    const startAt = audioCtx.currentTime + .08;
    source.start(startAt);
    const duration = audioBuffer.duration;
    const sceneDuration = duration / scenes.length;

    while (true) {
      const t = audioCtx.currentTime - startAt;
      if (t >= duration) break;
      const safeT = Math.max(0, t);
      const sceneIndex = Math.min(scenes.length - 1, Math.floor(safeT / sceneDuration));
      const local = clamp((safeT - sceneIndex * sceneDuration) / sceneDuration, 0, 1);
      const img = images[sceneIndex];

      movieCtx.save();
      movieCtx.fillStyle = "#05070a";
      movieCtx.fillRect(0, 0, movieCanvas.width, movieCanvas.height);
      const zoom = 1.03 + local * .07;
      const panX = Math.sin((sceneIndex + 1) * 1.7) * 12 * local;
      const panY = -18 * local;
      drawCover(movieCtx, img, movieCanvas.width, movieCanvas.height, zoom, panX, panY);

      if (local > .88 && sceneIndex < scenes.length - 1) {
        const fade = (local - .88) / .12;
        movieCtx.globalAlpha = fade;
        drawCover(movieCtx, images[sceneIndex + 1], movieCanvas.width, movieCanvas.height, 1.03, 0, 0);
        movieCtx.globalAlpha = 1;
      }

      const vignette = movieCtx.createLinearGradient(0, 0, 0, movieCanvas.height);
      vignette.addColorStop(0, "rgba(0,0,0,.08)");
      vignette.addColorStop(.55, "rgba(0,0,0,.04)");
      vignette.addColorStop(1, "rgba(0,0,0,.42)");
      movieCtx.fillStyle = vignette;
      movieCtx.fillRect(0, 0, movieCanvas.width, movieCanvas.height);
      drawCaption(movieCtx, scenes[sceneIndex]?.caption || "", movieCanvas.width, movieCanvas.height);
      movieCtx.restore();

      status(`جاري تركيب الفيديو والمزامنة مع الصوت... ${Math.round((safeT / duration) * 100)}%`, 62 + (safeT / duration) * 36);
      await sleep(30);
    }

    try { source.stop(); } catch {}
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    stream.getTracks().forEach(track => track.stop());
    const type = recorder.mimeType || mime || "video/webm";
    return new Blob(chunks, { type });
  }

  async function buildFullStoryVideo() {
    if (busy) return;
    const button = qid("icStoryAutoVideo");
    if (!button) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return toastSafe("المتصفح لا يدعم تركيب الصوت والفيديو.", "error");

    busy = true;
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = "⏳ جاري إنشاء الفيديو...";
    let audioCtx = null;

    try {
      audioCtx = new AC();
      await audioCtx.resume().catch(() => {});
      const story = await waitForGeneratedStory();
      const voiceBlob = await createNarration(story);
      const audioBuffer = await decodeNarration(voiceBlob, audioCtx);
      const duration = audioBuffer.duration;
      if (!Number.isFinite(duration) || duration < 1) throw new Error("لم أتمكن من قراءة مدة التعليق الصوتي.");

      const scenes = await createScenePlan(story, duration);
      const imageUris = await createImages(scenes);
      status(`تم تجهيز ${scenes.length} مشاهد. جاري تركيب فيديو مدته ${Math.round(duration)} ثانية...`, 60);
      const movie = await renderMovie(audioCtx, audioBuffer, scenes, imageUris);
      status("تم إنشاء فيديو القصة كاملًا ✅", 100);

      const ext = movie.type.includes("mp4") ? "mp4" : "webm";
      if (typeof window.loadVideoBlob !== "function") throw new Error("المحرر غير جاهز لاستلام الفيديو.");
      window.loadVideoBlob(movie, `story-auto-${Date.now()}.${ext}`);
      qid("icClose")?.click();
      if (typeof window.activateTab === "function") window.activateTab("video");
      toastSafe(`تم إنشاء فيديو القصة كاملًا (${Math.round(duration)}ث) بالمشاهد والصوت وكلمات القصة ✅`);
    } catch (error) {
      console.error("Story movie", error);
      status(`تعذر إنشاء فيديو القصة: ${error?.message || error}`, null);
      toastSafe(`تعذر إنشاء فيديو القصة: ${error?.message || error}`, "error");
    } finally {
      try { await audioCtx?.close(); } catch {}
      busy = false;
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyles();
    const attempt = () => {
      ensureControls();
      const root = qid("islamicContentLibrary");
      if (root && !observer) {
        observer = new MutationObserver(() => ensureControls());
        observer.observe(root, { childList: true, subtree: true });
      }
      if (!qid("icStoryAutoVideo")) setTimeout(attempt, 180);
    };
    attempt();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install);
  else install();
})();
