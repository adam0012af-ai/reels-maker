import baseWorker from "./worker-v14.js";

function stripOldRouteScripts(html){
  return html
    .replace(/<script[^>]+route-state-v1\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"")
    .replace(/<script[^>]+route-boot-v8\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"");
}

async function injectV15(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html")) return response;

  let html=stripOldRouteScripts(await response.text());

  html=html.replace(/mobile-final-v5\.css\?v=\d+/g,"mobile-final-v5.css?v=1");
  html=html.replace(/route-native-v9\.js\?v=\d+/g,"route-native-v9.js?v=1");

  if(!html.includes("mobile-final-v5.css")){
    html=html.replace("</head>",'<link rel="stylesheet" href="mobile-final-v5.css?v=1"></head>');
  }
  if(!html.includes("route-native-v9.js")){
    html=html.replace("</body>",'<script src="route-native-v9.js?v=1"></script></body>');
  }

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
    return injectV15(response);
  }
};
