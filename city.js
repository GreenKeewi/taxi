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
  function build(map) {
    if (!root.Taxi3D || !root.Taxi3D.Mesh) throw new Error('TaxiCity requires Taxi3D.Mesh.');
    const mesh=new root.Taxi3D.Mesh(), signs=[], r=random((map.seed||8427)^0x51C170);
    const stats={seed:map.seed||8427,buildings:0,backgroundBuildings:0,trees:0,lamps:0,shelters:0,landmarks:0,roadSegments:0,crosswalks:0};
    const xs=map.xs, zs=map.ys, RH=map.roadHalf||82, SH=map.sidewalkHalf||94;
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
    for(let j=0;j<4;j++)for(let i=0;i<5;i++){
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
    for(const z of zs){rect(120,z-RH,xs[5]+100-120,RH*2,0,C.asphalt);stats.roadSegments++;}
    for(const x of xs){
      let from=120;
      for(const z of zs){if(z-RH>from){rect(x-RH,from,RH*2,z-RH-from,0,C.asphalt);stats.roadSegments++;}from=z+RH;}
    }
    // Pavement at the outer road sides, with a distinct pale kerb.
    let edgeStart=120;
    for(const edgeEnd of [...xs.map(x=>x-RH),xs[5]+100]){
      if(edgeEnd>edgeStart){rect(edgeStart,zs[0]-SH,edgeEnd-edgeStart,SH-RH,.4,C.paving);curbRun(edgeStart,zs[0]-RH,edgeEnd,zs[0]-RH);}
      edgeStart=edgeEnd+RH*2;
    }
    edgeStart=120;
    for(const z of zs){
      if(z-RH>edgeStart){
        for(const x of [xs[0]-SH,xs[5]+RH])rect(x,edgeStart,SH-RH,z-RH-edgeStart,.4,C.paving);
        for(const x of [xs[0]-RH,xs[5]+RH])curbRun(x,edgeStart,x,z-RH);
      }
      edgeStart=z+RH;
    }
    // Mark two lanes in each direction, centred exactly on engine offsets 20 and 56.
    for(const z of zs)for(let i=0;i<5;i++)marks(xs[i]+130,z,xs[i+1]-130,z);
    for(const x of xs)for(let j=0;j<4;j++)marks(x,zs[j]+130,x,zs[j+1]-130);
    for(const n of map.nodes){
      if(n.i>0)crosswalk(n,'W');if(n.i<5)crosswalk(n,'E');
      if(n.j>0)crosswalk(n,'N');if(n.j<4)crosswalk(n,'S');
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
    // At-grade Gardiner expressway and the engine's actual slip-road polylines.
    rect(90,map.hy-76,map.w-180,152,0,C.highway);
    for(const off of [-72,72])line(95,map.hy+off,map.w-95,map.hy+off,2,.055,C.white);
    for(const off of [-39.5,39.5])dash(95,map.hy+off,map.w-95,map.hy+off,2,.055,C.white,33,26);
    for(const ramp of map.ramps){
      for(let k=1;k<ramp.length;k++){
        const a=ramp[k-1],b=ramp[k];line(a.x,a.y,b.x,b.y,74,.012,C.highway);
        disc(a.x,.014,a.y,37,37,C.highway,12);
        if(k<ramp.length-1){const dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
          for(const side of [-1,1])line(a.x+nx*side*33,a.y+nz*side*33,b.x+nx*side*33,b.y+nz*side*33,1.6,.08,C.white);
        }
      }
    }
    const medianGaps=map.ramps.map(p=>{const a=p[p.length-2],b=p[p.length-1],t=(map.hy-a.y)/(b.y-a.y);return a.x+(b.x-a.x)*t;});
    for(let x=95;x<map.w-95;x+=26){if(medianGaps.some(g=>Math.abs(g-(x+12))<65))continue;box(x+12,2.1,map.hy,23,4.2,5.5,C.curb);}
    // Waterfront promenade: its seaward edge coincides with the simulation boundary.
    rect(90,map.hy+91,map.w-180,shore-map.hy-91,.3,'#d9d3ba');
    for(let z=map.hy+102;z<shore-6;z+=12)line(90,z,map.w-90,z,.5,.34,'#c1baa3');
    for(let x=110;x<map.w-100;x+=100){
      box(x,5,shore-3,2,10,2,C.metal);
      if(x+100<map.w-90)box(x+50,8,shore-3,100,1.3,1.3,C.metal);
      if(x%300===110){bench(x,map.hy+107);lamp(x,map.hy+94,Math.PI/2);}
    }
    for(let x=145;x<map.w-100;x+=190)tree(x,map.hy+100,.85);
    // Parks use their precise open map rectangles; paths, seating and sparse faceted trees.
    for(const p of map.parks){
      rect(p.x,p.y,p.w,p.h,.2,C.grass);
      rect(p.x+p.w*.46,p.y,9,p.h,.24,C.paving);
      rect(p.x,p.y+p.h*.48,p.w,8,.25,C.paving);
      for(let i=0;i<5;i++){const tx=p.x+20+(p.w-40)*(i/4),tz=p.y+(i%2?.78:.24)*p.h;tree(tx,tz,.85+r()*.35);}
      bench(p.x+p.w*.65,p.y+p.h*.45);bench(p.x+p.w*.26,p.y+p.h*.55,Math.PI);
    }
    function facade(x,z,w,d,height,color,glassColor,windows=true) {
      box(x+w/2,height/2,z+d/2,w,height,d,color);
      box(x+w/2,height+1.2,z+d/2,w+1.2,2.4,d+1.2,tint(color,1.08));
      if(!windows)return;
      // Broad glazing bands read cleanly in perspective without a sea of tiny geometry.
      for(let y=10;y<height-9;y+=16){
        const h=Math.min(7,height-y-5),p=.13,margin=5;
        mesh.quad([x+margin,y,z-p],[x+w-margin,y,z-p],[x+w-margin,y+h,z-p],[x+margin,y+h,z-p],glassColor);
        mesh.quad([x+w-margin,y,z+d+p],[x+margin,y,z+d+p],[x+margin,y+h,z+d+p],[x+w-margin,y+h,z+d+p],tint(glassColor,.85));
        if(d>25){
          mesh.quad([x-p,y,z+d-4],[x-p,y,z+4],[x-p,y+h,z+4],[x-p,y+h,z+d-4],tint(glassColor,.84));
          mesh.quad([x+w+p,y,z+4],[x+w+p,y,z+d-4],[x+w+p,y+h,z+d-4],[x+w+p,y+h,z+4],tint(glassColor,1.03));
        }
      }
      // Slim mullions split the continuous bands into intentionally oversized windows.
      const step=Math.max(18,w/7);
      for(let dx=step;dx<w-7;dx+=step){
        mesh.quad([x+dx-.7,3,z-.3],[x+dx+.7,3,z-.3],[x+dx+.7,height-3,z-.3],[x+dx-.7,height-3,z-.3],tint(color,.77));
        mesh.quad([x+dx+.7,3,z+d+.3],[x+dx-.7,3,z+d+.3],[x+dx-.7,height-3,z+d+.3],[x+dx+.7,height-3,z+d+.3],tint(color,.91));
      }
    }
    const materials=[
      ['#bec9c1','#729aa3'],['#c8b698','#687f87'],['#afbcbb','#648b9b'],
      ['#af7964','#526e79'],['#9eafb0','#547e92']
    ];
    for(const b of map.buildings){
      const col=materials[b.color%materials.length],east=(b.x-xs[0])/(xs[5]-xs[0]);
      const height=48+Math.round(r()*78+east*r()*115),step=b.roof===2&&height>112;
      if(step){
        facade(b.x,b.y,b.w,b.h,38,col[0],col[1]);
        facade(b.x+b.w*.12,b.y+b.h*.07,b.w*.76,b.h*.86,height,col[0],col[1]);
      }else facade(b.x,b.y,b.w,b.h,height,col[0],col[1]);
      // Small shop awnings stay entirely inside the original collision footprint.
      if(height<140){box(b.x+b.w/2,15,b.y+2,b.w*.77,2.5,4,b.color===3?'#527f72':'#bb7057');}
      if(b.roof===1)box(b.x+b.w*.7,height+5,b.y+b.h*.55,b.w*.14,8,b.h*.3,'#819393');
      if(b.roof===2)box(b.x+b.w*.35,height+7,b.y+b.h*.5,b.w*.23,12,b.h*.55,tint(col[0],.91));
      stats.buildings++;
    }
    // Sparse edge buildings extend the skyline beyond the playable street grid.
    for(let i=0;i<15;i++){
      const x=160+i*(map.w-250)/15,w=90+r()*75,h=75+r()*155;
      facade(x,-90,w,145,h,'#9eafa9','#75989e',i%2===0);stats.backgroundBuildings++;
    }
    for(const side of [-1,1])for(let i=0;i<7;i++){
      const x=side<0?-130:map.w-45,z=230+i*270,w=145,h=50+r()*125;
      facade(x,z,w,130,h,'#b2b7a5','#788f91',false);stats.backgroundBuildings++;
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
        mesh.cylinder(x,151,z,12.8,278,'#d8d8ca',12,6.5);
        // Tapered observation disk and two dark panoramic glass rings.
        mesh.cylinder(x,289,z,8,16,'#c7cdc6',20,36);
        mesh.cylinder(x,301,z,36,8,'#74949e',20,36);
        mesh.cylinder(x,307,z,37,4,'#e9e9d8',20,37);
        mesh.cylinder(x,314,z,35,10,'#b9c8c2',20,15);
        mesh.cylinder(x,343,z,5.9,64,'#dce0d2',10,4.4);
        mesh.cylinder(x,373,z,12,8,'#a1b7b7',16,10);
        mesh.cylinder(x,382,z,8,10,'#dfe2d5',12,4.2);
        for(let k=0;k<8;k++)mesh.cylinder(x,391+k*9,z,3.5-k*.35,9,k%2?'#f3ead8':'#b65b4d',8,3.15-k*.35);
        mesh.cylinder(x,468,z,.65,10,'#eee9d4',6,.12);
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
    // Street names at twelve alternating junctions; billboard labels are parent-rendered.
    for(const n of map.nodes){
      if((n.i+n.j)%3!==0)continue;
      streetSign(n.x-96,n.y-96,32,map.streets[n.j].replace('Street ','St ').replace('Avenue','Ave'),C.ink);
      if(n.j===0||n.j===3)streetSign(n.x+96,n.y+96,31,map.avenues[n.i].replace('Street','St').replace('Avenue','Ave'),C.ink);
    }
    for(const [idx,text] of [[0,'QUEEN WEST'],[8,'ENTERTAINMENT DISTRICT'],[19,'ST. LAWRENCE'],[20,'HARBOURFRONT']]){
      const b=map.bays[idx];if(b)streetSign(b.x,b.roadY+194,35,text,'#52695f');
    }
    streetSign(xs[0]+100,map.hy-91,34,'GARDINER EXPRESSWAY  →','#39756b');
    streetSign(xs[5]-100,map.hy-91,34,'←  GARDINER EXPRESSWAY','#39756b');
    streetSign(map.w*.53,shore-12,25,'LAKE ONTARIO','#497d89');
    stats.signs=signs.length;
    stats.vertices=mesh.data.length/6;
    stats.triangles=stats.vertices/3;
    stats.laneCenters=[-56,-20,20,56];
    return {mesh,signs,stats};
  }
  root.TaxiCity={build};
})(typeof window!=='undefined'?window:globalThis);
