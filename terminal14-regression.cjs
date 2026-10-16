const {g,drive}=require('./drive-test.cjs'),E=require('./engine3d.js'),H=require('./highway.js'),assert=require('node:assert/strict'),fs=require('node:fs'),results=[];
for(const vehicle of['taxi','bus'])for(const end of['west','east']){
 g.setVehicle(vehicle);g.start();g.traffic=[];g.spawnTraffic=()=>{};g.job.timeLeft=10000;
 const m=g.map,dir=end==='east'?1:-1,station=end==='east'?m.highwayEnd-900:m.highwayStart+900,q=H.at(m,station,dir*152);
 Object.assign(g.car,{x:q.x,y:q.y,a:q.a+(dir<0?Math.PI:0),speed:0,roadSample:{layer:'highway',height:65}});g.sampleCarRoad();
 let path=E.route(m,g.car,end==='east'?m.bays[11]:m.districts[2].bays[15]),cut=path.findIndex((p,i)=>i>15&&(H.locate(m,p.x,p.y).lateral*dir<0)&&((end==='east'&&H.locate(m,p.x,p.y).s<m.highwayEnd-1100)||(end==='west'&&H.locate(m,p.x,p.y).s>m.highwayStart+1100)));
 assert(cut>0);path=path.slice(0,cut+1);const result=drive(path,300);console.log(vehicle,end,result.ok,result.time,g.stats.collisions,result.reason,result.event?.text);results.push({vehicle,end,passed:result.ok,seconds:result.time,collisions:g.stats.collisions});assert(result.ok);assert.equal(g.stats.collisions,0);
}
fs.writeFileSync(__dirname+'/evidence/terminal14.json',JSON.stringify(results,null,2));
