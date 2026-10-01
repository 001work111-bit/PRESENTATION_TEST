// Synthetic + supplied-fixture tests for the pure text-flow planner; no browser dependency.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const listeners={};
const sandbox={
  window:{},
  document:{head:{append(){}},createElement(){return {set textContent(v){this.css=v;}}},addEventListener(type,fn){(listeners[type]||=[]).push(fn);}},
  localStorage:{getItem(){return null;},setItem(){}},
  CSS:{escape:s=>String(s)},
  setTimeout,clearTimeout,Map,Set,Math,Number,String,Object,Array,JSON,console
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'adaptation.js'),'utf8'),sandbox);
const {makePlan,applyPlan}=sandbox.window.CoversAdaptationV1;
const template={id:'test',blocks:[
  {id:'title',kind:'text',x:40,y:0,w:300,h:30},
  {id:'plate',kind:'shape',x:40,y:38,w:300,h:8},
  {id:'body',kind:'text',x:40,y:50,w:300,h:20},
  {id:'side',kind:'text',x:500,y:50,w:180,h:20},
  {id:'tail',kind:'text',x:40,y:90,w:300,h:20}
]};
let plan=makePlan(template,new Map([['title',60],['body',20],['side',20],['tail',20]]));
assert.equal(plan.changed,true);
applyPlan(template,plan);
assert.equal(template.blocks.find(x=>x.id==='title').h,60);
assert.equal(template.blocks.find(x=>x.id==='body').y,80);
assert.equal(template.blocks.find(x=>x.id==='tail').y,120);
assert.equal(template.blocks.find(x=>x.id==='side').y,50,'adjacent column remains in place');
assert.equal(template.blocks.find(x=>x.id==='plate').y,38,'non-text shape remains untouched');

const rangeTemplate={id:'range',blocks:[
  {id:'above',kind:'text',x:0,y:0,w:320,h:12},
  {id:'a',kind:'text',x:0,y:20,w:320,h:24},
  {id:'middle',kind:'text',x:0,y:58,w:320,h:16},
  {id:'b',kind:'text',x:0,y:80,w:320,h:50},
  {id:'below-inside-boundary-box',kind:'text',x:0,y:100,w:320,h:20},
  {id:'below',kind:'text',x:0,y:150,w:320,h:20}
]};
plan=makePlan(rangeTemplate,new Map([['above',28],['a',44],['middle',28],['b',30],['below-inside-boundary-box',48],['below',48]]),new Set(['b','a']),true);
assert.deepEqual(Array.from(plan.scopeIds).sort(),['a','b','middle']);
applyPlan(rangeTemplate,plan);
assert.equal(rangeTemplate.blocks.find(x=>x.id==='above').h,12,'block above first selection is not measured/adapted');
assert.equal(rangeTemplate.blocks.find(x=>x.id==='a').h,44);
assert.equal(rangeTemplate.blocks.find(x=>x.id==='middle').y,78);
assert.equal(rangeTemplate.blocks.find(x=>x.id==='b').y,112);
assert.equal(rangeTemplate.blocks.find(x=>x.id==='below-inside-boundary-box').y,100,'block after last selected is excluded even inside its original box');
assert.equal(rangeTemplate.blocks.find(x=>x.id==='below-inside-boundary-box').h,20);
assert.equal(rangeTemplate.blocks.find(x=>x.id==='below').y,150,'text below the selected range is not moved');


// Safe Adapt never shrinks authored/current block heights; Normalize is explicit.
const safeHeights={id:'safe-heights',blocks:[
  {id:'short-content',kind:'text',x:0,y:0,w:300,h:120},
  {id:'long-content',kind:'text',x:0,y:140,w:300,h:120},
  {id:'manual-large',kind:'text',x:0,y:280,w:300,h:180}
]};
plan=makePlan(safeHeights,new Map([['short-content',80],['long-content',170],['manual-large',100]]));
applyPlan(safeHeights,plan);
assert.equal(safeHeights.blocks[0].h,120,'short content preserves the authored minimum height');
assert.equal(safeHeights.blocks[1].h,170,'long content grows beyond the authored minimum');
assert.equal(safeHeights.blocks[2].h,180,'manually enlarged blocks are not shrunk by Adapt');

const normalizePlanTemplate={id:'normalization',blocks:[
  {id:'selected',kind:'text',x:0,y:40,w:300,h:180},
  {id:'following',kind:'text',x:0,y:240,w:300,h:90}
]};
plan=makePlan(normalizePlanTemplate,new Map([['selected',100],['following',32]]),null,false,true);
assert.equal(plan.moves.find(x=>x.blockId==='selected').newH,100,'Normalize All uses measured height');
assert.equal(plan.moves.find(x=>x.blockId==='selected').newY,40,'normalization itself does not change y');
assert.equal(plan.moves.find(x=>x.blockId==='following').newH,32);
const minNormalize=makePlan({id:'min-normalize',blocks:[{id:'tiny',kind:'text',x:0,y:0,w:100,h:5}]},new Map([['tiny',3]]),null,false,true);
assert.equal(minNormalize.moves[0].newH,14,'Normalize respects MIN_H');

const distinctGaps={id:'gaps',blocks:[
  {id:'a',kind:'text',x:0,y:0,w:300,h:20},
  {id:'b',kind:'text',x:0,y:32,w:300,h:10},
  {id:'c',kind:'text',x:0,y:73,w:300,h:10}
]};
plan=makePlan(distinctGaps,new Map([['a',40],['b',25],['c',10]]));
applyPlan(distinctGaps,plan);
const ga=distinctGaps.blocks[0],gb=distinctGaps.blocks[1],gc=distinctGaps.blocks[2];
assert.equal(gb.y-(ga.y+ga.h),12,'first block keeps its own source gap');
assert.equal(gc.y-(gb.y+gb.h),31,'second block keeps a different source gap');

// Regressions in the supplied four-template library: the title, labels and copy
// in this exact layout had overlapping source positions before adaptation.
const fixtureCtx={window:{MY_CUSTOM_COVERS:[]}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'test-fixtures/covers_unique_templates_4_standardized.js'),'utf8'),fixtureCtx);
const fixture=fixtureCtx.window.MY_CUSTOM_COVERS.find(t=>t.id==='editorial-blue-concept-mechanism-01');
assert.ok(fixture,'the supplied editorial concept/mechanism template is present');
const originalShape=fixture.blocks.find(b=>b.id==='shape_02');
const originalImage=fixture.blocks.find(b=>b.id==='image_01');
const flowIds=['text_01','text_02','text_03','text_04','text_05','text_06','text_07','text_08'];
const fixtureHeights=new Map([['text_01',18],['text_02',100],['text_03',14],['text_04',158],['text_05',14],['text_06',83],['text_07',14],['text_08',46]]);
plan=makePlan(fixture,fixtureHeights);
assert.equal(plan.changed,true);
applyPlan(fixture,plan);
const textById=id=>fixture.blocks.find(b=>b.id===id);
assert.equal(textById('text_02').y,76);
assert.equal(textById('text_03').y,194,'safe Adapt preserves the title block minimum height and moves the next label clear');
assert.equal(textById('text_04').y,226,'main copy follows the safely preserved label height with the authored gap');
assert.equal(textById('text_05').y,392,'RESULT label follows the preserved main-copy height and authored gap');
for(let i=0;i<flowIds.length-1;i++){
  const a=textById(flowIds[i]),b=textById(flowIds[i+1]);
  assert.ok(b.y>=a.y+a.h,`${a.id} and ${b.id} no longer overlap`);
}
assert.equal(fixture.blocks.find(b=>b.id==='shape_02').y,originalShape.y,'shape geometry is fixed');
assert.equal(fixture.blocks.find(b=>b.id==='image_01').y,originalImage.y,'image geometry is fixed');
assert.equal(textById('text_15').y,740,'the right-hand footer column is not moved');

const unchanged={id:'eps',blocks:[{id:'x',kind:'text',x:0,y:0,w:200,h:40}]};
assert.equal(makePlan(unchanged,new Map([['x',41]])).changed,true,'one-pixel height change is applied instead of drifting gaps');
assert.equal(makePlan(unchanged,new Map([['x',0]])).changed,false,'missing measurements are skipped, never collapsed');

// Native checkboxes only: settings render as ordinary checkbox inputs.
const controlMarkup=sandbox.window.CoversAdaptationV1.renderControls();
assert.match(controlMarkup,/type="checkbox"[^>]*data-adapt-auto/);
assert.match(controlMarkup,/type="checkbox"[^>]*data-adapt-selection/);
assert.match(controlMarkup,/type="checkbox"[^>]*data-adapt-all/);
assert.match(controlMarkup,/data-adapt-manual[^>]*>Adapt</);
assert.doesNotMatch(controlMarkup,/data-adapt-normalize|data-gap-copy|data-gap-apply/,'gap and Normalize buttons are composed only inside the Style Editor');
assert.doesNotMatch(controlMarkup,/data-adapt-delay|Ctrl\+Alt\+A|Adapt Template/);
assert.doesNotMatch(controlMarkup,/adapt-switch/);

// The range checkbox handler is isolated from other inspector listeners and
// only updates its own setting; changing it cannot invoke/re-render the canvas.
let stopped=false;
listeners.change[0]({target:{checked:true,matches:s=>s==='[data-adapt-selection]',closest:()=>null},stopPropagation(){stopped=true;}});
assert.equal(sandbox.window.CoversAdaptationV1.settings.useSelection,true);
assert.equal(stopped,true);
listeners.change[0]({target:{checked:true,matches:s=>s==='[data-adapt-auto]',closest:()=>null},stopPropagation(){}});
assert.equal(sandbox.window.CoversAdaptationV1.settings.auto,true,'Auto can be toggled without rendering the canvas');
listeners.change[0]({target:{checked:true,matches:s=>s==='[data-adapt-all]',closest:()=>null},stopPropagation(){}});
assert.equal(sandbox.window.CoversAdaptationV1.settings.normalizeAll,true,'Normalize All is a persisted explicit Adapt option');
assert.equal(sandbox.window.CoversAdaptationV1.settings.delay,400,'Auto debounce remains internal and unchanged');
console.log('adaptation planner tests passed (per-pair gaps, columns, shapes/images safety, fixture reflow, checkbox settings, strict range bounds)');
