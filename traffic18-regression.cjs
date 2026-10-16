/* Junction progress and reservation regressions through public Game state. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine3d');
const DT=1/120,results=[];
function fresh(kind='taxi'){
 const g=new E.Game(8427,{traffic:'light',vehicle:kind,dispatch:'local',startMinutes:960});
 g.start();g.traffic=[];g.junctions={};g.trafficId=100;g.job.timeLeft=10000;return g;
}
function node(g,i,j){const d=g.map.districts[1];return g.map.nodes[d.nodeOffset+j*d.xs.length+i];}
function green(g,n){g.time=-(n.i+n.j)*1.1;assert.equal(E.signal(g.map,n,g.time).horizontal,'green');}
function vehicle(g,from,to,next,{lane=1,left=145,speed=0,desired=48}={}){
 const a=Math.atan2(to.y-from.y,to.x-from.x),t=E.dist(from,to)-left,turnSign=Math.sign((to.x-from.x)*(next.y-to.y)-(to.y-from.y)*(next.x-to.x));
 const c={id:g.trafficId++,kind:'street',from:from.id,to:to.id,next:next.id,t,lane,laneOffset:E.LANES[lane],requiredLane:turnSign?(turnSign<0?0:1):lane,turnSign,a,speed,desired:E.kmhToSpeed(desired),height:0,length:44,width:22,color:'#7899b3',stopped:speed<3};
 Object.assign(c,{x:from.x+Math.cos(a)*t-Math.sin(a)*c.laneOffset,y:from.y+Math.sin(a)*t+Math.cos(a)*c.laneOffset});g.traffic.push(c);return c;
}
function noOverlap(g){
 for(let i=0;i<g.traffic.length;i++){
  assert(!E.carHit(g.traffic[i],g.car),`NPC ${g.traffic[i].id} overlaps player`);
  for(let j=i+1;j<g.traffic.length;j++)assert(!E.carHit(g.traffic[i],g.traffic[j]),`NPC overlap ${g.traffic[i].id}/${g.traffic[j].id}`);
 }
}
function simulate(g,seconds,{check,advanceClock=false}={}){
 for(let i=0;i<Math.round(seconds/DT);i++){
  const before=new Map(g.traffic.map(c=>[c.id,{x:c.x,y:c.y}]));if(advanceClock)g.time+=DT;g.updateTraffic(DT);noOverlap(g);
  for(const c of g.traffic){const old=before.get(c.id);if(old)assert(E.dist(old,c)<5,`NPC ${c.id} relocated during junction scenario`);}
  if(check)check(g,i);
 }
}
function run(name,fn){const start=performance.now();try{results.push({name,ok:true,...fn(),elapsedMs:performance.now()-start});console.log('PASS',name);}catch(error){results.push({name,ok:false,error:error.message,elapsedMs:performance.now()-start});console.error('FAIL',name,error.message);}}
function grant(g,c,n){simulate(g,DT);assert.equal(c.reserved,n.id,'fixture must obtain reservation before obstruction arrives');assert(!c.turn,'fixture must remain before crossing entry');}
function owners(g,n){const value=g.junctions[n.id];return value===undefined?[]:Array.isArray(value)?value:[value];}

for(const kind of ['taxi','bus'])run(kind+' adjacent blocker clears after wrong-lane car reaches 185-unit hold',()=>{
 const g=fresh(kind),a=node(g,1,2),b=node(g,2,2),s=node(g,2,3);green(g,b);
 const c=vehicle(g,a,b,s,{lane:0,left:185});assert.equal(c.requiredLane,1);
 Object.assign(g.car,{x:c.x,y:a.y+E.LANES[1],a:0,speed:0,height:0,roadLayer:'ground'});
 simulate(g,6);assert.equal(c.from,a.id);assert(!c.turn);assert.equal(c.lane,0,'blocked target lane must remain occupied during hold');
 g.car.y+=250;let crossed=false;simulate(g,20,{check(){crossed||=c.from!==a.id;}});
 assert(crossed,'late wrong-lane car never resumes after adjacent lane clears');return{player:kind,leftAtRelease:185};
});

for(const kind of ['taxi','bus'])run(kind+' arriving in receiving lane revokes unused admission',()=>{
 const g=fresh(kind),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2);green(g,b);
 const car=vehicle(g,a,b,c);grant(g,car,b);
 Object.assign(g.car,{x:b.x+150,y:b.y+E.LANES[1],a:0,speed:0,height:0,roadLayer:'ground'});
 simulate(g,8,{check(){assert.equal(car.from,a.id,'admitted car advanced into blocked exit');assert(!car.turn,'unused reservation allowed car to block junction');}});
 assert.equal(car.reserved,undefined,'blocked receiving lane retained unused reservation');
 g.car.y+=250;let crossed=false;simulate(g,20,{check(){crossed||=car.from!==a.id;}});assert(crossed,'car failed to readmit after receiving lane cleared');return{player:kind};
});

run('moving receiving car merges into lane after admission, then queue drains',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2),d=node(g,4,2);green(g,b);
 const incoming=vehicle(g,a,b,c),receiving=vehicle(g,b,c,d,{lane:0,left:E.dist(b,c)-135,speed:5,desired:3.6});
 grant(g,incoming,b);receiving.requiredLane=1;
 simulate(g,2,{check(){assert.equal(incoming.from,a.id);assert(!incoming.turn,'car entered after a moving receiver consumed its reserved slot');}});
 assert(receiving.laneOffset>30,'receiver must have physically entered target lane');
 let crossed=false;simulate(g,24,{check(){crossed||=incoming.from!==a.id;}});assert(crossed,'traffic failed to drain after moving receiving car opened storage');return{receiver:receiving.id};
});

for(const kind of ['taxi','bus'])run(kind+' holds admitted left-turn approach while conflicting straight flow resumes',()=>{
 const g=fresh(kind),a=node(g,1,2),b=node(g,2,2),e=node(g,3,2),n=node(g,2,1);green(g,b);
 const left=vehicle(g,a,b,n,{lane:0});grant(g,left,b);
 Object.assign(g.car,{x:b.x-80,y:b.y+E.LANES[0],a:0,speed:0,height:0,roadLayer:'ground'});
 const straight=vehicle(g,e,b,a,{lane:1,left:138});let crossed=false;
 simulate(g,12,{check(){crossed||=straight.from!==e.id;assert(!left.turn,'blocked owner entered crossing');}});
 assert(crossed,'blocked owner hoarded pre-entry reservation and starved conflicting traffic');return{player:kind,owner:left.id,challenger:straight.id};
});

run('existing owner with mismatched reservation does not retain junction ownership',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2);green(g,b);
 const car=vehicle(g,a,b,c,{left:240,desired:0});car.reserved=node(g,2,3).id;g.junctions[b.id]=[car.id];
 simulate(g,DT);assert(!owners(g,b).includes(car.id),'mismatched reservation retained old junction owner');return{owner:car.id};
});

for(const legacySave of [false,true])run((legacySave?'saved numeric':'live array')+' owner with changed destination releases stale junction',()=>{
 let g=fresh();const old=node(g,2,2),from=node(g,1,3),to=node(g,2,3),next=node(g,3,3);green(g,old);
 let car=vehicle(g,from,to,next,{left:240,desired:0});car.reserved=old.id;g.junctions[old.id]=legacySave?car.id:[car.id];
 if(legacySave){const saved=g.snapshot();g=new E.Game(saved.seed,saved.options).restore(saved);car=g.traffic.find(c=>c.id===car.id);}
 simulate(g,DT);assert(!owners(g,old).includes(car.id),'owner ID existed but changed destination kept stale junction reservation');assert.notEqual(car.reserved,old.id,'car retained reservation for unrelated junction');return{owner:car.id,legacySave};
});

run('active crossing restores missing ownership before conflicting admission',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),e=node(g,3,2),n=node(g,2,1);green(g,b);
 const left=vehicle(g,a,b,n,{lane:0});simulate(g,2.5);assert(left.turn,'fixture must already occupy crossing');
 delete g.junctions[b.id];left.reserved=undefined;
 const straight=vehicle(g,e,b,a,{lane:1,left:138});simulate(g,DT);
 assert.equal(left.reserved,b.id,'active crossing lost its reservation');assert.equal(owners(g,b).filter(id=>id===left.id).length,1,'active crossing ownership was not restored exactly once');
 let crossed=false;simulate(g,20,{check(){if(left.turn)assert(!straight.turn,'conflicting movement entered occupied crossing');crossed||=straight.from!==e.id;}});
 assert(crossed,'conflicting movement failed to resume after repaired crossing cleared');return{crossing:left.id,challenger:straight.id};
});

for(const representation of ['legacy numeric','duplicate array'])run(representation+' reservation normalizes without losing valid owner',()=>{
 let g=fresh();const a=node(g,1,2),b=node(g,2,2),c=node(g,3,2);green(g,b);
 let car=vehicle(g,a,b,c);grant(g,car,b);g.junctions[b.id]=representation==='legacy numeric'?car.id:[car.id,car.id,car.id];
 const saved=g.snapshot();g=new E.Game(saved.seed,saved.options).restore(saved);car=g.traffic.find(c=>c.id===car.id);simulate(g,DT);
 assert.equal(car.reserved,b.id,'valid reservation was discarded during normalization');assert.deepEqual(owners(g,b),[car.id],'normalized reservation must have one owner entry');return{representation,owner:car.id};
});

run('orphan and highway owner entries cannot reserve a ground junction',()=>{
 const g=fresh(),a=node(g,1,2),b=node(g,2,2),c=node(g,3,2),H=require('./highway');green(g,b);
 const wrong=vehicle(g,a,b,c),pose=H.at(g.map,5000,152);Object.assign(wrong,{...pose,kind:'highway',height:65,a:pose.a,highwayS:5000,highwayOffset:152,dir:1,lane:3,reserved:b.id});
 g.junctions[b.id]=[wrong.id,999999];simulate(g,DT);
 assert(!owners(g,b).includes(wrong.id),'highway car retained ground-junction ownership');assert(!owners(g,b).includes(999999),'orphan ID retained ground-junction ownership');assert.equal(wrong.reserved,undefined);return{wrongKind:wrong.id,orphan:999999};
});

const report={seed:8427,dt:DT,scope:'Public-state deterministic junction progress and live admission scenarios; every substep checks exact hull separation and continuous movement',passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results};
fs.writeFileSync(__dirname+'/evidence/traffic18-regression.json',JSON.stringify(report,null,2)+'\n');if(report.failed)process.exitCode=1;
