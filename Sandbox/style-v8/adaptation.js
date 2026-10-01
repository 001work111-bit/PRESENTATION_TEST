/* Text-only layout adaptation: measure rendered text and reflow same-column text blocks. */
(function(){
 'use strict';
 const SETTINGS_KEY='cs_adaptation_v1';
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
 const EPS=.5,MIN_H=14,MIN_GAP=8,COL_OVERLAP=.34;
 let settings={auto:false,delay:400,useSelection:false,normalizeAll:false};
 try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch(_){}
 settings.auto=!!settings.auto;settings.useSelection=!!settings.useSelection;settings.normalizeAll=!!settings.normalizeAll;settings.delay=clamp(settings.delay,0,10000);
 const timers=new Map(),pendingJobs=new Map();
 function persist(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch(_){} }
 function getTemplate(id){return typeof LIB!=='undefined'&&LIB[id]||null;}
 function escAttr(s){return String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');}
 function getTextNode(t,b){
   const esc=CSS.escape(b.id);
   const inSingle=!window.SB_Gallery||window.SB_Gallery.mode==='single';
   const live=typeof cvCanvas!=='undefined'&&inSingle&&t.id===selectedId?cvCanvas.querySelector(`.cv-block[data-id="${esc}"] .cv-text`):null;
   if(live)return {el:live,scale:Math.max(.01,Number(typeof currentScale!=='undefined'?currentScale:1)||1)};
   const card=document.querySelector(`#galRoot .gal-card[data-id="${escAttr(t.id)}"]`),preview=card?.querySelector(`.sb-gal-page [data-v5-block="${escAttr(b.id)}"]`);
   if(!preview)return null;
   const page=preview.closest('.sb-gal-page'),scale=page&&Number(page.getBoundingClientRect().width)/1123;
   return {el:preview,scale:Math.max(.01,scale||1)};
 }
 function measureNaturalHeight(t,b){
   const found=getTextNode(t,b);if(!found)return 0;
   const {el,scale}=found,range=document.createRange();
   try{range.selectNodeContents(el);}catch(_){return 0;}
   const rects=Array.from(range.getClientRects?.()||[]).filter(r=>r&&r.height>0);
   let top=Infinity,bottom=-Infinity;
   for(const r of rects){top=Math.min(top,r.top);bottom=Math.max(bottom,r.bottom);}
   const cs=getComputedStyle(el),pad=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
   let lineBox=top===Infinity?0:(bottom-top)/scale;
   if(!lineBox){
     const fs=parseFloat(cs.fontSize)||Number(b.style?.fontSize)||16;
     const rawLh=parseFloat(cs.lineHeight),lh=Number.isFinite(rawLh)?rawLh:fs*1.2;
     const scroll=Number(el.scrollHeight)||0,client=Number(el.clientHeight)||0;
     lineBox=Math.max(scroll-client,fs*1.2,lh);
   }
   return Math.max(1,Math.round(lineBox+pad));
 }
 function overlapsColumn(a,b){
   const ax=Number(a.x)||0,aw=Math.max(1,Number(a.w)||0),bx=Number(b.x)||0,bw=Math.max(1,Number(b.w)||0);
   const overlap=Math.min(ax+aw,bx+bw)-Math.max(ax,bx);
   return overlap>=Math.max(8,Math.min(aw,bw)*COL_OVERLAP);
 }
 function setSelected(ids,explicit=false){
   const shared=window.CoversSelectionV1?.ids;
   if(shared instanceof Set){shared.clear();for(const id of ids||[])shared.add(id);window.CoversTextSelection={ids:shared,explicit:!!explicit};}
   else window.CoversTextSelection={ids:new Set(ids||[]),explicit:!!explicit};
 }
 function getSelectedTextBlocks(t){
   const out=[];
   if(window.CoversStyleV5?.active){
     for(const key of window.CoversStyleV5.blockPicks||[]){const cut=key.indexOf('\u0000');if(cut<0||key.slice(0,cut)!==t.id)continue;const b=t.blocks.find(x=>x.kind==='text'&&x.id===key.slice(cut+1));if(b)out.push(b);}
   }else{
     const ids=window.CoversSelectionV1?.ids||window.CoversTextSelection?.ids||[];
     for(const key of ids){if(typeof key!=='string')continue;const cut=key.indexOf('\u0000'),tid=cut<0?t.id:key.slice(0,cut),bid=cut<0?key:key.slice(cut+1);if(tid!==t.id)continue;const b=t.blocks.find(x=>x.kind==='text'&&x.id===bid);if(b)out.push(b);}
     if(!out.length&&!window.CoversTextSelection?.explicit&&typeof selectedBlockId!=='undefined'){const b=t.blocks.find(x=>x.kind==='text'&&x.id===selectedBlockId);if(b)out.push(b);}
   }
   return [...new Map(out.map(b=>[b.id,b])).values()];
 }
 function rangeScope(ordered,selectedIds){
   const indexes=[];
   ordered.forEach((b,i)=>{if(selectedIds.has(b.id))indexes.push(i);});
   if(!indexes.length)return [];
   const first=indexes[0],last=indexes[indexes.length-1];
   // First and last selected texts define a contiguous range; blocks outside stay untouched.
   return ordered.slice(first,last+1);
 }
 function makePlan(t,measurements,selectedIds=null,restricted=false,normalizeHeights=false){
   const all=(t?.blocks||[]).filter(b=>b.kind==='text'&&b.visible!==false);if(!all.length)return null;
   const ordered=[...all].sort((a,b)=>(Number(a.y)||0)-(Number(b.y)||0)||(Number(a.x)||0)-(Number(b.x)||0));
   const scope=restricted&&selectedIds?.size?rangeScope(ordered,selectedIds):ordered;
   const inScope=new Set(scope.map(b=>b.id)),heights=new Map(),ys=new Map();
   const boxHeight=b=>Math.max(0,Number(b.h)||0);
   for(const b of scope){
     const raw=Number(measurements?.get?.(b.id))||0;
     const oldH=boxHeight(b);
     heights.set(b.id,raw>0?(normalizeHeights?Math.max(MIN_H,Math.round(raw)):Math.max(oldH,Math.round(raw))):oldH);
   }
   // Preserve each pair's own source gap: next.y - (previous.y + previous.h).
   // Only an already-overlapping pair needs a safety gap; positive authored gaps are
   // never normalized to a shared value.
   for(let i=0;i<scope.length;i++){
     const b=scope[i],oldY=Number(b.y)||0;
     let prev=null;
     for(let j=i-1;j>=0;j--){if(overlapsColumn(scope[j],b)){prev=scope[j];break;}}
     let y=oldY;
     if(prev){
       const prevOldY=Number(prev.y)||0,prevOldH=boxHeight(prev);
       const sourceGap=oldY-(prevOldY+prevOldH);
       const gap=sourceGap>=0?sourceGap:MIN_GAP;
       y=(ys.get(prev.id)??prevOldY)+(heights.get(prev.id)??prevOldH)+gap;
     }
     ys.set(b.id,y);
   }
   const updates=[];
   for(const b of scope){
     const newY=Math.round(ys.get(b.id)??(Number(b.y)||0)),newH=Math.round(heights.get(b.id)??boxHeight(b));
     if(Math.abs(newY-(Number(b.y)||0))>EPS||Math.abs(newH-boxHeight(b))>EPS)updates.push({blockId:b.id,newY,newH});
   }
   return {moves:updates,changed:updates.length>0,scopeIds:[...inScope]};
 }
 function applyPlan(t,plan){
   if(!plan?.changed)return false;
   for(const m of plan.moves){const b=t.blocks.find(x=>x.id===m.blockId);if(!b)continue;b.y=m.newY;b.h=m.newH;}
   return true;
 }
 function refreshTemplate(t){
   if(typeof store!=='undefined')store.save();
   if(window.SB_Gallery?.mode==='grid'||window.SB_Gallery?.mode==='split')window.SB_Gallery.updateCards([t.id]);
   if(typeof renderCanvasTemplate==='function'&&t.id===selectedId)renderCanvasTemplate(t);
   if(typeof renderInspector==='function'&&t.id===selectedId)renderInspector(t);
   else if(typeof renderInspectorProps==='function'&&t.id===selectedId)renderInspectorProps();
 }
 function paintUpdated(t,plan){refreshTemplate(t);}
 function normalizeSelected(){
   const t=getTemplate(typeof selectedId!=='undefined'?selectedId:null);if(!t)return {count:0};
   const selected=getSelectedTextBlocks(t),updates=[];
   for(const b of selected){
     const measured=measureNaturalHeight(t,b);if(!(measured>0))continue;
     const newH=Math.max(MIN_H,Math.round(measured));
     if(Math.abs(newH-(Number(b.h)||0))>EPS)updates.push({b,newH});
   }
   if(!updates.length){if(typeof toast==='function')toast('Normalize: выберите измеримые текстовые блоки.');return {count:0};}
   if(typeof pushUndo==='function')pushUndo();
   for(const {b,newH} of updates)b.h=newH;
   refreshTemplate(t);
   if(typeof toast==='function')toast(`Normalize: обновлена высота текстовых блоков ${updates.length}.`);
   return {count:updates.length};
 }
 function adaptTemplate(t,manual,restrictToSelection,normalizeAll=false){
   if(!t)return {count:0,templates:0};
   try{
     const normalize=!!(manual&&normalizeAll);
     const selected=manual&&restrictToSelection&&!normalize?getSelectedTextBlocks(t):[];
     const restricted=!!(manual&&restrictToSelection&&!normalize&&selected.length),selectedIds=new Set(selected.map(b=>b.id));
     const measureSet=restricted?new Set(rangeScope((t.blocks||[]).filter(b=>b.kind==='text'&&b.visible!==false).sort((a,b)=>(Number(a.y)||0)-(Number(b.y)||0)||(Number(a.x)||0)-(Number(b.x)||0)),selectedIds).map(b=>b.id)):new Set((t.blocks||[]).filter(b=>b.kind==='text'&&b.visible!==false).map(b=>b.id));
     const measurements=new Map();
     for(const b of t.blocks||[])if(b.kind==='text'&&measureSet.has(b.id))measurements.set(b.id,measureNaturalHeight(t,b));
     // Normalize All is applied atomically in the plan: source y/h still provide each authored gap.
     const plan=makePlan(t,measurements,selectedIds,restricted,normalize);
     if(!plan?.changed){if(typeof toast==='function')toast('Адаптация: нет измеримых изменений. Диапазон без выделения адаптирует весь шаблон.');return {count:0,templates:1};}
     if(typeof pushUndo==='function')pushUndo();
     applyPlan(t,plan);paintUpdated(t,plan);
     if(typeof toast==='function')toast(`${manual?'Adapt':'Auto'}: обновлено текстовых блоков ${plan.moves.length}${restricted?' · диапазон':''}${normalize?' · Normalize All':''}.`);
     return {count:plan.moves.length,templates:1};
   }catch(err){
     console.error('Text adaptation failed:',err);
     if(typeof toast==='function')toast('Адаптация не выполнена: ошибка измерения/перестроения. Откройте консоль для подробностей.');
     return {count:0,templates:1,error:err};
   }
 }
 function adaptCurrent(manual=true){
   const t=getTemplate(typeof selectedId!=='undefined'?selectedId:null);
   const normalize=!!(manual&&settings.normalizeAll);
   return adaptTemplate(t,manual,manual&&settings.useSelection&&!normalize,normalize);
 }
 function schedule(t,b){
   if(!settings.auto)return;
   pendingJobs.set(t.id,b.id);
   const old=timers.get(t.id);if(old)clearTimeout(old);
   timers.set(t.id,setTimeout(()=>{
     timers.delete(t.id);if(!settings.auto||!getTemplate(t.id))return;
     const active=document.activeElement,editing=active?.matches?.('#stageWrap .cv-text')&&active.closest('#stageWrap .cv-block');
     if(editing)return;
     pendingJobs.delete(t.id);adaptTemplate(getTemplate(t.id),false,false);
   },settings.delay));
 }
 function flush(t,b){if(!pendingJobs.has(t.id))return;const timer=timers.get(t.id);if(timer)clearTimeout(timer);timers.delete(t.id);pendingJobs.delete(t.id);if(settings.auto)adaptTemplate(getTemplate(t.id),false,false);}
 function renderControls(){
   const t=getTemplate(typeof selectedId!=='undefined'?selectedId:null),selected=t?getSelectedTextBlocks(t):[];
   const hint=settings.normalizeAll?'All: Normalize all text before Adapt.':settings.useSelection?(selected.length?'Range: от первого до последнего выделенного блока.':'Range без выделения — весь шаблон.'):'Без Range — весь шаблон.';
   return `<div class="adapt-controls"><div class="adapt-toolbar"><label class="adapt-toggle" title="Auto: автоматически адаптировать текст при редактировании"><input type="checkbox" data-adapt-auto ${settings.auto?'checked':''}><span>Auto</span></label><label class="adapt-toggle" title="Range: от первого до последнего выбранного текстового блока; без выделения — весь шаблон"><input type="checkbox" data-adapt-selection ${settings.useSelection?'checked':''}><span>Range</span></label><label class="adapt-toggle" title="Normalize All: перед Adapt нормализовать все текстовые блоки шаблона"><input type="checkbox" data-adapt-all ${settings.normalizeAll?'checked':''}><span>All</span></label><button type="button" class="adapt-run" data-adapt-manual title="Безопасно адаптировать высоты и позиции текста">Adapt</button></div><small class="adapt-status">${hint}</small></div>`;
 }
 const style=document.createElement('style');style.textContent=`
 .adapt-controls{display:grid;gap:4px;padding:6px 7px;border:1px solid var(--ui-line);border-radius:7px;background:var(--ui-panel)}
 .adapt-toolbar{display:flex;align-items:center;gap:4px;flex-wrap:nowrap;min-width:0}
 .adapt-toggle{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:0;height:28px;padding:0 5px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-panel-2);color:var(--ui-text);font-size:10px;line-height:1;cursor:pointer;white-space:nowrap}
 .adapt-toggle:hover{border-color:var(--ui-accent);background:#232935}
 .adapt-toggle input[type=checkbox]{appearance:none;-webkit-appearance:none;position:relative;width:13px;height:13px;flex:none;margin:0;border:1px solid #394353;border-radius:3px;background:#11151b;cursor:pointer}
 .adapt-toggle input[type=checkbox]::after{content:"";position:absolute;left:3px;top:0px;width:4px;height:7px;border:solid var(--ui-accent);border-width:0 2px 2px 0;transform:rotate(45deg);opacity:0}
 .adapt-toggle input[type=checkbox]:checked::after{opacity:1}
 .adapt-toggle input[type=checkbox]:focus-visible{outline:2px solid var(--ui-accent);outline-offset:2px}
 .adapt-controls .adapt-run,.adapt-controls .adapt-normalize{height:28px;min-width:48px;padding:0 8px;border:1px solid var(--ui-accent-2);border-radius:5px;background:var(--ui-accent-2);color:#fff;font:600 10px/1 Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
 .adapt-controls .adapt-run:hover{background:var(--ui-accent);border-color:var(--ui-accent)}
 .adapt-controls .adapt-normalize{min-width:49px;background:var(--ui-panel-2);border-color:var(--ui-line);color:var(--ui-text)}
 .adapt-controls .adapt-normalize:hover:not(:disabled){border-color:var(--ui-accent);background:#232935}
 .adapt-controls button:focus-visible{outline:2px solid var(--ui-accent);outline-offset:2px}
 .adapt-controls button:disabled{opacity:.42;cursor:not-allowed}
 .adapt-controls .adapt-status{color:var(--ui-muted);font-size:9px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 body:not(.v5-active) #stageWrap .cv-block.selected{box-shadow:none}
 body:not(.v5-active) #stageWrap .cv-block.multi-selected{outline:2px solid #5b8cff;outline-offset:1px;box-shadow:none}
 body.v5-active #stageWrap .cv-block.multi-selected{outline:2px solid #5b8cff;outline-offset:1px;box-shadow:none}
 `;document.head.append(style);
 document.addEventListener('input',e=>{const ed=e.target.closest?.('#stageWrap .cv-text');if(!ed)return;const t=getTemplate(typeof selectedId!=='undefined'?selectedId:null),id=ed.closest('.cv-block')?.dataset.id,b=t?.blocks.find(x=>x.id===id&&x.kind==='text');if(b)schedule(t,b);},true);
 document.addEventListener('focusout',e=>{const ed=e.target.closest?.('#stageWrap .cv-text');if(!ed)return;const t=getTemplate(typeof selectedId!=='undefined'?selectedId:null),id=ed.closest('.cv-block')?.dataset.id,b=t?.blocks.find(x=>x.id===id&&x.kind==='text');if(t&&b)flush(t,b);},true);
 document.addEventListener('change',e=>{
   const el=e.target;if(!el||typeof el.matches!=='function')return;
   if(el.matches('[data-adapt-auto]')){e.stopPropagation();settings.auto=el.checked;if(!settings.auto){for(const timer of timers.values())clearTimeout(timer);timers.clear();pendingJobs.clear();}persist();}
   else if(el.matches('[data-adapt-delay]')){e.stopPropagation();settings.delay=clamp(el.value,0,10000);el.value=settings.delay;persist();}
   else if(el.matches('[data-adapt-selection]')){e.stopPropagation();settings.useSelection=el.checked;persist();const status=el.closest('.adapt-controls')?.querySelector('.adapt-status');if(status)status.textContent=settings.useSelection?'Range: от первого до последнего выделенного блока; без выделения — весь шаблон.':'Без Range — весь шаблон.';}
   else if(el.matches('[data-adapt-all]')){e.stopPropagation();settings.normalizeAll=el.checked;persist();const status=el.closest('.adapt-controls')?.querySelector('.adapt-status');if(status)status.textContent=settings.normalizeAll?'All: Normalize all text before Adapt.':settings.useSelection?'Range: от первого до последнего выделенного блока.':'Без Range — весь шаблон.';}
 },true);
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-adapt-manual]')){e.preventDefault();e.stopPropagation();adaptCurrent(true);}else if(e.target.closest?.('[data-adapt-normalize]')){e.preventDefault();e.stopPropagation();normalizeSelected();}},true);
 document.addEventListener('keydown',e=>{
   if(!(e.ctrlKey||e.metaKey)||!e.altKey||e.key.toLowerCase()!=='a'||e.repeat)return;
   const target=e.target,typing=target?.isContentEditable||target?.matches?.('input,textarea,select');if(typing)return;
   e.preventDefault();adaptCurrent(true);
 });
 window.CoversAdaptationV1={settings,renderControls,adaptCurrent,normalizeSelected,measureNaturalHeight,makePlan,applyPlan,setSelected,getSelected:getSelectedTextBlocks};
})();
