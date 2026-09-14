import {kidsStoryGenerate as baseStory,kidsScenePlan} from './v31-kids-story-fast.js';

const POLLI_CHAT='https://gen.pollinations.ai/v1/chat/completions';
const MODELS=['openai-fast','gemini-fast'];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=s=>String(s||'').replace(/^```(?:json|text)?\s*/i,'').replace(/\s*```$/i,'').trim();
const wc=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
const typeLabel={auto:'تلقائي',children:'أطفال',islamic:'إسلامية',religious:'دينية ووعظية',educational:'تعليمية',moral:'تربوية وقيم',adventure:'مغامرات',historical:'تاريخية',fantasy:'خيال وفانتازيا',social:'اجتماعية',science:'علمية'};
const BAD_STORY=/(كما طلبت|أؤكد|بحاجة إلى النص|انسخ القصة|أرسل القصة|إذا رغبت|يمكنني (?:أن )?|يرجى|لأتمكن|المحاولة السابقة|عدد الكلمات المطلوب|سأكتب|سوف أكتب|لا أملك النص|زوّدني بالنص|أحتاج النص الأصلي|تفضل.{0,12}(?:القصة|النص))/i;
function parse(raw,requested='auto'){
  const c=clean(raw);let d=null;try{d=JSON.parse(c)}catch{}
  if(d&&typeof d==='object'&&String(d.story||d.text||'').trim())return{story:String(d.story||d.text).trim(),category:String(d.category||requested||'auto')};
  return{story:c,category:requested||'auto'};
}
function validStory(text,minWords=0){const t=clean(text),n=wc(t);return !!t&&!BAD_STORY.test(t)&&n>=Math.max(45,minWords)}
function ideaAnchor(idea){
  const s=String(idea||'').trim();
  if(/رضا الوالدين|بر الوالدين|الوالدين/.test(s))return 'الموضوع الإجباري: رضا الوالدين وبرّهما. اجعل البطل يمر بموقف واقعي مع أمه أو أبيه، يخطئ أو يتردد، ثم يدرك قيمة الإحسان والاعتذار والطاعة في المعروف، وتنتهي القصة بأثر رضا الوالدين عليه. لا تحوّل الموضوع إلى قصة عامة عن الصداقة أو المغامرة.';
  return `الموضوع الإجباري هو: ${s}. لا تغيّره ولا تستبدله بموضوع آخر.`;
}
async function polli(env,prompt,maxTokens){
  if(!env.POLLINATIONS_API_KEY)throw new Error('POLLINATIONS_API_KEY is not configured');
  let last='';
  for(const model of MODELS){
    try{
      const r=await fetch(POLLI_CHAT,{method:'POST',headers:{authorization:`Bearer ${env.POLLINATIONS_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'أنت كاتب قصص عربي. عندما يطلب منك قصة، اكتب القصة نفسها مباشرة فقط. لا تشرح ما ستفعله، ولا تطلب نصًا سابقًا، ولا تذكر التعليمات أو عدد الكلمات.'},{role:'user',content:prompt}],temperature:.62,max_tokens:maxTokens,stream:false})});
      const d=await r.json().catch(()=>({}));if(!r.ok){last=String(d?.error?.message||d?.error||`Pollinations ${model} ${r.status}`);continue}
      const text=clean(d?.choices?.[0]?.message?.content||d?.response||d?.text||'');if(text)return{text,model};last='empty response';
    }catch(e){last=String(e?.message||e)}
  }
  throw new Error(last||'Pollinations generation failed');
}
async function appendContinuation(env,current,idea,remaining,category){
  const want=Math.max(90,Math.min(170,remaining+35));
  const prompt=`أكمل القصة التالية من آخر حدث مباشرة. اكتب فقط أحداث القصة الجديدة، بلا مقدمة تفسيرية وبلا عبارات مثل "كما طلبت" أو "يمكنني". لا تعِد البداية ولا تلخص ما سبق. حافظ على نفس الشخصيات والموضوع والتصنيف. ${ideaAnchor(idea)} التصنيف: ${typeLabel[category]||'قصة'}. اكتب تقريبًا ${want} كلمة، واجعل النهاية واضحة ومؤثرة إذا كانت القصة قاربت على الاكتمال.\n\nالقصة حتى الآن:\n${current}`;
  const r=await polli(env,prompt,1000),part=clean(r.text);return validStory(part,55)?{text:part,model:r.model}:null;
}
async function forceFullStory(env,b){
  const duration=Number(b.duration)===180?180:120,target=duration===180?390:260,min=duration===180?340:225,max=duration===180?430:295,requested=String(b.category||'auto');
  const anchor=ideaAnchor(b.idea);
  const prompt=`اكتب قصة عربية كاملة جاهزة للتعليق الصوتي. ${anchor}\nالمدة المطلوبة: ${Math.round(duration/60)} دقيقة. الجمهور: ${String(b.age||'تلقائي')}. أسلوب السرد: ${String(b.tone||'طبيعي قصصي')}. التصنيف: ${typeLabel[requested]||'يحدد تلقائيًا'}.\nابدأ فورًا بمشهد قصصي وشخصية وحدث؛ لا تقل "سأكتب" أو "كما طلبت" ولا تطلب أي معلومات إضافية. اكتب بين ${Math.max(150,Math.round(min*.72))} و${max} كلمة في المحاولة الأولى، مع خطاف، أحداث مترابطة، موقف تحوّل، ونهاية ذات معنى. لا عناوين ولا نقاط ولا تعليمات تقنية ولا ذكر للمنصة. إذا كان الموضوع دينيًا أو أخلاقيًا فلا تختلق آية أو حديثًا. أعد JSON فقط: {"category":"category_key","story":"نص القصة نفسه"}`;
  let best={story:'',category:requested,model:''};
  for(let i=0;i<3;i++){
    const extra=i===0?'':`\nهذه محاولة جديدة مستقلة. تجاهل أي رد سابق وابدأ القصة نفسها فورًا. ${anchor}`;
    try{
      const r=await polli(env,prompt+extra,duration===180?1800:1450),p=parse(r.text,requested),story=clean(p.story);
      if(validStory(story,70)&&wc(story)>wc(best.story))best={story,category:p.category,model:r.model};
      if(wc(best.story)>=min)break;
    }catch{}
  }
  if(!validStory(best.story,70))throw new Error('المصدر البديل لم يُرجع قصة فعلية. أعد المحاولة بعد لحظات.');
  let guard=0;
  while(wc(best.story)<min&&guard<3){
    guard++;
    try{
      const cont=await appendContinuation(env,best.story,b.idea,target-wc(best.story),best.category||requested);
      if(!cont)continue;
      const combined=clean(`${best.story} ${cont.text}`);if(wc(combined)>wc(best.story)){best.story=combined;best.model=cont.model}
    }catch{}
  }
  let words=wc(best.story);
  if(words>max+45){
    try{
      const r=await polli(env,`اختصر القصة التالية إلى نحو ${target} كلمة فقط مع الحفاظ على جميع الأحداث الأساسية والنهاية. أعد القصة نفسها فقط بلا شرح أو عنوان.\n\n${best.story}`,1500),shorter=clean(r.text);if(validStory(shorter,min-25)&&wc(shorter)<words){best.story=shorter;words=wc(shorter)}
    }catch{}
  }
  words=wc(best.story);
  if(words<Math.round(min*.78))throw new Error('تعذر الوصول لطول قصة مناسب. أعد المحاولة.');
  const category=typeLabel[best.category]?best.category:(requested==='auto'?'moral':requested),estimatedSeconds=Math.max(30,Math.round(words/2.15));
  return{story:best.story,words,duration,estimatedSeconds,category,categoryLabel:typeLabel[category]||'قصة',model:`pollinations:${best.model}`,provider:'pollinations',warning:words<min?'القصة أقصر قليلًا من الهدف لكن محتواها كامل.':''};
}
export async function kidsStoryGenerate(request,env){
  let body={};try{body=await request.clone().json()}catch{}
  const first=await baseStory(request,env);
  if(first.ok){
    let data={};try{data=await first.clone().json()}catch{}
    const duration=Number(body.duration)===180?180:120,min=duration===180?340:225;
    if(validStory(data?.story,Math.round(min*.72)))return first;
  }
  let err={};try{err=await first.clone().json()}catch{}
  const message=String(err?.error||'');
  const shouldRecover=first.ok||/أقصر من المدة|4006|allocation|neurons|quota|generation|provider/i.test(message);
  if(!shouldRecover||!env.POLLINATIONS_API_KEY)return first;
  try{return json(await forceFullStory(env,body))}catch(e){return json({error:String(e?.message||e)},502)}
}
export {kidsScenePlan};
