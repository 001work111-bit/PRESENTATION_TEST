/* Style editor v5: manual role/category bindings, live sessions, explicit drafts, separate auto. */
(function(){
 'use strict';
 const E=window.CoversStyleEngineV5,AI=window.CoversAIContractV5;
 const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ui={active:false,styleId:'',category:'__all',expandedRole:'',choice:{},draft:null,blockPicks:window.CoversSelectionV1?.ids||new Set(),message:'',randomRound:0,clipboard:null};
 let session=null,uiUndo=[],uiRedo=[],lastCopiedGap=null;
 const GAP_KEY='cs_v5_editor_last_gap';
 try{const savedGap=localStorage.getItem(GAP_KEY);if(savedGap!==null&&savedGap!==''&&Number.isFinite(Number(savedGap)))lastCopiedGap=Number(savedGap);}catch(_){}
 const uiState=()=>({styleId:ui.styleId,category:ui.category,expandedRole:ui.expandedRole,choice:{...ui.choice},draft:ui.draft?{...ui.draft}:null,participants:session?[...session.participants]:null});
 function restoreUi(x){if(!x)return;ui.styleId=x.styleId;ui.category=x.category;ui.expandedRole=x.expandedRole;ui.choice={...x.choice};ui.draft=x.draft?{...x.draft}:null;if(session&&x.participants)session.participants=new Set(x.participants);}
 Object.defineProperty(ui,'sessionActive',{get:()=>!!session});window.CoversStyleV5=ui;
 const measure={distances:false,typography:false};
 try{Object.assign(measure,JSON.parse(localStorage.getItem('cs_v5_measure_overlay')||'{}'));}catch(_){}
 measure.distances=!!measure.distances;measure.typography=!!measure.typography;
 function svgEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function compactColor(value){
   const v=String(value||'').trim();let m=v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
   const compact=h=>h[0]===h[1]&&h[2]===h[3]&&h[4]===h[5]?'#'+h[0]+h[2]+h[4]:'#'+h;
   if(m){const base=compact(m[1].toLowerCase()),a=m[2]?parseInt(m[2],16)/255:1;return base+(a<.995?' '+Math.round(a*100)+'%':'');}
   m=v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+)%?)?\s*\)$/i);
   if(m){const hex=m.slice(1,4).map(x=>Math.max(0,Math.min(255,+x)).toString(16).padStart(2,'0')).join('').toLowerCase(),alpha=m[4]===undefined?1:(+m[4]>1?+m[4]/100:+m[4]),base=compact(hex);return base+(alpha<.995?' '+Math.round(alpha*100)+'%':'');}
   return v.length>10?v.slice(0,9)+'…':v||'—';
 }
 function measurementMarkup(t){
   const blocks=(t?.blocks||[]).filter(b=>Number.isFinite(Number(b.x))&&Number.isFinite(Number(b.y))&&Number.isFinite(Number(b.w))&&Number.isFinite(Number(b.h)));
   const out=[];
   if(measure.distances){
     const pairs=new Set();
     for(const a of blocks){
       const ax=Number(a.x),aw=Number(a.w),bottom=Number(a.y)+Number(a.h);let nearest=null;
       for(const b of blocks){if(a===b||Number(b.y)<bottom)continue;
         const overlap=Math.min(ax+aw,Number(b.x)+Number(b.w))-Math.max(ax,Number(b.x));if(overlap<=0)continue;
         const gap=Number(b.y)-bottom;if(!nearest||gap<nearest.gap)nearest={b,gap,x:Math.max(ax,Number(b.x))+overlap/2};
       }
       if(!nearest)continue;const b=nearest.b,key=a.id+'\u0000'+b.id;if(pairs.has(key))continue;pairs.add(key);
       const x=nearest.x,y1=bottom,y2=Number(b.y),mid=(y1+y2)/2,label=Math.round(nearest.gap*10)/10+'px',w=Math.max(25,label.length*4.7+8);
       out.push(`<g class="v5-measure-distance" fill="none" stroke="#53a8ff" stroke-opacity=".58" stroke-width=".8"><path d="M${x} ${y1}V${y2} M${x-3} ${y1}h6 M${x-3} ${y2}h6"/><rect x="${x-w/2}" y="${mid-6}" width="${w}" height="12" rx="2" fill="#111722" fill-opacity=".9" stroke="#53a8ff" stroke-opacity=".45"/><text x="${x}" y="${mid+2.8}" text-anchor="middle" fill="#b8dcff" stroke="none" font-family="ui-monospace,monospace" font-size="7">${label}</text></g>`);
     }
     for(const a of blocks){
       const right=Number(a.x)+Number(a.w),ay=Number(a.y),ah=Number(a.h);let nearest=null;
       for(const b of blocks){if(a===b||Number(b.x)<right)continue;
         const overlap=Math.min(ay+ah,Number(b.y)+Number(b.h))-Math.max(ay,Number(b.y));if(overlap<=0)continue;
         const gap=Number(b.x)-right;if(!nearest||gap<nearest.gap)nearest={b,gap,y:Math.max(ay,Number(b.y))+overlap/2};
       }
       if(!nearest)continue;const b=nearest.b,key=a.id+'\u0000'+b.id+':h';if(pairs.has(key))continue;pairs.add(key);
       const y=nearest.y,x1=right,x2=Number(b.x),mid=(x1+x2)/2,label=Math.round(nearest.gap*10)/10+'px',w=Math.max(25,label.length*4.7+8);
       out.push(`<g class="v5-measure-distance" fill="none" stroke="#53a8ff" stroke-opacity=".58" stroke-width=".8"><path d="M${x1} ${y}H${x2} M${x1} ${y-3}v6 M${x2} ${y-3}v6"/><rect x="${mid-w/2}" y="${y-6}" width="${w}" height="12" rx="2" fill="#111722" fill-opacity=".9" stroke="#53a8ff" stroke-opacity=".45"/><text x="${mid}" y="${y+2.8}" text-anchor="middle" fill="#b8dcff" stroke="none" font-family="ui-monospace,monospace" font-size="7">${label}</text></g>`);
     }
   }
   if(measure.typography){
     const texts=blocks.filter(b=>b.kind==='text');let occupied=[];
     for(const b of texts){
       const s=b.style||{},width=94,height=28;let x=Number(b.x)+Number(b.w)+5,side='right';
       if(x+width>1123){x=Number(b.x)-width-5;side='left';}x=Math.max(2,Math.min(1123-width-2,x));
       let y=Math.max(2,Math.min(794-height-2,Number(b.y)-2));
       for(let tries=0;tries<12&&occupied.some(v=>Math.abs(v-y)<height);tries++)y=Math.min(794-height-2,y+height+2);
       occupied.push(y);
       const family=String(s.fontFamily||'Inter').split(',')[0].replace(/["']/g,'').trim().slice(0,14)||'Inter';
       const weight=String(s.fontWeight||400),size=(Number(s.fontSize)||16)+'px',color=compactColor(s.color||'#000');
       const line1=`${family} ${weight}`,line2=`${size} ${color}`;
       const bx=side==='right'?x:x+width,tx=x+4;
       out.push(`<g class="v5-measure-type"><path d="M${side==='right'?Number(b.x)+Number(b.w):Number(b.x)} ${Number(b.y)+4} H${bx}" fill="none" stroke="#c38cff" stroke-opacity=".48" stroke-width=".7"/><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3" fill="#11151c" fill-opacity=".88" stroke="#c38cff" stroke-opacity=".48" stroke-width=".7"/><text x="${tx}" y="${y+10}" fill="#e5d4ff" font-family="ui-monospace,monospace" font-size="7.3">${svgEscape(line1)}</text><text x="${tx}" y="${y+21}" fill="#d4c1f0" font-family="ui-monospace,monospace" font-size="7.3">${svgEscape(line2)}</text></g>`);
     }
   }
   return out.join('');
 }
 function renderMeasurementPage(page,t){
   if(!page)return;
   let svg=page.querySelector(':scope > .v5-measure-overlay');
   if(!ui.active||(!measure.distances&&!measure.typography)||!t){svg?.remove();return;}
   if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('v5-measure-overlay');svg.setAttribute('viewBox','0 0 1123 794');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:10000;';page.appendChild(svg);}
   svg.innerHTML=measurementMarkup(t);
 }
 function refreshMeasurementOverlays(){
   renderMeasurementPage(document.getElementById('cvCanvas'),getActiveTpl());
   document.querySelectorAll('#galRoot .sb-gal-page').forEach(page=>{const t=LIB[page.closest('.gal-card')?.dataset.id];renderMeasurementPage(page,t);});
 }
 window.CoversMeasurementOverlayV1={renderPage:renderMeasurementPage,refresh:refreshMeasurementOverlays,settings:measure};
 const baseCanvasRender=window.renderCanvasTemplate;
 if(typeof baseCanvasRender==='function')window.renderCanvasTemplate=function(t){const r=baseCanvasRender.apply(this,arguments);renderMeasurementPage(document.getElementById('cvCanvas'),t||getActiveTpl());return r;};
 const baseUpdateBox=window.updateBlockDomBox;
 if(typeof baseUpdateBox==='function')window.updateBlockDomBox=function(){const r=baseUpdateBox.apply(this,arguments);if(ui.active)renderMeasurementPage(document.getElementById('cvCanvas'),getActiveTpl());return r;};
 const saved={save:store.save.bind(store),saveStyles:store.saveStyles.bind(store),render:window.renderInspector,empty:window.renderInspectorEmpty,undo:window.undo,redo:window.redo,styleManager:window.openStyleMgr};
 store.save=function(){if(!session)saved.save();};store.saveStyles=function(){saved.saveStyles();window.CoversEditorStoreV6.persist();};
 window.renderInspector=function(t){return ui.active?render():saved.render.call(this,t);};
 window.renderInspectorEmpty=function(){return ui.active?render():saved.empty.call(this);};
 function history(action){
   if(action==='undo'&&session&&UNDO.length<=session.undoStart){toast('Достигнуто начало сессии');return;}
   const before=session?uiState():null,isMap=['grid','split'].includes(window.SB_Gallery?.mode);
   if(isMap)window.__v5SkipGalleryRebuild=true;
   try{(action==='undo'?saved.undo:saved.redo)();}finally{window.__v5SkipGalleryRebuild=false;}
   if(session&&action==='undo'&&uiUndo.length){uiRedo.push(before);restoreUi(uiUndo.pop());}
   if(session&&action==='redo'&&uiRedo.length){uiUndo.push(before);restoreUi(uiRedo.pop());}
   if(isMap)SB_Gallery.updateCards(Object.keys(LIB));
   if(ui.active){renderTopFilterDDs();render();}
 }
 window.undo=()=>history('undo');window.redo=()=>history('redo');
 if(saved.styleManager)window.openStyleMgr=function(){if(session){toast('Сначала завершите сессию стиля');return;}saved.styleManager();};
 const css=document.createElement('style');css.textContent=`
 body.v5-active #inspector .bulk-bar{display:none!important}
 .v5-editor{display:flex;flex-direction:column;gap:13px;color:var(--ui-text);font-size:11px}
 .v5-editor section{border-bottom:1px solid var(--ui-line);padding-bottom:12px}
 .v5-editor h3{font-size:11px;letter-spacing:.11em;color:var(--ui-accent);text-transform:uppercase;margin:0 0 8px}
 .v5-editor .row,.v5-editor .actions{display:flex;align-items:center;gap:5px;margin:6px 0;min-width:0}
 .v5-editor .actions>button{flex:1}
 .v5-editor .v5-gap-toolbar{display:flex;align-items:center;gap:4px;margin-top:5px}
 .v5-editor .v5-gap-toolbar button{height:27px;flex:1;min-width:0;padding:0 6px;font:600 10px Inter,system-ui,sans-serif;white-space:nowrap}
 .v5-editor .v5-gap-toolbar [data-adapt-normalize]{flex:1.35}
 .v5-editor .v5-gap-value{flex:0 0 auto;min-width:65px;text-align:right;color:var(--ui-muted);font-size:10px;white-space:nowrap}
 .v5-editor .v5-gap-toolbar button:disabled{opacity:.42;cursor:not-allowed}
 .v5-editor .v5-measure-toggles{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.v5-editor .v5-measure-toggles label{display:inline-flex;align-items:center;gap:4px;color:var(--ui-text);font-size:10px;white-space:nowrap}.v5-editor .v5-measure-toggles input{accent-color:#58aaff;margin:0}
 .v5-editor .row>label{flex:0 0 70px;color:var(--ui-muted)}
 .v5-editor select,.v5-editor input[type=text],.v5-editor input[type=number]{color:var(--ui-text);background:var(--ui-panel-2);border:1px solid var(--ui-line);border-radius:6px;padding:6px;font:11px Inter,system-ui,sans-serif;min-width:0;flex:1}
 .v5-editor input[type=color]{width:27px;height:23px;border:0;background:transparent;padding:0;flex:none}
 .v5-editor button,.v5-ai button{border:1px solid var(--ui-line);background:var(--ui-panel-2);color:var(--ui-text);padding:5px 6px;border-radius:5px;font-size:11px;cursor:pointer}
 .v5-editor button:hover,.v5-ai button:hover{border-color:var(--ui-accent)}
 .v5-editor button:disabled{opacity:.42;cursor:not-allowed}
 .v5-editor button.on,.v5-editor button.primary{background:var(--ui-accent-2);border-color:var(--ui-accent-2);color:#fff}
 .v5-editor .role{padding:6px 0;border-bottom:1px solid var(--ui-line)}
 .v5-editor .role-head{display:flex;align-items:center;gap:4px}
 .v5-editor .role-label{flex:1;overflow:hidden;text-overflow:ellipsis;font-weight:600}
 .v5-editor .chips{display:flex;flex-wrap:wrap;gap:3px;align-items:center;justify-content:flex-end}
 .v5-editor .chips button{min-width:22px;padding:4px 5px}
 .v5-editor .preset-info{padding:7px;margin:5px 0 0 0;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-panel-2)}
 .v5-editor .preset-info .row{margin:3px 0}
 .v5-editor .meta,.v5-editor summary{font-size:10px;line-height:1.5;color:var(--ui-muted)}
 .v5-editor summary{cursor:pointer;padding:4px 0}
 .v5-editor .font-row{display:grid;grid-template-columns:55px minmax(65px,1fr) minmax(80px,.95fr) minmax(68px,.85fr);gap:4px;margin:4px 0;align-items:center;font-size:10px}
 .v5-editor .font-row select{width:100%}.v5-editor .weights{position:relative;min-width:0}.v5-editor .weights summary{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border:1px solid var(--ui-line);border-radius:5px;padding:5px}.v5-editor .weight-list{position:absolute;right:0;top:100%;z-index:30;width:130px;max-height:160px;overflow:auto;background:#222b36;border:1px solid var(--ui-line);border-radius:6px;box-shadow:0 10px 25px #0009;padding:6px}.v5-editor .weight-list label{display:block;white-space:nowrap;padding:2px}
 .v5-editor .font-row span{overflow:hidden;text-overflow:ellipsis}.v5-editor .v6-swatch{display:inline-block;flex:none;width:12px;height:12px;border:1px solid #8290a0;border-radius:3px;vertical-align:middle}.v5-editor .v6-color-summary{display:flex;align-items:center;gap:2px}.v5-editor .v6-color-summary small{margin-left:auto}.v5-editor .color-list{width:230px;max-height:240px}.v5-editor .color-list label{display:flex;align-items:center;gap:4px;cursor:pointer}.v5-editor .color-list small{overflow:hidden;text-overflow:ellipsis;color:#aab4c0}
 .v5-editor .message{padding:8px;border:1px solid var(--ui-line);border-radius:6px;color:var(--ui-muted);line-height:1.5}
 #galRoot .gal-scale [data-v5-block].v5-picked{outline:2px solid #5b8cff!important;outline-offset:1px}
 .v5-editor .v6-role-group{margin:9px 0 13px;border:1px solid var(--ui-line);border-radius:7px;padding:7px 8px}.v5-editor .v6-role-group-name{display:flex;justify-content:space-between;gap:8px;color:var(--ui-accent);font-weight:700;padding-bottom:4px}.v5-editor .v6-role-group-name small{font-size:9px;font-weight:400;color:var(--ui-muted)}
 .v5-editor .v6-cat-tag{color:var(--ui-muted);font-weight:500;font-size:10px}.v5-editor .v6-role-used{box-shadow:inset 2px 0 #7296c6;padding-left:4px}.v5-editor .v6-role-selected{box-shadow:inset 3px 0 #f6bb68;background:rgba(246,187,104,.055)}
 .v5-editor .chips button.v6-used{outline:1px dashed #82b6ff;outline-offset:1px}.v5-editor .chips button.v6-selected{outline:2px solid #f6bb68;outline-offset:1px}.v5-editor .chips .v6-swatch{width:8px;height:8px;margin-left:3px}
 .v5-editor .v7-merged .role-label{flex:0 1 90px;min-width:65px}
 .v5-editor .v7-merged .chips{flex:1;min-width:0;max-width:100%;flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;scrollbar-width:thin;padding:2px}
 .v5-editor .v7-merged .chips button{flex:none}
 .v5-editor .v7-merged .chips{scrollbar-width:thin;scrollbar-color:#465367 transparent}
 .v5-editor .v7-merged .chips::-webkit-scrollbar{height:5px}.v5-editor .v7-merged .chips::-webkit-scrollbar-track{background:transparent}.v5-editor .v7-merged .chips::-webkit-scrollbar-thumb{background:#465367;border-radius:9px}.v5-editor .v7-merged .chips::-webkit-scrollbar-thumb:hover{background:#6e829d}
 .v5-editor .font-row{grid-template-columns:42px minmax(50px,1fr) minmax(55px,.95fr) minmax(55px,.9fr) minmax(68px,.85fr);gap:3px}
 .v5-editor .font-opacity{display:flex;align-items:center;gap:3px}.v5-editor .font-opacity input{width:42px;accent-color:var(--ui-accent)}.v5-editor .font-opacity output{min-width:22px;color:var(--ui-muted)}
 .v5-editor .v7-merged .v7-assign{flex:none}
 .v5-editor .v6-legend{font-size:9px;color:var(--ui-muted);line-height:1.5}.v5-editor .v6-legend span{border-bottom:1px dashed #82b6ff}.v5-editor .v6-legend b{border-bottom:2px solid #f6bb68;font-weight:400}
 .v5-editor .v6-color-choice{position:relative;flex:1;min-width:0}.v5-editor .v6-color-choice>button{display:flex;align-items:center;gap:5px;width:100%;text-align:left;white-space:nowrap;overflow:hidden}.v5-editor .v6-color-menu{position:absolute;right:0;top:100%;width:min(265px,90vw);z-index:45;max-height:230px;overflow:auto;background:#222b36;border:1px solid #677488;border-radius:7px;padding:4px;box-shadow:0 14px 25px #0009}.v5-editor .v6-color-menu[hidden]{display:none}.v5-editor .v6-color-menu button{display:flex;align-items:center;gap:7px;text-align:left;width:100%;margin:1px 0}.v5-editor .v6-color-menu button span:last-child{display:flex;flex-direction:column}.v5-editor .v6-color-menu button small{color:var(--ui-muted)}
 .v5-editor .v6-binding-head{display:flex;justify-content:space-between;gap:5px}.v5-editor .v6-binding-head small{color:var(--ui-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v5-editor .v6-binding-row{display:block;text-align:left;width:100%;padding:7px;margin:6px 0;border:1px solid var(--ui-line);background:var(--ui-panel-2);border-radius:7px;font:10px/1.55 Inter,system-ui}.v5-editor .v6-binding-selected{border-color:#f6bb68}.v5-editor .v6-binding-title{display:flex;align-items:center;gap:7px}.v5-editor .v6-binding-title b{color:#f6bb68;font-size:11px}.v5-editor .v6-binding-title span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.7}.v5-editor .v6-binding-detail{margin-top:2px}.v5-editor .v6-binding-detail strong{color:#a9caff}
 body.v5-active #stageWrap .cv-text{caret-color:transparent}
 `;document.head.append(css);
 const opts=(pairs,selected)=>pairs.map(([id,label])=>`<option value="${h(id)}" ${String(id)===String(selected)?'selected':''}>${h(label)}</option>`).join('');
 function getStyle(){if(!EDITOR_STYLES[ui.styleId])ui.styleId=Object.keys(EDITOR_STYLES)[0]||'';return EDITOR_STYLES[ui.styleId]||null;}
 function model(){const s=getStyle();if(!s)return null;const v=E.ensure(s,GROUP_ORDER,LIB);if(ui.category!=='__all'&&!v.categories[ui.category])ui.category='__all';return v;}
 const key=(category,role)=>category+'\u0000'+role;
 function current(role,category){const v=model(),list=E.variants(v,category,role),links=selectionBindings(role,category),ids=[...new Set(links.map(({link})=>link.variantId))];
   const id=ids.length===1?ids[0]:ui.choice[key(category,role)];return list.find(x=>x.id===id)||list[0]||null;}
 function selectedTemplates(){
   if(checked.size)return [...checked].map(id=>LIB[id]).filter(Boolean);
   const q=window.SB_Gallery?.state?.query?.trim().toLowerCase()||'';
   return Object.values(LIB).filter(t=>tplPassesFilters(t)&&(!q||[t.id,t.label,t.templateGroup,t.visualStyle,BATCHES[t.batch]?.label].join(' ').toLowerCase().includes(q)));
 }
 function participants(){return session?[...session.participants].map(id=>LIB[id]).filter(Boolean):[];}
 function bound(category,role){return participants().flatMap(t=>(t.blocks||[]).filter(b=>b.kind==='text'&&E.getBinding(t,b,ui.styleId)?.categoryId===category&&E.getBinding(t,b,ui.styleId)?.roleId===role).map(b=>({t,b})));}
 function selectedBlocks(){
   const fromMap=[];for(const id of ui.blockPicks){const idx=id.indexOf('\u0000');if(idx<0)continue;const t=LIB[id.slice(0,idx)],b=t?.blocks?.find(x=>x.id===id.slice(idx+1)&&x.kind==='text');if(b)fromMap.push({t,b});}
   if(['grid','split'].includes(window.SB_Gallery?.mode))return fromMap;
   const t=getActiveTpl();if(!t)return [];
   const picks=[...ui.blockPicks].flatMap(id=>{const idx=id.indexOf('\u0000');if(idx<0||id.slice(0,idx)!==t.id)return [];const b=t.blocks.find(x=>x.kind==='text'&&x.id===id.slice(idx+1));return b?[{t,b}]:[];});
   if(picks.length)return picks;const b=t.blocks?.find(x=>x.kind==='text'&&x.id===selectedBlockId);return b?[{t,b}]:[];
 }
 // A numbered preset is stored on each bound text, not on the role as a whole.
 function selectionBindings(role,category){return selectedBlocks().flatMap(({t,b})=>{
   const link=t.editorStyleId===ui.styleId?E.getBinding(t,b,ui.styleId):null;
   return link&&link.roleId===role&&(category==null||link.categoryId===category)?[{t,b,link}]:[];
 });}
 const idsOf=refs=>[...new Set(refs.map(({t})=>t.id))];
 const targetKey=({t,b})=>t.id+'\u0000'+b.id;
 function draftRefs(draft){return (draft?.targets||[]).flatMap(id=>{const cut=id.indexOf('\u0000'),t=LIB[id.slice(0,cut)],b=t?.blocks.find(x=>x.id===id.slice(cut+1));
   const link=t?.editorStyleId===ui.styleId&&b&&E.getBinding(t,b,ui.styleId);
   return link&&link.categoryId===draft.category&&link.roleId===draft.role?[{t,b,link}]:[];
 });}
 function restoreDraftPaint(draft){for(const {b,link} of draftRefs(draft)){
   const variant=E.variants(model(),link.categoryId,link.roleId).find(x=>x.id===link.variantId);
   if(variant)E.paint(b,model(),link.roleId,variant);
 }}
 function stamp(){return {styleId:ui.styleId,category:ui.category,choice:{...ui.choice}};}
 function refresh(options={}){
   const ids=options.templateIds||[];
   if(selectedId&&LIB[selectedId])renderCanvasTemplate(LIB[selectedId]);
   if(['grid','split'].includes(window.SB_Gallery?.mode)){
     SB_Gallery.updateCards(ids);
     paintSelection();
   }else renderLib();
   if(options.catalog)renderTopFilterDDs();
   render();
 }
 function step(mutator,options={}){
   if(session){uiUndo.push(uiState());uiRedo.length=0;if(UNDO.length>=80)session.undoStart=Math.max(0,session.undoStart-1);}
   pushUndo();mutator();store.saveStyles();if(!session||options.persistTemplates)saved.save();refresh(options);
 }
 function begin(){
   if(session)return;
   session={baseline:snapshot(),undoStart:UNDO.length,participants:new Set(selectedTemplates().map(t=>t.id)),ui:stamp()};
   REDO.length=0;uiUndo=[];uiRedo=[];ui.message='Ручная сессия: изменения в текстах — черновик, пресеты и глобальные настройки сохраняются отдельно.';render();
 }
 function cancel(){
   if(!session)return;
   const old=session,stayId=selectedId,stayBlock=selectedBlockId;
   // Roll back ONLY templates. Presets, palette, weights and newly created styles survive Cancel.
   LIB=deepClone(old.baseline.LIB);BATCHES=deepClone(old.baseline.BATCHES);
   for(const [styleId,style] of Object.entries(EDITOR_STYLES))if(style.v4)E.reconcileBindings(style,styleId,LIB);
   session=null;UNDO.length=Math.min(UNDO.length,old.undoStart);REDO.length=0;uiUndo=[];uiRedo=[];
   selectedId=LIB[stayId]?stayId:null;
   selectedBlockId=selectedId&&LIB[selectedId].blocks.some(b=>b.id===stayBlock)?stayBlock:null;
   checked=new Set([...checked].filter(id=>LIB[id]));ui.draft=null;ui.blockPicks.clear();
   saved.save();store.saveBatches();store.saveStyles();saveGroups();ui.message='Привязки и правки шаблонов отменены. Созданные пресеты и изменения стиля сохранены.';
   refresh({templateIds:Object.keys(LIB),catalog:true});
 }
 function apply(){if(!session)return;if(ui.draft){ui.message='Сначала сохраните черновик кнопкой + либо сбросьте его.';render();return;}
   session=null;uiUndo=[];uiRedo=[];saved.save();store.saveStyles();saveGroups();ui.message='Привязки к шаблонам применены.';refresh();}
 function saveGroups(){try{localStorage.setItem('cs_v5_groups',JSON.stringify(GROUP_ORDER));}catch(_){}}
 // Media actions are independent of the editor transaction: Cancel keeps their result.
 ui.persistMedia=function(ids){
   if(!session){saved.save();return;}
   for(const id of ids){const live=LIB[id],base=session.baseline.LIB[id];if(!live||!base)continue;
     for(const b of base.blocks||[]){if(b.kind!=='image')continue;const now=live.blocks?.find(x=>x.id===b.id&&x.kind==='image');if(now){b.src=now.src;b.isTemplatePlaceholder=now.isTemplatePlaceholder;}}
   }
   try{localStorage.setItem('cs_v5_lib',JSON.stringify(session.baseline.LIB));}catch(e){toast('Не удалось сохранить картинки: '+e.message);}
 };
 function removeBlockBindings(t,b){for(const map of Object.values(t.v5Bindings||{}))if(map)delete map[b.id];}
 function copyAll(){
   const targets=selectedBlocks();if(targets.length!==1){ui.message='Для Copy All выберите ровно один текстовый блок.';render();return;}
   const {t,b}=targets[0],styleId=t.editorStyleId,link=styleId&&E.getBinding(t,b,styleId),variant=link&&E.variants(EDITOR_STYLES[styleId]?.v4,link.categoryId,link.roleId).find(x=>x.id===link.variantId);
   const preset=variant?{styleId,category:link.categoryId,role:link.roleId,variantId:variant.id}:null;
   ui.clipboard={mode:'all',textStyle:JSON.parse(JSON.stringify(b.style||{})),preset,from:t.id+'/'+b.id};
   ui.message=`Copy All: скопированы все визуальные параметры${preset?' и preset '+preset.category+' / '+preset.role:''}. Геометрия, ID и содержимое не копируются.`;render();
 }
 function copyPreset(){
   const targets=selectedBlocks();if(targets.length!==1){ui.message='Для Copy Preset выберите ровно один текстовый блок.';render();return;}
   const {t,b}=targets[0],styleId=t.editorStyleId,link=styleId&&E.getBinding(t,b,styleId),variant=link&&E.variants(EDITOR_STYLES[styleId]?.v4,link.categoryId,link.roleId).find(x=>x.id===link.variantId);
   if(!variant){ui.message='У выбранного текста нет назначенного preset/binding.';render();return;}
   ui.clipboard={mode:'preset',styleId,category:link.categoryId,role:link.roleId,variantId:variant.id,from:t.id+'/'+b.id};
   ui.message=`Copy Preset: ${EDITOR_STYLES[styleId]?.name||styleId} · ${link.categoryId} / ${link.roleId}. Визуальные параметры отдельно не копировались.`;render();
 }
 function pasteText(){
   const copy=ui.clipboard;if(!copy){ui.message='Сначала выполните Copy All или Copy Preset.';render();return;}
   const preset=copy.mode==='all'?copy.preset:copy;
   const style=preset&&EDITOR_STYLES[preset.styleId],variant=preset&&E.variants(style?.v4,preset.category,preset.role).find(x=>x.id===preset.variantId);
   if(copy.mode==='preset'&&!variant){ui.message='Скопированный preset отсутствует или был удалён.';render();return;}
   if(preset&&!variant)ui.message='Preset из источника уже недоступен; будут применены только визуальные параметры.';
   const targets=selectedBlocks();if(!targets.length){ui.message='Выберите один или несколько целевых текстовых блоков.';render();return;}
   const messagePreset=variant?`${preset.category} / ${preset.role} · вес ${variant.weight}, цвет ${variant.colorToken}`:'';
   step(()=>{let n=0;
     for(const {t,b} of targets){session?.participants.add(t.id);b.style ||= {};
       if(copy.mode==='all'){
         if(variant){
           removeBlockBindings(t,b);
           if(E.bind(t,b,preset.styleId,style,preset.category,preset.role,variant.id,{keepFamily:true}))t.editorStyleId=preset.styleId;
         }else removeBlockBindings(t,b);
         b.style=JSON.parse(JSON.stringify(copy.textStyle||{}));n++;
       }else{
         const before=JSON.parse(JSON.stringify(b.style||{}));
         if(E.bind(t,b,preset.styleId,style,preset.category,preset.role,variant.id,{keepFamily:true})){
           const painted=b.style||{};b.style={...before,color:painted.color,fontWeight:painted.fontWeight};n++;
         }
       }
     }
     ui.message=copy.mode==='all'?`Copy All применён к ${n} текстам${variant?' · preset '+messagePreset:''}. Геометрия и содержимое сохранены.`:`Copy Preset применён к ${n} текстам: ${messagePreset}. Остальные визуальные параметры сохранены.`;
   },{templateIds:idsOf(targets),persistTemplates:!session});
 }
 function saveRolePreset(){
   const targets=selectedBlocks();if(targets.length!==1){ui.message='Для Save Role Preset выберите ровно один текстовый блок.';render();return;}
   const {t,b}=targets[0],style=getStyle(),v=model(),existingBinding=t.editorStyleId===ui.styleId?E.getBinding(t,b,ui.styleId):null;
   const boundVariant=existingBinding&&E.variants(v,existingBinding.categoryId,existingBinding.roleId).find(x=>x.id===existingBinding.variantId);
   const role=existingBinding?.roleId||E.roleOf(b),category=existingBinding?.categoryId&&v.categories[existingBinding.categoryId]?existingBinding.categoryId:(v.categories[t.templateGroup]?t.templateGroup:(ui.category!=='__all'&&v.categories[ui.category]?ui.category:Object.keys(v.categories)[0]));
   const color=E.normalizeColor(b.style?.color||v.palette[boundVariant?.colorToken]),weight=Number(b.style?.fontWeight??boundVariant?.weight);
   if(!category||!role||!color||!Number.isFinite(weight)){ui.message='Не удалось определить категорию, semantic role, цвет и вес выбранного текста.';render();return;}
   let colorToken=Object.keys(v.palette).find(name=>String(E.normalizeColor(v.palette[name])||'').toLowerCase()===String(color).toLowerCase());
   if(!colorToken){let i=1;do{colorToken='Color '+i++;}while(Object.prototype.hasOwnProperty.call(v.palette,colorToken));}
   step(()=>{
     const liveV=model(),liveSpec=liveV.typography[role]||(liveV.typography[role]={family:'Inter',weights:[],allowedColors:[]});
     liveSpec.weights||=[];if(!liveSpec.weights.some(x=>Number(x)===weight))liveSpec.weights.push(weight);liveSpec.allowedColors||=[];if(!liveSpec.allowedColors.includes(colorToken))liveSpec.allowedColors.push(colorToken);
     if(!liveV.palette[colorToken])liveV.palette[colorToken]=color;
     const liveList=liveV.categories[category].roles[role]||(liveV.categories[category].roles[role]=[]);
     let variant=liveList.find(x=>Number(x.weight)===weight&&String(E.normalizeColor(liveV.palette[x.colorToken])||'').toLowerCase()===String(color).toLowerCase());
     const existed=!!variant;if(!variant){variant={id:E.uid('v'),weight,colorToken};liveList.push(variant);}
     const before=JSON.parse(JSON.stringify(b.style||{}));E.bind(t,b,ui.styleId,style,category,role,variant.id,{keepFamily:true});b.style=before;
     ui.choice[key(category,role)]=variant.id;session?.participants.add(t.id);
     ui.message=`Save Role Preset: ${category} / ${role} · ${weight} · ${colorToken}${existed?' (сочетание уже существовало)':''}.`;
   },{templateIds:[t.id],persistTemplates:!session});
 }
 function gapPair(){
   const refs=selectedBlocks();if(refs.length!==2)return null;
   if(refs[0].t.id!==refs[1].t.id)return {error:'Выберите два текстовых блока одного шаблона.'};
   const sorted=[...refs].sort((a,b)=>(Number(a.b.y)||0)-(Number(b.b.y)||0)||(Number(a.b.x)||0)-(Number(b.b.x)||0));
   return {t:sorted[0].t,upper:sorted[0].b,lower:sorted[1].b};
 }
 function copyGap(){
   const pair=gapPair();if(!pair){ui.message='Copy Gap требует ровно два выбранных текстовых блока.';render();return;}
   if(pair.error){ui.message=pair.error;render();return;}
   lastCopiedGap=(Number(pair.lower.y)||0)-((Number(pair.upper.y)||0)+(Number(pair.upper.h)||0));
   try{localStorage.setItem(GAP_KEY,String(lastCopiedGap));}catch(_){}
   ui.message=`Gap скопирован: ${lastCopiedGap} px.`;render();
 }
 function applyGap(){
   const pair=gapPair();if(!pair){ui.message='Apply Gap требует ровно два выбранных текстовых блока.';render();return;}
   if(pair.error){ui.message=pair.error;render();return;}
   if(!Number.isFinite(lastCopiedGap)){ui.message='Gap ещё не сохранён. Сначала нажмите Copy Gap.';render();return;}
   const {t,upper,lower}=pair,oldLowerY=Number(lower.y)||0,oldLowerBottom=oldLowerY+(Number(lower.h)||0);
   const newLowerY=(Number(upper.y)||0)+(Number(upper.h)||0)+lastCopiedGap,delta=newLowerY-oldLowerY;
   if(!delta){ui.message=`Gap уже равен ${lastCopiedGap} px.`;render();return;}
   const overlapX=(a,b)=>Math.min((Number(a.x)||0)+(Number(a.w)||0),(Number(b.x)||0)+(Number(b.w)||0))-Math.max(Number(a.x)||0,Number(b.x)||0)>0;
   const followers=(t.blocks||[]).filter(b=>b!==upper&&b!==lower&&(Number(b.y)||0)>=oldLowerBottom-0.5&&overlapX(lower,b));
   step(()=>{lower.y=newLowerY;for(const b of followers)b.y=(Number(b.y)||0)+delta;session?.participants.add(t.id);
     ui.message=`Apply Gap: ${lastCopiedGap} px · сдвинуто нижних слоёв ${followers.length}.`;
   },{templateIds:[t.id],persistTemplates:!session});
 }

 function applyAuto(mode){
   if(ui.draft)dropDraft(); // Auto and Variants remain available even with an unfinished live preset.
   const list=selectedTemplates();if(!list.length){ui.message='Нет шаблонов в выделении или фильтре.';render();return;}
   const style=getStyle(),id=ui.styleId,grouped={changed:0,ambiguous:0,unknown:0,manual:0};
   step(()=>{for(const t of list){const result=E.auto(t,id,style,mode);for(const k of Object.keys(grouped))grouped[k]+=result[k];session?.participants.add(t.id);}
     ui.message=`${mode==='auto'?'Авто':'Варианты'}: ${list.length} шаблонов · изменено ${grouped.changed} · неоднозначно ${grouped.ambiguous} · нет пресета ${grouped.unknown} · ручных привязок сохранено ${grouped.manual}.`;
   },{templateIds:list.map(t=>t.id)});
 }
 function switchVariant(role,id,category){
   const list=E.variants(model(),category,role),variant=list.find(x=>x.id===id);if(!variant)return;
   if(ui.draft&&(ui.draft.category!==category||ui.draft.role!==role)){ui.message='Сохраните или сбросьте черновик другой роли.';render();return;}
   const selected=selectedBlocks(),refs=selectionBindings(role,category),draftRefsBefore=draftRefs(ui.draft),targets=selected.length?selected:refs;
   ui.expandedRole=key(category,role);
   if(!targets.length&&!draftRefsBefore.length){ui.choice[key(category,role)]=id;ui.message='Номер выбран в панели. Выделите один или несколько текстовых блоков, чтобы назначить пресет.';render();return;}
   step(()=>{if(ui.draft)restoreDraftPaint(ui.draft);let n=0;
     for(const {t,b,link} of targets){
       const ok=link&&link.roleId===role&&link.categoryId===category?E.paint(b,model(),role,variant):E.bind(t,b,ui.styleId,getStyle(),category,role,id);
       if(ok){if(link&&link.roleId===role&&link.categoryId===category){link.variantId=id;link.manual=true;}n++;}
     }
     ui.choice[key(category,role)]=id;ui.draft=null;
     ui.message=`${category} / ${role} · №${list.indexOf(variant)+1}: назначено ${n} выделенным текстам.`;
   },{templateIds:idsOf([...targets,...draftRefsBefore]),persistTemplates:!session});
 }
 function assign(role,category){
   if(!session){ui.message='Нажмите «Начать» для ручной привязки.';render();return;}
   const chosen=current(role,category),targets=selectedBlocks();ui.expandedRole=key(category,role);
   if(!targets.length){ui.message='Выберите текст в «Один» либо Alt+клик по тексту в «Карте».';render();return;}
   if(!chosen){ui.message='У этой роли нет варианта. Создайте через +.';render();return;}
   step(()=>{let n=0;for(const {t,b} of targets){session.participants.add(t.id);if(E.bind(t,b,ui.styleId,getStyle(),category,role,chosen.id))n++;}
     ui.message=`Привязано ${n} текстов к ${category} / ${role}. Программный стиль и исходные роли сохранены.`;
   },{templateIds:targets.map(({t})=>t.id)});
 }
 function startDraft(role,category){if(!model().categories[category]){ui.message='У этого стиля нет такой категории.';render();return;}
   if(ui.draft&&(ui.draft.category!==category||ui.draft.role!==role)){ui.message='Сначала сохраните или сбросьте текущий черновик.';render();return;}
   const source=current(role,category),allowed=model().typography[role]?.allowedColors||[],refs=selectionBindings(role,category);
   ui.expandedRole=key(category,role);
   ui.draft={category,role,baseId:source?.id||null,colorToken:source?.colorToken||allowed[0]||Object.keys(model().palette)[0]||'White',weight:source?.weight||model().typography[role]?.weights[0]||400,targets:refs.map(targetKey)};
   ui.message=`${category} / ${role}: черновик + на ${refs.length} выбранных текстах. Выберите цвет и вес, затем сохраните кнопкой ✓.`;render();
 }
 function updateDraft(role,property,value,category){
   if(ui.draft&&(ui.draft.role!==role||ui.draft.category!==category)){ui.message='Завершите другой черновик перед редактированием.';render();return;}
   const implicitDraft=!ui.draft?uiState():null;if(!ui.draft)startDraft(role,category);if(!ui.draft)return;
   if(property==='colorToken'&&!model().typography[role]?.allowedColors.includes(value)){ui.message='Сначала включите цвет в глобальном списке этой роли.';render();return;}
   const proposal={...ui.draft,[property]:property==='weight'?Number(value):value};
   const existing=E.variants(model(),category,role).find(x=>x.weight===proposal.weight&&x.colorToken===proposal.colorToken);
   if(existing){switchVariant(role,existing.id,category);return;}
   const refs=draftRefs(proposal);
   step(()=>{ui.draft=proposal;for(const {b} of refs)E.paint(b,model(),role,proposal);
     ui.message=`${role}: черновик + показан на ${refs.length} выбранных текстах. Сохраните кнопкой ✓.`;
   },{templateIds:idsOf(refs)});
   if(implicitDraft&&uiUndo.length)uiUndo[uiUndo.length-1]=implicitDraft;
 }
 function saveDraft(){if(!ui.draft)return;const draft={...ui.draft},category=draft.category,role=draft.role;
   if(E.variants(model(),category,role).some(v=>v.weight===draft.weight&&v.colorToken===draft.colorToken)){
     ui.message='Это сочетание уже существует: выберите его номер либо измените цвет или вес.';render();return;
   }
   const refs=draftRefs(draft);
   step(()=>{const cat=model().categories[category],list=cat.roles[role]||(cat.roles[role]=[]);
     const variant={id:E.uid('v'),colorToken:draft.colorToken,weight:draft.weight};list.push(variant);
     for(const {t,b,link} of refs)if(E.paint(b,model(),role,variant)){link.variantId=variant.id;link.manual=true;session?.participants.add(t.id);}
     ui.choice[key(category,role)]=variant.id;ui.draft=null;ui.message=`Создан вариант ${list.length} для ${category} / ${role}; изменено только ${refs.length} выбранных текстов.`;
   },{templateIds:idsOf(refs)});
 }
 function dropDraft(){if(!ui.draft)return;const refs=draftRefs(ui.draft);
   step(()=>{restoreDraftPaint(ui.draft);ui.draft=null;ui.message='Черновик сброшен.';},{templateIds:idsOf(refs)});
 }
 function deleteVariant(role,id,category){
   const list=E.variants(model(),category,role),target=list.find(x=>x.id===id);if(!target)return;
   const refs=Object.values(LIB).flatMap(t=>(t.blocks||[]).filter(b=>E.getBinding(t,b,ui.styleId)?.variantId===id).map(b=>({t,b})));
   if(!confirm(`Убрать вариант ${list.indexOf(target)+1} из ${category} / ${role}? Связанных текстов: ${refs.length}. ${list.length>1?'Они перейдут на другой вариант этой роли.':'Если других вариантов нет, привязки снимутся.'}`))return;
   step(()=>{const outcome=E.removeVariant(getStyle(),ui.styleId,LIB,category,role,id);
     ui.choice[key(category,role)]=E.variants(model(),category,role)[0]?.id||'';
     if(ui.draft?.baseId===id)ui.draft=null;
     ui.message=`Пресет удалён из стиля: переназначено ${outcome.linked}, снято привязок ${outcome.unlinked}.`;
   },{templateIds:refs.map(({t})=>t.id),persistTemplates:true});
 }
 function mutateFont(role,kind,value){
   const font=model().typography[role];if(!font)return;
   if(kind==='family'){
     if(!E.fontRegistry(LIB).includes(value)){ui.message='Выберите шрифт из списка шаблонов.';render();return;}
     step(()=>{font.family=value;repaintParticipants(x=>x.roleId===role);},{templateIds:participants().map(t=>t.id)});
   }else if(kind==='opacity'){
     const owners=session?participants():Object.values(LIB),refs=owners.flatMap(t=>(t.blocks||[]).filter(b=>b.kind==='text'&&E.getBinding(t,b,ui.styleId)?.roleId===role).map(b=>({t,b})));
     step(()=>{font.opacity=Math.max(0,Math.min(100,Math.round(Number(value)/10)*10));font.opacityConfigured=true;for(const {t,b} of refs){b.style ||= {};b.style.opacity=font.opacity;}},{templateIds:idsOf(refs),persistTemplates:!session});
   }else{
     const w=Number(value.weight),enabled=value.enabled,ws=new Set(font.weights||[]);
     if(enabled)ws.add(w);else{
       const used=Object.values(model().categories).some(c=>(c.roles?.[role]||[]).some(v=>Number(v.weight)===w));
       if(used){ui.message=`Вес ${w} уже используется пресетом роли ${role}; сначала выберите для варианта другой вес.`;render();return;}
       if(ws.size<2){ui.message='Нужен хотя бы один доступный вес.';render();return;}
       ws.delete(w);
     }
     step(()=>{font.weights=[...ws].sort((a,b)=>a-b);});
   }
 }
 function mutateRoleColor(role,token,enabled){
   const v=model(),spec=v.typography[role];if(!spec||!v.palette[token])return;
   const allowed=new Set(spec.allowedColors||[]);
   if(enabled){allowed.add(token);step(()=>{spec.allowedColors=[...allowed];ui.message=`${role}: цвет ${token} разрешён.`;});return;}
   const options=[...allowed].filter(x=>x!==token&&v.palette[x]);
   if(!options.length){ui.message='У роли должен оставаться хотя бы один разрешённый цвет.';render();return;}
   const affected=Object.values(v.categories).flatMap(c=>c.roles?.[role]||[]).filter(x=>x.colorToken===token).length;
   if(!affected){step(()=>{spec.allowedColors=options;ui.message=`${role}: ${token} отключён.`;});return;}
   // Explicit choice avoids silently guessing which palette color should replace the disabled one.
   const modal=document.createElement('div');modal.className='v5-ai v6-remap';
   modal.style.cssText='position:fixed;inset:0;z-index:220;background:#000b;display:flex;align-items:center;justify-content:center;padding:14px';
   modal.innerHTML=`<div style="background:#1b222b;border:1px solid #455166;border-radius:10px;padding:18px;width:min(420px,100%);color:#eee;font:12px/1.5 Inter,system-ui"><b>${h(role)} · отключить ${h(token)}</b><p>${affected} вариантов в категориях используют этот цвет. Выберите разрешённый цвет-замену. Одинаковые варианты (вес + цвет) объединятся; привязки будут сохранены.</p><select data-replacement style="width:100%;padding:8px;background:#10141a;color:white;border:1px solid #455166">${options.map(x=>`<option value="${h(x)}">${h(x)} · ${h(v.palette[x])}</option>`).join('')}</select><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button data-dismiss>Отмена</button><button data-commit>Переназначить</button></div></div>`;
   document.body.append(modal);
   modal.addEventListener('click',e=>{
     if(e.target===modal||e.target.closest('[data-dismiss]')){modal.remove();render();return;}
     if(!e.target.closest('[data-commit]'))return;
     const replacement=modal.querySelector('[data-replacement]').value;
     step(()=>{const outcome=E.remapRoleColor(getStyle(),ui.styleId,LIB,role,token,replacement);
       if(ui.draft?.role===role&&ui.draft.colorToken===token)ui.draft.colorToken=replacement;
       ui.message=`${role}: ${token} → ${replacement}. Вариантов изменено ${outcome.variantsChanged}, объединено ${outcome.merged}, текстов обновлено ${outcome.painted}.`;
     },{templateIds:Object.values(LIB).filter(t=>t.v5Bindings?.[ui.styleId]&&t.blocks.some(b=>E.getBinding(t,b,ui.styleId)?.roleId===role)).map(t=>t.id),persistTemplates:true});
     modal.remove();
   });
 }
 function repaintParticipants(predicate){
   if(!session)return;
   for(const t of participants())for(const b of t.blocks||[]){const x=E.getBinding(t,b,ui.styleId);if(!x||predicate&&!predicate(x))continue;
     const variant=ui.draft?.category===x.categoryId&&ui.draft?.role===x.roleId&&ui.draft.targets?.includes(t.id+'\u0000'+b.id)?ui.draft:E.variants(getStyle().v4,x.categoryId,x.roleId).find(v=>v.id===x.variantId);if(variant)E.paint(b,getStyle().v4,x.roleId,variant);
   }
 }
 function createStyle(duplicate){
   if(duplicate&&!getStyle()){ui.message='Сначала создайте редакторский стиль.';render();return;}
   if(ui.draft){ui.message='Завершите черновик перед сменой стиля.';render();return;}
   const name=prompt(duplicate?'Название копии':'Название нового стиля',duplicate?(getStyle().name||'Style')+' Copy':'');if(!name?.trim())return;
   step(()=>{const id=E.uid('style'),source=getStyle();EDITOR_STYLES[id]=duplicate&&source?JSON.parse(JSON.stringify(source)):{name:name.trim(),color:'#5b8cff',accent:'#5b8cff',canvasBg:'#ffffff',imageRadius:8};
     EDITOR_STYLES[id].name=name.trim();EDITOR_STYLES[id].builtin=false;
     if(!duplicate)E.ensure(EDITOR_STYLES[id],GROUP_ORDER,Object.fromEntries(selectedTemplates().map(t=>[t.id,t])),'manual-new');
     ui.styleId=id;ui.choice={};ui.message=duplicate?'Копия стиля создана.':'Новый стиль создан из категорий текущего набора.';
   },{catalog:true});
 }
 function mergedFor(v,role){
   const unique=new Map(),order=new Map((GROUP_ORDER||[]).map((g,i)=>[g,i]));
   const categories=Object.keys(v.categories).sort((a,b)=>(order.get(a)??999)-(order.get(b)??999)||a.localeCompare(b,'ru'));
   for(const category of categories)for(const variant of E.variants(v,category,role)){
     const color=E.normalizeColor(v.palette[variant.colorToken])||v.palette[variant.colorToken]||'';
     const appearance=Number(variant.weight)+'|'+String(color).toLowerCase();
     if(!unique.has(appearance))unique.set(appearance,{appearance,weight:Number(variant.weight),colorToken:variant.colorToken,refs:[],color});
     unique.get(appearance).refs.push({category,variant});
   }
   return [...unique.values()];
 }
 function mergedChoice(role){const list=mergedFor(model(),role),k=key('__all',role),links=selectionBindings(role),appearances=[...new Set(links.map(({link})=>list.find(g=>g.refs.some(r=>r.category===link.categoryId&&r.variant.id===link.variantId))?.appearance).filter(Boolean))];
   return list.find(x=>x.appearance===(appearances.length===1?appearances[0]:ui.choice[k]))||list[0]||null;}
 function mergedRow(role,v,context){
   const list=mergedFor(v,role);if(!list.length)return '';
   const k=key('__all',role),active=mergedChoice(role);
   const selectedLinks=selectionBindings(role).map(x=>x.link),allLinks=context.template?.editorStyleId===ui.styleId?Object.values(context.template.v5Bindings?.[ui.styleId]||{}):[];
   const isRef=(g,x)=>g.refs.some(({category,variant})=>x?.categoryId===category&&x?.roleId===role&&x?.variantId===variant.id);
   const used=list.some(g=>allLinks.some(x=>isRef(g,x))),chosen=!!selectedLinks.length;
   const chips=list.map((g,i)=>`<button type="button" data-pick-merged="${h(role)}" data-appearance="${h(g.appearance)}" title="Вес ${h(g.weight)} · цвет ${h(g.color)}" class="${active===g?'on':''} ${allLinks.some(x=>isRef(g,x))?'v6-used':''} ${selectedLinks.some(x=>isRef(g,x))?'v6-selected':''}">${i+1}<span class="v6-swatch" style="background:${h(g.color)}"></span></button>`).join('');
   const spec=v.typography[role]||{},weights=[...new Set([...(spec.weights||[]),active?.weight||400])].sort((a,b)=>a-b),tokens=[...new Set([...(spec.allowedColors||Object.keys(v.palette)),active?.colorToken].filter(x=>x&&v.palette[x]))];
   const details=active?`<div class="preset-info"><div class="row"><label>Вес</label><select data-merged-weight="${h(role)}" data-appearance="${h(active.appearance)}">${opts(weights.map(x=>[x,x]),active.weight)}</select></div><div class="row"><label>Цвет</label><select data-merged-color="${h(role)}" data-appearance="${h(active.appearance)}">${opts(tokens.map(x=>[x,`${x} · ${v.palette[x]}`]),active.colorToken)}</select></div></div>`:'';
   return `<div class="role v7-merged ${used?'v6-role-used':''} ${chosen?'v6-role-selected':''}"><div class="role-head"><span class="role-label">${h(role)}</span><span class="chips">${chips}</span></div>${details}</div>`;
 }
 function editMerged(role,appearance,field,value){
   const v=model(),group=mergedFor(v,role).find(x=>x.appearance===appearance);if(!group)return;
   const weight=field==='weight'?Number(value):Number(group.weight),token=field==='color'?value:group.colorToken;
   if(!Number.isFinite(weight)||!v.palette[token])return;
   const categories=[...new Set(group.refs.map(r=>r.category))],ids=new Set();
   for(const t of Object.values(LIB))for(const b of t.blocks||[]){const x=E.getBinding(t,b,ui.styleId);if(x&&x.roleId===role&&categories.includes(x.categoryId)&&group.refs.some(r=>r.category===x.categoryId&&r.variant.id===x.variantId))ids.add(t.id);}
   step(()=>{
     for(const {category,variant} of group.refs){variant.weight=weight;variant.colorToken=token;}
     for(const t of Object.values(LIB))for(const b of t.blocks||[]){const x=E.getBinding(t,b,ui.styleId);if(!x||x.roleId!==role||!group.refs.some(r=>r.category===x.categoryId&&r.variant.id===x.variantId))continue;const variant=E.variants(v,x.categoryId,role).find(q=>q.id===x.variantId);if(variant)E.paint(b,v,role,variant);}
     for(const category of categories){const list=E.variants(v,category,role),profiles=v.sourceProfiles?.[category]?.[role]||{};for(const item of [...list]){const dup=list.find(other=>other!==item&&Number(other.weight)===Number(item.weight)&&String(E.normalizeColor(v.palette[other.colorToken])||v.palette[other.colorToken]).toLowerCase()===String(E.normalizeColor(v.palette[item.colorToken])||v.palette[item.colorToken]).toLowerCase());if(!dup)continue;
       if(profiles[item.id]){if(profiles[dup.id])profiles[dup.id].count=(profiles[dup.id].count||0)+(profiles[item.id].count||0);else profiles[dup.id]=profiles[item.id];delete profiles[item.id];}
       v.variantRedirects||={};v.variantRedirects[item.id]=dup.id;
       for(const t of Object.values(LIB))for(const x of Object.values(t.v5Bindings?.[ui.styleId]||{}))if(x.categoryId===category&&x.roleId===role&&x.variantId===item.id)x.variantId=dup.id;
       list.splice(list.indexOf(item),1);
     }}
     ui.choice[key('__all',role)]=Number(weight)+'|'+String(E.normalizeColor(v.palette[token])||v.palette[token]).toLowerCase();
     ui.message=`${role}: пресет обновлён (${weight} · ${token}). Совпадающие варианты объединены.`;
   },{templateIds:[...ids],persistTemplates:true});
 }
 function switchMerged(role,appearance){
   const group=mergedFor(model(),role).find(x=>x.appearance===appearance);if(!group)return;
   if(ui.draft){ui.message='Сначала сохраните либо сбросьте черновик.';render();return;}
   const selected=selectedBlocks(),refs=selectionBindings(role),targets=selected.length?selected:refs;
   ui.expandedRole=key('__all',role);
   if(!targets.length){ui.choice[key('__all',role)]=appearance;ui.message='Номер выбран в панели. Выделите один или несколько текстовых блоков, чтобы назначить пресет.';render();return;}
   step(()=>{let n=0;for(const {t,b,link} of targets){
       const preferred=link&&link.roleId===role?group.refs.find(r=>r.category===link.categoryId):null;
       const match=preferred||group.refs.find(r=>r.category===t.templateGroup)||group.refs[0];
       const ok=link&&link.roleId===role?E.paint(b,model(),role,match.variant):E.bind(t,b,ui.styleId,getStyle(),match.category,role,match.variant.id);
       if(ok){if(link&&link.roleId===role){link.categoryId=match.category;link.variantId=match.variant.id;link.manual=true;}n++;}
     }
     ui.choice[key('__all',role)]=appearance;
     ui.message=`${role} · №${mergedFor(model(),role).indexOf(group)+1}: назначено ${n} выделенным текстам.`;
   },{templateIds:idsOf(targets),persistTemplates:!session});
 }
 function assignMerged(role){
   const group=mergedChoice(role),targets=selectedBlocks();if(!session){ui.message='Нажмите «Начать» для ручной привязки.';render();return;}
   if(!group||!targets.length){ui.message='Выберите номер и целевые тексты.';render();return;}
   step(()=>{let n=0;for(const {t,b} of targets){const match=group.refs.find(r=>r.category===t.templateGroup)||group.refs[0];
     session.participants.add(t.id);if(E.bind(t,b,ui.styleId,getStyle(),match.category,role,match.variant.id))n++;
   }ui.message=`Привязано ${n} текстов к ${role} · №${mergedFor(model(),role).indexOf(group)+1}; категории-источники сохранены.`;
   },{templateIds:[...new Set(targets.map(({t})=>t.id))]});
 }
 function removeMerged(role,appearance){const group=mergedFor(model(),role).find(x=>x.appearance===appearance);if(!group)return;
   const ids=Object.values(LIB).filter(t=>(t.blocks||[]).some(b=>group.refs.some(r=>E.getBinding(t,b,ui.styleId)?.variantId===r.variant.id))).map(t=>t.id);
   if(!confirm(`Удалить №${mergedFor(model(),role).indexOf(group)+1} для ${role} из ${group.refs.length} исходных категорий? Связанные тексты будут переназначены либо отвязаны.`))return;
   step(()=>{let linked=0,unlinked=0;for(const {category,variant} of group.refs){const result=E.removeVariant(getStyle(),ui.styleId,LIB,category,role,variant.id);linked+=result.linked;unlinked+=result.unlinked;}
     ui.choice[key('__all',role)]='';ui.message=`Вариант удалён: переназначено ${linked}, отвязано ${unlinked}.`;
   },{templateIds:ids,persistTemplates:true});
 }
 function roleRow(role,v,category,context){
   const list=E.variants(v,category,role),k=key(category,role),isDraft=ui.draft?.category===category&&ui.draft?.role===role;
   const selectedLinks=selectionBindings(role,category).map(x=>x.link),selectedIds=[...new Set(selectedLinks.map(x=>x.variantId))],id=selectedIds.length===1?selectedIds[0]:ui.choice[k]||list[0]?.id||'',selected=list.find(x=>x.id===id)||list[0];
   const draft=isDraft?ui.draft:null,currentData=draft||selected,expanded=true;
   const activeBinding=context?.selectedBinding,links=context?.template?.editorStyleId===ui.styleId?context.template.v5Bindings?.[ui.styleId]||{}:{};
   const used=new Set(Object.values(links).filter(x=>x.categoryId===category&&x.roleId===role).map(x=>x.variantId));
   const chips=list.map((x,i)=>`<button type="button" data-pick="${h(role)}" data-category="${h(category)}" data-id="${h(x.id)}" title="${h(x.colorToken)} ${h(v.palette[x.colorToken])} · ${h(x.weight)} · ${v.sourceProfiles?.[category]?.[role]?.[x.id]?.count||'—'}× · ${v.sourceProfiles?.[category]?.[role]?.[x.id]?.medianSize||'—'}px" class="${!draft&&x.id===id?'on':''} ${used.has(x.id)?'v6-used':''} ${selectedIds.includes(x.id)?'v6-selected':''}">${i+1}${swatch(v,x.colorToken)}</button>`).join('');
   const choices=(v.typography[role]?.allowedColors||Object.keys(v.palette)).filter(token=>v.palette[token]);
   const options=choices.map(c=>`<button type="button" data-choose-color="${h(c)}" data-role="${h(role)}" data-category="${h(category)}" title="${h(c)} ${h(v.palette[c])}">${swatch(v,c)} <span>${h(c)} <small>${h(v.palette[c])}</small></span></button>`).join('');
   const colorPicker=currentData?`<div class="v6-color-choice"><button type="button" data-color-open="${h(role)}" data-category="${h(category)}" aria-expanded="false">${swatch(v,currentData.colorToken)} ${h(currentData.colorToken)} · ${h(v.palette[currentData.colorToken])} ▾</button><div class="v6-color-menu" hidden>${options}</div></div>`:'';
   const details=currentData?`<div class="preset-info">${draft?'<div class="row"><small class="meta">Черновик</small><button data-discard-draft>Сбросить</button></div>':''}
     <div class="row"><label>Вес</label><select data-v-weight="${h(role)}" data-category="${h(category)}">${opts((v.typography[role]?.weights||[]).map(w=>[w,w]),currentData.weight)}</select></div><div class="row"><label>Цвет</label>${colorPicker}</div></div>`:'<div class="meta" style="padding-top:5px">Нет вариантов · добавить +</div>';
   const roleUsed=used.size>0,roleSelected=selectedLinks.length>0;
   return `<div class="role ${roleUsed?'v6-role-used':''} ${roleSelected?'v6-role-selected':''}" data-role-row="${h(role)}" data-category="${h(category)}"><div class="role-head"><button class="role-label" data-open-role="${h(role)}" data-category="${h(category)}" type="button" style="border:0;background:transparent;text-align:left;padding:2px">${ui.category==='__all'?`<span class="v6-cat-tag">${h(category)}</span> `:''}${h(role)}</button><span class="chips">${chips}<button data-plus="${h(role)}" data-category="${h(category)}" class="${draft?'on':''}" title="${draft?'Сохранить вариант':'Создать вариант'}">${draft?'✓':'＋'}</button></span></div>${expanded?details:''}</div>`;
 }
 function bindingInspector(v,selected,context){
   const t=selected?.t||context?.template;if(!t)return '<div class="meta">Выберите шаблон.</div>';
   const selection=selectedBlocks(),multi=selection.length>1;
   const editor=EDITOR_STYLES[t.editorStyleId]?.name||'не назначен',program=STYLES[t.visualStyle]?.name||t.visualStyle||'—';
   const lines=selection.length?selection:(t.blocks||[]).filter(b=>b.kind==='text').map(b=>({t,b}));
   const numbers=[...new Set(selection.flatMap(({t,b})=>{const x=t.editorStyleId===ui.styleId?E.getBinding(t,b,ui.styleId):null;
     if(!x)return [];const variant=E.variants(v,x.categoryId,x.roleId).find(y=>y.id===x.variantId);if(!variant)return [];
     return [ui.category==='__all'?mergedFor(v,x.roleId).findIndex(g=>g.refs.some(r=>r.category===x.categoryId&&r.variant.id===x.variantId))+1:E.variants(v,x.categoryId,x.roleId).indexOf(variant)+1];
   }))];
   return `<div class="v6-binding-head"><b>${multi?`Выбрано текстов: ${selection.length}`:selected?'Выбранный текст':'Текущий шаблон'}</b><small>${multi?'Из '+new Set(selection.map(x=>x.t.id)).size+' шаблонов':h(t.label||t.id)}</small></div><div class="meta">Программный стиль: <b>${h(program)}</b><br>Набор редактора: <b>${h(editor)}</b> ${t.editorStyleId&&t.editorStyleId!==ui.styleId?`<button data-jump-style="${h(t.editorStyleId)}">Открыть набор ↗</button>`:''}${numbers.length>1?`<br>У выделенных текстов разные номера: ${numbers.map(x=>'№'+h(x)).join(', ')}`:''}</div>
   ${!lines.length?'<div class="meta">В шаблоне нет текстов.</div>':lines.map(({t:owner,b})=>{
     const binding=owner.editorStyleId===ui.styleId?E.getBinding(owner,b,ui.styleId):null,item=binding&&E.variants(v,binding.categoryId,binding.roleId).find(x=>x.id===binding.variantId);
     const index=item?(ui.category==='__all'?mergedFor(v,binding.roleId).findIndex(g=>g.refs.some(r=>r.category===binding.categoryId&&r.variant.id===item.id))+1:E.variants(v,binding.categoryId,binding.roleId).indexOf(item)+1):null;
     const color=item?v.palette[item.colorToken]:b.style?.color,display=b.content?.replace(/<[^>]*>/g,'').slice(0,45)||b.id;
     return `<button type="button" class="v6-binding-row ${selection.some(x=>x.t.id===owner.id&&x.b.id===b.id)?'v6-binding-selected':''}" data-focus-block="${h(b.id)}" data-focus-template="${h(owner.id)}" title="Показать этот текст"><div class="v6-binding-title"><b>${h(b.role||'text')}</b><span>${h(display)}${multi?' · '+h(owner.label||owner.id):''}</span></div>
       <div class="v6-binding-detail">${binding&&item?`<strong>${h(binding.categoryId)} / ${h(binding.roleId)} · №${index}</strong>`:'<strong>Не привязан к этому набору</strong>'}</div>
       <div class="v6-binding-detail">${swatch(v,item?.colorToken||color)} ${h(item?.colorToken||'исходный')} ${h(color||'—')} · вес <b>${h(b.style?.fontWeight||'—')}</b></div>
       <div class="v6-binding-detail">Шрифт ${h(b.style?.fontFamily||'—')} · ${h(b.style?.fontSize||'—')}px · ${binding?.manual?'вручную':binding?'авто':'исходная роль'}</div></button>`;
   }).join('')}`;
 }
 function swatch(v,token){const color=v.palette[token]||E.normalizeColor(token)||'#ffffff';return `<span class="v6-swatch" style="background:${h(color)}" title="${h(color)}"></span>`;}
 function fontRows(v,roles){const fonts=E.fontRegistry(LIB);return roles.map(r=>{const spec=v.typography[r];
   const families=fonts.includes(spec.family)?fonts:[...fonts,spec.family];
   const weights=[...new Set([100,200,300,400,500,600,700,800,900,...spec.weights])].sort((a,b)=>a-b);
   const colorNames=Object.keys(v.palette),allowed=spec.allowedColors||colorNames;
   const preview=allowed.slice(0,3).map(x=>swatch(v,x)).join('');
   return `<div class="font-row"><span title="${h(r)}">${h(r)}</span><select data-family="${h(r)}">${opts(families.map(f=>[f,f]),spec.family)}</select>
     <details class="weights"><summary>${h((spec.weights||[]).join(' · ')||'Выберите')} ▾</summary><div class="weight-list">${weights.map(w=>`<label><input type="checkbox" data-weight-role="${h(r)}" data-weight="${w}" ${spec.weights.includes(w)?'checked':''}> ${w}</label>`).join('')}</div></details>
     <details class="weights"><summary class="v6-color-summary">${preview||'—'} <small>${allowed.length}</small> ▾</summary><div class="weight-list color-list">${colorNames.map(c=>`<label title="${h(c)} · ${h(v.palette[c])}"><input type="checkbox" data-role-color="${h(r)}" data-token="${h(c)}" ${allowed.includes(c)?'checked':''}> ${swatch(v,c)} ${h(c)} <small>${h(v.palette[c])}</small></label>`).join('')}</div></details>
     <label class="font-opacity" title="Прозрачность шрифта для роли"><input type="range" min="0" max="100" step="10" value="${spec.opacity??100}" data-role-opacity="${h(r)}"><output>${spec.opacity??100}%</output></label>
   </div>`;
 }).join('');}
 function render(){if(!ui.active)return;if(!selectedId&&Object.keys(LIB).length){selectTpl(Object.keys(LIB)[0],true);return;}const box=document.getElementById('inspBody');if(!box)return;const oldScroll=box.scrollTop,v=model();if(!v){box.innerHTML=`<div class="v5-editor">${measurementControls()}<section><h3>Стили</h3><div class="message">Редакторских стилей пока нет. Создайте новый стиль или импортируйте/соберите его из шаблонов.</div><button data-create class="primary" style="width:100%;margin-top:8px">＋ Создать первый стиль</button></section></div>`;box.scrollTop=oldScroll;wire(box);renderMeasurementPage(document.getElementById('cvCanvas'),getActiveTpl());return;}
   const core=E.coreRoles,others=Object.keys(v.typography).filter(r=>!core.includes(r));
   const allRoles=[...new Set([...core,...others,...Object.values(v.categories).flatMap(c=>Object.keys(c.roles||{}))])];
   const shown=[...new Set([...core,...Object.keys(v.categories[ui.category]?.roles||{}).filter(r=>!core.includes(r))])];
   const extra=others.filter(r=>!shown.includes(r));
   const colors=Object.entries(v.palette),selected=selectedBlocks()[0],selectedCount=selectedBlocks().length,context={template:selected?.t||getActiveTpl()},pair=gapPair(),gapAvailable=!!pair&&!pair.error,gapLabel=Number.isFinite(lastCopiedGap)?`Gap: ${lastCopiedGap} px`:'Gap: —';
   context.selectedBinding=selected&&selected.t.editorStyleId===ui.styleId?E.getBinding(selected.t,selected.b,ui.styleId):null;
   const targets=selectedTemplates(),cnt=targets.reduce((n,t)=>n+t.blocks.filter(b=>b.kind==='text').length,0);
   const groups=ui.category==='__all'?allRoles.map(r=>mergedRow(r,v,context)).join(''):shown.map(r=>roleRow(r,v,ui.category,context)).join('')+(extra.length?`<div class="row"><select data-extra-role><option value="">Другие роли…</option>${opts(extra.map(r=>[r,r]),'')}</select><button data-add-role>＋</button></div>`:'');
   box.innerHTML=`<div class="v5-editor">
    ${measurementControls()}
    <section><h3>Стили</h3><div class="row"><select data-style>${opts(Object.entries(EDITOR_STYLES).map(([id,s])=>[id,s.name||id]),ui.styleId)}</select><button data-create title="Новый стиль">＋</button><button data-duplicate title="Копия">⧉</button><button data-delete-style title="Удалить стиль" ${getStyle()?.builtin?'disabled':''}>✕</button></div><div class="row"><select data-category-filter><option value="__all" ${ui.category==='__all'?'selected':''}>Все категории</option>${opts(Object.keys(v.categories).map(g=>[g,g]),ui.category)}</select></div><button data-collect class="primary" style="width:100%;padding:9px">Собрать из выбранных шаблонов</button><div class="meta">${checked.size?'Из отмеченных карточек':'Из видимых по фильтрам'} · исходные тексты не меняются</div>${v.collectionStats?`<div class="meta">Сборка: ${v.collectionStats.templates} шаблонов · ${v.collectionStats.accepted} текстов · ${v.collectionStats.skipped} пропущено · ${v.collectionStats.combinations} вариантов</div>`:''}</section>
    <section><h3>Глобальные цвета</h3>${colors.slice(0,4).map(([n,c])=>`<div class="row"><label>${h(n)}</label><input type="color" data-palette="${h(n)}" value="${E.colorSwatch(c)}" ${n==='White'?'disabled':''}>${n==='White'?'':`<button data-rename-color="${h(n)}" title="Переименовать токен">✎</button>`}<input type="text" data-palette-text="${h(n)}" value="${h(c)}" title="Точный CSS цвет, включая прозрачность" ${n==='White'?'disabled':''} style="max-width:103px;font-size:10px"></div>`).join('')}${colors.length>4?`<details><summary>Дополнительные (${colors.length-4})</summary>${colors.slice(4).map(([n,c])=>`<div class="row"><label>${h(n)}</label><input type="color" data-palette="${h(n)}" value="${E.colorSwatch(c)}"><input type="text" data-palette-text="${h(n)}" value="${h(c)}" title="Точный CSS цвет, включая прозрачность" ${n==='White'?'disabled':''} style="max-width:103px;font-size:10px">${n==='White'?'':`<button data-rename-color="${h(n)}" title="Переименовать токен">✎</button><button data-remove-color="${h(n)}">✕</button>`}</div>`).join('')}</details>`:''}<button data-add-color>＋ Цвет</button></section>
    <section><h3>Глобальные шрифты, веса и цвета</h3><div class="font-row meta"><b>Роль</b><b>Шрифт</b><b>Веса</b><b>Цвета</b><b>Альфа</b></div>${fontRows(v,core)}${others.length?`<details><summary>Остальные роли (${others.length})</summary>${fontRows(v,others)}</details>`:''}<div class="meta">Автоназначение применяет выбранное семейство шрифта для каждой роли.</div></section>
    <section><h3>Привязки и текст</h3>${bindingInspector(v,selected,context)}<div class="actions"><button data-copy-all title="Copy all visual text styles and preset, if assigned" ${selectedCount!==1?'disabled':''}>Copy All</button><button data-copy-preset title="Copy only the assigned preset" ${selectedCount!==1?'disabled':''}>Copy Preset</button><button data-paste-text title="Apply the copied data to all selected text blocks" ${!ui.clipboard?'disabled':''}>Apply</button></div><div class="actions"><button data-save-role-preset title="Save the selected text's current weight and color as a role preset" ${selectedCount!==1?'disabled':''}>Save Role Preset</button></div>${ui.clipboard?`<div class="meta">Clipboard: ${h(ui.clipboard.mode||'preset')} · ${h(ui.clipboard.from)}${ui.clipboard.preset?` · ${h(ui.clipboard.preset.category)} / ${h(ui.clipboard.preset.role)}`:ui.clipboard.category?` · ${h(ui.clipboard.category)} / ${h(ui.clipboard.role)}`:''}</div>`:''}<div class="meta">Click selects text; Shift/Ctrl/Cmd adds or removes text blocks. Shift+Alt+click selects templates.</div></section>
    <section><h3>Пресеты · ${ui.category==='__all'?'Все категории':h(ui.category)}</h3><div class="v6-legend">Номера — уникальные сочетания веса и цвета; одинаковые значения объединены.</div>${groups||'<div class="meta">Нет вариантов. Выберите категорию или соберите стиль.</div>'}</section>
    <section><h3>Прозрачность выбранного текста</h3>${selectedBlocks().length?`<div class="row"><label>Opacity</label><input type="range" min="0" max="100" step="10" value="${Math.round(Number(selectedBlocks()[0].b.style?.opacity??100)/10)*10}" data-text-opacity style="accent-color:var(--ui-accent)"><output>${Math.round(Number(selectedBlocks()[0].b.style?.opacity??100)/10)*10}%</output></div><div class="meta">Применяется ко всем выбранным текстовым блокам.</div>`:'<div class="meta">Выделите текстовый блок в режиме «Одно» или в карте.</div>'}</section>
    <section><h3>ADAPTATION</h3>${window.CoversAdaptationV1?.renderControls?.()||''}<div class="v5-gap-toolbar"><button data-adapt-normalize title="Normalize selected text blocks" ${selectedCount?'':'disabled'}>Normalize</button><button data-gap-copy title="Copy the current vertical gap between exactly two selected text blocks" ${gapAvailable?'':'disabled'}>Copy Gap</button><button data-gap-apply title="Apply the saved gap to exactly two selected text blocks and shift the following composition" ${gapAvailable&&Number.isFinite(lastCopiedGap)?'':'disabled'}>Apply Gap</button><span class="v5-gap-value">${h(gapLabel)}</span></div></section>
    <section><h3>Применение</h3><div class="meta">${checked.size?'Выделено':'По фильтрам'}: ${targets.length} шаблонов / ${cnt} текстов · в сессии: ${participants().length} шаблонов<br>${session?'Alt+клик по тексту в «Карте» — выделить; Alt+Ctrl/Shift — добавить.':'Авто работает и без ручной сессии.'}</div><div class="actions"><button data-auto class="primary">Авто</button><button data-variants>Варианты</button></div><div class="actions"><button data-start ${session?'disabled':''}>Начать</button><button data-apply ${!session?'disabled':''}>Применить</button><button data-cancel ${!session?'disabled':''}>Отменить</button></div><div class="actions"><button data-ai-open>AI JSON · контракт</button></div></section>
    ${ui.message?`<div class="message">${h(ui.message)}</div>`:''}
   </div>`;
   box.scrollTop=oldScroll;wire(box);renderMeasurementPage(document.getElementById('cvCanvas'),getActiveTpl());
 }
 function measurementControls(){return `<section class="v5-measure-controls"><h3>Измерения</h3><div class="v5-measure-toggles"><label><input type="checkbox" data-measure-distance ${measure.distances?'checked':''}> Расстояния</label><label><input type="checkbox" data-measure-typography ${measure.typography?'checked':''}> Типографика</label></div><div class="meta">Визуальный слой редактора; не сохраняется в шаблоне и не экспортируется.</div></section>`;}
 function wire(box){if(box._v5Wired)return;box._v5Wired=true;
   box.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn||!box.contains(btn))return;
     if(btn.hasAttribute('data-copy-all'))copyAll();else if(btn.hasAttribute('data-copy-preset'))copyPreset();else if(btn.hasAttribute('data-paste-text'))pasteText();else if(btn.hasAttribute('data-save-role-preset'))saveRolePreset();else if(btn.hasAttribute('data-gap-copy'))copyGap();else if(btn.hasAttribute('data-gap-apply'))applyGap();else if(btn.hasAttribute('data-start'))begin();else if(btn.hasAttribute('data-cancel'))cancel();else if(btn.hasAttribute('data-apply'))apply();
     else if(btn.hasAttribute('data-auto'))applyAuto('auto');else if(btn.hasAttribute('data-variants'))applyAuto('variants');
     else if(btn.hasAttribute('data-ai-open'))openAI();else if(btn.hasAttribute('data-collect'))openCollect();else if(btn.hasAttribute('data-create'))createStyle(false);else if(btn.hasAttribute('data-duplicate'))createStyle(true);
     else if(btn.hasAttribute('data-delete-style')){if(ui.draft){ui.message='Сначала завершите черновик.';render();return;}const id=ui.styleId,style=getStyle();if(!style){ui.message='Нет стиля для удаления.';render();return;}
       const linked=Object.values(LIB).filter(t=>t.editorStyleId===id||Object.keys(t.v5Bindings?.[id]||{}).length),bindings=linked.reduce((n,t)=>n+Object.keys(t.v5Bindings?.[id]||{}).length,0);
       if(confirm(`Удалить редакторский стиль «${style?.name||id}» и его пресеты? Шаблоны (${linked.length}) останутся; ссылки будут сняты, исходное оформление связанных текстов восстановлено.`))step(()=>{for(const t of Object.values(LIB)){const map=t.v5Bindings?.[id]||{};for(const b of t.blocks||[]){const link=map[b.id];if(!link?.original)continue;b.style ||= {};for(const attr of ['color','fontWeight','fontFamily','opacity'])if(link.original[attr]!==undefined)b.style[attr]=link.original[attr];}if(t.v5Bindings)delete t.v5Bindings[id];if(t.editorStyleId===id){const replacement=Object.keys(t.v5Bindings||{}).find(other=>EDITOR_STYLES[other]&&Object.keys(t.v5Bindings[other]||{}).length);if(replacement)t.editorStyleId=replacement;else delete t.editorStyleId;}}delete EDITOR_STYLES[id];ui.styleId=Object.keys(EDITOR_STYLES)[0]||'';ui.choice={};ui.blockPicks.clear();},{templateIds:linked.map(t=>t.id),persistTemplates:true,catalog:true});
     }
     else if(btn.hasAttribute('data-add-color')){const name=prompt('Название дополнительного цвета');if(!name||!/^[-\wА-Яа-яЁё ]{1,32}$/.test(name)||['__proto__','constructor','prototype'].includes(name)||model().palette[name])return;
       step(()=>{model().palette[name]='#ffffff';});
     }
     else if(btn.hasAttribute('data-rename-color')){const name=btn.dataset.renameColor,newName=prompt('Новое имя токена '+name,name)?.trim();if(!newName||!/^[-\wА-Яа-яЁё ]{1,32}$/.test(newName)||['__proto__','constructor','prototype'].includes(newName)||model().palette[newName])return;step(()=>{model().palette[newName]=model().palette[name];delete model().palette[name];for(const cat of Object.values(model().categories))for(const item of Object.values(cat.roles||{}).flat())if(item.colorToken===name)item.colorToken=newName;if(ui.draft?.colorToken===name)ui.draft.colorToken=newName;for(const spec of Object.values(model().typography))spec.allowedColors=spec.allowedColors?.map(x=>x===name?newName:x);});}
     else if(btn.hasAttribute('data-remove-color')){const name=btn.dataset.removeColor;if(Object.values(model().categories).some(c=>Object.values(c.roles||{}).flat().some(x=>x.colorToken===name))){ui.message='Этот цвет используется вариантом.';render();return;}
       if(confirm(`Удалить цвет ${name}?`))step(()=>{delete model().palette[name];for(const spec of Object.values(model().typography))spec.allowedColors=spec.allowedColors?.filter(x=>x!==name);});
     }
     else if(btn.hasAttribute('data-pick-merged'))switchMerged(btn.dataset.pickMerged,btn.dataset.appearance);
     else if(btn.hasAttribute('data-assign-merged'))assignMerged(btn.dataset.assignMerged);
     else if(btn.hasAttribute('data-open-role')){ui.expandedRole=key(btn.dataset.category,btn.dataset.openRole);render();}
     else if(btn.hasAttribute('data-pick'))switchVariant(btn.dataset.pick,btn.dataset.id,btn.dataset.category);
     else if(btn.hasAttribute('data-assign'))assign(btn.dataset.assign,btn.dataset.category);
     else if(btn.hasAttribute('data-plus')){if(ui.draft){if(ui.draft.role===btn.dataset.plus&&ui.draft.category===btn.dataset.category)saveDraft();else{ui.message='Сначала завершите черновик другой роли.';render();}}else startDraft(btn.dataset.plus,btn.dataset.category);}
     else if(btn.hasAttribute('data-color-open')){const menu=btn.nextElementSibling;menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));}
     else if(btn.hasAttribute('data-choose-color'))updateDraft(btn.dataset.role,'colorToken',btn.dataset.chooseColor,btn.dataset.category);
     else if(btn.hasAttribute('data-jump-style')){if(EDITOR_STYLES[btn.dataset.jumpStyle]){ui.styleId=btn.dataset.jumpStyle;ui.category='__all';render();}}
     else if(btn.hasAttribute('data-focus-block')){const t=LIB[btn.dataset.focusTemplate]||getActiveTpl(),b=t?.blocks.find(x=>x.id===btn.dataset.focusBlock);if(b){
       if(['grid','split'].includes(SB_Gallery.mode)){ui.blockPicks.clear();ui.blockPicks.add(t.id+'\u0000'+b.id);document.querySelectorAll('#galRoot [data-v5-block]').forEach(n=>{const card=n.closest('.gal-card');n.classList.toggle('v5-picked',ui.blockPicks.has(card.dataset.id+'\u0000'+n.dataset.v5Block));});}
       else{if(selectedId!==t.id)selectTpl(t.id,true);selectedBlockId=b.id;renderCanvasTemplate(t);}
       const x=E.getBinding(t,b,ui.styleId);if(x)ui.expandedRole=key(ui.category==='__all'?'__all':x.categoryId,x.roleId);render();}}
     else if(btn.hasAttribute('data-discard-draft'))dropDraft();
     else if(btn.hasAttribute('data-delete-variant'))deleteVariant(btn.dataset.deleteVariant,btn.dataset.id,btn.dataset.category);
     else if(btn.hasAttribute('data-add-role')){const role=box.querySelector('[data-extra-role]')?.value;if(role)startDraft(role,ui.category);}
   });
   box.addEventListener('change',e=>{const el=e.target;
     if(el.matches('[data-measure-distance]')||el.matches('[data-measure-typography]')){if(el.matches('[data-measure-distance]'))measure.distances=el.checked;else measure.typography=el.checked;try{localStorage.setItem('cs_v5_measure_overlay',JSON.stringify(measure));}catch(_){}refreshMeasurementOverlays();render();}
     else if(el.matches('[data-style]')){if(ui.draft){ui.message='Сначала сохраните либо сбросьте черновик.';render();return;}ui.styleId=el.value;ui.choice={};render();}
     else if(el.matches('[data-category-filter]')){if(ui.draft){ui.message='Сначала сохраните либо сбросьте черновик.';render();return;}ui.category=el.value;ui.expandedRole='';render();}
     else if(el.matches('[data-merged-weight]'))editMerged(el.dataset.mergedWeight,el.dataset.appearance,'weight',el.value);
     else if(el.matches('[data-merged-color]'))editMerged(el.dataset.mergedColor,el.dataset.appearance,'color',el.value);
     else if(el.matches('[data-v-color]'))updateDraft(el.dataset.vColor,'colorToken',el.value,el.dataset.category);
     else if(el.matches('[data-v-weight]'))updateDraft(el.dataset.vWeight,'weight',el.value,el.dataset.category);
     else if(el.matches('[data-family]'))mutateFont(el.dataset.family,'family',el.value);
     else if(el.matches('[data-role-opacity]'))mutateFont(el.dataset.roleOpacity,'opacity',el.value);
     else if(el.matches('[data-text-opacity]')){const targets=selectedBlocks();if(targets.length)step(()=>{for(const {b} of targets){b.style ||= {};b.style.opacity=Math.round(Number(el.value)/10)*10;}},{templateIds:idsOf(targets),persistTemplates:!session});}
     else if(el.matches('[data-weight-role]'))mutateFont(el.dataset.weightRole,'weights',{weight:el.dataset.weight,enabled:el.checked});
     else if(el.matches('[data-role-color]'))mutateRoleColor(el.dataset.roleColor,el.dataset.token,el.checked);
     else if(el.matches('[data-use-family]')){if(el.checked&&!confirm('Применение семейства может изменить переносы текста в шаблонах. Включить?')){render();return;}step(()=>{model().applyFontFamily=el.checked;repaintParticipants();},{templateIds:participants().map(t=>t.id)});}
     else if(el.matches('[data-palette-text]')){const name=el.dataset.paletteText,color=E.normalizeColor(el.value);if(!color){ui.message='Цвет: #RRGGBB или rgba(R,G,B,A).';render();return;}step(()=>{model().palette[name]=color;if(name==='Accent')getStyle().accent=color;repaintParticipants();},{templateIds:participants().map(t=>t.id)});}
     else if(el.matches('[data-palette]')){const name=el.dataset.palette;if(name==='White')return;step(()=>{model().palette[name]=el.value;if(name==='Accent')getStyle().accent=el.value;repaintParticipants();},{templateIds:participants().map(t=>t.id)});}
   });
 }
 // One object-selection rule in the stage and the map: click = one, Shift+click = toggle.
 // blockPicks shares the main canvas selection Set, so adaptation/range sees the same picks.
 function paintMapBlockSelection(){
   document.querySelectorAll('#galRoot [data-v5-block]').forEach(n=>{const c=n.closest('.gal-card');n.classList.toggle('v5-picked',!!c&&ui.blockPicks.has(c.dataset.id+'\u0000'+n.dataset.v5Block));});
 }
 function selectEditorTemplate(id){
   if(!LIB[id])return;
   if(checked.has(id))checked.delete(id);else checked.add(id);
   anchorId=id;paintSelection();ui.message=`Template selection: ${checked.size} шаблонов. Текстовое выделение сохранено.`;render();
 }
 document.addEventListener('pointerdown',e=>{
   if(!ui.active)return;
   if(e.shiftKey&&e.altKey){const card=e.target.closest('#galRoot .gal-card'),item=e.target.closest('.tpl-item'),id=card?.dataset.id||item?.dataset.tpl;if(id){e.preventDefault();e.stopPropagation();selectEditorTemplate(id);return;}}
   if(e.target.closest('.slot-dice'))return;
   const inStage=e.target.closest('#stageWrap'),inMap=e.target.closest('#galRoot');
   if(!inStage&&!inMap)return;
   const mapCard=inMap&&e.target.closest('#galRoot .gal-card'),t=mapCard?(LIB[mapCard.dataset.id]||getActiveTpl()):getActiveTpl();if(!t)return;
   if(inStage){
     e.preventDefault();e.stopPropagation();
     const el=e.target.closest('.cv-block');
     if(!el){selectedBlockId=null;ui.blockPicks.clear();window.CoversAdaptationV1?.setSelected?.([],true);renderCanvasTemplate(t);render();return;}
     const b=t.blocks.find(x=>x.id===el.dataset.id);if(!b)return;
     if(b.kind!=='text'){selectedBlockId=null;ui.blockPicks.clear();window.CoversAdaptationV1?.setSelected?.([],true);renderCanvasTemplate(t);render();return;}
     const id=t.id+'\u0000'+b.id;
     if(e.shiftKey||e.ctrlKey||e.metaKey){if(ui.blockPicks.has(id))ui.blockPicks.delete(id);else ui.blockPicks.add(id);}
     else{ui.blockPicks.clear();ui.blockPicks.add(id);}
     selectedBlockId=b.id;window.CoversAdaptationV1?.setSelected?.([...ui.blockPicks],true);
     const x=b.kind==='text'&&E.getBinding(t,b,ui.styleId);if(x)ui.expandedRole=key(ui.category==='__all'?'__all':x.categoryId,x.roleId);
     renderCanvasTemplate(t);render();return;
   }
   const el=e.target.closest('#galRoot [data-v5-block]');
   if(!el){
     if(e.target.closest('#galRoot .gal-card, #galRoot [data-gal-scroll]')){
       selectedBlockId=null;ui.blockPicks.clear();window.CoversAdaptationV1?.setSelected?.([],true);paintMapBlockSelection();render();
     }
     return;
   }
   const card=el.closest('.gal-card');if(!card)return;
   e.stopPropagation();const id=card.dataset.id+'\u0000'+el.dataset.v5Block;
   if(e.shiftKey||e.ctrlKey||e.metaKey){if(ui.blockPicks.has(id))ui.blockPicks.delete(id);else ui.blockPicks.add(id);}
   else{ui.blockPicks.clear();ui.blockPicks.add(id);}
   selectedId=card.dataset.id;selectedBlockId=el.dataset.v5Block;
   window.CoversAdaptationV1?.setSelected?.([...ui.blockPicks],true);
   paintMapBlockSelection();render();
 },true);
 document.addEventListener('click',e=>{
   if(!ui.active)return;
   const card=e.target.closest('#galRoot .gal-card'),mapSurface=e.target.closest('#galRoot [data-gal-scroll]');
   if(card||mapSurface){e.preventDefault();e.stopPropagation();return;}
   const item=e.target.closest('.tpl-item');if(!item||e.target.closest('[data-fav]'))return;
   if(e.shiftKey&&e.altKey){e.preventDefault();e.stopPropagation();return;}
   if(e.target.closest('[data-chk]'))return; // explicit checkbox remains a template-selection control.
   e.preventDefault();e.stopPropagation();
   const id=item.dataset.tpl;if(LIB[id]&&selectedId!==id)selectTpl(id,true,true);
 },true);
 // Prevent unrelated legacy library mutation inside the transaction; leave filters and navigation available.
 document.addEventListener('click',e=>{if(!session)return;
   if(e.target.closest('#btnAdd,#btnImportJs,#btnTemplatesFolder,#btnClear,#btnArchiveLoad,#btnPrompts,#bulkBar,#btnMgrAddStyle')){
     e.preventDefault();e.stopPropagation();toast('Завершите ручную сессию перед изменением библиотеки');
   }
 },true);
 document.getElementById('btnStylesV5').onclick=()=>{if(!ui.active&&getActiveTpl()?.editorStyleId&&EDITOR_STYLES[getActiveTpl().editorStyleId]){ui.styleId=getActiveTpl().editorStyleId;ui.category='__all';}if(ui.active&&session){toast('Сначала примените или отмените ручную сессию');return;}
   ui.active=!ui.active;document.body.classList.toggle('v5-active',ui.active);document.getElementById('btnStylesV5').classList.toggle('on',ui.active);
   if(ui.active){render();refreshMeasurementOverlays();}else{refreshMeasurementOverlays();saved.render(getActiveTpl());}
 };
 window.addEventListener('beforeunload',e=>{if(session){e.preventDefault();e.returnValue='Есть несохранённая сессия стилей';}});
 // Optional AI dialog and main no-AI collector load after this script.
 function openCollect(){if(ui.draft){ui.message='Сначала сохраните или сбросьте черновик.';render();return;}window.CoversStyleCollectV5?.open({ui,step,targets:selectedTemplates,refresh});}
 function openAI(){window.CoversStyleAIUIV5?.open({ui,session:()=>session,step,model,getStyle,targets:selectedTemplates,refresh,saveGroups});}
})();
