import {initStoryStudio as initStoryBase,initVoiceStudio as initVoiceBase} from './story-v25.js';

const $=id=>document.getElementById(id);
let catalogPromise=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function gender(v){const g=String(v||'neutral').toLowerCase();return g==='male'||g==='female'?g:'neutral'}
function hideControl(id){const el=$(id);const label=el?.closest('label');if(label)label.style.display='none'}
function cleanProviderNames(text){return String(text||'').replace(/\bGemini\b/gi,'').replace(/\bElevenLabs\b/gi,'').replace(/\s*·\s*·\s*/g,' · ').replace(/^\s*·\s*|\s*·\s*$/g,'').trim()}
function scrubNode(id){const el=$(id);if(!el)return;const scrub=()=>{const next=cleanProviderNames(el.textContent);if(next!==el.textContent)el.textContent=next};scrub();new MutationObserver(scrub).observe(el,{childList:true,subtree:true,characterData:true})}

async function getJson(url){const r=await fetch(url,{cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}
async function loadCatalog(){
  if(catalogPromise)return catalogPromise;
  catalogPromise=(async()=>{
    const out=[];
    try{
      const g=await getJson('/api/voices');
      for(const v of g.voices||[])out.push({key:`g:${v.name}`,provider:'gemini',id:v.name,name:v.name,gender:gender(v.gender),detail:v.style||'صوت AI'});
    }catch{}
    try{
      const e=await getJson('/api/voices/elevenlabs');
      for(const v of e.voices||[])out.push({key:`e:${v.id}`,provider:'elevenlabs',id:v.id,name:v.name||'Voice',gender:gender(v.gender),detail:v.accent||v.locale||v.description||'صوت AI'});
    }catch{}
    const seen=new Set();
    return out.filter(v=>{const k=`${v.provider}:${v.id}`;if(seen.has(k))return false;seen.add(k);return true});
  })();
  return catalogPromise;
}

function renderUnified(select,list,filter='all'){
  const filtered=filter==='all'?list:list.filter(v=>v.gender===filter);
  const groups=[['male','رجال','👨'],['female','نساء','👩'],['neutral','أخرى','🎙️']];
  let html='';
  for(const [g,title,icon] of groups){
    const arr=filtered.filter(v=>v.gender===g);
    if(!arr.length)continue;
    html+=`<optgroup label="${title} (${arr.length})">${arr.map(v=>`<option value="${esc(v.key)}">${icon} ${esc(v.name)}${v.detail?` — ${esc(v.detail)}`:''}</option>`).join('')}</optgroup>`;
  }
  select.innerHTML=html||'<option value="">لا توجد أصوات متاحة</option>';
}

function syncHidden(prefix,list,key){
  const item=list.find(v=>v.key===key);if(!item)return;
  const provider=$(prefix+'Provider');
  const original=$(prefix==='story'?'storyVoice':'voiceName');
  if(provider)provider.value=item.provider;
  if(original){original.innerHTML=`<option value="${esc(item.id)}">${esc(item.name)}</option>`;original.value=item.id}
}

async function installUnified(prefix){
  const providerId=prefix+'Provider',genderId=prefix+'Gender',originalVoiceId=prefix==='story'?'storyVoice':'voiceName',accentId=prefix+'Dialect';
  const accent=$(accentId),anchor=accent?.closest('label');if(!anchor)return;
  hideControl(providerId);hideControl(genderId);hideControl(originalVoiceId);
  const list=await loadCatalog();
  const wrap=document.createElement('div');wrap.className='unified-voice-controls';
  const genderLabel=document.createElement('label');genderLabel.innerHTML=`نوع الصوت<select id="${prefix}UnifiedGender"><option value="all">الكل</option><option value="male">رجال</option><option value="female">نساء</option><option value="neutral">أخرى</option></select>`;
  const voiceLabel=document.createElement('label');voiceLabel.innerHTML=`الصوت<select id="${prefix}UnifiedVoice"></select>`;
  wrap.append(genderLabel,voiceLabel);anchor.insertAdjacentElement('afterend',wrap);
  const g=$(prefix+'UnifiedGender'),v=$(prefix+'UnifiedVoice');
  renderUnified(v,list,'all');syncHidden(prefix,list,v.value);
  g.addEventListener('change',()=>{renderUnified(v,list,g.value);syncHidden(prefix,list,v.value)});
  v.addEventListener('change',()=>syncHidden(prefix,list,v.value));
}

function neutralizeProviderText(){['storyStatus','voiceStatus','storyAudioMeta'].forEach(scrubNode)}

export async function initStoryStudio(){await initStoryBase();await installUnified('story');neutralizeProviderText()}
export async function initVoiceStudio(){await initVoiceBase();await installUnified('voice');neutralizeProviderText()}
