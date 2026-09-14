import baseWorker from "./worker-v15.js";

const MODELS=["@cf/zai-org/glm-4.7-flash","@cf/google/gemma-4-26b-a4b-it","@cf/meta/llama-3.2-3b-instruct"];
const IMAGE_MODEL="@cf/bytedance/stable-diffusion-xl-lightning";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function safeJson(r){try{return await r.json()}catch{return{}}}
function textOf(x){return typeof x==="string"?x:(x?.response||x?.text||x?.result?.response||x?.choices?.[0]?.message?.content||"")}

async function generate(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await safeJson(request),task=b.task||"script",topic=String(b.topic||"").trim(),platform=String(b.platform||"TikTok"),tone=String(b.tone||"Natural"),script=String(b.script||"").trim();
  if(!topic)return json({error:"topic required"},400);
  const duration=Number(b.durationSeconds)||45;
  const toneGuide=tone==="Calm"?"هادئ، مريح، جمل قصيرة وإيقاع بطيء طبيعي":tone==="Energetic"?"حماسي، قوي، مباشر، جمل قصيرة وإيقاع سريع": "طبيعي وعفوي، كأن شخصًا يتحدث بشكل يومي بدون مبالغة";
  let prompt="";
  if(task==="idea") prompt=`اقترح فكرة واحدة قوية لفيديو قصير عن: ${topic}. المنصة: ${platform}. الأسلوب: ${toneGuide}. اكتب بالعربية فقط وبدون تعليمات تصوير أو نصوص على الشاشة.`;
  else if(task==="caption") prompt=`اكتب كابشن عربي قصير وجذاب عن: ${topic}. المنصة: ${platform}. الأسلوب: ${toneGuide}. أضف 5 هاشتاقات مناسبة. أعد الكابشن فقط.`;
  else if(task==="visuals") prompt=`حلل السكربت التالي واختر 3 مشاهد مختلفة تمثل معناه فعلاً. أعد لكل مشهد عبارة بحث إنجليزية مناسبة لمكتبة فيديوهات stock مثل Pexels.\nالموضوع: ${topic}\nالسكربت: ${script.slice(0,2200)}\nالقواعد الصارمة: 3 أسطر فقط. كل سطر 3 إلى 7 كلمات إنجليزية. استخدم أشخاصًا طبيعيين في مواقف يومية مرتبطة بالنقطة النفسية المذكورة. لا تستخدم fashion, glamour, sexy, lingerie, model, posing, beauty, bald, mannequin. فضّل مفاهيم مثل thinking, memory, anxiety, conversation, social behavior, emotion, decision making عندما تناسب السكربت. لا تكرر نفس الشخص أو نفس الفكرة في أكثر من سطر. بدون ترقيم أو شرح.`;
  else prompt=`اكتب تعليقًا صوتيًا عربيًا طبيعيًا لفيديو قصير عن: ${topic}. المنصة: ${platform}. أسلوب الإلقاء والكتابة: ${toneGuide}. المدة ${duration} ثانية تقريبًا. أعد النص المنطوق فقط بدون عناوين أو توقيتات أو تعليمات تصوير أو نصوص على الشاشة.`;
  let last="";
  for(const model of MODELS){try{const out=await env.AI.run(model,{messages:[{role:"user",content:prompt}],max_completion_tokens:task==="script"?800:task==="visuals"?160:350,temperature:task==="visuals"?.25:.65,stream:false});const t=String(textOf(out)||"").trim();if(t)return json({text:t,model,task});last=model+": empty"}catch(e){last=String(e?.message||e)}}
  return json({error:last||"generation failed"},502);
}

async function generateSceneImage(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await safeJson(request);const scene=String(b.prompt||"").trim();if(!scene)return json({error:"prompt required"},400);
  const prompt=`Photorealistic documentary-style vertical 9:16 scene for an educational psychology reel. Show ordinary adults in natural everyday situations, realistic clothing, realistic anatomy, natural facial expressions, believable environment and lighting. Visual concept: ${scene}. No glamour, no fashion shoot, no sensual pose, no lingerie, no beauty-model look, no mannequin look, no bald stylized character. No text, no letters, no captions, no logos, no watermark.`;
  try{
    const stream=await env.AI.run(IMAGE_MODEL,{prompt,negative_prompt:"text, letters, captions, subtitles, logo, watermark, glamour, fashion model, sexy, lingerie, sensual pose, nude, mannequin, bald head, distorted face, deformed hands, extra fingers, duplicate person, surreal anatomy, black image, empty image",width:768,height:1344,num_steps:8,guidance:8});
    return new Response(stream,{headers:{"content-type":"image/jpeg","cache-control":"no-store","x-rm-image-model":IMAGE_MODEL}});
  }catch(e){return json({error:String(e?.message||e)},502)}
}

async function inject(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(!/name=["']viewport["']/i.test(html))html=html.replace(/<head([^>]*)>/i,'<head$1><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
  else html=html.replace(/<meta[^>]+name=["']viewport["'][^>]*>/i,'<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
  if(!html.includes("rmMobileViewportFix"))html=html.replace("</head>",'<style id="rmMobileViewportFix">@media(max-width:1000px){html,body{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important}body{font-size:16px!important}.rm-shell-sidebar{width:min(90vw,360px)!important;max-width:360px!important}.rm-shell-item{min-height:60px!important;padding:10px 12px!important}.rm-shell-copy b{font-size:13px!important}.rm-shell-copy small{font-size:9px!important}#rmMobileAuto,.rma-body,.rma-card{max-width:100%!important;box-sizing:border-box!important}.rma-head{padding:12px 14px!important}.rma-head b{font-size:18px!important}.rma-body{padding:12px!important}.rma-card{padding:14px!important;border-radius:16px!important}.rma-card textarea,.rma-card select{font-size:16px!important;width:100%!important;min-height:52px!important}.rma-run{min-height:52px!important;font-size:14px!important}}</style></head>');
  if(!html.includes("mobile-auto-ui.css?v=9"))html=html.replace("</head>",'<link rel="stylesheet" href="mobile-auto-ui.css?v=9"></head>');
  if(!html.includes("mobile-auto-ui.js?v=9"))html=html.replace("</body>",'<script src="mobile-auto-ui.js?v=9"></script></body>');
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-mobile-auto","test-v9");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname==="/api/autocontent/generate"&&request.method==="POST")return generate(request,env);if(url.pathname==="/api/autocontent/image"&&request.method==="POST")return generateSceneImage(request,env);const response=await baseWorker.fetch(request,env,ctx);return inject(response)}};
