import {kidsStoryGenerate as legacyStory,kidsScenePlan} from './v31-kids-story-fast.js';

const API='https://gen.pollinations.ai/v1/chat/completions';
const MODELS=['openai','gemini-fast','openai-fast'];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=s=>String(s||'').replace(/^```(?:json|text)?\s*/i,'').replace(/\s*```$/i,'').trim();
const wc=t=>clean(t).split(/\s+/).filter(Boolean).length;
const META=/(كما طلبت|أؤكد|أحتاج(?: إلى)? النص|أرسل(?: لي)? النص|انسخ القصة|إذا رغبت|يمكنني|سأكتب|سوف أكتب|المحاولة السابقة|عدد الكلمات المطلوب|يرجى|لأتمكن|زوّدني|بحاجة إلى النص)/i;
const LABELS={auto:'تلقائي',children:'أطفال',islamic:'إسلامية',religious:'دينية ووعظية',educational:'تعليمية',moral:'تربوية وقيم',adventure:'مغامرات',historical:'تاريخية',fantasy:'خيال وفانتازيا',social:'اجتماعية',science:'علمية'};
function parseContent(data){return clean(data?.choices?.[0]?.message?.content||data?.response||data?.text||'')}
function parseStory(raw,requested){const c=clean(raw);let d=null;try{d=JSON.parse(c)}catch{};if(d&&typeof d==='object'){const story=clean(d.story||d.text||'');if(story)return{story,category:String(d.category||requested||'auto')}}return{story:c,category:requested||'auto'}}
function isRealStory(text,min=120){const t=clean(text);return !!t&&!META.test(t)&&wc(t)>=min}
function categoryFor(idea,requested){if(requested&&requested!=='auto')return requested;const s=String(idea||'');if(/رضا الوالدين|بر الوالدين|الأم|الاب|الأب/.test(s))return'moral';if(/اسلام|إسلام|صلاة|زكاة|صيام|قرآن/.test(s))return'islamic';if(/تعليم|مدرسة|درس|يتعلم/.test(s))return'educational';if(/مغامر|رحلة|كنز/.test(s))return'adventure';return'moral'}
function topicRules(idea){const s=String(idea||'').trim();if(/رضا الوالدين|بر الوالدين/.test(s))return 'محور القصة الإجباري هو رضا الوالدين وبرّهما. يجب أن تظهر أم أو أب على الأقل، وخطأ أو تقصير من البطل، ثم إدراك واعتذار وإحسان، ثم أثر رضا الوالدين في النهاية. لا تحوّل القصة إلى موضوع آخر.';return `موضوع القصة الإجباري هو: ${s}. لا تغيّر الموضوع ولا تستبدله بموضوع قريب.`}
async function callModel(env,model,messages,maxTokens,useJson=true){const body={model,messages,temperature:.72,max_tokens:maxTokens,stream:false};if(useJson)body.response_format={type:'json_object'};const r=await fetch(API,{method:'POST',headers:{authorization:`Bearer ${env.POLLINATIONS_API_KEY}`,'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(String(data?.error?.message||data?.error||`${model} ${r.status}`));return parseContent(data)}
async function generatePollinations(env,b){
  const idea=String(b.idea||'').trim();if(!idea)throw new Error('اكتب فكرة القصة أولًا.');
  const duration=Number(b.duration)===180?180:120,target=duration===180?390:260,min=duration===180?330:220,max=duration===180?440:310,requested=String(b.category||'auto'),category=categoryFor(idea,requested);
  const system='أنت مؤلف قصص عربية محترف. مهمتك كتابة القصة نفسها مباشرة، لا التحدث مع المستخدم. ممنوع أي مقدمة تفسيرية أو وعد بالكتابة أو طلب معلومات إضافية. يجب أن يكون الناتج قصة فعلية بشخصيات وأحداث ونهاية.';
  const base=`${topicRules(idea)}\nالتصنيف: ${LABELS[category]||'قصة'}. الجمهور: ${String(b.age||'تلقائي')}. أسلوب السرد: ${String(b.tone||'طبيعي قصصي')}. المدة المستهدفة ${Math.round(duration/60)} دقيقة. اكتب بين ${min} و${max} كلمة، والهدف حوالي ${target} كلمة. ابدأ مباشرة بمشهد حي واسم بطل أو شخصية واضحة، ثم مشكلة، ثم تطورين أو ثلاثة، ثم نقطة تحوّل، ثم نهاية مرضية. اجعل النص مناسبًا للتعليق الصوتي وبلا عناوين أو نقاط أو تعليمات. لا تختلق آيات أو أحاديث. أعد JSON فقط بالشكل {"category":"${category}","story":"القصة كاملة"}.`;
  let best={story:'',category,model:''};
  for(const model of MODELS){
    for(let attempt=0;attempt<2;attempt++){
      const extra=attempt?'\nهذه محاولة مستقلة جديدة: اكتب القصة نفسها من الصفر، ولا تذكر أي تعليمات أو عبارة مثل كما طلبت.':'';
      try{
        let raw='';try{raw=await callModel(env,model,[{role:'system',content:system},{role:'user',content:base+extra}],duration===180?1900:1500,true)}catch{raw=await callModel(env,model,[{role:'system',content:system},{role:'user',content:base+extra}],duration===180?1900:1500,false)}
        const p=parseStory(raw,category),n=wc(p.story);if(isRealStory(p.story,100)&&n>wc(best.story))best={story:p.story,category:p.category||category,model};if(n>=min&&!META.test(p.story))break;
      }catch{}
    }
    if(wc(best.story)>=min)break;
  }
  if(!isRealStory(best.story,100))throw new Error('المصدر البديل لم يُرجع قصة فعلية. أعد المحاولة بعد لحظات.');
  if(wc(best.story)<min){
    const need=target-wc(best.story),contPrompt=`أكمل القصة التالية بأحداث فعلية فقط، من آخر حدث مباشرة، بحوالي ${Math.max(90,need+30)} كلمة. لا تعِد البداية ولا تلخص ولا تشرح. حافظ على نفس الشخصيات وموضوع القصة، وأنهِ القصة بنهاية واضحة ومؤثرة.\n\n${best.story}`;
    for(const model of MODELS){try{const part=await callModel(env,model,[{role:'system',content:system},{role:'user',content:contPrompt}],1000,false);if(isRealStory(part,60)){best.story=clean(best.story+' '+part);best.model=model;break}}catch{}}
  }
  const words=wc(best.story);if(words<150)throw new Error('لم يتم إنشاء قصة كافية للطول المطلوب.');
  return{story:best.story,words,duration,estimatedSeconds:Math.max(30,Math.round(words/2.15)),category:LABELS[best.category]?best.category:category,categoryLabel:LABELS[LABELS[best.category]?best.category:category]||'قصة',model:`pollinations:${best.model}`,provider:'pollinations',warning:words<min?'القصة أقصر قليلًا من الهدف لكنها قصة فعلية وصالحة للمتابعة.':''};
}
export async function kidsStoryGenerate(request,env){let b={};try{b=await request.clone().json()}catch{};if(env.POLLINATIONS_API_KEY){try{return json(await generatePollinations(env,b))}catch(e){const polliError=String(e?.message||e);try{const r=await legacyStory(request,env);if(r.ok)return r;let d={};try{d=await r.clone().json()}catch{};return json({error:polliError,legacy:d?.error||undefined},502)}catch{return json({error:polliError},502)}}}return legacyStory(request,env)}
export {kidsScenePlan};
