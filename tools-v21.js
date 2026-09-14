const $=id=>document.getElementById(id);
function set(id,text){const e=$(id);if(e)e.textContent=text||''}
async function jsonPost(url,data){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}

export function initImageTool(){
  $('imageGenerateBtn')?.addEventListener('click',async()=>{const prompt=$('imagePrompt').value.trim(),ref=$('imageRef').files?.[0],btn=$('imageGenerateBtn');if(!prompt)return set('imageStatus','اكتب وصف الصورة أولًا.');btn.disabled=true;set('imageStatus','جاري توليد الصورة...');try{const fd=new FormData();fd.append('prompt',prompt);if(ref)fd.append('reference0',ref,ref.name);const r=await fetch('/api/image',{method:'POST',body:fd});if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`HTTP ${r.status}`)}const blob=await r.blob(),u=URL.createObjectURL(blob),host=$('imageResult');if(host.dataset.url)URL.revokeObjectURL(host.dataset.url);host.dataset.url=u;host.innerHTML=`<img src="${u}" alt="AI image"><a class="primary download" href="${u}" download="reels-maker-ai-image.jpg">تحميل الصورة</a>`;set('imageStatus',`تم · ${r.headers.get('x-rm-image-provider')||'AI'}`)}catch(e){set('imageStatus','خطأ: '+e.message)}finally{btn.disabled=false}})
}

export function initWriterTool(){
  $('writerRunBtn')?.addEventListener('click',async()=>{const text=$('writerInput').value.trim(),btn=$('writerRunBtn');if(!text)return set('writerStatus','اكتب النص أو الفكرة أولًا.');btn.disabled=true;set('writerStatus','جاري تشغيل الذكاء الاصطناعي...');set('writerOutput','—');try{const j=await jsonPost('/api/ai/text',{action:$('writerAction').value,text,language:$('writerLang').value});set('writerOutput',j.text||'—');set('writerStatus',`تم · ${j.model||'AI'}`)}catch(e){set('writerStatus','خطأ: '+e.message)}finally{btn.disabled=false}})
}

export function initTranscribeTool(){
  $('transcribeBtn')?.addEventListener('click',async()=>{const f=$('transcribeFile').files?.[0],btn=$('transcribeBtn');if(!f)return set('transcribeStatus','اختر ملفًا صوتيًا أولًا.');btn.disabled=true;set('transcribeStatus','Whisper يستخرج الكلام...');set('transcribeOutput','—');try{const r=await fetch('/api/transcribe',{method:'POST',headers:{'content-type':f.type||'application/octet-stream','x-language':$('transcribeLang').value},body:f}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);set('transcribeOutput',j.text||'—');set('transcribeStatus',`تم · ${j.model||'Whisper'}`)}catch(e){set('transcribeStatus','خطأ: '+e.message)}finally{btn.disabled=false}})
}