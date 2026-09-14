import baseWorker from "./worker-mobile-v16-ai.js";

const TEXT_MODELS=[
  "@cf/zai-org/glm-4.7-flash",
  "@cf/meta/llama-3.2-3b-instruct"
];
const WHISPER_MODELS=["@cf/openai/whisper-large-v3-turbo","@cf/openai/whisper"];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const textOf=x=>typeof x==="string"?x:(x?.response||x?.text||x?.result?.response||x?.choices?.[0]?.message?.content||"");
async function bodyJson(request){try{return await request.json()}catch{return{}}}
function bytesToBase64(bytes){let out="";const step=0x8000;for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(out)}

function actionPrompt(action,text,lang){
  const t=String(text||"").trim();
  const L=lang==="en"?"English":"Arabic";
  const map={
    summarize:`Summarize the following text clearly in ${L}. Preserve the important facts and return only the summary.\n\n${t}`,
    rewrite:`Rewrite the following text in polished, natural ${L}. Preserve the meaning, improve clarity and flow, and return only the rewritten text.\n\n${t}`,
    translate:`Translate the following text faithfully into ${L}. Return only the translation.\n\n${t}`,
    titles:`Create 10 strong short titles in ${L} for the following content. Make them clear and clickable without misleading claims.\n\n${t}`,
    caption:`Create a strong social-media caption in ${L} for the following content, followed by 5 relevant hashtags.\n\n${t}`,
    hashtags:`Return 15 relevant hashtags only for the following content.\n\n${t}`,
    story:`Turn the following idea into a coherent short story in ${L}, with a strong opening, clear progression, and satisfying ending.\n\n${t}`,
    prompt:`Convert the following idea into a production-ready AI prompt. Include subject, scene, composition, lighting, mood, style, camera, aspect ratio, and negative constraints. Return only the final prompt.\n\n${t}`,
    storyboard:`Turn the following story into 8 sequential visual scenes. Each scene must describe one concrete event in order and preserve character continuity. Return numbered scenes only.\n\n${t}`,
    code:`Act as a senior software engineer. Solve or improve the following code/task. Give the final code first, then a short explanation in ${L}.\n\n${t}`
  };
  return map[action]||`Answer the following request in ${L}:\n\n${t}`;
}

async function runText(env,prompt){
  let last="";
  for(const model of TEXT_MODELS){
    try{
      const out=await env.AI.run(model,{messages:[{role:"user",content:prompt}],max_completion_tokens:1200,temperature:.55,stream:false});
      const text=String(textOf(out)||"").trim();
      if(text)return{text,model};
      last=model+": empty";
    }catch(e){last=String(e?.message||e)}
  }
  throw new Error(last||"text generation failed");
}

async function aiText(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await bodyJson(request),action=String(b.action||"rewrite"),text=String(b.text||"").trim(),lang=String(b.language||"ar");
  if(!text)return json({error:"text required"},400);
  try{const r=await runText(env,actionPrompt(action,text,lang));return json({text:r.text,model:r.model,action})}catch(e){return json({error:String(e?.message||e)},502)}
}

async function aiTranscribe(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const ab=await request.arrayBuffer();
  if(!ab.byteLength)return json({error:"audio required"},400);
  if(ab.byteLength>24*1024*1024)return json({error:"audio file too large; keep it under 24 MB"},413);
  const audio=Array.from(new Uint8Array(ab));
  const language=request.headers.get("x-language")||"ar";
  let last="";
  for(const model of WHISPER_MODELS){
    try{
      const out=await env.AI.run(model,{audio,task:"transcribe",language,vad_filter:true});
      const text=String(out?.text||"").trim();
      if(text)return json({text,model,words:out?.words||[],vtt:out?.vtt||""});
      last=model+": empty";
    }catch(e){last=String(e?.message||e)}
  }
  return json({error:last||"transcription failed"},502);
}

async function aiClassify(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const ab=await request.arrayBuffer();if(!ab.byteLength)return json({error:"image required"},400);
  try{const out=await env.AI.run("@cf/microsoft/resnet-50",{image:Array.from(new Uint8Array(ab))});return json({results:out,model:"@cf/microsoft/resnet-50"})}catch(e){return json({error:String(e?.message||e)},502)}
}

async function aiVision(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  try{
    const fd=await request.formData(),file=fd.get("image"),prompt=String(fd.get("prompt")||"Describe this image accurately and mention the important objects, people, actions, setting, colors, and any visible text. Reply in Arabic.").trim();
    if(!file||typeof file.arrayBuffer!=="function")return json({error:"image required"},400);
    if(file.size>8*1024*1024)return json({error:"image too large; keep it under 8 MB"},413);
    const bytes=new Uint8Array(await file.arrayBuffer()),mime=file.type||"image/jpeg",image=`data:${mime};base64,${bytesToBase64(bytes)}`;
    try{
      const out=await env.AI.run("@cf/qwen/qwen3.8-27b",{messages:[{role:"system",content:"You are an accurate visual assistant."},{role:"user",content:prompt}],image,max_tokens:900,temperature:.2});
      const text=String(textOf(out)||"").trim();if(text)return json({text,model:"@cf/qwen/qwen3.8-27b"});
    }catch{}
    const fallback=await env.AI.run("@cf/microsoft/resnet-50",{image:Array.from(bytes)});
    return json({text:"",classification:fallback,model:"@cf/microsoft/resnet-50"});
  }catch(e){return json({error:String(e?.message||e)},502)}
}

async function aiEmbedding(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await bodyJson(request),items=Array.isArray(b.texts)?b.texts.map(x=>String(x||"").trim()).filter(Boolean).slice(0,16):[];
  if(!items.length)return json({error:"texts required"},400);
  try{const out=await env.AI.run("@cf/qwen/qwen3-embedding-0.6b",{text:items});return json({data:out?.data||out,model:"@cf/qwen/qwen3-embedding-0.6b"})}catch(e){return json({error:String(e?.message||e)},502)}
}

async function patchHtml(response){
  const type=response.headers.get("content-type")||"";if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(!html.includes("ai-toolbox-v1.css"))html=html.replace("</head>",'<link rel="stylesheet" href="/ai-toolbox-v1.css?v=1"></head>');
  if(!html.includes("ai-toolbox-v1.js"))html=html.replace("</body>",'<script src="/ai-toolbox-v1.js?v=1"></script></body>');
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-ai-toolbox","v17");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==="/api/ai/text"&&request.method==="POST")return aiText(request,env);
  if(url.pathname==="/api/ai/transcribe"&&request.method==="POST")return aiTranscribe(request,env);
  if(url.pathname==="/api/ai/classify"&&request.method==="POST")return aiClassify(request,env);
  if(url.pathname==="/api/ai/vision"&&request.method==="POST")return aiVision(request,env);
  if(url.pathname==="/api/ai/embeddings"&&request.method==="POST")return aiEmbedding(request,env);
  return patchHtml(await baseWorker.fetch(request,env,ctx));
}};
