import baseWorker from "./worker-mobile-v19-ai-suite.js";

async function patchHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(!html.includes("ai-menu-v20.css"))html=html.replace("</head>",'<link rel="stylesheet" href="/ai-menu-v20.css?v=1"></head>');
  if(!html.includes("ai-menu-v20.js"))html=html.replace("</body>",'<script src="/ai-menu-v20.js?v=1"></script></body>');
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-build","v20-ai-menu");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){return patchHtml(await baseWorker.fetch(request,env,ctx))}};
