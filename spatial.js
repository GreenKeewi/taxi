/* Bounded broad phase for immutable map rectangles. Exact contact remains in engine3d. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TaxiSpatial=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const owners=new WeakMap(),EMPTY=[],SIZE=128,LIMIT=256;
function envelope(b){const a=b.a||0,cs=Math.abs(Math.cos(a)),sn=Math.abs(Math.sin(a)),x=b.x+b.w/2,y=b.y+b.h/2,hx=(cs*Math.abs(b.w)+sn*Math.abs(b.h))/2+.01,hy=(sn*Math.abs(b.w)+cs*Math.abs(b.h))/2+.01;return{x0:Math.floor((x-hx)/SIZE),x1:Math.floor((x+hx)/SIZE),y0:Math.floor((y-hy)/SIZE),y1:Math.floor((y+hy)/SIZE)};}
class RectIndex{
 constructor(lists){this.refs=lists.slice();this.lengths=lists.map(x=>x.length);this.items=[];this.bins=new Map();this.always=[];this.cache=new Map();this.stats={queries:0,cacheHits:0,candidates:0,objects:lists.reduce((n,x)=>n+x.length,0)};
  for(const list of lists)for(const b of list){const id=this.items.length;this.items.push(b);const q=envelope(b),count=(q.x1-q.x0+1)*(q.y1-q.y0+1);if(!Number.isFinite(count)||count>4096){this.always.push(id);continue;}for(let x=q.x0;x<=q.x1;x++)for(let y=q.y0;y<=q.y1;y++){const key=x+','+y;let cell=this.bins.get(key);if(!cell){cell=[];this.bins.set(key,cell);}cell.push(id);}}
 }
 matches(lists){if(lists.length!==this.refs.length)return false;for(let i=0;i<lists.length;i++)if(lists[i]!==this.refs[i]||lists[i].length!==this.lengths[i])return false;return true;}
 near(c){this.stats.queries++;const a=c.a||0,cs=Math.abs(Math.cos(a)),sn=Math.abs(Math.sin(a)),length=Math.abs(c.length||44),width=Math.abs(c.width||22),hx=(cs*length+sn*width)/2+.01,hy=(sn*length+cs*width)/2+.01,x0=Math.floor((c.x-hx)/SIZE),x1=Math.floor((c.x+hx)/SIZE),y0=Math.floor((c.y-hy)/SIZE),y1=Math.floor((c.y+hy)/SIZE);if(!Number.isFinite(x0+x1+y0+y1)||(x1-x0+1)*(y1-y0+1)>4096)return this.items;
  const key=x0+','+x1+','+y0+','+y1;let result=this.cache.get(key);if(result){this.stats.cacheHits++;this.cache.delete(key);this.cache.set(key,result);}else{const ids=new Set(this.always);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const id of this.bins.get(x+','+y)||EMPTY)ids.add(id);result=[...ids].sort((a,b)=>a-b).map(id=>this.items[id]);this.cache.set(key,result);if(this.cache.size>LIMIT)this.cache.delete(this.cache.keys().next().value);}
  this.stats.candidates+=result.length;return result;
 }
}
function rectanglesNear(owner,key,lists,c){let entries=owners.get(owner);if(!entries){entries=new Map();owners.set(owner,entries);}let index=entries.get(key);if(!index||!index.matches(lists)){index=new RectIndex(lists);entries.set(key,index);}return index.near(c);}
function stats(owner,key){const index=owners.get(owner)?.get(key);return index?{...index.stats,cacheEntries:index.cache.size}:null;}
function invalidate(owner,key){const entries=owners.get(owner);if(entries){if(key===undefined)owners.delete(owner);else entries.delete(key);}}
return{rectanglesNear,stats,invalidate,SIZE,LIMIT};});
