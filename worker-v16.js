import baseWorker from "./worker-v15.js";

const AUTO_TEXT_MODELS=["@cf/zai-org/glm-4.7-flash","@cf/google/gemma-4-26b-a4b-it","@cf/meta/llama-3.2-3b-instruct"];

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
async function safeJson(request){try{return await request.json()}catch{return{}}}
function clean(v,max=4000){return String(v||"").trim().slice(0,max)}
function extractText(result){if(!result)return"";if(typeof result==="string")return result.trim();if(typeof result.response==="string")return result.response.trim();if(typeof result.text==="string")return result.text.trim();if(typeof result.result?.response==="string")return result.result.response.trim();const c=result.choices?.[0]?.message?.content;if(typeof c==="string")return c.trim();if(Array.isArray(c))return c.map(x=>x?.text||x?.content||"").join("\n").trim();return""}

function promptFor(body){
  const task=["idea","script","caption"].includes(body.task)?body.task:"idea";
  const topic=clean(body.topic,500)||"موضوع ريلز قصير";
  const language=clean(body.language,40)||"Arabic";
  const platform=clean(body.platform,60)||"TikTok";
  const tone=clean(body.tone,80)||"Engaging and natural";
  const duration=Math.min(180,Math.max(10,Number(body.durationSeconds)||45));
  const arabic=/arab/i.test(language);
  const strict=arabic?"اكتب بالعربية الطبيعية فقط. ممنوع الكلمات الإنجليزية أو الترجمات أو عناوين مثل Hook وBeat وCTA. لا تضف أي تعليمات تصوير أو نصوص تظهر على الشاشة.":"";
  if(task==="script")return `اكتب تعليقًا صوتيًا جاهزًا لفيديو قصير عن: ${topic}. المنصة: ${platform}. المدة المستهدفة: ${duration} ثانية. الأسلوب: ${tone}. ${strict} ابدأ بجملة قوية، ثم قدم المعلومات بإيقاع طبيعي، وأنهِ بجملة خفيفة. أعد النص المنطوق فقط بدون عناوين أو توقيتات أو أقواس أو توجيهات إنتاج.`;
  if(task==="caption")return `اكتب كابشن قصير وجذاب عن: ${topic}. المنصة: ${platform}. الأسلوب: ${tone}. ${strict} أضف 5 إلى 8 هاشتاقات مناسبة. أعد الكابشن فقط.`;
  return `اقترح فكرة واحدة قوية لفيديو قصير عن: ${topic}. المنصة: ${platform}. المدة: ${duration} ثانية. الأسلوب: ${tone}. ${strict} أعد عنوانًا قصيرًا، ثم جملة جذب واحدة، ثم 3 نقاط محتوى قصيرة. لا تضف شرحًا خارج المطلوب.`;
}

async function generateAutoContent(request,env){
  if(!env.AI?.run)return json({error:"Workers AI binding is not configured"},503);
  const body=await safeJson(request),prompt=promptFor(body);
  let last="";
  for(const model of AUTO_TEXT_MODELS){
    try{
      const result=await env.AI.run(model,{messages:[{role:"system",content:"أنت منتج محتوى فيديوهات قصيرة محترف. التزم باللغة والصيغة المطلوبة بدقة."},{role:"user",content:prompt}],max_completion_tokens:body.task==="script"?900:450,temperature:.65,stream:false,chat_template_kwargs:{enable_thinking:false}});
      const text=extractText(result);if(text)return json({text,task:body.task||"idea",model});
      last=`${model}: no text`;
    }catch(e){last=`${model}: ${String(e?.message||e)}`}
  }
  return json({error:last||"Auto Content generation failed"},502);
}

async function injectAutomation(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(!html.includes("automation-studio-v1.css"))html=html.replace("</head>",'<link rel="stylesheet" href="automation-studio-v1.css?v=2"></head>');
  if(!html.includes("mobile-first-v1.css"))html=html.replace("</head>",'<link rel="stylesheet" href="mobile-first-v1.css?v=1"></head>');
  if(!html.includes("automation-studio-v1.js"))html=html.replace("</body>",'<script src="automation-studio-v1.js?v=2"></script></body>');
  if(!html.includes("automation-bridge-v1.js"))html=html.replace("</body>",'<script src="automation-bridge-v1.js?v=1"></script></body>');
  if(!html.includes("navigation-v2.js"))html=html.replace("</body>",'<script src="navigation-v2.js?v=1"></script></body>');
  if(!html.includes("mobile-first-v1.js"))html=html.replace("</body>",'<script src="mobile-first-v1.js?v=1"></script></body>');
  const headers=new Headers(response.headers);headers.delete("content-length");headers.set("content-type","text/html; charset=utf-8");headers.set("cache-control","no-store, no-cache, must-revalidate");headers.set("x-rm-autocontent","v3");headers.set("x-rm-mobile-first","v1");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==="/api/autocontent/generate"&&request.method==="POST")return generateAutoContent(request,env);
    const response=await baseWorker.fetch(request,env,ctx);
    return injectAutomation(response);
  }
};