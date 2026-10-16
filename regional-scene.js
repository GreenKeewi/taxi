/* Static world assembly, subdivided into 400-unit cells before uploading.
   Geometry is generated once. Each view submits only cells within its radius. */
(function(root){'use strict';
const T=root.Taxi3D;
function build(map){
 const mesh=new T.Mesh(),signs=[],stats={districts:map.districts.length};mesh.cull=[];mesh.underRoad=[];mesh.roadMap=map;
 function append(source,dx=0){const a=source.data;for(let i=0;i<a.length;i+=6)mesh.data.push(a[i]+dx,a[i+1],a[i+2],a[i+3],a[i+4],a[i+5]);for(let i=0;i<a.length/18;i++){mesh.cull.push(source.cull?.[i]||0);mesh.underRoad.push(source.underRoad?.[i]||0);}}
 // Local origins keep the original city builder and its collision geometry intact.
 for(const [di,d] of map.districts.entries()){
  d.renderMap.regionTileGround=true;d.renderMap.terminalWest=di===0;d.renderMap.terminalEast=di===map.districts.length-1;
  const old=d.renderMap.buildings.length,city=root.TaxiCity.build(d.renderMap);append(city.mesh,d.offset);signs.push(...city.signs.map(s=>({...s,x:s.x+d.offset})));
  for(const b of d.renderMap.buildings.slice(old)){const v={...b,x:b.x+d.offset};if(d.offset)d.buildings.push(v);map.buildings.push(v);}
  for(const key of ['buildings','triangles','vertices','trees','ramps'])stats[key]=(stats[key]||0)+(city.stats[key]||0);
 }
 const H=map.highwayHeight,z=map.hy;
 function bridge(a,b,theme){
  for(let x=a;x<b;x+=80){const end=Math.min(x+80,b),w=end-x;
   mesh.quad([x,H,z-76],[x,H,z+76],[end,H,z+76],[end,H,z-76],'#515d66');
   const first=mesh.cull.length;
   mesh.box(x+w/2,H-3,z,w,6,152,'#98aaa8');
   for(const side of [-1,1]){mesh.box(x+w/2,H+4,z+side*75,w,8,2,'#bbc4b6');mesh.line(x,z+side*71,end,z+side*71,1.5,H+.09,'#f1edda');}
   for(let i=first;i<mesh.cull.length;i++)mesh.underRoad[i]=1;
   for(const side of [-1,1]){mesh.line(x+4,z+side*39.5,Math.min(end,x+35),z+side*39.5,1.8,H+.1,'#f1edda');}
   mesh.box(x+w/2,H+2,z,w,4,5.5,'#e7e1ce');
  }
  for(const {x} of map.highwayPiers.filter(p=>p.x>a&&p.x<b)){const first=mesh.cull.length;for(const s of [-1,1])mesh.box(x,28,z+s*108,10,56,13,'#9faeab');mesh.box(x,58,z,16,5,228,'#95a5a5');for(let i=first;i<mesh.cull.length;i++)mesh.underRoad[i]=1;}
  // Vegetation, field patches and an off-road rail corridor break up the journey.
  for(let x=a+120;x<b-80;x+=180){
   const side=(Math.floor(x/180)%2?1:-1),tz=z+side*(240+(Math.floor(x/180)%4)*60);
   mesh.box(x,8,tz,5,16,5,'#8b8063');mesh.cylinder(x,25,tz,24,30,'#668e61',6,3);
   if(theme==='freight'&&Math.floor(x/180)%4===0)mesh.box(x,18,z-580,160,36,95,'#a79981');
  }
  for(const s of [-1,1])mesh.line(a,z-850+s*6,b,z-850+s*6,2,1,'#8b8a79');
 }
 for(let i=1;i<map.districts.length;i++){
  const a=map.districts[i-1].highwayEnd,b=map.districts[i].highwayStart;bridge(a,b,i===1?'freight':'wetland');
  for(let x=a+300;x<b-100;x+=520){mesh.line(x,z-860,x,z-840,3,1,'#afa992');}
  for(const dir of [-1,1]){
   const x=dir>0?a+900:b-900,city=dir>0?map.districts[i].name:map.districts[i-1].name;
   mesh.box(x,H+35,z-dir*76,3,70,3,'#637d78');mesh.box(x,H+57,z-dir*57,90,26,4,'#356b60');signs.push({x,y:H+67,z:z-dir*57,text:city.toUpperCase()+'  '+Math.round((b-a)/10)+' m',color:'#356b60'});
  }
 }

 // Two different journeys: freight yards west of Pickering, protected
 // creek scenery to the east. Their geometry stays outside every road envelope.
 for(const sector of map.highwaySectors||[]){
  const mid=(sector.start+sector.end)/2;
  if(sector.kind==='freight'){
   for(let i=0;i<7;i++){
    const x=mid-500+i*155,tz=z-850;
    mesh.box(x,10,tz,145,13,34,'#5c6863');mesh.box(x,31,tz,131,29,29,['#a5634c','#688f8b','#b39a63'][i%3]);
    for(const side of[-1,1])for(const end of[-48,48])mesh.box(x+end,4,tz+side*18,16,8,3,'#3e4c46');
    if(i%2===0)mesh.box(x,59,tz,131,26,29,'#718a7d');
   }
   for(let i=0;i<3;i++){const x=mid-180+i*240,tz=z-460;mesh.box(x,28,tz,170,56,130,'#ac9d83');mesh.box(x,58,tz,180,4,140,'#839087');map.groundColliders.push({x:x-85,y:tz-65,w:170,h:130,minHeight:0,maxHeight:60,kind:'freight warehouse'});}
   for(const dx of[-230,170]){const cx=mid+dx,cz=z-550;for(const side of[-1,1])mesh.box(cx+side*100,80,cz,6,160,6,'#b98a52');mesh.box(cx,160,cz,220,8,9,'#cfa364');mesh.box(cx-35,146,cz,24,21,24,'#768d85');mesh.box(cx+50,113,cz,1.5,92,1.5,'#5c6e66');}
   const x=mid+480,tz=z-360;for(const side of[-1,1])mesh.box(x+side*18,72,tz,4,144,4,'#71857b');mesh.cylinder(x,153,tz,39,42,'#b8c4ae',10);mesh.cylinder(x,178,tz,40,8,'#718c82',10,20);
  }else{
   for(let i=0;i<4;i++){
    const cx=mid-950+i*650,cz=z-400-(i%2)*110,rx=300,rz=110;
    for(let k=0;k<16;k++){const a=k*Math.PI/8,b=(k+1)*Math.PI/8;mesh.tri([cx,-.5,cz],[cx+Math.cos(a)*rx,-.5,cz+Math.sin(a)*rz],[cx+Math.cos(b)*rx,-.5,cz+Math.sin(b)*rz],'#6faaa0');}
    for(let k=0;k<6;k++){const x=cx-200+k*80,tz=cz-rz-20;mesh.cylinder(x,68,tz,36,132,'#487f61',6,3);}
   }
   // Low reed islands are visible through the near-side window over the lake.
   for(let island=0;island<3;island++){
    const cx=mid-650+island*620,cz=map.waterfront.shoreZ+120;
    for(let k=0;k<16;k++){const a=k*Math.PI/8,b=(k+1)*Math.PI/8;mesh.tri([cx,.2,cz],[cx+Math.cos(a)*250,.2,cz+Math.sin(a)*72],[cx+Math.cos(b)*250,.2,cz+Math.sin(b)*72],'#8cae78');}
    for(let k=0;k<9;k++){const x=cx-180+k*45,tz=cz+(k%2?35:-30);mesh.cylinder(x,12,tz,7,24,'#789b60',5,1);}
   }
   for(let k=0;k<10;k++)mesh.box(mid-225+k*50,3,map.waterfront.shoreZ+18,48,5,24,'#b7ab87');
  }
  for(const direction of[-1,1]){
   const x=mid-direction*700,tz=z+direction*135;mesh.box(x,45,tz,2,90,2,'#71867a');mesh.box(x,79,tz,140,28,3,sector.kind==='freight'?'#75694e':'#446e58');
   signs.push({x,y:94,z:tz,text:sector.name.toUpperCase(),color:'#456a56'});
  }
 }

 for(const p of map.roadProfiles.filter(p=>p.kind==='exit')){
  const x=p.highwayJoin.x-p.highwayDir*350,side=p.highwayDir,zp=z+side*83;
  mesh.box(x,H+33,zp,2,66,2,'#657d76');mesh.box(x,H+56,zp,100,30,3,'#306457');
  signs.push({x,y:H+69,z:zp,text:'EXIT '+(map.districts.findIndex(d=>d.id===p.districtId)+1)+' · '+p.city.toUpperCase()+' ↗',color:'#306457'});
 }
 for(let x=0;x<map.w;x+=200){const w=Math.min(200,map.w-x);mesh.box(x+w/2,3,map.waterfront.shoreZ,w,6,8,'#a8b6ab');}

 // Ground and lake are tiled so a huge triangle cannot pin a distant chunk in view.
 // Local builder ground sheets are also split during chunking below.
 for(let x=-1600;x<map.w+1600;x+=800)for(let y=-1200;y<map.waterfront.shoreZ;y+=800)mesh.quad([x,-.85,y],[x+800,-.85,y],[x+800,-.85,Math.min(y+800,map.waterfront.shoreZ)],[x,-.85,Math.min(y+800,map.waterfront.shoreZ)],'#a8b694');
 for(let x=-1600;x<map.w+1600;x+=800)for(let y=map.waterfront.waterZ;y<map.h+2600;y+=800)mesh.quad([x,-1.1,y],[x+800,-1.1,y],[x+800,-1.1,y+800],[x,-1.1,y+800],'#6ab0bf');
 for(const d of map.districts){
  const x=(d.xs[0]+d.xs.at(-1))/2;
  signs.push({x,y:45,z:d.ys[2]-102,text:d.name.toUpperCase()+' · '+(d.theme==='garden'?'GARDEN CITY':d.theme==='industry'?'MOTOR CITY':'DOWNTOWN'),color:'#45685c'});
  if(d.offset){
   const bx=d.xs[2]+115,by=d.ys[2]+235;
   // Distinct civic/industrial silhouettes remain outside every road and bay.
   if(d.theme==='industry'){map.groundColliders.push({x:bx-20,y:by-17.5,w:40,h:35,minHeight:0,maxHeight:90,kind:'motor works'});for(let k=0;k<3;k++)map.groundColliders.push({x:bx+k*28-8,y:by+22,w:16,h:16,minHeight:0,maxHeight:150,kind:'chimney'});mesh.box(bx,45,by,40,90,35,'#b17f65');for(let k=0;k<3;k++)mesh.cylinder(bx+k*28,95,by+30,8,110,'#9c8f7e',8);signs.push({x:bx,y:105,z:by,text:'OSHAWA MOTOR WORKS',color:'#795340'});}
   else{map.groundColliders.push({x:bx-32.5,y:by-17.5,w:65,h:35,minHeight:0,maxHeight:92,kind:'civic hall'});mesh.box(bx,22,by,65,44,35,'#d3c8a9');mesh.box(bx,60,by,13,65,13,'#bdc5aa');signs.push({x:bx,y:95,z:by,text:'PICKERING CIVIC SQUARE',color:'#547d61'});}
  }
 }
 return{mesh,signs,stats};
}
function chunks(mesh,size=400){
 const bins=new Map();
 function add(a,b,c,t){const x=(a[0]+b[0]+c[0])/3,z=(a[2]+b[2]+c[2])/3,key=Math.floor(x/size)+','+Math.floor(z/size);let bin=bins.get(key);if(!bin){bin=new T.Mesh();bin.underRoad=[];bin.roadMap=mesh.roadMap;bin.bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};bins.set(key,bin);}const color=a.slice(3,6);bin.tri(a,b,c,color);bin.cull[bin.cull.length-1]=mesh.cull[t]||0;bin.underRoad.push(mesh.underRoad?.[t]||0);for(const p of[a,b,c]){bin.bounds.minX=Math.min(bin.bounds.minX,p[0]);bin.bounds.maxX=Math.max(bin.bounds.maxX,p[0]);bin.bounds.minZ=Math.min(bin.bounds.minZ,p[2]);bin.bounds.maxZ=Math.max(bin.bounds.maxZ,p[2]);}}
 function split(a,b,c,t,depth=0){
  const ab=Math.hypot(a[0]-b[0],a[2]-b[2]),bc=Math.hypot(b[0]-c[0],b[2]-c[2]),ca=Math.hypot(c[0]-a[0],c[2]-a[2]),long=Math.max(ab,bc,ca);
  if(long>700&&depth<16){let p=a,q=b,r=c;if(bc===long){p=b;q=c;r=a;}else if(ca===long){p=c;q=a;r=b;}const mid=p.map((v,i)=>(v+q[i])/2);split(p,mid,r,t,depth+1);split(mid,q,r,t,depth+1);}else add(a,b,c,t);
 }
 for(let i=0,t=0;i<mesh.data.length;i+=18,t++)split(mesh.data.slice(i,i+6),mesh.data.slice(i+6,i+12),mesh.data.slice(i+12,i+18),t);
 return[...bins.values()];
}
root.TaxiRegionalScene={build,chunks};
})(typeof window!=='undefined'?window:globalThis);
