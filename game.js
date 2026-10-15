(function(){'use strict';
const $=id=>document.getElementById(id),E=window.TaxiEngine3D||TaxiEngine,T=Taxi3D,PI=Math.PI,clamp=E.clamp;
const world=$('world'),overlay=$('interior'),ctx=overlay.getContext('2d'),keys=new Set();
let renderer,game,city,trafficDirector,staticBuffer,route=[],routeClock=0,mode='title',menuIndex=0,menuItems=[],guideReturn='title',mapReturn='playing',width=innerWidth,height=innerHeight,lowPower=false,soundOn=true,look=0,prevCar,previousTraffic=new Map(),accumulator=0,lastTime=0,lastDraw=0,latestEvent=null,eventUntil=0,fps=60,frameCount=0,fpsTime=0,frameDurations=[],audio=null,mutedByPause=true,seed=8427,software=false,startMinutes=16*60,trafficPreset='normal';
try{lowPower=localStorage.getItem('torontoTaxi3dLow')==='1';}catch(e){}
function init(){try{try{renderer=new T.Renderer(world);}catch(webglError){if(!window.TaxiSoftwareRenderer)throw webglError;renderer=new TaxiSoftwareRenderer(world);software=true;lowPower=true;}newCity(seed);resize();showMenu('title');requestAnimationFrame(frame);}catch(e){mode='unsupported';$('unsupported').hidden=false;$('menu').hidden=true;$('hud').hidden=true;console.error(e);}}
function newCity(s){seed=s;game=new E.Game(seed,{startMinutes,traffic:trafficPreset});adaptJob(true);prevCar={...game.car};routeClock=0;route=[];latestEvent=null;city=TaxiCity.build(game.map);trafficDirector=createTrafficDirector(game);if(staticBuffer)renderer.gl.deleteBuffer(staticBuffer.buffer);addSignalFrames(city.mesh,game.map);staticBuffer=renderer.buffer(city.mesh);city.stats=city.stats||{};city.stats.vertices=staticBuffer.count;$('seed-label').textContent='CITY '+seed;keys.clear();previousTraffic.clear();}
function adaptJob(first=false){game.job.timeLeft=Math.max(game.job.timeLeft,first?180:130+E.dist(game.car,game.target())/45);game.job.total=game.job.timeLeft;}
function start(){game.start();if(window.TaxiAudio){audio??=new TaxiAudio();soundOn=audio.start();}if(software)$('hint').textContent='Software 3D · WASD / arrows · Space brake · Q/E look · C rear · Esc pause';mode='playing';$('menu').hidden=true;$('hud').hidden=false;document.body.classList.remove('paused');keys.clear();accumulator=0;routeClock=0;}
function reset(same=true){if(same){game.startMinutes=startMinutes;game.trafficPreset=trafficPreset;game.reset();trafficDirector=createTrafficDirector(game);adaptJob(true);prevCar={...game.car};route=[];routeClock=0;previousTraffic.clear();}else newCity(Math.floor(Math.random()*999999)+1);start();}
function showMenu(next='paused'){mode=next;$('menu').dataset.mode=next;keys.clear();$('menu').hidden=false;$('hud').hidden=next==='title';document.body.classList.toggle('paused',next==='paused');menuIndex=0;const title=next==='title',over=next==='gameover';$('menu-description').innerHTML=title?'Take the wheel in downtown Toronto.<br>Read the lights. Find your gap. Make the fare.':over?`Shift finished · ${game.completed} ${game.completed===1?'fare':'fares'} · ${money(game.cash)}<br>${game.health<=0?'Your cab needs a proper repair.':'Three missed calls. Time for a fresh start.'}`:`Shift paused · ${game.completed} ${game.completed===1?'fare':'fares'} · ${money(game.cash)}<br>Take a breath. Your rider can wait.`;const timeItem=['Start time: '+timeText(startMinutes)+(title?'':' · next shift'),()=>cycleSetting('time',1),d=>cycleSetting('time',d)],trafficItem=['Traffic: '+trafficPreset.toUpperCase()+(title?'':' · next shift'),()=>cycleSetting('traffic',1),d=>cycleSetting('traffic',d)];menuItems=title?[['Start driving',start],timeItem,trafficItem]:over?[['Drive again',()=>reset(true)],['New city',()=>reset(false)]]:[['Resume',resume],['Restart',()=>reset(true)],timeItem,trafficItem];renderMenu();}
function renderMenu(){const box=$('menu-buttons');box.replaceChildren();menuItems.forEach(([label,fn],i)=>{const b=document.createElement('button');b.textContent=label;b.className=i===menuIndex?'selected':'';b.onclick=()=>{menuIndex=i;fn();};box.appendChild(b);});}
function resume(){audio?.start();mode='playing';$('menu').hidden=true;$('hud').hidden=false;document.body.classList.remove('paused');keys.clear();accumulator=0;}
function openGuide(){guideReturn=mode;mode='guide';keys.clear();$('handbook').hidden=false;$('menu').hidden=true;}
function closeGuide(){$('handbook').hidden=true;if(guideReturn==='playing')resume();else showMenu(guideReturn);}
$('close-guide').onclick=closeGuide;
function toggleMap(){if(mode==='map'){$('map-panel').hidden=true;mode=mapReturn;keys.clear();}else if(mode==='playing'){mapReturn=mode;mode='map';keys.clear();$('map-panel').hidden=false;drawMap();}}
function resize(){width=innerWidth;height=innerHeight;const scale=lowPower?Math.min(1,900/width):Math.min(devicePixelRatio||1,1.5,(software?1000:1600)/width);renderer.resize(width,height,Math.max(.5,scale));const dpr=Math.min(devicePixelRatio||1,1.5);overlay.width=Math.round(width*dpr);overlay.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(mode==='map')drawMap();}
function note(text){latestEvent={title:text,text:'',tone:'info'};eventUntil=performance.now()+2400;}
addEventListener('resize',()=>{if(renderer)resize();});
addEventListener('blur',()=>{keys.clear();if(mode==='playing')showMenu('paused');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')showMenu('paused');lastTime=0;});
addEventListener('keydown',e=>{if(mode==='unsupported')return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab','enter','escape'].includes(k))e.preventDefault();if(e.repeat)return;
 if(k==='l'){lowPower=!lowPower;try{localStorage.setItem('torontoTaxi3dLow',lowPower?'1':'0');}catch(e){}resize();note(lowPower?'LOW POWER · 30 FPS':'FULL FRAME RATE');return;}
 if(k==='m'){toggleSound();return;}
 if(mode==='guide'){if(['enter','escape','h','f1'].includes(k))closeGuide();return;}
 if(mode==='map'){if(['tab','escape'].includes(k))toggleMap();return;}
 if(mode!=='playing'){if(['arrowdown','s'].includes(k)){menuIndex=(menuIndex+1)%menuItems.length;renderMenu();}else if(['arrowup','w'].includes(k)){menuIndex=(menuIndex+menuItems.length-1)%menuItems.length;renderMenu();}else if(k==='arrowleft'||k==='arrowright'){menuItems[menuIndex]?.[2]?.(k==='arrowleft'?-1:1);}else if(k==='enter')menuItems[menuIndex]?.[1]();else if((k==='escape'||k==='p')&&mode==='paused')resume();else if(k==='h'||k==='f1')openGuide();return;}
 if(k==='escape'||k==='p'){showMenu('paused');return;}if(k==='f1'){e.preventDefault();openGuide();return;}if(k==='h'){audio?.horn();return;}if(k==='tab'){toggleMap();return;}if(k==='r'){game.recover();prevCar={...game.car};routeClock=0;return;}keys.add(k);
});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function input(){const slow=keys.has('shift');return{up:(keys.has('w')||keys.has('arrowup'))&&(!slow||game.car.speed<30),down:(keys.has('s')||keys.has('arrowdown'))&&(!slow||game.car.speed>-20),left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright'),brake:keys.has(' ') };}
function step(dt){prevCar={...game.car};previousTraffic.clear();for(const c of game.traffic)previousTraffic.set(c.id,{x:c.x,y:c.y,a:c.a});const stage=game.job.stage,job=game.job;game.update(dt,input());trafficDirector.update(dt);if(game.job!==job||game.job.stage!==stage){adaptJob(false);routeClock=0;}if(game.mode==='gameover')showMenu('gameover');routeClock-=dt;if(routeClock<=0){route=E.route(game.map,game.car,game.target());routeClock=.5;}const e=game.events[0];if(e&&e!==latestEvent&&e.time>=(game.time-1)){latestEvent=e;eventUntil=performance.now()+4300;} }
function lerpPose(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,a:a.a+E.angleDiff(b.a,a.a)*t,speed:b.speed,steer:b.steer};}
function frame(now){if(mode==='unsupported')return;requestAnimationFrame(frame);if(!lastTime)lastTime=now;const elapsed=Math.min(.1,(now-lastTime)/1000);lastTime=now;if(mode==='playing'){accumulator=Math.min(accumulator+elapsed,.1);let n=0;while(accumulator>=1/60&&n++<6){step(1/60);accumulator-=1/60;}}else accumulator=0;
 if(lowPower&&now-lastDraw<31)return;const costStart=performance.now();lastDraw=now;const car=mode==='playing'?lerpPose(prevCar,game.car,accumulator*60):{...game.car};look=keys.has('c')?PI:(keys.has('q')?-PI*.43:keys.has('e')?PI*.43:0);render(car,now);updateHud(car,now);updateAudio(car);frameCount++;if(!fpsTime)fpsTime=now;if(now-fpsTime>750){fps=Math.round(frameCount*1000/(now-fpsTime));frameCount=0;fpsTime=now;}frameDurations.push(performance.now()-costStart);if(frameDurations.length>240)frameDurations.shift();}
function addSignalFrames(mesh,map){for(const n of map.nodes)for(const a of [0,PI/2,PI,PI*1.5]){const cs=Math.cos(a),sn=Math.sin(a),x=n.x+cs*100-sn*76,z=n.y+sn*100+cs*76,hx=n.x+cs*100-sn*43,hz=n.y+sn*100+cs*43;mesh.box(x,20,z,1.5,40,1.5,'#60766e');mesh.box((x+hx)/2,39,(z+hz)/2,2,1.5,35,'#657c72',a);mesh.box(hx,35,hz,4,12,5,'#303c38',a);}}
function signalLights(mesh,map,time){for(const n of map.nodes){if(E.dist(n,game.car)>1100)continue;const sig=E.signal(map,n,time);for(const a of [0,PI/2,PI,PI*1.5]){const cs=Math.cos(a),sn=Math.sin(a),x=n.x+cs*97.7-sn*43,z=n.y+sn*97.7+cs*43,state=(Math.abs(cs)>.5?sig.horizontal:sig.vertical);for(let i=0;i<3;i++){const on=state===['red','amber','green'][i];const ly=39-i*4,nx=-sn*1.4,nz=cs*1.4;mesh.quad([x+nx,ly-1.2,z+nz],[x-nx,ly-1.2,z-nz],[x-nx,ly+1.2,z-nz],[x+nx,ly+1.2,z+nz],on?['#ff594b','#ffd269','#a4f390'][i]:'#253830');}}}}
// 3D-only density director. Every added car uses the engine's directed street
// edges, lane planning, traffic lights, junction reservations and collisions.
function createTrafficDirector(g){
 const preset=g.trafficPreset||trafficPreset,random=E.rng(g.seed^0x73ad61),target={light:16,normal:48,rush:60,gridlock:64}[preset]||48,minimumNearby={light:4,normal:12,rush:16,gridlock:28}[preset]||12,radius=780;
 let clock=0,relocated=0,spawned=0,lastMoves=[];
 const point=(a,b,t,lane)=>{const ang=Math.atan2(b.y-a.y,b.x-a.x),offset=E.LANES[lane];return{x:a.x+Math.cos(ang)*t-Math.sin(ang)*offset,y:a.y+Math.sin(ang)*t+Math.cos(ang)*offset,a:ang};};
 const clear=c=>E.dist(c,g.car)>175&&!g.traffic.some(o=>o!==c&&E.dist(o,c)<78)&&!g.map.parked.some(o=>E.carHit(c,o));
 // A conservative segment/box test includes the entire vehicle width. A car
 // may be redistributed behind solid buildings, never while it can be seen.
 function hiddenByBuilding(p){const dx=p.x-g.car.x,dy=p.y-g.car.y;for(const b of g.map.buildings){const x0=b.x+28,x1=b.x+b.w-28,y0=b.y+28,y1=b.y+b.h-28;if(x0>=x1||y0>=y1)continue;let near=0,far=1;for(const [origin,delta,lo,hi] of [[g.car.x,dx,x0,x1],[g.car.y,dy,y0,y1]]){if(Math.abs(delta)<.001){if(origin<lo||origin>hi){near=2;break;}}else{const a=(lo-origin)/delta,z=(hi-origin)/delta;near=Math.max(near,Math.min(a,z));far=Math.min(far,Math.max(a,z));}}if(near<far&&near>.02&&far<.97)return true;}return false;}
 function hidden(p){const d=E.dist(p,g.car);if(d>1550)return true;if(d<380)return false;if(hiddenByBuilding(p))return true;const a=Math.atan2(p.y-g.car.y,p.x-g.car.x),yaw=g.car.a+(keys.has('c')?PI:keys.has('q')?-PI*.43:keys.has('e')?PI*.43:0),half=Math.atan(Math.tan(PI*.2)*width/Math.max(1,height))+.14,front=Math.abs(E.angleDiff(a,yaw))<half,mirror=Math.abs(E.angleDiff(a,g.car.a+PI))<1.20;return !front&&!mirror;}
 function candidate(local,initial=false){
  const nodes=g.map.nodes;
  for(let attempt=0;attempt<(initial?400:100);attempt++){
   const from=nodes[Math.floor(random()*nodes.length)],neighbors=g.neighbors(from),to=neighbors[Math.floor(random()*neighbors.length)],L=E.dist(from,to),t=136+random()*(L-280),lane=random()<.5?0:1;
   const c={id:g.trafficId,kind:'street',from:from.id,to:to.id,t,lane,speed:28+random()*14,desired:51+random()*22,color:['#b45f4d','#4c829d','#d0d4ce','#9277a0','#477e6f','#d9b764','#5c6474'][Math.floor(random()*7)],stopped:false};
   Object.assign(c,point(from,to,t,lane));const d=E.dist(c,g.car);if(local&&(d>radius||d<185))continue;
   // Keep a clear first pickup approach. Other lanes and the adjacent blocks
   // remain populated, including oncoming cars immediately visible ahead.
   if(initial&&g.completed===0&&c.from===g.job.pickup.node&&c.to===g.job.pickup.node+1&&lane===1)continue;
   if(!clear(c)||(!initial&&!hidden(c)))continue;
   g.planTraffic(c);c.lane=c.requiredLane;c.laneOffset=E.LANES[c.lane];Object.assign(c,point(from,to,t,c.lane));
   if(!clear(c)||(!initial&&!hidden(c)))continue;
   return c;
  }
  return null;
 }
 function add(local,initial){const c=candidate(local,initial);if(!c)return false;g.trafficId++;g.traffic.push(c);spawned++;return true;}
 function fill(initial=false){let near=g.traffic.filter(c=>E.dist(c,g.car)<radius).length;for(let tries=0;g.traffic.length<target&&tries<60;tries++){if(add(near<minimumNearby,initial))near=g.traffic.filter(c=>E.dist(c,g.car)<radius).length;}
  for(let tries=0;near<minimumNearby&&tries<(initial?40:10);tries++){
   const old=g.traffic.filter(c=>c.kind==='street'&&E.dist(c,g.car)>1000&&!c.turn&&c.reserved===undefined&&hidden(c)).sort((a,b)=>E.dist(b,g.car)-E.dist(a,g.car))[0];if(!old)break;
   const c=candidate(true,initial);if(!c)break;const before={x:old.x,y:old.y},oldId=old.id;g.traffic[g.traffic.indexOf(old)]={...c,id:oldId};previousTraffic.delete(oldId);relocated++;near++;lastMoves.push({from:before,to:{x:c.x,y:c.y},time:g.time,initial,hiddenFrom:initial||hidden(before),hiddenTo:initial||hidden(c)});if(lastMoves.length>12)lastMoves.shift();
  }
 }
 if(g.traffic.length>target){g.traffic.sort((a,b)=>E.dist(a,g.car)-E.dist(b,g.car));g.traffic.length=target;}
 // Oncoming cars establish traffic immediately along the first visible street.
 // They remain ordinary collidable engine cars for the rest of the shift.
 const first=g.job.pickup,from=g.map.nodes[first.node+1],to=g.map.nodes[first.node];
 if(from&&to)for(let i=0;i<(preset==='light'?1:2);i++){
  const t=E.dist(from,to)*(.34+i*.18),lane=i%2,c={id:g.trafficId,kind:'street',from:from.id,to:to.id,t,lane,speed:34,desired:55+i*5,color:i?'#b45f4d':'#4c829d',stopped:false};
  g.planTraffic(c);c.lane=c.requiredLane;c.laneOffset=E.LANES[c.lane];Object.assign(c,point(from,to,t,c.lane));
  if(clear(c)){if(g.traffic.length>=target){const old=g.traffic.filter(o=>o.kind==='street').sort((a,b)=>E.dist(b,g.car)-E.dist(a,g.car))[0];g.traffic.splice(g.traffic.indexOf(old),1);}g.trafficId++;g.traffic.push(c);spawned++;}
 }
 fill(true);
 return{update(dt){clock-=dt;if(clock<=0){clock=1.5;fill(false);}},summary(){const nearby=g.traffic.filter(c=>E.dist(c,g.car)<radius),close=nearby.filter(c=>E.dist(c,g.car)<450);return{target,nearby:nearby.length,close:close.length,movingNearby:nearby.filter(c=>c.speed>5).length,spawned,relocated,lastMoves:lastMoves.map(m=>({...m}))};}};
}
const vehicleCache=new Map();
function vehicleShape(color,style,lod,stopped){
 const key=color+':'+style+':'+lod+':'+stopped;if(vehicleCache.has(key))return vehicleCache.get(key);
 const mesh=new T.Mesh(),C=T.rgb(color),shade=n=>C.map(c=>c*n),quad=(a,b,c,d,col)=>mesh.quad(a,b,c,d,col),box=(x,y,z,w,h,d,col)=>mesh.box(x,y,z,w,h,d,col);
 // Chamfered body has distinct hood, fenders, rocker panel and rear deck.
 const outline=[[-22,-8],[-19,-11],[18.5,-11],[22,-8],[22,8],[18.5,11],[-19,11],[-22,8]],bodyY=style===2?11:9.5;
 for(let i=0;i<8;i++){const a=outline[i],b=outline[(i+1)%8];quad([a[0],4,a[1]],[b[0],4,b[1]],[b[0],bodyY,b[1]],[a[0],bodyY,a[1]],shade([.67,.78,.82,.88,.96,.88,.73,.65][i]));}
 
 const cab=style===2?{rear:-20,front:13,backRoof:-17,frontRoof:7.5,top:23,wide:9.6}:style===1?{rear:-18,front:11,backRoof:-14,frontRoof:5.5,top:20.5,wide:9.4}:{rear:-14.5,front:11,backRoof:-9.5,frontRoof:4.5,top:17.5,wide:8.8};
 const {rear,front,backRoof,frontRoof,top,wide}=cab,bottom=bodyY+.15,roofWidth=wide-1.1;
 // Only exposed body decks are meshed: hidden faces beneath the cabin can
 // sort through its glazing in a triangle-painter software renderer.
 const surface=points=>mesh.polygon(points.map(p=>[p[0],bodyY,p[1]]),shade(1.05));
 surface([[front,-wide],[18.5,-11],[22,-8],[22,8],[18.5,11],[front,wide]]);
 surface([[rear,wide],[-19,11],[-22,8],[-22,-8],[-19,-11],[rear,-wide]]);
 for(const side of [-1,1])surface([[-19,side*11],[18.5,side*11],[front,side*wide],[rear,side*wide]]);
 const rb=[rear,bottom,-wide],fb=[front,bottom,-wide],ft=[frontRoof,top,-roofWidth],rt=[backRoof,top,-roofWidth],rB=[rear,bottom,wide],fB=[front,bottom,wide],fT=[frontRoof,top,roofWidth],rT=[backRoof,top,roofWidth];
 quad(rb,fb,ft,rt,shade(.79));quad(fB,rB,rT,fT,shade(.94));quad(rt,ft,fT,rT,shade(1.1));quad(fb,fB,fT,ft,'#355460');quad(rB,rb,rt,rT,style===2?shade(.72):'#425c64');
 if(lod<2){
  // Tapered side glazing is split into two panes by a real painted B pillar.
  for(const side of [-1,1]){const lowRear=[rear,bottom,side*wide],lowFront=[front,bottom,side*wide],highRear=[backRoof,top,side*roofWidth],highFront=[frontRoof,top,side*roofWidth],p=(u,v)=>{const x0=lowRear[0]+(lowFront[0]-lowRear[0])*u,x1=highRear[0]+(highFront[0]-highRear[0])*u;return[x0+(x1-x0)*v,bottom+(top-bottom)*v,side*(wide+(roofWidth-wide)*v+.045)];};for(const [a,b] of style===2?[[.49,.92]]:[[.075,.47],[.54,.92]])quad(p(a,.16),p(b,.16),p(b,.86),p(a,.86),side<0?'#496b77':'#5e8791');}
  // Slim painted strips frame the angled windscreen rather than a glass box.
  quad([front+.02,bottom,-wide],[front+.02,bottom,wide],[front-(front-frontRoof)*.13+.02,bottom+(top-bottom)*.13,wide-(wide-roofWidth)*.13],[front-(front-frontRoof)*.13+.02,bottom+(top-bottom)*.13,-wide+(wide-roofWidth)*.13],shade(.9));
  if(lod===0){box(21.4,5,0,1.2,1.6,17.5,'#39464a');box(-21.4,5,0,1.2,1.6,17.5,'#39464a');}else{quad([22.03,4.3,-8.7],[22.03,5.7,-8.7],[22.03,5.7,8.7],[22.03,4.3,8.7],'#39464a');quad([-22.03,4.3,8.7],[-22.03,5.7,8.7],[-22.03,5.7,-8.7],[-22.03,4.3,-8.7],'#39464a');}
  for(const side of [-1,1]){const z=side*7.4;quad([22.02,6.2,z-2],[22.02,8.2,z-2],[22.02,8.2,z+2],[22.02,6.2,z+2],'#fff2c4');quad([-22.02,6,z+1.9],[-22.02,8.3,z+1.9],[-22.02,8.3,z-1.9],[-22.02,6,z-1.9],stopped?'#ff3e2e':'#b33128');}
 }
 if(lod===2){for(const x of [-13.5,13.5])for(const z of [-11.04,11.04])quad([x-3.5,.5,z],[x+3.5,.5,z],[x+3.5,6.7,z],[x-3.5,6.7,z],'#22272b');}
 else{
  const sides=lod===0?8:6,r=4,centerY=4.1;
  for(const x of [-13.5,13.5])for(const side of [-1,1]){const inner=side*8.5,outer=side*11;
   for(let i=0;i<sides;i++){const a=i/sides*PI*2,b=(i+1)/sides*PI*2,A=[x+Math.cos(a)*r,centerY+Math.sin(a)*r,outer],B=[x+Math.cos(b)*r,centerY+Math.sin(b)*r,outer];quad([A[0],A[1],inner],[B[0],B[1],inner],B,A,i<sides/2?'#262a2c':'#171b1d');mesh.tri([x,centerY,outer],A,B,'#202427');const hubR=lod===0?2.15:1.9,z=outer+side*.035;mesh.tri([x,centerY,z],[x+Math.cos(a)*hubR,centerY+Math.sin(a)*hubR,z],[x+Math.cos(b)*hubR,centerY+Math.sin(b)*hubR,z],i%2?'#aeb9b8':'#68777b');}
  }
 }
 if(lod===0){
  // Door handles, mirrors, grille and number plate read at cockpit distance.
  box(21.99,5.9,0,.08,1.45,6.5,'#202b30');box(-22.03,5.8,0,.08,1.2,4,'#e0e4d9');
  for(const side of [-1,1]){box(6.5,bodyY+1,side*10.1,2.4,1.3,1.6,shade(.7));box(-1,bodyY-.9,side*11.02,2.3,.48,.07,'#b7c3bd');if(style!==2)box(-10,bodyY-.9,side*11.02,2.3,.48,.07,'#b7c3bd');}
 }
 const data=new Float32Array(mesh.data);vehicleCache.set(key,data);return data;
}
function vehicle(mesh,c){
 const distance=E.dist(c,game.car),lod=distance<330?0:distance<800?1:2,style=c.id===undefined?Math.abs(Math.round(c.x*7+c.y*11))%3:c.id%9===0?2:c.id%3===0?1:0;
 const cs=Math.cos(c.a),sn=Math.sin(c.a),data=vehicleShape(c.color||'#ddd0a2',style,lod,!!c.stopped),out=mesh.data;
 // Keep this tiny contact shadow in world space for both rendering paths.
 mesh.box(c.x,.2,c.y,47,.15,25,'#43534d',c.a);
 for(let i=0;i<data.length;i+=6)out.push(c.x+data[i]*cs-data[i+2]*sn,data[i+1],c.y+data[i]*sn+data[i+2]*cs,data[i+3],data[i+4],data[i+5]);
}
function navigationMesh(mesh){const target=game.target(),color=game.job.stage==='pickup'?'#56c9d9':'#ecc260';let total=0;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz);if(total>950)break;if(len<.5)continue;mesh.line(a.x,a.y,b.x,b.y,2.6,.82,color);for(let d=20;d<len;d+=35){if(total+d>950)break;const t=d/len,x=a.x+dx*t,z=a.y+dz*t,ux=dx/len,uz=dz/len;mesh.tri([x+ux*7,.88,z+uz*7],[x-ux*4-uz*5,.88,z-uz*4+ux*5],[x-ux*4+uz*5,.88,z-uz*4-ux*5],color);}total+=len;}
 const cs=Math.cos(target.a),sn=Math.sin(target.a),p=(x,z)=>[target.x+x*cs-z*sn,target.y+x*sn+z*cs],corners=[p(-43,-18),p(43,-18),p(43,18),p(-43,18)];for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];mesh.line(a[0],a[1],b[0],b[1],2.2,1,color);}const front=p(27,0),a=p(10,-7),b=p(10,7);mesh.tri([front[0],1.05,front[1]],[a[0],1.05,a[1]],[b[0],1.05,b[1]],color);
 const marker=p(-42,26);mesh.cylinder(marker[0],5,marker[1],2.7,9,color,6);mesh.cylinder(marker[0],12,marker[1],3,4,'#d7aa80',8);}
function render(car,now){const dynamic=new T.Mesh();const t=mode==='playing'?accumulator*60:1;for(const v of game.map.parked)if(E.dist(v,car)<1350)vehicle(dynamic,v);for(const v of game.traffic){if(E.dist(v,car)>1500)continue;const prev=previousTraffic.get(v.id),c=prev&&E.dist(prev,v)<200?{...v,...lerpPose(prev,v,t)}:v;vehicle(dynamic,c);}signalLights(dynamic,game.map,game.time);navigationMesh(dynamic);renderer.upload(renderer.dynamic,dynamic);renderer.calls=0;
 const eye=[car.x+Math.cos(car.a)*6+Math.sin(car.a)*4.5,16.5,car.y+Math.sin(car.a)*6-Math.cos(car.a)*4.5],camera={eye,yaw:car.a+look,pitch:-.035,fov:PI*.40};const matrix=renderer.scene(camera,[staticBuffer,renderer.dynamic]);const state={steer:car.steer,speed:car.speed,health:game.health,cash:game.cash,fares:game.completed,reverse:car.speed<-.5,look,brake:keys.has(' '),clock:clockText(),lowPower};const rect=TaxiCockpit.getMirrorRect?TaxiCockpit.getMirrorRect(width,height,state):TaxiCockpit.mirrorRect?.(width,height);if(rect&&Math.abs(look)<2){renderer.scene({eye:[car.x-17*Math.cos(car.a),17,car.y-17*Math.sin(car.a)],yaw:car.a+PI,pitch:-.045,fov:PI*.42,mirror:true},[staticBuffer,renderer.dynamic],rect);}
 ctx.clearRect(0,0,width,height);if(mode==='playing'||mode==='paused'||mode==='map'){drawLabels(matrix,car);}TaxiCockpit.draw(ctx,width,height,state);if(mode==='playing'&&game.parkingStatus().near)drawParkingSensor(car);if(mode==='map')drawMap();window.__taxi3d.render={width,height,scale:renderer.scale,staticVertices:staticBuffer.count,dynamicVertices:renderer.dynamic.count,drawCalls:renderer.calls,fps,frameMs:frameDurations.reduce((a,b)=>a+b,0)/(frameDurations.length||1),camera:{...camera},car:{...car},wheel:car.steer,mirror:rect,software};$('game').dataset.debug=JSON.stringify({...window.__taxi3d.state,render:window.__taxi3d.render,route:route.slice(0,6)});}
function money(value){return(value<0?'-':'')+'$'+Math.abs(value);}
function timeText(minutes){const min=Math.floor(minutes)%1440,h=Math.floor(min/60);return String(h%12||12)+':'+String(min%60).padStart(2,'0')+' '+(h<12?'AM':'PM');}
function clockText(){return timeText((game.startMinutes??startMinutes)+game.time/2.5);}
function cycleSetting(kind,delta){const choices=kind==='time'?[7*60,12*60,16*60,18*60,22*60]:['light','normal','rush','gridlock'],current=kind==='time'?startMinutes:trafficPreset,index=(choices.indexOf(current)+delta+choices.length)%choices.length,oldIndex=menuIndex,oldMode=mode;if(kind==='time')startMinutes=choices[index];else trafficPreset=choices[index];if(oldMode==='title')newCity(seed);showMenu(oldMode);menuIndex=oldIndex;renderMenu();}
function drawLabels(matrix,car){ctx.save();ctx.textAlign='center';for(const s of city.signs||[]){const d=Math.hypot(s.x-car.x,s.z-car.y);if(d<95||d>780)continue;const p=T.project([s.x,s.y,s.z],matrix,width,height);if(!p||p.x<25||p.x>width-25||p.y<100||p.y>height*.6)continue;ctx.font='bold 10px Arial';const w=ctx.measureText(s.text).width+14;ctx.fillStyle='#253e3cce';ctx.fillRect(p.x-w/2,p.y-10,w,19);ctx.fillStyle='#e7e8ce';ctx.fillText(s.text,p.x,p.y+3);}const b=game.target(),d=E.dist(b,car),p=T.project([b.x,30,b.y],matrix,width,height);if(p&&p.x>30&&p.x<width-30&&p.y>100&&p.y<height*.66&&d<1000){ctx.font='bold 11px Arial';const text=(game.job.stage==='pickup'?'PICKUP':'DROP-OFF')+' · '+Math.round(d*.25)+' m',w=ctx.measureText(text).width+20;ctx.fillStyle=game.job.stage==='pickup'?'#284d54ee':'#625835ee';ctx.fillRect(p.x-w/2,p.y-13,w,24);ctx.fillStyle='#fff1c5';ctx.fillText(text,p.x,p.y+3);}ctx.restore();}
function drawParkingSensor(car){const status=game.parkingStatus();if(!status.near)return;const b=game.target(),w=Math.min(175,width*.2),h=w*.70,x=width-w-30,y=height*.53;ctx.save();ctx.fillStyle='#182e2be8';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#8ca99888';ctx.strokeRect(x+.5,y+.5,w-1,h-1);ctx.fillStyle='#d1dfca';ctx.font='9px Arial';ctx.textAlign='center';ctx.fillText('PARKING GUIDE · FRONT ↑',x+w/2,y+13);ctx.save();ctx.translate(x+w/2,y+h*.57);const scale=w/210,cs=Math.cos(car.a),sn=Math.sin(car.a),dx=b.x-car.x,dz=b.y-car.y,bx=(-sn*dx+cs*dz)*scale,by=-(cs*dx+sn*dz)*scale;ctx.translate(bx,by);ctx.rotate(E.angleDiff(b.a,car.a));ctx.strokeStyle=game.job.stage==='pickup'?'#64d6db':'#f1cf76';ctx.lineWidth=2;ctx.strokeRect(-18*scale,-43*scale,36*scale,86*scale);ctx.beginPath();ctx.moveTo(0,-28*scale);ctx.lineTo(-5*scale,-18*scale);ctx.lineTo(5*scale,-18*scale);ctx.closePath();ctx.fillStyle=ctx.strokeStyle;ctx.fill();ctx.restore();ctx.fillStyle='#e8c567';ctx.fillRect(x+w/2-11*scale,y+h*.57-22*scale,22*scale,44*scale);ctx.fillStyle='#648484';ctx.fillRect(x+w/2-8*scale,y+h*.57-11*scale,16*scale,8*scale);ctx.restore();}
function updateHud(car,now){const b=game.target(),d=E.dist(car,b),p=game.parkingStatus(),stage=game.job.stage;$('stage').textContent=(stage==='pickup'?'PICKUP':'DROP-OFF')+' '+String(game.completed+1).padStart(2,'0');$('destination').textContent=b.place;$('distance').textContent=Math.round(d*.25)+' m';$('timer').textContent=Math.ceil(game.job.timeLeft)+' sec';$('chances').textContent='●'.repeat(Math.max(0,game.reputation))+'○'.repeat(Math.max(0,3-game.reputation));$('street').textContent=b.street;let action='Follow the blue lane',arrow='↑';if(stage==='dropoff')action='Follow the amber lane';if(d<130){action=b.type==='reverse'?'Reverse into the bay':'Pull into the bay';arrow=b.type==='reverse'?'↓':'→';}else if(route.length>2){const next=route.find(pt=>E.dist(pt,car)>100)||route[route.length-1],a=E.angleDiff(Math.atan2(next.y-car.y,next.x-car.x),car.a);if(a<-.4){action='Bear left with the route';arrow='←';}else if(a>.4){action='Bear right with the route';arrow='→';}}$('nav-action').textContent=action;$('nav-arrow').textContent=arrow;$('parking').hidden=!p.near||mode!=='playing';if(p.near){$('parking-title').textContent=b.type==='reverse'?'REVERSE PARKING':(stage==='pickup'?'CURBSIDE PICKUP':'CURBSIDE DROP-OFF');$('parking-detail').textContent=!p.aligned?'Match the bay arrow · steer to align':!p.inside?'Center inside the outline · Shift for slow control':!p.reverse?'Back into the bay · hold S / ↓':!p.stopped?'Space · stop the cab':'Hold still · '+(stage==='pickup'?'rider boarding':'rider stepping out');$('park-progress').style.width=clamp(p.progress*100,0,100)+'%';}$('look-label').hidden=look===0||mode!=='playing';$('look-label').textContent=Math.abs(look)>2?'LOOKING BACK · RELEASE C TO FACE FORWARD':look<0?'LOOKING LEFT · RELEASE Q TO FACE FORWARD':'LOOKING RIGHT · RELEASE E TO FACE FORWARD';const show=latestEvent&&now<eventUntil&&mode==='playing';$('toast').hidden=!show;if(show){$('toast').querySelector('b').textContent=latestEvent.title;$('toast').querySelector('span').textContent=latestEvent.text;}}
function drawMap(){const c=$('map'),r=c.getBoundingClientRect(),dpr=1.5;if(c.width!==Math.round(r.width*dpr)||c.height!==Math.round(r.height*dpr)){c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);}const g=c.getContext('2d'),m=game.map,s=Math.min(c.width/m.w,c.height/m.h),ox=(c.width-m.w*s)/2,oy=(c.height-m.h*s)/2;g.clearRect(0,0,c.width,c.height);g.save();g.translate(ox,oy);g.scale(s,s);g.fillStyle='#577368';g.fillRect(0,0,m.w,m.h);g.strokeStyle='#b0b9a5';g.lineWidth=164;for(const x of m.xs){g.beginPath();g.moveTo(x,120);g.lineTo(x,m.ys[4]+80);g.stroke();}for(const y of [...m.ys,m.hy]){g.beginPath();g.moveTo(90,y);g.lineTo(m.w-90,y);g.stroke();}g.fillStyle='#314e49';for(const b of m.buildings)g.fillRect(b.x,b.y,b.w,b.h);g.fillStyle='#dbc179';g.font='30px Arial';g.textAlign='center';for(const l of m.landmarks){g.fillRect(l.x,l.y,l.w,l.h);g.fillStyle='#fff9cf';g.fillText(l.label,l.x+l.w/2,l.y-10);g.fillStyle='#dbc179';}g.strokeStyle='#50cbdd';g.lineWidth=12;g.beginPath();route.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();const b=game.target();g.strokeStyle='#ffe077';g.lineWidth=8;g.strokeRect(b.x-32,b.y-32,64,64);g.translate(game.car.x,game.car.y);g.rotate(game.car.a);g.fillStyle='#ffe786';g.beginPath();g.moveTo(40,0);g.lineTo(-24,-23);g.lineTo(-24,23);g.closePath();g.fill();g.restore();}
function toggleSound(){if(window.TaxiAudio){audio??=new TaxiAudio();soundOn=audio.toggle();}else soundOn=false;note(soundOn?'SOUND ON · H HORN':'SOUND MUTED');}
function upcomingTurn(){
 if(route.length<3)return false;const c=game.car,cs=Math.cos(c.a),sn=Math.sin(c.a);
 for(const n of game.map.nodes){const dx=n.x-c.x,dy=n.y-c.y,along=dx*cs+dy*sn,across=Math.abs(-dx*sn+dy*cs);if(along<18||along>240||across>82)continue;let closest=-1,distance=Infinity;for(let i=0;i<route.length;i++){const d=E.dist(route[i],n);if(d<distance){distance=d;closest=i;}}if(distance>95)continue;let j=closest;while(j<route.length-1&&E.dist(route[j],n)<125)j++;const end=route[j];if(E.dist(end,n)<110)continue;const turn=E.angleDiff(Math.atan2(end.y-n.y,end.x-n.x),c.a);if(Math.abs(turn)>.55&&Math.abs(turn)<2.5)return{direction:turn<0?'left':'right',distance:along,id:n.id};}
 return false;
}
function updateAudio(car){if(audio){audio.update({speed:car.speed,playing:mode==='playing'&&!document.hidden,turnAhead:upcomingTurn()});soundOn=audio.enabled;}}
window.__taxi3d={get state(){return{mode,seed,startMinutes:game?.startMinutes??startMinutes,trafficPreset:game?.trafficPreset||trafficPreset,time:game?.time,car:game?{...game.car}:null,job:game?{stage:game.job.stage,pickup:game.job.pickup,dropoff:game.job.dropoff,timeLeft:game.job.timeLeft}:null,target:game?.target(),cash:game?.cash,health:game?.health,completed:game?.completed,reputation:game?.reputation,traffic:game?.traffic.length,trafficDensity:trafficDirector?.summary(),stats:game?{...game.stats}:null,parking:game?.parkingStatus(),software,lowPower,soundOn,menuIndex};},render:{}};
world.addEventListener('webglcontextlost',e=>{e.preventDefault();keys.clear();mode='unsupported';$('unsupported').hidden=false;for(const id of ['menu','hud','map-panel','handbook'])$(id).hidden=true;if(audio)audio.update({speed:0,playing:false,turnAhead:false});$('error-copy').textContent='The browser lost its 3D connection. Reload to start a fresh shift, or use the 2D edition.';});
init();
})();
