const assert=require('node:assert/strict'),E=require('./engine3d.js'),R=require('./roads.js'),H=require('./highway.js');
const g=new E.Game(),m=g.map;
assert.equal(m.districts.length,3);assert.equal(m.roadProfiles.length,12);assert.equal(m.bays.length,109);assert.equal(m.nodes.length,128);
// Every route point and segment sample must occupy the declared surface layer.
function audit(from,to,label){const route=E.route(m,from,to);let bad=[],length=0;for(let k=1;k<route.length;k++){const a=route[k-1],b=route[k],L=E.dist(a,b);length+=L;for(let t=0;t<=1;t+=Math.min(1,8/Math.max(L,1))){const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,expected=(a.height||0)+((b.height||0)-(a.height||0))*t;const q=R.sampleRoad(m,x,y,{x,z:y,layer:a.roadLayer||b.roadLayer||'ground',height:expected,rampIndex:a.rampIndex??b.rampIndex});if(!q.onRoad||Math.abs(q.height-expected)>4)bad.push({k,x,y,expected,q});}}
 console.log(label,{points:route.length,metres:Math.round(length/10),bad:bad.length});if(bad.length)console.log(bad.slice(0,5));assert.equal(bad.length,0,label+' road continuity');return route;}
for(const a of m.districts)for(const b of m.districts){const from=a.bays[10],to=b.bays[15];audit({x:from.x,y:from.roadY+56,a:0,roadLayer:'ground'},to,a.name+' -> '+b.name);}
// There must be no fake surface shortcuts joining towns.
for(const x of [6000,10000,19000,24000])for(const y of m.ys)assert.equal(R.isSurfaceStreet(m,x,y),false);
for(const p of m.roadProfiles){for(let s=0;s<=p.total;s+=5){const q=R.pointAt(p,s);assert(q.height>=0&&q.height<=65);const sample=R.sampleRoad(m,q.x,q.z,{x:q.x,z:q.z,layer:'ramp',height:q.height,rampIndex:p.index});assert(Math.abs(q.height-sample.height)<.1);}}
const under=R.sampleRoad(m,m.xs[2],m.hy,{layer:'ground',height:0});const dq=H.at(m,m.xs[2],152),deck=R.sampleRoad(m,dq.x,dq.y,{layer:'highway',height:65});assert.equal(under.height,0);assert.equal(deck.height,65);
for(const busRoute of m.busRoutes){let previous=busRoute.stops.at(-1);for(const stop of busRoute.stops){audit({x:previous.x,y:previous.y,a:previous.a,roadLayer:'ground'},stop,busRoute.id+' '+previous.place+' -> '+stop.place);previous=stop;}}
for(const x of [500,7000,15000,22000,29200])for(const dir of[-1,1])audit({...H.at(m,x,dir*152),a:H.at(m,x,dir*152).a+(dir===1?0:Math.PI),roadLayer:'highway',height:65},m.bays[11],'highway '+x+' '+dir+' -> Toronto');
console.log('PASS region graph, ramp layers, routes, no surface shortcuts');
