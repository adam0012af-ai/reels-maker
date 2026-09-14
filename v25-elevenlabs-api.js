import {dedupe} from "./v21-story-api.js";

const API="https://api.elevenlabs.io";
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,max=6000)=>String(v||"").trim().slice(0,max);

function normalizeVoice(v){
  const labels=v?.labels||{};
  const verified=Array.isArray(v?.verified_languages)?v.verified_languages:[];
  const ar=verified.find(x=>String(x?.language||"").toLowerCase()==="ar")||verified[0]||{};
  return{
    id:String(v?.voice_id||""),
    name:String(v?.name||"Voice"),
    gender:String(labels.gender||v?.gender||"neutral").toLowerCase(),
    accent:String(labels.accent||ar.accent||v?.accent||"").trim(),
    language:String(ar.language||labels.language||v?.language||"").trim(),
    locale:String(ar.locale||v?.locale||"").trim(),
    description:String(v?.description||labels.description||"").trim(),
    category:String(v?.category||""),
    previewUrl:String(ar.preview_url||v?.preview_url||"")
  };
}

async function elevenFetch(env,path,init={}){
  if(!env.ELEVENLABS_API_KEY)throw new Error("ELEVENLABS_API_KEY is not configured");
  const headers=new Headers(init.headers||{});
  headers.set("xi-api-key",env.ELEVENLABS_API_KEY);
  const r=await fetch(`${API}${path}`,{...init,headers});
  return r;
}

export async function elevenVoicesApi(env){
  if(!env.ELEVENLABS_API_KEY)return json({error:"ELEVENLABS_API_KEY is not configured"},503);
  try{
    const r=await elevenFetch(env,"/v2/voices?page_size=100&include_total_count=false");
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return json({error:data?.detail?.message||data?.detail||data?.message||`ElevenLabs voices failed (${r.status})`},r.status);
    const voices=(Array.isArray(data?.voices)?data.voices:[]).map(normalizeVoice).filter(v=>v.id);
    return json({provider:"elevenlabs",voices,count:voices.length,hasMore:!!data?.has_more,nextPageToken:data?.next_page_token||null});
  }catch(e){return json({error:String(e?.message||e)},502)}
}

export async function elevenTtsApi(request,env){
  if(!env.ELEVENLABS_API_KEY)return json({error:"ELEVENLABS_API_KEY is not configured"},503);
  let b={};try{b=await request.json()}catch{}
  const text=dedupe(clean(b.text));
  const voiceId=clean(b.voiceId||b.voice,120);
  if(!text)return json({error:"Missing text."},400);
  if(!voiceId)return json({error:"Missing ElevenLabs voice ID."},400);
  const model=clean(b.model,80)||"eleven_multilingual_v2";
  const body={
    text,
    model_id:model,
    voice_settings:{
      stability:Number.isFinite(Number(b.stability))?Math.max(0,Math.min(1,Number(b.stability))):0.45,
      similarity_boost:Number.isFinite(Number(b.similarity))?Math.max(0,Math.min(1,Number(b.similarity))):0.78,
      style:Number.isFinite(Number(b.styleValue))?Math.max(0,Math.min(1,Number(b.styleValue))):0.25,
      use_speaker_boost:true
    }
  };
  try{
    const r=await elevenFetch(env,`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,{
      method:"POST",
      headers:{"content-type":"application/json","accept":"audio/mpeg"},
      body:JSON.stringify(body)
    });
    if(!r.ok){const data=await r.json().catch(()=>({}));return json({error:data?.detail?.message||data?.detail||data?.message||`ElevenLabs TTS failed (${r.status})`},r.status)}
    const h=new Headers({"content-type":r.headers.get("content-type")||"audio/mpeg","cache-control":"no-store","content-disposition":`inline; filename="elevenlabs-${voiceId}.mp3"`,"x-rm-provider":"elevenlabs","x-rm-voice-id":voiceId,"x-rm-model":model});
    return new Response(r.body,{status:200,headers:h});
  }catch(e){return json({error:String(e?.message||e)},502)}
}
