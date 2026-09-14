import baseWorker from "./worker-mobile-v17-aihub.js";
import {generateV18,dedupeNarration} from "./auto-api-v18.js";

async function cleanTtsRequest(request){
  let body={};try{body=await request.clone().json()}catch{return request}
  const original=String(body.text||"");
  if(!original)return request;
  body.text=dedupeNarration(original);
  const headers=new Headers(request.headers);headers.set("content-type","application/json");headers.delete("content-length");
  return new Request(request.url,{method:"POST",headers,body:JSON.stringify(body)});
}

async function patchHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  html=html.replace(/ai-toolbox-v1\.js\?v=1/g,"ai-toolbox-v2.js?v=2");
  if(!html.includes("ai-toolbox-v2.js"))html=html.replace("</body>",'<script src="/ai-toolbox-v2.js?v=2"></script></body>');
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-build","v18-story-toolbox-fix");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==="/api/autocontent/generate"&&request.method==="POST")return generateV18(request,env);
  if(url.pathname==="/api/tts"&&request.method==="POST")request=await cleanTtsRequest(request);
  return patchHtml(await baseWorker.fetch(request,env,ctx));
}};
