import {ttsApiResilient} from "./v29-tts-resilient.js";
import {elevenVoicesApi,elevenTtsApi} from "./v25-elevenlabs-api.js";

function quotaLike(status,text){
  const s=String(text||"").toLowerCase();
  return status===429||status===503||s.includes('quota')||s.includes('resource_exhausted')||s.includes('rate limit')||s.includes('too many requests');
}

export async function ttsApiSmart(request,env){
  const original=request.clone();
  const primary=await ttsApiResilient(request,env);
  if(primary.ok)return primary;
  let errText='';
  try{errText=await primary.clone().text()}catch{}
  if(!quotaLike(primary.status,errText)||!env.ELEVENLABS_API_KEY)return primary;
  try{
    let body={};try{body=await original.json()}catch{}
    const text=String(body.text||'').trim();
    if(!text)return primary;
    const vr=await elevenVoicesApi(env),vj=await vr.json().catch(()=>({}));
    if(!vr.ok||!Array.isArray(vj.voices)||!vj.voices.length)return primary;
    const voice=vj.voices.find(v=>v.id)||vj.voices[0];
    const fallbackRequest=new Request('https://reels-maker.internal/api/tts/elevenlabs',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,voiceId:voice.id,model:'eleven_multilingual_v2'})
    });
    const fallback=await elevenTtsApi(fallbackRequest,env);
    if(!fallback.ok)return primary;
    const headers=new Headers(fallback.headers);
    headers.set('x-rm-fallback','1');
    headers.set('x-rm-fallback-reason','gemini-quota');
    return new Response(fallback.body,{status:200,headers});
  }catch{return primary}
}
