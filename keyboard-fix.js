"use strict";

(() => {
  const isEditable = el => !!el && (
    el.matches?.('input:not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable="true"]') ||
    el.isContentEditable
  );

  let editing = false;
  let lastLayoutWidth = window.innerWidth;
  let lastOrientation = screen.orientation?.type || (window.innerWidth > window.innerHeight ? "landscape" : "portrait");

  function activeIsEditable() {
    return isEditable(document.activeElement);
  }

  function keepFocusedFieldVisible(el) {
    if (!isEditable(el)) return;
    setTimeout(() => {
      if (document.activeElement !== el) return;
      try {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      } catch {}
    }, 260);
  }

  document.addEventListener("focusin", e => {
    if (!isEditable(e.target)) return;
    editing = true;
    document.documentElement.classList.add("keyboard-editing");
    keepFocusedFieldVisible(e.target);
  }, true);

  document.addEventListener("focusout", e => {
    if (!isEditable(e.target)) return;
    setTimeout(() => {
      editing = activeIsEditable();
      if (!editing) document.documentElement.classList.remove("keyboard-editing");
    }, 150);
  }, true);

  window.addEventListener("DOMContentLoaded", () => {
    if (typeof window.syncResponsivePanels !== "function") return;

    const originalSync = window.syncResponsivePanels;
    window.removeEventListener("resize", originalSync);

    const safeResponsiveSync = () => {
      const width = window.innerWidth;
      const orientation = screen.orientation?.type || (width > window.innerHeight ? "landscape" : "portrait");
      const widthDelta = Math.abs(width - lastLayoutWidth);
      const breakpointChanged = (width > 900) !== (lastLayoutWidth > 900);
      const orientationChanged = orientation !== lastOrientation;

      // Opening/closing the Android/iOS keyboard mostly changes viewport height.
      // Never move editor panels while a text control has focus.
      if (editing || activeIsEditable()) return;

      if (breakpointChanged || orientationChanged || widthDelta > 120) {
        lastLayoutWidth = width;
        lastOrientation = orientation;
        originalSync();
      }
    };

    window.addEventListener("resize", safeResponsiveSync, { passive: true });

    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        if (editing || activeIsEditable()) return;
        lastLayoutWidth = window.innerWidth;
        lastOrientation = screen.orientation?.type || (window.innerWidth > window.innerHeight ? "landscape" : "portrait");
        originalSync();
      }, 300);
    }, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        // Intentionally do not rebuild/reparent panels on virtual-keyboard resizes.
        if (editing || activeIsEditable()) return;
      }, { passive: true });
    }
  });
})();
