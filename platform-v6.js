"use strict";
(() => {
  const cssId = "reelsPlatformV7Css";
  if (!document.getElementById(cssId)) {
    const link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = "/platform-v7.css?v=7";
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-reels-platform-v7="1"]')) {
    const script = document.createElement("script");
    script.src = "/platform-v7.js?v=7";
    script.defer = true;
    script.dataset.reelsPlatformV7 = "1";
    document.head.appendChild(script);
  }
})();
