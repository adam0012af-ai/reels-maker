const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const FLUX2="@cf/black-forest-labs/flux-2-klein-4b",FLUX1="@cf/black-forest-labs/flux-1-schnell",SDXL="@cf/bytedance/stable-diffusion-xl-lightning";
const POLLI_BASE="https://gen.pollinations.ai";
function b64(data){const clean=String(data||"").replace(/\s/g,""),bin=atob(clean),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function body(r){try{return await r.json()}catch{return{}}}
async function imageInput(request){
  const type=request.headers.get("content-type")||"";
  if(type.includes("multipart/form-data")){
    const fd=await request.formData(),refs=[];
    for(const n of ["reference0","reference1","reference2","reference3"]){const f=fd.get(n);if(f&&typeof f.arrayBuffer==="function"&&f.size>0)refs.push(f)}
    const format=String(fd.get("format")||fd.get("aspect")||"short").toLowerCase()==="youtube"?"youtube":"short";
    return{prompt:String(fd.get("prompt")||"").trim(),refs,seed:Number(fd.get("seed"))||Math.floor(Math.random()*2147483000),format};
  }
  const b=await body(request),format=String(b.format||b.aspect||"short").toLowerCase()==="youtube"?"youtube":"short";
  return{prompt:String(b.prompt||"").trim(),refs:[],seed:Number(b.seed)||Math.floor(Math.random()*2147483000),format};
}
function promptFor(scene,ref,format){
  const frame=format==="youtube"?"HORIZONTAL 16:9 YouTube frame, cinematic widescreen composition":"VERTICAL 9:16 short-video frame";
  const aspectGuard=format==="youtube"?"Ignore any conflicting mention of vertical, portrait or 9:16 inside the story-event text. The FINAL image must be landscape 16:9.":"The FINAL image must be portrait 9:16.";
  return `High-end cinematic 3D animated storytelling frame, ${frame}, polished feature-animation quality, expressive natural faces, cinematic lighting, strong storytelling composition. ${aspectGuard} ${ref?"Use the recurring character description in the scene as the canonical identity. Preserve the same face, hair, age, skin tone, body proportions, clothing design and clothing colors for recurring characters. Change the location, props, camera angle and atmosphere to match this event.":"Create distinctive stable main-character designs with recognizable hair and clothing colors."} Show only the people required by the current story event. Each named character must appear exactly once unless the event explicitly requires multiple different people. Never duplicate, clone, mirror, twin or repeat the same character in one frame. Story event: ${scene}. No text, letters, captions, logo, watermark, collage or split screen.`;
}
function mediaResponse(bytes,type,provider,format){return new Response(bytes,{status:200,headers:{"content-type":type||"image/jpeg","cache-control":"no-store","x-rm-image-provider":provider,"x-rm-format":format}})}
async function pollinationsImage(env,full,w,h,seed,format){
  if(!env.POLLINATIONS_API_KEY)throw new Error("POLLINATIONS_API_KEY is not configured");
  let last="";
  for(const model of ["flux","zimage"]){
    try{
      const r=await fetch(`${POLLI_BASE}/v1/images/generations`,{method:"POST",headers:{authorization:`Bearer ${env.POLLINATIONS_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model,prompt:full,n:1,size:`${w}x${h}`,quality:"high",response_format:"b64_json"})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){last=data?.error?.message||data?.error||`Pollinations ${model} ${r.status}`;continue}
      const item=data?.data?.[0],encoded=item?.b64_json||item?.b64||"";
      if(encoded)return mediaResponse(b64(encoded),"image/jpeg",`Pollinations ${model}`,format);
      if(item?.url){const ir=await fetch(item.url);if(ir.ok)return mediaResponse(new Uint8Array(await ir.arrayBuffer()),ir.headers.get("content-type")||"image/jpeg",`Pollinations ${model}`,format)}
      last=`Pollinations ${model} returned no image`;
    }catch(e){last=String(e?.message||e)}
  }
  throw new Error(last||"Pollinations image generation failed");
}
export async function imageApiV38(request,env){
  if(!env.AI?.run&&!env.POLLINATIONS_API_KEY)return json({error:"No image provider configured"},503);
  const {prompt,refs,seed,format}=await imageInput(request);if(!prompt)return json({error:"prompt required"},400);
  const full=promptFor(prompt,refs.length>0,format),w=format==="youtube"?1344:768,h=format==="youtube"?768:1344;
  let cloudflareError="";
  if(env.AI?.run){
    try{
      const f=new FormData();f.append("prompt",full);f.append("width",String(w));f.append("height",String(h));f.append("guidance","3.5");f.append("seed",String(seed));refs.slice(0,4).forEach((x,i)=>f.append(`input_image_${i}`,x,`ref-${i}.jpg`));
      const s=new Response(f),out=await env.AI.run(FLUX2,{multipart:{body:s.body,contentType:s.headers.get("content-type")}});
      if(out?.image)return mediaResponse(b64(out.image),"image/jpeg","Cloudflare FLUX.2 Reference",format);
    }catch(e){cloudflareError=String(e?.message||e)}
    try{
      const out=await env.AI.run(FLUX1,{prompt:full,steps:4,seed,width:w,height:h});
      if(out?.image)return mediaResponse(b64(out.image),"image/jpeg","Cloudflare FLUX.1 Schnell",format);
    }catch(e){cloudflareError=String(e?.message||e)}
    try{
      const out=await env.AI.run(SDXL,{prompt:full,negative_prompt:"text, caption, logo, watermark, scary, gore, distorted face, deformed hands, duplicate people, cloned person, twins, mirrored person, repeated character, blurry, black image",width:w,height:h,num_steps:8,guidance:8,seed});
      if(out)return mediaResponse(out,"image/jpeg","Cloudflare SDXL Lightning",format);
    }catch(e){cloudflareError=String(e?.message||e)}
  }
  try{return await pollinationsImage(env,full,w,h,seed,format)}catch(e){
    const polliError=String(e?.message||e),quota=/4006|allocation|neurons|quota/i.test(cloudflareError);
    return json({error:quota?`انتهت حصة Cloudflare اليومية، وتم تجربة Pollinations أيضًا لكنه لم ينجح: ${polliError}`:`تعذر توليد الصورة من Cloudflare وPollinations: ${polliError}`,cloudflare:cloudflareError||undefined,pollinations:polliError},502)
  }
}
