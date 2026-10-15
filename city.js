/* Toronto Taxi / cockpit edition: deterministic, texture-free static city.
   Engine (x,y) is rendered as world (x,height,z). No simulation is changed. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const C = {
    ground:'#b6b6a0', paving:'#d2d0ba', curb:'#e7e1ce', seam:'#b6b7a6',
    asphalt:'#596269', highway:'#515d66', bay:'#68737a', white:'#f1edda',
    yellow:'#f1c865', ink:'#233b49', metal:'#53686c', glass:'#719fa9',
    grass:'#91b476', grassDark:'#80a46a', foliage:'#548c66', foliageLight:'#79a76c',
    water:'#6ab0bf', waterLight:'#83c6ce', wood:'#ae8257'
  };
  function random(seed) {
    let a=seed>>>0;
    return function () { a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296; };
  }
  function tint(hex, amount) {
    if (Array.isArray(hex)) return hex.map(v=>Math.max(0,Math.min(1,v*amount)));
    const n=parseInt(hex.slice(1),16);
    return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255].map(v=>Math.max(0,Math.min(1,v*amount)));
  }
  function enrich(map) {
    if(map._depthCity)return;map._depthCity=true;
    // Corner lots flank each parking apron. All actual solids are registered with physics.
    for(let j=0;j<map.ys.length-1;j++)for(let i=0;i<map.xs.length-1;i++){
      if(map.landmarks.some(l=>l.col===i&&l.row===j))continue;
      const bay=map.bays.find(b=>b.col===i&&b.row===j);if(!bay)continue;
      const left=map.xs[i]+108,right=map.xs[i+1]-108;
      const lots=[[left,bay.x-142],[bay.x+142,right]];
      for(let k=0;k<lots.length;k++){
        const [x,end]=lots[k],w=end-x;if(w<32)continue;
        const b={x,y:map.ys[j]+108,w,h:100,color:(i+j+k)%6,roof:(i+j)%3,urban:true};
        if(map.buildings.some(o=>b.x<o.x+o.w+10&&b.x+b.w>o.x-10&&b.y<o.y+o.h+10&&b.y+b.h>o.y-10))continue;
        map.buildings.push(b);
      }
    }
  }
  function build(map) {
    if (!root.Taxi3D || !root.Taxi3D.Mesh) throw new Error('TaxiCity requires Taxi3D.Mesh.');
    if(root.TaxiRoads)root.TaxiRoads.configure(map);
    enrich(map);
    const mesh=new root.Taxi3D.Mesh(), signs=[], r=random((map.seed||8427)^0x51C170);
    mesh.underRoad=[];mesh.roadMap=map;
    const stats={seed:map.seed||8427,buildings:0,skyscrapers:0,tallestBuilding:0,backgroundBuildings:0,trees:0,lamps:0,shelters:0,landmarks:0,roadSegments:0,crosswalks:0,elevatedRoads:0,ramps:0,bridgePiers:0,busStops:0};
    const xs=map.xs, zs=map.ys, lastX=xs.length-1, lastZ=zs.length-1, RH=map.roadHalf||82, SH=map.sidewalkHalf||94;
    const shore=map.h-65;
    function rect(x,z,w,d,y,col) { if(w<=0||d<=0)return;mesh.quad([x,y,z],[x,y,z+d],[x+w,y,z+d],[x+w,y,z],col); }
    function box(x,y,z,w,h,d,col,yaw) { mesh.box(x,y,z,w,h,d,col,yaw||0); }
    function line(ax,az,bx,bz,w,y,col) { mesh.line(ax,az,bx,bz,w,y,col); }
    function disc(x,y,z,rx,rz,col,n=16) {
      for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;mesh.tri([x,y,z],[x+Math.cos(b)*rx,y,z+Math.sin(b)*rz],[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],col);}
    }
    function ovalBand(x,z,y0,y1,rx0,rz0,rx1,rz1,col,n=20) {
      for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n,c=tint(col,.88+.12*Math.max(0,Math.cos(a-.6)));mesh.quad([x+Math.cos(a)*rx0,y0,z+Math.sin(a)*rz0],[x+Math.cos(b)*rx0,y0,z+Math.sin(b)*rz0],[x+Math.cos(b)*rx1,y1,z+Math.sin(b)*rz1],[x+Math.cos(a)*rx1,y1,z+Math.sin(a)*rz1],c);}
    }
    function streetSign(x,z,y,text,col) { signs.push({x,y,z,text,color:col||C.ink}); }
    function lamp(x,z,rotation=0) {
      const h=49,dx=Math.cos(rotation),dz=Math.sin(rotation);
      box(x,2,z,4,4,4,C.metal);
      box(x,h/2,z,1.6,h,1.6,C.metal);
      box(x+dx*6,h-1,z+dz*6,13,1.5,1.5,C.metal,rotation);
      box(x+dx*12,h-2.5,z+dz*12,8,2,4,C.white,rotation);
      stats.lamps++;
    }
    function tree(x,z,size=1) {
      const h=25*size,rad=14*size,base=10*size,n=7;
      // Two seven-sided foliage rings give a crisp silhouette with only 42 triangles.
      box(x,base*.75,z,2.8*size,base*1.5,2.8*size,'#836c51');
      ovalBand(x,z,base,base+h*.42,rad*.35,rad*.35,rad,rad,C.foliage,n);
      ovalBand(x,z,base+h*.42,base+h*.8,rad,rad,rad*.62,rad*.62,C.foliageLight,n);
      ovalBand(x,z,base+h*.8,base+h,rad*.62,rad*.62,0,0,'#8db579',n);
      stats.trees++;
    }
    function bench(x,z,yaw=0) {
      box(x,4,z,19,2,5,C.wood,yaw);
      const dx=Math.sin(yaw)*2.6,dz=-Math.cos(yaw)*2.6;
      box(x+dx,7,z+dz,19,5,1.5,C.wood,yaw);
      for(const s of [-1,1]) box(x+Math.cos(yaw)*s*7,1.7,z+Math.sin(yaw)*s*7,2,3.4,4,C.metal,yaw);
    }
    function shelter(x,z) {
      box(x,1,z,44,1.2,15,C.curb);
      box(x,25,z,46,2,17,C.ink);
      for(const dx of [-20,20])for(const dz of [-6,6])box(x+dx,12,z+dz,1.3,24,1.3,C.metal);
      box(x,13,z+6,39,19,0.8,'#8fb8bb');
      box(x+20,13,z,0.8,19,12,'#89adb2');
      bench(x,z+1);
      box(x-27,16,z,1.6,32,1.6,C.metal);
      box(x-27,29,z,7,8,1.5,'#c85849');
      stats.shelters++;
    }
    function dash(ax,az,bx,bz,width,y,col,span=24,gap=23) {
      const len=Math.hypot(bx-ax,bz-az);if(len<1)return;
      const dx=(bx-ax)/len,dz=(bz-az)/len;
      for(let t=5;t<len-4;t+=span+gap){const e=Math.min(t+span,len-4);line(ax+dx*t,az+dz*t,ax+dx*e,az+dz*e,width,y,col);}
    }
    function arrow(x,z,yaw,col=C.white) {
      const dx=Math.cos(yaw),dz=Math.sin(yaw),nx=-dz,nz=dx;
      function p(a,b){return [x+dx*a+nx*b,.065,z+dz*a+nz*b];}
      mesh.quad(p(-12,-1.3),p(-12,1.3),p(4,1.3),p(4,-1.3),col);
      mesh.tri(p(13,0),p(2,-5.7),p(2,5.7),col);
    }
    function marks(ax,az,bx,bz) {
      const len=Math.hypot(bx-ax,bz-az),dx=(bx-ax)/len,dz=(bz-az)/len,nx=-dz,nz=dx;
      function side(off){return [ax+nx*off,az+nz*off,bx+nx*off,bz+nz*off];}
      for(const off of [-2,2])line(...side(off),1.4,.04,C.yellow);
      for(const off of [-38,38])dash(...side(off),1.7,.05,C.white,22,24);
      for(const off of [-79,79])line(...side(off),1.3,.04,'#cbd0c6');
      if(len>130){const a=Math.atan2(dz,dx);for(const off of [20,56]){arrow(bx-dx*36+nx*off,bz-dz*36+nz*off,a);arrow(ax+dx*36-nx*off,az+dz*36-nz*off,a+Math.PI);}}
    }
    function curbRun(ax,az,bx,bz) {line(ax,az,bx,bz,2.1,.48,C.curb);}
    function crosswalk(n,dir) {
      const horizontal=dir==='E'||dir==='W',sg=dir==='E'||dir==='S'?1:-1;
      for(let off=-72;off<76;off+=12){
        if(horizontal)rect(n.x+sg*100-6,n.y+off,12,6,.06,C.white);
        else rect(n.x+off,n.y+sg*100-6,6,12,.06,C.white);
      }
      // Only the inbound half gets a stop line. Engine reserves turns at 118 units.
      if(horizontal)rect(n.x+sg*116-1.5,n.y+(sg>0?-76:2),3,74,.07,C.white);
      else rect(n.x+(sg>0?2:-76),n.y+sg*116-1.5,74,3,.07,C.white);
      stats.crosswalks++;
    }
    // A quiet warm-grey ground plane and a long blue horizon prevent visible world edges.
    rect(-1800,-1500,map.w+3600,shore+1500,-.7,C.ground);
    rect(-6000,shore, map.w+12000,11000,-1.1,C.water);
    rect(-500,shore-10,map.w+1000,10,-.08,'#b7c7bb');
    for(let k=0;k<50;k++){
      const x=-500+r()*(map.w+1000),z=shore+75+r()*2600;
      rect(x,z,45+r()*200,1.2+r()*2.2,-1.04,k%3?C.waterLight:'#5da7b8');
    }
    // Block paving stays below the curb and never replaces a drivable road or bay.
    for(let j=0;j<lastZ;j++)for(let i=0;i<lastX;i++){
      const x=xs[i]+RH,z=zs[j]+RH,w=xs[i+1]-xs[i]-RH*2,d=zs[j+1]-zs[j]-RH*2;
      rect(x,z,w,d,-.15,(i+j)%3===0?'#c6c7b3':C.paving);
      // North-of-road pavement is continuous. South-of-road pavement has a driveway.
      rect(x,z+d-(SH-RH),w,SH-RH,.4,C.paving);
      rect(x,z,SH-RH,d,.4,C.paving);rect(x+w-(SH-RH),z,SH-RH,d,.4,C.paving);
      curbRun(x,z+d,x+w,z+d);curbRun(x,z,x,z+d);curbRun(x+w,z,x+w,z+d);
      const bay=map.bays.find(b=>b.row===j&&b.col===i);
      if(bay){
        const left=Math.max(x,bay.x-126),right=Math.min(x+w,bay.x+126);
        rect(x,z,left-x,SH-RH,.4,C.paving);rect(right,z,x+w-right,SH-RH,.4,C.paving);
        curbRun(x,z,left,z);curbRun(right,z,x+w,z);
      }else {rect(x,z,w,SH-RH,.4,C.paving);curbRun(x,z,x+w,z);}
    }
    // Street slabs do not overlap, which keeps flat surfaces stable at driver-eye height.
    for(const z of zs){rect(120,z-RH,xs[lastX]+100-120,RH*2,0,C.asphalt);stats.roadSegments++;}
    for(const x of xs){
      let from=120;
      for(const z of zs){if(z-RH>from){rect(x-RH,from,RH*2,z-RH-from,0,C.asphalt);stats.roadSegments++;}from=z+RH;}
    }
    // Pavement at the outer road sides, with a distinct pale kerb.
    let edgeStart=120;
    for(const edgeEnd of [...xs.map(x=>x-RH),xs[lastX]+100]){
      if(edgeEnd>edgeStart){rect(edgeStart,zs[0]-SH,edgeEnd-edgeStart,SH-RH,.4,C.paving);curbRun(edgeStart,zs[0]-RH,edgeEnd,zs[0]-RH);}
      edgeStart=edgeEnd+RH*2;
    }
    edgeStart=120;
    for(const z of zs){
      if(z-RH>edgeStart){
        for(const x of [xs[0]-SH,xs[lastX]+RH])rect(x,edgeStart,SH-RH,z-RH-edgeStart,.4,C.paving);
        for(const x of [xs[0]-RH,xs[lastX]+RH])curbRun(x,edgeStart,x,z-RH);
      }
      edgeStart=z+RH;
    }
    // Mark two lanes in each direction, centred exactly on engine offsets 20 and 56.
    for(const z of zs)for(let i=0;i<lastX;i++)marks(xs[i]+130,z,xs[i+1]-130,z);
    for(const x of xs)for(let j=0;j<lastZ;j++)marks(x,zs[j]+130,x,zs[j+1]-130);
    for(const n of map.nodes){
      if(n.i>0)crosswalk(n,'W');if(n.i<lastX)crosswalk(n,'E');
      if(n.j>0)crosswalk(n,'N');if(n.j<lastZ)crosswalk(n,'S');
    }
    // Drive-through parking aprons are as wide/deep as isRoad(), with no kerb across access.
    for(const b of map.bays){
      rect(b.x-126,b.roadY+RH,252,180-RH,.025,C.bay);
      rect(b.x-126,b.roadY+180,252,12,.4,C.paving);
      curbRun(b.x-126,b.roadY+180,b.x+126,b.roadY+180);
      curbRun(b.x-126,b.roadY+RH,b.x-126,b.roadY+180);
      curbRun(b.x+126,b.roadY+RH,b.x+126,b.roadY+180);
      // Pale stall ticks keep the destination free for the dynamic pickup highlight.
      if(b.type==='parallel'){
        for(const off of [-117,-39,39,117])line(b.x+off,b.roadY+91,b.x+off,b.roadY+128,1.2,.06,'#c0c8bf');
        line(b.x-117,b.roadY+130,b.x+117,b.roadY+130,1.2,.06,'#c0c8bf');
      }else{
        for(const off of [-65,-21.5,21.5,65])line(b.x+off,b.roadY+125,b.x+off,b.roadY+174,1.2,.06,'#c0c8bf');
        line(b.x-65,b.roadY+174,b.x+65,b.roadY+174,1.2,.06,'#c0c8bf');
      }
    }
    // A real concrete viaduct. Ground remains visible under every span; the
    // upper asphalt, soffit, edge beams, rails and piers are all world geometry.
    const roads=root.TaxiRoads,H=map.highwayHeight||32,HX=map.highwayStart||90,HE=map.highwayEnd||map.w-90;
    const concrete='#aeb9b5',soffit='#74868b',rail='#c3cbc4',post='#8a9a9b';
    // Solid volumes use the renderer's inward winding, including the hidden
    // underside. This also prevents back faces painting through in Canvas2D.
    function roadQuad(a,b,c,d,col){const old=mesh.solidFace;mesh.solidFace=true;mesh.quad(d,c,b,a,col);mesh.solidFace=old;}
    function roadTri(a,b,c,col){const old=mesh.solidFace;mesh.solidFace=true;mesh.tri(c,b,a,col);mesh.solidFace=old;}
    function elevatedLine(ax,az,ay,bx,bz,by,width,col){
      const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz)||1,nx=-dz/len*width/2,nz=dx/len*width/2;
      roadQuad([ax+nx,ay,az+nz],[bx+nx,by,bz+nz],[bx-nx,by,bz-nz],[ax-nx,ay,az-nz],col);
    }
    function railSegment(a,b){
      mesh.quad([a.x,a.height+3.5,a.z],[b.x,b.height+3.5,b.z],[b.x,b.height+6,b.z],[a.x,a.height+6,a.z],rail);
      elevatedLine(a.x,a.z,a.height+6,b.x,b.z,b.height+6,1.2,'#e0e1d1');
    }
    function highwayEntryAt(x,z){
      return roads&&map.roadProfiles.some(p=>{const q=roads.project(p,x,z);return q.distance<roads.pointAt(p,q.s).halfWidth+4&&roads.elevation(p,q.s).height>H-.04;});
    }
    function supportQuad(...args){
      const first=mesh.cull.length;roadQuad(...args);
      for(let i=first;i<mesh.cull.length;i++)mesh.underRoad[i]=1;
    }
    function supportBox(...args){
      const first=mesh.cull.length;box(...args);
      for(let i=first;i<mesh.cull.length;i++)mesh.underRoad[i]=1;
    }
    function highwayPier(x){
      // Twin columns leave a broad, readable opening below the road.
      for(const dz of [-53,53])supportBox(x,(H-8)/2-.35,map.hy+dz,10,H-8.7,13,concrete);
      supportBox(x,H-7,map.hy,16,5,149,'#95a5a5');stats.bridgePiers++;
    }
    for(let x=HX;x<HE;x+=80){
      const end=Math.min(HE,x+80),mid=(x+end)/2;
      for(let xx=x;xx<end;xx+=40)for(let z=map.hy-76;z<map.hy+76;z+=38){const xe=Math.min(end,xx+40);roadQuad([xx,H,z],[xx,H,z+38],[xe,H,z+38],[xe,H,z],C.highway);}
      supportQuad([x,H,map.hy-76],[end,H,map.hy-76],[end,H-5,map.hy-76],[x,H-5,map.hy-76],concrete);
      supportQuad([end,H,map.hy+76],[x,H,map.hy+76],[x,H-5,map.hy+76],[end,H-5,map.hy+76],'#96a6a7');
      supportQuad([x,H-5,map.hy-76],[end,H-5,map.hy-76],[end,H-5,map.hy+76],[x,H-5,map.hy+76],soffit);
      for(const side of [-1,1]){
        const z=map.hy+side*75;
        // Openings follow the actual acceleration lanes, never block a merge.
        for(let xx=x;xx<end;xx+=20){const xe=Math.min(end,xx+20);if(!highwayEntryAt((xx+xe)/2,z))railSegment({x:xx,z,height:H},{x:xe,z,height:H});}
        if(!highwayEntryAt(mid,z))box(mid,H+3,z,1.5,6,1.5,post);
      }
    }
    supportQuad([HX,H-5,map.hy-76],[HX,H-5,map.hy+76],[HX,H,map.hy+76],[HX,H,map.hy-76],concrete);
    supportQuad([HE,H-5,map.hy+76],[HE,H-5,map.hy-76],[HE,H,map.hy-76],[HE,H,map.hy+76],concrete);
    for(let x=HX+110;x<HE-70;x+=260)highwayPier(x);
    for(const off of [-72,72]){
      for(let x=HX;x<HE;x+=20){const end=Math.min(HE,x+20);if(!highwayEntryAt((x+end)/2,map.hy+off))elevatedLine(x,map.hy+off,H+.055,end,map.hy+off,H+.055,1.7,C.white);}
    }
    for(const off of [-39.5,39.5])for(let x=HX+5;x<HE-4;x+=59)elevatedLine(x,map.hy+off,H+.065,Math.min(x+33,HE-4),map.hy+off,H+.065,1.8,C.white);
    for(let x=HX;x<HE;x+=26){const w=Math.min(23,HE-x);box(x+w/2,H+2.1,map.hy,w,4.2,5.5,C.curb);}
    stats.elevatedRoads++;
    if(roads)for(const profile of map.roadProfiles){
      const points=profile.points,half=profile.halfWidth;
      function edge(q,off,vertical=0){return[q.x+q.nx*off,q.height+vertical,q.z+q.nz*off];}
      for(let k=1;k<points.length;k++){
        const a=points[k-1],b=points[k],la=edge(a,a.halfWidth),ra=edge(a,-a.halfWidth),lb=edge(b,b.halfWidth),rb=edge(b,-b.halfWidth);
        const ma=edge(a,0),mb=edge(b,0);roadQuad(la,lb,mb,ma,C.highway);roadQuad(ma,mb,rb,ra,C.highway);
        supportQuad(edge(a,a.halfWidth,-4.5),edge(a,-a.halfWidth,-4.5),edge(b,-b.halfWidth,-4.5),edge(b,b.halfWidth,-4.5),soffit);
        supportQuad(la,edge(a,a.halfWidth,-4.5),edge(b,b.halfWidth,-4.5),lb,concrete);
        supportQuad(rb,edge(b,-b.halfWidth,-4.5),edge(a,-a.halfWidth,-4.5),ra,'#95a5a5');
        const middle=roads.pointAt(profile,(a.s+b.s)/2);
        for(const side of [-1,1]){
          const pa=edge(a,side*(a.halfWidth-2)),pb=edge(b,side*(b.halfWidth-2)),mx=(pa[0]+pb[0])/2,mz=(pa[2]+pb[2])/2;
          const meetsDeck=mx>=HX&&mx<=HE&&Math.abs(mz-map.hy)<78&&middle.height>H-.04;
          if(!meetsDeck){
            elevatedLine(pa[0],pa[2],pa[1]+.07,pb[0],pb[2],pb[1]+.07,1.5,C.white);
            if(middle.s>130)railSegment({x:pa[0],z:pa[2],height:pa[1]},{x:pb[0],z:pb[2],height:pb[1]});
          }
        }
      }
      // Sparse piers, rail posts and chevrons read clearly at driving speed.
      for(let s=190;s<profile.total-40;s+=80){
        const q=roads.pointAt(profile,s);
        for(const side of [-1,1]){const x=q.x+q.nx*side*(q.halfWidth-2),z=q.z+q.nz*side*(q.halfWidth-2);if(!(x>=HX&&x<=HE&&Math.abs(z-map.hy)<78&&q.height>H-.04))box(x,q.height+3,z,1.5,6,1.5,post);}
      }
      for(let s=370;s<profile.turnEnd+profile.acceleration;s+=220){
        const q=roads.pointAt(profile,s);if(q.height<12)continue;
        // Keep pillars under the centre of this independent narrow ramp deck.
        supportBox(q.x,(q.height-7)/2-.35,q.z,8,q.height-7.7,9,concrete);
        supportBox(q.x,q.height-6,q.z,12,3,65,'#97a7a7',Math.atan2(q.dz,q.dx));stats.bridgePiers++;
      }
      // The level acceleration lane has a broken inner edge through the merge.
      for(let s=profile.turnEnd+28;s<profile.total-20;s+=52){
        const a=roads.pointAt(profile,s),b=roads.pointAt(profile,Math.min(profile.total,s+27));
        const side=-profile.side*profile.dir,off=side*(a.halfWidth-4);
        elevatedLine(a.x+a.nx*off,a.z+a.nz*off,H+.09,b.x+b.nx*off,b.z+b.nz*off,H+.09,1.5,C.white);
      }
      // Short lane-centred arrows show the bend and safe merge direction.
      for(const s of [profile.riseStart+120,profile.turnEnd+70,profile.turnEnd+profile.acceleration+130]){
        const q=roads.pointAt(profile,s),y=q.height+.1;
        function ap(f,n){f*=profile.travelDir;n*=profile.travelDir;return[q.x+q.dx*f+q.nx*n,y+q.grade*f,q.z+q.dz*f+q.nz*n];}
        roadQuad(ap(-17,-1.5),ap(-17,1.5),ap(3,1.5),ap(3,-1.5),C.white);roadTri(ap(15,0),ap(2,-6),ap(2,6),C.white);
      }
      const start=points[0],signSide=profile.index%2===0?-1:1;
      box(start.x+signSide*47,20,start.z+153,2,40,2,C.metal);
      box(start.x+signSide*47,36,start.z+153,30,13,2,'#39756b');
      streetSign(start.x+signSide*47,start.z+150,37,profile.kind==='exit'?'CITY STREETS':profile.dir>0?'GARDINER EAST →':'← GARDINER WEST','#f0eddc');
      const merge=roads.pointAt(profile,profile.turnEnd+profile.acceleration*.42);
      streetSign(merge.x,merge.z-profile.side*48,H+19,profile.kind==='exit'?'EXIT  •  CITY STREETS':'MERGE  •  90 km/h','#365d5c');
      stats.ramps++;
    }
    // Waterfront promenade: its seaward edge coincides with the simulation boundary.
    rect(90,map.hy+91,map.w-180,shore-map.hy-91,.3,'#d9d3ba');
    for(let z=map.hy+102;z<shore-6;z+=12)line(90,z,map.w-90,z,.5,.34,'#c1baa3');
    for(let x=110;x<map.w-100;x+=100){
      box(x,5,shore-3,2,10,2,C.metal);
      if(x+100<map.w-90)box(x+50,8,shore-3,100,1.3,1.3,C.metal);
      if(x%300===110){bench(x,shore-21);lamp(x,shore-14,-Math.PI/2);}
    }
    for(let x=145;x<map.w-100;x+=190){
      const z=shore-25;
      if(!roads||[[x,z],[x-15,z],[x+15,z],[x,z-15],[x,z+15]].every(q=>roads.sampleRoad(map,q[0],q[1]).height<2))tree(x,z,.85);
    }
    // Parks use their precise open map rectangles; paths, seating and sparse faceted trees.
    for(const p of map.parks){
      rect(p.x,p.y,p.w,p.h,.2,C.grass);
      rect(p.x+p.w*.46,p.y,9,p.h,.24,C.paving);
      rect(p.x,p.y+p.h*.48,p.w,8,.25,C.paving);
      for(let i=0;i<5;i++){const tx=p.x+20+(p.w-40)*(i/4),tz=p.y+(i%2?.78:.24)*p.h;tree(tx,tz,.85+r()*.35);}
      bench(p.x+p.w*.65,p.y+p.h*.45);bench(p.x+p.w*.26,p.y+p.h*.55,Math.PI);
    }
    function facade(x,z,w,d,height,color,glassColor,windows=true,base=0,style=0) {
      // Each facade is built from a single opaque volume and a few visible glass strips.
      // Explicit world-space floor bands, mullions and setbacks give depth without textures.
      box(x+w/2,base+height/2,z+d/2,w,height,d,color);
      box(x+w/2,base+height+1.2,z+d/2,w+1.2,2.4,d+1.2,tint(color,1.12));
      if(!windows)return;
      const top=base+height-5,bot=base+5,p=.25,margin=3.5;
      const face=(v,col)=>{const old=mesh.solidFace;mesh.solidFace=true;mesh.quad(...v,col);mesh.solidFace=old;};
      face([[x+margin,bot,z-p],[x+w-margin,bot,z-p],[x+w-margin,top,z-p],[x+margin,top,z-p]],glassColor);
      face([[x+w-margin,bot,z+d+p],[x+margin,bot,z+d+p],[x+margin,top,z+d+p],[x+w-margin,top,z+d+p]],tint(glassColor,.72));
      face([[x-p,bot,z+d-margin],[x-p,bot,z+margin],[x-p,top,z+margin],[x-p,top,z+d-margin]],tint(glassColor,.69));
      face([[x+w+p,bot,z+margin],[x+w+p,bot,z+d-margin],[x+w+p,top,z+d-margin],[x+w+p,top,z+margin]],tint(glassColor,1.14));
      const floorStep=height>250?22:18;
      for(let y=base+14;y<top-4;y+=floorStep){
        const col=tint(color,style===1?.94:.82),h=style===1?1.4:2.1,q=p+.07;
        face([[x+2,y,z-q],[x+w-2,y,z-q],[x+w-2,y+h,z-q],[x+2,y+h,z-q]],col);
        face([[x+w-2,y,z+d+q],[x+2,y,z+d+q],[x+2,y+h,z+d+q],[x+w-2,y+h,z+d+q]],tint(col,.81));
        face([[x-q,y,z+d-2],[x-q,y,z+2],[x-q,y+h,z+2],[x-q,y+h,z+d-2]],tint(col,.73));
        face([[x+w+q,y,z+2],[x+w+q,y,z+d-2],[x+w+q,y+h,z+d-2],[x+w+q,y+h,z+2]],tint(col,1.05));
      }
      // Full-height stone or aluminium mullions keep the window grid legible at street level.
      const step=Math.max(15,w/7),sideStep=Math.max(15,d/5),mc=tint(color,style===2?1.05:.89),q=p+.17;
      for(let dx=step;dx<w-6;dx+=step){
        face([[x+dx-.65,bot,z-q],[x+dx+.65,bot,z-q],[x+dx+.65,top,z-q],[x+dx-.65,top,z-q]],mc);
        face([[x+dx+.65,bot,z+d+q],[x+dx-.65,bot,z+d+q],[x+dx-.65,top,z+d+q],[x+dx+.65,top,z+d+q]],tint(mc,.76));
      }
      for(let dz=sideStep;dz<d-6;dz+=sideStep){
        face([[x-q,bot,z+dz+.65],[x-q,bot,z+dz-.65],[x-q,top,z+dz-.65],[x-q,top,z+dz+.65]],tint(mc,.72));
        face([[x+w+q,bot,z+dz-.65],[x+w+q,bot,z+dz+.65],[x+w+q,top,z+dz+.65],[x+w+q,top,z+dz-.65]],mc);
      }
    }
    const materials=[
      ['#b9c8c4','#6795a4'],['#d0c2a7','#6592a0'],['#7d9ca8','#4f839c'],
      ['#b57e67','#587d89'],['#c3ccc7','#6dabb9'],['#748794','#3c647a']
    ];
    function building(b,idx){
      const col=materials[(b.color||0)%materials.length];
      const downtown=1-Math.min(1,Math.hypot((b.x-xs[2])/1800,(b.y-zs[2])/1600));
      const height=b.urban?250+r()*270:90+r()*170+downtown*210;
      const tall=height>245,style=(idx+b.roof)%3;
      if(tall){
        const podium=30+(idx%3)*8,tw=Math.min(b.w*.78,85+(idx%3)*16),td=Math.max(24,b.h*.82);
        facade(b.x,b.y,b.w,b.h,podium,col[0],col[1],true,0,2);
        const tx=b.x+(b.w-tw)/2,tz=b.y+(b.h-td)/2;
        facade(tx,tz,tw,td,height-podium,col[0],col[1],true,podium,style);
        if(style===0){
          facade(tx+tw*.13,tz+td*.1,tw*.74,td*.8,32,col[0],col[1],true,height,1);
          box(tx+tw*.5,height+39,tz+td*.5,tw*.32,14,td*.38,tint(col[0],1.08));
        }else if(style===1){
          // Stepped, asymmetric crown: recognisable Toronto financial-district silhouette.
          box(tx+tw*.34,height+13,tz+td*.5,tw*.67,26,td*.82,tint(col[0],1.12));
          box(tx+tw*.25,height+33,tz+td*.5,tw*.38,15,td*.63,tint(col[0],1.04));
          if(idx%4===1)box(tx+tw*.25,height+67,tz+td*.5,1.5,57,1.5,'#d9dcd1');
        }else{
          box(tx+tw/2,height+10,tz+td/2,tw*.58,20,td*.58,'#8eacb3');
          box(tx+tw/2,height+22,tz+td/2,tw*.65,3,td*.65,'#d5ded5');
        }
        stats.skyscrapers++;
      }else{
        facade(b.x,b.y,b.w,b.h,height,col[0],col[1],true,0,style);
        box(b.x+b.w*.68,height+5,b.y+b.h*.5,Math.min(26,b.w*.2),8,b.h*.35,'#7f9698');
      }
      // Recessed ground-floor shopfronts and projecting entrance canopies establish human scale.
      box(b.x+b.w*.5,10,b.y-.12,b.w*.6,14,.5,'#355665');
      box(b.x+b.w*.5,18,b.y+1,b.w*.68,2.5,4,idx%3===0?'#b8664c':'#517b75');
      box(b.x+b.w*.5,7,b.y-.5,7,13,.6,'#a2c1be');
      stats.buildings++;stats.tallestBuilding=Math.max(stats.tallestBuilding,height+45);
    }
    map.buildings.forEach(building);
    // A second skyline layer gives strong parallax beyond the playable street walls.
    for(let i=0;i<xs.length*3;i++){
      const x=125+i*(map.w-100)/(xs.length*3),w=66+r()*74,h=190+r()*350;
      facade(x,-180,w,145,h,'#99b0b7','#729fae',i%2===0,0,1);stats.backgroundBuildings++;
    }
    for(const side of [-1,1])for(let i=0;i<zs.length*2;i++){
      const x=side<0?-170:map.w-18,z=160+i*(shore-210)/(zs.length*2),w=140,h=160+r()*300;
      facade(x,z,w,120,h,'#9eafb0','#6d969f',false);stats.backgroundBuildings++;
    }
    // All landmark ground-level bodies use the engine colliders, not guessed centres.
    for(let li=0;li<map.landmarks.length;li++){
      const l=map.landmarks[li],fallback=l.type==='tower'?{x:l.x+l.w*.43,y:l.y+l.h*.5,w:l.w*.14,h:l.h*.3}:{x:l.x+l.w*.1,y:l.y+l.h*.2,w:l.w*.8,h:l.h*.6};
      const b=(map.landmarkColliders||[])[li]||fallback,x=b.x+b.w/2,z=b.y+b.h/2;
      rect(l.x,l.y,l.w,l.h,.25,'#dbd9c3');
      for(let tx=l.x+20;tx<l.x+l.w-8;tx+=35)line(tx,l.y,tx,l.y+l.h,.65,.28,'#c6c9b9');
      if(l.type==='stadium'){
        box(x,15,z,b.w,30,b.h,'#c6c9be');
        // The broad retractable white dome, dark concourse and red sign are the signature.
        ovalBand(x,z,23,31,b.w*.52,b.h*.77,b.w*.52,b.h*.77,'#e1e1d1',24);
        for(let k=0;k<6;k++){
          const t0=k*Math.PI/12,t1=(k+1)*Math.PI/12;
          ovalBand(x,z,31+Math.sin(t0)*41,31+Math.sin(t1)*41,b.w*.52*Math.cos(t0),b.h*.77*Math.cos(t0),b.w*.52*Math.cos(t1),b.h*.77*Math.cos(t1),k%2?'#e6ebdf':'#f0efdf',24);
        }
        for(let dx=9;dx<b.w-5;dx+=18)box(b.x+dx,13,b.y-.25,11,11,.6,'#597b83');
        box(x,24,b.y-.7,b.w*.6,7,1.2,'#c55248');
        streetSign(x,b.y-5,28,'ROGERS CENTRE','#af443c');
        for(const s of [-1,1])tree(l.x+(s<0?12:l.w-12),l.y+l.h*.6,.75);
      }else if(l.type==='tower'){
        box(x,6,z,b.w,12,b.h,'#d4d5c6');
        const towerCylinder=(x,y,z,r,h,c,n,rt)=>mesh.cylinder(x,y*1.65,z,r,h*1.65,c,n,rt);
        towerCylinder(x,151,z,12.8,278,'#d8d8ca',12,6.5);
        // Tapered observation disk and two dark panoramic glass rings.
        towerCylinder(x,289,z,8,16,'#c7cdc6',20,36);
        towerCylinder(x,301,z,36,8,'#74949e',20,36);
        towerCylinder(x,307,z,37,4,'#e9e9d8',20,37);
        towerCylinder(x,314,z,35,10,'#b9c8c2',20,15);
        towerCylinder(x,343,z,5.9,64,'#dce0d2',10,4.4);
        towerCylinder(x,373,z,12,8,'#a1b7b7',16,10);
        towerCylinder(x,382,z,8,10,'#dfe2d5',12,4.2);
        for(let k=0;k<8;k++)towerCylinder(x,391+k*9,z,3.5-k*.35,9,k%2?'#f3ead8':'#b65b4d',8,3.15-k*.35);
        towerCylinder(x,468,z,.65,10,'#eee9d4',6,.12);
        box(x,13,b.y-.25,b.w*.57,13,.6,'#648993');
        streetSign(x,b.y-5,30,'CN TOWER','#355568');
        for(const s of [-1,1])tree(l.x+(s<0?22:l.w-22),l.y+l.h*.5,.9);
      }else if(l.type==='aquarium'){
        box(x,19,z,b.w,38,b.h,'#327e97');
        const xa=b.x,xb=b.x+b.w,za=b.y,zb=b.y+b.h;
        mesh.quad([xa,38,za],[xa,38,zb],[x,57,zb],[x,57,za],'#d8e7df');
        mesh.quad([x,57,za],[x,57,zb],[xb,34,zb],[xb,44,za],'#81bdc5');
        mesh.tri([xa,38,za-.05],[xb,44,za-.05],[x,57,za-.05],'#71b6c2');
        for(let dx=12;dx<b.w-8;dx+=21){box(xa+dx,18,za-.2,1.4,33,.6,'#a3d4d4');box(xa+dx,18,zb+.2,1.4,33,.6,'#86b7bf');}
        box(xa+b.w*.18,11,za-.4,b.w*.22,20,.8,'#244d65');
        // A large pale shark silhouette supplies an unmistakable aquarium facade motif.
        const sx=x+b.w*.14,sy=25,sz=za-.8,sc=Math.min(1,b.w/210);
        const shark=[[-35,0],[-21,8],[-3,9],[5,23],[11,8],[30,4],[43,14],[37,1],[43,-12],[29,-5],[9,-7],[1,-14],[-4,-7],[-24,-6]];
        // Fan triangles, including the dorsal fin and forked tail, need no image assets.
        for(let k=0;k<shark.length;k++){const a=shark[k],bb=shark[(k+1)%shark.length];mesh.tri([sx,sy,sz],[sx+a[0]*sc,sy+a[1]*sc,sz],[sx+bb[0]*sc,sy+bb[1]*sc,sz],'#d0ece4');}
        streetSign(x,za-5,62,"RIPLEY'S AQUARIUM",'#21677e');
        for(const s of [-1,1])tree(l.x+(s<0?10:l.w-10),l.y+l.h*.65,.75);
      }
      stats.landmarks++;
    }
    // Road furniture is deliberately on sidewalks and away from bay manoeuvring space.
    for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length-1;i++){
      const x=xs[i]+135,z=zs[j]-89;
      lamp(x,z,Math.PI/2);
      if((i+j)%2===0)tree(xs[i+1]-130,z-10,.75);
      if((i+j)%4===0)shelter((xs[i]+xs[i+1])*.5,z-3);
    }
    for(let i=0;i<xs.length;i++)for(let j=0;j<zs.length-1;j++)lamp(xs[i]-89,(zs[j]+zs[j+1])*.5,0);
    // Route stops are in forward curb lanes. Paint is flush with the road;
    // poles stay behind the lane edge and shelters only occupy clear dry land.
    for(const stop of map.busStops||[]){
      const dx=Math.cos(stop.a),dz=Math.sin(stop.a),nx=-dz,nz=dx;
      const p=(along,out,y=0)=>[stop.x+dx*along+nx*out,y,stop.y+dz*along+nz*out];
      const half=(stop.length||132)/2;
      function stopLine(a,b,c,d,width,col){const u=p(a,b,.09),v=p(c,d,.09);elevatedLine(u[0],u[2],u[1],v[0],v[2],v[1],width,col);}
      stopLine(-half,-14,half,-14,1.7,'#e8c879');
      for(const s of [-half,half])stopLine(s,-14,s,14,1.7,'#e8c879');
      // A simple yellow bus pictogram reads without texture text or extra assets.
      const plate=[p(-13,-6,.095),p(-13,6,.095),p(13,6,.095),p(13,-6,.095)];mesh.quad(...plate,'#e8c879');
      mesh.quad(p(-9,-3,.1),p(-9,3,.1),p(7,3,.1),p(7,-3,.1),C.asphalt);
      const pole=p(-half-7,30);box(pole[0],16,pole[2],1.6,32,1.6,C.metal);box(pole[0],28,pole[2],8,9,1.3,'#b65043',stop.a);
      streetSign(pole[0],pole[2],35,'509  '+stop.place.toUpperCase(),'#9a4b43');
      const center=p(0,55),yaw=stop.a,corners=[[-24,-10],[24,-10],[24,10],[-24,10]].map(([a,b])=>({x:center[0]+dx*a+nx*b,y:center[2]+dz*a+nz*b}));
      const clear=corners.every(q=>!roads.isRoad(map,q.x,q.y)&&![...map.buildings,...(map.landmarkColliders||[])].some(b=>q.x>b.x-4&&q.x<b.x+b.w+4&&q.y>b.y-4&&q.y<b.y+b.h+4));
      if(clear){
        box(center[0],24,center[2],46,2,18,C.ink,yaw);
        for(const along of [-21,21])for(const side of [-7,7]){const x=center[0]+dx*along+nx*side,z=center[2]+dz*along+nz*side;box(x,12,z,1.3,24,1.3,C.metal);}
        box(center[0]+nx*7,13,center[2]+nz*7,40,19,.8,'#8fb8bb',yaw);
        bench(center[0],center[2],yaw);stats.shelters++;
      }
      stats.busStops++;
    }
    // Street names at twelve alternating junctions; billboard labels are parent-rendered.
    for(const n of map.nodes){
      if((n.i+n.j)%3!==0)continue;
      streetSign(n.x-96,n.y-96,32,map.streets[n.j].replace('Street ','St ').replace('Avenue','Ave'),C.ink);
      if(n.j===0||n.j===3)streetSign(n.x+96,n.y+96,31,map.avenues[n.i].replace('Street','St').replace('Avenue','Ave'),C.ink);
    }
    for(const [idx,text] of [[0,'QUEEN WEST'],[8,'ENTERTAINMENT DISTRICT'],[19,'ST. LAWRENCE'],[20,'HARBOURFRONT']]){
      const b=map.bays[idx];if(b)streetSign(b.x,b.roadY+194,35,text,'#52695f');
    }
    streetSign(HX+400,map.hy-84,H+24,'GARDINER EXPRESSWAY  →','#39756b');
    streetSign(HE-400,map.hy-84,H+24,'←  GARDINER EXPRESSWAY','#39756b');
    streetSign(map.w*.53,shore-12,25,'LAKE ONTARIO','#497d89');
    for(let i=0;i<mesh.cull.length;i++)if(mesh.underRoad[i]!==1)mesh.underRoad[i]=0;
    stats.underRoadTriangles=mesh.underRoad.reduce((sum,n)=>sum+n,0);
    stats.signs=signs.length;
    stats.vertices=mesh.data.length/6;
    stats.triangles=stats.vertices/3;
    stats.laneCenters=[-56,-20,20,56];
    stats.highwayHeight=H;stats.highwayClearance=H-8;stats.rampLength=map.roadProfiles?map.roadProfiles.map(p=>p.total):[];
    return {mesh,signs,stats};
  }
  root.TaxiCity={build,enrich};
})(typeof window!=='undefined'?window:globalThis);
