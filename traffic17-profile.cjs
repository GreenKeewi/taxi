/* Repeatable engine-only traffic baseline; no browser/render/director costs. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),E=require('./engine3d');
const DT=1/120,counts=[48,96,160,224],samples=[];
function populated(count){
 const g=new E.Game(8427,{traffic:'light',dispatch:'local',startMinutes:960});g.traffic=[];g.trafficId=0;g.junctions={};g.trafficPreset='gridlock';
 // Seeded normal spawning creates real street/highway geometry and legal poses.
 for(let tries=0;g.traffic.length<count&&tries<count*100;tries++)g.spawnTraffic();
 if(g.traffic.length!==count)throw Error(`Could spawn only ${g.traffic.length}/${count}; runtime traffic cap prevents benchmark`);
 return g;
}
for(const cars of counts){
 try{
  const g=populated(cars);for(let i=0;i<600;i++){g.time+=DT;g.updateTraffic(DT);}
  const batches=[],queueSamples=[];for(let batch=0;batch<30;batch++){const begin=performance.now();for(let i=0;i<120;i++){g.time+=DT;g.updateTraffic(DT);}batches.push((performance.now()-begin)/120);queueSamples.push({time:g.time,queued:g.traffic.filter(c=>c.queueing).length,stopped:g.traffic.filter(c=>c.speed<3).length,maxWaitSeconds:Math.max(0,...g.traffic.map(c=>c.waitSince===undefined?0:g.time-c.waitSince))});}
  const sorted=[...batches].sort((a,b)=>a-b),mean=batches.reduce((a,b)=>a+b,0)/batches.length;
  const sample={cars,street:g.traffic.filter(c=>c.kind==='street').length,highway:g.traffic.filter(c=>c.kind==='highway').length,meanMs:mean,p50BatchMeanMs:sorted[15],p95BatchMeanMs:sorted[28],maxBatchMeanMs:sorted.at(-1),physicsCpuMsPerSimulatedSecond:mean*120,lastStepWork:g.trafficWork,queueSamples,batchMeanMs:batches};samples.push(sample);console.log(JSON.stringify({...sample,batchMeanMs:undefined,queueSamples:undefined}));
 }catch(error){samples.push({cars,error:error.message});console.error(error.message);process.exitCode=1;}
}
const report={seed:8427,startMinutes:960,dt:DT,warmupSeconds:5,measuredSeconds:30,batchSeconds:1,node:process.version,platform:process.platform,architecture:process.arch,cpu:os.cpus()[0]?.model,scope:'updateTraffic only; excludes game.update, director, GPS and rendering; batch p95 is not per-call p95 or browser frame p95',samples};
fs.writeFileSync(__dirname+'/evidence/traffic17-profile.json',JSON.stringify(report,null,2)+'\n');
