"use strict";
(() => {
  if(window.__REELS_STUDIO_TIMELINE__)return; window.__REELS_STUDIO_TIMELINE__=true;
  const $=id=>document.getElementById(id), qs=(s,r=document)=>r.querySelector(s);
  let inited=false; const wait=()=>window.ReelsModernStudio?init():setTimeout(wait,50);
  function fmt(x){x=Math.max(0,+x||0);return `${String(Math.floor(x/60)).padStart(2,"0")}:${String(Math.floor(x%60)).padStart(2,"0")}`}
  function build(){
    if($("modernTimeline"))return;
    const t=document.createElement("section");t.id="modernTimeline";t.className="modern-timeline";
    t.innerHTML=`<header><div><b>Timeline</b><span id="modernTimelineSummary">No media loaded</span></div><aside><button id="tlMinus">−</button><em id="tlZoom">100%</em><button id="tlPlus">＋</button></aside></header>
    <div class="modern-timeline-grid"><label>TIME</label><div id="modernRuler" class="modern-ruler"></div>
    <label><i class="vd"></i>Video</label><div class="modern-lane"><span id="modernVideoClip" class="modern-clip video" hidden>Background Video</span></div>
    <label><i class="td"></i>Text</label><div class="modern-lane"><span id="modernTextClip" class="modern-clip text" hidden>Text & Captions</span></div>
    <label><i class="ad"></i>Audio</label><div class="modern-lane"><span id="modernAudioClip" class="modern-clip audio" hidden>Audio & SFX</span></div>
    <div id="modernPlayhead" class="modern-playhead"></div></div>`;document.body.appendChild(t);
    let zoom=1; const setZoom=v=>{zoom=Math.max(.75,Math.min(2,v));$("tlZoom").textContent=Math.round(zoom*100)+"%";qs(".modern-timeline-grid",t).style.setProperty("--zoom",zoom)};
    $("tlMinus").onclick=()=>setZoom(zoom-.25);$("tlPlus").onclick=()=>setZoom(zoom+.25);
    let drag=false;const seek=e=>{const v=window.ReelsModernStudio.coreVideo(),r=$("modernRuler");if(!v||!isFinite(v.duration)||v.duration<=0||!r)return;const b=r.getBoundingClientRect(),x=Math.max(0,Math.min(b.width,e.clientX-b.left)),time=x/b.width*v.duration;v.currentTime=time;const lr=$("timeline");if(lr)lr.value=Math.round(time/v.duration*1000)};
    const g=qs(".modern-timeline-grid",t);g.onpointerdown=e=>{if(!e.target.closest(".modern-ruler,.modern-lane"))return;drag=true;g.setPointerCapture?.(e.pointerId);seek(e)};g.onpointermove=e=>drag&&seek(e);g.onpointerup=e=>{drag=false;g.releasePointerCapture?.(e.pointerId)};
  }
  function ruler(d){const r=$("modernRuler");if(!r)return;d=d>0?d:30;const step=d<=30?5:d<=90?10:15,a=[];for(let x=0;x<=d+.001;x+=step)a.push(`<i style="left:${Math.min(100,x/d*100)}%"><em>${fmt(x)}</em></i>`);r.innerHTML=a.join("")}
  let last=-1;function loop(){const ui=window.ReelsModernStudio,v=ui.coreVideo(),s=ui.coreState(),d=v&&isFinite(v.duration)?v.duration:0,c=v&&isFinite(v.currentTime)?v.currentTime:0,tc=s?.layers?.filter(x=>x.type==="text").length||0,sc=s?.layers?.filter(x=>x.type==="sticker").length||0,sfx=s?.sfxEvents?.length||0,ha=!!$("sourceAudio")?.src||sfx>0;
    $("modernTimelineSummary").textContent=d?`${fmt(c)} / ${fmt(d)} • ${tc+sc} layers`:"No media loaded";$("modernVideoClip").hidden=!d;$("modernTextClip").hidden=!tc;$("modernTextClip").textContent=tc?`${tc} Text / Captions`:"Text & Captions";$("modernAudioClip").hidden=!ha;$("modernAudioClip").textContent=sfx?`Audio + ${sfx} SFX`:"Audio Track";
    const ph=$("modernPlayhead");if(ph)ph.style.left=`calc(108px + (100% - 108px) * ${d?Math.min(1,c/d):0})`;if(Math.abs(last-d)>.25){last=d;ruler(d)}requestAnimationFrame(loop)}
  function init(){if(inited)return;inited=true;build();loop()}
  document.addEventListener("reels-modern-shell-ready",init,{once:true});wait();
})();
