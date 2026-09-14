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

const TYPES={
  auto:{ar:"تلقائي"},
  children:{ar:"أطفال",rule:"قصة آمنة وممتعة وواضحة، مناسبة للجمهور المحدد، بلا عنف مخيف أو محتوى غير مناسب."},
  islamic:{ar:"إسلامية",rule:"قصة إسلامية محترمة تركز على القيم والسلوك. لا تختلق آية أو حديثًا أو تنسب قولًا للنبي دون يقين، ولا تخترع واقعة دينية على أنها حقيقة."},
  religious:{ar:"دينية ووعظية",rule:"قصة دينية أو وعظية هادئة تركز على العبرة والقيم، مع تجنب اختلاق نصوص مقدسة أو ادعاءات دينية غير موثوقة."},
  educational:{ar:"تعليمية",rule:"قصة تعليمية ممتعة تشرح فكرة أو مهارة من خلال أحداث وشخصيات، لا تتحول لمحاضرة مباشرة."},
  moral:{ar:"تربوية وقيم",rule:"قصة تربوية طبيعية تظهر القيمة من خلال الحدث والنتيجة بدون وعظ ثقيل."},
  adventure:{ar:"مغامرات",rule:"مغامرة مشوقة وآمنة، فيها هدف وعقبات وحل واضح، بلا عنف دموي أو رعب قاسٍ."},
  historical:{ar:"تاريخية",rule:"قصة تاريخية تحافظ على الفصل بين الحقائق المؤكدة والتفاصيل الدرامية، ولا تقدم تفاصيل مخترعة على أنها حقائق."},
  fantasy:{ar:"خيال وفانتازيا",rule:"قصة خيالية متماسكة بعالم واضح وقواعد مفهومة وشخصيات ثابتة."},
  social:{ar:"اجتماعية",rule:"قصة اجتماعية إنسانية واقعية تركز على العلاقات والمواقف والحلول الطبيعية."},
  science:{ar:"علمية",rule:"قصة علمية مبسطة ودقيقة قدر الإمكان، توظف المعلومة داخل الحدث ولا تقدم ادعاءات زائفة."}
};
function validType(x){return TYPES[x]?x:"auto"}
function toneText(t){return t==="adventure"?"مشوق وسريع":t==="funny"?"مرح وخفيف":t==="dramatic"?"درامي متزن":t==="calm"?"هادئ ودافئ":"طبيعي قصصي"}
function audienceText(age){if(age==="auto")return"يحدد تلقائيًا من الفكرة";if(age==="general")return"جمهور عام";if(age==="teen")return"ناشئة ومراهقون";return `العمر ${age} سنوات`}
function parseStoryResult(raw,requested){
  const c=clean(raw);let data=null;try{data=JSON.parse(c)}catch{}
  if(data&&typeof data==="object"){
    const story=String(data.story||data.text||"").trim();
    const category=validType(String(data.category||requested||"auto"));
    if(story)return{story,category};
  }
  const m=c.match(/^CATEGORY\s*:\s*([a-z_-]+)\s*[\r\n]+([\s\S]*)$/i);
  if(m)return{category:validType(m[1]),story:m[2].trim()};
  return{category:requested==="auto"?"children":validType(requested),story:c};
}
function visualStyle(type){
  if(type==="historical")return"cinematic historical visual storytelling, period-appropriate clothing and environments, rich natural lighting";
  if(type==="islamic"||type==="religious")return"respectful cinematic visual storytelling, warm natural lighting, elegant environments, no depiction of any person as a prophet";
  if(type==="educational"||type==="science")return"cinematic educational storytelling, clear visual focus, expressive characters, polished 3D illustration";
  if(type==="social")return"cinematic human-centered storytelling, natural environments, expressive faces, polished 3D illustration";
  return"high-end cinematic 3D animated family-film storytelling, expressive faces, soft cinematic lighting";
}

export async function kidsStoryGenerate(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await body(request),idea=String(b.idea||"").trim();
  if(!idea)return json({error:"اكتب فكرة القصة أولًا."},400);
  const duration=[120,180].includes(Number(b.duration))?Number(b.duration):120;
  const age=String(b.age||"auto").slice(0,20),tone=String(b.tone||"natural").slice(0,30),requested=validType(String(b.category||"auto"));
  const target=duration===180?390:260,min=duration===180?340:225,max=duration===180?430:295;
  const typeList=Object.entries(TYPES).filter(([k])=>k!=="auto").map(([k,v])=>`${k}=${v.ar}`).join("، ");
  const fixed=requested==="auto"?"حدّد أنت التصنيف الأنسب من الفكرة قبل الكتابة.":`التصنيف المطلوب ثابت: ${requested} (${TYPES[requested].ar}).`;
  const rule=requested==="auto"?"طبّق قواعد التصنيف الذي تختاره بدقة.":TYPES[requested].rule;
  const prompt=`أنت مؤلف قصص عربية محترف. حوّل الوصف القصير إلى قصة كاملة جاهزة للتعليق الصوتي.\nالفكرة: ${idea}\nالجمهور: ${audienceText(age)}\nأسلوب السرد: ${toneText(tone)}\nالمدة المستهدفة: ${Math.round(duration/60)} دقيقة.\nالتصنيفات المتاحة: ${typeList}.\n${fixed}\n${rule}\nاكتب تقريبًا ${target} كلمة، ولا تقل عن ${min} ولا تتجاوز ${max}. ابدأ بخطاف سريع، ثم أحداث مترابطة واضحة، ثم حل ونهاية مرضية. حافظ على أسماء الشخصيات وصفاتها. اجعل الجمل طبيعية ومسموعة. ممنوع التكرار والحشو والعناوين والترقيم والتعليمات التقنية. لا تذكر اسم المنصة.\nأعد JSON فقط بهذا الشكل: {"category":"category_key","story":"نص الراوي الكامل"}`;
  try{
    let r=await askFast(env,prompt,duration===180?1600:1200),parsed=parseStoryResult(r.text,requested),story=dedupe(parsed.story),category=validType(parsed.category),words=wc(story);
    if(words<min){
      const expand=`أعد كتابة القصة التالية بنفس الأحداث والشخصيات والتصنيف، لكن وسّعها طبيعيًا لتكون بين ${min} و${max} كلمة، بدون حشو أو تكرار، وبنفس أسلوب التعليق الصوتي. لا تضف عناوين أو ترقيم. أعد نص القصة فقط.\n\n${story}`;
      const ex=await askFast(env,expand,duration===180?1550:1150);const longer=dedupe(ex.text);if(wc(longer)>words){story=longer;words=wc(story);r=ex}
    }
    if(words<Math.round(min*.72))return json({error:"خرج نص أقصر من المدة المطلوبة. أعد المحاولة."},502);
    const estimatedSeconds=Math.max(30,Math.round(words/2.15));
    return json({story,words,duration,estimatedSeconds,category,categoryLabel:TYPES[category]?.ar||"قصة",model:r.model});
  }catch(e){return json({error:String(e?.message||e)},502)}
}

export async function kidsScenePlan(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const b=await body(request),story=String(b.story||"").trim();
  if(!story)return json({error:"story required"},400);
  const duration=[120,180].includes(Number(b.duration))?Number(b.duration):120,category=validType(String(b.category||"auto"));
  const count=duration===180?18:12,style=visualStyle(category);
  const religiousGuard=(category==="islamic"||category==="religious")?" إذا ورد نبي أو شخصية مقدسة فلا تُظهر النبي أو تمثله بصريًا؛ استخدم البيئة والرموز واللقطات غير المباشرة باحترام.":"";
  const prompt=`قسّم القصة التالية إلى ${count} مقطعًا سرديًا متتابعًا يغطي النص بالترتيب. أعد JSON array فقط، وكل عنصر {"narration":"...","prompt":"..."}. narration من نفس القصة دون تكرار أو أحداث جديدة. prompt بالإنجليزية يصف الصورة المطابقة، وثبّت وصف الشخصيات والملابس والألوان عبر المشاهد. في كل prompt اذكر الشخصيات الموجودة في هذا المشهد فقط، وحدد عددها بوضوح. ممنوع تكرار أو استنساخ نفس الشخصية داخل الصورة أو عمل twin/clone/mirror duplicate إلا إذا القصة نفسها تتطلب شخصين مختلفين. غيّر المكان والخلفية وزاوية الكاميرا بما يطابق الحدث بدل إعادة نفس الشارع أو نفس التكوين في كل المشاهد. التصنيف: ${TYPES[category]?.ar||"تلقائي"}. الأسلوب البصري: ${style}, vertical 9:16, no text, no letters, no subtitles, no logos, no watermark.${religiousGuard}\nالقصة:\n${story}`;
  try{const r=await askFast(env,prompt,3200),scenes=parseScenePlan(r.text,count);if(scenes.length<Math.max(8,count-2))return json({error:`تم تخطيط ${scenes.length} مشاهد فقط`},502);return json({scenes,count:scenes.length,duration,category,categoryLabel:TYPES[category]?.ar||"قصة"})}catch(e){return json({error:String(e?.message||e)},502)}
}
