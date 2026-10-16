/* A compact, fictional GTA corridor. Coordinates are game metres × 10, not GIS.
   Each town keeps the original directed street navigator; only interchanges
   connect their independent grids. There are no surface roads across the gaps. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TaxiRegion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function expand(m,R,rng){
 const core={...m,id:'toronto',name:'Toronto',offset:0,theme:'downtown',regional:false};
 core.bays.forEach(b=>b.city='Toronto');
 // Give the opening pickup a forgiving approach; subsequent tight and reverse
 // bays retain their original parking challenge.
 const opening=core.bays[11],approachCar=core.parked.find(p=>Math.abs(p.x-(opening.x-78))<1&&Math.abs(p.y-opening.y)<1);if(approachCar)approachCar.x=opening.x-132;
 const districts=[core];
 for(const [di,name,offset,theme] of [[1,'Pickering',13200,'garden'],[2,'Oshawa',26400,'industry']]){
  const rand=rng(m.seed+di*379),xs=[220,800,1380,1960,2540,3120],ys=[220,800,1380,1960,2460,2960].map(y=>220+(y-220)*(m.ys.at(-1)-220)/2740);
  const d={seed:m.seed+di*379,id:name.toLowerCase(),name,offset,theme,xs,ys,w:3360,h:m.h,hy:m.hy,nodes:[],buildings:[],parks:[],bays:[],parked:[],ramps:[],landmarks:[],landmarkColliders:[],busStops:[],busRoutes:[],roadHalf:82,sidewalkHalf:94,laneOffsets:[20,56],streets:theme==='garden'?['Kingston Road','Valley Farm Road','Civic Centre Drive','Bayly Street','Station Road','Waterfront Drive']:['King Street','Bond Street','Simcoe Market Road','Bloor Street','Station Road','Harbour Road'],avenues:theme==='garden'?['West Shore Avenue','Rosebank Road','Whites Road','Liverpool Road','Brock Road','East Shore Avenue']:['Stevenson Road','Park Road','Centre Street','Simcoe Street','Ritson Road','Wilson Road'],_depthCity:true};
  for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length;i++)d.nodes.push({x:xs[i],y:ys[j],i,j,id:j*xs.length+i});
  const names=theme==='garden'?['GO Station','Civic Square','Waterfront Inn','Valley Gardens','Village Market','Marina Café','Town Centre','Arts Studio','Lakeside Hotel','Library']:['GO Station','Motor Works','University House','Arena','Harbour Market','Rail Museum','Warehouse Studios','Foundry Café','Civic Hall','Lakeside Diner'];
  for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length-1;i++){
   const x=(xs[i]+xs[i+1])/2,y=ys[j],b={id:d.bays.length,x,y:y+111,a:0,type:'parallel',street:d.streets[j],place:name+' '+names[(j*5+i)%names.length],city:name,node:j*xs.length+i,col:i,row:j,roadY:y};d.bays.push(b);
   for(const v of [-78,78])d.parked.push({x:x+v,y:y+111,a:0,parked:true,color:di===1?'#7d998c':'#9d8574'});
   if(j===ys.length-1)continue;
   const bx=xs[i]+108,by=y+222,w=xs[i+1]-xs[i]-216,h=ys[j+1]-ys[j]-330;
   if((i+j*3)%5===0){d.parks.push({x:bx,y:by,w,h});continue;}
   for(let k=0;k<2;k++)d.buildings.push({x:bx+k*(w/2+8),y:by,w:w/2-8,h,color:di===1?(i+j)%3:(i+j)%5,roof:i%3,regional:true,theme,visualHeight:theme==='garden'?32+rand()*90:24+rand()*48});
   // Shops flank a usable parking court, rather than filling every lot.
   for(const [x,w] of [[xs[i]+108,70],[xs[i+1]-178,70]])d.buildings.push({x,y:y+108,w,h:88,color:di===1?1:3,roof:j%3,regional:true,theme,visualHeight:24+rand()*30});
  }
  R.configure(d);d.renderMap={...d};
  districts.push(d);
 }
 // Renderer maps stay near their local origin; simulation maps get world coordinates.
 for(const d of districts){
  d.renderMap=d.renderMap||{...d};
  if(!d.offset)continue;const ox=d.offset;
  d.minStreetX=ox+120;d.xs=d.xs.map(x=>x+ox);d.nodes=d.nodes.map(n=>({...n,x:n.x+ox}));
  for(const key of ['buildings','parks','bays','parked','landmarks','landmarkColliders','busStops','groundColliders','highwayPiers','rampPiers'])d[key]=d[key].map(o=>({...o,x:o.x+ox}));
  d.highwayStart+=ox;d.highwayEnd+=ox;d.w+=ox;
  d.waterfront={...d.waterfront,minX:d.waterfront.minX+ox,maxX:d.waterfront.maxX+ox};
  d.groundRoads=d.groundRoads.map(g=>({...g,x1:g.x1+ox,x2:g.x2+ox}));
  d.roadProfiles=d.roadProfiles.map(p=>({...p,x0:p.x0+ox,points:p.points.map(q=>({...q,x:q.x+ox})),travelPoints:p.travelPoints.map(q=>({...q,x:q.x+ox})),highwayJoin:{...p.highwayJoin,x:p.highwayJoin.x+ox}}));
  d.ramps=d.roadProfiles.map(p=>p.points.map(q=>({x:q.x,y:q.z})));
 }
 m.districts=districts;m.regional=true;m.regionName='GTA Lakeshore Corridor';m.w=29800;
 m.nodes=[];m.bays=[];m.parked=[];m.buildings=[];m.parks=[];m.landmarks=[];m.landmarkColliders=[];m.roadProfiles=[];m.groundRoads=[];m.groundColliders=[];m.highwayPiers=[];m.rampPiers=[];
 for(const d of districts){
  d.nodeOffset=m.nodes.length;
  for(const n of d.nodes){const id=n.id+d.nodeOffset,neighbors=[[n.i-1,n.j],[n.i+1,n.j],[n.i,n.j-1],[n.i,n.j+1]].filter(([i,j])=>i>=0&&i<d.xs.length&&j>=0&&j<d.ys.length).map(([i,j])=>j*d.xs.length+i+d.nodeOffset);m.nodes.push({...n,id,districtId:d.id,neighborIds:neighbors});}
  for(const b of d.bays){b.id=m.bays.length;b.node=b.row*d.xs.length+b.col+d.nodeOffset;b.districtId=d.id;m.bays.push(b);}
  for(const p of d.roadProfiles){p.index=m.roadProfiles.length;p.districtId=d.id;p.city=d.name;p.surfaceNodeId+=d.nodeOffset;m.roadProfiles.push(p);}
  for(const key of ['parked','buildings','parks','landmarks','landmarkColliders','groundRoads','groundColliders','highwayPiers','rampPiers'])m[key].push(...d[key]);
 }
 m.ramps=m.roadProfiles.map(p=>p.points.map(q=>({x:q.x,y:q.z})));
 m.highwayStart=core.highwayStart;m.highwayEnd=districts[2].highwayEnd;
 // Sparse viaduct supports in greenbelt gaps. Nothing intersects a surface street.
 for(const [a,b] of [[core.highwayEnd,districts[1].highwayStart],[districts[1].highwayEnd,districts[2].highwayStart]])for(let x=a+240;x<b-120;x+=400){if(m.roadProfiles.some(p=>[-108,108].some(off=>{const hit=R.project(p,x,m.hy+off),q=R.pointAt(p,hit.s);return hit.distance<q.halfWidth+24&&q.height<64;})))continue;m.highwayPiers.push({x,z:m.hy,offset:108,width:10,depth:13,height:56});for(const s of [-1,1])m.groundColliders.push({x:x-5,y:m.hy+s*108-6.5,w:10,h:13,minHeight:0,maxHeight:56,kind:'bridge pier'});}
 // Existing 509 stays exactly as before; the 900 serves all three cities both ways.
 const stops=[];for(const [di,j,i,a] of [[0,3,5,0],[1,3,2,0],[2,3,2,0],[2,4,2,Math.PI],[1,4,2,Math.PI],[0,4,5,Math.PI]]){
  const d=districts[di],col=a===0?i:i+1,from=d.nodeOffset+j*d.xs.length+col,to=from+(a===0?1:-1),x=(d.xs[i]+d.xs[i+1])/2,y=d.ys[j]+(a===0?65:-65);
  const stop={id:'regional-'+stops.length,index:stops.length,x,y,a,type:'bus',place:d.name+(di===0?' Union Coach Terminal':a===0?' GO Station':' Civic Terminal'),city:d.name,street:d.streets[j],row:j,col:i,node:from,edgeFrom:from,edgeTo:to,districtId:d.id,routeId:'900',length:144,width:32,waiting:5+(stops.length*3)%8};stops.push(stop);d.renderMap.busStops=d.renderMap.busStops.concat({...stop,x:x-d.offset,edgeFrom:from-d.nodeOffset,edgeTo:to-d.nodeOffset});
 }
 m.busRoutes=[...core.busRoutes,{id:'900',name:'900 Lakeshore Intercity',stops,edges:[],nodes:[]}];m.busStops=[...core.busStops,...stops];
 m.highwaySectors=[{name:'Port Union Freight Corridor',kind:'freight',start:core.highwayEnd,end:districts[1].highwayStart},{name:'Lynde Creek Reserve',kind:'wetland',start:districts[1].highwayEnd,end:districts[2].highwayStart}];
 m.groundColliders.push({x:43,y:m.waterfront.shoreZ-4,w:m.w-86,h:8,minHeight:0,maxHeight:8,kind:'quay wall'});m.dispatchMode='regional';return m;
}
function districtAt(m,p){return m.districts.reduce((best,d)=>{const x=clamp(p.x,d.xs[0],d.xs.at(-1)),y=clamp(p.y,d.ys[0],d.ys.at(-1));return !best||Math.hypot(p.x-x,p.y-y)<best.distance?{d,distance:Math.hypot(p.x-x,p.y-y)}:best;},null).d;}
function localTarget(d,to){return{...to,node:to.node===undefined?undefined:to.node-d.nodeOffset,edgeFrom:to.edgeFrom===undefined?undefined:to.edgeFrom-d.nodeOffset,edgeTo:to.edgeTo===undefined?undefined:to.edgeTo-d.nodeOffset};}
function route(m,from,to,R,streetRoute){
 const origin=districtAt(m,from),destination=m.districts.find(d=>d.id===to.districtId)||districtAt(m,to),sample=from.roadSample||R.sampleRoad(m,from.x,from.y),p=sample.layer==='ramp'?m.roadProfiles[sample.rampIndex]:null;
 const local=(d,a,b)=>streetRoute(d,a,localTarget(d,b));
 if(sample.layer==='ground'&&origin===destination)return local(origin,from,to);
 const points=[],push=q=>{if(!points.length||distance(points.at(-1),q)>.1)points.push(q);};
 push({...from});
 function along(profile,start,end){const dir=end>=start?1:-1;for(let s=start;dir>0?s<end:s>end;s+=dir*18){const q=R.pointAt(profile,s);push({x:q.x,y:q.z,height:q.height,roadLayer:'ramp',rampIndex:profile.index});}const q=R.pointAt(profile,end);push({x:q.x,y:q.z,height:q.height,roadLayer:'ramp',rampIndex:profile.index});}
 function leave(profile,start){along(profile,start,0);const d=m.districts.find(d=>d.id===profile.districtId),exit={x:profile.x0+18,y:profile.z0-136,a:-Math.PI/2,height:0,roadLayer:'ground'};push(exit);const tail=route(m,exit,to,R,streetRoute);tail.forEach(push);}
 if(p&&p.kind==='exit'){leave(p,sample.distanceAlong);return points;}
 let hx=from.x,dir=p?p.highwayDir:from.y>=m.hy?1:-1;
 if(sample.layer==='ground'){
  dir=destination.offset>origin.offset?1:-1;
  const entry=m.roadProfiles.find(p=>p.districtId===origin.id&&p.kind==='entry'&&p.highwayDir===dir),node=m.nodes[entry.surfaceNodeId],prev=m.nodes[node.id-origin.xs.length];
  // Finish the ground route heading south in the right lane at the ramp mouth.
  const access={x:entry.x0,y:entry.z0-160,a:Math.PI/2,type:'bus',edgeFrom:prev.id,edgeTo:node.id,node:prev.id,row:prev.j,col:prev.i,districtId:origin.id};
  local(origin,from,access).forEach(push);push({x:entry.x0,y:entry.z0,height:0,roadLayer:'ramp',rampIndex:entry.index});along(entry,0,entry.total);hx=entry.highwayJoin.x;
 }else if(p){along(p,Math.min(p.total,sample.distanceAlong+8),p.total);hx=p.highwayJoin.x;}
 // Choose the requested city's exit if still ahead. A missed exit uses the next
 // interchange, then returns in the opposite carriageway; never a median U-turn.
 let exit=m.roadProfiles.find(p=>p.kind==='exit'&&p.districtId===destination.id&&p.highwayDir===dir&&(p.highwayJoin.x-hx)*dir>80);
 if(!exit)exit=m.roadProfiles.filter(p=>p.kind==='exit'&&p.highwayDir===dir&&(p.highwayJoin.x-hx)*dir>40).sort((a,b)=>(a.highwayJoin.x-b.highwayJoin.x)*dir)[0];
 if(!exit){
  // Beyond the last exit, follow the visible terminal turning loop on the deck.
  const end=dir>0?m.highwayEnd-80:m.highwayStart+80;
  push({x:end,y:m.hy+dir*53,height:m.highwayHeight,roadLayer:'highway'});
  for(let k=1;k<=24;k++){const a=(dir>0?Math.PI/2:-Math.PI/2)-k/24*Math.PI;push({x:end+Math.cos(a)*53,y:m.hy+Math.sin(a)*53,height:m.highwayHeight,roadLayer:'highway'});}
  const tail=route(m,{x:end,y:m.hy-dir*53,a:dir>0?Math.PI:0,height:m.highwayHeight,roadLayer:'highway',roadSample:{x:end,z:m.hy-dir*53,layer:'highway',height:m.highwayHeight}},to,R,streetRoute);tail.forEach(push);return points;
 }
 const join=exit.highwayJoin;
 for(let x=hx+dir*100;(join.x-x)*dir>60;x+=dir*180)push({x,y:m.hy+dir*53,height:m.highwayHeight,roadLayer:'highway'});
 push({x:join.x,y:join.y,height:m.highwayHeight,roadLayer:'highway'});leave(exit,exit.total);return points;
}
// Route length and exit guidance describe the path actually driven, including
// legal recovery after missing an exit. The estimate assumes light flowing traffic.
function describeRoute(m,points){
 let length=0,highwayLength=0,rampLength=0,seconds=0,nextExit=null,previousAngle=null,turning=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],len=distance(a,b),layer=a.roadLayer||b.roadLayer||'ground',profile=m.roadProfiles[a.rampIndex??b.rampIndex];
  if(!nextExit&&layer==='ramp'&&profile?.kind==='exit')nextExit={city:profile.city,number:m.districts.findIndex(d=>d.id===profile.districtId)+1,rampIndex:profile.index,distance:length};
  if(layer==='highway'){highwayLength+=len;seconds+=len/250;}else if(layer==='ramp'){rampLength+=len;seconds+=len/95;}else{seconds+=len/75;const angle=Math.atan2(b.y-a.y,b.x-a.x);if(previousAngle!==null)turning+=Math.abs(Math.atan2(Math.sin(angle-previousAngle),Math.cos(angle-previousAngle)));previousAngle=angle;}
  length+=len;
 }
 seconds+=turning*3;
 return{length,highwayLength,rampLength,estimatedSeconds:seconds,nextExit};
}
function sectorAt(m,x){return(m.highwaySectors||[]).find(s=>x>=s.start&&x<=s.end)?.name||'Gardiner / Lakeshore Expressway';}
return{expand,districtAt,route,describeRoute,sectorAt};
});
