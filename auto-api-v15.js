const MODELS=["@cf/zai-org/glm-4.7-flash","@cf/google/gemma-4-26b-a4b-it","@cf/meta/llama-3.2-3b-instruct"];
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const textOf=x=>typeof x==="string"?x:(x?.response||x?.text||x?.result?.response||x?.choices?.[0]?.message?.content||"");
const wc=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
const guide=t=>t==="Calm"?"هادئ دافئ وواثق، بإحساس واضح ومن غير نعاس":t==="Energetic"?"متحمس ومشوق وواضح من غير صراخ":"طبيعي دافئ ومشوق كراوي قصص محترف";
async function ask(env,prompt,task){let last="";for(const model of MODELS){try{const out=await env.AI.run(model,{messages:[{role:"user",content:prompt}],max_completion_tokens:task==="script"||task==="durationfix"?1000:task==="visuals"?1200:task==="voice"?8:350,temperature:task==="visuals"?.18:task==="voice"?.1:.55,stream:false});const t=String(textOf(out)||"").trim();if(t)return{t,model};last=model+": empty"}catch(e){last=String(e?.message||e)}}throw new Error(last||"generation failed")}
export async function generateV15(request,env){
 if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
 let b={};try{b=await request.json()}catch{}
 const task=String(b.task||"script"),topic=String(b.topic||"").trim(),platform=String(b.platform||"TikTok"),tone=String(b.tone||"Natural"),script=String(b.script||"").trim();if(!topic)return json({error:"topic required"},400);
 const duration=Number(b.durationSeconds)||45,current=Number(b.currentDuration)||0,sceneCount=Math.max(6,Math.min(10,Number(b.sceneCount)||Math.ceil(duration/6))),g=guide(tone),detailed=topic.length>120;
 const initialTarget=Math.max(55,Math.round(duration*2.15)-12),initialMin=Math.max(50,Math.round(initialTarget*.96)),initialMax=Math.round(initialTarget*1.04);
 let prompt="";
 if(task==="idea")prompt=`حوّل الفكرة التالية إلى فكرة قصة أطفال قصيرة ومؤثرة ومناسبة لفيديو رأسي: ${topic}. الأسلوب: ${g}. حافظ على الفكرة الأصلية ولا تضف عناوين أو تعليمات تصوير.`;
 else if(task==="caption")prompt=`اكتب كابشن عربي قصير وجذاب لقصة أطفال عن: ${topic}. أضف 5 هاشتاقات مناسبة. أعد الكابشن فقط.`;
 else if(task==="voice")prompt=`اختر صوت الراوي الأنسب لهذه القصة من حيث الإحساس فقط. أعد كلمة إنجليزية واحدة فقط: male أو female.\nالقصة: ${script.slice(0,4200)}`;
 else if(task==="durationfix"){
   const words=wc(script),ratio=current>1?duration/current:1,desired=Math.max(45,Math.min(180,Math.round(words*ratio))),min=Math.max(40,desired-3),max=desired+3;
   prompt=`أعد صياغة قصة الأطفال التالية لتصبح مناسبة لصوت مدته ${duration} ثانية تقريبًا. مدة الصوت الحالية ${current||"غير معروفة"} ثانية. عدد كلمات النص الحالي ${words}. اجعل النص الجديد بين ${min} و${max} كلمة عربية. حافظ على كل الأحداث والشخصيات والترتيب والنهاية. إذا احتجت للزيادة أضف وصفًا وحوارًا طبيعيًا من نفس القصة، وإذا احتجت للاختصار احذف التكرار فقط ولا تحذف حدثًا. اكتب النص المنطوق فقط بلا عنوان أو شرح.\n${script.slice(0,6000)}`;
 }
 else if(task==="visuals")prompt=`حوّل قصة الأطفال التالية إلى ${sceneCount} مشاهد رسوم ثلاثية الأبعاد سينمائية متتابعة زمنيًا. أعد ${sceneCount} أسطر إنجليزية فقط بلا ترقيم. كل سطر 28 إلى 45 كلمة ويصلح مباشرة كـ image generation prompt. قبل الكتابة حدد داخليًا وصفًا ثابتًا ودقيقًا للبطل أو الأبطال: العمر التقريبي، لون الشعر، الملابس وألوانها، ثم كرر نفس وصف الشخصيات حرفيًا في كل سطر تظهر فيه الشخصية حتى تظل متسقة. كل سطر يجب أن يصور حدثًا حقيقيًا مختلفًا من القصة بالترتيب، مع المكان والوقت والتعبير العاطفي والإضاءة المناسبة. الأسلوب في كل سطر: high-end cinematic 3D animated family film, expressive rounded characters, colorful soft lighting, vertical 9:16. ممنوع أي كتابة أو حروف أو شعارات داخل الصورة. لا تضف أحداثًا غير موجودة.\nالقصة: ${script.slice(0,6000)}`;
 else prompt=`اكتب قصة أطفال عربية قصيرة متماسكة تصلح لتعليق صوتي مدته ${duration} ثانية. الأسلوب: ${g}. ${detailed?"المستخدم أدخل قصة أو تفاصيل بالفعل؛ حافظ على جميع الأحداث والشخصيات والترتيب والنهاية ولا تختصرها، فقط حسّن السرد ووسّع التفاصيل الطبيعية عند الحاجة.":"حوّل الفكرة إلى قصة كاملة ببداية واضحة وحدث وتطور ونهاية مرضية."} اجعل متن القصة بين ${initialMin} و${initialMax} كلمة عربية. استخدم جملًا واضحة وسهلة النطق، وأسماء بسيطة، وعلامات ترقيم تساعد الراوي على الوقفات الطبيعية. ابدأ بالقصة مباشرة. ممنوع قول: السكربت، النص، التعليق الصوتي، المقدمة، المشهد، إليك. لا تعليمات تصوير ولا عناوين.`;
 try{const r=await ask(env,prompt,task),t=r.t.replace(/^```(?:json|text)?\s*|\s*```$/g,"").trim();return json({text:t,model:r.model,task,words:wc(t)})}catch(e){return json({error:String(e?.message||e)},502)}
}
