const TYPE_LABELS={auto:'ذكاء اصطناعي — يحدد تلقائيًا',children:'أطفال',islamic:'إسلامية',religious:'دينية ووعظية',educational:'تعليمية',moral:'تربوية وقيم',adventure:'مغامرات',historical:'تاريخية',fantasy:'خيال وفانتازيا',social:'اجتماعية',science:'علمية'};
let lastCategory='auto';
let patched=false;

function $(id){return document.getElementById(id)}
function selectedCategory(){return $('kidsCategory')?.value||'auto'}
function setDetected(key,label){lastCategory=key||'auto';const el=$('kidsDetectedType');if(el)el.innerHTML=`<b>تصنيف القصة:</b> ${label||TYPE_LABELS[lastCategory]||'تلقائي'}`}

function installUi(){
  const section=document.querySelector('[data-page="kids"]');if(!section)return;
  const nav=document.querySelector('[data-route="kids"]');
  if(nav){const b=nav.querySelector('b'),s=nav.querySelector('small');if(b)b.textContent='قصص فيديو AI';if(s)s.textContent='فكرة → تصنيف → قصة → فيديو'}
  const head=section.querySelector('.page-head');
  if(head){const eye=head.querySelector('.eyebrow'),h=head.querySelector('h2'),p=head.querySelector('p');if(eye)eye.textContent='AI STORY STUDIO';if(h)h.textContent='قصص فيديو AI';if(p)p.textContent='اكتب وصفًا بسيطًا، واترك الذكاء الاصطناعي يحدد نوع القصة أو اختر التصنيف بنفسك، ثم أنشئ الصوت والصور والفيديو.'}
  const idea=$('kidsIdea');if(idea){idea.placeholder='مثال: شاب يمر بموقف صعب ويتعلم معنى الأمانة... أو طفل يكتشف سرًا في الغابة... أو قصة عن قيمة الصدق.'}
  const age=$('kidsAge');if(age){age.closest('label')?.replaceChildren(document.createTextNode('الجمهور'),age);age.innerHTML='<option value="auto" selected>تلقائي حسب الفكرة</option><option value="4-7">أطفال 4–7 سنوات</option><option value="6-10">أطفال 6–10 سنوات</option><option value="9-12">أطفال 9–12 سنة</option><option value="teen">ناشئة</option><option value="general">جمهور عام</option>'}
  const tone=$('kidsTone');if(tone){tone.closest('label')?.replaceChildren(document.createTextNode('أسلوب السرد'),tone);tone.innerHTML='<option value="natural" selected>طبيعي قصصي</option><option value="calm">هادئ ودافئ</option><option value="adventure">مشوق وسريع</option><option value="dramatic">درامي</option><option value="funny">مرح وخفيف</option>'}
  if(!$('kidsCategory')){
    const label=document.createElement('label');label.innerHTML='تصنيف القصة<select id="kidsCategory"><option value="auto" selected>✨ تلقائي — AI يحدد من الوصف</option><option value="children">🧒 أطفال</option><option value="islamic">☪️ إسلامية</option><option value="religious">🕌 دينية ووعظية</option><option value="educational">📘 تعليمية</option><option value="moral">🌱 تربوية وقيم</option><option value="adventure">🗺️ مغامرات</option><option value="historical">🏛️ تاريخية</option><option value="fantasy">✨ خيال وفانتازيا</option><option value="social">🤝 اجتماعية</option><option value="science">🔬 علمية</option></select>';
    const toneLabel=$('kidsTone')?.closest('label');toneLabel?.insertAdjacentElement('beforebegin',label);
    const badge=document.createElement('div');badge.id='kidsDetectedType';badge.className='status';badge.innerHTML='<b>تصنيف القصة:</b> سيتم تحديده تلقائيًا من الوصف.';label.insertAdjacentElement('afterend',badge);
    $('kidsCategory')?.addEventListener('change',()=>{const v=selectedCategory();lastCategory=v;setDetected(v,v==='auto'?'سيتم تحديده تلقائيًا من الوصف':TYPE_LABELS[v])});
  }
  const copy=section.querySelector('.kids-preview-copy');if(copy)copy.textContent='سيقول الراوي اسم ريلز ميكر إيه آي في تجربة قصيرة قبل إنشاء القصة.';
  const outro=section.querySelector('.kids-outro b');if(outro)outro.textContent='الخاتمة الصوتية الثابتة';
  const download=$('kidsDownload');if(download)download.setAttribute('download','reels-maker-ai-story.webm');
}

function patchFetch(){
  if(patched)return;patched=true;
  const base=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const url=typeof input==='string'?input:(input?.url||'');
    let nextInit=init;
    if(init?.body&&typeof init.body==='string'&&(url.includes('/api/kids/story')||url.includes('/api/kids/scenes')||url.includes('/api/tts'))){
      try{
        const data=JSON.parse(init.body);
        if(url.includes('/api/kids/story'))data.category=selectedCategory();
        if(url.includes('/api/kids/scenes'))data.category=selectedCategory()==='auto'?lastCategory:selectedCategory();
        if(url.includes('/api/tts')&&typeof data.text==='string')data.text=data.text.replace(/قصة الأطفال/g,'القصة');
        nextInit={...init,body:JSON.stringify(data)};
      }catch{}
    }
    const r=await base(input,nextInit);
    if(url.includes('/api/kids/story')){
      r.clone().json().then(j=>{if(j?.category)setDetected(j.category,j.categoryLabel||TYPE_LABELS[j.category]);}).catch(()=>{});
    }
    return r;
  };
}

export function initStoryTypes(){installUi();patchFetch();}
