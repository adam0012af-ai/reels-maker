"use strict";

(() => {
  let metaLayerId = null;
  const qid = id => document.getElementById(id);

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

  function install(studio) {
    if (studio.dataset.integrationFixes === "1") return;
    studio.dataset.integrationFixes = "1";

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
    applyDemoBackground(document.querySelector(".qr-bg.active")?.dataset.bg || "emerald");
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", waitForStudio);
  else waitForStudio();
})();
