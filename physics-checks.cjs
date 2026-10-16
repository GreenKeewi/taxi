const assert=require('node:assert/strict'),E=require('./engine3d.js'),R=require('./roads.js'),fs=require('node:fs');
const checks=[];
function quiet(vehicle='taxi'){const g=new E.Game(8427,{vehicle,traffic:'light',dispatch:'local'});g.start();g.traffic=[];g.spawnTraffic=()=>{};g.job.timeLeft=10000;return g;}
for(const vehicle of ['taxi','bus']){
 const g=quiet(vehicle),m=g.map;for(const d of m.districts){Object.assign(g.car,{x:d.xs[2]-56,y:m.hy-180,a:Math.PI/2,speed:70,steer:0,roadSample:{layer:'ground',height:0}});g.sampleCarRoad();for(let i=0;i<180;i++)g.update(1/60,{up:true});assert(g.car.y>m.hy+70);assert.equal(g.car.height,0);assert.equal(g.stats.collisions,0);}
 checks.push({vehicle,underpasses:'3 passed at ground height'});
 // Map boundary prevents leaving the finite simulation even away from streets.
 Object.assign(g.car,{x:m.w-50,y:500,a:0,speed:30,steer:0});delete g.car.roadSample;g.sampleCarRoad();for(let i=0;i<120;i++)g.update(1/60,{up:true});assert(g.car.x<=m.w-43);checks.push({vehicle,mapEdge:'contained'});
}
// Highway traffic brakes for a stopped player, then moves again after clearing.
let g=quiet(),m=g.map;Object.assign(g.car,{x:5400,y:m.hy+53,a:0,speed:0,roadSample:{layer:'highway',height:65}});g.sampleCarRoad();g.traffic=[{id:1,kind:'highway',x:5000,y:m.hy+53,a:0,dir:1,lane:1,height:65,speed:250,desired:280}];g.rand=()=>1;for(let i=0;i<900;i++){g.update(1/60,{});assert(!E.carHit(g.car,g.traffic[0]));}assert(g.traffic[0].x<g.car.x-44);assert(g.traffic[0].speed<1);g.car.y=m.hy-53;for(let i=0;i<300;i++)g.update(1/60,{});assert(g.traffic[0].speed>50);checks.push({highwayFollowing:'stop and resume, no overlap'});
// Deck traffic cannot collide with a surface vehicle directly below it.
assert.equal(E.carHit({x:1000,y:m.hy,a:0,height:65},{x:1000,y:m.hy,a:0,height:0}),false);
// New regional buildings retain solid ground-level collision volumes.
const house=m.districts[1].buildings[0];assert(E.buildingHit({x:house.x+house.w/2,y:house.y+house.h/2,a:0,height:0,length:44,width:22},house));
// Fines and roadside assist can leave a negative balance.
g=quiet();g.time=1;g.redLightPenalty(g.map.nodes[0]);assert.equal(g.cash,-12);g.recover();assert.equal(g.cash,-27);checks.push({debt:'red light -$12, assist -$15'});
assert(E.rushHour(0,8*60+30)>E.rushHour(0,3*60));
// Safe full-stop right-on-red still qualifies, while straight red crossings fine.
g=quiet();const n=g.map.nodes[18],phaseTime=10-(n.i+n.j)*1.1;g.time=phaseTime;assert.equal(E.signal(g.map,n,g.time).horizontal,'red');Object.assign(g.car,{x:n.x-120,y:n.y+56,a:0,speed:0,height:0});for(let i=0;i<65;i++){g.time+=1/120;g.checkSignals(g.car.x,g.car.y,1/120);}const ox=g.car.x;g.car.x=n.x-90;g.checkSignals(ox,g.car.y,1/120);assert.equal(g.stats.redLights,0);assert.equal(g.pendingRightTurns.length,1);g.car.x=n.x-56;g.car.y=n.y+110;g.car.a=Math.PI/2;g.checkSignals(g.car.x,g.car.y,1/120);assert.equal(g.stats.rightOnRed,1);
g=quiet();g.time=phaseTime;Object.assign(g.car,{x:n.x-90,y:n.y+56,a:0,speed:30,height:0});g.checkSignals(n.x-100,n.y+56);assert.equal(g.stats.redLights,1);checks.push({rightOnRed:'full stop and right exit accepted; straight crossing fined'});
// New seeds retain joined decks at every town.
for(const seed of [1,42,12345,999999]){const map=E.makeMap(seed);for(const d of map.districts)assert.equal(d.hy,map.hy);for(const p of map.roadProfiles)assert.equal(R.pointAt(p,p.total).height,65);}
checks.push({seeds:'1, 42, 8427, 12345, 999999'});
fs.writeFileSync(__dirname+'/evidence/physics-checks.json',JSON.stringify(checks,null,2));console.log(checks);
