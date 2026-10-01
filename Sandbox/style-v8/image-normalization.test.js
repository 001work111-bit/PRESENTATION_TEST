const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'image-normalization.js'),'utf8'),sandbox);
const normalize=sandbox.window.normalizeTemplateImages;
const template={id:'fixture',blocks:[
 {id:'oversize',kind:'image',x:-20,y:40,w:1336,h:900,src:'photo',imageTransform:{scale:2,offsetX:16,offsetY:-3}},
 {id:'bleed',kind:'image',x:0,y:0,w:1400,h:900,imageTransform:{scale:3}},
 {id:'flagged',kind:'image',x:40,y:30,w:100,h:100,fullBleed:true,imageTransform:{scale:2}},
 {id:'text',kind:'text',x:-99,y:12,w:1400,h:333,content:'unchanged',style:{fontSize:91},role:'title'},
 {id:'shape',kind:'shape',x:-99,y:12,w:1400,h:333,style:{fill:'#fff'}}
]};
const textBefore=JSON.stringify(template.blocks[3]),shapeBefore=JSON.stringify(template.blocks[4]);
assert.equal(normalize(template),template,'returns the same template');
assert.deepEqual(JSON.parse(JSON.stringify(template.blocks[0])),{id:'oversize',kind:'image',x:0,y:40,w:1123,h:754,src:'photo',imageTransform:{scale:1,offsetX:0,offsetY:0}});
for(const b of [template.blocks[1],template.blocks[2]])assert.deepEqual([b.x,b.y,b.w,b.h],[0,0,1123,794]);
for(const b of template.blocks.filter(x=>x.kind==='image'))assert.deepEqual(JSON.parse(JSON.stringify(b.imageTransform)),{scale:1,offsetX:0,offsetY:0});
assert.equal(JSON.stringify(template.blocks[3]),textBefore,'text geometry/style/content are not touched');
assert.equal(JSON.stringify(template.blocks[4]),shapeBefore,'shapes are not touched');
const nearEdge={blocks:[{kind:'image',x:1110,y:790,w:50,h:12,imageTransform:{scale:1,offsetX:0,offsetY:0}}]};
normalize(nearEdge);assert.deepEqual([nearEdge.blocks[0].x,nearEdge.blocks[0].y,nearEdge.blocks[0].w,nearEdge.blocks[0].h],[1110,790,13,4]);
console.log('image-only normalization tests passed');
