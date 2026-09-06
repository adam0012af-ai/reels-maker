"use strict";

(() => {
  let metaLayerId = null;
  const qid = id => document.getElementById(id);

  const VERIFIED_RECITERS = [
    { id: "ar.alafasy", name: "مشاري راشد العفاسي", bitrate: 128 },
    { id: "ar.husary", name: "محمود خليل الحصري", bitrate: 128 },
    { id: "ar.minshawi", name: "محمد صديق المنشاوي", bitrate: 128 },
    { id: "ar.minshawimujawwad", name: "محمد صديق المنشاوي — مجود", bitrate: 64 },
    { id: "ar.sudais", name: "عبدالرحمن السديس", bitrate: 192 },
    { id: "ar.shuraim", name: "سعود الشريم", bitrate: 128 },
    { id: "ar.abdulbasit", name: "عبد الباسط عبد الصمد — مرتل", bitrate: 192 },
    { id: "ar.abdulbasitmujawwad", name: "عبد الباسط عبد الصمد — مجود", bitrate: 192 },
    { id: "ar.ajamy", name: "أحمد بن علي العجمي", bitrate: 128 },
    { id: "ar.muhammadayoub", name: "محمد أيوب", bitrate: 128 },
    { id: "ar.hudhaify", name: "علي الحذيفي", bitrate: 128 },
    { id: "ar.muhammadjibreel", name: "محمد جبريل", bitrate: 128 },
    { id: "ar.parhizgar", name: "محمود خليل الحصري — معلم", bitrate: 64 }
  ];
  const RECITER_MAP = new Map(VERIFIED_RECITERS.map(r => [r.id, r]));

  function setQuranStatus(text, type = "") {
    const status = qid("qrStatus");
    if (!status) return;
    status.textContent = text;
    status.className = `qr-status ${type}`;
  }

  function loadReciterPicker() {
    if (document.querySelector('script[data-quran-reciter-picker="1"]')) return;
    const script = document.createElement("script");
    script.src = "quran-reciter-picker.js?v=1";
    script.async = true;
    script.dataset.quranReciterPicker = "1";
    document.head.appendChild(script);
  }

  function waitForStudio() {
    const studio = qid("quranStudio");
    if (!studio) return setTimeout(waitForStudio, 120);
    install(studio);
  }

  function hideEmptyPreview() {
    try { controls?.emptyState?.classList.add("hidden"); } catch {}
  }

  function applyDemoBackground(name) {
    const bg = document.querySelector("#qrPhoneStage .qr-demo-bg");
    if (!bg) return;
    const styles = {
      emerald: "radial-gradient(circle at 25% 20%,rgba(56,211,159,.30),transparent 30%),linear-gradient(160deg,#07150f,#174a3b 48%,#060b09)",
      night: "radial-gradient(circle at 72% 18%,rgba(148,166,255,.32),transparent 18%),radial-gradient(circle at 24% 34%,rgba(255,255,255,.12),transparent 28%),linear-gradient(160deg,#040715,#15234d 52%,#050712)",
      warm: "radial-gradient(circle at 64% 18%,rgba(255,195,126,.28),transparent 25%),linear-gradient(160deg,#2c1713,#734027 52%,#130c0b)",
      black: "radial-gradient(circle at 50% 25%,rgba(255,255,255,.10),transparent 35%),linear-gradient(160deg,#131720,#050607 55%,#000)"
    };
    bg.style.background = styles[name] || styles.emerald;
  }

  function removeMetaLayer() {
    if (!metaLayerId) return;
    try {
      state.layers = state.layers.filter(x => x.id !== metaLayerId);
      if (state.selected === metaLayerId) state.selected = null;
      renderLayersList();
    } catch {}
    metaLayerId = null;
  }

  function syncMetaLayer() {
    try {
      if (!qid("qrSurahLabel")?.checked) return removeMetaLayer();
      const selected = qid("qrSurah")?.selectedOptions?.[0];
      if (!selected) return;
      const raw = selected.textContent || "سورة";
      const name = raw.replace(/^\s*\d+\.\s*/, "").split("—")[0].trim();
      const from = qid("qrFrom")?.value || "1", to = qid("qrTo")?.value || from;
      const text = `${name}  •  الآيات ${from}–${to}`;
      let layer = state.layers.find(x => x.id === metaLayerId);
      if (!layer) {
        layer = {
          id: `quran-meta-${Date.now()}`, type: "text", name: "Quran Surah Label", text,
          visible: true, x: canvas.width / 2, y: canvas.height * .88, rotation: 0, scale: 1,
          font: "Cairo", size: Math.max(26, canvas.width * .031), color: "#eaf6f1",
          bg: "#000000", bgOpacity: .24, shadow: "#000000", shadowBlur: Math.max(7, canvas.width * .008),
          padX: Math.max(18, canvas.width * .02), padY: Math.max(9, canvas.width * .009), quranMeta: true
        };
        state.layers.push(layer); metaLayerId = layer.id;
      } else {
        layer.text = text; layer.name = "Quran Surah Label"; layer.x = canvas.width / 2; layer.y = canvas.height * .88;
        layer.size = Math.max(26, canvas.width * .031);
      }
      const oldSelected = state.selected;
      renderLayersList();
      state.selected = oldSelected;
    } catch {}
  }

  function installExportScaleGuard() {
    const btn = qid("qrExport"), size = qid("qrSize"), status = qid("qrStatus");
    if (!btn || !size || btn.dataset.scaleGuard === "1") return;
    btn.dataset.scaleGuard = "1";
    btn.addEventListener("click", () => {
      const quality = Number(qid("qrQuality")?.value || 1080);
      if (!quality || quality === 1080) return;
      const base = Number(size.value || 72);
      size.value = String(Math.max(Number(size.min || 1), Math.min(Number(size.max || 999), base * quality / 1080)));
      size.dispatchEvent(new Event("input", { bubbles: true }));
      const restore = () => {
        size.value = String(base);
        size.dispatchEvent(new Event("input", { bubbles: true }));
        observer.disconnect();
      };
      const observer = new MutationObserver(() => {
        const t = status?.textContent || "";
        if (/تم تصدير|فشل التصدير|تم إلغاء/.test(t)) restore();
      });
      if (status) observer.observe(status, { childList: true, subtree: true, characterData: true });
      setTimeout(() => { if (observer.takeRecords) restore(); }, 12 * 60 * 1000);
    }, true);
  }

  function mergeVerifiedReciters() {
    const select = qid("qrReciter");
    if (!select) return;

    const currentValue = select.value;
    const placeholders = [...select.options].filter(o => /جاري|تحميل|غير متاح/.test(o.textContent || ""));
    placeholders.forEach(o => { if (select.options.length > 1 || !o.value) o.remove(); });

    const existing = new Set([...select.options].map(o => o.value));
    VERIFIED_RECITERS.forEach(reciter => {
      if (existing.has(reciter.id)) {
        const option = [...select.options].find(o => o.value === reciter.id);
        if (option) option.dataset.bitrate = String(reciter.bitrate);
        return;
      }
      const option = document.createElement("option");
      option.value = reciter.id;
      option.textContent = `${reciter.name} — ${reciter.id}`;
      option.dataset.bitrate = String(reciter.bitrate);
      option.dataset.verifiedFallback = "1";
      select.appendChild(option);
    });

    if (currentValue && [...select.options].some(o => o.value === currentValue)) select.value = currentValue;
    else if (!select.value && select.options.length) select.selectedIndex = 0;

    const count = qid("qrReciterCount");
    if (count) count.textContent = `${select.options.length} قارئًا متاحًا`;
  }

  function filterVerifiedReciters(query) {
    const select = qid("qrReciter");
    if (!select) return;
    const q = String(query || "").trim().toLowerCase();
    mergeVerifiedReciters();
    [...select.options].forEach(option => {
      const hay = `${option.textContent || ""} ${option.value || ""}`.toLowerCase();
      option.hidden = !!q && !hay.includes(q);
    });
    const visible = [...select.options].filter(o => !o.hidden);
    if (visible.length && select.selectedOptions[0]?.hidden) select.value = visible[0].value;
    const count = qid("qrReciterCount");
    if (count) count.textContent = `${visible.length} قارئًا مطابقًا`;
  }

  function globalAyahNumber() {
    const surahNo = Number(qid("qrSurah")?.value || 1);
    const ayahInSurah = Number(qid("qrFrom")?.value || 1);
    const options = [...(qid("qrSurah")?.options || [])];
    let total = 0;
    for (const option of options) {
      const n = Number(option.value || 0);
      if (n >= surahNo) break;
      const count = Number(option.dataset.count || 0);
      if (!count) return null;
      total += count;
    }
    return total + ayahInSurah;
  }

  function audioCandidateUrls(reciterId, ayahNumber, preferredBitrate) {
    const bitrates = [preferredBitrate, 128, 192, 64, 48, 40, 32].filter(Boolean);
    return [...new Set(bitrates)].map(bitrate => `https://cdn.islamic.network/quran/audio/${bitrate}/${encodeURIComponent(reciterId)}/${ayahNumber}.mp3`);
  }

  function styleMiniAudio(audio) {
    audio.controls = true;
    audio.preload = "auto";
    audio.playsInline = true;
    audio.style.setProperty("display", "block", "important");
    audio.style.setProperty("width", "100%", "important");
    audio.style.setProperty("height", "44px", "important");
    audio.style.setProperty("margin", "9px 0 3px", "important");
    audio.style.setProperty("border-radius", "12px", "important");
  }

  function installReliableReciterPreview() {
    const btn = qid("qrReciterPreview");
    const select = qid("qrReciter");
    const audio = qid("qrMiniAudio");
    if (!btn || !select || !audio || btn.dataset.audioFix === "2") return;
    btn.dataset.audioFix = "2";
    styleMiniAudio(audio);

    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      mergeVerifiedReciters();
      const reciterId = select.value;
      const ayahNumber = globalAyahNumber();
      if (!reciterId || !ayahNumber) {
        setQuranStatus("انتظر تحميل السور والقراء ثم حاول مرة أخرى.", "err");
        return;
      }

      const verified = RECITER_MAP.get(reciterId);
      const optionRate = Number(select.selectedOptions?.[0]?.dataset.bitrate || 0);
      const urls = audioCandidateUrls(reciterId, ayahNumber, optionRate || verified?.bitrate || 128);
      let index = 0;
      let settled = false;

      const reciterName = verified?.name || select.selectedOptions?.[0]?.textContent?.split("—")?.[0]?.trim() || reciterId;
      btn.disabled = true;
      btn.textContent = "⏳ جاري فتح الصوت...";
      setQuranStatus(`جاري تشغيل معاينة ${reciterName}...`);

      const finishUi = () => {
        btn.disabled = false;
        btn.textContent = "▶ سماع القارئ على أول آية";
      };

      const tryCurrent = () => {
        if (index >= urls.length) {
          finishUi();
          setQuranStatus("تعذر تشغيل هذا القارئ الآن. جرّب قارئًا آخر.", "err");
          return;
        }
        audio.src = urls[index++];
        audio.load();
        const playPromise = audio.play();
        if (playPromise?.catch) {
          playPromise.catch(error => {
            if (error?.name === "NotAllowedError") {
              finishUi();
              setQuranStatus("الصوت جاهز. اضغط زر التشغيل داخل مشغل الصوت مرة واحدة.", "ok");
            }
          });
        }
      };

      audio.onerror = () => {
        if (settled) return;
        tryCurrent();
      };
      audio.onplaying = () => {
        settled = true;
        finishUi();
        setQuranStatus(`يعمل الآن صوت ${reciterName} ✅`, "ok");
      };
      audio.oncanplay = () => {
        if (!settled) setQuranStatus(`تم تحميل صوت ${reciterName} — جاري التشغيل...`);
      };
      tryCurrent();
    }, true);
  }

  function installReciterRecovery() {
    const merge = () => {
      mergeVerifiedReciters();
      installReliableReciterPreview();
    };
    merge();
    setTimeout(merge, 700);
    setTimeout(merge, 1800);
    setTimeout(merge, 4000);

    qid("qrReciterSearch")?.addEventListener("input", event => {
      setTimeout(() => filterVerifiedReciters(event.target.value), 0);
    }, true);
    qid("qrReciter")?.addEventListener("change", () => {
      const audio = qid("qrMiniAudio");
      if (audio) {
        try { audio.pause(); } catch {}
        audio.removeAttribute("src");
        audio.load();
      }
    });
  }

  function install(studio) {
    if (studio.dataset.integrationFixes === "3") return;
    studio.dataset.integrationFixes = "3";

    document.querySelectorAll(".qr-bg").forEach(btn => btn.addEventListener("click", () => {
      applyDemoBackground(btn.dataset.bg);
      hideEmptyPreview();
    }));

    qid("qrBgImage")?.addEventListener("change", hideEmptyPreview);
    qid("qrBgVideo")?.addEventListener("change", hideEmptyPreview);
    qid("qrPrepare")?.addEventListener("click", () => {
      hideEmptyPreview();
      const status = qid("qrStatus");
      const watcher = new MutationObserver(() => {
        if (/تم تجهيز/.test(status?.textContent || "")) {
          syncMetaLayer();
          watcher.disconnect();
        }
      });
      if (status) watcher.observe(status, { childList: true, subtree: true, characterData: true });
    });

    ["qrSurah", "qrFrom", "qrTo", "qrSurahLabel"].forEach(id => qid(id)?.addEventListener("change", syncMetaLayer));
    qid("qrSurahLabel")?.addEventListener("input", syncMetaLayer);

    qid("qrOpenEditor")?.addEventListener("click", hideEmptyPreview);
    installExportScaleGuard();
    installReciterRecovery();
    loadReciterPicker();
    applyDemoBackground(document.querySelector(".qr-bg.active")?.dataset.bg || "emerald");
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();