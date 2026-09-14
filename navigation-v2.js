"use strict";
(function () {
  const items = [
    ["home", "⌂", "الرئيسية", "نظرة عامة على المشروع"],
    ["automation", "⚡", "المحتوى التلقائي", "إنشاء فيديو كامل بالذكاء الاصطناعي"],
    ["video", "🎬", "محرر الفيديو", "تحرير وتجميع الفيديو"],
    ["images", "◇", "استوديو الصور", "إنشاء وتعديل الصور"],
    ["audio", "♫", "الصوت", "تعليق صوتي وموسيقى"],
    ["quran", "☪", "استوديو القرآن", "إنشاء ريلز القرآن"],
    ["text", "T", "النصوص", "إضافة وتنسيق النصوص"],
    ["stickers", "✦", "العناصر", "ملصقات وعناصر بصرية"],
    ["layers", "▱", "الطبقات", "ترتيب عناصر المشروع"],
    ["settings", "⚙", "الإعدادات", "التصدير والجودة والأداء"]
  ];

  function rebuild() {
    const nav = document.querySelector("#rmShellSidebar .rm-shell-nav");
    if (!nav) return false;
    nav.textContent = "";
    items.forEach(function (item) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rm-shell-item";
      button.dataset.rmTool = item[0];
      const icon = document.createElement("span");
      icon.className = "rm-shell-icon";
      icon.textContent = item[1];
      const copy = document.createElement("span");
      copy.className = "rm-shell-copy";
      const title = document.createElement("b");
      title.textContent = item[2];
      const desc = document.createElement("small");
      desc.textContent = item[3];
      copy.append(title, desc);
      const arrow = document.createElement("span");
      arrow.className = "rm-shell-arrow";
      arrow.textContent = "‹";
      button.append(icon, copy, arrow);
      if (item[0] === "automation") {
        button.addEventListener("click", function () {
          window.ReelsAutomation && window.ReelsAutomation.open && window.ReelsAutomation.open();
        });
      }
      nav.appendChild(button);
    });
    return true;
  }

  function start() {
    if (rebuild()) return;
    const observer = new MutationObserver(function () {
      if (rebuild()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();