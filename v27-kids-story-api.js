const MODELS=["@cf/zai-org/glm-4.7-flash","@cf/google/gemma-4-26b-a4b-it","@cf/meta/llama-3.2-3b-instruct"];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const textOf=x=>typeof x==="string"?x:(x?.response||x?.text||x?.result?.response||x?.choices?.[0]?.message?.content||"");
const clean=s=>String(s||"").replace(/^```(?:json|text)?\s*/i,"").replace(/\s*```$/i,"").trim();
const wc=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
const norm=s=>String(s||"").replace(/[\u064B-\u065F\u0670]/g,"").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim().toLowerCase();
function dedupe(text){const parts=String(text||"").split(/(?<=[.!؟!?؛\n])/u).map(x=>x.trim()).filter(Boolean),seen=[],out=[];for(const p of parts){const n=norm(p);if(!n)continue;if(seen.some(s=>n===s||(n.length>28&&s.length>28&&(n.includes(s)||s.includes(n)))))continue;seen.push(n);out.push(p)}return out.join(" ").replace(/\s+/g," ").trim()}
async function body(r){try{return await r.json()}catch{return{}}}
async function ask(env,prompt,max=2400,temp=.52){let last="";for(const model of MODELS){try{const out=await env.AI.run(model,{messages:[{role:"user",content:prompt}],max_completion_tokens:max,temperature:temp,stream:false});const t=clean(textOf(out));if(t)return{text:t,model}}catch(e){last=String(e?.message||e)}}throw new Error(last||"generation failed")}
function parseScenePlan(raw,count){let data=null;try{data=JSON.parse(clean(raw))}catch{}const arr=Array.isArray(data)?data:(Array.isArray(data?.scenes)?data.scenes:[]);return arr.map((x,i)=>({
  narration:String(x?.narration||x?.text||"").trim(),
  prompt:String(x?.prompt||x?.image_prompt||"").trim(),
  index:i+1
})).filter(x=>x.narration&&x.prompt).slice(0,count)}
export async function kidsStoryGenerate(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await body(request),idea=String(b.idea||"").trim();
  if(!idea)return json({error:"اكتب فكرة القصة أولًا."},400);
  const duration=[120,180].includes(Number(b.duration))?Number(b.duration):120;
  const age=String(b.age||"6-10").slice(0,20),tone=String(b.tone||"warm").slice(0,30);
  const target=Math.round(duration*2.15),min=Math.round(target*.91),max=Math.round(target*1.08);
  const mood=tone==="adventure"?"مغامرة ممتعة ومشوقة بدون عنف مخيف":tone==="funny"?"مرحة وخفيفة مع مواقف لطيفة":"دافئة ومؤثرة ومناسبة للأطفال";
  const prompt=`اكتب قصة أطفال عربية أصلية وجاهزة للتعليق الصوتي، مدتها نحو ${Math.round(duration/60)} دقيقة، للفئة العمرية ${age}.\nالفكرة: ${idea}\nالأسلوب: ${mood}.\nالطول المطلوب بين ${min} و${max} كلمة تقريبًا.\nابدأ بخطاف قصير، ثم أحداث واضحة متصاعدة، ثم حل ونهاية مرضية تحمل قيمة إيجابية طبيعية بدون وعظ مباشر. حافظ على أسماء الشخصيات وصفاتها طوال القصة. اجعل الجمل سهلة ومسموعة، مناسبة للتعليق الصوتي. ممنوع التكرار والحشو والعناوين والترقيم والتعليمات التقنية. لا تذكر اسم المنصة داخل القصة؛ ستضاف خاتمة المنصة لاحقًا. أعد نص الراوي فقط.`;
  try{
    let best="",model="";
    for(let i=0;i<2;i++){const r=await ask(env,prompt+(i?"\nأعد كتابة نسخة جديدة أكثر ترابطًا إن كانت النسخة السابقة قصيرة أو متكررة.":""),2600,.5+i*.05),story=dedupe(r.text);if(wc(story)>wc(best)){best=story;model=r.model}if(wc(story)>=min*.88)break}
    if(!best)return json({error:"تعذر إنشاء القصة."},502);
    return json({story:best,words:wc(best),duration,model});
  }catch(e){return json({error:String(e?.message||e)},502)}
}
export async function kidsScenePlan(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await body(request),story=String(b.story||"").trim();
  if(!story)return json({error:"story required"},400);
  const duration=[120,180].includes(Number(b.duration))?Number(b.duration):120;
  const count=duration===180?20:14;
  const prompt=`قسّم قصة الأطفال التالية إلى ${count} مقطعًا سرديًا متتابعًا يغطي النص كله بالترتيب. أعد JSON array فقط، وكل عنصر يجب أن يكون بالشكل {"narration":"...","prompt":"..."}.\nقواعد narration: استخدم كلمات وجمل القصة نفسها قدر الإمكان، لا تضف أحداثًا جديدة، وقسّم النص كاملًا بين المقاطع بدون تكرار.\nقواعد prompt: وصف إنجليزي دقيق للصورة المطابقة لنفس مقطع narration. ثبّت وصف الشخصيات حرفيًا عبر المشاهد: العمر، لون البشرة، الشعر، الملابس وألوانها. أسلوب ثابت: high-end cinematic 3D animated family film, expressive faces, soft cinematic lighting, vertical 9:16, no text, no letters, no subtitles, no logos, no watermark.\nالقصة:\n${story}`;
  try{
    let scenes=[];
    for(let i=0;i<2&&scenes.length<count;i++){const r=await ask(env,prompt,4200,.25);scenes=parseScenePlan(r.text,count)}
    if(scenes.length<count)return json({error:`تم تخطيط ${scenes.length} مشاهد فقط من ${count}`},502);
    return json({scenes,count,duration});
  }catch(e){return json({error:String(e?.message||e)},502)}
}
