"use strict";

(() => {
  const mq = window.matchMedia("(max-width:1000px)");
  if (!mq.matches) return;

  function closeDrawer() {
    const close = document.getElementById("rmMobileClose");
    if (close) {
      close.click();
      return;
    }
    document.body.classList.remove("rm-mobile-open");
    document.getElementById("rmMobileMenu")?.setAttribute("aria-expanded", "false");
  }

  // Run before document-level route handlers. Selecting any service should
  // close the drawer immediately while the chosen route continues opening.
  window.addEventListener("click", event => {
    if (!mq.matches) return;
    const tool = event.target?.closest?.("#rmShellSidebar [data-rm-tool]");
    if (!tool) return;
    setTimeout(closeDrawer, 0);
  }, true);

  window.addEventListener("popstate", closeDrawer);
  window.addEventListener("hashchange", closeDrawer);
})();
