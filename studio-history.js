"use strict";
(() => {
  if(window.__REELS_STUDIO_HISTORY__)return;window.__REELS_STUDIO_HISTORY__=true;
  const $=id=>document.getElementById(id);let stack=[],idx=-1,lock=false,last="",inited=false;
  const core=()=>window.ReelsModernStudio?.coreState?.();
  function snap(){const s=core();return s?{selected:s.selected,layers:s.layers.map(x=>({...x})),sfx:(s.sfxEvents||[]).map(x=>({...x}))}:null}
  function sig(x){return JSON.stringify({s:x.selected,l:x.layers.map(a=>[a.id,a.type,a.text,a.x|0,a.y|0,+a.scale||1,+a.rotation||0,a.visible])})}
  function buttons(){if($("modernUndo"))$("modernUndo").disabled=idx<=0;if($("modernRedo"))$("modernRedo").disabled=idx>=stack.length-1}
  function push(){if(lock)return;const x=snap();if(!x)return;const g=sig(x);if(g===last)return;last=g;stack=stack.slice(0,idx+1);stack.push(x);if(stack.length>40)stack.shift();idx=stack.length-1;buttons()}
  function restore(x){const s=core();if(!s||!x)return;lock=true;s.layers=x.layers.map(a=>({...a}));s.selected=x.selected;s.sfxEvents=x.sfx.map(a=>({...a}));try{renderLayersList()}catch{}try{syncSelectedControls()}catch{}last=sig(x);lock=false}
  function undo(){if(idx<=0)return;restore(stack[--idx]);buttons()}function redo(){if(idx>=stack.length-1)return;restore(stack[++idx]);buttons()}
  function init(){if(inited||!$("modernUndo")||!$("modernRedo"))return;inited=true;$("modernUndo").onclick=undo;$("modernRedo").onclick=redo;let timer=0,go=()=>{clearTimeout(timer);timer=setTimeout(push,90)};document.addEventListener("pointerup",e=>e.target.closest("#stage,#controlsPanel")&&go(),true);document.addEventListener("change",e=>e.target.closest("#controlsPanel")&&go(),true);document.addEventListener("click",e=>e.target.closest("#addTextBtn,#deleteTextBtn,#duplicateTextBtn,#duplicateLayerBtn,#deleteLayerBtn,.sticker-card")&&go(),true);document.addEventListener("keydown",e=>{if(e.target.matches?.("input,textarea,select,[contenteditable='true']"))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo()}},true);setTimeout(push,250)}
  document.addEventListener("reels-modern-shell-ready",init,{once:true});
  const wait=()=>window.ReelsModernStudio&&$("modernUndo")?init():setTimeout(wait,50);wait();
})();
