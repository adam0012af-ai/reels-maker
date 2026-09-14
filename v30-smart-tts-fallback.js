import {ttsApiResilient} from "./v29-tts-resilient.js";
import {elevenTtsApi} from "./v25-elevenlabs-api.js";

const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

async function firstElevenVoice(env){
  if(!env.ELEVENLABS_API_KEY)return "";
  try{
    const r=await fetch("https://api.elevenlabs.io/v2/voices?page_size=20&include_total_count=false",{headers:{"xi-api-key":env.ELEVENLABS_API_KEY}});
    if(!r.ok)return "";
    const d=await r.json().catch(()=>({}));
    return String(d?.voices?.[0]?.voice_id||"");
  }catch{return ""}
}

function retryable(status,text){
  const s=String(text||"").toLowerCase();
  return status===429||status===503||s.includes("quota")||s.includes("resource_exhausted")||s.includes("rate limit")||s.includes("too many requests");
}

export async function ttsApiSmart(request,env){
  const clone=request.clone();
  const primary=await ttsApiResilient(clone,env);
  if(primary.ok)return primary;

  let errText="";
  try{errText=await primary.clone().text()}catch{}
  if(!retryable(primary.status,errText)||!env.ELEVENLABS_API_KEY)return primary;

  let body={};
  try{body=await request.clone().json()}catch{}
  const voiceId=await firstElevenVoice(env);
  if(!voiceId)return primary;

  const fallbackBody={
    text:String(body.text||""),
    voiceId,
    model:"eleven_multilingual_v2",
    stability:.45,
    similarity:.78,
    styleValue:.2
  };
  const fallbackReq=new Request(request.url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(fallbackBody)});
  const secondary=await elevenTtsApi(fallbackReq,env);
  if(secondary.ok){
    const h=new Headers(secondary.headers);
    h.set("x-rm-fallback","elevenlabs");
    return new Response(secondary.body,{status:secondary.status,headers:h});
  }
  let e2="";try{e2=await secondary.clone().text()}catch{}
  return json({error:"خدمة الصوت مزدحمة مؤقتًا. جرّب بعد قليل أو اختر صوتًا آخر.",primary:errText.slice(0,300),fallback:e2.slice(0,300)},503);
}
