(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TaxiEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PI=Math.PI,TAU=PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const PEOPLE=['Jules','Morgan','Alex','Sam','Robin','Charlie','Kai','Taylor','Avery','Casey','Drew','Frankie'];
const PLACES=['Queen West Records','Graffiti Alley Café','Queen Street Books','Osgoode Market','City Hall Courtyard','Richmond Noodle House','Spadina Flower Shop','Entertainment District Cinema','Richmond Jazz Room','Financial District Hotel','King West Kitchen','Rogers Centre','CN Tower','Princess of Wales Theatre','King Street Gallery','Fort York Bakery','Harbourfront Studios',"Ripley’s Aquarium",'Union Station','St. Lawrence Kitchen','Music Garden','Toronto Waterfront Hotel','Roundhouse Café','Ferry Terminal','Sugar Beach Kiosk'];
const STREETS=['Queen Street West','Richmond Street West','King Street West','Front Street West','Queens Quay West'];
const AVENUES=['Bathurst Street','Spadina Avenue','Blue Jays Way','Simcoe Street','York Street','Bay Street'];
const START_MINUTES=16*60+15;
const ROAD_HALF=82,SIDEWALK_HALF=94,LANES=[20,56],JUNCTION_ENTRY=118,JUNCTION_EXIT=118;
function lanePoint(a,b,t,lane=1){const angle=Math.atan2(b.y-a.y,b.x-a.x),offset=LANES[lane];return{x:a.x+Math.cos(angle)*t-Math.sin(angle)*offset,y:a.y+Math.sin(angle)*t+Math.cos(angle)*offset};}
function nodeNeighbors(map,n){return [[n.i-1,n.j],[n.i+1,n.j],[n.i,n.j-1],[n.i,n.j+1]].filter(([i,j])=>i>=0&&i<6&&j>=0&&j<5).map(([i,j])=>map.nodes[j*6+i]);}
function turnKind(a,b,c){return Math.sign((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));}
function curvePoints(a,n,b,laneIn,laneOut,steps=14){const ai=Math.atan2(n.y-a.y,n.x-a.x),ao=Math.atan2(b.y-n.y,b.x-n.x),p0=lanePoint(a,n,dist(a,n)-JUNCTION_ENTRY,laneIn),p3=lanePoint(n,b,JUNCTION_EXIT,laneOut),bend=turnKind(a,n,b)===0?78:104,p1={x:p0.x+Math.cos(ai)*bend,y:p0.y+Math.sin(ai)*bend},p2={x:p3.x-Math.cos(ao)*bend,y:p3.y-Math.sin(ao)*bend},points=[];for(let i=0;i<=steps;i++){const t=i/steps,u=1-t;points.push({x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y});}return points;}
function preparePath(points){let length=0;const lengths=[0];for(let i=1;i<points.length;i++){length+=dist(points[i-1],points[i]);lengths.push(length);}return{points,lengths,length};}
function samplePath(path,t){let k=1;while(k<path.lengths.length-1&&path.lengths[k]<t)k++;const a=path.points[k-1],b=path.points[k],q=clamp((t-path.lengths[k-1])/(path.lengths[k]-path.lengths[k-1]||1),0,1);return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,a:Math.atan2(b.y-a.y,b.x-a.x)};}
function makeMap(seed=8427){
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
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
function isRoad(map,x,y){if(map.xs.some(v=>Math.abs(x-v)<ROAD_HALF)&&y>120&&y<map.ys[4]+ROAD_HALF)return true;if(map.ys.some(v=>Math.abs(y-v)<ROAD_HALF)&&x>120&&x<map.xs[5]+100)return true;if(Math.abs(y-map.hy)<76&&x>90&&x<map.w-90)return true;for(const ramp of map.ramps)for(let i=1;i<ramp.length;i++)if(segmentDistance(x,y,ramp[i-1],ramp[i])<37)return true;for(const b of map.bays)if(Math.abs(x-b.x)<126&&y>b.roadY&&y<b.roadY+180)return true;return false;}
function signal(map,node,time){const n=typeof node==='number'?map.nodes[node]:node;const phase=(time+(n.i+n.j)*1.1)%15;return {horizontal:phase<6.3?'green':phase<7.4?'amber':'red',vertical:phase>=8&&phase<13.8?'green':phase>=13.8&&phase<14.7?'amber':'red'};}
function nearestNode(map,p){let best=0,bd=Infinity;for(const n of map.nodes){const d=dist(n,p);if(d<bd){bd=d;best=n.id;}}return best;}
// Directed-edge navigation starts at the current lane projection, never the nearest junction behind the cab.
function route(map,from,to){
 const targetRow=to.row===undefined?map.ys.reduce((best,y,j)=>Math.abs(y-to.y)<Math.abs(map.ys[best]-to.y)?j:best,0):to.row,targetCol=to.col===undefined?clamp(map.xs.findIndex(x=>x>to.x)-1,0,4):to.col,goalFrom=targetRow*6+targetCol,goalTo=goalFrom+1;
 if(to.roadY!==undefined&&from.y>to.roadY+82&&from.y<to.roadY+181&&Math.abs(from.x-to.x)<116)return[{x:from.x,y:from.y},{x:to.x,y:to.y}];
 let best=null;for(const a of map.nodes)for(const b of nodeNeighbors(map,a))for(let lane=0;lane<2;lane++){const angle=Math.atan2(b.y-a.y,b.x-a.x),L=dist(a,b),raw=(from.x-a.x)*Math.cos(angle)+(from.y-a.y)*Math.sin(angle),t=clamp(raw,0,L),p=lanePoint(a,b,t,lane),heading=Number.isFinite(from.a)?Math.abs(angleDiff(angle,from.a)):0,score=dist(from,p)+heading*8+(raw<0||raw>L?45:0);if(!best||score<best.score)best={a,b,lane,t,p,score};}
 const startKey=best.a.id+':'+best.b.id,initial={key:startKey,a:best.a.id,b:best.b.id,cost:0,prev:null},queue=[initial],seen=new Map([[startKey,initial]]);let found=null;
 // Reaching the destination edge after its access point requires a legal loop, not a reversed GPS line.
 const direct=startKey===goalFrom+':'+goalTo&&best.t<to.x-map.nodes[goalFrom].x-34;
 if(direct)found=initial;
 while(queue.length&&!found){queue.sort((a,b)=>a.cost-b.cost);const state=queue.shift(),a=map.nodes[state.a],b=map.nodes[state.b];for(const next of nodeNeighbors(map,b)){if(next.id===a.id)continue;const key=b.id+':'+next.id,cost=state.cost+dist(b,next)+(turnKind(a,b,next)?30:0),record={key,a:b.id,b:next.id,cost,prev:state};if(key===goalFrom+':'+goalTo){found=record;break;}if(!seen.has(key)||seen.get(key).cost>cost){seen.set(key,record);queue.push(record);}}}
 if(!found)return[best.p,{x:to.x,y:to.y}];
 const edges=[];for(let n=found;n;n=n.prev)edges.unshift(n);const lanes=edges.map((e,i)=>i===edges.length-1?1:turnKind(map.nodes[e.a],map.nodes[e.b],map.nodes[edges[i+1].b])<0?0:1),points=[];const push=p=>{if(!points.length||dist(points[points.length-1],p)>.5)points.push(p);};
 // Off-road projection is deliberately not connected through a building; navigation resumes on the closest street.
 if(isRoad(map,from.x,from.y)&&dist(from,best.p)<110)push({x:from.x,y:from.y});push(best.p);
 for(let i=0;i<edges.length;i++){const edge=edges[i],a=map.nodes[edge.a],b=map.nodes[edge.b],L=dist(a,b),begin=i===0?best.t:JUNCTION_EXIT,lane=lanes[i];if(i===edges.length-1){const access=to.x-a.x;const t1=Math.max(begin,access-65);push(lanePoint(a,b,t1,lane));push({x:to.x-26,y:to.roadY===undefined?to.y:to.roadY+76});push({x:to.x,y:to.y});break;}
  const entry=Math.max(begin,L-JUNCTION_ENTRY);if(i===0&&best.lane!==lane&&begin<entry-35)push(lanePoint(a,b,Math.min(entry,begin+100),lane));push(lanePoint(a,b,entry,lane));const next=map.nodes[edges[i+1].b],curve=curvePoints(a,b,next,lane,lanes[i+1]);let start=0;if(i===0&&begin>L-JUNCTION_ENTRY){let closest=Infinity;curve.forEach((p,k)=>{const d=dist(best.p,p);if(d<closest){closest=d;start=k;}});}for(let k=start;k<curve.length;k++)push(curve[k]);
 }
 return points;
}
function rushHour(time){const minute=(START_MINUTES+time/2.5)%1440;const peak=(center,width)=>Math.max(0,1-Math.abs(minute-center)/width);return Math.max(peak(8*60+30,105),peak(12*60+30,70)*.45,peak(18*60,110));}
function trafficLimit(time,difficulty){return Math.min(64,20+Math.floor(difficulty*2)+Math.round(rushHour(time)*26));}
function carHit(a,b){const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>65||Math.abs(dy)>65)return false;const axes=[a.a,a.a+PI/2,b.a,b.a+PI/2];for(const q of axes){const ax=Math.cos(q),ay=Math.sin(q),d=Math.abs(dx*ax+dy*ay),ra=22*Math.abs(Math.cos(a.a-q))+11*Math.abs(Math.sin(a.a-q)),rb=22*Math.abs(Math.cos(b.a-q))+11*Math.abs(Math.sin(b.a-q));if(d>=ra+rb)return false;}return true;}
function buildingHit(car,b){const cs=Math.cos(car.a),sn=Math.sin(car.a);for(const dx of [-19,19])for(const dy of [-9,9]){const x=car.x+cs*dx-sn*dy,y=car.y+sn*dx+cs*dy;if(x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h)return true;}return false;}
class Game{
 constructor(seed=8427){this.seed=seed;this.map=makeMap(seed);this.rand=rng(seed^9384);this.reset();}
 reset(){this.time=0;this.completed=0;this.cash=0;this.health=100;this.reputation=3;this.combo=0;this.penalties=0;this.mode='title';this.events=[];this.traffic=[];this.trafficId=0;this.junctions={};this.collisionCooldown=0;this.signalCooldown={};this.parkHold=0;this.reverseMeters=0;this.lastTarget=-1;this.lastDrive='forward';this.difficulty=1;this.stats={collisions:0,redLights:0,pickups:0,deliveries:0,missed:0};const b=this.map.bays[11];this.car={x:b.x-180,y:b.roadY+56,a:0,speed:0,steer:0};this.newJob(true);while(this.traffic.length<20)this.spawnTraffic();}
 start(){this.mode='playing';this.note('DISPATCH ONLINE','First fare is just ahead. Pull into the glowing bay.','good');}
 note(title,text,tone='info'){this.events.unshift({title,text,tone,time:this.time});this.events=this.events.slice(0,5);}
 target(){return this.job.stage==='pickup'?this.job.pickup:this.job.dropoff;}
 newJob(first=false){const m=this.map;let pick=first?m.bays[11]:m.bays[Math.floor(this.rand()*m.bays.length)];if(!first&&pick.id===this.lastTarget)pick=m.bays[(pick.id+7)%m.bays.length];let choices=m.bays.filter(b=>dist(b,pick)>600);let drop=first?m.bays[17]:choices[Math.floor(this.rand()*choices.length)];this.job={stage:'pickup',pickup:pick,dropoff:drop,person:PEOPLE[Math.floor(this.rand()*PEOPLE.length)],fare:Math.round(28+dist(pick,drop)*.045),timeLeft:first?105:Math.max(55,dist(this.car,pick)/45+45-this.difficulty*1.2),total:0};this.job.total=this.job.timeLeft;this.parkHold=0;this.reverseMeters=0;this.lastTarget=pick.id;}
 spawnTraffic(){const m=this.map,r=this.rand;if(this.traffic.length>=64)return;if(this.trafficId%5===4){const dir=r()<.5?1:-1,lane=r()<.5?0:1,x=110+r()*(m.w-220),y=m.hy+dir*(lane?53:26);if(dist({x,y},this.car)<110||this.traffic.some(o=>Math.abs(o.x-x)<75&&Math.abs(o.y-y)<23))return;this.traffic.push({id:this.trafficId++,kind:'highway',x,y,a:dir===1?0:PI,speed:85+r()*35,desired:100+r()*40,dir,lane,color:['#bd7766','#8dbbb5','#b9a7c1','#d4bd81'][Math.floor(r()*4)],merge:null});return;}
 const n=m.nodes[Math.floor(r()*m.nodes.length)],ne=this.neighbors(n),to=ne[Math.floor(r()*ne.length)],L=dist(n,to),u=135+r()*(L-270),a=Math.atan2(to.y-n.y,to.x-n.x),c={id:this.trafficId,kind:'street',from:n.id,to:to.id,t:u,lane:r()<.5?0:1,a,speed:35+r()*20,desired:55+r()*22,color:['#b98474','#7899b3','#bdc6bd','#a799b6','#639890'][Math.floor(r()*5)],stopped:false};this.planTraffic(c);c.lane=c.requiredLane;c.laneOffset=LANES[c.lane];Object.assign(c,lanePoint(n,to,u,c.lane));if(dist(c,this.car)<170||this.traffic.some(o=>dist(c,o)<70))return;this.trafficId++;this.traffic.push(c);}
 neighbors(n){return nodeNeighbors(this.map,n);}
 planTraffic(c){const m=this.map,a=m.nodes[c.from],n=m.nodes[c.to],options=this.neighbors(n).filter(b=>b.id!==a.id),compatible=options.filter(b=>{const turn=turnKind(a,n,b);return !turn||(turn<0?0:1)===c.lane;}),pool=compatible.length?compatible:options,straight=pool.find(b=>turnKind(a,n,b)===0),next=straight&&this.rand()<.56?straight:pool[Math.floor(this.rand()*pool.length)];c.next=next.id;c.turnSign=turnKind(a,n,next);c.requiredLane=c.turnSign===0?c.lane:c.turnSign<0?0:1;}
 updateTraffic(dt){const m=this.map,rush=rushHour(this.time);for(const id in this.junctions)if(!this.traffic.some(c=>c.id===this.junctions[id]&&c.reserved===+id))delete this.junctions[id];
  for(const c of this.traffic){if(c.kind==='highway'){
   if(!c.merge&&this.rand()<dt*.035){const lane=1-c.lane,targetY=m.hy+c.dir*(lane?53:26);if(!this.traffic.some(o=>o!==c&&o.kind==='highway'&&Math.abs(o.x-c.x)<120+rush*70&&Math.abs(o.y-targetY)<23)){c.lane=lane;c.merge=targetY;}}
   const want=m.hy+c.dir*(c.lane?53:26);c.y+=(want-c.y)*Math.min(1,dt*1.2);if(Math.abs(c.y-want)<1)c.merge=null;let desired=c.desired*(1+Math.min(.28,this.difficulty*.015))*(1-rush*.33);for(const o of [...this.traffic,this.car]){const ahead=(o.x-c.x)*c.dir;if(o!==c&&Math.abs(o.y-c.y)<24&&ahead>0&&ahead<130)desired=Math.min(desired,Math.max(0,(ahead-51)*1.25));}c.speed+=clamp(desired-c.speed,-110*dt,45*dt);const nx=c.x+c.dir*c.speed*dt,wrapX=c.dir===1?95:m.w-95;if(nx>m.w-90||nx<90){if(!this.traffic.some(o=>o!==c&&Math.abs(o.x-wrapX)<90&&Math.abs(o.y-c.y)<24)&&Math.hypot(this.car.x-wrapX,this.car.y-c.y)>90)c.x=wrapX;else c.speed=0;}else c.x=nx;continue;}
   if(c.lane===undefined)c.lane=0;if(c.laneOffset===undefined)c.laneOffset=LANES[c.lane];if(c.next===undefined)this.planTraffic(c);
   let target=c.desired*(1+Math.min(.3,this.difficulty*.015))*(1-rush*.2);
   if(c.turn){
    target=Math.min(target,c.turnSign===0?62:42);const look=51+c.speed*.7;for(const o of [this.car,...this.traffic]){if(o===c)continue;const rx=o.x-c.x,ry=o.y-c.y,along=rx*Math.cos(c.a)+ry*Math.sin(c.a),across=Math.abs(-rx*Math.sin(c.a)+ry*Math.cos(c.a));if(along>0&&along<look&&across<23)target=Math.min(target,Math.max(0,(along-50)*1.4));}
    c.speed+=clamp(target-c.speed,-100*dt,40*dt);c.turn.t+=c.speed*dt;const pos=samplePath(c.turn.path,c.turn.t);c.x=pos.x;c.y=pos.y;c.a=pos.a;if(c.turn.t>=c.turn.path.length){const oldTo=c.to;c.from=oldTo;c.to=c.next;c.t=JUNCTION_EXIT;c.turn=null;delete this.junctions[c.reserved];c.reserved=undefined;c.laneOffset=LANES[c.lane];this.planTraffic(c);}c.stopped=c.speed<3;continue;
   }
   const n=m.nodes[c.from],to=m.nodes[c.to],L=dist(n,to),a=Math.atan2(to.y-n.y,to.x-n.x),left=L-c.t,stop=L-JUNCTION_ENTRY,s=signal(m,to,this.time),green=(Math.abs(to.x-n.x)>1?s.horizontal:s.vertical)==='green';
   if(c.requiredLane!==c.lane&&left>160&&!this.traffic.some(o=>o!==c&&o.kind==='street'&&o.from===c.from&&o.to===c.to&&o.lane===c.requiredLane&&Math.abs(o.t-c.t)<90)){c.lane=c.requiredLane;}
   c.laneOffset+=(LANES[c.lane]-c.laneOffset)*Math.min(1,dt*1.8);
   const next=m.nodes[c.next],exitClear=!this.traffic.some(o=>o!==c&&o.kind==='street'&&o.from===c.to&&o.to===c.next&&o.lane===c.lane&&o.t<190),owner=this.junctions[c.to];
   // Hold before the stop line until green, the outbound lane is free, and this junction is reserved.
   if(left<190&&c.reserved===undefined&&green&&exitClear&&(owner===undefined||owner===c.id)&&c.lane===c.requiredLane&&Math.abs(c.laneOffset-LANES[c.lane])<2&&!this.traffic.some(o=>o!==c&&o.kind==='street'&&!o.turn&&o.from===c.from&&o.to===c.to&&o.lane===c.lane&&o.t>c.t)){
    this.junctions[c.to]=c.id;c.reserved=c.to;
   }
   if(c.reserved===c.to&&!green){delete this.junctions[c.to];c.reserved=undefined;}
   if(c.reserved!==c.to)target=Math.min(target,Math.max(0,(stop-c.t)*1.25));else if(c.turnSign)target=Math.min(target,42);
   const look=55+c.speed*.8;for(const o of [this.car,...this.traffic]){if(o===c)continue;const rx=o.x-c.x,ry=o.y-c.y,along=rx*Math.cos(a)+ry*Math.sin(a),across=Math.abs(-rx*Math.sin(a)+ry*Math.cos(a));if(along>0&&along<look&&across<24)target=Math.min(target,Math.max(0,(along-51)*1.35));}
   c.speed+=clamp(target-c.speed,-105*dt,42*dt);c.stopped=c.speed<3;let advance=c.speed*dt;if(c.reserved!==c.to&&c.t+advance>stop){advance=Math.max(0,stop-c.t);c.speed=0;}c.t+=advance;
   if(c.t>=stop&&c.reserved===c.to){c.t=stop;c.laneOffset=LANES[c.lane];c.turn={path:preparePath(curvePoints(n,to,next,c.lane,c.lane)),t:0};}
   const pos=lanePoint(n,to,c.t,c.lane),delta=c.laneOffset-LANES[c.lane];c.x=pos.x-Math.sin(a)*delta;c.y=pos.y+Math.cos(a)*delta;c.a=a;
   c.stalled=c.speed<2?(c.stalled||0)+dt:0;
   // A blocked cab can hold a lane; off-screen recovery prevents a permanent traffic jam after a long obstruction.
   if(c.stalled>40&&dist(c,this.car)>900){const safeT=135,p=lanePoint(n,to,safeT,c.lane);if(!this.traffic.some(o=>o!==c&&dist(o,p)<95)){c.t=safeT;c.x=p.x;c.y=p.y;c.speed=20;c.stalled=0;if(c.reserved!==undefined){delete this.junctions[c.reserved];c.reserved=undefined;}}}
  }
 }
 update(dt,input={}){if(this.mode!=='playing')return;dt=Math.min(dt,.05);this.time+=dt;this.difficulty=1+this.completed*.62+this.time/160;this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);if(this.traffic.length<trafficLimit(this.time,this.difficulty)&&this.rand()<dt*(1.5+rushHour(this.time)*2))this.spawnTraffic();this.updateTraffic(dt);if(this.traffic.length>trafficLimit(this.time,this.difficulty)&&this.rand()<dt*.7){const k=this.traffic.findIndex(c=>dist(c,this.car)>800);if(k>=0)this.traffic.splice(k,1);}
  const c=this.car,m=this.map,ox=c.x,oy=c.y,oa=c.a,road=isRoad(m,c.x,c.y),max= Math.abs(c.y-m.hy)<77?195:125,accel=road?100:50;
  if(input.up)c.speed+=accel*dt;else if(input.down)c.speed-=(c.speed>4?225:80)*dt;else c.speed*=Math.exp(-dt*(input.brake?8:1.4));
  if(input.brake)c.speed*=Math.exp(-dt*6);c.speed=clamp(c.speed,road?-52:-30,road?max:50);
  const steer=(input.right?1:0)-(input.left?1:0);c.steer+=(steer-c.steer)*Math.min(1,dt*7);if(Math.abs(c.speed)>1)c.a+=c.steer*c.speed/(48+Math.abs(c.speed)*.4)*dt;c.a=angleDiff(c.a,0);c.x+=Math.cos(c.a)*c.speed*dt;c.y+=Math.sin(c.a)*c.speed*dt;
  let blocked=c.x<65||c.y<85||c.x>m.w-65||c.y>m.h-65,hitKind='kerb';for(const b of [...m.buildings,...m.landmarkColliders])if(buildingHit(c,b)){blocked=true;hitKind='building';break;}
  if(!blocked)for(const b of m.parked)if(carHit(c,b)){blocked=true;hitKind='parked car';break;}
  if(!blocked)for(const b of this.traffic)if(carHit(c,b)){blocked=true;hitKind='traffic';break;}
  if(blocked){c.x=ox;c.y=oy;c.a=oa;const severity=Math.max(3,Math.abs(c.speed)*.12);if(this.collisionCooldown<=0&&Math.abs(c.speed)>13){this.health=Math.max(0,this.health-severity);this.cash=Math.max(0,this.cash-3);this.combo=0;this.stats.collisions++;this.note('EASY ON THE FENDERS',`${hitKind==='traffic'?'Traffic collision':'Watch that '+hitKind}. $3 repair charge.`,'bad');this.collisionCooldown=1.2;}c.speed*=-.25;}
  this.checkSignals(ox,oy);this.checkParking(dt);
  this.job.timeLeft-=dt;if(this.job.timeLeft<=0){this.reputation--;this.combo=0;this.stats.missed++;this.note('FARE MISSED','Dispatch found another cab. Keep the next rider waiting less.','bad');this.newJob();}
  if(this.health<=0||this.reputation<=0){this.mode='gameover';this.note('SHIFT OVER',this.health<=0?'The cab needs a proper repair.':'Dispatch has ended your shift.','bad');}
 }
 checkSignals(ox,oy){const c=this.car,m=this.map;if(Math.abs(c.speed)<12)return;const vx=c.x-ox,vy=c.y-oy;
  for(const n of m.nodes){if(Math.abs(c.x-n.x)>130||Math.abs(c.y-n.y)>130)continue;let axis=null,cross=false;if(Math.abs(vx)>Math.abs(vy)&&Math.abs(c.y-n.y)<81){axis='horizontal';cross=vx>0?ox<n.x-93&&c.x>=n.x-93:ox>n.x+93&&c.x<=n.x+93;}else if(Math.abs(c.x-n.x)<81){axis='vertical';cross=vy>0?oy<n.y-93&&c.y>=n.y-93:oy>n.y+93&&c.y<=n.y+93;}
   if(cross&&signal(m,n,this.time)[axis]==='red'&&(this.signalCooldown[n.id]||0)<this.time){this.signalCooldown[n.id]=this.time+4;this.cash=Math.max(0,this.cash-12);this.job.timeLeft=Math.max(1,this.job.timeLeft-5);this.combo=0;this.stats.redLights++;this.note('RED LIGHT · $12','Cross on green. That cost 5 seconds, too.','bad');}
  }}
 parkingStatus(){const c=this.car,b=this.target(),dx=c.x-b.x,dy=c.y-b.y,along=dx*Math.cos(b.a)+dy*Math.sin(b.a),across=-dx*Math.sin(b.a)+dy*Math.cos(b.a),aligned=Math.abs(angleDiff(c.a,b.a))<.23,inside=Math.abs(along)<(b.type==='parallel'?24:15)&&Math.abs(across)<12,stopped=Math.abs(c.speed)<5,reverse=b.type!=='reverse'||this.reverseMeters>10;return{near:dist(c,b)<150,inside,aligned,stopped,reverse,ready:inside&&aligned&&stopped&&reverse,progress:this.parkHold/1.25};}
 checkParking(dt){const c=this.car,b=this.target();if(dist(c,b)<78&&c.speed<-3&&Math.abs(angleDiff(c.a,b.a))<.65)this.reverseMeters+=-c.speed*dt;if(dist(c,b)<27&&Math.abs(c.speed)<11&&Math.abs(angleDiff(c.a,b.a))<.32)c.a+=angleDiff(b.a,c.a)*Math.min(1,dt*4);const p=this.parkingStatus();if(p.ready)this.parkHold+=dt;else this.parkHold=Math.max(0,this.parkHold-dt*2);if(this.parkHold<1.25)return;
  this.parkHold=0;this.reverseMeters=0;
  if(this.job.stage==='pickup'){this.stats.pickups++;this.job.stage='dropoff';this.job.timeLeft=Math.max(58,dist(this.job.pickup,this.job.dropoff)/32+48-this.difficulty*1.6);this.job.total=this.job.timeLeft;this.note('RIDER ON BOARD',`${this.job.person} is heading to ${this.job.dropoff.place}.`,'good');this.lastTarget=this.job.dropoff.id;}
  else{this.completed++;this.stats.deliveries++;this.combo++;const tip=Math.max(0,Math.round(this.job.timeLeft*.2))+Math.min(20,this.combo*3),earned=this.job.fare+tip;this.cash+=earned;this.health=Math.min(100,this.health+9);this.note(`FARE COMPLETE · +$${earned}`,`$${tip} tip. Cab serviced +9%. Next call is in.`,'good');this.newJob();}
 }
 recover(){if(this.mode!=='playing')return;const n=this.map.nodes[nearestNode(this.map,this.car)];this.car={x:n.x+(n.i===5?-110:110),y:n.y+(n.i===5?-56:56),a:n.i===5?Math.PI:0,speed:0,steer:0};for(const offset of [0,65,130,-65]){const candidate={...this.car,x:this.car.x+offset};if(isRoad(this.map,candidate.x,candidate.y)&&!this.traffic.some(o=>carHit(candidate,o))){this.car=candidate;break;}}this.reverseMeters=0;this.cash=Math.max(0,this.cash-15);this.job.timeLeft=Math.max(2,this.job.timeLeft-10);this.health=Math.max(1,this.health-5);this.parkHold=0;this.note('ROADSIDE ASSIST','$15 and 10 seconds. Back on the road.','bad');}
}
return {Game,makeMap,isRoad,signal,route,nearestNode,carHit,buildingHit,angleDiff,dist,clamp,rng,rushHour,trafficLimit,START_MINUTES,STREETS,AVENUES,ROAD_HALF,SIDEWALK_HALF,LANES};
});
