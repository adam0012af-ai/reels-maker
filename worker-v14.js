import baseWorker from "./worker-v13.js";

function stripLegacyRouters(html){
  return html
    .replace(/<script[^>]+premium-plus-v1\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<script[^>]+premium-plus-v2\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"");
}

async function injectV14(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;

  let html=stripLegacyRouters(await response.text());

  const earlyBoot=`<style id="rmV8BootStyle">html.rm-v8-boot,html.rm-v8-boot body{background:#070b12!important}html.rm-v8-boot body>*{visibility:hidden!important}</style><script id="rmV8Boot">document.documentElement.classList.add('rm-v8-boot');window.__RM_DISABLE_LEGACY_PREMIUM_ROUTER__=true;try{localStorage.removeItem('reelsMaker.route.v2')}catch(e){}</script>`;
  if(!html.includes('id="rmV8Boot"'))html=html.replace("<head>",`<head>${earlyBoot}`);

  html=html.replace(/mobile-editor-v4\.css\?v=\d+/g,"mobile-editor-v4.css?v=1");
  html=html.replace(/mobile-editor-v4\.js\?v=\d+/g,"mobile-editor-v4.js?v=1");
  html=html.replace(/route-boot-v8\.js\?v=\d+/g,"route-boot-v8.js?v=1");

  if(!html.includes("mobile-editor-v4.css"))html=html.replace("</head>",'<link rel="stylesheet" href="mobile-editor-v4.css?v=1"></head>');
  if(!html.includes("mobile-editor-v4.js"))html=html.replace("</body>",'<script src="mobile-editor-v4.js?v=1"></script></body>');
  if(!html.includes("route-boot-v8.js"))html=html.replace("</body>",'<script src="route-boot-v8.js?v=1"></script></body>');

  const headers=new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control","no-store, no-cache, must-revalidate");
  headers.set("pragma","no-cache");
  headers.set("expires","0");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await baseWorker.fetch(request,env,ctx);
    return injectV14(response);
  }
};
