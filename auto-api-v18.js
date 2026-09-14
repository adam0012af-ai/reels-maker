const MODELS=["@cf/google/gemma-4-26b-a4b-it","@cf/meta/llama-3.2-3b-instruct","@cf/zai-org/glm-4.7-flash"];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const textOf=x=>typeof x==="string"?x:(x?.response||x?.text||x?.result?.response||x?.choices?.[0]?.message?.content||"");
const wc=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
const norm=s=>String(s||"").toLowerCase().replace(/[\u064B-\u065F\u0670]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();

export function dedupeNarration(input){
  let text=String(input||"").replace(/^```(?:json|text)?\s*|\s*```$/g,"").trim();
  if(!text)return"";
  const raw=text.split(/\n+|(?<=[.!؟])\s+/).map(s=>s.trim()).filter(Boolean);
  const seen=new Set(),out=[];
  for(const s of raw){
    const n=norm(s);
    if(!n||n.length<3)continue;
    if(seen.has(n))continue;
    let duplicate=false;
    for(const p of seen){if(n.length>24&&p.length>24&&(n.includes(p)||p.includes(n))){duplicate=true;break}}
    if(duplicate)continue;
    seen.add(n);out.push(s);
  }
  return out.join(" ").replace(/\s+([،,.!؟])/g,"$1").replace(/\s+/g," ").trim();
}

function quality(text,minWords=0){
  const cleaned=dedupeNarration(text),words=wc(cleaned);
  const parts=cleaned.split(/(?<=[.!؟])\s+/).filter(Boolean),unique=new Set(parts.map(norm)).size;
  return{cleaned,words,ok:words>=minWords&&(!parts.length||unique/parts.length>.85)};
}

async function askOne(env,model,prompt,max=1100,temp=.5){
  const out=await env.AI.run(model,{messages:[{role:"user",content:prompt}],max_completion_tokens:max,temperature:temp,stream:false});
  return String(textOf(out)||"").trim();
}
async function askBest(env,prompt,{minWords=0,max=1100,temp=.5}={}){
  let best="",bestScore=-1,last="";
  for(const model of MODELS){
    try{
      const raw=await askOne(env,model,prompt,max,temp),q=quality(raw,minWords);
      const score=q.words+(q.ok?10000:0);
      if(score>bestScore){best=q.cleaned;bestScore=score}
      if(q.ok)return{text:q.cleaned,model};
    }catch(e){last=String(e?.message||e)}
  }
  if(best)return{text:best,model:"fallback-best"};
  throw new Error(last||"generation failed");
}

const guide=t=>t==="Calm"?"هادئ دافئ وواثق، لكن يقظ وواضح ومن غير نعاس":t==="Energetic"?"متحمس ومشوق وواضح من غير صراخ":"طبيعي دافئ ومشوق كراوي قصص محترف";

export async function generateV18(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  let b={};try{b=await request.json()}catch{}
  const task=String(b.task||"script"),topic=String(b.topic||"").trim(),platform=String(b.platform||"TikTok"),tone=String(b.tone||"Natural"),script=dedupeNarration(b.script||"");
  if(!topic)return json({error:"topic required"},400);
  const duration=Number(b.durationSeconds)||45,current=Number(b.currentDuration)||0,sceneCount=Math.max(6,Math.min(10,Number(b.sceneCount)||Math.ceil(duration/6))),g=guide(tone),detailed=topic.length>120;
  const target=Math.max(58,Math.round(duration*2.05)-8),min=Math.max(50,target-6),max=target+8;
  let prompt="",minWords=0,maxTokens=1100,temp=.5;
  if(task==="idea"){
    prompt=`حوّل الفكرة التالية إلى فكرة واحدة لقصة أطفال قصيرة ومؤثرة. حافظ على الفكرة الأصلية. لا تكرر أي جملة أو معنى. اكتب فكرة واحدة فقط بالعربية بلا عناوين:\n${topic}`;
  }else if(task==="caption"){
    prompt=`اكتب كابشن عربي قصير وجذاب للقصة التالية مع 5 هاشتاقات مناسبة. لا تكرر الجمل. أعد الكابشن فقط:\n${topic}`;
  }else if(task==="voice"){
    prompt=`اختر الراوي الأنسب لهذه القصة من حيث الإحساس فقط. أعد كلمة واحدة فقط male أو female.\n${script||topic}`;maxTokens=12;temp=.1;
  }else if(task==="visuals"){
    prompt=`حوّل القصة التالية إلى ${sceneCount} مشاهد رسوم 3D سينمائية متتابعة. أعد بالضبط ${sceneCount} أسطر إنجليزية بلا ترقيم. كل سطر يصور حدثًا مختلفًا حقيقيًا من القصة وبالترتيب. حافظ على نفس وصف الشخصيات والملابس حرفيًا عبر المشاهد. ممنوع تكرار نفس الحدث أو نفس الوصف كمشهد جديد. كل سطر 24 إلى 42 كلمة، vertical 9:16, high-end cinematic 3D animated family film, no text, no logo.\nالقصة: ${script||topic}`;maxTokens=1400;temp=.25;
  }else if(task==="durationfix"){
    const words=Math.max(1,wc(script)),ratio=current>1?duration/current:1,desired=Math.max(50,Math.min(175,Math.round(words*ratio))),lo=Math.max(45,desired-5),hi=desired+5;minWords=Math.max(35,lo-8);
    prompt=`أعد كتابة القصة التالية لتناسب تعليقًا صوتيًا مدته حوالي ${duration} ثانية. مدة النسخة الحالية ${current||"غير معروفة"} ثانية. اجعلها بين ${lo} و${hi} كلمة عربية. حافظ على كل الأحداث والشخصيات وترتيبها والنهاية، لكن ممنوع تمامًا تكرار أي جملة أو حدث أو معنى لملء المدة. كل جملة يجب أن تضيف معلومة أو حركة أو إحساسًا جديدًا. إذا احتجت زيادة، أضف تفاصيل منطقية جديدة من نفس القصة أو حوارًا قصيرًا، ولا تكرر صياغة سابقة. اكتب القصة فقط بلا عنوان أو شرح.\n${script}`;
  }else{
    minWords=Math.max(40,min-12);
    prompt=`اكتب قصة أطفال عربية متماسكة تصلح لتعليق صوتي مدته حوالي ${duration} ثانية وبأسلوب ${g}. ${detailed?"المستخدم أدخل قصة مفصلة؛ حافظ على جميع أحداثها وشخصياتها وترتيبها ونهايتها.":"حوّل الفكرة إلى قصة كاملة ببداية واضحة، مشكلة أو حدث، تطور، ثم نهاية مرضية."} اجعلها بين ${min} و${max} كلمة. استخدم من 7 إلى 10 جمل مختلفة، وكل جملة يجب أن تحرّك القصة للأمام. ممنوع تمامًا تكرار أي جملة أو فقرة أو حدث أو معنى، وممنوع حشو المدة بإعادة نفس الكلام بصياغة مختلفة. استخدم جملًا سهلة النطق وعلامات ترقيم طبيعية. ابدأ بالقصة مباشرة بلا عنوان أو كلمة قصة أو سكربت أو تعليق صوتي.\nالفكرة: ${topic}`;
  }
  try{
    let r=await askBest(env,prompt,{minWords,max:maxTokens,temp});
    let text=task==="voice"?String(r.text).trim():dedupeNarration(r.text);
    if((task==="script"||task==="durationfix")&&wc(text)<minWords){
      const repair=`أعد كتابة النص التالي من الصفر كقصة واحدة متماسكة، مع الاحتفاظ بالأحداث الأصلية. أضف أحداثًا وتفاصيل جديدة منطقية بدل تكرار الكلام. ممنوع أي تكرار حرفي أو معنوي. اجعل النص بين ${Math.max(min,60)} و${max+10} كلمة، في 7 إلى 10 جمل مختلفة، وأعد القصة فقط:\n${text||topic}`;
      const rr=await askBest(env,repair,{minWords:Math.max(40,minWords),max:1200,temp:.65});
      if(wc(rr.text)>wc(text)){text=dedupeNarration(rr.text);r=rr}
    }
    return json({text,model:r.model,task,words:wc(text),deduped:true});
  }catch(e){return json({error:String(e?.message||e)},502)}
}
