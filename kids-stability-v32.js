const $=id=>document.getElementById(id);
let userPicked=false;
function pickStableVoice(){const sel=$('kidsVoice');if(!sel||userPicked)return false;const opts=[...sel.querySelectorAll('option')];const eleven=opts.find(o=>String(o.value||'').startsWith('e:'));if(!eleven)return false;sel.value=eleven.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return true}
export function initKidsStableVoice(){document.addEventListener('change',e=>{if(e.target?.id==='kidsVoice'&&e.isTrusted)userPicked=true},true);let tries=0;const timer=setInterval(()=>{tries++;if(pickStableVoice()||tries>=20)clearInterval(timer)},250)}
