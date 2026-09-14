import {dedupe} from "./v21-story-api.js";

const API="https://api.elevenlabs.io";
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,max=6000)=>String(v||"").trim().slice(0,max);
const blockedVoiceIds=new Set();

function categoryOf(v){return String(v?.category||"").trim().toLowerCase()}
function tiersOf(v){return Array.isArray(v?.available_for_tiers)?v.available_for_tiers.map(x=>String(x||"").toLowerCase()):[]}
function isLibraryVoice(v){
  const s=v?.sharing||{};
  return !!(
    s?.enabled_in_library ||
    s?.public_owner_id ||
    s?.original_voice_id ||
    (String(s?.status||"").toLowerCase()==="enabled" && String(s?.category||"").toLowerCase()==="professional")
  );
}
function isFreeApiVoice(v){
  const id=String(v?.voice_id||"");
  if(!id||blockedVoiceIds.has(id))return false;
  if(isLibraryVoice(v))return false;
  const tiers=tiersOf(v);
  if(tiers.length && !tiers.includes("free"))return false;
  // Professional voice clones require a paid plan and are never part of the
  // free API catalog we expose in Reels Maker.
  if(categoryOf(v)==="professional")return false;
  return true;
}
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
  return fetch(`${API}${path}`,{...init,headers});
}
async function fetchVoiceType(env,type){
  const r=await elevenFetch(env,`/v2/voices?page_size=100&include_total_count=false&voice_type=${encodeURIComponent(type)}`);
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data?.detail?.message||data?.detail||data?.message||`ElevenLabs voices failed (${r.status})`);
  return Array.isArray(data?.voices)?data.voices:[];
}
async function listFreeVoicesRaw(env){
  // "default" = ElevenLabs default voices. "non-community" = the account's
  // own/workspace voices, excluding Voice Library/community copies.
  const results=await Promise.allSettled([fetchVoiceType(env,"default"),fetchVoiceType(env,"non-community")]);
  const all=[];
  for(const r of results)if(r.status==="fulfilled")all.push(...r.value);
  if(!all.length){
    const reason=results.find(r=>r.status==="rejected");
    if(reason)throw reason.reason;
  }
  const seen=new Set();
  return all.filter(v=>{
    const id=String(v?.voice_id||"");
    if(!id||seen.has(id)||!isFreeApiVoice(v))return false;
    seen.add(id);return true;
  });
}
function freeLibraryError(status,data){
  const s=String(data?.detail?.message||data?.detail||data?.message||"").toLowerCase();
  return status===403||s.includes("free users cannot use library voices")||s.includes("voice is not available for free users")||s.includes("upgrade your subscription to use this voice");
}

export async function elevenVoicesApi(env){
  if(!env.ELEVENLABS_API_KEY)return json({error:"ELEVENLABS_API_KEY is not configured"},503);
  try{
    const raw=await listFreeVoicesRaw(env);
    const voices=raw.map(normalizeVoice).filter(v=>v.id);
    return json({provider:"elevenlabs",plan:"free",freeOnly:true,voices,count:voices.length,hasMore:false,nextPageToken:null});
  }catch(e){return json({error:String(e?.message||e)},502)}
}

async function synthesize(env,voiceId,body){
  return elevenFetch(env,`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,{
    method:"POST",headers:{"content-type":"application/json","accept":"audio/mpeg"},body:JSON.stringify(body)
  });
}

export async function elevenTtsApi(request,env){
  if(!env.ELEVENLABS_API_KEY)return json({error:"ELEVENLABS_API_KEY is not configured"},503);
  let b={};try{b=await request.json()}catch{}
  const text=dedupe(clean(b.text));
  let voiceId=clean(b.voiceId||b.voice,120);
  if(!text)return json({error:"Missing text."},400);
  if(!voiceId)return json({error:"Missing ElevenLabs voice ID."},400);
  const model=clean(b.model,80)||"eleven_multilingual_v2";
  const body={text,model_id:model,voice_settings:{
    stability:Number.isFinite(Number(b.stability))?Math.max(0,Math.min(1,Number(b.stability))):0.45,
    similarity_boost:Number.isFinite(Number(b.similarity))?Math.max(0,Math.min(1,Number(b.similarity))):0.78,
    style:Number.isFinite(Number(b.styleValue))?Math.max(0,Math.min(1,Number(b.styleValue))):0.25,
    use_speaker_boost:true
  }};
  try{
    // Reject stale/old paid-library selections before spending a generation call.
    const freeVoices=await listFreeVoicesRaw(env);
    const allowed=new Set(freeVoices.map(v=>String(v?.voice_id||"")));
    if(!allowed.has(voiceId)){
      if(!freeVoices.length)return json({error:"لا توجد أصوات ElevenLabs مجانية متاحة عبر API على هذا الحساب الآن."},503);
      voiceId=String(freeVoices[0].voice_id||"");
    }

    let r=await synthesize(env,voiceId,body),fallbackUsed=false;
    if(!r.ok){
      const data=await r.clone().json().catch(()=>({}));
      if(freeLibraryError(r.status,data)){
        blockedVoiceIds.add(voiceId);
        const safe=(await listFreeVoicesRaw(env).catch(()=>[])).filter(v=>String(v?.voice_id||"")!==voiceId);
        if(safe.length){voiceId=String(safe[0].voice_id||"");r=await synthesize(env,voiceId,body);fallbackUsed=r.ok}
        if(!r.ok)return json({error:"هذا الصوت غير متاح ضمن الخطة المجانية وتم حذفه من قائمة الأصوات. اختر صوتًا آخر."},403);
      }else return json({error:data?.detail?.message||data?.detail||data?.message||`ElevenLabs TTS failed (${r.status})`},r.status);
    }
    const h=new Headers({"content-type":r.headers.get("content-type")||"audio/mpeg","cache-control":"no-store","content-disposition":`inline; filename="elevenlabs-${voiceId}.mp3"`,"x-rm-provider":"elevenlabs","x-rm-voice-id":voiceId,"x-rm-model":model});
    if(fallbackUsed){h.set("x-rm-fallback","1");h.set("x-rm-fallback-reason","free-plan-voice-filter")}
    return new Response(r.body,{status:200,headers:h});
  }catch(e){return json({error:String(e?.message||e)},502)}
}
