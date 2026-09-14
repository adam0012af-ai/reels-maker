import {ttsApi as baseTtsApi} from "./v24-media-api.js";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...h}});
function retryMsFrom(text,attempt){
  const s=String(text||"");
  const m=s.match(/retry\s+(?:in|after)\s*([0-9.]+)\s*s/i)||s.match(/retryDelay[^0-9]*([0-9.]+)\s*s/i);
  const parsed=m?Math.ceil(Number(m[1])*1000)+500:0;
  return Math.max(2500,Math.min(15000,parsed||((attempt+1)*6000)));
}
function retriable(status,text){
  const s=String(text||"").toLowerCase();
  return status===429||status===503||s.includes('quota')||s.includes('resource_exhausted')||s.includes('rate limit')||s.includes('too many requests');
}

export async function ttsApiResilient(request,env){
  let lastText='',lastStatus=502;
  for(let attempt=0;attempt<3;attempt++){
    const response=await baseTtsApi(request.clone(),env);
    if(response.ok)return response;
    let text='';
    try{text=await response.clone().text()}catch{}
    lastText=text;lastStatus=response.status;
    const canRetry=retriable(response.status,text);
    if(!canRetry)return response;
    if(attempt<2)await sleep(retryMsFrom(text,attempt));
  }
  return json({error:'خدمة الصوت وصلت للحد المؤقت الآن. النظام حاول تلقائيًا أكثر من مرة. انتظر قليلًا ثم أعد إنشاء الفيديو، أو اختر صوتًا آخر من القائمة.',code:'TTS_TEMPORARY_QUOTA',details:lastText.slice(0,300)},lastStatus===429?429:503,{"retry-after":"15"});
}
