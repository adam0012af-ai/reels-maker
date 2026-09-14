import baseWorker from "./worker-mobile-v15-story.js";

const FLUX2_MODEL="@cf/black-forest-labs/flux-2-klein-4b";
const FLUX1_MODEL="@cf/black-forest-labs/flux-1-schnell";
const SDXL_MODEL="@cf/bytedance/stable-diffusion-xl-lightning";
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

function decodeBase64(data){
  const clean=String(data||"").replace(/\s/g,"");
  const binary=atob(clean),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}

async function parseStoryImageRequest(request){
  const type=request.headers.get("content-type")||"";
  if(type.includes("multipart/form-data")){
    const fd=await request.formData();
    const prompt=String(fd.get("prompt")||"").trim();
    const seed=Number(fd.get("seed"))||Math.floor(Math.random()*2147483000);
    const refs=[];
    for(const name of ["reference0","reference1","reference2","reference3"]){
      const f=fd.get(name);
      if(f&&typeof f.arrayBuffer==="function"&&f.size>0)refs.push(f);
    }
    return{prompt,seed,refs};
  }
  let b={};try{b=await request.json()}catch{}
  return{prompt:String(b.prompt||"").trim(),seed:Number(b.seed)||Math.floor(Math.random()*2147483000),refs:[]};
}

function storyPrompt(scene,hasReference){
  const continuity=hasReference
    ?"The supplied reference image is the canonical appearance of the story characters. Preserve exactly the same main character identity, face shape, hair, age, skin tone, body proportions, clothing design and clothing colors. Keep the same polished 3D animation style while changing only pose, camera angle, expression, props and environment required by this scene."
    :"Create a distinctive, memorable main character design that can be reused consistently in later scenes. Give the character simple stable clothing colors and recognizable hair and facial features.";
  return `High-end cinematic 3D animated family-film frame, vertical 9:16, child-friendly, warm expressive rounded characters, polished feature-animation quality, soft volumetric lighting, rich but natural colors, believable environment, strong storytelling composition. ${continuity} Story event: ${scene}. No text, no letters, no captions, no logo, no watermark, no split screen, no collage.`;
}

async function flux2Image(env,prompt,refs,seed){
  const form=new FormData();
  form.append("prompt",prompt);
  form.append("width","768");
  form.append("height","1344");
  form.append("guidance","3.5");
  form.append("seed",String(seed));
  refs.slice(0,4).forEach((blob,i)=>form.append(`input_image_${i}`,blob,`reference-${i}.jpg`));
  const serialized=new Response(form);
  const contentType=serialized.headers.get("content-type")||"multipart/form-data";
  const out=await env.AI.run(FLUX2_MODEL,{multipart:{body:serialized.body,contentType}});
  if(!out?.image)throw new Error("FLUX.2 returned no image");
  return decodeBase64(out.image);
}

async function flux1Image(env,prompt,seed){
  const out=await env.AI.run(FLUX1_MODEL,{prompt,steps:4,seed});
  if(!out?.image)throw new Error("FLUX.1 returned no image");
  return decodeBase64(out.image);
}

async function sdxlImage(env,prompt,seed){
  const out=await env.AI.run(SDXL_MODEL,{prompt,negative_prompt:"text, letters, captions, subtitles, logo, watermark, photorealistic, live action, scary, horror, gore, distorted face, deformed hands, extra fingers, duplicate people, low detail, blurry, black image, empty image",width:768,height:1344,num_steps:8,guidance:8,seed});
  return out;
}

async function storyImageV16(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const {prompt,seed,refs}=await parseStoryImageRequest(request);
  if(!prompt)return json({error:"prompt required"},400);
  const fullPrompt=storyPrompt(prompt,refs.length>0);

  try{
    const bytes=await flux2Image(env,fullPrompt,refs,seed);
    return new Response(bytes,{headers:{"content-type":"image/jpeg","cache-control":"no-store","x-rm-image-provider":"flux-2-klein-4b","x-rm-reference-count":String(refs.length)}});
  }catch(flux2Error){
    try{
      const bytes=await flux1Image(env,fullPrompt,seed);
      return new Response(bytes,{headers:{"content-type":"image/jpeg","cache-control":"no-store","x-rm-image-provider":"flux-1-schnell","x-rm-fallback-from":"flux-2-klein-4b"}});
    }catch(flux1Error){
      try{
        const stream=await sdxlImage(env,fullPrompt,seed);
        return new Response(stream,{headers:{"content-type":"image/jpeg","cache-control":"no-store","x-rm-image-provider":"sdxl-lightning","x-rm-fallback-from":"flux-2-klein-4b,flux-1-schnell"}});
      }catch(sdxlError){
        return json({error:`image generation failed: ${String(sdxlError?.message||sdxlError)}`},502);
      }
    }
  }
}

async function providerStatus(env){
  return json({
    readyNow:{
      flux2Reference:!!env.AI?.run,
      flux1Schnell:!!env.AI?.run,
      sdxlFallback:!!env.AI?.run,
      geminiStoryVoice:!!env.GEMINI_API_KEY
    },
    externalGpuAdapters:{
      storyDiffusion:!!env.STORYDIFFUSION_URL,
      qwenImage:!!env.QWEN_IMAGE_URL,
      wanVideo:!!env.WAN_VIDEO_URL,
      ltxVideo:!!env.LTX_VIDEO_URL,
      cogVideoX:!!env.COGVIDEO_URL,
      voiceStudio:!!env.VOICESTUDIO_URL
    }
  });
}

async function patchHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;
  let html=await response.text();
  html=html.replace(/mobile-auto-ui-v15\.js\?v=1/g,"mobile-auto-ui-v16.js?v=1").replace(/mobile-auto-ui\.css\?v=15/g,"mobile-auto-ui.css?v=16");
  const h=new Headers(response.headers);h.delete("content-length");h.set("content-type","text/html; charset=utf-8");h.set("cache-control","no-store, no-cache, must-revalidate");h.set("x-rm-mobile-auto","story-v16-flux-reference");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==="/api/autocontent/image"&&request.method==="POST")return storyImageV16(request,env);
  if(url.pathname==="/api/ai/providers"&&request.method==="GET")return providerStatus(env);
  return patchHtml(await baseWorker.fetch(request,env,ctx));
}};
