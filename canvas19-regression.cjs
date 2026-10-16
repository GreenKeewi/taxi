/* Exact Canvas pixel comparison against the archived junction18 renderer. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),{PNG}=require('pngjs'),fixture=require('./canvas19-fixture.cjs');
const baseline='/workspace/taxi-junction18-baseline',results=[];
const hook="window.__canvas19={draw(){look=keys.has('c')?PI:keys.has('q')?-PI*.43:keys.has('e')?PI*.43:0;render({...game.car},1000);updateHud({...game.car},1000);return renderer.stats;},reset(){cameraPitch=0;cameraTime=0;cameraRoll=0;cameraSurge=0;cameraFov=PI*.40;route=refreshRoute();prevCar={...game.car};previousTraffic.clear();}};init();";
const scenarios=['front','left','right','rear','brakes','color','lod329','lod331','lod799','lod801','underpass','deck','ramp','resize','front-return'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-webgl']});
 try{
  const pages=[];for(const release of ['before','after']){
   const p=await browser.newPage({viewport:{width:1100,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{const native=requestAnimationFrame.bind(window);window.__canvas19Tick=()=>new Promise(resolve=>native(resolve));window.requestAnimationFrame=fn=>{window.__canvasFrame=fn;return 1;};});
   for(const name of ['engine3d.js','highway.js','roads.js','region.js'])await p.route('**/'+name+'?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(baseline+'/'+name,'utf8')}));
   await p.route('**/game.js?*',async r=>{const response=await r.fetch(),body=await response.text();assert(body.includes('init();\n})();'));await r.fulfill({response,body:body.replace('init();\n})();',hook+'\n})();')});});
   await p.goto('http://127.0.0.1:'+(release==='before'?'8131':'8130')+'/?test');await p.waitForFunction(()=>window.__canvas19&&window.__taxi3d?.test);await p.keyboard.press('Enter');
   await p.evaluate(data=>{const g=__taxi3d.test.game();g.traffic=data.cars;g.junctions={};g.time=2;g.job.timeLeft=10000;__taxi3d.test.place(data.player);window.__canvas19Home=data.player;},fixture());pages.push({release,p,errors});
  }
  for(const name of scenarios){
   const images=[];for(const {release,p,errors}of pages){
    for(const key of ['q','e','c'])await p.keyboard.up(key);if(name==='resize'||name==='front-return'){const width=name==='resize'?1280:1100;await p.setViewportSize({width,height:name==='resize'?800:720});await p.evaluate(async()=>{await __canvas19Tick();await __canvas19Tick();});await p.waitForFunction(width=>document.getElementById('interior').width===width,width);}
    await p.evaluate(name=>{const g=__taxi3d.test.game(),home=__canvas19Home;let pose={...home};
     if(name==='underpass')pose={x:g.map.xs[2]-56,y:g.map.hy-130,a:Math.PI/2,speed:0,roadSample:{layer:'ground',height:0}};
     if(name==='deck'){const q=TaxiHighway.at(g.map,5000,152);pose={...q,a:q.a,speed:0,roadSample:{layer:'highway',height:65}};}
     if(name==='ramp'){const road=g.map.roadProfiles.find(p=>p.kind==='entry'),q=TaxiRoads.pointAt(road,road.total*.55);pose={x:q.x,y:q.z,a:Math.atan2(q.dz,q.dx),speed:0,roadSample:{layer:'ramp',height:q.height,rampIndex:road.index}};}
     __taxi3d.test.place(pose);const c=g.traffic.find(c=>c.id===7);
     if(name==='brakes')c.stopped=true;if(name==='color')c.color='#b65d9c';if(name.startsWith('lod')){c.x=pose.x+Number(name.slice(3));c.y=pose.y;}
     __canvas19.reset();
    },name);
    if(name==='left')await p.keyboard.down('q');if(name==='right')await p.keyboard.down('e');if(name==='rear')await p.keyboard.down('c');
    const state=await p.evaluate(()=>JSON.stringify({car:__taxi3d.test.game().car,traffic:__taxi3d.test.game().traffic}));
    const stats=await p.evaluate(()=>{__canvas19.draw();__canvas19.draw();return __canvas19.draw();});
    assert.equal(await p.evaluate(()=>JSON.stringify({car:__taxi3d.test.game().car,traffic:__taxi3d.test.game().traffic})),state,'render mutated physics');assert.equal(errors.length,0);
    const pixels=await p.evaluate(()=>['world','interior'].map(id=>document.getElementById(id).toDataURL('image/png').split(',')[1]));
    images.push(pixels.map(b=>PNG.sync.read(Buffer.from(b,'base64'))));if(release==='after'){assert((stats.projectionCacheEntries||0)<=256,'projection cache exceeds LRU bound');assert(stats.projectionCacheHits>0,'third identical view must exercise projection cache hits');}
    if(['front','underpass','ramp'].includes(name))await p.screenshot({path:__dirname+`/evidence/canvas19-${release}-parity-${name}.png`});
   }
   for(let layer=0;layer<2;layer++){const a=images[0][layer],b=images[1][layer];assert.equal(a.width,b.width);assert.equal(a.height,b.height);let differences=0,maxDelta=0;for(let i=0;i<a.data.length;i++)if(a.data[i]!==b.data[i]){differences++;maxDelta=Math.max(maxDelta,Math.abs(a.data[i]-b.data[i]));}results.push({scenario:name,layer:layer?'cockpit-overlay':'world-and-mirror',differingChannels:differences,maxDelta});assert.equal(differences,0,`${name} layer${layer} differs`);}
   console.log('PASS exact pixels',name);
  }
  await pages[1].p.evaluate(()=>{const r=__canvas19;for(let i=0;i<180;i++){const g=__taxi3d.test.game(),d=g.map.districts[i%3],x=d.xs[i%d.xs.length],y=d.ys[Math.floor(i/3)%d.ys.length]+56;__taxi3d.test.place({x,y,a:i%4*Math.PI/2,speed:0,roadSample:{layer:'ground',height:0}});r.reset();r.draw();r.draw();r.draw();}window.__canvas19Memory=r.draw();});
  const memory=await pages[1].p.evaluate(()=>__canvas19Memory);assert.equal(memory.projectionCacheEntries,256,'traversal must fill and exercise bounded LRU');assert(memory.projectionCacheHits>0);results.push({scenario:'180-view cache bound',...memory});
  fs.writeFileSync(__dirname+'/evidence/canvas19-regression.json',JSON.stringify({exactPixelScenarios:scenarios.length,results},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);fs.writeFileSync(__dirname+'/evidence/canvas19-regression.json',JSON.stringify({error:error.message,results},null,2)+'\n');process.exitCode=1;});
