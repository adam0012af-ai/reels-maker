import {ttsApi as baseTtsApi} from "./v24-media-api.js";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
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
  let last=null;
  for(let attempt=0;attempt<3;attempt++){
    const response=await baseTtsApi(request.clone(),env);
    if(response.ok)return response;
    let text='';
    try{text=await response.clone().text()}catch{}
    last=response;
    if(!retriable(response.status,text)||attempt===2)return response;
    await sleep(retryMsFrom(text,attempt));
  }
  return last||new Response(JSON.stringify({error:'TTS failed'}),{status:502,headers:{'content-type':'application/json; charset=utf-8'}});
}
