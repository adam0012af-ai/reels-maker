"use strict";

(() => {
  if (window.__RM_ROUTE_STATE_INSTALLED__) return;
  window.__RM_ROUTE_STATE_INSTALLED__ = true;

  const KEY = "reels-shell-active-route-v1";
  const VALID = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);
  let restoring = false;

  const hashRoute = () => {
    const raw = decodeURIComponent((location.hash || "").replace(/^#/, "").split("?")[0]);
    return VALID.has(raw) ? raw : "";
  };

  const editorRoute = () => {
    const panel = document.querySelector(".panel.active[id^='panel-']");
    const key = panel?.id?.replace(/^panel-/, "");
    return VALID.has(key) ? key : "video";
  };

  const activeShellRoute = () => {
    const key = document.querySelector("#rmShellSidebar [data-rm-tool].active")?.dataset?.rmTool;
    return VALID.has(key) ? key : "";
  };

  function cleanLegacySectionButtons(root = document) {
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

  function finishBoot() {
    document.documentElement.classList.remove("rm-route-booting");
    document.documentElement.removeAttribute("data-rm-boot-route");
    document.getElementById("rmRouteBootStyle")?.remove();
    restoring = false;
  }

  function closeProjects() {
    try { window.ReelsProjectsV2?.close?.(); } catch {}
    const projects = document.getElementById("rmProjectsV2");
    if (projects) {
      projects.classList.remove("open");
      projects.setAttribute("aria-hidden", "true");
    }
  }

  function save(route, syncHash = true) {
    if (!VALID.has(route)) return;
    try { localStorage.setItem(KEY, route); } catch {}
    if (!syncHash) return;
    const target = `#${route}`;
    if (location.hash === target) return;
    try { history.replaceState({ ...(history.state || {}), rmShellRoute: route }, "", target); }
    catch { location.hash = target; }
  }

  function routeReady(route) {
    if (route === "home") return !!document.querySelector("#transparentHome.open");
    if (route === "quran") return !!document.querySelector("#quranStudio.open, .qr-studio.open");
    if (route === "images") return !!document.querySelector("#reelsImageStudio.open, .rmi.open");
    const panel = document.querySelector(`#panel-${route}.active`);
    const homeOpen = document.querySelector("#transparentHome.open");
    return !!panel && !homeOpen;
  }

  function waitUntilReady(route, tries = 0) {
    cleanLegacySectionButtons();
    if (route !== "home") closeProjects();
    if (routeReady(route)) {
      save(route, true);
      return finishBoot();
    }
    if (tries >= 100) return finishBoot();
    setTimeout(() => waitUntilReady(route, tries + 1), 40);
  }

  function openRoute(route, tries = 0) {
    if (!VALID.has(route)) route = "home";
    const button = document.querySelector(`#rmShellSidebar [data-rm-tool="${route}"]`);
    if (!button) {
      if (tries < 100) return setTimeout(() => openRoute(route, tries + 1), 40);
      return finishBoot();
    }

    restoring = true;
    button.click();
    cleanLegacySectionButtons();

    if (route === "quran") {
      let rounds = 0;
      const suppressProjects = () => {
        closeProjects();
        save("quran", true);
        if (++rounds < 24 && !routeReady("quran")) setTimeout(suppressProjects, 50);
      };
      setTimeout(suppressProjects, 0);
    } else if (route !== "home") {
      closeProjects();
      save(route, true);
    } else {
      save("home", true);
    }

    waitUntilReady(route);
  }

  function restore() {
    // The URL is the source of truth on refresh. No saved-route redirect.
    // No hash means the real homepage; #quran means Quran; #audio means audio, etc.
    let route = window.__RM_BOOT_ROUTE__ || hashRoute() || "home";
    if (!VALID.has(route)) route = "home";
    openRoute(route);
  }

  document.addEventListener("click", event => {
    const shellTool = event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if (shellTool) return save(shellTool.dataset.rmTool, true);

    const homeTool = event.target.closest?.("[data-home-tool]");
    if (homeTool && VALID.has(homeTool.dataset.homeTool)) return save(homeTool.dataset.homeTool, true);

    const tab = event.target.closest?.(".tab[data-tab]");
    if (tab && VALID.has(tab.dataset.tab)) return save(tab.dataset.tab, true);

    if (event.target.closest?.("#quranStudioLaunch")) return save("quran", true);
    if (event.target.closest?.("#qrOpenEditor")) return setTimeout(() => save(editorRoute(), true), 0);

    if (event.target.closest?.("#qrClose") || event.target.closest?.(".rmi-close")) {
      return setTimeout(() => save(editorRoute(), true), 0);
    }

    if (event.target.closest?.("#rmp2Close")) {
      return setTimeout(() => save(activeShellRoute() || editorRoute(), true), 0);
    }
  }, true);

  window.addEventListener("hashchange", () => {
    if (restoring) return;
    const route = hashRoute();
    if (!route) return;
    const active = activeShellRoute();
    if (active !== route) openRoute(route);
    else save(route, false);
  });

  const install = () => {
    cleanLegacySectionButtons();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1) cleanLegacySectionButtons(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    restore();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
