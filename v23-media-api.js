import {dedupe} from "./v21-story-api.js";
import {imageApi,transcribeApi} from "./v21-media-api.js";

const GEMINI_BASE="https://generativelanguage.googleapis.com/v1beta/models";
const VOICES=[
  ["Zephyr","مشرق"],["Puck","حيوي"],["Charon","معلوماتي"],["Kore","ثابت"],["Fenrir","متحمس"],["Leda","شبابي"],["Orus","واثق"],["Aoede","خفيف"],["Callirrhoe","مريح"],["Autonoe","مشرق"],["Enceladus","هوائي"],["Iapetus","واضح"],["Umbriel","مريح"],["Algieba","ناعم"],["Despina","ناعم"],["Erinome","واضح"],["Algenib","خشن"],["Rasalgethi","معلوماتي"],["Laomedeia","حيوي"],["Achernar","ناعم"],["Alnilam","ثابت"],["Schedar","متزن"],["Gacrux","ناضج"],["Pulcherrima","مباشر"],["Achird","ودود"],["Zubenelgenubi","عفوي"],["Vindemiatrix","لطيف"],["Sadachbia","نشيط"],["Sadaltager","خبير"],["Sulafat","دافئ"]
];
const NAMES=new Set(VOICES.map(v=>v[0]));
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,max=4000)=>String(v||"").trim().slice(0,max);
function decodeBase64(data){const bin=atob(String(data||"").replace(/\s/g,"")),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function pcm16ToWav(pcm,sampleRate=24000,channels=1){const n=pcm.byteLength,b=new ArrayBuffer(44+n),v=new DataView(b),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};w(0,"RIFF");v.setUint32(4,36+n,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,n,true);new Uint8Array(b,44).set(pcm);return new Uint8Array(b)}
function dialectPrompt(d){return d==="gulf"?"Speak in natural neutral Gulf Arabic (Khaleeji), with warm believable Gulf pronunciation and rhythm. Do not imitate Egyptian or Levantine pronunciation.":"Speak in natural modern Egyptian Arabic, with warm believable Egyptian pronunciation and rhythm. Do not imitate Gulf or Levantine pronunciation."}
function tonePrompt(t){if(t==="dramatic")return"Use controlled emotion and suspense without theatrical exaggeration.";if(t==="calm")return"Sound warm, calm and confident while fully awake and expressive; never sleepy.";return"Sound like an experienced professional storyteller: natural, expressive, human and engaging."}
export function voicesApi(){return json({voices:VOICES.map(([name,style])=>({name,style})),count:VOICES.length,models:["gemini-3.1-flash-tts-preview","gemini-2.5-flash-preview-tts"]})}
async function generateWithModel(env,model,text,voice,dialect,tone){
  const prompt=`${dialectPrompt(dialect)} ${tonePrompt(tone)} Keep the selected speaker identity consistent. Pronounce every word carefully, use natural pauses from punctuation, never repeat a sentence, and read only the transcript.\n\nTranscript:\n${text}`;
  const r=await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":env.GEMINI_API_KEY,"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data?.error?.message||`Gemini TTS ${model} failed (${r.status})`);
  const part=data?.candidates?.[0]?.content?.parts?.find(p=>p?.inlineData?.data);
  if(!part?.inlineData?.data)throw new Error(`${model} returned no audio data`);
  const mimeType=String(part.inlineData.mimeType||"audio/L16;codec=pcm;rate=24000"),raw=decodeBase64(part.inlineData.data),m=mimeType.match(/rate=(\d+)/i),rate=m?Number(m[1]):24000;
  const isWav=mimeType.toLowerCase().includes("wav");
  return{bytes:isWav?raw:pcm16ToWav(raw,rate,1),mime:isWav?mimeType:"audio/wav",model};
}
export async function ttsApi(request,env){
  if(!env.GEMINI_API_KEY)return json({error:"GEMINI_API_KEY is not configured"},503);
  let b={};try{b=await request.json()}catch{}
  const text=dedupe(clean(b.text,6000));if(!text)return json({error:"Missing text."},400);
  const requested=clean(b.voice||b.voiceId,40);if(!NAMES.has(requested))return json({error:`Unsupported voice: ${requested||"empty"}`},400);
  const voice=requested,dialect=clean(b.dialect,20)||"egyptian",tone=clean(b.tone||b.style,30)||"natural";
  const models=["gemini-3.1-flash-tts-preview",env.GEMINI_TTS_MODEL,"gemini-2.5-flash-preview-tts"].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  let last="";
  for(const model of models){try{const out=await generateWithModel(env,model,text,voice,dialect,tone);return new Response(out.bytes,{status:200,headers:{"content-type":out.mime,"cache-control":"no-store","content-disposition":`inline; filename="gemini-${voice}.wav"`,"x-rm-voice":voice,"x-rm-dialect":dialect,"x-rm-model":out.model}})}catch(e){last=String(e?.message||e)}}
  return json({error:last||"All TTS models failed",voice,models},502);
}
export {imageApi,transcribeApi};
