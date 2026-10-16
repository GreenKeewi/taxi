const E=require('./engine3d.js'),R=require('./roads.js');
const g=new E.Game(8427,{traffic:'light',dispatch:'local'});g.start();g.spawnTraffic=()=>{};g.traffic=[];
// A test driver sends ordinary digital pedals/steering to the existing physics.
function drive(points,limit=900,park=false){let path=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],N=Math.max(1,Math.ceil(E.dist(a,b)/5));for(let j=0;j<N;j++)path.push({x:a.x+(b.x-a.x)*j/N,y:a.y+(b.y-a.y)*j/N});}path.push(points.at(-1));let k=0,stuck=0,last={...g.car},history=[],best=Infinity;
 for(let i=0;i<limit*60;i++){
 const c=g.car;let nearest=k,near=Infinity;for(let j=Math.max(0,k-2);j<Math.min(path.length,k+120);j++){const d=E.dist(c,path[j]);if(d<near){near=d;nearest=j;}}k=Math.max(k,nearest);
 let aim=k,look=28+Math.abs(c.speed)*.3;while(aim<path.length-1&&E.dist(c,path[aim])<look)aim++;
 const end=path.at(-1),left=E.dist(c,end),p=path[aim],error=E.angleDiff(Math.atan2(p.y-c.y,p.x-c.x),c.a);
 let turn=0;for(let j=k;j<Math.min(path.length-1,k+200);j++){if(E.dist(path[j],c)>Math.max(200,c.speed*c.speed/130+110))break;const next=path[j+1];turn=Math.max(turn,Math.abs(E.angleDiff(Math.atan2(next.y-path[j].y,next.x-path[j].x),c.a)));}
 const max=c.roadLayer==='highway'?E.kmhToSpeed(100):E.kmhToSpeed(32),desired=Math.min(max,turn>.85?40:turn>.45?65:turn>.25?95:max,Math.sqrt(Math.max(0,left-(park?3:6))*70));
 const targetSteer=E.clamp(error*2.4-c.yawRate*.25,-1,1),steerError=targetSteer-c.steer,input={up:c.speed<desired-1,brake:c.speed>desired+4,left:steerError<-.035,right:steerError>.035};
 if(left<(park?6:12)&&Math.abs(c.speed)<3){if(!park)return{ok:true,time:i/60,k,car:{...c},stats:{...g.stats}};input.brake=true;input.up=false;input.left=false;input.right=false;}
 g.update(1/60,input);
 if(i%60===0){const moved=E.dist(last,c);if(moved<.6&&left>15)stuck++;else stuck=0;last={...c};history.push({time:i/60,x:Math.round(c.x),y:Math.round(c.y),speed:Math.round(c.speed),k,aim,near:Math.round(near),error:Math.round(error*100)/100,turn:Math.round(turn*100)/100,layer:c.roadLayer});if(stuck>8||g.health<3)return{ok:false,reason:'stuck',history:history.slice(-12),car:{...c},event:g.events[0],stats:g.stats};}
 if(g.mode!=='playing')return{ok:false,reason:g.mode,event:g.events[0],history:history.slice(-12),car:c};
 }
 return{ok:false,reason:'timeout',history:history.slice(-12),car:g.car};
}
if(require.main===module){const start=g.map.bays[10],target=g.map.districts[1].bays[15];Object.assign(g.car,{x:start.x,y:start.roadY+56,a:0,speed:0});delete g.car.roadSample;g.sampleCarRoad();g.job.timeLeft=10000;g.job.dropoff=target;const path=E.route(g.map,g.car,target),result=drive(path);console.log(JSON.stringify(result,null,2));}
module.exports={g,drive};
