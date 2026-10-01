/* Reusable, image-only geometry/transform normalization for 1123×794 templates. */
(function(){
 'use strict';
 const PAGE_W=1123,PAGE_H=794;
 function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
 function normalizeTemplateImages(template){
   if(!template||!Array.isArray(template.blocks))return template;
   for(const block of template.blocks){
     if(!block||block.kind!=='image')continue;
     const x=finite(block.x),y=finite(block.y),w=finite(block.w),h=finite(block.h);
     const explicitBleed=block.fullBleed===true||block.isFullBleed===true;
     const coversPage=x<=0&&y<=0&&x+w>=PAGE_W&&y+h>=PAGE_H;
     if(explicitBleed||coversPage){
       block.x=0;block.y=0;block.w=PAGE_W;block.h=PAGE_H;
     }else{
       block.x=Math.min(PAGE_W,Math.max(0,x));
       block.y=Math.min(PAGE_H,Math.max(0,y));
       block.w=Math.min(PAGE_W-block.x,Math.max(0,w));
       block.h=Math.min(PAGE_H-block.y,Math.max(0,h));
     }
     block.imageTransform={scale:1,offsetX:0,offsetY:0};
   }
   return template;
 }
 window.normalizeTemplateImages=normalizeTemplateImages;
})();
