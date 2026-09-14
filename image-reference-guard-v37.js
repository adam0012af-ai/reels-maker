let installed=false;
function isImageApi(input){try{const u=new URL(typeof input==='string'?input:input?.url,location.href);return u.pathname==='/api/image'}catch{return false}}
function singleReference(form){
  const next=new FormData();
  let lastRef=null;
  for(const [k,v] of form.entries()){
    if(/^reference\d+$/i.test(k)){if(v&&typeof v.arrayBuffer==='function'&&v.size>0)lastRef=v;continue}
    next.append(k,v);
  }
  if(lastRef)next.append('reference0',lastRef,'character-reference.jpg');
  return next;
}
export function initImageReferenceGuard(){
  if(installed)return;installed=true;
  const original=window.fetch.bind(window);
  window.fetch=(input,init={})=>{
    if(isImageApi(input)&&init?.body instanceof FormData){
      init={...init,body:singleReference(init.body)};
    }
    return original(input,init);
  };
}
