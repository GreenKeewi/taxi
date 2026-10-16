const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const shots=[],b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});try{
const p=await b.newPage({viewport:{width:1280,height:800}});await p.goto('http://localhost:8080/?test');await p.waitForFunction(()=>__taxi3d?.render?.totalChunks);await p.screenshot({path:__dirname+'/evidence/title.png'});await p.keyboard.press('Enter');
await p.evaluate(()=>{const g=__taxi3d.test.game();g.job.stage='dropoff';g.job.timeLeft=1000;});await p.keyboard.press('Tab');await p.screenshot({path:__dirname+'/evidence/regional-map.png'});await p.keyboard.press('Tab');
for(const scene of ['ramp-ascent','lakeshore-expressway','pickering','oshawa','underpass']){
 await p.evaluate(scene=>{const g=__taxi3d.test.game(),m=g.map;let point;if(scene==='ramp-ascent'){const q=TaxiRoads.pointAt(m.roadProfiles[0],1900);point={x:q.x,y:q.z,a:Math.atan2(q.dz,q.dx),roadSample:{x:q.x,z:q.z,layer:'ramp',rampIndex:0,height:q.height}};}if(scene==='lakeshore-expressway')point={x:10000,y:m.hy+53,a:0,roadSample:{x:10000,z:m.hy+53,layer:'highway',height:65}};if(scene==='pickering'){const d=m.districts[1];point={x:d.bays[11].x-180,y:d.bays[11].roadY+56,a:0};}if(scene==='oshawa'){const d=m.districts[2];point={x:d.xs[1]+180,y:d.ys[2]+56,a:0};}if(scene==='underpass')point={x:m.xs[2]-56,y:m.hy-170,a:Math.PI/2,roadSample:{layer:'ground',height:0}};g.job.timeLeft=1000;__taxi3d.test.place({...point,speed:0,steer:0});},scene);
 await p.waitForTimeout(800);await p.screenshot({path:__dirname+'/evidence/'+scene+'.png'});shots.push({scene,state:await p.evaluate(()=>({render:__taxi3d.render,city:__taxi3d.state.city,time:__taxi3d.state.time}))});
}
fs.writeFileSync(__dirname+'/evidence/screenshots.json',JSON.stringify(shots,null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
