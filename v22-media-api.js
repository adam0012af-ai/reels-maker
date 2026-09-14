import {dedupe} from "./v21-story-api.js";
import {imageApi,transcribeApi} from "./v21-media-api.js";

const GEMINI_BASE="https://generativelanguage.googleapis.com/v1beta/models";
const VOICES=[
  ["Zephyr","مشرق"],["Puck","حيوي"],["Charon","معلوماتي"],["Kore","ثابت"],["Fenrir","متحمس"],["Leda","شبابي"],["Orus","واثق"],["Aoede","خفيف"],["Callirrhoe","مريح"],["Autonoe","مشرق"],["Enceladus","هوائي"],["Iapetus","واضح"],["Umbriel","مريح"],["Algieba","ناعم"],["Despina","ناعم"],["Erinome","واضح"],["Algenib","خشن"],["Rasalgethi","معلوماتي"],["Laomedeia","حيوي"],["Achernar","ناعم"],["Alnilam","ثابت"],["Schedar","متزن"],["Gacrux","ناضج"],["Pulcherrima","مباشر"],["Achird","ودود"],["Zubenelgenubi","عفوي"],["Vindemiatrix","لطيف"],["Sadachbia","نشيط"],["Sadaltager","خبير"],["Sulafat","دافئ"]
];
const NAMES=new Set(VOICES.map(v=>v[0]));
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,max=4000)=>String(v||"").trim().slice(0,max);
function decodeBase64(data){const cleanData=String(data||"").replace(/\s/g,"");const binary=atob(cleanData);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}
function pcm16ToWav(pcm,sampleRate=24000,channels=1){const dataLength=pcm.byteLength,buffer=new ArrayBuffer(44+dataLength),view=new DataView(buffer),write=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i))};write(0,"RIFF");view.setUint32(4,36+dataLength,true);write(8,"WAVE");write(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);write(36,"data");view.setUint32(40,dataLength,true);new Uint8Array(buffer,44).set(pcm);return new Uint8Array(buffer)}
function dialectPrompt(d){return d==="gulf"?"Speak naturally in a clear neutral Gulf Arabic accent, warm and believable, with precise pronunciation and natural Khaleeji rhythm. Avoid Egyptian and Levantine pronunciation.":"Speak naturally in a clear modern Egyptian Arabic accent, warm and conversational, with precise pronunciation and realistic Egyptian rhythm. Avoid Gulf and Levantine pronunciation."}
function tonePrompt(t){if(t==="dramatic")return"Narrate with controlled emotion and suspense, cinematic but not theatrical.";if(t==="calm")return"Narrate warmly and calmly while staying alert and expressive; never sound sleepy.";return"Narrate like an experienced professional storyteller: natural, expressive, human and engaging."}
export function voicesApi(){return json({voices:VOICES.map(([name,style])=>({name,style})),count:VOICES.length})}
export async function ttsApi(request,env){
  if(!env.GEMINI_API_KEY)return json({error:"GEMINI_API_KEY is not configured"},503);
  let b={};try{b=await request.json()}catch{}
  const text=dedupe(clean(b.text,4000));if(!text)return json({error:"Missing text."},400);
  const requested=clean(b.voice||b.voiceId,40),voice=NAMES.has(requested)?requested:"Kore",dialect=clean(b.dialect,20)||"egyptian",tone=clean(b.tone||b.style,30)||"natural";
  const model=env.GEMINI_TTS_MODEL||"gemini-2.5-flash-preview-tts";
  const prompt=`${dialectPrompt(dialect)} ${tonePrompt(tone)} Pronounce every word carefully, use natural pauses from punctuation, never repeat a sentence, and read only the transcript.\n\nTranscript:\n${text}`;
  try{
    const upstream=await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":env.GEMINI_API_KEY,"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:["AUDIO"],speechConfig:{languageCode:"ar-XA",voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})});
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok)return json({error:data?.error?.message||`Gemini TTS request failed (${upstream.status}).`},upstream.status);
    const part=data?.candidates?.[0]?.content?.parts?.find(p=>p?.inlineData?.data);if(!part?.inlineData?.data)return json({error:"Gemini TTS returned no audio data."},502);
    const raw=decodeBase64(part.inlineData.data),mimeType=String(part.inlineData.mimeType||"audio/L16;codec=pcm;rate=24000");let bytes=raw,mime=mimeType;
    if(!mimeType.toLowerCase().includes("wav")){bytes=pcm16ToWav(raw,24000,1);mime="audio/wav"}
    return new Response(bytes,{status:200,headers:{"content-type":mime,"cache-control":"no-store","content-disposition":`inline; filename="gemini-${voice}.wav"`,`x-rm-voice`:voice,"x-rm-dialect":dialect}})
  }catch(e){return json({error:`Unable to reach Gemini TTS: ${String(e?.message||e).slice(0,300)}`},502)}
}

export {imageApi,transcribeApi};
