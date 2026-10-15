/* Toronto-island-inspired scenery. No colliders, roads, assets, or simulation writes.
   Load after renderer.js. buildStatic(map) returns a Mesh; updateMesh appends to a
   caller-owned dynamic Mesh. Coordinates are renderer x / height y / map y as z. */
(function(root,factory){'use strict';const api=factory(root);root.TaxiAircraft=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  const PI=Math.PI,TAU=2*PI,configs=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const C={grass:'#96b779',shore:'#c8c2a0',stone:'#879c90',runway:'#626d72',apron:'#91958c',mark:'#eee9d1',white:'#f1eee2',blue:'#245b72',red:'#d36150',glass:'#5b8996',metal:'#65767a',dark:'#344650'};
  let model;
  function Mesh(){if(!root.Taxi3D||!root.Taxi3D.Mesh)throw Error('TaxiAircraft requires Taxi3D.Mesh.');return new root.Taxi3D.Mesh();}
  function shade(c,n){const v=root.Taxi3D.rgb(c);return v.map(x=>clamp(x*n,0,1));}
  function config(map){
    if(!map||!Number.isFinite(map.w)||!Number.isFinite(map.h)||map.w<1800)throw Error('TaxiAircraft needs a finite city map at least 1800 units wide.');
    if(configs.has(map))return configs.get(map);
    const shore=map.h-65,start=map.w*.14+110,runZ=shore+415,rollTime=18,rollSpeed=20,acceleration=4.8,liftX=start+rollSpeed*rollTime+.5*acceleration*rollTime*rollTime;
    const climbEnd=40,cruiseSpeed=150,turnRadius=650,east=map.w+350,west=-650,turnTime=PI*turnRadius/cruiseSpeed,cruiseTime=(east-west)/cruiseSpeed,approachTime=19;
    const turn1End=climbEnd+turnTime,cruiseEnd=turn1End+cruiseTime,turn2End=cruiseEnd+turnTime,cycle=turn2End+approachTime;
    const c={shore,start,runZ,rollTime,rollSpeed,acceleration,liftX,climbEnd,cruiseSpeed,turnRadius,east,west,turnTime,turn1End,cruiseEnd,turn2End,approachTime,cycle,groundY:12.50};
    configs.set(map,c);return c;
  }
  function smooth(v){v=clamp(v,0,1);return v*v*(3-2*v);}
  // Hermite interpolation supplies matching first derivatives at all flight seams.
  function hermite(a,b,va,vb,t,d){const u=clamp(t/d,0,1),u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*a+(u3-2*u2+u)*va*d+(-2*u3+3*u2)*b+(u3-u2)*vb*d;}
  function hermiteVelocity(a,b,va,vb,t,d){const u=clamp(t/d,0,1);return ((6*u*u-6*u)*a+(-6*u*u+6*u)*b)/d+(3*u*u-4*u+1)*va+(3*u*u-2*u)*vb;}
  function sampleFlight(map,time){
    const c=config(map),t=((Number.isFinite(time)?Math.max(0,time):0)%c.cycle);let x,z=c.runZ,altitude=0,yaw=0,pitch=0,roll=0,gear=1,phase='ground-roll',vx=c.rollSpeed,vy=0;
    if(t<c.rollTime){x=c.start+c.rollSpeed*t+.5*c.acceleration*t*t;vx=c.rollSpeed+c.acceleration*t;pitch=.105*smooth((t-15)/3);if(t>=15)phase='rotation';}
    else if(t<c.climbEnd){
      const q=t-c.rollTime,d=c.climbEnd-c.rollTime;x=hermite(c.liftX,c.east,c.rollSpeed+c.acceleration*c.rollTime,c.cruiseSpeed,q,d);vx=hermiteVelocity(c.liftX,c.east,c.rollSpeed+c.acceleration*c.rollTime,c.cruiseSpeed,q,d);
      altitude=hermite(0,340,0,0,q,d);vy=hermiteVelocity(0,340,0,0,q,d);pitch=Math.max(.105*(1-smooth((q-3)/5)),Math.atan2(vy,vx));gear=1-smooth((q-4)/5);phase='climb';
    }else if(t<c.turn1End){
      const q=(t-c.climbEnd)/c.turnTime,angle=q*PI;x=c.east+Math.sin(angle)*c.turnRadius;z=c.runZ+(1-Math.cos(angle))*c.turnRadius;altitude=340;yaw=angle;roll=-.27*Math.sin(q*PI);gear=0;phase='departure-turn';
    }else if(t<c.cruiseEnd){x=c.east-(t-c.turn1End)*c.cruiseSpeed;z=c.runZ+2*c.turnRadius;altitude=340;yaw=PI;gear=0;phase='over-lake';}
    else if(t<c.turn2End){
      const q=(t-c.cruiseEnd)/c.turnTime,angle=q*PI;x=c.west-Math.sin(angle)*c.turnRadius;z=c.runZ+(1+Math.cos(angle))*c.turnRadius;altitude=340;yaw=PI+angle;roll=-.27*Math.sin(q*PI);gear=0;phase='approach-turn';
    }else{
      const q=t-c.turn2End,d=c.approachTime;x=hermite(c.west,c.start,c.cruiseSpeed,c.rollSpeed,q,d);vx=hermiteVelocity(c.west,c.start,c.cruiseSpeed,c.rollSpeed,q,d);
      altitude=hermite(340,0,0,0,q,d);vy=hermiteVelocity(340,0,0,0,q,d);yaw=TAU;pitch=Math.max(-.12,Math.atan2(vy,vx))*smooth((d-q)/4);gear=smooth((q-(d-10))/5);phase='approach';
    }
    // Raise the rotation pivot enough to keep the main wheels above the runway.
    const y=c.groundY+altitude+Math.max(0,Math.sin(pitch))*13.3;
    return{x,y,z,yaw,pitch,roll,gear,altitude,phase,time:t,cycle:c.cycle};
  }
  function buildStatic(map){
    const c=config(map),m=Mesh(),w=map.w,left=w*.075,right=w*.915,top=c.shore+190,bottom=c.shore+715;
    const ring=[[left+125,top+45],[left+390,top],[right-410,top+8],[right-85,top+110],[right,bottom-100],[right-210,bottom],[left+200,bottom-25],[left,bottom-160]];
    const center=[(left+right)/2,.55,(top+bottom)/2];
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length];m.tri(center,[a[0],.55,a[1]],[b[0],.55,b[1]],C.grass);
      m.quad([a[0],.54,a[1]],[b[0],.54,b[1]],[b[0]-6,-2,b[1]+7],[a[0]-6,-2,a[1]+7],i<3?C.shore:C.stone);
    }
    const rect=(x,z,ww,dd,y,col)=>m.quad([x,y,z],[x,y,z+dd],[x+ww,y,z+dd],[x+ww,y,z],col);
    const runwayLeft=w*.115,runwayRight=w*.875,runwayLength=runwayRight-runwayLeft;
    rect(runwayLeft-12,c.runZ-42,runwayLength+24,84,.59,C.shore);
    rect(runwayLeft,c.runZ-33,runwayLength,66,.66,C.runway);
    for(const side of [-1,1])m.line(runwayLeft+8,c.runZ+side*29,runwayRight-8,c.runZ+side*29,1.4,.69,C.mark);
    for(let x=runwayLeft+130;x<runwayRight-100;x+=110)rect(x,c.runZ-1.4,46,2.8,.70,C.mark);
    for(const x of [runwayLeft+30,runwayRight-82])for(const z of [-24,-16,-8,6,14,22])rect(x,c.runZ+z,52,3,.71,C.mark);
    // An apron, two taxiway joins, compact terminal, hangar and control tower.
    const apronX=w*.29,apronZ=c.runZ-156,apronW=510;
    rect(apronX,apronZ,apronW,87,.63,C.apron);
    for(const x of [apronX+65,apronX+apronW-65]){rect(x-15,apronZ+78,30,c.runZ-33-apronZ-78,.64,C.apron);m.line(x,apronZ+55,x,c.runZ-45,1.5,.68,'#e2c663');}
    for(let i=0;i<4;i++){const x=apronX+85+i*110;m.line(x,apronZ+13,x,apronZ+60,1.3,.68,C.mark);m.line(x-14,apronZ+60,x+14,apronZ+60,1.3,.68,C.mark);}
    m.box(apronX+180,13,apronZ-22,220,25,46,'#ddd7bf');m.box(apronX+180,26,apronZ-22,231,2.3,53,C.blue);
    for(let i=0;i<8;i++)m.box(apronX+82+i*28,15,apronZ+1.25,21,9,.65,C.glass);
    m.box(apronX+385,15,apronZ-15,105,29,59,'#bbc4ba');m.box(apronX+385,30,apronZ-15,111,3,65,C.white);m.box(apronX+385,12,apronZ+14.7,71,21,.6,'#7e9394');
    const tx=apronX+30,tz=apronZ-20;m.box(tx,24,tz,15,47,15,C.white);m.box(tx,45,tz,31,12,25,C.glass);m.box(tx,52,tz,36,3,30,C.blue);m.box(tx,59,tz,1.5,12,1.5,C.metal);
    // Low green island trees and evenly spaced runway lights stay inexpensive.
    for(let i=0;i<13;i++){
      const x=left+220+i*(right-left-420)/12,z=bottom-50-(i%3)*18;m.box(x,8,z,3,15,3,'#8d7657');m.cylinder(x,20,z,13,20,i%2?'#6d9e68':'#81ac72',5,1.5);
    }
    for(let x=runwayLeft+80;x<runwayRight-40;x+=230)for(const side of [-1,1])m.box(x,1.3,c.runZ+side*38,2.2,1.2,2.2,'#e2d7a5');
    // Static metadata is on the returned mesh only; the gameplay map is untouched.
    m.airport={name:'Toronto Island Airfield',shore:c.shore,runway:{x:runwayLeft,z:c.runZ,length:runwayLength,width:66,height:.66},bounds:{left,right,top,bottom},vertices:m.data.length/6};
    return m;
  }
  function tube(m,rings,cy,cz,color,sides=8){
    const old=m.solidFace;m.solidFace=true;
    for(let j=0;j<rings.length-1;j++)for(let k=0;k<sides;k++){
      const a=k*TAU/sides,b=(k+1)*TAU/sides,R=rings[j],S=rings[j+1],p=(r,t)=>[r[0],cy+Math.cos(t)*r[1],cz+Math.sin(t)*r[2]];
      m.quad(p(R,a),p(S,a),p(S,b),p(R,b),shade(color,.77+.20*Math.max(0,Math.cos((a+b)/2))));
    }
    for(const end of [0,rings.length-1]){const r=rings[end];for(let k=0;k<sides;k++){const a=k*TAU/sides,b=(k+1)*TAU/sides,p=[r[0],cy,cz],q=[r[0],cy+Math.cos(a)*r[1],cz+Math.sin(a)*r[2]],s=[r[0],cy+Math.cos(b)*r[1],cz+Math.sin(b)*r[2]];if(end===0)m.tri(p,q,s,shade(color,.8));else m.tri(p,s,q,color);}}
    m.solidFace=old;
  }
  // A tapered closed wing prism, with inward winding matching Mesh.box.
  function wing(m,points,y,thickness,color){
    const old=m.solidFace;m.solidFace=true;
    const upper=points.map(p=>[p[0],y+thickness/2,p[1]]),lower=points.map(p=>[p[0],y-thickness/2,p[1]]);
    // Normalize planform to x-z counterclockwise, which is inward on its top.
    let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
    if(area<0){upper.reverse();lower.reverse();}
    m.polygon(upper,color);m.polygon([...lower].reverse(),shade(color,.65));
    for(let i=0;i<upper.length;i++){const j=(i+1)%upper.length;m.quad(lower[i],lower[j],upper[j],upper[i],shade(color,.82));}
    m.solidFace=old;
  }
  function modelMeshes(){
    if(model)return model;const body=Mesh(),gear=Mesh(),prop=Mesh();
    tube(body,[[-67,.8,.8],[-51,3.6,3.6],[-30,7,7],[26,7.3,7.3],[48,5.4,5.4],[62,2.4,2.4],[68,.4,.4]],0,0,C.white);
    for(const side of [-1,1]){
      wing(body,[[15,0],[0,70*side],[-22,70*side],[-18,0]],4.9,2.5,C.white);
      wing(body,[[-38,0],[-49,29*side],[-61,29*side],[-55,0]],6.6,1.8,C.blue);
      tube(body,[[-15,2,2],[-8,4.3,4.3],[17,4.3,4.3],[24,2.3,2.3]],.5,side*28,C.white);
      // Readable blue fuselage stripe and individual dark passenger windows.
      body.quad([-28,-1,7.22*side],[27,-1,7.42*side],[27,1.6,7.42*side],[-28,1.6,7.22*side],C.blue);
      for(let i=0;i<8;i++)body.quad([-25+i*6,2.5,6.30*side],[-21.7+i*6,2.5,6.30*side],[-21.7+i*6,4.5,5.96*side],[-25+i*6,4.5,5.96*side],C.glass);
      body.quad([43,2.5,5.90*side],[54,1.8,4.1*side],[50,4,3.75*side],[42,4.7,5.48*side],C.dark);
      body.box(-8,5.15,side*67,9,3.1,4,side===-1?C.red:'#73a58a');
      gear.box(-10,-7.2,side*8.5,2.3,7,2.3,C.metal);gear.box(-10,-10.1,side*8.5,6.5,3.4,4,C.dark);
    }
    // Closed vertical tail, extruded in z. Faces are deliberately double-sided;
    // its small count keeps both rendering paths robust at steep viewing angles.
    const fin=[[-59,5],[-57,28],[-44,27],[-32,5]];
    for(const side of [-1,1])body.polygon(fin.map(p=>[p[0],p[1],side*1.3]),C.blue);
    for(let i=0;i<fin.length;i++){const a=fin[i],b=fin[(i+1)%fin.length];body.quad([a[0],a[1],-1.3],[b[0],b[1],-1.3],[b[0],b[1],1.3],[a[0],a[1],1.3],shade(C.blue,.85));}
    body.box(-50,25,0,13,4,2.9,C.red);
    gear.box(43,-7.5,0,2,7,2,C.metal);gear.box(43,-10.1,0,5.5,3.4,3.5,C.dark);
    // Three solid blades in a local y-z plane; each propeller is spun separately.
    for(let k=0;k<3;k++){
      const a=k*TAU/3,ca=Math.cos(a),sa=Math.sin(a),blade=Mesh();blade.box(0,6,0,1.1,10,2,C.dark);
      for(let v=0;v<blade.data.length;v+=6){const y=blade.data[v+1],z=blade.data[v+2];blade.data[v+1]=y*ca-z*sa;blade.data[v+2]=y*sa+z*ca;}
      prop.data.push(...blade.data);prop.cull.push(...blade.cull);
    }
    model={body,gear,prop,vertices:(body.data.length+gear.data.length+2*prop.data.length)/6};return model;
  }
  function appendTransformed(target,source,pose,extra){
    const cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),cr=Math.cos(pose.roll),sr=Math.sin(pose.roll),src=source.data;
    const spin=extra&&extra.spin||0,ca=Math.cos(spin),sa=Math.sin(spin),offset=extra&&extra.offset||[0,0,0];
    for(let i=0;i<src.length;i+=6){
      const xx=src[i]+offset[0],yy=src[i+1]*ca-src[i+2]*sa+offset[1],zz=src[i+1]*sa+src[i+2]*ca+offset[2],ry=yy*cr-zz*sr,rz=yy*sr+zz*cr,px=xx*cp-ry*sp,py=xx*sp+ry*cp;
      target.data.push(pose.x+px*cy-rz*sy,pose.y+py,pose.z+px*sy+rz*cy,src[i+3],src[i+4],src[i+5]);
    }
    for(const c of source.cull)target.cull.push(c);
  }
  function updateMesh(mesh,map,time,camera){
    const pose=sampleFlight(map,time),eye=camera&&camera.eye;
    // Distance-only culling preserves rear mirrors. The existing renderer performs
    // triangle/frustum culling, with genuine perspective in both rendering paths.
    if(eye&&Math.hypot(pose.x-eye[0],pose.y-eye[1],pose.z-eye[2])>(Number.isFinite(camera.far)?camera.far:1850)+85)return{pose,vertices:0,visible:false};
    const models=modelMeshes(),before=mesh.data.length;appendTransformed(mesh,models.body,pose);appendTransformed(mesh,models.gear,pose,{offset:[0,(1-pose.gear)*11.3,0]});
    const spin=(Number.isFinite(time)?time:0)*39;for(const side of [-1,1])appendTransformed(mesh,models.prop,pose,{offset:[25,.5,side*28],spin:spin*side});
    return{pose,vertices:(mesh.data.length-before)/6,visible:true};
  }
  return{buildStatic,updateMesh,sampleFlight};
});
