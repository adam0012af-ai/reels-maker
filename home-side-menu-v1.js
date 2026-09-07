"use strict";

(() => {
  const items = [
    { key: "home", icon: "⌂", label: "الرئيسية" },
    { key: "quran", icon: "☪", label: "القرآن" },
    { key: "video", icon: "🎬", label: "الفيديو" },
    { key: "audio", icon: "♫", label: "الصوت AI" },
    { key: "text", icon: "T", label: "النصوص" },
    { key: "stickers", icon: "✨", label: "ملصقات" },
    { key: "layers", icon: "▱", label: "الطبقات" },
    { key: "settings", icon: "⚙", label: "الإعدادات" }
  ];

  function buildMenu(home) {
    if (!home || document.getElementById("homeSideMenu")) return false;

    const menu = document.createElement("aside");
    menu.id = "homeSideMenu";
    menu.className = "th-side-menu";
    menu.setAttribute("aria-label", "قائمة أدوات الموقع");

    menu.innerHTML = `
      <div class="th-side-brand" aria-hidden="true">R</div>
      <div class="th-side-title">الأدوات</div>
      <nav class="th-side-nav">
        ${items.map(item => item.key === "home"
          ? `<button class="th-side-item active" type="button" data-side-home="1" title="${item.label}"><span class="th-side-icon">${item.icon}</span><span class="th-side-label">${item.label}</span></button>`
          : `<button class="th-side-item" type="button" data-home-tool="${item.key}" title="${item.label}"><span class="th-side-icon">${item.icon}</span><span class="th-side-label">${item.label}</span></button>`
        ).join("")}
      </nav>`;

    menu.addEventListener("click", event => {
      const homeButton = event.target.closest("[data-side-home]");
      if (!homeButton) return;
      event.preventDefault();
      home.scrollTo({ top: 0, behavior: "smooth" });
    });

    home.prepend(menu);
    home.classList.add("has-side-menu");
    return true;
  }

  function init() {
    const existing = document.getElementById("transparentHome");
    if (buildMenu(existing)) return;

    const observer = new MutationObserver(() => {
      const home = document.getElementById("transparentHome");
      if (buildMenu(home)) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();