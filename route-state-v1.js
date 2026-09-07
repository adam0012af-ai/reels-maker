"use strict";

(() => {
  if (window.__RM_SINGLE_ROUTER__) return;
  window.__RM_SINGLE_ROUTER__ = true;

  const KEY = "reels-shell-active-route-v1";
  const ROUTES = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);
  const EDITOR_ROUTES = new Set(["video","audio","text","stickers","layers","settings"]);
  let routing = false;

  const $ = id => document.getElementById(id);

  function routeFromHash() {
    let raw = "";
    try { raw = decodeURIComponent((location.hash || "").replace(/^#/, "").split("?")[0]); } catch {}
    return ROUTES.has(raw) ? raw : "home";
  }

  function currentEditorRoute() {
    const active = document.querySelector(".panel.active[id^='panel-']");
    const key = active?.id?.replace(/^panel-/, "");
    return EDITOR_ROUTES.has(key) ? key : "video";
  }

  function remember(route) {
    if (!ROUTES.has(route)) return;
    try { localStorage.setItem(KEY, route); } catch {}
  }

  function setUrl(route, mode = "push") {
    if (!ROUTES.has(route)) return;
    remember(route);
    const target = `#${route}`;
    if (location.hash === target) return;
    try {
      const state = { ...(history.state || {}), rmShellRoute: route };
      if (mode === "replace") history.replaceState(state, "", target);
      else history.pushState(state, "", target);
    } catch {
      location.hash = target;
    }
  }

  function setSidebarActive(route) {
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(button => {
      const active = button.dataset.rmTool === route;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function cleanLegacyButtons(root = document) {
    root.querySelectorAll?.("button").forEach(button => {
      if (button.closest("#rmShellSidebar")) return;
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      if (
        /الأقسام/.test(text) ||
        /^القسم(?:\s|$)/.test(text) ||
        /^مشروع جديد$/.test(text) ||
        /ريل القرآن/.test(text) ||
        /تصدير وتحميل الريل/.test(text)
      ) {
        button.style.setProperty("display", "none", "important");
        button.setAttribute("aria-hidden", "true");
        button.tabIndex = -1;
      }
    });
  }

  function hideHome() {
    const home = $("transparentHome");
    if (home) {
      home.classList.remove("open");
      home.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("th-home-open");
    if ($("transparentHomeBack")) $("transparentHomeBack").hidden = true;
  }

  function showHome() {
    const home = $("transparentHome");
    if (home) {
      home.classList.add("open");
      home.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("th-home-open");
    document.body.style.overflow = "hidden";
    if ($("transparentHomeBack")) $("transparentHomeBack").hidden = true;
  }

  function closeQuran() {
    $("quranStudio")?.classList.remove("open");
  }

  function closeImages() {
    try { window.ReelsImageStudio?.close?.(); } catch {}
    $("reelsImageStudio")?.classList.remove("open");
    document.querySelector(".rmi.open")?.classList.remove("open");
  }

  function closeProjects() {
    try { window.ReelsProjectsV2?.close?.(); } catch {}
    $("rmProjectsV2")?.classList.remove("open");
    $("rmProjects")?.classList.remove("open");
  }

  function closeStory() {
    $("storyStudio")?.classList.remove("open");
  }

  function closeEverythingExcept(route) {
    if (route !== "home") hideHome();
    if (route !== "quran") closeQuran();
    if (route !== "images") closeImages();
    closeProjects();
    closeStory();
    document.body.style.overflow = route === "home" ? "hidden" : "";
  }

  function targetReady(route) {
    if (route === "home") return !!document.querySelector("#transparentHome.open");
    if (route === "quran") return !!document.querySelector("#quranStudio.open, .qr-studio.open");
    if (route === "images") return !!document.querySelector("#reelsImageStudio.open, .rmi.open");
    if (EDITOR_ROUTES.has(route)) {
      return !!document.querySelector(`#panel-${route}.active`) &&
        !document.querySelector("#transparentHome.open, #quranStudio.open, .rmi.open, #rmProjectsV2.open");
    }
    return false;
  }

  function releaseBoot() {
    document.documentElement.classList.remove("rm-route-booting");
    document.documentElement.removeAttribute("data-rm-boot-route");
    $("rmRouteBootStyle")?.remove();
    routing = false;
  }

  function finishRoute(route, tries = 0) {
    setSidebarActive(route);
    cleanLegacyButtons();
    closeProjects();
    if (targetReady(route)) {
      remember(route);
      return releaseBoot();
    }
    if (tries >= 80) return releaseBoot();
    setTimeout(() => finishRoute(route, tries + 1), 25);
  }

  function openQuran(route, tries = 0) {
    const studio = $("quranStudio");
    const launcher = $("quranStudioLaunch");
    if (studio && launcher) {
      launcher.click();
      setSidebarActive(route);
      return finishRoute(route);
    }
    if (tries >= 80) return releaseBoot();
    setTimeout(() => openQuran(route, tries + 1), 25);
  }

  function openImages(route, tries = 0) {
    if (window.ReelsImageStudio?.open) {
      window.ReelsImageStudio.open();
      setSidebarActive(route);
      return finishRoute(route);
    }
    if (tries >= 80) return releaseBoot();
    setTimeout(() => openImages(route, tries + 1), 25);
  }

  function openEditor(route) {
    const tab = document.querySelector(`.tab[data-tab="${route}"]`);
    if (tab) tab.click();
    setSidebarActive(route);
    finishRoute(route);
  }

  function applyRoute(route, { urlMode = "none" } = {}) {
    if (!ROUTES.has(route)) route = "home";
    routing = true;

    if (urlMode === "push" || urlMode === "replace") setUrl(route, urlMode);
    else remember(route);

    setSidebarActive(route);
    closeEverythingExcept(route);

    if (route === "home") {
      showHome();
      setSidebarActive("home");
      return finishRoute("home");
    }
    if (route === "quran") return openQuran("quran");
    if (route === "images") return openImages("images");
    return openEditor(route);
  }

  function boot() {
    if (location.hash === "#projects") {
      cleanLegacyButtons();
      return releaseBoot();
    }
    applyRoute(routeFromHash(), { urlMode: "none" });
  }

  document.addEventListener("click", event => {
    const shellButton = event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if (shellButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const route = shellButton.dataset.rmTool;
      setSidebarActive(route);
      applyRoute(route, { urlMode: "push" });
      return;
    }

    if (routing) return;

    const homeTool = event.target.closest?.("[data-home-tool]");
    if (homeTool && ROUTES.has(homeTool.dataset.homeTool)) {
      setTimeout(() => {
        const route = homeTool.dataset.homeTool;
        setUrl(route, "push");
        setSidebarActive(route);
      }, 0);
      return;
    }

    const tab = event.target.closest?.(".tab[data-tab]");
    if (tab && EDITOR_ROUTES.has(tab.dataset.tab)) {
      setTimeout(() => {
        const route = tab.dataset.tab;
        setUrl(route, "replace");
        setSidebarActive(route);
      }, 0);
      return;
    }

    if (event.target.closest?.("#qrOpenEditor")) {
      setTimeout(() => applyRoute("video", { urlMode: "replace" }), 0);
      return;
    }

    if (event.target.closest?.("#qrClose, .rmi-close")) {
      setTimeout(() => applyRoute(currentEditorRoute(), { urlMode: "replace" }), 0);
      return;
    }
  }, true);

  window.addEventListener("popstate", () => {
    if (location.hash === "#projects") return;
    applyRoute(routeFromHash(), { urlMode: "none" });
  });

  window.addEventListener("hashchange", () => {
    if (routing || location.hash === "#projects") return;
    applyRoute(routeFromHash(), { urlMode: "none" });
  });

  function install() {
    cleanLegacyButtons();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1) cleanLegacyButtons(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(boot, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else setTimeout(install, 0);
})();
