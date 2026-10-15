/* Shared, deterministic road surfaces. Engine (x,y) is world (x,height,z).
   Ramp centre-lines are also the engine's containment polylines: one topology,
   a real smooth ascent, a level acceleration lane, and a lane-aligned taper. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TaxiRoads=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const VERSION=2,RAMP_HALF=37,HIGHWAY_HALF=76;
  function smooth(t){t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));}
  function smoothSlope(t){if(t<=0||t>=1)return 0;return 30*t*t*(1-t)*(1-t);}
  function configure(map){
    if(map._elevatedRoadVersion===VERSION&&map.roadProfiles)return map;
    const z0=map.ys[map.ys.length-1];
    map.hy=Math.max(map.hy||0,z0+820);map.h=Math.max(map.h||0,map.hy+240);
    map.highwayHeight=32;map.highwayStart=map.xs[0]+130;map.highwayEnd=map.xs[map.xs.length-1]-130;
    map.highwayHalf=HIGHWAY_HALF;map.rampHalf=RAMP_HALF;
    const radius=250,acceleration=430,taper=360,profiles=[];
    for(let index=0;index<4;index++){
      const east=index%2===1,kind=index<2?'entry':'exit',travelDir=kind==='entry'?1:-1;
      const dir=east?-1:1,side=dir*travelDir,x0=map.xs[east?map.xs.length-1:0]+(kind==='entry'?-38:38);
      // Eastbound enters from beyond the west end of the divided viaduct.
      // Westbound enters directly from its north shoulder. Neither crosses lanes.
      const laneZ=map.hy+side*53,accelZ=map.hy+side*108;
      const curveStartZ=accelZ-radius,straight=Math.max(1,curveStartZ-z0),arc=radius*Math.PI/2;
      const turnEnd=straight+arc,total=turnEnd+acceleration+taper;
      const riseStart=110,riseEnd=turnEnd-(side===1?160:50);
      const profile={index,kind,travelDir,dir,side,x0,z0,radius,straight,arc,turnEnd,acceleration,taper,total,riseStart,riseEnd,laneZ,accelZ,halfWidth:RAMP_HALF,height:map.highwayHeight,points:[]};
      // Explicit transition vertices prevent any segment from straddling joins.
      const joins=[0,riseStart,straight,turnEnd,riseEnd,turnEnd+acceleration,total].sort((a,b)=>a-b);
      const lengths=[];for(let k=1;k<joins.length;k++){
        const a=joins[k-1],b=joins[k];if(b-a<.001)continue;
        const n=Math.ceil((b-a)/20);if(!lengths.length)lengths.push(a);
        for(let j=1;j<=n;j++)lengths.push(a+(b-a)*j/n);
      }
      profile.points=lengths.map(s=>pointAt(profile,s));
      profile.highwayDir=side;profile.surfaceNodeId=(map.ys.length-1)*map.xs.length+(east?map.xs.length-1:0);
      // Mesh/surface points always run from ground to deck. Navigation follows
      // travelPoints, reversed on exits so drivers descend into northbound lanes.
      profile.travelPoints=travelDir===1?profile.points:[...profile.points].reverse();
      const join=profile.points[profile.points.length-1];profile.highwayJoin={x:join.x,y:join.z};
      profiles.push(profile);
    }
    map.roadProfiles=profiles;map.ramps=profiles.map(p=>p.points.map(q=>({x:q.x,y:q.z})));
    map._elevatedRoadVersion=VERSION;return map;
  }
  function elevation(profile,s){const length=profile.riseEnd-profile.riseStart,t=(s-profile.riseStart)/length;return{height:profile.height*smooth(t),grade:profile.height*smoothSlope(t)/length};}
  function pointAt(p,s){
    s=clamp(s,0,p.total);let x,z,dx,dz;
    if(s<=p.straight){x=p.x0;z=p.z0+s;dx=0;dz=1;}
    else if(s<=p.turnEnd){const a=(s-p.straight)/p.radius;x=p.x0+p.dir*p.radius*(1-Math.cos(a));z=p.z0+p.straight+p.radius*Math.sin(a);dx=p.dir*Math.sin(a);dz=Math.cos(a);}
    else{const d=s-p.turnEnd;x=p.x0+p.dir*(p.radius+d);const t=(d-p.acceleration)/p.taper;z=p.accelZ+(p.laneZ-p.accelZ)*smooth(t);dx=p.dir;dz=(p.laneZ-p.accelZ)*smoothSlope(t)/p.taper;const n=Math.hypot(dx,dz);dx/=n;dz/=n;}
    const e=elevation(p,s),norm=Math.hypot(1,e.grade);
    const halfWidth=p.halfWidth-16*smooth((s-p.turnEnd-p.acceleration)/p.taper);
    return{x,z,s,height:e.height,grade:e.grade,halfWidth,dx,dz,nx:-dz,nz:dx,forward:{x:dx/norm,y:e.grade/norm,z:dz/norm}};
  }
  function travelPointAt(profile,distance){
    const q=pointAt(profile,profile.travelDir===1?distance:profile.total-distance),dir=profile.travelDir;
    return{...q,grade:q.grade*dir,dx:q.dx*dir,dz:q.dz*dir,nx:q.nx*dir,nz:q.nz*dir,forward:{x:q.forward.x*dir,y:q.forward.y*dir,z:q.forward.z*dir},travelDistance:clamp(distance,0,profile.total)};
  }
  function project(profile,x,z){
    let best=null,best2=Infinity;
    const a=profile.points;
    for(let k=1;k<a.length;k++){
      const p=a[k-1],q=a[k],dx=q.x-p.x,dz=q.z-p.z,len2=dx*dx+dz*dz;
      const t=clamp(((x-p.x)*dx+(z-p.z)*dz)/(len2||1),0,1),px=p.x+dx*t,pz=p.z+dz*t,d2=(x-px)*(x-px)+(z-pz)*(z-pz);
      if(d2<best2){best2=d2;best={segment:k-1,t,distance:Math.sqrt(d2),s:p.s+(q.s-p.s)*t,x:px,z:pz};}
    }
    return best;
  }
  function isSurfaceStreet(map,x,z){
    const half=map.roadHalf||82,lastZ=map.ys[map.ys.length-1];
    return (z>120&&z<lastZ+half&&map.xs.some(v=>Math.abs(x-v)<half))||
      (x>120&&x<map.xs[map.xs.length-1]+100&&map.ys.some(v=>Math.abs(z-v)<half))||
      map.bays.some(b=>Math.abs(x-b.x)<126&&z>b.roadY&&z<b.roadY+180);
  }
  function sampleRoad(map,x,z,previous){
    configure(map);
    const highway=x>=map.highwayStart&&x<=map.highwayEnd&&Math.abs(z-map.hy)<=HIGHWAY_HALF;
    let chosen=null;
    for(const p of map.roadProfiles){
      // Broad phase avoids scanning the whole ramp when rendering distant cars.
      const minX=Math.min(p.x0,p.x0+p.dir*(p.radius+p.acceleration+p.taper))-RAMP_HALF;
      const maxX=Math.max(p.x0,p.x0+p.dir*(p.radius+p.acceleration+p.taper))+RAMP_HALF;
      if(x<minX||x>maxX||z<p.z0-RAMP_HALF||z>Math.max(p.accelZ,p.laneZ)+RAMP_HALF)continue;
      const hit=project(p,x,z);if(hit.distance>pointAt(p,hit.s).halfWidth+.001)continue;
      if(!chosen||hit.distance<chosen.hit.distance-.1||Math.abs(hit.distance-chosen.hit.distance)<.1&&previous&&previous.rampIndex===p.index)chosen={p,hit};
    }
    if(chosen){const p=chosen.p,hit=chosen.hit,q=pointAt(p,hit.s);
      return{height:q.height,grade:q.grade,pitch:Math.atan(q.grade),forward:q.forward,gradient:{x:q.dx*q.grade,z:q.dz*q.grade},layer:'ramp',rampIndex:p.index,rampKind:p.kind,travelDir:p.travelDir,distanceAlong:hit.s,lateralDistance:hit.distance,onRoad:true};
    }
    if(highway)return{height:map.highwayHeight,grade:0,pitch:0,forward:{x:z>=map.hy?1:-1,y:0,z:0},gradient:{x:0,z:0},layer:'highway',rampIndex:null,distanceAlong:x-map.highwayStart,lateralDistance:Math.abs(z-map.hy),onRoad:true};
    return{height:0,grade:0,pitch:0,forward:{x:1,y:0,z:0},gradient:{x:0,z:0},layer:'ground',rampIndex:null,distanceAlong:0,lateralDistance:0,onRoad:isSurfaceStreet(map,x,z)};
  }
  function isRoad(map,x,z){return sampleRoad(map,x,z).onRoad;}
  return{configure,sampleRoad,isRoad,pointAt,travelPointAt,elevation,project,smooth,smoothSlope,RAMP_HALF,HIGHWAY_HALF};
});
