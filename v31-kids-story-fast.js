const MODELS=["@cf/meta/llama-3.2-3b-instruct","@cf/zai-org/glm-4.7-flash","@cf/google/gemma-4-26b-a4b-it"];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const textOf=x=>typeof x==="string"?x:(x?.response||x?.text||x?.result?.response||x?.choices?.[0]?.message?.content||"");
const clean=s=>String(s||"").replace(/^```(?:json|text)?\s*/i,"").replace(/\s*```$/i,"").trim();
const wc=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
const norm=s=>String(s||"").replace(/[\u064B-\u065F\u0670]/g,"").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim().toLowerCase();
function dedupe(text){const parts=String(text||"").split(/(?<=[.!؟!?؛\n])/u).map(x=>x.trim()).filter(Boolean),seen=[],out=[];for(const p of parts){const n=norm(p);if(!n)continue;if(seen.some(s=>n===s||(n.length>30&&s.length>30&&(n.includes(s)||s.includes(n)))))continue;seen.push(n);out.push(p)}return out.join(" ").replace(/\s+/g," ").trim()}
async function body(r){try{return await r.json()}catch{return{}}}
async function askFast(env,prompt,max=1250){let last="";for(const model of MODELS){try{const out=await env.AI.run(model,{messages:[{role:"user",content:prompt}],max_completion_tokens:max,temperature:.58,stream:false});const t=clean(textOf(out));if(t)return{text:t,model}}catch(e){last=String(e?.message||e)}}throw new Error(last||"generation failed")}
function parseScenePlan(raw,count){let data=null;try{data=JSON.parse(clean(raw))}catch{}const arr=Array.isArray(data)?data:(Array.isArray(data?.scenes)?data.scenes:[]);return arr.map((x,i)=>({narration:String(x?.narration||x?.text||"").trim(),prompt:String(x?.prompt||x?.image_prompt||"").trim(),index:i+1})).filter(x=>x.narration&&x.prompt).slice(0,count)}

export async function kidsStoryGenerate(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await body(request),idea=String(b.idea||"").trim();
  if(!idea)return json({error:"اكتب فكرة القصة أولًا."},400);
  const duration=[120,180].includes(Number(b.duration))?Number(b.duration):120;
  const age=String(b.age||"6-10").slice(0,20),tone=String(b.tone||"warm").slice(0,30);
  const target=duration===180?390:260;
  const min=duration===180?340:225,max=duration===180?430:295;
  const mood=tone==="adventure"?"مغامرة ممتعة ومشوقة بلا عنف مخيف":tone==="funny"?"مرحة وخفيفة ومليئة بالمواقف اللطيفة":"دافئة ومؤثرة ومناسبة للأطفال";
  const prompt=`اكتب قصة أطفال عربية أصلية كاملة وجاهزة للتعليق الصوتي.\nالفكرة: ${idea}\nالعمر: ${age}\nالأسلوب: ${mood}\nالمدة المستهدفة: ${Math.round(duration/60)} دقيقة.\nاكتب تقريبًا ${target} كلمة، ولا تقل عن ${min} ولا تتجاوز ${max}. ابدأ بخطاف سريع، ثم أحداث متتابعة واضحة، ثم حل ونهاية مرضية. حافظ على أسماء الشخصيات وصفاتها. اجعل الجمل سهلة ومسموعة. ممنوع التكرار والحشو والعناوين والترقيم والتعليمات التقنية. لا تذكر اسم المنصة. أعد نص الراوي فقط.`;
  try{
    const r=await askFast(env,prompt,duration===180?1450:1050),story=dedupe(r.text);
    if(wc(story)<120)return json({error:"خرج نص قصير جدًا، أعد المحاولة."},502);
    const words=wc(story),estimatedSeconds=Math.max(30,Math.round(words/2.15));
    return json({story,words,duration,estimatedSeconds,model:r.model});
  }catch(e){return json({error:String(e?.message||e)},502)}
}

export async function kidsScenePlan(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await body(request),story=String(b.story||"").trim();
  if(!story)return json({error:"story required"},400);
  const duration=[120,180].includes(Number(b.duration))?Number(b.duration):120;
  const count=duration===180?18:12;
  const prompt=`قسّم قصة الأطفال التالية إلى ${count} مقطعًا سرديًا متتابعًا يغطي النص بالترتيب. أعد JSON array فقط، وكل عنصر {"narration":"...","prompt":"..."}. narration من نفس القصة دون تكرار أو أحداث جديدة. prompt بالإنجليزية يصف الصورة المطابقة، وثبّت وصف الشخصيات عبر المشاهد. الأسلوب: high-end cinematic 3D animated family film, expressive faces, soft cinematic lighting, vertical 9:16, no text, no letters, no subtitles, no logos, no watermark.\nالقصة:\n${story}`;
  try{const r=await askFast(env,prompt,3000),scenes=parseScenePlan(r.text,count);if(scenes.length<Math.max(8,count-2))return json({error:`تم تخطيط ${scenes.length} مشاهد فقط`},502);return json({scenes,count:scenes.length,duration})}catch(e){return json({error:String(e?.message||e)},502)}
}
