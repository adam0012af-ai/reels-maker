import baseWorker from "./worker-mobile-v13.js";

async function patchHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  html=html.replace(/mobile-auto-ui-v13\.js\?v=1/g,"mobile-auto-ui-v14.js?v=1").replace(/mobile-auto-ui\.css\?v=13/g,"mobile-auto-ui.css?v=14");
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-mobile-auto","test-v14");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){
  const response=await baseWorker.fetch(request,env,ctx);
  return patchHtml(response);
}};
