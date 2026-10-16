/* Physical feasibility probe: explicit120Hz inputs, not a browser driving claim. */
const E=require('./engine3d'),H=require('./highway'),results=[];
for(const pulse of [.12,.16,.20,.24,.28,.32,.36,.4,.5]){
 const g=new E.Game(8427,{vehicle:'bus',busRoute:'900',traffic:'normal'});g.start();g.traffic=[];g.spawnTraffic=()=>{};g.job.timeLeft=10000;const q=H.at(g.map,5300,98);Object.assign(g.car,{...q,a:q.a,speed:180,steer:0,yawRate:0,roadSample:{layer:'highway',height:65}});g.sampleCarRoad();const samples=[];
 for(let tick=0;tick<180;tick++){const t=tick/120;g.update(1/120,{right:t<pulse,up:g.car.speed<180});if(tick%12===0){const r=H.locate(g.map,g.car.x,g.car.y);samples.push({t,station:r.s,lateral:r.lateral,a:g.car.a,steer:g.car.steer,speed:g.car.speed,collisions:g.stats.collisions});}if(g.stats.collisions)break;}
 const p=H.locate(g.map,g.car.x,g.car.y);results.push({pulse,station:p.s,lateral:p.lateral,collisions:g.stats.collisions,samples});console.log({pulse,station:p.s,lateral:p.lateral,collisions:g.stats.collisions});
}
require('fs').writeFileSync(__dirname+'/evidence/bus23-feasibility.json',JSON.stringify({method:'physics-only; traffic removed solely to isolate steering feasibility;180world/s initialspeed; single right-key pulse with native up/neutral input holding approximately180world/s throughout; not a browser success claim',results},null,2));
