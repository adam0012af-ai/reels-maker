"use strict";

(() => {
  const mq = window.matchMedia("(max-width:1000px)");
  if (!mq.matches) return;

  const hiddenClass = "rm-mobile-polish-hidden";
  let scheduled = false;

  function hide(el) {
    if (!el || el.closest?.("#rmShellSidebar")) return;
    el.classList?.add(hiddenClass);
    el.setAttribute?.("aria-hidden", "true");
    if ("tabIndex" in el) el.tabIndex = -1;
  }

  function cleanLegacyNavigation(root = document) {
    root.querySelectorAll?.(
      "#rmplusMenu,.rmplus-menu,.creator-drawer,.creator-drawer-overlay,#creatorDrawerOverlay,[class*='creator-drawer-overlay']"
    ).forEach(hide);

    root.querySelectorAll?.("button,a").forEach(el => {
      if (el.closest?.("#rmShellSidebar")) return;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (
        text === "↑" ||
        /(^|\s)الأقسام($|\s)/.test(text) ||
        /^مشاريعي$/.test(text) && el.closest?.(".creator-drawer")
      ) hide(el);
    });

    document.body.classList.remove("creator-drawer-open", "drawer-open", "rmplus-drawer-open");
  }

  function ensureQuranScroll() {
    const studio = document.getElementById("quranStudio");
    if (!studio?.classList.contains("open")) return;
    studio.style.setProperty("overflow-y", "auto", "important");
    studio.style.setProperty("overflow-x", "hidden", "important");
    studio.style.setProperty("touch-action", "pan-y", "important");
    studio.style.setProperty("height", "100dvh", "important");
    const body = studio.querySelector(".qr-body");
    if (body) {
      body.style.setProperty("overflow", "visible", "important");
      body.style.setProperty("height", "auto", "important");
      body.style.setProperty("max-height", "none", "important");
    }
  }

  function ensureImageScroll() {
    const studio = document.getElementById("reelsImageStudio") || document.querySelector(".rmi.open");
    if (!studio?.classList.contains("open")) return;
    studio.style.setProperty("overflow-y", "auto", "important");
    studio.style.setProperty("overflow-x", "hidden", "important");
    studio.style.setProperty("touch-action", "pan-y", "important");
    studio.style.setProperty("height", "100dvh", "important");
  }

  function fitShell() {
    const nav = document.querySelector("#rmShellSidebar .rm-shell-nav");
    if (nav) {
      nav.style.setProperty("overflow-y", "auto", "important");
      nav.style.setProperty("min-height", "0", "important");
    }
  }

  function apply() {
    if (!mq.matches) return;
    document.documentElement.classList.add("rm-mobile-polish");
    cleanLegacyNavigation();
    ensureQuranScroll();
    ensureImageScroll();
    fitShell();
  }

  function queueApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  const observer = new MutationObserver(queueApply);

  function install() {
    apply();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    document.addEventListener("click", event => {
      if (event.target.closest?.("#rmMobileMenu")) setTimeout(apply, 0);
    }, true);

    window.addEventListener("pageshow", apply);
    window.addEventListener("orientationchange", () => setTimeout(apply, 100));
    window.addEventListener("resize", queueApply, { passive: true });
    setTimeout(apply, 150);
    setTimeout(apply, 600);
    setTimeout(apply, 1400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
