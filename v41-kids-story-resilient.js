import {kidsStoryGenerate as baseStory,kidsScenePlan} from './v31-kids-story-fast.js';

const POLLI_CHAT='https://gen.pollinations.ai/v1/chat/completions';
const MODELS=['openai-fast','gemini-fast'];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=s=>String(s||'').replace(/^```(?:json|text)?\s*/i,'').replace(/\s*```$/i,'').trim();
const wc=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
const typeLabel={auto:'تلقائي',children:'أطفال',islamic:'إسلامية',religious:'دينية ووعظية',educational:'تعليمية',moral:'تربوية وقيم',adventure:'مغامرات',historical:'تاريخية',fantasy:'خيال وفانتازيا',social:'اجتماعية',science:'علمية'};
function parse(raw,requested='auto'){
  const c=clean(raw);let d=null;try{d=JSON.parse(c)}catch{}
  if(d&&typeof d==='object'&&String(d.story||d.text||'').trim())return{story:String(d.story||d.text).trim(),category:String(d.category||requested||'auto')};
  return{story:c,category:requested||'auto'};
}
async function polli(env,prompt,maxTokens){
  if(!env.POLLINATIONS_API_KEY)throw new Error('POLLINATIONS_API_KEY is not configured');
  let last='';
  for(const model of MODELS){
    try{
      const r=await fetch(POLLI_CHAT,{method:'POST',headers:{authorization:`Bearer ${env.POLLINATIONS_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:.55,max_tokens:maxTokens,stream:false})});
      const d=await r.json().catch(()=>({}));if(!r.ok){last=String(d?.error?.message||d?.error||`Pollinations ${model} ${r.status}`);continue}
      const text=clean(d?.choices?.[0]?.message?.content||d?.response||d?.text||'');if(text)return{text,model};last='empty response';
    }catch(e){last=String(e?.message||e)}
  }
  throw new Error(last||'Pollinations generation failed');
}
async function forceFullStory(env,b){
  const duration=Number(b.duration)===180?180:120,target=duration===180?390:260,min=duration===180?340:225,max=duration===180?430:295,requested=String(b.category||'auto');
  const prompt=`اكتب قصة عربية كاملة جاهزة للتعليق الصوتي عن الموضوع التالي بالضبط، ولا تغيّر الموضوع أو تستبدله بموضوع آخر:\n${String(b.idea||'').trim()}\n\nالمدة المطلوبة: ${Math.round(duration/60)} دقيقة. المطلوب بين ${min} و${max} كلمة، والهدف ${target} كلمة تقريبًا. الجمهور: ${String(b.age||'تلقائي')}. أسلوب السرد: ${String(b.tone||'طبيعي قصصي')}. التصنيف المطلوب: ${typeLabel[requested]||'يحدد تلقائيًا'}. إذا كان الموضوع عن رضا الوالدين أو بر الوالدين فاجعل المحور الأساسي هو احترام الوالدين، الإحسان إليهما، الاعتذار عند الخطأ، وخاتمة مؤثرة توضح أثر رضا الوالدين بدون اختلاق آيات أو أحاديث. ابدأ بخطاف قوي ثم أحداث مترابطة ثم موقف تحوّل ثم نهاية مرضية. لا تستخدم عناوين أو نقاط أو تعليمات تقنية، ولا تذكر اسم المنصة، ولا تكرر الجمل. أعد JSON فقط بهذا الشكل: {"category":"category_key","story":"نص القصة الكامل"}`;
  let best={story:'',category:requested,model:''};
  for(let i=0;i<2;i++){
    const r=await polli(env,i?`${prompt}\nمهم جدًا: المحاولة السابقة كانت قصيرة؛ التزم الآن بعدد الكلمات المطلوب كاملًا.`:prompt,duration===180?1800:1350),p=parse(r.text,requested);if(wc(p.story)>wc(best.story))best={...p,model:r.model};if(wc(best.story)>=min)break;
  }
  if(wc(best.story)<min&&best.story){
    const need=Math.max(80,target-wc(best.story));
    try{
      const r=await polli(env,`وسّع القصة التالية دون تغيير موضوعها أو شخصياتها. أضف أحداثًا طبيعية وحوارًا قصيرًا وموقف تحوّل وخاتمة أقوى حتى يصبح النص النهائي حوالي ${target} كلمة. لا تعيد البداية ولا تكرر الجمل. أعد القصة كاملة فقط بدون JSON.\n\n${best.story}`,duration===180?1750:1300);if(wc(r.text)>wc(best.story))best.story=clean(r.text);
    }catch{}
  }
  const words=wc(best.story);if(!words)throw new Error('تعذر إنشاء القصة من المصدر البديل');
  const category=typeLabel[best.category]?best.category:(requested==='auto'?'moral':requested),estimatedSeconds=Math.max(30,Math.round(words/2.15));
  return{story:best.story,words,duration,estimatedSeconds,category,categoryLabel:typeLabel[category]||'قصة',model:`pollinations:${best.model}`,provider:'pollinations',warning:words<min?'النص أقصر قليلًا من الهدف لكنه صالح للمتابعة.':''};
}
export async function kidsStoryGenerate(request,env){
  let body={};try{body=await request.clone().json()}catch{}
  const first=await baseStory(request,env);
  if(first.ok)return first;
  let err={};try{err=await first.clone().json()}catch{}
  const message=String(err?.error||'');
  const shouldRecover=/أقصر من المدة|4006|allocation|neurons|quota/i.test(message);
  if(!shouldRecover||!env.POLLINATIONS_API_KEY)return first;
  try{return json(await forceFullStory(env,body))}catch(e){return json({error:String(e?.message||e)},502)}
}
export {kidsScenePlan};
