/* Map layout controls: pixel gaps/card size, selected-only toggle, and two-up Split view. */
(function(){
 'use strict';
 const KEY='cs_v5_map_v6',config={row:12,column:12,size:270,selectedOnly:false};
 try{Object.assign(config,JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('cs_v5_map')||'{}'));}catch(_){}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||a));
 if(config.size<=100)config.size=270;
 config.row=clamp(config.row,0,80);config.column=clamp(config.column,0,80);config.size=clamp(config.size,140,1200);config.selectedOnly=!!config.selectedOnly;
 const style=document.createElement('style');style.textContent=`
   #galRoot .gal-scroll{background:#101317}
   #galRoot [data-gal-grid]{grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--v6-card-size,270px)),var(--v6-card-size,270px)))!important;justify-content:center!important;row-gap:var(--v6-row-gap,12px)!important;column-gap:var(--v6-col-gap,12px)!important}
   body.gal-split #galRoot [data-gal-grid]{grid-template-columns:repeat(2,minmax(0,1fr))!important;justify-content:stretch!important;max-width:none!important;width:100%}
   body.gal-split #galRoot .gal-card,body.gal-split #galRoot .v6-split-empty{width:100%!important;align-self:stretch;min-width:0}
   #galRoot .gal-card{margin:0!important;border-radius:7px!important;background:#d8dade!important;overflow:hidden}
   #galRoot .sb-gal-page,#galRoot .sb-gal-page *{user-select:none;-webkit-user-select:none}
   #galRoot [data-v5-block].v5-picked{outline:2px solid #5b8cff!important;outline-offset:1px}
   #galRoot .gal-frame{border-radius:inherit;overflow:hidden;background:#d8dade}
   #galRoot .gal-cols{display:none!important}
   #galRoot .v6-map-controls{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;color:var(--ui-muted);font-size:10px}
   #galRoot .v6-map-controls label{display:flex;align-items:center;gap:5px;white-space:nowrap}
   #galRoot .v6-map-controls input[type=range]{width:92px;accent-color:var(--ui-accent)}
   #galRoot .v6-map-controls output{min-width:35px;font:10px ui-monospace,monospace;text-align:right}
   #galRoot .v6-icon-toggle{width:30px;height:28px;display:grid;place-items:center;padding:0;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-panel-2);color:var(--ui-muted);cursor:pointer}
   #galRoot .v6-icon-toggle:hover{color:var(--ui-text);border-color:var(--ui-accent)}
   #galRoot .v6-icon-toggle.on{color:#fff;border-color:var(--ui-accent-2);background:var(--ui-accent-2)}
   #galRoot .v6-icon-toggle svg{width:15px;height:15px;display:block}
   #galRoot .v6-map-controls .v6-slider{display:flex;align-items:center;gap:5px}
 `;document.head.append(style);
 const iconFilter='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.2 7.1v5.2l-3.6 1.8v-7z"/><path d="M17 19l1.5 1.5L22 17"/></svg>';
 const iconSplit='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>';
 function apply(){const root=document.getElementById('galRoot');if(!root)return;
   root.style.setProperty('--v6-row-gap',config.row+'px');root.style.setProperty('--v6-col-gap',config.column+'px');root.style.setProperty('--v6-card-size',config.size+'px');
   root.querySelectorAll('[data-v6-setting]').forEach(el=>{const key=el.dataset.v6Setting;el.value=config[key];el.nextElementSibling.textContent=config[key]+'px';});
   window.SB_Gallery?.fitAll?.();try{localStorage.setItem(KEY,JSON.stringify(config));}catch(_){}
 }
 function updateToggles(root=document.getElementById('galRoot')){
   if(!root)return;
   const selected=root.querySelector('[data-v6-selected]'),split=root.querySelector('[data-v6-split]');
   if(selected){selected.classList.toggle('on',!!config.selectedOnly);selected.setAttribute('aria-pressed',String(!!config.selectedOnly));}
   if(split){const on=window.SB_Gallery?.mode==='split';split.classList.toggle('on',on);split.setAttribute('aria-pressed',String(on));}
 }
 function mount(){const root=document.getElementById('galRoot');if(!root)return;
   const bar=root.querySelector('.gal-colbar');if(!bar)return;
   let controls=root.querySelector('.v6-map-controls');if(controls){updateToggles(root);apply();return;}
   controls=document.createElement('div');controls.className='v6-map-controls';
   for(const [key,label,min,max,step,title] of [['size','Размер',140,1200,10,'Размер карточки и число колонок'],['row','↕',0,80,2,'Расстояние между строками'],['column','↔',0,80,2,'Расстояние между карточками']]){
     const row=document.createElement('label');row.className='v6-slider';row.title=title;
     row.innerHTML=`${label} <input type="range" data-v6-setting="${key}" min="${min}" max="${max}" step="${step}"><output></output>`;
     row.querySelector('input').addEventListener('input',e=>{config[key]=clamp(e.target.value,min,max);apply();});controls.append(row);
   }
   const selected=document.createElement('button');selected.type='button';selected.className='v6-icon-toggle';selected.dataset.v6Selected='';selected.title='Только отмеченные шаблоны';selected.setAttribute('aria-label',selected.title);selected.innerHTML=iconFilter;
   selected.addEventListener('click',()=>{config.selectedOnly=!config.selectedOnly;apply();updateToggles(root);window.SB_Gallery?.rebuild?.(true);});controls.append(selected);
   const split=document.createElement('button');split.type='button';split.className='v6-icon-toggle';split.dataset.v6Split='';split.title='Сравнить два шаблона (Split)';split.setAttribute('aria-label',split.title);split.innerHTML=iconSplit;
   split.addEventListener('click',()=>{const next=window.SB_Gallery?.mode==='split'?'grid':'split';window.SB_Gallery?.setMode(next);updateToggles(root);apply();});controls.append(split);
   bar.append(controls);updateToggles(root);apply();
   root.addEventListener('dblclick',e=>{
     const card=e.target.closest('.gal-card');if(!card||!root.contains(card)||!LIB[card.dataset.id]||e.altKey||window.SB_Gallery?.mode==='split'||window.CoversStyleV5?.active)return;
     e.preventDefault();selectTpl(card.dataset.id,true,true);SB_Gallery.setMode('single');
   });
 }
 document.getElementById('viewSwitch')?.addEventListener('click',()=>setTimeout(mount,0));
 window.CoversMapV5={mount,apply,config};
})();
