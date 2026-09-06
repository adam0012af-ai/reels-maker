"use strict";

(() => {
  const qid = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];
  let installed = false;

  const ROUTES = [
    ["home","⌂","الرئيسية","نظرة عامة على المنصة"],
    ["projects","▦","مشاريعي","الحفظ التلقائي وملفات العمل"],
    ["story","▤","قصة مع فيديو","Storyboard + صوت + Review"],
    ["images","◇","استوديو الصور AI","توليد وتعديل صور بالذكاء الاصطناعي","NEW"],
    ["quran","☪","استوديو القرآن","آيات + قارئ + خلفيات"],
    ["islamic","◈","المحتوى الإسلامي","أحاديث وأذكار وأدعية"],
    ["editor","✂","محرر ومونتاج الفيديو","Layers + Audio + Export"]
  ];

  function currentRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (ROUTES.some(x => x[0] === hash)) return hash;
    return localStorage.getItem("reelsMaker.route.v2") || "home";
  }

  function markRoute(route) {
    if (route === "images") {
      try { history.pushState({rmRoute:"images"}, "", "#images"); } catch { location.hash = "images"; }
    }
    qsa("#rmPlusNavV2 [data-rmx-route]").forEach(b => b.classList.toggle("active", b.dataset.rmxRoute === route));
  }

  function hiddenRoute(route) {
    const old = qs(`#rmPlusNav [data-rmplus-route="${route}"]`);
    if (old) { old.click(); return true; }
    return false;
  }

  function navigate(route) {
    qid("creatorDrawerClose")?.click();
    if (route === "projects") {
      window.ReelsProjectsV2?.open?.();
      markRoute("projects");
      return;
    }
    if (route === "images") {
      window.ReelsImageStudio?.open?.();
      markRoute("images");
      return;
    }
    if (hiddenRoute(route)) { setTimeout(() => markRoute(route), 20); return; }
    if (route === "home") {
      document.body.classList.add("home-mode");
      qid("homeShell")?.classList.add("open");
      localStorage.setItem("reelsMaker.route.v2", "home");
      try { history.pushState({rmRoute:"home"}, "", "#home"); } catch {}
      markRoute("home");
    }
  }

  function suppressLegacyDrawer() {
    const drawer = qs(".creator-drawer");
    if (!drawer) return false;
    const oldNav = qid("rmPlusNav");
    if (oldNav) oldNav.style.setProperty("display", "none", "important");
    qsa(".creator-drawer > .creator-nav-btn,.creator-drawer > [data-home-drawer],.creator-drawer > [data-rm-projects]").forEach(el => el.style.setProperty("display", "none", "important"));
    return true;
  }

  function buildDrawer() {
    const drawer = qs(".creator-drawer");
    if (!drawer) return false;
    suppressLegacyDrawer();
    let nav = qid("rmPlusNavV2");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "rmPlusNavV2";
      ROUTES.forEach(([route, icon, label, sub, badge]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "rmx-nav-btn";
        b.dataset.rmxRoute = route;
        b.innerHTML = `<span class="rmx-nav-icon">${icon}</span><span class="rmx-nav-copy"><b>${label}</b><span>${sub}</span></span>${badge ? `<em class="rmx-nav-new">${badge}</em>` : ""}`;
        b.addEventListener("click", () => navigate(route));
        nav.appendChild(b);
      });
      drawer.querySelector(".creator-drawer-head")?.insertAdjacentElement("afterend", nav);
    }
    markRoute(currentRoute());
    return true;
  }

  function cleanTop() {
    qid("rmProjectsHomeBtn")?.remove();
    qid("ssHomeReturn")?.remove();
    qsa(".home-header-actions button").forEach(btn => {
      if (!(btn.textContent || "").includes("الأقسام")) btn.remove();
    });
  }

  function addCredit() {
    const foot = qs(".rmplus-footer");
    if (!foot || foot.querySelector(".rmx-dev-credit")) return;
    const credit = document.createElement("span");
    credit.className = "rmx-dev-credit";
    credit.innerHTML = '<i></i><span>Programming &amp; Development — Adam</span>';
    foot.appendChild(credit);
  }

  function keepClean() {
    buildDrawer();
    suppressLegacyDrawer();
    cleanTop();
    addCredit();
    setTimeout(keepClean, 700);
  }

  function restoreSpecialRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (hash === "projects") {
      setTimeout(() => { window.ReelsProjectsV2?.open?.(false); markRoute("projects"); document.documentElement.classList.remove("rm-route-booting"); }, 320);
    } else if (hash === "images") {
      setTimeout(() => { window.ReelsImageStudio?.open?.(false); markRoute("images"); document.documentElement.classList.remove("rm-route-booting"); }, 360);
    }
  }

  function install() {
    if (installed) return;
    installed = true;
    keepClean();
    restoreSpecialRoute();
    window.addEventListener("popstate", () => setTimeout(() => {
      const r = currentRoute();
      if (r === "projects") window.ReelsProjectsV2?.open?.(false);
      if (r === "images") window.ReelsImageStudio?.open?.(false);
      markRoute(r);
    }, 80));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
