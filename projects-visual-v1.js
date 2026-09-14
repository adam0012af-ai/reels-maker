const META_KEY='reelsMaker.visualProjects.v1';
const DB_NAME='reelsMaker.visualProjectsMedia.v1';
const STORE='videos';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let previewUrls=[];

function read(){try{const x=JSON.parse(localStorage.getItem(META_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function write(x){localStorage.setItem(META_KEY,JSON.stringify(x.slice(0,50)))}
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putVideo(id,blob){if(!blob?.size)return;try{const d=await db();await new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id,blob,updatedAt:Date.now()});tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});d.close()}catch{}}
async function getVideo(id){try{const d=await db(),v=await new Promise((res,rej)=>{const r=d.transaction(STORE,'readonly').objectStore(STORE).get(id);r.onsuccess=()=>res(r.result?.blob||null);r.onerror=()=>rej(r.error)});d.close();return v}catch{return null}}
async function delVideo(id){try{const d=await db();await new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});d.close()}catch{}}
function fmt(ts){try{return new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(new Date(ts))}catch{return new Date(ts).toLocaleString()}}
function titleOf(p){const idea=String(p.idea||'').trim();if(idea)return idea.slice(0,64);const story=String(p.story||'').trim();return (story.split(/[.!؟!]/)[0]||story).slice(0,64)||'مشروع بصري'}
function styleLabel(x){return({cinematic:'سينمائي',realistic:'واقعي',animation:'3D Animation',dramatic:'درامي'})[x]||'سينمائي'}

function install(){
  if(document.querySelector('[data-route="projects"]'))return;
  const nav=$('nav'),settings=nav?.querySelector('[data-route="settings"]'),b=document.createElement('button');
  b.className='nav-item';b.dataset.route='projects';b.innerHTML='<span>▣</span><div><b>مشاريعي</b><small>القصص والفيديوهات المحفوظة</small></div>';
  settings?.insertAdjacentElement('beforebegin',b);
  const sec=document.createElement('section');sec.className='page';sec.dataset.page='projects';
  sec.innerHTML='<div class="page-head"><div><span class="eyebrow">PROJECTS</span><h2>مشاريعي</h2><p>المشاريع البصرية والفيديوهات التي تم تصديرها على هذا الجهاز.</p></div><span id="projectsCount" class="health-pill">0 مشروع</span></div><div id="projectsGrid" class="visual-projects-grid"></div><div id="projectsEmpty" class="card visual-projects-empty">لا توجد مشاريع محفوظة حتى الآن.</div>';
  document.querySelector('main.main')?.appendChild(sec);
  const st=document.createElement('style');st.textContent='.visual-projects-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.vp-card{padding:12px;overflow:hidden}.vp-preview{aspect-ratio:9/16;max-height:360px;background:#070b12;border-radius:15px;display:grid;place-items:center;overflow:hidden}.vp-preview video{width:100%;height:100%;object-fit:contain;background:#000}.vp-preview span{color:#748198;font-size:10px}.vp-card h3{font-size:15px;margin:12px 2px 6px;line-height:1.6}.vp-card p{color:#8f9aad;font-size:9px;line-height:1.75;min-height:44px}.vp-meta{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.vp-meta span{padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.05);font-size:8px}.vp-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.vp-actions>*{text-align:center;text-decoration:none;font-size:9px}.vp-actions [data-delete]{grid-column:1/-1}.visual-projects-empty{text-align:center;padding:36px;color:#8f9aad}@media(max-width:950px){.visual-projects-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.visual-projects-grid{grid-template-columns:1fr}.vp-preview{max-height:420px}}';document.head.appendChild(st);
}

function clearPreviewUrls(){previewUrls.forEach(u=>{try{URL.revokeObjectURL(u)}catch{}});previewUrls=[]}
async function cardFor(p){
  const blob=await getVideo(p.id),c=document.createElement('article');c.className='card vp-card';let src='';
  if(blob){src=URL.createObjectURL(blob);previewUrls.push(src)}
  c.innerHTML=`<div class="vp-preview">${src?`<video controls playsinline preload="metadata" src="${src}"></video>`:'<span>مسودة بدون فيديو بعد</span>'}</div><h3>${esc(p.title||titleOf(p))}</h3><p>${esc((p.story||'').slice(0,125))}${(p.story||'').length>125?'…':''}</p><div class="vp-meta"><span>${esc(styleLabel(p.style))}</span><span>${Number(p.duration)||30} ثانية</span><span>${Number(p.sceneCount)||0} مشهد</span></div><small style="color:#738096;font-size:8px">آخر حفظ: ${esc(fmt(p.updatedAt||p.createdAt))}</small><div class="vp-actions"><button class="secondary" data-open>فتح المشروع</button>${src?'<a class="primary" data-download download="reels-maker-visual-project.webm">تحميل الفيديو</a>':'<button class="secondary" data-build>إكمال المشروع</button>'}<button class="secondary" data-delete>حذف</button></div>`;
  if(src)c.querySelector('[data-download]').href=src;
  const open=()=>openProject(p,blob);c.querySelector('[data-open]')?.addEventListener('click',open);c.querySelector('[data-build]')?.addEventListener('click',open);c.querySelector('[data-delete]')?.addEventListener('click',()=>removeProject(p.id));return c;
}

async function render(){const grid=$('projectsGrid'),empty=$('projectsEmpty');if(!grid)return;clearPreviewUrls();grid.innerHTML='';const list=read();$('projectsCount').textContent=`${list.length} مشروع`;empty.style.display=list.length?'none':'block';for(const p of list)grid.appendChild(await cardFor(p))}
function openProject(project,blob){document.querySelector('[data-route="story"]')?.click();setTimeout(()=>window.dispatchEvent(new CustomEvent('reels-open-visual-project',{detail:{project,blob}})),0)}
async function removeProject(id){write(read().filter(x=>x.id!==id));await delVideo(id);render()}
async function save(detail,ready){if(!detail?.id)return;const now=Date.now(),list=read(),old=list.find(x=>x.id===detail.id),item={...(old||{}),...detail,title:titleOf(detail),createdAt:old?.createdAt||now,updatedAt:now,status:ready?'ready':'draft'};delete item.blob;write([item,...list.filter(x=>x.id!==detail.id)]);if(detail.blob)await putVideo(detail.id,detail.blob);render()}

export function initVisualProjects(){install();window.addEventListener('reels-visual-project-draft',e=>save(e.detail,false));window.addEventListener('reels-visual-project-ready',e=>save(e.detail,true));render()}
