import baseWorker from "./worker-v14.js";

function stripConflicts(html){
  return html
    .replace(/<style[^>]+id=["']rmV8BootStyle["'][^>]*>[\s\S]*?<\/style>/gi,"")
    .replace(/<script[^>]+id=["']rmV8Boot["'][^>]*>[\s\S]*?<\/script>/gi,"")
    .replace(/<script[^>]*>[\s\S]*?window\.__RM_BOOT_ROUTE__[\s\S]*?<\/script>/gi,"")
    .replace(/<script[^>]+route-state-v1\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<script[^>]+route-boot-v8\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<script[^>]+route-native-v9\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<script[^>]+route-native-v10\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<script[^>]+mobile-editor-v3\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<script[^>]+mobile-editor-v4\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<link[^>]+mobile-final-v5\.css(?:\?[^"']*)?["'][^>]*>/gi,"")
    .replace(/<link[^>]+mobile-editor-v3\.css(?:\?[^"']*)?["'][^>]*>/gi,"")
    .replace(/<link[^>]+mobile-stable-v10\.css(?:\?[^"']*)?["'][^>]*>/gi,"");
}

function injectStableBoot(html){
  const boot=`<style id="rmStableBootStyle">
    html.rm-stable-boot,html.rm-stable-boot body{margin:0!important;min-height:100%!important;background:#070b12!important}
    html.rm-stable-boot body>*:not(#rmStableBoot){visibility:hidden!important}
    #rmStableBoot{visibility:visible!important;position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 50% 42%,rgba(111,124,255,.14),transparent 32%),#070b12;font-family:Cairo,Tajawal,system-ui,sans-serif;color:#f7f9fc}
    #rmStableBoot .rmb-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 26px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(13,19,29,.88);box-shadow:0 22px 70px rgba(0,0,0,.25);backdrop-filter:blur(14px)}
    #rmStableBoot .rmb-logo{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#6574ff,#8a64ee);font:900 19px Montserrat,system-ui,sans-serif;color:#fff}
    #rmStableBoot b{font-size:13px}#rmStableBoot span{font-size:8px;color:#8e9aae}
    #rmStableBoot i{width:30px;height:3px;border-radius:99px;background:linear-gradient(90deg,#6674ef,#8d62ef);animation:rmb 1s ease-in-out infinite alternate}
    @keyframes rmb{from{transform:scaleX(.35);opacity:.55}to{transform:scaleX(1);opacity:1}}
    html[data-rm-boot-theme="gold"] #rmStableBoot{background:radial-gradient(circle at 50% 42%,rgba(214,168,74,.17),transparent 32%),#f3ede2;color:#2a2115}
    html[data-rm-boot-theme="gold"] #rmStableBoot .rmb-card{background:rgba(255,253,248,.94);border-color:rgba(139,102,38,.14);box-shadow:0 22px 70px rgba(87,61,17,.10)}
    html[data-rm-boot-theme="gold"] #rmStableBoot span{color:#786b58}
  </style><script id="rmStableBootInit">(()=>{const valid=new Set(['home','quran','video','images','audio','text','stickers','layers','settings']);let route='';try{route=decodeURIComponent((location.hash||'').replace(/^#\\/?/,'').split('?')[0])}catch(e){}if(!valid.has(route))route='home';window.__RM_MODERN_MOBILE__=true;window.__RM_SINGLE_ROUTER__=true;window.__RM_DISABLE_LEGACY_PREMIUM_ROUTER__=true;window.__RM_ROUTE_STATE_INSTALLED__=true;window.__RM_BOOT_ROUTE__=route;document.documentElement.dataset.rmBootRoute=route;try{document.documentElement.dataset.rmBootTheme=localStorage.getItem('reels-shell-theme')==='gold'?'gold':'dark'}catch(e){}document.documentElement.classList.add('rm-stable-boot')})();</script>`;

  if(!html.includes('id="rmStableBootStyle"')){
    const charset=/<meta\s+charset=["']?utf-8["']?\s*\/?\s*>/i;
    if(charset.test(html)) html=html.replace(charset,m=>m+boot);
    else html=html.replace(/<head([^>]*)>/i,`<head$1><meta charset="UTF-8">${boot}`);
  }

  const overlay='<div id="rmStableBoot" role="status" aria-live="polite"><div class="rmb-card"><div class="rmb-logo">R</div><b>Reels Maker AI</b><span>جاري تجهيز القسم المطلوب…</span><i></i></div></div>';
  if(!html.includes('id="rmStableBoot"')) html=html.replace(/<body([^>]*)>/i,`<body$1>${overlay}`);
  return html;
}

function injectStableAssets(html){
  html=html.replace("</head>",'<link rel="stylesheet" href="mobile-stable-v10.css?v=2"><style id="rmMobileFlowV102">@media(max-width:1000px){body.rm-shell-v2.rm-mobile-player .workspace{flex:0 0 auto!important;min-height:0!important;height:auto!important}body.rm-shell-v2.rm-mobile-player .stage-wrap{flex:0 0 auto!important;min-height:0!important;height:auto!important}body.rm-shell-v2.rm-mobile-player .transport{flex:0 0 48px!important}body.rm-shell-v2.rm-mobile-player .controls{flex:0 0 auto!important;margin-top:0!important}}</style></head>');
  const guard=`<script id="rmBootRouteGuard">(()=>{const getRoute=()=>{let r='';try{r=decodeURIComponent((location.hash||'').replace(/^#\\/?/,'').split('?')[0])}catch(e){}return r||'home'};const hideWrongHome=()=>{if(getRoute()==='home')return;const h=document.getElementById('transparentHome');const hs=document.getElementById('homeShell');[h,hs].forEach(x=>{if(!x)return;x.classList.remove('open');x.setAttribute?.('aria-hidden','true')});document.body?.classList.remove('th-home-open','home-mode');if(document.body)document.body.style.overflow=''};const mo=new MutationObserver(hideWrongHome);mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});hideWrongHome();requestAnimationFrame(()=>{hideWrongHome();requestAnimationFrame(hideWrongHome)});setTimeout(hideWrongHome,80);setTimeout(hideWrongHome,180);setTimeout(hideWrongHome,400);setTimeout(()=>mo.disconnect(),5000)})();</script>`;
  html=html.replace("</body>",'<script src="route-native-v10.js?v=2"></script>'+guard+'</body>');
  return html;
}

async function patchCoreScript(response){
  let js=await response.text();
  const oldActivate='if (innerWidth <= 900) openMobilePanel(name);';
  const newActivate='if (innerWidth <= 900 && !window.__RM_MODERN_MOBILE__) openMobilePanel(name);';
  if(js.includes(oldActivate)) js=js.replace(oldActivate,newActivate);

  const oldSync='function syncResponsivePanels() {\n  if (innerWidth > 900) {';
  const newSync='function syncResponsivePanels() {\n  if (window.__RM_MODERN_MOBILE__) {\n    if (state.mobilePanel && desktopPanels) desktopPanels.appendChild(state.mobilePanel);\n    state.mobilePanel = null;\n    mobileSheet?.classList.remove("open");\n    return;\n  }\n  if (innerWidth > 900) {';
  if(js.includes(oldSync)) js=js.replace(oldSync,newSync);

  const headers=new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type","application/javascript; charset=utf-8");
  headers.set("cache-control","no-store, no-cache, must-revalidate");
  headers.set("x-rm-mobile-runtime","v10.2");
  return new Response(js,{status:response.status,statusText:response.statusText,headers});
}

async function injectV15(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html")) return response;

  let html=stripConflicts(await response.text());
  html=injectStableBoot(html);
  html=injectStableAssets(html);

  const headers=new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type","text/html; charset=utf-8");
  headers.set("cache-control","no-store, no-cache, must-revalidate");
  headers.set("pragma","no-cache");
  headers.set("expires","0");
  headers.set("x-rm-runtime","stable-v10.2");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await baseWorker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(url.pathname==="/script.js") return patchCoreScript(response);
    return injectV15(response);
  }
};
