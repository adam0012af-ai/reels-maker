import baseWorker from "./worker-v15.js";

const MODELS=["@cf/zai-org/glm-4.7-flash","@cf/google/gemma-4-26b-a4b-it","@cf/meta/llama-3.2-3b-instruct"];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function safeJson(r){try{return await r.json()}catch{return{}}}
function textOf(x){return typeof x==="string"?x:(x?.response||x?.text||x?.result?.response||x?.choices?.[0]?.message?.content||"")}
async function generate(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await safeJson(request),task=b.task||"script",topic=String(b.topic||"").trim();
  if(!topic)return json({error:"topic required"},400);
  const prompt=task==="idea"?`اقترح فكرة واحدة قوية لفيديو قصير عن: ${topic}. اكتب بالعربية فقط وبدون تعليمات تصوير أو نصوص على الشاشة.`:task==="caption"?`اكتب كابشن عربي قصير وجذاب عن: ${topic} مع 5 هاشتاقات مناسبة. أعد الكابشن فقط.`:`اكتب تعليقًا صوتيًا عربيًا طبيعيًا لفيديو قصير عن: ${topic}. المدة ${Number(b.durationSeconds)||45} ثانية تقريبًا. أعد النص المنطوق فقط بدون عناوين أو توقيتات أو تعليمات تصوير أو نصوص على الشاشة.`;
  let last="";
  for(const model of MODELS){try{const out=await env.AI.run(model,{messages:[{role:"user",content:prompt}],max_completion_tokens:task==="script"?800:350,temperature:.65,stream:false});const t=String(textOf(out)||"").trim();if(t)return json({text:t,model,task});last=model+": empty"}catch(e){last=String(e?.message||e)}}
  return json({error:last||"generation failed"},502);
}

async function inject(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(!html.includes("mobile-auto-ui.css"))html=html.replace("</head>",'<link rel="stylesheet" href="mobile-auto-ui.css?v=3"></head>');
  if(!html.includes("mobile-auto-ui.js"))html=html.replace("</body>",'<script src="mobile-auto-ui.js?v=3"></script></body>');
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-mobile-auto","test-v3");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname==="/api/autocontent/generate"&&request.method==="POST")return generate(request,env);const response=await baseWorker.fetch(request,env,ctx);return inject(response)}};
