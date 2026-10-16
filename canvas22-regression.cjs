/* Exact Canvas pixel comparison against the archived canvas21 renderer. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),{PNG}=require('pngjs'),fixture=require('./canvas19-fixture.cjs');
const baseline='/workspace/taxi-canvas21-baseline',results=[];
const hook="const originalUpload=TaxiSoftwareRenderer.prototype.upload;window.__roadAudit={critical:0,flat:0,dynamic:0,failures:0};TaxiSoftwareRenderer.prototype.upload=function(b,m){const r=originalUpload.call(this,b,m);for(let t=0;t<b.triangles;t++){const protectedFace=!!m.roadCritical?.[t]||!!m.roadSurface?.[t]||!!m.underRoad?.[t]||!!b.dynamic;if(m.roadCritical?.[t])__roadAudit.critical++;if(b.dynamic)__roadAudit.dynamic++;if(protectedFace&&b.smallDetail?.[t])__roadAudit.failures++;}return r;};window.__canvas22={draw(){look=keys.has('c')?PI:keys.has('q')?-PI*.43:keys.has('e')?PI*.43:0;render({...game.car},1000);updateHud({...game.car},1000);return renderer.stats;},quality(level){lowPower=true;adaptiveLevel=level;resize();},policy(){const before=JSON.stringify(game.snapshot());lowPower=true;adaptiveLevel=adaptiveSlow=adaptiveFast=adaptiveFrames=adaptiveCost=adaptiveGap=0;adaptiveResizePending=false;resize();for(let i=0;i<30;i++)adaptCanvas(90,.05);const deferredSlowWidth=renderer.canvas.width;applyCanvasQuality();const slow={level:adaptiveLevel,pixels:renderer.canvas.width};for(let i=0;i<360;i++)adaptCanvas(8,1/60);const deferredFastWidth=renderer.canvas.width;applyCanvasQuality();const fast={level:adaptiveLevel,pixels:renderer.canvas.width};lowPower=false;for(let i=0;i<30;i++)adaptCanvas(100,.1);return{slow,fast,deferredSlowWidth,deferredFastWidth,disabledLevel:adaptiveLevel,unchanged:before===JSON.stringify(game.snapshot())};},reset(){lowPower=false;renderer.resize(width,height,900/width);cameraPitch=0;cameraTime=0;cameraRoll=0;cameraSurge=0;cameraFov=PI*.40;route=refreshRoute();prevCar={...game.car};previousTraffic.clear();}};init();";
const scenarios=['front','left','right','rear','brakes','color','lod329','lod331','lod799','lod801','underpass','deck','ramp','resize','front-return'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-webgl']});
 try{
  const pages=[];for(const release of ['before','after']){
   const p=await browser.newPage({viewport:{width:1100,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{const native=requestAnimationFrame.bind(window);window.__canvas22Tick=()=>new Promise(resolve=>native(resolve));window.requestAnimationFrame=fn=>{window.__canvasFrame=fn;return 1;};});
   for(const name of ['engine3d.js','highway.js','roads.js','region.js'])await p.route('**/'+name+'?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(baseline+'/'+name,'utf8')}));
   await p.route('**/game.js?*',async r=>{const response=await r.fetch(),body=await response.text();assert(body.includes('init();\n})();'));await r.fulfill({response,body:body.replace('init();\n})();',hook+'\n})();')});});
   await p.goto('http://127.0.0.1:'+(release==='before'?'8141':'8140')+'/?test');await p.waitForFunction(()=>window.__canvas22&&window.__taxi3d?.test);await p.keyboard.press('Enter');
   await p.evaluate(data=>{const g=__taxi3d.test.game();g.traffic=data.cars;g.junctions={};g.time=2;g.job.timeLeft=10000;__taxi3d.test.place(data.player);window.__canvas22Home=data.player;},fixture());pages.push({release,p,errors});
  }
  for(const name of scenarios){
   const images=[];for(const {release,p,errors}of pages){
    for(const key of ['q','e','c'])await p.keyboard.up(key);if(name==='resize'||name==='front-return'){const width=name==='resize'?1280:1100;await p.setViewportSize({width,height:name==='resize'?800:720});await p.evaluate(async()=>{await __canvas22Tick();await __canvas22Tick();});await p.waitForFunction(width=>document.getElementById('interior').width===width,width);}
    await p.evaluate(name=>{const g=__taxi3d.test.game(),home=__canvas22Home;let pose={...home};
     if(name==='underpass')pose={x:g.map.xs[2]-56,y:g.map.hy-130,a:Math.PI/2,speed:0,roadSample:{layer:'ground',height:0}};
     if(name==='deck'){const q=TaxiHighway.at(g.map,5000,152);pose={...q,a:q.a,speed:0,roadSample:{layer:'highway',height:65}};}
     if(name==='ramp'){const road=g.map.roadProfiles.find(p=>p.kind==='entry'),q=TaxiRoads.pointAt(road,road.total*.55);pose={x:q.x,y:q.z,a:Math.atan2(q.dz,q.dx),speed:0,roadSample:{layer:'ramp',height:q.height,rampIndex:road.index}};}
     __taxi3d.test.place(pose);const c=g.traffic.find(c=>c.id===7);
     if(name==='brakes')c.stopped=true;if(name==='color')c.color='#b65d9c';if(name.startsWith('lod')){c.x=pose.x+Number(name.slice(3));c.y=pose.y;}
     __canvas22.reset();
    },name);
    if(name==='left')await p.keyboard.down('q');if(name==='right')await p.keyboard.down('e');if(name==='rear')await p.keyboard.down('c');
    const state=await p.evaluate(()=>JSON.stringify({car:__taxi3d.test.game().car,traffic:__taxi3d.test.game().traffic}));
    const stats=await p.evaluate(()=>{__canvas22.draw();__canvas22.draw();return __canvas22.draw();});
    assert.equal(await p.evaluate(()=>JSON.stringify({car:__taxi3d.test.game().car,traffic:__taxi3d.test.game().traffic})),state,'render mutated physics');assert.equal(errors.length,0);
    const pixels=await p.evaluate(()=>['world','interior'].map(id=>document.getElementById(id).toDataURL('image/png').split(',')[1]));
    images.push(pixels.map(b=>PNG.sync.read(Buffer.from(b,'base64'))));if(release==='after'){assert((stats.projectionCacheEntries||0)<=256,'projection cache exceeds LRU bound');assert(stats.projectionCacheHits>0,'third identical view must exercise projection cache hits');}
    if(['front','underpass','ramp'].includes(name))await p.screenshot({path:__dirname+`/evidence/canvas22-${release}-parity-${name}.png`});
   }
   for(let layer=0;layer<2;layer++){const a=images[0][layer],b=images[1][layer];assert.equal(a.width,b.width);assert.equal(a.height,b.height);let differences=0,maxDelta=0;for(let i=0;i<a.data.length;i++)if(a.data[i]!==b.data[i]){differences++;maxDelta=Math.max(maxDelta,Math.abs(a.data[i]-b.data[i]));}results.push({scenario:name,layer:layer?'cockpit-overlay':'world-and-mirror',differingChannels:differences,maxDelta});assert.equal(differences,0,`${name} layer${layer} differs`);}
   console.log('PASS exact pixels',name);
  }
  await pages[1].p.evaluate(()=>{const r=__canvas22;for(let i=0;i<180;i++){const g=__taxi3d.test.game(),d=g.map.districts[i%3],x=d.xs[i%d.xs.length],y=d.ys[Math.floor(i/3)%d.ys.length]+56;__taxi3d.test.place({x,y,a:i%4*Math.PI/2,speed:0,roadSample:{layer:'ground',height:0}});r.reset();r.draw();r.draw();r.draw();}window.__canvas22Memory=r.draw();});
  const memory=await pages[1].p.evaluate(()=>__canvas22Memory);assert.equal(memory.projectionCacheEntries,256,'traversal must fill and exercise bounded LRU');assert(memory.projectionCacheHits>0);results.push({scenario:'180-view cache bound',...memory});
  const audit=await pages[1].p.evaluate(()=>__roadAudit);assert(audit.critical>10000);assert.equal(audit.failures,0);results.push({scenario:'protected road/bridge/barrier/dynamic faces',...audit});
  for(const level of[0,1,2]){const p=pages[1].p;const r=await p.evaluate(level=>{const g=__taxi3d.test.game(),q=TaxiHighway.at(g.map,5300,152);__taxi3d.test.place({...q,a:q.a,speed:0,roadSample:{layer:'highway',height:65}});__canvas22.reset();const before=JSON.stringify(g.snapshot());__canvas22.quality(level);__canvas22.draw();__canvas22.draw();return{before,after:JSON.stringify(g.snapshot()),world:document.getElementById('world').width,overlay:document.getElementById('interior').width,render:__taxi3d.render};},level);assert.equal(r.before,r.after);assert.equal(r.overlay,1100);assert.equal(r.world,[800,600,460][level]);results.push({scenario:'low-power tier'+level,worldWidth:r.world,overlayWidth:r.overlay,detailFar:r.render.detailFar});await p.screenshot({path:__dirname+`/evidence/canvas22-low-tier${level}-highway.png`});}
  const policy=await pages[1].p.evaluate(()=>__canvas22.policy());assert.equal(policy.deferredSlowWidth,800);assert.equal(policy.deferredFastWidth,460);assert.equal(policy.slow.level,2);assert.equal(policy.slow.pixels,460);assert.equal(policy.fast.level,0);assert.equal(policy.fast.pixels,800);assert.equal(policy.disabledLevel,0);assert(policy.unchanged);results.push({scenario:'adaptive degrade/recover/disable policy',...policy});
  fs.writeFileSync(__dirname+'/evidence/canvas22-regression.json',JSON.stringify({exactPixelScenarios:scenarios.length,results},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);fs.writeFileSync(__dirname+'/evidence/canvas22-regression.json',JSON.stringify({error:error.message,results},null,2)+'\n');process.exitCode=1;});
