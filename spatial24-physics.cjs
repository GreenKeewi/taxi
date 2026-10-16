/* Exact saved-state comparison against the published checkpoint. */
const assert=require('node:assert/strict'),fs=require('node:fs'),Before=require('/workspace/taxi-canvas22-baseline/engine3d'),After=require('./engine3d'),results=[];
for(const seed of [8427,1729])for(const traffic of ['normal','gridlock'])for(const vehicle of ['taxi','bus']){
 const options={traffic,vehicle,busRoute:'900',startMinutes:960},a=new Before.Game(seed,options),b=new After.Game(seed,options);a.start();b.start();a.job.timeLeft=b.job.timeLeft=10000;
 for(let tick=0;tick<1800;tick++){const t=tick/120,input={up:t<8,brake:t>=8&&t<11,left:t>2&&t<3,right:t>5&&t<5.7,down:t>12};a.update(1/120,input);b.update(1/120,input);if(tick%120===119)assert.deepEqual(b.snapshot(),a.snapshot(),`${seed}/${traffic}/${vehicle}/${tick}`);}
 results.push({seed,traffic,vehicle,seconds:15,comparisons:15,cars:b.traffic.length,collisions:b.stats.collisions});console.log('PASS exact physics state',seed,traffic,vehicle);
}
fs.writeFileSync(__dirname+'/evidence/spatial24-physics.json',JSON.stringify({method:'two independently loaded Game modules; identical inputs;120Hz;exact full snapshots each second; no rendering',results},null,2));
