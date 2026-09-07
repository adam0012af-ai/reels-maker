"use strict";

(() => {
  if (window.__RM_ROUTE_STATE_INSTALLED__) return;
  window.__RM_ROUTE_STATE_INSTALLED__ = true;

  const KEY = "reels-shell-active-route-v1";
  const VALID = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);
  let restoring = false;
  let currentRoute = "home";

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

  function syncSidebar(route = currentRoute) {
    if (!VALID.has(route)) route = "home";
    currentRoute = route;
    document.documentElement.dataset.rmActiveRoute = route;
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(button => {
      const active = button.dataset.rmTool === route;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

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

  function finishBoot(route = currentRoute) {
    syncSidebar(route);
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
    currentRoute = route;
    syncSidebar(route);
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
    syncSidebar(route);
    cleanLegacySectionButtons();
    if (route !== "home") closeProjects();
    if (routeReady(route)) {
      save(route, true);
      return finishBoot(route);
    }
    if (tries >= 100) return finishBoot(route);
    setTimeout(() => waitUntilReady(route, tries + 1), 40);
  }

  function openRoute(route, tries = 0) {
    if (!VALID.has(route)) route = "home";
    currentRoute = route;
    syncSidebar(route);

    const button = document.querySelector(`#rmShellSidebar [data-rm-tool="${route}"]`);
    if (!button) {
      if (tries < 100) return setTimeout(() => openRoute(route, tries + 1), 40);
      return finishBoot(route);
    }

    restoring = true;
    syncSidebar(route);
    button.click();
    syncSidebar(route);
    cleanLegacySectionButtons();

    if (route === "quran") {
      let rounds = 0;
      const suppressProjects = () => {
        closeProjects();
        save("quran", true);
        syncSidebar("quran");
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
    // Refresh is route-native: the current URL alone decides the first screen.
    // No hash = homepage. #quran = Quran. #audio = text-to-speech, etc.
    let route = hashRoute() || "home";
    if (!VALID.has(route)) route = "home";
    currentRoute = route;
    syncSidebar(route);
    openRoute(route);
  }

  document.addEventListener("click", event => {
    const shellTool = event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if (shellTool) {
      const route = shellTool.dataset.rmTool;
      syncSidebar(route);
      return save(route, true);
    }

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
    const route = hashRoute() || "home";
    currentRoute = route;
    syncSidebar(route);
    const active = activeShellRoute();
    if (active !== route) openRoute(route);
    else save(route, false);
  });

  window.addEventListener("pageshow", () => {
    const route = hashRoute() || currentRoute || "home";
    syncSidebar(route);
  });

  const install = () => {
    cleanLegacySectionButtons();
    const observer = new MutationObserver(records => {
      let shellChanged = false;
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            cleanLegacySectionButtons(node);
            if (node.id === "rmShellSidebar" || node.querySelector?.("#rmShellSidebar")) shellChanged = true;
          }
        });
      }
      if (shellChanged || document.getElementById("rmShellSidebar")) syncSidebar(currentRoute);
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