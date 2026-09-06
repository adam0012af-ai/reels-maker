"use strict";

(() => {
  const qid=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let installed=false;
  let sceneQueue=Promise.resolve();
  let autoReference=null;
  let buildGeneration=0;

  function proState(){try{return JSON.parse(sessionStorage.getItem("reelsMaker.storyPro.v1")||"{}")||{};}catch{return {};}}
  function aspectFromFormat(format){return ({portrait:"9:16",landscape:"16:9",square:"1:1",feed:"4:5",classic:"3:4"})[format]||"9:16";}
  function currentStyle(){return qid("ssStyle")?.value||"cartoon3d";}
  function imageStyle(style){return style==="realistic"?"cinematic":style==="cartoon2d"?"kids2d":"kids3d";}

  function qualitySuffix(index=0){
    const motions=["gentle cinematic push-in","slow lateral pan right","slow lateral pan left","subtle dolly-in with stable framing","very gentle vertical reveal"];
    return ` Premium story continuity rules: show the literal action of this story beat, not an abstract symbol. Keep the SAME recurring character identity, face, age, hair, body proportions, exact wardrobe and colors across all scenes. Keep one visual art direction and coherent location design. Avoid extreme eye close-up, macro face crop, split-screen, double exposure, ghosted faces, collage, duplicated people, surreal overlays, random hands, unrelated symbolic imagery and text inside the image. Use a readable medium/wide storytelling shot with natural body language. Camera motion suggestion: ${motions[index%motions.length]}.`;
  }

  async function parseJsonClone(response){try{return await response.clone().json();}catch{return null;}}

  function patchFetch(){
    if(window.__rmStoryQualityFetchPatched)return;
    window.__rmStoryQualityFetchPatched=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==="string"?input:input?.url||"";
      const method=String(init?.method||"GET").toUpperCase();

      if(/\/api\/story-scenes-v2(?:\?|$)/.test(url)&&method==="POST"&&init?.body){
        try{
          const body=JSON.parse(init.body);
          const duration=Math.max(20,Number(body.duration)||60);
          body.count=clamp(Math.round(duration/4.15),8,18);
          const pro=proState();
          body.aspect=aspectFromFormat(pro.format);
          const dims=({portrait:[720,1280],landscape:[1280,720],square:[720,720],feed:[720,900],classic:[720,960]})[pro.format]||[720,1280];
          body.outputWidth=dims[0];body.outputHeight=dims[1];
          init={...init,body:JSON.stringify(body)};
          autoReference=null;buildGeneration++;
        }catch{}
        const response=await nativeFetch(input,init);
        const data=await parseJsonClone(response);
        if(!response.ok||!data||!Array.isArray(data.scenes))return response;
        data.scenes=data.scenes.map((scene,index)=>({
          ...scene,
          prompt:`${scene.prompt||""}${qualitySuffix(index)}`,
          shot:scene.shot||"medium-wide cinematic storytelling shot",
          motion:["slow push in","slow pan right","slow pan left","gentle dolly in"][index%4]
        }));
        data.count=data.scenes.length;
        data.qualityDirector="premium-story-director-v3";
        return new Response(JSON.stringify(data),{status:response.status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
      }

      if(/\/api\/story-image(?:\?|$)/.test(url)&&method==="POST"&&init?.body){
        let body={};try{body=JSON.parse(init.body)||{};}catch{}
        const generation=buildGeneration;
        const task=async()=>{
          const pro=proState();
          const reference=window.__reelsStoryReferenceImage||autoReference||null;
          const prompt=`${body.prompt||""}${qualitySuffix(Number(body.index)||0)}`;
          const payload={prompt,seed:body.seed||Date.now()%900000000,aspect:aspectFromFormat(pro.format),style:imageStyle(currentStyle()),provider:"auto"};
          if(reference)payload.reference=reference;
          let response=await nativeFetch("/api/image-studio",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify(payload)});
          let data=await parseJsonClone(response);
          if(response.ok&&data?.image){
            if(!window.__reelsStoryReferenceImage&&!autoReference&&generation===buildGeneration)autoReference=data.image;
            return new Response(JSON.stringify({image:data.image,model:data.model,provider:data.provider}),{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
          }
          const fallbackBody={...body,prompt};
          return nativeFetch(input,{...init,body:JSON.stringify(fallbackBody)});
        };
        const chained=sceneQueue.then(task,task);
        sceneQueue=chained.then(()=>undefined,()=>undefined);
        return chained;
      }
      return nativeFetch(input,init);
    };
  }

  function preferSoftTransitions(){
    const sel=qid("ssTransition");
    if(sel&&sel.dataset.rmQuality!=="1"){
      sel.dataset.rmQuality="1";
      if([...sel.options].some(o=>o.value==="soft")){sel.value="soft";sel.dispatchEvent(new Event("change",{bubbles:true}));}
    }
  }

  function labelDirector(){
    const sub=document.querySelector(".story-studio .ss-head p");
    if(sub&&!sub.dataset.rmQuality){sub.dataset.rmQuality="1";sub.textContent="النص → Story Director → مشاهد متسقة → صوت → Review → تصدير";}
    const build=qid("ssBuildVideo");if(build&&!build.dataset.rmQuality){build.dataset.rmQuality="1";build.textContent="✦ إنشاء القصة والفيديو";}
  }

  function watchReview(){
    const review=qid("ssReviewPane");if(!review||review.dataset.rmQualityWatch)return;
    review.dataset.rmQualityWatch="1";
    new MutationObserver(()=>{if(review.classList.contains("show")){preferSoftTransitions();window.ReelsProjectsV2?.saveNow?.();}}).observe(review,{attributes:true,attributeFilter:["class"]});
  }

  function installReferenceReset(){
    const build=qid("ssBuildVideo");if(!build||build.dataset.rmRefReset)return;
    build.dataset.rmRefReset="1";
    build.addEventListener("click",()=>{autoReference=null;sceneQueue=Promise.resolve();},true);
  }

  function tick(){preferSoftTransitions();labelDirector();watchReview();installReferenceReset();setTimeout(tick,650);}
  function install(){if(installed)return;installed=true;patchFetch();tick();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
