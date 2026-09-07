"use strict";

(() => {
  const DB_NAME = "reels-maker-library";
  const DB_VERSION = 1;
  const STORE = "exports";
  let dbPromise = null;
  let renderQueued = false;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("تعذر فتح مكتبة المشاريع"));
    });
    return dbPromise;
  }

  async function transaction(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let value;
      try { value = fn(store, tx); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error || new Error("تعذر تحديث مكتبة المشاريع"));
      tx.onabort = () => reject(tx.error || new Error("تم إلغاء العملية"));
    });
  }

  function id() {
    return `export-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function formatBytes(bytes) {
    bytes = Number(bytes) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  function dateLabel(ts) {
    try {
      return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString("ar-EG");
    }
  }

  function cleanName(name) {
    return String(name || "reel-video.webm").replace(/[<>:"/\\|?*]+/g, "-");
  }

  function inferKind(name) {
    return /quran|قرآن/i.test(String(name || "")) ? "quran" : "reel";
  }

  function extension(name, type) {
    const m = String(name || "").match(/\.([a-z0-9]{2,5})$/i);
    if (m) return m[1].toUpperCase();
    if (/mp4/i.test(type || "")) return "MP4";
    if (/webm/i.test(type || "")) return "WEBM";
    return "VIDEO";
  }

  async function putExport(blob, name) {
    if (!(blob instanceof Blob) || !blob.size) return null;
    const record = {
      id: id(),
      name: cleanName(name),
      type: blob.type || "video/webm",
      size: blob.size,
      createdAt: Date.now(),
      kind: inferKind(name),
      blob
    };
    await transaction("readwrite", store => store.put(record));
    queueRender();
    notify("تم حفظ الفيديو تلقائيًا في مشاريعي ✅");
    return record;
  }

  async function getAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error || new Error("تعذر قراءة المشاريع"));
    });
  }

  async function getOne(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("تعذر فتح المشروع"));
    });
  }

  async function removeOne(key) {
    await transaction("readwrite", store => store.delete(key));
    queueRender();
  }

  async function clearAll() {
    await transaction("readwrite", store => store.clear());
    queueRender();
  }

  function notify(message) {
    const old = $(".project-toast");
    old?.remove();
    const el = document.createElement("div");
    el.className = "project-toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function downloadRecord(record) {
    if (!record?.blob) return;
    const url = URL.createObjectURL(record.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = record.name || "reel-video.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function shareRecord(record) {
    if (!record?.blob) return;
    const file = new File([record.blob], record.name || "reel-video.webm", { type: record.type || record.blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Reels Maker AI", text: record.kind === "quran" ? "ريل قرآن كريم" : "فيديو من Reels Maker AI", files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: "Reels Maker AI", text: record.name });
      } else {
        throw new Error("المشاركة المباشرة غير مدعومة في هذا المتصفح");
      }
    } catch (error) {
      if (error?.name !== "AbortError") notify(error.message || "تعذر مشاركة الفيديو");
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }

  function emptyMarkup() {
    return `<div class="projects-empty"><div class="projects-empty-inner"><div class="projects-empty-icon">▱</div><h2>لا توجد فيديوهات محفوظة بعد</h2><p>كل فيديو تقوم بتصديره من المحرر أو من استوديو ريلز القرآن سيظهر هنا تلقائيًا ويمكنك تنزيله أو مشاركته لاحقًا.</p><button type="button" data-tool="video">إنشاء أول فيديو</button></div></div>`;
  }

  function cardMarkup(record) {
    const kind = record.kind === "quran" ? "quran" : "reel";
    const mark = kind === "quran" ? "☪" : "🎬";
    const label = kind === "quran" ? "ريل قرآن" : "ريل فيديو";
    return `<article class="project-item" data-kind="${kind}" data-project-id="${escapeHtml(record.id)}">
      <div class="project-thumb"><span class="project-format">${extension(record.name, record.type)}</span><div class="project-mark">${mark}</div><span class="project-size-badge">${escapeHtml(label)}</span></div>
      <div class="project-body"><h3 title="${escapeHtml(record.name)}">${escapeHtml(record.name)}</h3><div class="project-meta"><span>${dateLabel(record.createdAt)}</span><span>${formatBytes(record.size)}</span></div>
      <div class="project-actions"><button type="button" class="project-action primary" data-project-download="${escapeHtml(record.id)}">⬇ تحميل</button><button type="button" class="project-action" data-project-share="${escapeHtml(record.id)}">↗ مشاركة</button><button type="button" class="project-action danger" data-project-delete="${escapeHtml(record.id)}" aria-label="حذف">×</button></div></div>
    </article>`;
  }

  async function render() {
    const grid = $("#projectsGrid");
    const count = $("#projectsCount");
    const stat = $("#statProjects");
    if (!grid && !count && !stat) return;
    try {
      const items = await getAll();
      if (count) count.textContent = `${items.length} فيديو`;
      if (stat) stat.textContent = String(items.length);
      if (grid) grid.innerHTML = items.length ? items.map(cardMarkup).join("") : emptyMarkup();
    } catch (error) {
      if (grid) grid.innerHTML = `<div class="projects-empty"><div class="projects-empty-inner"><h2>تعذر فتح مكتبة المشاريع</h2><p>${escapeHtml(error.message || error)}</p></div></div>`;
    }
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }

  function hookDownloads() {
    const original = window.downloadBlob;
    if (typeof original !== "function" || original.__projectLibraryWrapped) return false;
    const wrapped = function(blob, name) {
      try { putExport(blob, name).catch(error => console.warn("Project library", error)); } catch {}
      return original.apply(this, arguments);
    };
    wrapped.__projectLibraryWrapped = true;
    wrapped.__original = original;
    window.downloadBlob = wrapped;
    return true;
  }

  function bindUi() {
    document.addEventListener("click", async event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const download = target.closest("[data-project-download]");
      if (download) {
        event.preventDefault();
        const record = await getOne(download.dataset.projectDownload);
        if (record) downloadRecord(record);
        return;
      }
      const share = target.closest("[data-project-share]");
      if (share) {
        event.preventDefault();
        const record = await getOne(share.dataset.projectShare);
        if (record) await shareRecord(record);
        return;
      }
      const remove = target.closest("[data-project-delete]");
      if (remove) {
        event.preventDefault();
        if (!confirm("حذف هذا الفيديو من مشاريعي؟")) return;
        await removeOne(remove.dataset.projectDelete);
        notify("تم حذف الفيديو من مشاريعي.");
        return;
      }
      if (target.closest("#clearProjectsBtn")) {
        event.preventDefault();
        const items = await getAll();
        if (!items.length) return;
        if (!confirm("حذف كل الفيديوهات المحفوظة في مشاريعي على هذا الجهاز؟")) return;
        await clearAll();
        notify("تم إفراغ مكتبة المشاريع.");
      }
    });

    window.addEventListener("hashchange", () => {
      if (location.hash === "#projects") queueRender();
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) queueRender(); });
  }

  function init() {
    bindUi();
    hookDownloads();
    setTimeout(hookDownloads, 250);
    setTimeout(hookDownloads, 900);
    queueRender();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.ReelsProjects = { render, getAll, getOne, putExport, removeOne, clearAll };
})();
