"use strict";

(() => {
  const qid = id => document.getElementById(id);
  let installed = false;
  let active = "story";
  let timer = 0;

  function injectStyles() {
    if (qid("homePremiumV2Styles")) return;
    const style = document.createElement("style");
    style.id = "homePremiumV2Styles";
    style.textContent = `
      .home-shell{background:
        radial-gradient(circle at 84% 12%,rgba(61,87,128,.15),transparent 28%),
        radial-gradient(circle at 12% 76%,rgba(32,120,103,.10),transparent 28%),
        linear-gradient(180deg,#080d14,#070b10 52%,#070a0f)!important}
      .home-header{height:78px!important;border-bottom-color:rgba(142,164,190,.10)!important;background:rgba(7,12,18,.82)!important;box-shadow:0 10px 40px rgba(0,0,0,.16)}
      .home-logo{background:linear-gradient(145deg,#192b42,#1e7c69)!important;border:1px solid rgba(255,255,255,.10);box-shadow:inset 0 1px rgba(255,255,255,.08),0 10px 28px rgba(0,0,0,.22)}
      .home-btn{border-color:rgba(142,164,190,.16)!important;background:linear-gradient(180deg,#111a26,#0d151f)!important;box-shadow:inset 0 1px rgba(255,255,255,.025);transition:.18s transform,.18s border-color,.18s background}.home-btn:hover{transform:translateY(-1px);border-color:rgba(103,151,202,.32)!important}.home-btn.primary{background:linear-gradient(135deg,#5267df,#7459da)!important}.home-btn.green{background:linear-gradient(135deg,#1d9d7d,#32c49b)!important}
      .home-main{max-width:1260px!important}.home-hero{gap:54px!important;min-height:565px!important}.home-kicker{border-color:rgba(84,132,181,.22)!important;background:rgba(31,58,87,.24)!important;color:#b9cbe0!important;letter-spacing:.1px}.home-copy h1{font-weight:800!important;letter-spacing:-2px!important}.home-copy h1 em{background:linear-gradient(90deg,#a9b9ff,#4ed6b2)!important;-webkit-background-clip:text!important}.home-copy p{color:#9eabb9!important;max-width:720px!important}.home-proof{border-top:1px solid rgba(255,255,255,.06);padding-top:20px}.home-proof b{font-size:15px!important;color:#eaf0f6}.home-proof span{color:#718195!important}
      .home-tool{background:linear-gradient(180deg,rgba(17,26,38,.96),rgba(10,16,24,.98))!important;border-color:rgba(142,164,190,.10)!important;box-shadow:0 20px 50px rgba(0,0,0,.12),inset 0 1px rgba(255,255,255,.025)!important;transition:.22s transform,.22s border-color,.22s box-shadow!important}.home-tool:hover{transform:translateY(-5px)!important;border-color:rgba(88,139,191,.34)!important;box-shadow:0 28px 65px rgba(0,0,0,.24)!important}.home-tool-icon{background:linear-gradient(145deg,#142235,#152d2b)!important;border:1px solid rgba(255,255,255,.06)}
      .home-step{background:linear-gradient(180deg,#0d151f,#0a1119)!important;border-color:rgba(142,164,190,.09)!important}
      .home-preview{min-height:520px!important;perspective:1200px}.home-phone{width:278px!important;border:7px solid #101821!important;background:#05080d!important;border-radius:36px!important;box-shadow:0 45px 110px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.05),inset 0 0 0 1px rgba(255,255,255,.04)!important;transform:rotateY(-3deg) rotateX(1deg);transition:.4s transform}.home-preview:hover .home-phone{transform:rotateY(0) rotateX(0) translateY(-3px)}.home-phone:before{display:none!important}
      .hp-shell{position:absolute;inset:0;background:#060a10;color:#fff;overflow:hidden}.hp-status{height:32px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font:700 7px Cairo;color:#8fa0b5;background:rgba(9,14,21,.92);border-bottom:1px solid rgba(255,255,255,.05)}.hp-status strong{color:#dfe8f2;font-size:7px}.hp-content{position:absolute;inset:32px 0 0}.hp-screen{position:absolute;inset:0;opacity:0;transform:translateX(22px) scale(.985);transition:.52s cubic-bezier(.2,.75,.2,1);pointer-events:none}.hp-screen.active{opacity:1;transform:none;pointer-events:auto}.hp-screen.exit-left{opacity:0;transform:translateX(-20px) scale(.985)}
      .hp-top{height:45px;padding:8px 10px;display:flex;align-items:center;gap:7px;border-bottom:1px solid rgba(255,255,255,.05);background:#0b1119}.hp-dotlogo{width:25px;height:25px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(145deg,#5264d8,#24a882);font:900 9px Cairo}.hp-top div{min-width:0}.hp-top b{font:800 8px Cairo;display:block}.hp-top span{font:600 5.8px Cairo;color:#708096;display:block;margin-top:1px}.hp-body{padding:9px;height:calc(100% - 45px);box-sizing:border-box}
      .hp-story-scene{height:64%;border-radius:13px;position:relative;overflow:hidden;background:linear-gradient(160deg,#16264a,#235e5c 55%,#101925)}.hp-story-scene:before{content:"";position:absolute;width:72px;height:72px;border-radius:50%;background:#d7a176;right:28px;top:52px;box-shadow:-42px 85px 0 20px #2c6683}.hp-story-scene:after{content:"";position:absolute;inset:auto 10px 12px;background:rgba(2,6,10,.68);height:42px;border-radius:10px}.hp-caption-mini{position:absolute;bottom:22px;right:20px;left:20px;text-align:center;font:800 6.5px/1.7 Cairo;z-index:2}.hp-chipline{display:flex;gap:5px;margin-top:7px}.hp-chip{flex:1;border:1px solid rgba(255,255,255,.06);background:#0d151f;border-radius:8px;padding:6px 5px;text-align:center;font:700 5.5px Cairo;color:#91a0b3}.hp-chip.on{color:#7ee1be;border-color:rgba(57,207,160,.22);background:rgba(40,175,137,.08)}
      .hp-quran-bg{height:71%;border-radius:13px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 24%,rgba(80,185,142,.28),transparent 24%),linear-gradient(180deg,#0d302b,#0a1d1d 62%,#081012)}.hp-quran-bg:before{content:"☾";position:absolute;left:26px;top:30px;font-size:42px;color:rgba(228,243,223,.75)}.hp-mosque{position:absolute;right:16px;left:16px;bottom:58px;height:72px;background:linear-gradient(180deg,#173f38,#0d2925);clip-path:polygon(0 100%,0 58%,8% 58%,8% 37%,12% 22%,16% 37%,16% 58%,34% 58%,34% 38%,39% 26%,44% 38%,44% 58%,56% 58%,56% 33%,62% 17%,68% 33%,68% 58%,84% 58%,84% 39%,89% 25%,94% 39%,94% 58%,100% 58%,100% 100%)}.hp-ayah{position:absolute;right:16px;left:16px;bottom:18px;text-align:center;font:700 9px/1.8 Amiri,serif;color:#f7fbf5;text-shadow:0 2px 10px #000}.hp-quran-meta{display:flex;justify-content:space-between;gap:5px;margin-top:7px}.hp-quran-meta span{font:700 5.5px Cairo;color:#8ca394;border:1px solid rgba(80,185,142,.13);border-radius:7px;padding:5px 7px;background:rgba(25,93,77,.08)}
      .hp-editor{height:100%;display:grid;grid-template-rows:1fr 76px;gap:7px}.hp-editor-main{display:grid;grid-template-columns:1fr 57px;gap:6px}.hp-canvas{border-radius:12px;background:linear-gradient(160deg,#13243c,#1b5e54);position:relative;overflow:hidden}.hp-canvas:before{content:"AI STORY";position:absolute;top:11px;right:10px;font:900 6px Cairo;color:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:3px 5px}.hp-canvas:after{content:"النص والمشهد متزامنان";position:absolute;right:9px;left:9px;bottom:14px;background:rgba(0,0,0,.55);border-radius:7px;padding:6px;text-align:center;font:800 6px Cairo}.hp-layers{display:flex;flex-direction:column;gap:5px}.hp-layer{height:30px;border-radius:7px;background:#0e1722;border:1px solid rgba(255,255,255,.06);display:grid;place-items:center;font:700 5px Cairo;color:#8e9db0}.hp-layer.active{border-color:rgba(91,125,224,.25);color:#cdd7ff}.hp-timeline{border-radius:10px;background:#0b121b;border:1px solid rgba(255,255,255,.05);padding:7px}.hp-track{height:13px;border-radius:4px;background:linear-gradient(90deg,#556ddf 0 28%,#285d58 28% 60%,#7c5a95 60% 82%,#3d566f 82%);margin-bottom:5px}.hp-wave{height:11px;border-radius:4px;background:repeating-linear-gradient(90deg,#2d9e80 0 2px,transparent 2px 5px);opacity:.55}.hp-playhead{width:1px;height:31px;background:#fff;position:absolute;right:48%;bottom:15px;box-shadow:0 0 8px rgba(255,255,255,.5)}
      .hp-library-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.hp-lib-card{min-height:74px;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:linear-gradient(160deg,#0f1924,#0b121a);padding:8px}.hp-lib-card i{font-style:normal;font-size:15px}.hp-lib-card b{display:block;font:800 7px Cairo;margin:5px 0 2px}.hp-lib-card span{font:600 5px/1.6 Cairo;color:#718198}.hp-lib-card.wide{grid-column:1/-1;min-height:90px;background:linear-gradient(145deg,rgba(30,104,87,.23),rgba(21,30,44,.7))}
      .hp-dots{position:absolute;bottom:8px;right:0;left:0;display:flex;justify-content:center;gap:4px;z-index:8}.hp-dot{width:5px;height:5px;border-radius:50%;background:#394756;transition:.2s}.hp-dot.active{width:15px;border-radius:99px;background:#59c9a7}.hp-live{position:absolute;top:42px;left:10px;z-index:10;font:800 5px Cairo;letter-spacing:.4px;color:#83dcbf;border:1px solid rgba(72,208,164,.18);border-radius:999px;padding:4px 6px;background:rgba(9,33,28,.55)}
      .home-float{background:rgba(10,17,25,.88)!important;border-color:rgba(142,164,190,.12)!important;color:#a7b4c4!important}.home-float.one{right:-2%!important}.home-float.two{left:-3%!important}.home-float.three{left:1%!important}
      @media(max-width:900px){.home-phone{width:225px!important;transform:none}.home-hero{gap:18px!important}.home-preview{min-height:430px!important}}
    `;
    document.head.appendChild(style);
  }

  const screens = {
    story: () => `
      <section class="hp-screen" data-hp-screen="story"><div class="hp-top"><span class="hp-dotlogo">S</span><div><b>Story Studio</b><span>AI storyboard • narrator • review</span></div></div><div class="hp-body"><div class="hp-story-scene"><div class="hp-caption-mini">وجد ياسين المحفظة… ثم قرر أن يعيدها لصاحبها.</div></div><div class="hp-chipline"><span class="hp-chip on">8 مشاهد</span><span class="hp-chip">راوي AI</span><span class="hp-chip">Review</span></div></div></section>`,
    quran: () => `
      <section class="hp-screen" data-hp-screen="quran"><div class="hp-top"><span class="hp-dotlogo">☪</span><div><b>Quran Studio</b><span>Reciter • ayah sync • backgrounds</span></div></div><div class="hp-body"><div class="hp-quran-bg"><div class="hp-mosque"></div><div class="hp-ayah">إِنَّ مَعَ الْعُسْرِ يُسْرًا</div></div><div class="hp-quran-meta"><span>العفاسي</span><span>الشرح • 6</span><span>9:16</span></div></div></section>`,
    editor: () => `
      <section class="hp-screen" data-hp-screen="editor"><div class="hp-top"><span class="hp-dotlogo">✂</span><div><b>Full Editor</b><span>Timeline • layers • audio • export</span></div></div><div class="hp-body hp-editor"><div class="hp-editor-main"><div class="hp-canvas"></div><div class="hp-layers"><div class="hp-layer active">TEXT</div><div class="hp-layer">LOGO</div><div class="hp-layer">IMAGE</div><div class="hp-layer">SFX</div></div></div><div class="hp-timeline" style="position:relative"><div class="hp-track"></div><div class="hp-wave"></div><i class="hp-playhead"></i></div></div></section>`,
    islamic: () => `
      <section class="hp-screen" data-hp-screen="islamic"><div class="hp-top"><span class="hp-dotlogo">📚</span><div><b>Islamic Library</b><span>Hadith • adhkar • dua • media</span></div></div><div class="hp-body"><div class="hp-library-grid"><div class="hp-lib-card wide"><i>📜</i><b>حديث مختار</b><span>نص موثق مع المصدر وإضافة مباشرة للتصميم.</span></div><div class="hp-lib-card"><i>📿</i><b>أذكار</b><span>محتوى جاهز للريلز.</span></div><div class="hp-lib-card"><i>🤲</i><b>أدعية</b><span>تصميم وصوت وخلفية.</span></div><div class="hp-lib-card"><i>🎬</i><b>كليبات</b><span>بحث فيديوهات متعددة.</span></div><div class="hp-lib-card"><i>✨</i><b>Animation</b><span>ملصقات وحركة.</span></div></div></div></section>`
  };

  function buildPhone() {
    const phone = document.querySelector(".home-phone");
    if (!phone || phone.dataset.premiumReady === "1") return false;
    phone.dataset.premiumReady = "1";
    phone.innerHTML = `<div class="hp-shell"><div class="hp-status"><strong>Reels Maker AI</strong><span>LIVE DEMO</span></div><div class="hp-live">● LIVE PRODUCT PREVIEW</div><div class="hp-content">${screens.story()}${screens.quran()}${screens.editor()}${screens.islamic()}</div><div class="hp-dots"><i class="hp-dot" data-dot="story"></i><i class="hp-dot" data-dot="quran"></i><i class="hp-dot" data-dot="editor"></i><i class="hp-dot" data-dot="islamic"></i></div></div>`;
    phone.addEventListener("click", () => {
      const target = document.querySelector(`[data-home-action="${active}"]`);
      target?.click();
    });
    show("story", false);
    return true;
  }

  function show(name, animate = true) {
    if (!screens[name] || name === active && document.querySelector(`.hp-screen[data-hp-screen="${name}"].active`)) return;
    const current = document.querySelector(".hp-screen.active");
    if (current && animate) {
      current.classList.remove("active");
      current.classList.add("exit-left");
      setTimeout(() => current.classList.remove("exit-left"), 560);
    } else current?.classList.remove("active");
    const next = document.querySelector(`.hp-screen[data-hp-screen="${name}"]`);
    next?.classList.add("active");
    active = name;
    document.querySelectorAll(".hp-dot").forEach(d => d.classList.toggle("active", d.dataset.dot === name));
  }

  function schedule() {
    clearInterval(timer);
    const keys = Object.keys(screens);
    timer = setInterval(() => {
      const options = keys.filter(k => k !== active);
      show(options[Math.floor(Math.random() * options.length)] || "story");
    }, 4300);
  }

  function bindToolHover() {
    const map = { story: "story", quran: "quran", islamic: "islamic", editor: "editor" };
    document.querySelectorAll(".home-tool[data-home-action],.home-cta [data-home-action]").forEach(el => {
      const view = map[el.dataset.homeAction];
      if (!view) return;
      el.addEventListener("mouseenter", () => show(view));
      el.addEventListener("focus", () => show(view));
    });
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyles();
    const wait = () => {
      if (!buildPhone()) return setTimeout(wait, 120);
      bindToolHover();
      schedule();
    };
    wait();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install);
  else install();
})();
