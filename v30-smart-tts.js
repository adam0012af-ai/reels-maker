import {ttsApi as baseTtsApi} from "./v24-media-api.js";
import {ttsApiResilient} from "./v29-tts-resilient.js";
import {elevenVoicesApi,elevenTtsApi} from "./v25-elevenlabs-api.js";

function quotaLike(status,text){
  const s=String(text||"").toLowerCase();
  return status===429||status===503||s.includes('quota')||s.includes('resource_exhausted')||s.includes('rate limit')||s.includes('too many requests');
}

async function fallbackEleven(original,env){
  if(!env.ELEVENLABS_API_KEY)return null;
  try{
    let body={};try{body=await original.clone().json()}catch{}
    const text=String(body.text||'').trim();if(!text)return null;
    const vr=await elevenVoicesApi(env),vj=await vr.json().catch(()=>({}));
    if(!vr.ok||!Array.isArray(vj.voices)||!vj.voices.length)return null;
    const preferred=String(body.gender||'').toLowerCase();
    const voice=(preferred&&vj.voices.find(v=>String(v.gender||'').toLowerCase()===preferred))||vj.voices.find(v=>v.id)||vj.voices[0];
    const req=new Request('https://reels-maker.internal/api/tts/elevenlabs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,voiceId:voice.id,model:'eleven_multilingual_v2',stability:.45,similarity:.78,styleValue:.2})});
    const r=await elevenTtsApi(req,env);if(!r.ok)return null;
    const h=new Headers(r.headers);h.set('x-rm-fallback','1');h.set('x-rm-fallback-reason','gemini-quota');return new Response(r.body,{status:200,headers:h});
  }catch{return null}
}

export async function ttsApiSmart(request,env){
  const original=request.clone();
  const primary=await baseTtsApi(request.clone(),env);
  if(primary.ok)return primary;
  let errText='';try{errText=await primary.clone().text()}catch{}
  if(!quotaLike(primary.status,errText))return primary;

  const fallback=await fallbackEleven(original,env);
  if(fallback)return fallback;

  return ttsApiResilient(original,env);
}
