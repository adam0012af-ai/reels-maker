import baseWorker from "./worker-mobile-test.js";
import {generateV13} from "./auto-api-v13.js";

async function patchEditorBridge(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("javascript"))return response;
  let js=await response.text();
  if(!js.includes("window.ReelsEditorBridge"))js+='\n;window.ReelsEditorBridge={loadVideoBlob:(blob,name)=>loadVideoBlob(blob,name||"المحتوى التلقائي"),loadAudioBlob:(blob,name)=>loadAudioBlob(blob,name||"التعليق الصوتي"),activateTab:(name)=>activateTab(name)};\n';
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","application/javascript; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-editor-bridge","v13");
  return new Response(js,{status:response.status,statusText:response.statusText,headers:h});
}

async function patchHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  html=html.replace(/mobile-auto-ui-v12\.js\?v=1/g,"mobile-auto-ui-v13.js?v=1").replace(/mobile-auto-ui\.css\?v=12/g,"mobile-auto-ui.css?v=13");
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-mobile-auto","test-v13");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==="/api/autocontent/generate"&&request.method==="POST")return generateV13(request,env);
  const response=await baseWorker.fetch(request,env,ctx);
  if(url.pathname==="/script.js")return patchEditorBridge(response);
  return patchHtml(response);
}};
