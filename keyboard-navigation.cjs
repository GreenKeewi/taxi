// Native menu focus/activation, alongside the original arrow-key game controls.
// No game-state placement, simulation stepping, or navigation interception.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BASE=process.env.TAXI_URL||'http://127.0.0.1:8080/';
const OUT=process.env.QA_OUTPUT_DIR||path.join(__dirname,'evidence');
async function tabTo(page,selector){for(let i=0;i<40;i++){if(await page.evaluate(s=>document.activeElement.matches(s),selector))return;await page.keyboard.press('Tab');}throw Error('Keyboard focus did not reach '+selector);}
(async()=>{fs.mkdirSync(OUT,{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']}),page=await browser.newPage({viewport:{width:1024,height:650}}),errors=[],report={base:BASE,method:'Native keyboard and normal animation loop; state observed only',errors};page.on('pageerror',e=>errors.push(e.message));try{
 await page.goto(BASE);await page.waitForFunction(()=>window.__taxi3d?.render?.staticVertices);
 await tabTo(page,'#menu-buttons button:first-child');await page.keyboard.press('Space');await page.waitForFunction(()=>__taxi3d.state.mode==='playing');
 await page.keyboard.press('KeyP');const paused=await page.evaluate(()=>__taxi3d.state.time);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__taxi3d.state.time),paused);
 await tabTo(page,'#menu-buttons button:first-child');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>__taxi3d.state.mode),'playing');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>__taxi3d.state.mode),'map');await page.keyboard.press('Escape');
 await page.keyboard.press('F1');assert.equal(await page.evaluate(()=>__taxi3d.state.mode),'guide');await tabTo(page,'#close-guide');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__taxi3d.state.mode),'playing');
 // Reload returns to the title screen, with or without an additional saved-shift row.
 await page.reload();await page.waitForFunction(()=>window.__taxi3d?.render?.staticVertices);
 await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>__taxi3d.state.menuIndex),1);await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>__taxi3d.state.menuIndex),0);
 await tabTo(page,'#menu a');const href=await page.locator('#menu a').getAttribute('href');assert.equal(href,'https://greenkeewi.github.io/night-shift-taxi/');
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.matches('#menu-buttons button:last-child')),true);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.matches('#menu a')),true);
 await page.screenshot({path:path.join(OUT,'keyboard-original-link-focused.png')});
 const request=page.waitForRequest(r=>r.url()===href&&r.isNavigationRequest(),{timeout:15000});const navigation=page.waitForNavigation({timeout:15000}).then(r=>({status:r?.status()})).catch(e=>({error:e.message}));await page.keyboard.press('Enter');report.navigationRequested=(await request).url();report.navigation=await navigation;
 // A proxy-blocked destination still proves native link activation. It does not prove a live load.
 assert.equal(report.navigationRequested,href);assert.deepEqual(errors,[]);report.pass=true;console.log(JSON.stringify(report,null,2));
 }finally{fs.writeFileSync(path.join(OUT,'keyboard-navigation.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
