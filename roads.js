/* Shared, deterministic road surfaces. Engine (x,y) is world (x,height,z).
   Ramp centre-lines are also the engine's containment polylines: one topology,
   a real smooth ascent, a level acceleration lane, and a lane-aligned taper. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TaxiRoads=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const VERSION=4,RAMP_HALF=37,HIGHWAY_HALF=76;
  function smooth(t){t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));}
  function smoothSlope(t){if(t<=0||t>=1)return 0;return 30*t*t*(1-t)*(1-t);}
  function configure(map){
    if(map._elevatedRoadVersion===VERSION&&map.roadProfiles)return map;
    const z0=map.ys[map.ys.length-1];
    map.hy=Math.max(map.hy||0,z0+820);map.h=Math.max(map.h||0,map.hy+240);
    map.highwayHeight=65;map.highwayStart=map.xs[0]+130;map.highwayEnd=map.xs[map.xs.length-1]-130;
    map.highwayHalf=HIGHWAY_HALF;map.rampHalf=RAMP_HALF;
    const radius=250,acceleration=1300,taper=360,profiles=[];
    for(let index=0;index<4;index++){
      const east=index%2===1,kind=index<2?'entry':'exit',travelDir=kind==='entry'?1:-1;
      const dir=east?-1:1,side=dir*travelDir,x0=map.xs[east?map.xs.length-1:0]+(kind==='entry'?-38:38);
      // Eastbound enters from beyond the west end of the divided viaduct.
      // Westbound enters directly from its north shoulder. Neither crosses lanes.
      const laneZ=map.hy+side*53,accelZ=map.hy+side*108;
      const curveStartZ=accelZ-radius,straight=Math.max(1,curveStartZ-z0),arc=radius*Math.PI/2;
      const turnEnd=straight+arc,total=turnEnd+acceleration+taper;
      // Eastbound slip roads cross beneath both carriageways, then climb
      // along the outboard acceleration lane. Intermediate interchanges must
      // never cut through the expressway median at deck height.
      const riseStart=side===1?turnEnd+40:110,riseEnd=side===1?turnEnd+acceleration-40:turnEnd-50;
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
    // Lake Shore is a separate, genuinely drivable surface beneath the deck.
    // Keep the old grid coordinates and ramp mouths intact; only interior
    // avenues continue south, so a straight trip cannot wander onto a ramp.
    const half=map.roadHalf||82,minX=120,maxX=map.xs[map.xs.length-1]+100;
    map.waterfront={lakeShoreZ:map.hy,shoreZ:map.hy+285,waterZ:map.hy+285,minX,maxX};
    map.h=Math.max(map.h,map.waterfront.shoreZ+100);
    map.groundRoads=[{id:'lake-shore',name:'Lake Shore Boulevard',x1:minX,z1:map.hy,x2:maxX,z2:map.hy,halfWidth:half}];
    for(let i=1;i<map.xs.length-1;i++)map.groundRoads.push({id:'waterfront-'+i,name:(map.avenues||[])[i]||'Waterfront Avenue',x1:map.xs[i],z1:z0,x2:map.xs[i],z2:map.hy,halfWidth:half,gridCol:i});
    // Place supports between avenues, outside the roadway and its pavements.
    // Every solid shares this collision/mesh record; nothing invisible sits
    // across a traffic lane or a junction.
    map.highwayPiers=[];map.rampPiers=[];map.groundColliders=[];
    for(let i=0;i<map.xs.length-1;i++)for(const fraction of [.35,.65]){
      const x=map.xs[i]+(map.xs[i+1]-map.xs[i])*fraction;
      if(x<map.highwayStart+10||x>map.highwayEnd-10)continue;
      // A slip road can now pass under the continuous regional viaduct.
      // Omit piers beside its envelope, including a full bus body.
      if(profiles.some(p=>[-108,108].some(off=>{const hit=project(p,x,map.hy+off),q=pointAt(p,hit.s);return hit.distance<q.halfWidth+24&&q.height<map.highwayHeight-1;})))continue;
      map.highwayPiers.push({x,z:map.hy,offset:108,width:10,depth:13,height:map.highwayHeight-8.7});
      for(const side of [-1,1])map.groundColliders.push({x:x-5,y:map.hy+side*108-6.5,w:10,h:13,height:0,minHeight:0,maxHeight:map.highwayHeight-8.7,kind:'bridge pier'});
    }
    for(const p of profiles)for(let s=370;s<p.turnEnd+p.acceleration;s+=220){
      const q=pointAt(p,s);if(q.height<12)continue;
      // The upper ramp can pass over an avenue, but its pier never occupies it.
      if(map.groundRoads.some(g=>groundRoadContains(g,q.x,q.z,14)))continue;
      map.rampPiers.push({rampIndex:p.index,s,x:q.x,z:q.z,height:q.height});
      map.groundColliders.push({x:q.x-4,y:q.z-4.5,w:8,h:9,height:0,minHeight:0,maxHeight:q.height-7.7,kind:'ramp pier'});
    }
    // A low, visible quay wall keeps wheels on dry land; water remains scenery.
    map.groundColliders.push({x:43,y:map.waterfront.shoreZ-4,w:map.w-86,h:8,height:0,minHeight:0,maxHeight:8,kind:'quay wall'});
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
  function groundRoadContains(g,x,z,pad=0){
    const h=g.halfWidth+pad;
    return Math.abs(g.z2-g.z1)<.001?x>=Math.min(g.x1,g.x2)&&x<=Math.max(g.x1,g.x2)&&Math.abs(z-g.z1)<=h:
      z>=Math.min(g.z1,g.z2)&&z<=Math.max(g.z1,g.z2)&&Math.abs(x-g.x1)<=h;
  }
  function isSurfaceStreet(map,x,z){
    if(map.regional)return map.districts.some(d=>isSurfaceStreet(d,x,z));
    const half=map.roadHalf||82,lastZ=map.ys[map.ys.length-1];
    return (z>120&&z<lastZ+half&&map.xs.some(v=>Math.abs(x-v)<half))||
      (x>(map.minStreetX||120)&&x<map.xs[map.xs.length-1]+100&&map.ys.some(v=>Math.abs(z-v)<half))||
      (map.bays||[]).some(b=>Math.abs(x-b.x)<126&&z>b.roadY&&z<b.roadY+180)||
      (map.groundRoads||[]).some(g=>groundRoadContains(g,x,z));
  }
  function sampleRoad(map,x,z,previous){
    configure(map);
    // Previous samples are an explicit layer history. An unseeded lookup may
    // inspect the top road, but an established ground car stays beneath it.
    // Far relocations are debug/recovery placements, not physics movement.
    const history=previous&&(!Number.isFinite(previous.x)||!Number.isFinite(previous.z)||Math.hypot(x-previous.x,z-previous.z)<200)?previous:null;
    const highway=x>=map.highwayStart&&x<=map.highwayEnd&&Math.abs(z-map.hy)<=HIGHWAY_HALF;
    const hits=[];
    for(const p of map.roadProfiles){
      const minX=Math.min(p.x0,p.x0+p.dir*(p.radius+p.acceleration+p.taper))-RAMP_HALF;
      const maxX=Math.max(p.x0,p.x0+p.dir*(p.radius+p.acceleration+p.taper))+RAMP_HALF;
      if(x<minX||x>maxX||z<p.z0-RAMP_HALF||z>Math.max(p.accelZ,p.laneZ)+RAMP_HALF)continue;
      const hit=project(p,x,z),q=pointAt(p,hit.s);if(hit.distance>q.halfWidth+.001)continue;
      if(history&&history.layer==='ground'&&(q.height>.04||hit.s>p.riseStart+10))continue;
      if(history&&history.layer==='highway'&&q.height<map.highwayHeight-.5)continue;
      if(history&&history.layer==='ramp'&&history.rampIndex!==p.index&&Math.abs(q.height-history.height)>1)continue;
      hits.push({p,hit,q});
    }
    hits.sort((a,b)=>{
      if(history&&history.layer==='ramp'){
        const ownA=a.p.index===history.rampIndex,ownB=b.p.index===history.rampIndex;
        if(ownA!==ownB)return ownA?-1:1;
      }
      return a.hit.distance-b.hit.distance;
    });
    const chosen=hits[0];
    if(chosen){const {p,hit,q}=chosen;
      return{x,z,height:q.height,grade:q.grade,pitch:Math.atan(q.grade),forward:q.forward,gradient:{x:q.dx*q.grade,z:q.dz*q.grade},layer:'ramp',rampIndex:p.index,rampKind:p.kind,travelDir:p.travelDir,distanceAlong:hit.s,lateralDistance:hit.distance,onRoad:true};
    }
    const deckAllowed=!history||history.layer==='highway'||history.layer==='ramp'&&history.height>=map.highwayHeight-.5;
    if(highway&&deckAllowed)return{x,z,height:map.highwayHeight,grade:0,pitch:0,forward:{x:z>=map.hy?1:-1,y:0,z:0},gradient:{x:0,z:0},layer:'highway',rampIndex:null,distanceAlong:x-map.highwayStart,lateralDistance:Math.abs(z-map.hy),onRoad:true};
    return{x,z,height:0,grade:0,pitch:0,forward:{x:1,y:0,z:0},gradient:{x:0,z:0},layer:'ground',rampIndex:null,distanceAlong:0,lateralDistance:0,onRoad:isSurfaceStreet(map,x,z)};
  }
  // Supply the existing grid navigator with an honest surface-road prefix.
  // It uses curb-lane Bezier turns, never a diagonal shortcut across the lots.
  function surfaceRouteToGrid(map,from,to){
    configure(map);const z0=map.ys[map.ys.length-1],half=map.roadHalf||82;
    if(from.y<=z0+half||from.roadLayer==='highway'||from.roadLayer==='ramp')return[];
    const avenues=map.groundRoads.filter(g=>g.gridCol!==undefined),points=[];
    const push=(x,y,a)=>{const p={x,y,height:0,roadLayer:'ground'};if(Number.isFinite(a))p.a=a;if(!points.length||Math.hypot(x-points.at(-1).x,y-points.at(-1).y)>.1)points.push(p);};
    const angle=Number.isFinite(from.a)?from.a:-Math.PI/2,dir=Math.cos(angle)>=0?1:-1;
    const onAvenue=avenues.reduce((a,b)=>Math.abs(b.x1-from.x)<Math.abs(a.x1-from.x)?b:a,avenues[0]);
    const onConnector=Math.abs(from.x-onAvenue.x1)<=half&&from.y<map.hy-half;
    const lane=56,turn=118;
    function corner(ax,az,cx,cz,bx,bz){
      // Tangent control points preserve the full-size bus turning envelope.
      const d1=Math.hypot(cx-ax,cz-az),d2=Math.hypot(bx-cx,bz-cz),bend=34.25;
      const p1={x:ax+(cx-ax)/d1*bend,z:az+(cz-az)/d1*bend},p2={x:bx-(bx-cx)/d2*bend,z:bz-(bz-cz)/d2*bend};
      for(let k=1;k<=20;k++){const t=k/20,u=1-t;push(u*u*u*ax+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*bx,u*u*u*az+3*u*u*t*p1.z+3*u*t*t*p2.z+t*t*t*bz);}
    }
    push(from.x,from.y,angle);
    if(onConnector&&Math.sin(angle)<.2){
      // A northbound surface avenue reconnects directly to its old grid lane.
      push(onAvenue.x1+lane,Math.max(z0-140,from.y-120),-Math.PI/2);push(onAvenue.x1+lane,z0-140,-Math.PI/2);return points;
    }
    let travel=dir,exit;
    if(onConnector){
      const i=avenues.indexOf(onAvenue),prefer=to&&to.x<onAvenue.x1?-1:1;travel=prefer;
      if(!avenues[i+travel])travel=-travel;exit=avenues[i+travel];
      const x=onAvenue.x1-lane;push(x,map.hy-turn,Math.PI/2);
      corner(x,map.hy-turn,x,map.hy+travel*lane,onAvenue.x1+travel*turn,map.hy+travel*lane);
    }else{
      exit=avenues.filter(g=>(g.x1-from.x)*travel>turn).sort((a,b)=>(a.x1-b.x1)*travel)[0];
      if(!exit){
        // At a road end, turn around in the open terminal section of Lake Shore.
        travel=-travel;exit=avenues.filter(g=>(g.x1-from.x)*travel>turn).sort((a,b)=>(a.x1-b.x1)*travel)[0]||onAvenue;
        const centerX=clamp(from.x,map.waterfront.minX+90,map.waterfront.maxX-90),start=-travel*Math.PI/2;
        for(let k=1;k<=24;k++){const a=start-k/24*Math.PI;push(centerX+Math.cos(a)*lane,map.hy+Math.sin(a)*lane);}
      }
    }
    const approachX=exit.x1-travel*turn,approachZ=map.hy+travel*lane;
    push(approachX,approachZ,travel>0?0:Math.PI);
    corner(approachX,approachZ,exit.x1+lane,approachZ,exit.x1+lane,map.hy-turn);
    push(exit.x1+lane,z0-140,-Math.PI/2);return points;
  }
  function isRoad(map,x,z){return sampleRoad(map,x,z).onRoad;}
  return{configure,sampleRoad,isRoad,isSurfaceStreet,groundRoadContains,surfaceRouteToGrid,pointAt,travelPointAt,elevation,project,smooth,smoothSlope,RAMP_HALF,HIGHWAY_HALF};
});
