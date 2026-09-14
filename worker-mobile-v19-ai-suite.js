import baseWorker from "./worker-mobile-v18-fixes.js";

async function patchHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(!html.includes("ai-suite-v19.css"))html=html.replace("</head>",'<link rel="stylesheet" href="/ai-suite-v19.css?v=1"></head>');
  if(!html.includes("ai-suite-v19.js"))html=html.replace("</body>",'<script src="/ai-suite-v19.js?v=1"></script></body>');
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-build","v19-separated-ai-suite");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){
  const response=await baseWorker.fetch(request,env,ctx);
  return patchHtml(response);
}};
