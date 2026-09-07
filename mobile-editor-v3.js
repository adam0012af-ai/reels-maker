"use strict";

(() => {
  const mq = window.matchMedia("(max-width:1000px)");
  if (!mq.matches) return;

  const VISUAL_ROUTES = new Set(["video","text","stickers","layers"]);
  const NO_PREVIEW_ROUTES = new Set(["audio","settings"]);
  const KNOWN_ROUTES = new Set(["home","quran","video","images","audio","text","stickers","layers","settings"]);

  function hashRoute() {
    let route = "";
    try { route = decodeURIComponent((location.hash || "").replace(/^#\/?/, "").split("?")[0]); } catch {}
    return KNOWN_ROUTES.has(route) ? route : "";
  }

  function activePanelRoute() {
    const active = document.querySelector(".panel.active[id^='panel-']");
    return active?.id?.replace(/^panel-/, "") || "";
  }

  function currentRoute(explicit = "") {
    if (KNOWN_ROUTES.has(explicit)) return explicit;
    const hash = hashRoute();
    if (hash) return hash;
    const active = activePanelRoute();
    return KNOWN_ROUTES.has(active) ? active : "home";
  }

  function sync(explicit = "") {
    if (!mq.matches) return;
    const route = currentRoute(explicit);
    document.body.dataset.rmMobileRoute = route;
    document.body.classList.toggle("rm-mobile-no-preview", NO_PREVIEW_ROUTES.has(route));
    document.body.classList.toggle("rm-mobile-visual-preview", VISUAL_ROUTES.has(route));
  }

  document.addEventListener("click", event => {
    if (!mq.matches) return;
    const shellTool = event.target.closest?.("#rmShellSidebar [data-rm-tool]");
    if (shellTool) {
      sync(shellTool.dataset.rmTool || "");
      return;
    }
    const tab = event.target.closest?.(".tab[data-tab]");
    if (tab) sync(tab.dataset.tab || "");
  }, true);

  window.addEventListener("hashchange", () => sync());
  window.addEventListener("popstate", () => sync());
  window.addEventListener("pageshow", () => sync());

  const observer = new MutationObserver(() => sync());
  function install() {
    sync();
    observer.observe(document.body, { subtree:true, attributes:true, attributeFilter:["class"] });
    setTimeout(sync, 120);
    setTimeout(sync, 500);
    setTimeout(sync, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true });
  else install();
})();
