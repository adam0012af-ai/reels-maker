"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let installed = false;

  function installMobileFormatSelect() {
    const grid = qid("ssFormatGrid");
    if (!grid || qid("ssFormatMobile")) return false;
    const wrap = document.createElement("label");
    wrap.id = "ssFormatMobile";
    wrap.className = "ss-format-mobile";
    wrap.innerHTML = '<select id="ssFormatSelectMobile" aria-label="مقاس الفيديو"></select>';
    grid.insertAdjacentElement("afterend", wrap);

    const select = qid("ssFormatSelectMobile");
    const cards = [...grid.querySelectorAll(".ss-format-card[data-format]")];
    cards.forEach(card => {
      const title = card.querySelector("b")?.textContent?.trim() || card.dataset.format;
      const ratio = card.querySelector("small")?.textContent?.trim() || "";
      select.add(new Option(`${title} — ${ratio}`, card.dataset.format));
    });

    const sync = () => {
      const active = grid.querySelector(".ss-format-card.active[data-format]");
      if (active && select.value !== active.dataset.format) select.value = active.dataset.format;
    };
    select.addEventListener("change", () => grid.querySelector(`.ss-format-card[data-format="${CSS.escape(select.value)}"]`)?.click());
    new MutationObserver(sync).observe(grid, { subtree:true, attributes:true, attributeFilter:["class"] });
    sync();
    return true;
  }

  function polishStoryHeader() {
    const head = document.querySelector(".story-studio .ss-head");
    if (!head || head.dataset.premiumPolished === "1") return false;
    head.dataset.premiumPolished = "1";
    const p = head.querySelector("p");
    if (p) p.textContent = "النص → الإعداد → المشاهد → الصوت → المراجعة → التصدير";
    return true;
  }

  function preventNestedSidebarScroll() {
    const side = document.querySelector(".story-studio .ss-side");
    if (side) side.setAttribute("data-premium-static", "1");
    const tabs = document.querySelector(".islamic-library .ic-tabs");
    if (tabs) tabs.setAttribute("data-premium-tabs", "1");
  }

  function watch() {
    installMobileFormatSelect();
    polishStoryHeader();
    preventNestedSidebarScroll();
    if (!qid("ssFormatGrid") || !document.querySelector(".story-studio .ss-head")) setTimeout(watch, 140);
  }

  function install() {
    if (installed) return;
    installed = true;
    watch();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install);
  else install();
})();
