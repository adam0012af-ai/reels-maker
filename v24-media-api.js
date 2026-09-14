import {dedupe} from "./v21-story-api.js";
import {imageApi,transcribeApi} from "./v21-media-api.js";

const GEMINI_BASE="https://generativelanguage.googleapis.com/v1beta/models";
const VOICES=[
  ["Zephyr","مشرق","female"],["Puck","حيوي","male"],["Charon","معلوماتي","male"],["Kore","ثابت","female"],["Fenrir","متحمس","male"],["Leda","شبابي","female"],["Orus","واثق","male"],["Aoede","خفيف","female"],["Callirrhoe","مريح","female"],["Autonoe","مشرق","female"],["Enceladus","هوائي","male"],["Iapetus","واضح","male"],["Umbriel","مريح","male"],["Algieba","ناعم","male"],["Despina","ناعم","female"],["Erinome","واضح","female"],["Algenib","خشن","male"],["Rasalgethi","معلوماتي","male"],["Laomedeia","حيوي","female"],["Achernar","ناعم","female"],["Alnilam","ثابت","male"],["Schedar","متزن","male"],["Gacrux","ناضج","female"],["Pulcherrima","مباشر","female"],["Achird","ودود","male"],["Zubenelgenubi","عفوي","male"],["Vindemiatrix","لطيف","female"],["Sadachbia","نشيط","male"],["Sadaltager","خبير","male"],["Sulafat","دافئ","female"]
];
const NAMES=new Set(VOICES.map(v=>v[0]));
const ACCENTS={
  egyptian:{label:"🇪🇬 مصري",prompt:"Speak natural contemporary Egyptian Arabic, with authentic Egyptian rhythm, vowels and everyday pronunciation. Keep it clear and suitable for professional storytelling; avoid Gulf, Levantine and Iraqi pronunciation."},
  saudi:{label:"🇸🇦 سعودي",prompt:"Speak natural modern Saudi Arabic, broadly understandable across Saudi Arabia, with authentic Saudi/Gulf rhythm and pronunciation. Avoid Egyptian, Levantine and Iraqi pronunciation."},
  kuwaiti:{label:"🇰🇼 كويتي",prompt:"Speak natural Kuwaiti Arabic with recognizable Kuwaiti Gulf rhythm, vowels and conversational pronunciation, while remaining clear for storytelling. Avoid Saudi overgeneralization, Egyptian and Levantine pronunciation."},
  emirati:{label:"🇦🇪 إماراتي",prompt:"Speak natural Emirati Arabic with authentic UAE Gulf rhythm and pronunciation, clear and warm for narration. Avoid Egyptian, Levantine and Iraqi pronunciation."},
  iraqi:{label:"🇮🇶 عراقي",prompt:"Speak natural contemporary Iraqi Arabic with recognizable Iraqi rhythm and pronunciation, clear and warm for professional storytelling. Avoid Egyptian, Levantine and Gulf pronunciation."},
  qatari:{label:"🇶🇦 قطري",prompt:"Speak natural Qatari Arabic with authentic Qatari Gulf rhythm and pronunciation, clear and polished for storytelling."},
  bahraini:{label:"🇧🇭 بحريني",prompt:"Speak natural Bahraini Arabic with recognizable Bahraini Gulf rhythm and pronunciation, clear and warm for narration."},
  omani:{label:"🇴🇲 عُماني",prompt:"Speak natural Omani Arabic with recognizable Omani rhythm and pronunciation, clear and professional for storytelling."},
  gulf:{label:"🌍 خليجي عام",prompt:"Speak natural neutral Gulf Arabic (Khaleeji), warm and believable, broadly understandable across Gulf countries. Avoid Egyptian, Levantine and Iraqi pronunciation."}
};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,max=4000)=>String(v||"").trim().slice(0,max);
function decodeBase64(data){const bin=atob(String(data||"").replace(/\s/g,"")),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function pcm16ToWav(pcm,sampleRate=24000,channels=1){const n=pcm.byteLength,b=new ArrayBuffer(44+n),v=new DataView(b),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};w(0,"RIFF");v.setUint32(4,36+n,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,n,true);new Uint8Array(b,44).set(pcm);return new Uint8Array(b)}
function tonePrompt(t){if(t==="dramatic")return"Use controlled emotion and suspense without theatrical exaggeration.";if(t==="calm")return"Sound warm, calm and confident while fully awake and expressive; never sleepy.";return"Sound like an experienced professional storyteller: natural, expressive, human and engaging."}
export function voicesApi(){return json({voices:VOICES.map(([name,style,gender])=>({name,style,gender})),accents:Object.entries(ACCENTS).map(([id,x])=>({id,label:x.label})),count:VOICES.length,models:["gemini-3.1-flash-tts-preview","gemini-2.5-flash-preview-tts"]})}
async function generateWithModel(env,model,text,voice,accent,tone){
  const accentPrompt=(ACCENTS[accent]||ACCENTS.egyptian).prompt;
  const prompt=`${accentPrompt} ${tonePrompt(tone)} Keep the selected speaker identity consistent. Pronounce every word carefully, use natural pauses from punctuation, never repeat a sentence, and read only the transcript.\n\nTranscript:\n${text}`;
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
  const voice=requested,accent=ACCENTS[clean(b.dialect||b.accent,20)]?clean(b.dialect||b.accent,20):"egyptian",tone=clean(b.tone||b.style,30)||"natural";
  const models=["gemini-3.1-flash-tts-preview",env.GEMINI_TTS_MODEL,"gemini-2.5-flash-preview-tts"].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  let last="";
  for(const model of models){try{const out=await generateWithModel(env,model,text,voice,accent,tone);return new Response(out.bytes,{status:200,headers:{"content-type":out.mime,"cache-control":"no-store","content-disposition":`inline; filename="gemini-${voice}.wav"`,"x-rm-voice":voice,"x-rm-accent":accent,"x-rm-model":out.model}})}catch(e){last=String(e?.message||e)}}
  return json({error:last||"All TTS models failed",voice,models},502);
}
export {imageApi,transcribeApi};
