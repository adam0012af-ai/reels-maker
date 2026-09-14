"use strict";
(function () {
  function openStudio() {
    const root = document.getElementById("rmAutoContent");
    if (!root) return false;
    root.classList.add("open");
    document.body.style.overflow = "hidden";
    document.querySelectorAll("#rmShellSidebar [data-rm-tool]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.rmTool === "automation");
    });
    return true;
  }

  function closeStudio() {
    const root = document.getElementById("rmAutoContent");
    if (root) root.classList.remove("open");
    document.body.style.overflow = "";
  }

  window.ReelsAutomation = { open: openStudio, close: closeStudio };
})();