"use strict";
(() => {
  function openAuto() {
    try {
      document.body.classList.remove("rm-mobile-open");
      const root = document.getElementById("rmMobileAuto");
      if (root) {
        root.classList.add("open");
        root.style.setProperty("display", "block", "important");
        root.style.setProperty("visibility", "visible", "important");
        root.style.setProperty("opacity", "1", "important");
        root.style.setProperty("pointer-events", "auto", "important");
        document.body.style.overflow = "hidden";
        return true;
      }
      if (window.ReelsAutomation && typeof window.ReelsAutomation.open === "function") {
        return !!window.ReelsAutomation.open();
      }
    } catch (_) {}
    return false;
  }

  function handler(event) {
    const button = event.target && event.target.closest ? event.target.closest('[data-rm-tool="automation"]') : null;
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    if (!openAuto()) {
      setTimeout(openAuto, 60);
      setTimeout(openAuto, 180);
    }
  }

  document.addEventListener("click", handler, true);
  document.addEventListener("pointerup", handler, true);
})();
