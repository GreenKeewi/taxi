/* Deterministic public-state traffic scenarios. No browser or runtime patches. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine3d');
const DT=1/120,results=[];
function fresh(vehicle='taxi'){
 const g=new E.Game(8427,{traffic:'light',vehicle,dispatch:'local',startMinutes:960});
 g.start();g.traffic=[];g.junctions={};g.trafficId=100;g.job.timeLeft=10000;
 return g;
}
function node(g,i,j){const d=g.map.districts[1];return g.map.nodes[d.nodeOffset+j*d.xs.length+i];}
function phase(g,n,p){g.time=p-(n.i+n.j)*1.1;}
function vehicle(g,from,to,next,{lane=1,t,speed=0,id}={}){
 const a=Math.atan2(to.y-from.y,to.x-from.x),turnSign=Math.sign((to.x-from.x)*(next.y-to.y)-(to.y-from.y)*(next.x-to.x));
 const c={id:id??g.trafficId++,kind:'street',from:from.id,to:to.id,next:next.id,lane,requiredLane:turnSign?(turnSign<0?0:1):lane,laneOffset:E.LANES[lane],turnSign,t:t??E.dist(from,to)-138,a,speed,desired:E.kmhToSpeed(48),height:0,length:44,width:22,stopped:speed<3,color:'#7899b3'};
 c.x=from.x+Math.cos(a)*c.t-Math.sin(a)*c.laneOffset;c.y=from.y+Math.sin(a)*c.t+Math.cos(a)*c.laneOffset;
 g.traffic.push(c);return c;
}
function noOverlap(g,label){
 for(let i=0;i<g.traffic.length;i++)for(let j=i+1;j<g.traffic.length;j++)assert(!E.carHit(g.traffic[i],g.traffic[j]),`${label}: hull overlap ${g.traffic[i].id}/${g.traffic[j].id} at ${g.time.toFixed(3)}`);
 for(const c of g.traffic)assert(!E.carHit(c,g.car),`${label}: player overlap ${c.id}`);
}
function simulate(g,seconds,{frozen=false,check,overlap=true}={}){
 for(let i=0;i<Math.round(seconds/DT);i++){
  if(!frozen)g.time+=DT;
  g.updateTraffic(DT);if(overlap)noOverlap(g,'simulation');if(check)check(g,i);
 }
}
function run(name,fn){const begin=performance.now();try{results.push({name,ok:true,...fn(),elapsedMs:performance.now()-begin});console.log('PASS',name);}catch(error){results.push({name,ok:false,error:error.message,elapsedMs:performance.now()-begin});console.error('FAIL',name,error.message);}}

run('red platoon stops and drains',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2),stop=E.dist(a,b)-118;phase(g,b,10);
 const cars=[0,1,2,3].map(i=>vehicle(g,a,b,c,{t:stop-i*65}));
 simulate(g,12,{frozen:true});assert(cars.every(c=>c.from===a.id&&!c.turn&&c.t<=stop+.01&&c.speed<1),'red queue must stop');
 const stopped=cars.map(c=>({id:c.id,t:c.t}));simulate(g,32);assert(cars.every(c=>c.from!==a.id),'all platoon cars must cross on subsequent greens');
 return{cars:cars.length,stopped};
});

run('save and restore preserve queued vehicle identities and poses',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2),stop=E.dist(a,b)-118;phase(g,b,10);
 for(let i=0;i<4;i++)vehicle(g,a,b,c,{t:stop-i*65});simulate(g,12,{frozen:true});
 const saved=g.snapshot(),copy=new E.Game(saved.seed,saved.options).restore(saved);
 assert.deepEqual(copy.traffic.map(c=>c.id),g.traffic.map(c=>c.id));
 for(const car of g.traffic){const restored=copy.traffic.find(c=>c.id===car.id);for(const key of ['x','y','a','speed','from','to','next','t','lane','stopped'])assert.equal(restored[key],car[key],`save changed ${car.id}.${key}`);}
 simulate(copy,2,{frozen:true});assert(copy.traffic.every(c=>c.from===a.id&&!c.turn),'restored red queue left its approach');
 return{cars:g.traffic.length};
});

run('receiving lane spillback persists beyond 40 seconds and drains',()=>{
 const g=fresh(),a=node(g,0,2),b=node(g,1,2),c=node(g,2,2),d=node(g,3,2),stop=E.dist(a,b)-118,outStop=E.dist(b,c)-118;
 phase(g,b,5.9);assert.equal(E.signal(g.map,b,g.time).horizontal,'green');assert.notEqual(E.signal(g.map,c,g.time).horizontal,'green');
 const outgoing=Array.from({length:7},(_,i)=>vehicle(g,b,c,d,{t:outStop-i*56}));
 const incoming=[0,1,2].map(i=>vehicle(g,a,b,c,{t:stop-i*65})),ids=g.traffic.map(c=>c.id),initial=new Map(g.traffic.map(c=>[c.id,{from:c.from,to:c.to,t:c.t}]));
 assert(E.dist(incoming[0],g.car)>900,'queue fixture must exercise distant recovery threshold');
 simulate(g,46,{frozen:true,check(){for(const car of incoming){const p=initial.get(car.id);assert.equal(car.from,p.from,'upstream car entered blocked junction');assert(!car.turn,'upstream car entered blocked junction');assert(car.t>=p.t-.01,'queued car moved backwards/relocated');}}});
 assert.deepEqual(g.traffic.map(c=>c.id),ids,'queue population changed');
 const saved=g.snapshot(),restored=new E.Game(saved.seed,saved.options).restore(saved);
 for(const car of g.traffic){const copy=restored.traffic.find(c=>c.id===car.id);assert(copy);for(const key of ['x','y','a','speed','from','to','t','lane'])assert.equal(copy[key],car[key],`save changed ${car.id}.${key}`);}
 simulate(g,65);assert(incoming.every(c=>c.from!==a.id),'upstream queue failed to drain after downstream green');
 return{upstreamCars:incoming.length,receivingCars:outgoing.length,heldSeconds:46,saveRestore:'queued IDs and poses preserved'};
});

function opposing(g){const n=node(g,2,2),w=node(g,1,2),e=node(g,3,2);phase(g,n,0);return[vehicle(g,w,n,e,{lane:0,speed:40,id:110}),vehicle(g,w,n,e,{lane:1,speed:40,id:111}),vehicle(g,e,n,w,{lane:0,speed:40,id:112}),vehicle(g,e,n,w,{lane:1,speed:40,id:113})];}
run('parallel lanes and opposing straight movements share a green',()=>{
 const g=fresh(),cars=opposing(g);let maximumCrossing=0;
 simulate(g,6,{frozen:true,check(){maximumCrossing=Math.max(maximumCrossing,cars.filter(c=>c.turn).length);}});
 assert(maximumCrossing>=4,'four compatible lanes must cross concurrently');assert(cars.every(c=>c.from===node(g,2,2).id),'compatible cars failed to clear');
 return{maximumSimultaneousCrossings:maximumCrossing};
});

run('conflicting left turn and straight traffic clear without hull overlaps',()=>{
 const g=fresh(),n=node(g,2,2),w=node(g,1,2),e=node(g,3,2),s=node(g,2,3);phase(g,n,0);
 const cars=[vehicle(g,w,n,e,{lane:1,speed:40}),vehicle(g,e,n,s,{lane:0,speed:40})];
 simulate(g,35);assert(cars.every(c=>c.from!==w.id&&c.from!==e.id),'conflicting movements failed to clear');return{cars:cars.length};
});

for(const kind of ['taxi','bus'])run(kind+' blocks receiving lane, release restores flow',()=>{
 const g=fresh(kind),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2);phase(g,b,0);
 const blocked=vehicle(g,a,b,c,{t:E.dist(a,b)-138,speed:0}),offset=E.LANES[1];
 Object.assign(g.car,{x:b.x+150,y:b.y+offset,a:0,speed:0,height:0,roadLayer:'ground'});
 simulate(g,8,{frozen:true});assert.equal(blocked.from,a.id,'car entered a receiving lane occupied by player');assert(!blocked.turn,'car blocked the box behind player');
 g.car.y+=200;simulate(g,18);assert.notEqual(blocked.from,a.id,'car did not resume after player cleared');return{vehicle:kind,length:g.car.length};
});

run('transverse bus body blocks receiving lane before junction entry',()=>{
 const g=fresh('bus'),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2);phase(g,b,0);
 const blocked=vehicle(g,a,b,c,{t:E.dist(a,b)-138,speed:0});
 Object.assign(g.car,{x:b.x+150,y:b.y+E.LANES[1]+35,a:Math.PI/2,speed:0,height:0,roadLayer:'ground'});
 simulate(g,8,{frozen:true});assert.equal(blocked.from,a.id,'car entered receiving lane across transverse bus body');assert(!blocked.turn,'transverse bus caused car to block the box');
 g.car.y+=200;simulate(g,18);assert.notEqual(blocked.from,a.id,'car did not resume after transverse bus cleared');return{vehicle:'bus',angle:Math.PI/2};
});

run('removed receiving car leaves no stale lane or spatial occupancy',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2),d=node(g,4,2);phase(g,b,0);
 const blocked=vehicle(g,a,b,c,{speed:0}),obstacle=vehicle(g,b,c,d,{t:130,speed:0});obstacle.desired=0;
 simulate(g,8,{frozen:true});assert.equal(blocked.from,a.id);assert(!blocked.turn,'stationary receiving car should hold approach');
 g.traffic=g.traffic.filter(car=>car.id!==obstacle.id);simulate(g,8,{frozen:true});
 assert.notEqual(blocked.from,a.id,'removed car retained ghost occupancy in reusable traffic index');return{removedId:obstacle.id};
});

run('grade-separated player does not block street receiving lane',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2);phase(g,b,0);
 const car=vehicle(g,a,b,c,{speed:40});Object.assign(g.car,{x:b.x+150,y:b.y+E.LANES[1],a:0,speed:0,height:65,roadLayer:'highway'});
 simulate(g,6,{frozen:true});assert.equal(car.from,b.id,'deck-level player blocked ground traffic');return{playerHeight:65,trafficHeight:car.height};
});

run('traffic array reversal preserves deterministic crossing decisions',()=>{
 const a=fresh(),b=fresh();opposing(a);opposing(b);b.traffic.reverse();simulate(a,3,{frozen:true});simulate(b,3,{frozen:true});
 for(const car of a.traffic){const copy=b.traffic.find(c=>c.id===car.id);for(const key of ['x','y','a','speed','t'])assert(Math.abs(car[key]-copy[key])<1e-6,`array order changed ${car.id}.${key}`);assert.equal(car.from,copy.from);assert.equal(car.to,copy.to);}
 return{cars:a.traffic.length,tolerance:1e-6};
});

const report={seed:8427,dt:DT,environment:'Node deterministic engine fixtures; not a physical-device benchmark',passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results};
fs.writeFileSync(__dirname+'/evidence/traffic17-regression.json',JSON.stringify(report,null,2)+'\n');
if(report.failed)process.exitCode=1;
