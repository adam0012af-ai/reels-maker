"use strict";

(() => {
  const KEY = "reels-shell-active-route-v1";
  const VALID = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);

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
      if (/الأقسام/.test(text) || /^القسم(?:\s|$)/.test(text)) {
        button.style.setProperty("display", "none", "important");
        button.setAttribute("aria-hidden", "true");
      }
    });
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

  function openRoute(route, tries = 0) {
    if (!VALID.has(route)) route = "home";
    const button = document.querySelector(`#rmShellSidebar [data-rm-tool="${route}"]`);
    if (button) {
      button.click();
      save(route, true);
      cleanLegacySectionButtons();
      return;
    }
    if (tries < 60) setTimeout(() => openRoute(route, tries + 1), 100);
  }

  function restore() {
    if (location.hash === "#projects") {
      cleanLegacySectionButtons();
      return;
    }
    let route = hashRoute();
    if (!route) {
      try { route = localStorage.getItem(KEY) || "home"; } catch { route = "home"; }
    }
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
    if (location.hash === "#projects") return;
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
    setTimeout(restore, 140);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
