const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const FLUX2="@cf/black-forest-labs/flux-2-klein-4b",FLUX1="@cf/black-forest-labs/flux-1-schnell",SDXL="@cf/bytedance/stable-diffusion-xl-lightning";
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
  return `High-end cinematic 3D animated storytelling frame, ${frame}, polished feature-animation quality, expressive natural faces, cinematic lighting, strong storytelling composition. ${aspectGuard} ${ref?"Use the reference image ONLY as canonical character identity. Preserve the same face, hair, age, skin tone, body proportions, clothing design and clothing colors for recurring characters, but DO NOT copy the reference background or composition. Rebuild the location, props, camera angle and atmosphere from the current story event.":"Create distinctive stable main-character designs with recognizable hair and clothing colors."} Show only the people required by the current story event. Each named character must appear exactly once unless the event explicitly requires multiple different people. Never duplicate, clone, mirror, twin or repeat the same character in one frame. Story event: ${scene}. No text, letters, captions, logo, watermark, collage or split screen.`;
}
export async function imageApiV38(request,env){
  if(!env.AI?.run)return json({error:"AI binding unavailable"},503);
  const {prompt,refs,seed,format}=await imageInput(request);if(!prompt)return json({error:"prompt required"},400);
  const full=promptFor(prompt,refs.length>0,format),w=format==="youtube"?1344:768,h=format==="youtube"?768:1344;
  try{
    const f=new FormData();f.append("prompt",full);f.append("width",String(w));f.append("height",String(h));f.append("guidance","3.5");f.append("seed",String(seed));refs.slice(0,4).forEach((x,i)=>f.append(`input_image_${i}`,x,`ref-${i}.jpg`));
    const s=new Response(f),out=await env.AI.run(FLUX2,{multipart:{body:s.body,contentType:s.headers.get("content-type")}});
    if(out?.image)return new Response(b64(out.image),{headers:{"content-type":"image/jpeg","cache-control":"no-store","x-rm-image-provider":"FLUX.2 Reference","x-rm-format":format}});
  }catch{}
  try{
    const out=await env.AI.run(FLUX1,{prompt:full,steps:4,seed,width:w,height:h});
    if(out?.image)return new Response(b64(out.image),{headers:{"content-type":"image/jpeg","cache-control":"no-store","x-rm-image-provider":"FLUX.1 Schnell","x-rm-format":format}});
  }catch{}
  try{
    const out=await env.AI.run(SDXL,{prompt:full,negative_prompt:"text, caption, logo, watermark, scary, gore, distorted face, deformed hands, duplicate people, cloned person, twins, mirrored person, repeated character, blurry, black image",width:w,height:h,num_steps:8,guidance:8,seed});
    return new Response(out,{headers:{"content-type":"image/jpeg","cache-control":"no-store","x-rm-image-provider":"SDXL Lightning","x-rm-format":format}});
  }catch(e){return json({error:String(e?.message||e)},502)}
}
