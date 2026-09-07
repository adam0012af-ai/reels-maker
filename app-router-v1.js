"use strict";

(() => {
  if (window.__RM_APP_ROUTER_V1__) return;
  window.__RM_APP_ROUTER_V1__ = true;
  window.__RM_MODERN_MOBILE__ = true;

  const ROUTES = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);
  const EDITOR = new Set(["video","audio","text","stickers","layers","settings"]);
  const PANEL_ORDER = ["video","stickers","text","audio","layers","settings"];
  const $ = id => document.getElementById(id);
  let applying = false;
  let queued = false;

  function readRoute() {
    let value = "";
    try { value = decodeURIComponent((location.hash || "").replace(/^#\/?/, "").split("?")[0]); } catch {}
    return ROUTES.has(value) ? value : "home";
  }

  function writeRoute(route, replace = false) {
    if (!ROUTES.has(route)) route = "home";
    const hash = `#${route}`;
    if (location.hash === hash) return;
    try {
      const state = { ...(history.state || {}), rmRoute: route };
      (replace ? history.replaceState : history.pushState).call(history, state, "", hash);
    } catch { location.hash = hash; }
  }

  function setActive(route) {
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(btn => {
      const active = btn.dataset.rmTool === route;
      btn.classList.toggle("active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function closeDrawer() {
    document.body.classList.remove("rm-mobile-open");
    $("rmMobileMenu")?.setAttribute("aria-expanded", "false");
  }

  function normalizePanels() {
    const panels = document.querySelector(".panels");
    if (!panels) return;
    PANEL_ORDER.forEach(key => {
      const panel = $(`panel-${key}`);
      if (panel && panel.parentElement !== panels) panels.appendChild(panel);
    });
    const sheet = $("mobileSheet");
    if (sheet) {
      sheet.classList.remove("open");
      sheet.setAttribute("aria-hidden", "true");
    }
  }

  function hideHome() {
    [$("transparentHome"), $("homeShell")].forEach(home => {
      if (!home) return;
      home.classList.remove("open");
      home.setAttribute?.("aria-hidden", "true");
    });
    document.body.classList.remove("th-home-open", "home-mode");
    document.body.style.overflow = "";
    if ($("transparentHomeBack")) $("transparentHomeBack").hidden = true;
  }

  function closeQuran() {
    const q = $("quranStudio") || document.querySelector(".qr-studio");
    q?.classList.remove("open");
  }

  function closeImages() {
    try { window.ReelsImageStudio?.close?.(); } catch {}
    const studio = $("reelsImageStudio") || document.querySelector(".rmi");
    studio?.classList.remove("open");
  }

  function closeLegacySurfaces() {
    ["rmProjectsV2","rmProjects","storyStudio","islamicContentLibrary","homeShell"].forEach(id => $(id)?.classList.remove("open"));
    document.querySelectorAll(".creator-drawer,.creator-drawer-overlay,.rmplus-menu").forEach(el => {
      el.classList.remove("open");
      el.style.setProperty("display", "none", "important");
    });
  }

  function setMobileMode(route) {
    document.body.dataset.rmMobileRoute = route;
    document.body.classList.toggle("rm-mobile-no-preview", route === "audio" || route === "settings");
    document.body.classList.toggle("rm-mobile-player", route === "video" || route === "text" || route === "stickers" || route === "layers");
  }

  function activatePanel(route) {
    normalizePanels();
    document.querySelectorAll(".panel[id^='panel-']").forEach(panel => panel.classList.toggle("active", panel.id === `panel-${route}`));
    document.querySelectorAll(".tab[data-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === route));
  }

  function resetScroll(route) {
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch { window.scrollTo(0,0); }
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.body.scrollTop = 0;
    [$("controlsPanel"), document.querySelector(".controls"), document.querySelector(".panels")].forEach(el => { if (el) el.scrollTop = 0; });
    if (route === "quran") {
      const q = $("quranStudio") || document.querySelector(".qr-studio");
      if (q) q.scrollTop = 0;
      const settings = q?.querySelector(".qr-settings"); if (settings) settings.scrollTop = 0;
    }
    if (route === "images") {
      const im = $("reelsImageStudio") || document.querySelector(".rmi");
      if (im) im.scrollTop = 0;
      const main = im?.querySelector(".rmi-main"); if (main) main.scrollTop = 0;
    }
  }

  function showHome(tries = 0) {
    closeQuran(); closeImages(); closeLegacySurfaces(); normalizePanels();
    const home = $("transparentHome");
    if (!home) {
      if (tries < 100) return setTimeout(() => { if (readRoute() === "home") showHome(tries + 1); }, 25);
      return false;
    }
    home.classList.add("open");
    home.setAttribute("aria-hidden", "false");
    document.body.classList.add("th-home-open");
    document.body.style.overflow = "hidden";
    setMobileMode("home");
    return true;
  }

  function showQuran(tries = 0) {
    hideHome(); closeImages(); closeLegacySurfaces(); normalizePanels();
    setMobileMode("quran");
    let studio = $("quranStudio") || document.querySelector(".qr-studio");
    if (!studio) {
      const launch = $("quranStudioLaunch");
      if (launch) launch.click();
      studio = $("quranStudio") || document.querySelector(".qr-studio");
    }
    if (!studio) {
      if (tries < 100) return setTimeout(() => { if (readRoute() === "quran") showQuran(tries + 1); }, 25);
      return false;
    }
    studio.classList.add("open");
    document.body.style.overflow = "";
    return true;
  }

  function showImages(tries = 0) {
    hideHome(); closeQuran(); closeLegacySurfaces(); normalizePanels();
    setMobileMode("images");
    try { window.ReelsImageStudio?.open?.(); } catch {}
    const studio = $("reelsImageStudio") || document.querySelector(".rmi");
    if (!studio) {
      if (tries < 100) return setTimeout(() => { if (readRoute() === "images") showImages(tries + 1); }, 25);
      return false;
    }
    studio.classList.add("open");
    document.body.style.overflow = "";
    return true;
  }

  function showEditor(route) {
    hideHome(); closeQuran(); closeImages(); closeLegacySurfaces(); normalizePanels();
    activatePanel(route);
    setMobileMode(route);
    document.body.style.overflow = "";
    return !!$(`panel-${route}`);
  }

  function targetReady(route) {
    if (route === "home") return !!document.querySelector("#transparentHome.open");
    if (route === "quran") return !!document.querySelector("#quranStudio.open,.qr-studio.open");
    if (route === "images") return !!document.querySelector("#reelsImageStudio.open,.rmi.open");
    if (EDITOR.has(route)) return !!document.querySelector(`#panel-${route}.active`);
    return false;
  }

  function reveal() {
    document.documentElement.classList.remove("rm-clean-boot","rm-route-booting","rm-v8-boot");
    $("rmCleanBootStyle")?.remove();
    $("rmRouteBootStyle")?.remove();
    $("rmV8BootStyle")?.remove();
  }

  function settle(route, tries = 0) {
    setActive(route);
    normalizePanels();
    if (targetReady(route) || tries >= 100) {
      resetScroll(route);
      requestAnimationFrame(() => {
        setActive(route);
        resetScroll(route);
        reveal();
        applying = false;
      });
      return;
    }
    setTimeout(() => settle(route, tries + 1), 25);
  }

  function apply(route = readRoute()) {
    if (!ROUTES.has(route)) route = "home";
    applying = true;
    closeDrawer();
    setActive(route);
    if (route === "home") showHome();
    else if (route === "quran") showQuran();
    else if (route === "images") showImages();
    else showEditor(route);
    setActive(route);
    settle(route);
  }

  function queueNormalize() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      normalizePanels();
      setActive(readRoute());
    });
  }

  document.addEventListener("click", event => {
    const shellTool = event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if (shellTool) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const route = shellTool.dataset.rmTool;
      writeRoute(route, false);
      apply(route);
      return;
    }

    const homeTool = event.target.closest?.("[data-home-tool]");
    if (homeTool && ROUTES.has(homeTool.dataset.homeTool)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const route = homeTool.dataset.homeTool;
      writeRoute(route, false);
      apply(route);
      return;
    }

    if (event.target.closest?.("#qrOpenEditor")) {
      event.preventDefault();
      writeRoute("video", true);
      apply("video");
      return;
    }
  }, true);

  window.addEventListener("hashchange", () => { if (!applying) apply(readRoute()); });
  window.addEventListener("popstate", () => apply(readRoute()));
  window.addEventListener("pageshow", () => setTimeout(() => apply(readRoute()), 0));

  function install() {
    normalizePanels();
    const observer = new MutationObserver(queueNormalize);
    observer.observe(document.body, { childList: true, subtree: true });
    apply(readRoute());
    setTimeout(() => { if (document.documentElement.classList.contains("rm-clean-boot")) apply(readRoute()); }, 500);
    setTimeout(reveal, 4000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
