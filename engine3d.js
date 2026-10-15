(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.TaxiEngine=api;root.TaxiEngine3D=api;}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
let Roads=typeof globalThis!=='undefined'?globalThis.TaxiRoads:null;if(!Roads&&typeof require==='function'){try{Roads=require('./roads.js');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}}
const PI=Math.PI,TAU=PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const PEOPLE=['Jules','Morgan','Alex','Sam','Robin','Charlie','Kai','Taylor','Avery','Casey','Drew','Frankie'];
const PLACES=['Queen West Records','Graffiti Alley Café','Queen Street Books','Osgoode Market','City Hall Courtyard','Richmond Noodle House','Spadina Flower Shop','Entertainment District Cinema','Richmond Jazz Room','Financial District Hotel','King West Kitchen','Rogers Centre','CN Tower','Princess of Wales Theatre','King Street Gallery','Fort York Bakery','Harbourfront Studios',"Ripley’s Aquarium",'Union Station','St. Lawrence Kitchen','Music Garden','Toronto Waterfront Hotel','Roundhouse Café','Ferry Terminal','Sugar Beach Kiosk'];
const STREETS=['Queen Street West','Richmond Street West','King Street West','Front Street West','Queens Quay West','Lake Shore Boulevard','Harbour Street'];
const AVENUES=['Bathurst Street','Spadina Avenue','Blue Jays Way','Simcoe Street','York Street','Bay Street','Yonge Street','Church Street'];
const START_MINUTES=16*60+15;
const ROAD_HALF=82,SIDEWALK_HALF=94,LANES=[20,56],JUNCTION_ENTRY=118,JUNCTION_EXIT=118;
function lanePoint(a,b,t,lane=1){const angle=Math.atan2(b.y-a.y,b.x-a.x),offset=LANES[lane];return{x:a.x+Math.cos(angle)*t-Math.sin(angle)*offset,y:a.y+Math.sin(angle)*t+Math.cos(angle)*offset};}
function nodeNeighbors(map,n){return [[n.i-1,n.j],[n.i+1,n.j],[n.i,n.j-1],[n.i,n.j+1]].filter(([i,j])=>i>=0&&i<map.xs.length&&j>=0&&j<map.ys.length).map(([i,j])=>map.nodes[j*map.xs.length+i]);}
function turnKind(a,b,c){return Math.sign((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));}
function curvePoints(a,n,b,laneIn,laneOut,steps=14,bendOverride){const ai=Math.atan2(n.y-a.y,n.x-a.x),ao=Math.atan2(b.y-n.y,b.x-n.x),p0=lanePoint(a,n,dist(a,n)-JUNCTION_ENTRY,laneIn),p3=lanePoint(n,b,JUNCTION_EXIT,laneOut),bend=bendOverride===undefined?(turnKind(a,n,b)===0?78:104):bendOverride,p1={x:p0.x+Math.cos(ai)*bend,y:p0.y+Math.sin(ai)*bend},p2={x:p3.x-Math.cos(ao)*bend,y:p3.y-Math.sin(ao)*bend},points=[];for(let i=0;i<=steps;i++){const t=i/steps,u=1-t;points.push({x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y});}return points;}
function preparePath(points){let length=0;const lengths=[0];for(let i=1;i<points.length;i++){length+=dist(points[i-1],points[i]);lengths.push(length);}return{points,lengths,length};}
function samplePath(path,t){let k=1;while(k<path.lengths.length-1&&path.lengths[k]<t)k++;const a=path.points[k-1],b=path.points[k],q=clamp((t-path.lengths[k-1])/(path.lengths[k]-path.lengths[k-1]||1),0,1);return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,a:Math.atan2(b.y-a.y,b.x-a.x)};}
function makeBaseMap(seed=8427){
 const r=rng(seed),xs=[220],ys=[220];for(let i=1;i<6;i++)xs.push(xs[i-1]+430+Math.round(r()*100));for(let i=1;i<5;i++)ys.push(ys[i-1]+420+Math.round(r()*100));
 const w=xs[5]+240,h=ys[4]+560,hy=ys[4]+320,nodes=[],buildings=[],parks=[],bays=[],parked=[],ramps=[],landmarks=[];
 for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length;i++)nodes.push({x:xs[i],y:ys[j],i,j,id:j*6+i});
 for(let j=0;j<4;j++)for(let i=0;i<5;i++){
  const x=xs[i]+108,y=ys[j]+222,bw=xs[i+1]-xs[i]-216,bh=ys[j+1]-ys[j]-330;
  const landmark=i===1&&j===2?{type:'stadium',label:'Rogers Centre'}:i===2&&j===2?{type:'tower',label:'CN Tower'}:i===2&&j===3?{type:'aquarium',label:"Ripley’s Aquarium"}:null;if(landmark){landmarks.push({...landmark,x,y,w:bw,h:bh,col:i,row:j});continue;}
  if(r()<.2){parks.push({x,y,w:bw,h:bh});continue;}
  const gap=20,cols=r()<.6?2:1,rows=2;
  for(let k=0;k<cols;k++)for(let l=0;l<rows;l++)buildings.push({x:x+k*(bw+gap)/cols,y:y+l*(bh+gap)/rows,w:(bw-gap*(cols-1))/cols,h:(bh-gap)/rows,color:Math.floor(r()*5),roof:Math.floor(r()*3)});
 }
 for(let j=0;j<5;j++)for(let i=0;i<5;i++){
  const x=(xs[i]+xs[i+1])/2,y=ys[j],rev=(i+j)%3===2;
  const bay={id:bays.length,x,y:y+(rev?148:111),a:rev?-PI/2:0,type:rev?'reverse':'parallel',street:STREETS[j],place:PLACES[bays.length%PLACES.length],node:j*6+i,col:i,row:j,roadY:y};bays.push(bay);
  if(!rev)for(const offset of [-78,78])parked.push({x:x+offset,y:y+111,a:0,parked:true,color:'#647477'});
  else for(const offset of [-43,43])parked.push({x:x+offset,y:y+148,a:-PI/2,parked:true,color:'#667d84'});
 }
 // Two real slip roads join the surface grid to the divided expressway.
 for(const i of [0,5]){const x=xs[i],sg=i===0?1:-1;ramps.push([{x,y:ys[4]},{x,y:hy-180},{x:x+sg*95,y:hy-90},{x:x+sg*210,y:hy+26}]);}
 const landmarkColliders=landmarks.map(l=>l.type==='tower'?{x:l.x+l.w*.43,y:l.y+l.h*.5,w:l.w*.14,h:l.h*.3}:{x:l.x+l.w*.1,y:l.y+l.h*.2,w:l.w*.8,h:l.h*.6});
 return{seed,xs,ys,w,h,hy,nodes,buildings,parks,bays,parked,ramps,landmarks,landmarkColliders,streets:STREETS,avenues:AVENUES,roadHalf:ROAD_HALF,sidewalkHalf:SIDEWALK_HALF,laneOffsets:LANES};
}
// The original six-by-five city is retained verbatim, then new districts extend
// to the east and south. Landmark coordinates and the opening taxi fare stay put.
function makeMap(seed=8427){
 const m=makeBaseMap(seed),r=rng(seed^0x7639a1),xs=m.xs,ys=m.ys;
 while(xs.length<8)xs.push(xs[xs.length-1]+430+Math.round(r()*90));
 while(ys.length<7)ys.push(ys[ys.length-1]+430+Math.round(r()*90));
 const cols=xs.length,rows=ys.length;m.cols=cols;m.rows=rows;m.w=xs[cols-1]+240;m.h=ys[rows-1]+1060;m.hy=ys[rows-1]+820;m.nodes=[];
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)m.nodes.push({x:xs[i],y:ys[j],i,j,id:j*cols+i});
 for(const bay of m.bays)bay.node=bay.row*cols+bay.col;
 for(let j=0;j<rows-1;j++)for(let i=0;i<cols-1;i++){
  if(i<5&&j<4)continue;const x=xs[i]+108,y=ys[j]+222,w=xs[i+1]-xs[i]-216,h=ys[j+1]-ys[j]-330;
  if(r()<.24){m.parks.push({x,y,w,h});continue;}const nc=r()<.65?2:1,gap=20;
  for(let k=0;k<nc;k++)for(let l=0;l<2;l++)m.buildings.push({x:x+k*(w+gap)/nc,y:y+l*(h+gap)/2,w:(w-gap*(nc-1))/nc,h:(h-gap)/2,color:Math.floor(r()*5),roof:Math.floor(r()*3)});
 }
 const extraPlaces=['Yonge Street Market','Church Street Arcade','Harbour Library','Lake Shore Gardens','Old Town Bakery','Waterfront Gallery','East Harbour Café'];
 for(let j=0;j<rows;j++)for(let i=0;i<cols-1;i++){
  if(i<5&&j<5)continue;const x=(xs[i]+xs[i+1])/2,y=ys[j],rev=(i+j)%3===2;
  const bay={id:m.bays.length,x,y:y+(rev?148:111),a:rev?-PI/2:0,type:rev?'reverse':'parallel',street:STREETS[j],place:extraPlaces[(i+j)%extraPlaces.length],node:j*cols+i,col:i,row:j,roadY:y};m.bays.push(bay);
  if(!rev)for(const offset of [-78,78])m.parked.push({x:x+offset,y:y+111,a:0,parked:true,color:'#647477'});
  else for(const offset of [-43,43])m.parked.push({x:x+offset,y:y+148,a:-PI/2,parked:true,color:'#667d84'});
 }
 m.ramps=[];for(const i of [0,cols-1]){const x=xs[i],sg=i===0?1:-1;m.ramps.push([{x,y:ys[rows-1]},{x,y:m.hy-180},{x:x+sg*95,y:m.hy-90},{x:x+sg*210,y:m.hy+26}]);}
 const loop=[];for(let i=1;i<=6;i++)loop.push(2*cols+i);for(let j=3;j<=5;j++)loop.push(j*cols+6);for(let i=5;i>=1;i--)loop.push(5*cols+i);for(let j=4;j>=3;j--)loop.push(j*cols+1);
 const edges=loop.map((from,i)=>({from,to:loop[(i+1)%loop.length]}));
 const stopSpecs=[{from:2*cols+1,to:2*cols+2,name:'Rogers Centre'},{from:2*cols+3,to:2*cols+4,name:'King & Simcoe'},{from:2*cols+5,to:2*cols+6,name:'King & Yonge'},{from:2*cols+6,to:3*cols+6,name:'Union East'},{from:4*cols+6,to:5*cols+6,name:'Yonge Harbour'},{from:5*cols+6,to:5*cols+5,name:'Lake Shore Market'},{from:5*cols+4,to:5*cols+3,name:'Harbourfront'},{from:5*cols+2,to:5*cols+1,name:'Music Garden'},{from:5*cols+1,to:4*cols+1,name:'Spadina Quay'},{from:3*cols+1,to:2*cols+1,name:'Spadina & Front'}];
 m.busStops=stopSpecs.map((spec,i)=>{const a=m.nodes[spec.from],b=m.nodes[spec.to],angle=Math.atan2(b.y-a.y,b.x-a.x),L=dist(a,b),x=(a.x+b.x)/2-Math.sin(angle)*65,y=(a.y+b.y)/2+Math.cos(angle)*65;return{id:'bus-'+i,index:i,x,y,a:angle,type:'bus',place:spec.name,street:a.j===b.j?STREETS[a.j]:AVENUES[a.i],row:a.j,col:a.i,node:a.id,edgeFrom:a.id,edgeTo:b.id,routeId:'509',routeEdge:edges.findIndex(e=>e.from===a.id&&e.to===b.id),length:132,width:32,waiting:3+(i*7+(seed>>>0))%9};});
 m.busRoutes=[{id:'509',name:'509 Harbour Loop',stops:m.busStops,edges,nodes:loop}];if(Roads&&Roads.configure)Roads.configure(m);return m;
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
function isRoad(map,x,y){if(Roads&&Roads.isRoad)return Roads.isRoad(map,x,y);if(map.xs.some(v=>Math.abs(x-v)<ROAD_HALF)&&y>120&&y<map.ys[map.ys.length-1]+ROAD_HALF)return true;if(map.ys.some(v=>Math.abs(y-v)<ROAD_HALF)&&x>120&&x<map.xs[map.xs.length-1]+100)return true;if(Math.abs(y-map.hy)<76&&x>(map.highwayStart||90)&&x<(map.highwayEnd||map.w-90))return true;for(const ramp of map.ramps)for(let i=1;i<ramp.length;i++)if(segmentDistance(x,y,ramp[i-1],ramp[i])<37)return true;for(const b of map.bays)if(Math.abs(x-b.x)<126&&y>b.roadY&&y<b.roadY+180)return true;return false;}
function signal(map,node,time){const n=typeof node==='number'?map.nodes[node]:node;const phase=(time+(n.i+n.j)*1.1)%15;return {horizontal:phase<6.3?'green':phase<7.4?'amber':'red',vertical:phase>=8&&phase<13.8?'green':phase>=13.8&&phase<14.7?'amber':'red'};}
function nearestNode(map,p){let best=0,bd=Infinity;for(const n of map.nodes){const d=dist(n,p);if(d<bd){bd=d;best=n.id;}}return best;}
// Directed-edge navigation starts at the current lane projection, never the nearest junction behind the cab.
function hasSurfaceNavigation(map,car){return car.roadLayer!=='highway'&&!(car.roadLayer==='ramp'&&((car.height||0)>2||(car.roadSample&&car.roadSample.distanceAlong>(map.roadHalf||82)+20)));}
function hasNavigation(map,car){return hasSurfaceNavigation(map,car)||!!(Roads&&map.roadProfiles&&map.roadProfiles.some(p=>p.kind==='exit'));}
function roadRoute(map,from,to){
 if(!Roads||!map.roadProfiles)return[];const points=[],push=p=>{if(!points.length||dist(points[points.length-1],p)>.5)points.push(p);},sample=from.roadSample||Roads.sampleRoad(map,from.x,from.y),profile=sample.layer==='ramp'?map.roadProfiles[sample.rampIndex]:null;
 push({x:from.x,y:from.y,height:from.height||sample.height});
 function along(p,start,direction){const end=direction>0?p.total:0;for(let s=start;direction>0?s<end:s>end;s+=direction*20){const q=Roads.pointAt(p,s);push({x:q.x+(p.kind==='exit'?18*(1-Roads.smooth(s/250)):0),y:q.z,height:q.height,roadLayer:'ramp',rampIndex:p.index});}const q=Roads.pointAt(p,end);push({x:q.x+(p.kind==='exit'&&end===0?18:0),y:q.z,height:q.height,roadLayer:'ramp',rampIndex:p.index});}
 function leave(p,start){along(p,start,-1);const exit={x:p.x0+18,y:p.z0-135,a:-PI/2,height:0,roadLayer:'ground'};push(exit);for(const q of route(map,exit,to))push(q);}
 if(profile&&profile.kind==='exit'){leave(profile,Math.max(0,sample.distanceAlong-(sample.lateralDistance>5?110:12)));return points;}
 let highwayFrom=from,direction=from.y>=map.hy?1:-1;
 if(profile&&profile.kind==='entry'){direction=profile.highwayDir;if(sample.distanceAlong<profile.total-35){along(profile,Math.min(profile.total,sample.distanceAlong+(sample.lateralDistance>5?90:12)),1);highwayFrom={x:profile.highwayJoin.x,y:profile.highwayJoin.y,a:direction===1?0:PI,height:map.highwayHeight};}}
 const exit=map.roadProfiles.find(p=>p.kind==='exit'&&p.highwayDir===direction);if(!exit)return[];
 const ahead=(exit.highwayJoin.x-highwayFrom.x)*direction;
 if(ahead>160){push({x:highwayFrom.x+direction*Math.min(140,ahead*.5),y:map.hy+direction*53,height:map.highwayHeight});push({x:exit.highwayJoin.x,y:exit.highwayJoin.y,height:map.highwayHeight});leave(exit,exit.total);}
 else{const projection=Roads.project(exit,highwayFrom.x,highwayFrom.y),join=Math.max(0,projection.s-120),q=Roads.pointAt(exit,join);push({x:q.x,y:q.z,height:q.height,roadLayer:'ramp',rampIndex:exit.index});leave(exit,join);}
 return points;
}
function route(map,from,to){if(!hasSurfaceNavigation(map,from))return roadRoute(map,from,to);
 if(to.type==='bus'){const dx=from.x-to.x,dy=from.y-to.y,along=dx*Math.cos(to.a)+dy*Math.sin(to.a),across=-dx*Math.sin(to.a)+dy*Math.cos(to.a);if(along>=-130&&along<=22&&Math.abs(across)<28&&(!Number.isFinite(from.a)||Math.abs(angleDiff(from.a,to.a))<.60)){const stopAlong=Math.max(0,along);return[{x:from.x,y:from.y},{x:to.x+Math.cos(to.a)*stopAlong,y:to.y+Math.sin(to.a)*stopAlong}];}}

 const cols=map.xs.length,targetRow=to.row===undefined?map.ys.reduce((best,y,j)=>Math.abs(y-to.y)<Math.abs(map.ys[best]-to.y)?j:best,0):to.row,targetCol=to.col===undefined?clamp(map.xs.findIndex(x=>x>to.x)-1,0,cols-2):to.col,goalFrom=to.edgeFrom===undefined?targetRow*cols+targetCol:to.edgeFrom,goalTo=to.edgeTo===undefined?goalFrom+1:to.edgeTo,goalA=map.nodes[goalFrom],goalB=map.nodes[goalTo],goalAngle=Math.atan2(goalB.y-goalA.y,goalB.x-goalA.x),goalAccess=(to.x-goalA.x)*Math.cos(goalAngle)+(to.y-goalA.y)*Math.sin(goalAngle);
 if(to.roadY!==undefined&&from.y>to.roadY+82&&from.y<to.roadY+181&&Math.abs(from.x-to.x)<116)return[{x:from.x,y:from.y},{x:to.x,y:to.y}];
 let best=null;for(const a of map.nodes)for(const b of nodeNeighbors(map,a))for(let lane=0;lane<2;lane++){const angle=Math.atan2(b.y-a.y,b.x-a.x),L=dist(a,b),raw=(from.x-a.x)*Math.cos(angle)+(from.y-a.y)*Math.sin(angle),t=clamp(raw,0,L),p=lanePoint(a,b,t,lane),heading=Number.isFinite(from.a)?Math.abs(angleDiff(angle,from.a)):0,score=dist(from,p)+heading*8+(raw<0||raw>L?45:0);if(!best||score<best.score)best={a,b,lane,t,p,score};}
 const busRoute=to.routeId&&map.busRoutes.find(r=>r.id===to.routeId),onBusRoute=busRoute&&best.score<150&&busRoute.edges.some(e=>e.from===best.a.id&&e.to===best.b.id);
 const startKey=best.a.id+':'+best.b.id,initial={key:startKey,a:best.a.id,b:best.b.id,cost:0,prev:null},queue=[initial],seen=new Map([[startKey,initial]]);let found=null;
 // Reaching the destination edge after its access point requires a legal loop, not a reversed GPS line.
 const direct=startKey===goalFrom+':'+goalTo&&best.t<goalAccess-34;
 if(direct)found=initial;
 while(queue.length&&!found){queue.sort((a,b)=>a.cost-b.cost);const state=queue.shift(),a=map.nodes[state.a],b=map.nodes[state.b];for(const next of nodeNeighbors(map,b)){if(next.id===a.id)continue;if(onBusRoute&&!busRoute.edges.some(e=>e.from===b.id&&e.to===next.id))continue;const key=b.id+':'+next.id,cost=state.cost+dist(b,next)+(turnKind(a,b,next)?30:0),record={key,a:b.id,b:next.id,cost,prev:state};if(key===goalFrom+':'+goalTo){found=record;break;}if(!seen.has(key)||seen.get(key).cost>cost){seen.set(key,record);queue.push(record);}}}
 if(!found)return[best.p,{x:to.x,y:to.y}];
 const edges=[];for(let n=found;n;n=n.prev)edges.unshift(n);const lanes=edges.map((e,i)=>i===edges.length-1?1:turnKind(map.nodes[e.a],map.nodes[e.b],map.nodes[edges[i+1].b])<0?0:1),points=[];const push=p=>{if(!points.length||dist(points[points.length-1],p)>.5)points.push(p);};
 // Off-road projection is deliberately not connected through a building; navigation resumes on the closest street.
 if(isRoad(map,from.x,from.y)&&dist(from,best.p)<110)push({x:from.x,y:from.y});push(best.p);
 for(let i=0;i<edges.length;i++){const edge=edges[i],a=map.nodes[edge.a],b=map.nodes[edge.b],L=dist(a,b),begin=i===0?best.t:JUNCTION_EXIT,lane=lanes[i];if(i===edges.length-1){const access=goalAccess,t1=Math.max(begin,access-(to.type==='bus'?100:65));push(lanePoint(a,b,t1,lane));if(to.type==='bus')push({x:to.x-Math.cos(to.a)*48,y:to.y-Math.sin(to.a)*48});else push({x:to.x-26,y:to.roadY===undefined?to.y:to.roadY+76});push({x:to.x,y:to.y});break;}
  const entry=Math.max(begin,L-JUNCTION_ENTRY);if(i===0&&best.lane!==lane&&begin<entry-35)push(lanePoint(a,b,Math.min(entry,begin+100),lane));push(lanePoint(a,b,entry,lane));const next=map.nodes[edges[i+1].b],curve=curvePoints(a,b,next,lane,lanes[i+1],18,to.type==='bus'&&turnKind(a,b,next)>0?34.25:undefined);let start=0;if(i===0&&begin>L-JUNCTION_ENTRY){let closest=Infinity;curve.forEach((p,k)=>{const d=dist(best.p,p);if(d<closest){closest=d;start=k;}});}for(let k=start;k<curve.length;k++)push(curve[k]);
 }
 return points;
}
function rushHour(time,startMinutes=START_MINUTES){const minute=(startMinutes+time/2.5)%1440;const peak=(center,width)=>Math.max(0,1-Math.abs(minute-center)/width);return Math.max(peak(8*60+30,105),peak(12*60+30,70)*.45,peak(18*60,110));}
const TRAFFIC_PRESETS={light:{initial:16,min:16,max:16},normal:{initial:48,min:48,max:48},rush:{initial:60,min:60,max:60},gridlock:{initial:64,min:64,max:64}};
function trafficLimit(time,difficulty,preset='normal',startMinutes=START_MINUTES){const p=TRAFFIC_PRESETS[preset]||TRAFFIC_PRESETS.normal;return Math.min(p.max,p.min+Math.floor(Math.max(0,difficulty-1)*.8)+Math.round(rushHour(time,startMinutes)*(p.max-p.min)));}
function carHit(a,b){if(Math.abs((a.height||0)-(b.height||0))>10)return false;const al=(a.length||44)/2,aw=(a.width||22)/2,bl=(b.length||44)/2,bw=(b.width||22)/2,dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>al+aw+bl+bw||Math.abs(dy)>al+aw+bl+bw)return false;for(const q of [a.a,a.a+PI/2,b.a,b.a+PI/2]){const d=Math.abs(dx*Math.cos(q)+dy*Math.sin(q)),ra=al*Math.abs(Math.cos(a.a-q))+aw*Math.abs(Math.sin(a.a-q)),rb=bl*Math.abs(Math.cos(b.a-q))+bw*Math.abs(Math.sin(b.a-q));if(d>=ra+rb)return false;}return true;}
function buildingHit(car,b){return carHit(car,{x:b.x+b.w/2,y:b.y+b.h/2,a:0,length:b.w,width:b.h,height:b.height||0});}
const VEHICLES={taxi:{length:44,width:22,acceleration:100,braking:225,reverseAcceleration:80,maxStreet:67,maxHighway:125,reverseSpeed:52,turnBase:32,turnSpeed:.40},bus:{length:82,width:25,acceleration:57,braking:145,reverseAcceleration:42,maxStreet:61,maxHighway:95,reverseSpeed:26,turnBase:60,turnSpeed:.22}};
class Game{
 constructor(seed=8427,options={}){this.seed=seed;this.options={...options};this.vehicleType=options.vehicle==='bus'?'bus':'taxi';this.vehicle=VEHICLES[this.vehicleType];this.startMinutes=Number.isFinite(options.startMinutes)?((options.startMinutes%1440)+1440)%1440:START_MINUTES;this.trafficPreset=Object.hasOwn(TRAFFIC_PRESETS,options.traffic)?options.traffic:'normal';this.map=makeMap(seed);this.rand=rng(seed^9384);this.reset();}
 reset(){this.time=0;this.completed=0;this.cash=0;this.health=100;this.reputation=3;this.combo=0;this.penalties=0;this.mode='title';this.events=[];this.traffic=[];this.trafficId=0;this.junctions={};this.collisionCooldown=0;this.signalCooldown={};this.redStopState={};this.pendingRightTurns=[];this.parkHold=0;this.reverseMeters=0;this.lastTarget=-1;this.lastDrive='forward';this.difficulty=1;this.stats={collisions:0,redLights:0,rightOnRed:0,pickups:0,deliveries:0,missed:0};const b=this.vehicleType==='bus'?this.map.busStops[0]:this.map.bays[11];this.car={x:b.x-180,y:this.vehicleType==='bus'?b.y-9:b.roadY+56,a:0,speed:0,steer:0,kind:this.vehicleType,length:this.vehicle.length,width:this.vehicle.width};if(this.vehicleType==='bus'){const from=this.map.nodes[b.edgeFrom],to=this.map.nodes[b.edgeTo],along=(b.x-from.x)*Math.cos(b.a)+(b.y-from.y)*Math.sin(b.a),spawn=lanePoint(from,to,Math.max(134,along-100),1);this.car.x=spawn.x;this.car.y=spawn.y;this.car.a=b.a;this.resetBus();}else{this.bus=null;this.newJob(true);}this.sampleCarRoad();for(let attempts=0;this.traffic.length<TRAFFIC_PRESETS[this.trafficPreset].initial&&attempts<1500;attempts++)this.spawnTraffic();}
 sampleCarRoad(){const c=this.car;if(Roads&&Roads.sampleRoad){const sample=Roads.sampleRoad(this.map,c.x,c.y,c.roadSample);c.roadSample=sample;c.height=sample.height;c.roadLayer=sample.layer;c.roadPitch=Math.atan(sample.gradient.x*Math.cos(c.a)+sample.gradient.z*Math.sin(c.a));}else{c.height=0;c.roadPitch=0;c.roadLayer='ground';}}
 start(){this.mode='playing';if(this.vehicleType==='bus')this.note('ROUTE 509 IN SERVICE','Pull forward into the marked curb stop. Hold still while passengers board.','good');else this.note('DISPATCH ONLINE','First fare is just ahead. Pull into the glowing bay.','good');}
 setVehicle(vehicle){this.vehicleType=vehicle==='bus'?'bus':'taxi';this.vehicle=VEHICLES[this.vehicleType];this.reset();}
 note(title,text,tone='info'){this.events.unshift({title,text,tone,time:this.time});this.events=this.events.slice(0,5);}
 target(){return this.vehicleType==='bus'?this.bus.stops[this.bus.stopIndex]:this.job.stage==='pickup'?this.job.pickup:this.job.dropoff;}
 resetBus(){const route=this.map.busRoutes[0];this.bus={routeId:route.id,routeName:route.name,stops:route.stops,stopIndex:0,passengers:0,capacity:36,completedStops:0,laps:0,boarded:0,alighted:0,approachMeters:0,doorsOpen:false};this.newBusStop(true);}
 newBusStop(first=false){const b=this.target(),seconds=first?170:Math.max(160,dist(this.car,b)/28+100);this.job={stage:'bus',pickup:b,dropoff:b,person:'Route '+this.bus.routeId,fare:0,timeLeft:seconds,total:seconds};this.parkHold=0;this.bus.approachMeters=0;this.bus.doorsOpen=false;this.lastTarget=b.id;}
 completeBusStop(){const b=this.bus,stop=this.target(),alighted=Math.min(b.passengers,b.completedStops===0?0:2+Math.floor(this.rand()*7)),waiting=stop.waiting+Math.floor(this.rand()*4),boarded=Math.min(waiting,b.capacity-b.passengers+alighted);b.passengers+=boarded-alighted;b.boarded+=boarded;b.alighted+=alighted;b.completedStops++;this.completed=b.completedStops;this.stats.pickups+=boarded;this.stats.deliveries+=alighted;this.cash+=boarded*3;this.health=Math.min(100,this.health+3);b.stopIndex++;if(b.stopIndex>=b.stops.length){b.stopIndex=0;b.laps++;this.cash+=25;this.note('ROUTE LAP COMPLETE · +$25',b.completedStops+' stops served. Continue the Harbour Loop.','good');}else this.note('STOP SERVED · +$'+boarded*3,boarded+' boarded · '+alighted+' alighted · '+b.passengers+' on board.','good');this.newBusStop();}
 newJob(first=false){const m=this.map;let pick=first?m.bays[11]:m.bays[Math.floor(this.rand()*m.bays.length)];if(!first&&pick.id===this.lastTarget)pick=m.bays[(pick.id+7)%m.bays.length];let choices=m.bays.filter(b=>dist(b,pick)>600);let drop=first?m.bays[17]:choices[Math.floor(this.rand()*choices.length)];this.job={stage:'pickup',pickup:pick,dropoff:drop,person:PEOPLE[Math.floor(this.rand()*PEOPLE.length)],fare:Math.round(28+dist(pick,drop)*.045),timeLeft:first?105:Math.max(55,dist(this.car,pick)/45+45-this.difficulty*1.2),total:0};this.job.total=this.job.timeLeft;this.parkHold=0;this.reverseMeters=0;this.lastTarget=pick.id;}
 spawnTraffic(){const m=this.map,r=this.rand;if(this.traffic.length>=64)return;if(this.trafficId%5===4){const dir=r()<.5?1:-1,lane=r()<.5?0:1,highwayStart=(m.highwayStart||90)+20,highwayEnd=(m.highwayEnd||m.w-90)-20,x=highwayStart+r()*(highwayEnd-highwayStart),y=m.hy+dir*(lane?53:26);if(dist({x,y},this.car)<110||this.traffic.some(o=>Math.abs(o.x-x)<75&&Math.abs(o.y-y)<23))return;this.traffic.push({id:this.trafficId++,kind:'highway',height:m.highwayHeight||0,x,y,a:dir===1?0:PI,speed:85+r()*35,desired:100+r()*40,dir,lane,color:['#bd7766','#8dbbb5','#b9a7c1','#d4bd81'][Math.floor(r()*4)],merge:null});return;}
 const n=m.nodes[Math.floor(r()*m.nodes.length)],ne=this.neighbors(n),to=ne[Math.floor(r()*ne.length)],L=dist(n,to),u=135+r()*(L-270),a=Math.atan2(to.y-n.y,to.x-n.x),c={id:this.trafficId,kind:'street',height:0,from:n.id,to:to.id,t:u,lane:r()<.5?0:1,a,speed:35+r()*20,desired:50+r()*17,color:['#b98474','#7899b3','#bdc6bd','#a799b6','#639890'][Math.floor(r()*5)],stopped:false};this.planTraffic(c);c.lane=c.requiredLane;c.laneOffset=LANES[c.lane];Object.assign(c,lanePoint(n,to,u,c.lane));if(dist(c,this.car)<170||this.traffic.some(o=>dist(c,o)<70))return;this.trafficId++;this.traffic.push(c);}
 neighbors(n){return nodeNeighbors(this.map,n);}
 planTraffic(c){const m=this.map,a=m.nodes[c.from],n=m.nodes[c.to],options=this.neighbors(n).filter(b=>b.id!==a.id),compatible=options.filter(b=>{const turn=turnKind(a,n,b);return !turn||(turn<0?0:1)===c.lane;}),pool=compatible.length?compatible:options,straight=pool.find(b=>turnKind(a,n,b)===0),next=straight&&this.rand()<.56?straight:pool[Math.floor(this.rand()*pool.length)];c.next=next.id;c.turnSign=turnKind(a,n,next);c.requiredLane=c.turnSign===0?c.lane:c.turnSign<0?0:1;}
 updateTraffic(dt){const m=this.map,rush=rushHour(this.time,this.startMinutes);for(const id in this.junctions)if(!this.traffic.some(c=>c.id===this.junctions[id]&&c.reserved===+id))delete this.junctions[id];
  for(const c of this.traffic){c.height=c.kind==='highway'?(m.highwayHeight||0):0;if(c.kind==='highway'){
   if(!c.merge&&this.rand()<dt*.035){const lane=1-c.lane,targetY=m.hy+c.dir*(lane?53:26);if(!this.traffic.some(o=>o!==c&&o.kind==='highway'&&Math.abs(o.x-c.x)<120+rush*70&&Math.abs(o.y-targetY)<23)&&!(Math.abs(this.car.x-c.x)<130+(this.car.length||44)/2&&Math.abs(this.car.y-targetY)<45&&Math.abs((this.car.height||0)-(m.highwayHeight||0))<10)){c.lane=lane;c.merge=targetY;}}
   const want=m.hy+c.dir*(c.lane?53:26);c.y+=(want-c.y)*Math.min(1,dt*1.2);if(Math.abs(c.y-want)<1)c.merge=null;let desired=c.desired*(1+Math.min(.28,this.difficulty*.015))*(1-rush*.33);for(const o of [...this.traffic,this.car]){const ahead=(o.x-c.x)*c.dir;if(o!==c&&Math.abs(o.y-c.y)<24&&ahead>0&&ahead<130)desired=Math.min(desired,Math.max(0,(ahead-(22+(o.length||44)/2+9))*1.25));}c.speed+=clamp(desired-c.speed,-110*dt,45*dt);const nx=c.x+c.dir*c.speed*dt,wrapX=c.dir===1?(m.highwayStart||90)+5:(m.highwayEnd||m.w-90)-5;if(nx>(m.highwayEnd||m.w-90)||nx<(m.highwayStart||90)){if(!this.traffic.some(o=>o!==c&&Math.abs(o.x-wrapX)<90&&Math.abs(o.y-c.y)<24)&&Math.hypot(this.car.x-wrapX,this.car.y-c.y)>90)c.x=wrapX;else c.speed=0;}else c.x=nx;continue;}
   if(c.lane===undefined)c.lane=0;if(c.laneOffset===undefined)c.laneOffset=LANES[c.lane];if(c.next===undefined)this.planTraffic(c);
   let target=Math.min(67,c.desired*(1+Math.min(.3,this.difficulty*.015))*(1-rush*.2));
   if(c.turn){
    target=Math.min(target,c.turnSign===0?62:42);const look=22+(this.car.length||44)/2+28+c.speed*.7;for(const o of [this.car,...this.traffic]){if(o===c)continue;const rx=o.x-c.x,ry=o.y-c.y,along=rx*Math.cos(c.a)+ry*Math.sin(c.a),across=Math.abs(-rx*Math.sin(c.a)+ry*Math.cos(c.a));if(along>0&&along<look&&across<23)target=Math.min(target,Math.max(0,(along-(22+(o.length||44)/2+8))*1.4));}
    c.speed+=clamp(target-c.speed,-100*dt,40*dt);c.turn.t+=c.speed*dt;const pos=samplePath(c.turn.path,c.turn.t);c.x=pos.x;c.y=pos.y;c.a=pos.a;if(c.turn.t>=c.turn.path.length){const oldTo=c.to;c.from=oldTo;c.to=c.next;c.t=JUNCTION_EXIT;c.turn=null;delete this.junctions[c.reserved];c.reserved=undefined;c.laneOffset=LANES[c.lane];this.planTraffic(c);}c.stopped=c.speed<3;continue;
   }
   const n=m.nodes[c.from],to=m.nodes[c.to],L=dist(n,to),a=Math.atan2(to.y-n.y,to.x-n.x),left=L-c.t,stop=L-JUNCTION_ENTRY,s=signal(m,to,this.time),green=(Math.abs(to.x-n.x)>1?s.horizontal:s.vertical)==='green';
   if(c.requiredLane!==c.lane&&left>160&&dist(this.car,lanePoint(n,to,c.t,c.requiredLane))>100&&!this.traffic.some(o=>o!==c&&o.kind==='street'&&o.from===c.from&&o.to===c.to&&o.lane===c.requiredLane&&Math.abs(o.t-c.t)<90)){c.lane=c.requiredLane;}
   if(c.requiredLane!==c.lane)target=Math.min(target,Math.max(0,(left-185)*.8));c.laneOffset+=(LANES[c.lane]-c.laneOffset)*Math.min(1,dt*1.8);
   const next=m.nodes[c.next],exitClear=!this.traffic.some(o=>o!==c&&o.kind==='street'&&o.from===c.to&&o.to===c.next&&o.lane===c.lane&&o.t<190),owner=this.junctions[c.to];
   // Hold before the stop line until green, the outbound lane is free, and this junction is reserved.
   if(left<190&&c.reserved===undefined&&green&&exitClear&&(owner===undefined||owner===c.id)&&c.lane===c.requiredLane&&Math.abs(c.laneOffset-LANES[c.lane])<2&&!this.traffic.some(o=>o!==c&&o.kind==='street'&&!o.turn&&o.from===c.from&&o.to===c.to&&o.lane===c.lane&&o.t>c.t)){
    this.junctions[c.to]=c.id;c.reserved=c.to;
   }
   if(c.reserved===c.to&&!green){delete this.junctions[c.to];c.reserved=undefined;}
   if(c.reserved!==c.to)target=Math.min(target,Math.max(0,(stop-c.t)*1.25));else if(c.turnSign)target=Math.min(target,42);
   const look=22+(this.car.length||44)/2+30+c.speed*.8;for(const o of [this.car,...this.traffic]){if(o===c)continue;const rx=o.x-c.x,ry=o.y-c.y,along=rx*Math.cos(a)+ry*Math.sin(a),across=Math.abs(-rx*Math.sin(a)+ry*Math.cos(a));if(along>0&&along<look&&across<24)target=Math.min(target,Math.max(0,(along-(22+(o.length||44)/2+9))*1.35));}
   c.speed+=clamp(target-c.speed,-105*dt,42*dt);c.stopped=c.speed<3;let advance=c.speed*dt;if(c.reserved!==c.to&&c.t+advance>stop){advance=Math.max(0,stop-c.t);c.speed=0;}c.t+=advance;
   if(c.t>=stop&&c.reserved===c.to){c.t=stop;c.laneOffset=LANES[c.lane];c.turn={path:preparePath(curvePoints(n,to,next,c.lane,c.lane)),t:0};}
   const pos=lanePoint(n,to,c.t,c.lane),delta=c.laneOffset-LANES[c.lane];c.x=pos.x-Math.sin(a)*delta;c.y=pos.y+Math.cos(a)*delta;c.a=a;
   c.stalled=c.speed<2?(c.stalled||0)+dt:0;
   // A blocked cab can hold a lane; off-screen recovery prevents a permanent traffic jam after a long obstruction.
   if(c.stalled>40&&dist(c,this.car)>900){const safeT=135,p=lanePoint(n,to,safeT,c.lane);if(!this.traffic.some(o=>o!==c&&dist(o,p)<95)){c.t=safeT;c.x=p.x;c.y=p.y;c.speed=20;c.stalled=0;if(c.reserved!==undefined){delete this.junctions[c.reserved];c.reserved=undefined;}}}
  }
 }
 update(dt,input={}){if(this.mode!=='playing')return;dt=Math.min(dt,.05);this.time+=dt;this.difficulty=1+this.completed*.62+this.time/160;this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);if(this.traffic.length<trafficLimit(this.time,this.difficulty,this.trafficPreset,this.startMinutes)&&this.rand()<dt*(1.5+rushHour(this.time,this.startMinutes)*2))this.spawnTraffic();this.updateTraffic(dt);if(this.traffic.length>trafficLimit(this.time,this.difficulty,this.trafficPreset,this.startMinutes)&&this.rand()<dt*.7){const k=this.traffic.findIndex(c=>dist(c,this.car)>800);if(k>=0)this.traffic.splice(k,1);}
  const c=this.car,m=this.map,ox=c.x,oy=c.y,oa=c.a,oldHeight=c.height||0,road=isRoad(m,c.x,c.y),v=this.vehicle,mergeLane=c.roadSample&&c.roadSample.layer==='ramp'&&m.roadProfiles&&c.roadSample.distanceAlong>=m.roadProfiles[c.roadSample.rampIndex].turnEnd,max=c.roadLayer==='highway'||mergeLane||(!Roads&&Math.abs(c.y-m.hy)<77)?v.maxHighway:v.maxStreet,accel=road?v.acceleration:v.acceleration*.5;
  if(input.up)c.speed+=accel*dt;else if(input.down)c.speed-=(c.speed>4?v.braking:v.reverseAcceleration)*dt;else c.speed*=Math.exp(-dt*(input.brake?8:1.4));
  if(input.brake)c.speed*=Math.exp(-dt*6);c.speed=clamp(c.speed,road?-v.reverseSpeed:-Math.min(30,v.reverseSpeed),road?max:35);
  // Keyboard steering ramps progressively; releasing a key centers the wheel quickly.
  const steer=(input.right?1:0)-(input.left?1:0),steerRate=steer?(Math.sign(c.steer)&&Math.sign(c.steer)!==steer?3.6:1.8):3.6;c.steer+=clamp(steer-c.steer,-steerRate*dt,steerRate*dt);if(Math.abs(c.speed)>1)c.a+=c.steer*c.speed/(v.turnBase+Math.abs(c.speed)*v.turnSpeed)*dt;c.a=angleDiff(c.a,0);c.x+=Math.cos(c.a)*c.speed*dt;c.y+=Math.sin(c.a)*c.speed*dt;
  const extentX=Math.abs(Math.cos(c.a))*c.length/2+Math.abs(Math.sin(c.a))*c.width/2,extentY=Math.abs(Math.sin(c.a))*c.length/2+Math.abs(Math.cos(c.a))*c.width/2;let blocked=c.x-extentX<43||c.y-extentY<63||c.x+extentX>m.w-43||c.y+extentY>m.h-43,hitKind='kerb';let candidateRoad=null;if(Roads&&Roads.sampleRoad){candidateRoad=Roads.sampleRoad(m,c.x,c.y,c.roadSample);if(Math.abs(candidateRoad.height-oldHeight)>2||(oldHeight>2&&!candidateRoad.onRoad)){blocked=true;hitKind='barrier';}if(!blocked&&candidateRoad.height>2){const cs=Math.cos(c.a),sn=Math.sin(c.a);for(const dx of [-c.length/2,c.length/2])for(const dy of [-c.width/2,c.width/2]){const corner=Roads.sampleRoad(m,c.x+cs*dx-sn*dy,c.y+sn*dx+cs*dy,candidateRoad);if(!corner.onRoad||Math.abs(corner.height-candidateRoad.height)>6){blocked=true;hitKind='barrier';}}}if(!blocked)c.height=candidateRoad.height;}if(!blocked&&m.highwayHeight&&c.height>m.highwayHeight-3&&buildingHit(c,{x:m.highwayStart,y:m.hy-2.75,w:m.highwayEnd-m.highwayStart,h:5.5,height:m.highwayHeight})){blocked=true;hitKind='median barrier';}for(const b of [...m.buildings,...m.landmarkColliders])if(buildingHit(c,b)){blocked=true;hitKind='building';break;}
  if(!blocked)for(const b of m.parked)if(carHit(c,b)){blocked=true;hitKind='parked car';break;}
  if(!blocked)for(const b of this.traffic)if(carHit(c,b)){blocked=true;hitKind='traffic';break;}
  if(blocked){c.x=ox;c.y=oy;c.a=oa;c.height=oldHeight;const severity=Math.max(3,Math.abs(c.speed)*.12);if(this.collisionCooldown<=0&&Math.abs(c.speed)>13){this.health=Math.max(0,this.health-severity);this.cash-=3;this.combo=0;this.stats.collisions++;this.note('EASY ON THE FENDERS',`${hitKind==='traffic'?'Traffic collision':'Watch that '+hitKind}. $3 repair charge.`,'bad');this.collisionCooldown=1.2;}c.speed*=-.25;}
  this.sampleCarRoad();this.checkSignals(ox,oy,dt);this.checkParking(dt);
  this.job.timeLeft-=dt;if(this.vehicleType==='bus'&&this.job.timeLeft<=0){this.reputation--;this.combo=0;this.stats.missed++;this.note('SERVICE DELAY','This stop is still waiting. Keep the route moving.','bad');this.job.timeLeft=150;this.job.total=150;}else if(this.job.timeLeft<=0){this.reputation--;this.combo=0;this.stats.missed++;this.note('FARE MISSED','Dispatch found another cab. Keep the next rider waiting less.','bad');this.newJob();}
  if(this.health<=0||this.reputation<=0){this.mode='gameover';this.note('SHIFT OVER',this.health<=0?'The cab needs a proper repair.':'Dispatch has ended your shift.','bad');}
 }
 // A red-right permission is earned at the line, then validated by the actual exit.
 // Straight crossings are never excused merely because the wheel was turned.
 rightTurnClear(n,approach){
  const turnExit=approach+PI/2,ux=Math.cos(turnExit),uy=Math.sin(turnExit);
  return !this.traffic.some(o=>{const dx=o.x-n.x,dy=o.y-n.y;if(Math.abs(dx)<117&&Math.abs(dy)<117)return true;const along=dx*ux+dy*uy,across=Math.abs(-dx*uy+dy*ux-56);if(along>65&&along<190&&across<32)return true;const heading=Math.abs(angleDiff(o.a,approach));if(heading>.55&&heading<PI-.55&&Math.hypot(dx,dy)<220){const toward=-(dx*Math.cos(o.a)+dy*Math.sin(o.a));return toward>0&&toward<Math.max(160,o.speed*3.0);}return false;});
 }
 redLightPenalty(n){if((this.signalCooldown[n.id]||0)>=this.time)return;this.signalCooldown[n.id]=this.time+4;this.cash-=12;this.job.timeLeft=Math.max(1,this.job.timeLeft-5);this.combo=0;this.stats.redLights++;this.note('RED LIGHT · $12','Stop on red. Right turns need a full stop and a clear junction.','bad');}
 checkSignals(ox,oy,dt=1/60){const c=this.car,m=this.map,vx=c.x-ox,vy=c.y-oy;
  for(const n of m.nodes){
   if(Math.abs(c.x-n.x)>185||Math.abs(c.y-n.y)>185)continue;
   for(const a of [0,PI/2,PI,-PI/2]){const ux=Math.cos(a),uy=Math.sin(a),before=-((c.x-n.x)*ux+(c.y-n.y)*uy),side=-(c.x-n.x)*uy+(c.y-n.y)*ux,key=n.id+':'+Math.round(a/(PI/2));
    if(before>93+(c.length||44)/2&&before<180&&side>37&&side<80&&Math.abs(angleDiff(c.a,a))<.30){let st=this.redStopState[key];if(!st)st=this.redStopState[key]={hold:0,qualifiedAt:-Infinity,lastSeen:this.time};if(this.time-st.lastSeen>dt*1.5)st.hold=0;st.lastSeen=this.time;if(Math.abs(c.speed)<1.5){st.hold+=dt;if(st.hold>=.5)st.qualifiedAt=this.time;}else st.hold=0;}
   }
   if(Math.abs(vx)+Math.abs(vy)<.00001||Math.abs(c.x-n.x)>130||Math.abs(c.y-n.y)>130)continue;
   let axis=null,cross=false,approach=0;if(Math.abs(vx)>Math.abs(vy)&&Math.abs(c.y-n.y)<81){axis='horizontal';approach=vx>0?0:PI;cross=vx>0?ox<n.x-93&&c.x>=n.x-93:ox>n.x+93&&c.x<=n.x+93;}else if(Math.abs(c.x-n.x)<81){axis='vertical';approach=vy>0?PI/2:-PI/2;cross=vy>0?oy<n.y-93&&c.y>=n.y-93:oy>n.y+93&&c.y<=n.y+93;}
   if(cross&&signal(m,n,this.time)[axis]==='red'&&(this.signalCooldown[n.id]||0)<this.time&&!this.pendingRightTurns.some(p=>p.nodeId===n.id)){
    const key=n.id+':'+Math.round(approach/(PI/2)),st=this.redStopState[key],side=-(c.x-n.x)*Math.sin(approach)+(c.y-n.y)*Math.cos(approach);
    if(st&&this.time-st.qualifiedAt<12&&side>37&&side<80&&this.rightTurnClear(n,approach)){this.pendingRightTurns.push({nodeId:n.id,approach,time:this.time});delete this.redStopState[key];}
    else this.redLightPenalty(n);
   }
  }
  this.pendingRightTurns=this.pendingRightTurns.filter(p=>{const n=m.nodes[p.nodeId],right=p.approach+PI/2,dx=c.x-n.x,dy=c.y-n.y,out=dx*Math.cos(right)+dy*Math.sin(right),side=-dx*Math.sin(right)+dy*Math.cos(right),straight=dx*Math.cos(p.approach)+dy*Math.sin(p.approach),heading=angleDiff(c.a,p.approach);
   if(out>100&&side>29&&side<83&&Math.abs(angleDiff(c.a,right))<.38){this.stats.rightOnRed=(this.stats.rightOnRed||0)+1;return false;}
   if(straight>10||heading<-.30||this.time-p.time>10||Math.hypot(dx,dy)>230){this.redLightPenalty(n);return false;}return true;});
 }
 parkingStatus(){if(this.vehicleType==='bus')return this.busParkingStatus();const c=this.car,b=this.target(),dx=c.x-b.x,dy=c.y-b.y,along=dx*Math.cos(b.a)+dy*Math.sin(b.a),across=-dx*Math.sin(b.a)+dy*Math.cos(b.a),aligned=Math.abs(angleDiff(c.a,b.a))<.23,inside=Math.abs(along)<(b.type==='parallel'?24:15)&&Math.abs(across)<12,stopped=Math.abs(c.speed)<5,reverse=b.type!=='reverse'||this.reverseMeters>10;return{near:dist(c,b)<150,inside,aligned,stopped,reverse,ready:inside&&aligned&&stopped&&reverse,progress:this.parkHold/1.25};}
 checkParking(dt){if(this.vehicleType==='bus'){this.checkBusStop(dt);return;}const c=this.car,b=this.target();if(dist(c,b)<78&&c.speed<-3&&Math.abs(angleDiff(c.a,b.a))<.65)this.reverseMeters+=-c.speed*dt;if(dist(c,b)<27&&Math.abs(c.speed)<11&&Math.abs(angleDiff(c.a,b.a))<.32)c.a+=angleDiff(b.a,c.a)*Math.min(1,dt*4);const p=this.parkingStatus();if(p.ready)this.parkHold+=dt;else this.parkHold=Math.max(0,this.parkHold-dt*2);if(this.parkHold<1.25)return;
  this.parkHold=0;this.reverseMeters=0;
  if(this.job.stage==='pickup'){this.stats.pickups++;this.job.stage='dropoff';this.job.timeLeft=Math.max(58,dist(this.job.pickup,this.job.dropoff)/32+48-this.difficulty*1.6);this.job.total=this.job.timeLeft;this.note('RIDER ON BOARD',`${this.job.person} is heading to ${this.job.dropoff.place}.`,'good');this.lastTarget=this.job.dropoff.id;}
  else{this.completed++;this.stats.deliveries++;this.combo++;const tip=Math.max(0,Math.round(this.job.timeLeft*.2))+Math.min(20,this.combo*3),earned=this.job.fare+tip;this.cash+=earned;this.health=Math.min(100,this.health+9);this.note(`FARE COMPLETE · +$${earned}`,`$${tip} tip. Cab serviced +9%. Next call is in.`,'good');this.newJob();}
 }
 busParkingStatus(){const c=this.car,b=this.target(),dx=c.x-b.x,dy=c.y-b.y,along=dx*Math.cos(b.a)+dy*Math.sin(b.a),across=-dx*Math.sin(b.a)+dy*Math.cos(b.a),aligned=Math.abs(angleDiff(c.a,b.a))<.18,inside=Math.abs(along)<22&&Math.abs(across)<9,stopped=Math.abs(c.speed)<2.5,forward=this.bus.approachMeters>=12;return{near:dist(c,b)<200,inside,aligned,stopped,forward,reverse:forward,ready:inside&&aligned&&stopped&&forward,progress:this.parkHold/2.6};}
 checkBusStop(dt){const c=this.car,b=this.target(),d=dist(c,b),angle=Math.abs(angleDiff(c.a,b.a));if(d<160&&c.speed>2&&angle<.45)this.bus.approachMeters+=c.speed*dt;if(d<100&&c.speed<-2)this.bus.approachMeters=0;const p=this.busParkingStatus();this.bus.doorsOpen=p.ready;if(p.ready)this.parkHold+=dt;else this.parkHold=Math.max(0,this.parkHold-dt*2);if(this.parkHold>=2.6)this.completeBusStop();}
 recover(){if(this.mode!=='playing')return;const n=this.map.nodes[nearestNode(this.map,this.car)];this.car={x:n.x+(n.i===this.map.xs.length-1?-110:110),y:n.y+(n.i===this.map.xs.length-1?-56:56),a:n.i===this.map.xs.length-1?Math.PI:0,speed:0,steer:0,kind:this.vehicleType,length:this.vehicle.length,width:this.vehicle.width};for(const offset of [0,65,130,-65]){const candidate={...this.car,x:this.car.x+offset};if(isRoad(this.map,candidate.x,candidate.y)&&!this.traffic.some(o=>carHit(candidate,o))){this.car=candidate;break;}}this.reverseMeters=0;if(this.bus)this.bus.approachMeters=0;this.cash-=15;this.job.timeLeft=Math.max(2,this.job.timeLeft-10);this.health=Math.max(1,this.health-5);this.parkHold=0;this.sampleCarRoad();this.note('ROADSIDE ASSIST','$15 and 10 seconds. Back on the road.','bad');}
}
return {Game,makeMap,VEHICLES,isRoad,signal,route,hasSurfaceNavigation,hasNavigation,nearestNode,carHit,buildingHit,angleDiff,dist,clamp,rng,rushHour,trafficLimit,START_MINUTES,TRAFFIC_PRESETS,STREETS,AVENUES,ROAD_HALF,SIDEWALK_HALF,LANES};
});
