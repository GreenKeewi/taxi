/* Self-contained cabin sound. All synthesis starts from a user gesture. */
(function(root){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
class TaxiAudio {
 constructor(options={}){
  this.enabled=true;this.context=null;this.playing=false;this.lastSpeed=0;this.lastTime=0;this.lastGear=1;this.shiftUntil=0;this.noiseSources=[];
  this.nextHorn=-Infinity;this.nextTick=0;this.turnKey=null;this.tickCount=0;
  this.AudioContext=options.AudioContext||root.AudioContext||root.webkitAudioContext;
  this.document=options.document||root.document;
  this._hidden=()=>{if(this.document.hidden)this.update({speed:0,playing:false,turnAhead:false});};
  if(this.document&&this.document.addEventListener)this.document.addEventListener('visibilitychange',this._hidden);
 }
 start(){
  try{
   if(!this.context){
    if(!this.AudioContext){this.enabled=false;return false;}
    const a=this.context=new this.AudioContext();
    this.master=a.createGain();this.master.gain.value=0;this.master.connect(a.destination);
    this.engine=a.createGain();this.engine.gain.value=.16;this.engine.connect(this.master);
    this.filter=a.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=310;this.filter.Q.value=.6;this.filter.connect(this.engine);
    this.voices=[['sawtooth',1,.38],['triangle',.5,.32],['triangle',2,.17],['sine',3,.07]].map(([type,ratio,level])=>{
     const oscillator=a.createOscillator(),gain=a.createGain();oscillator.type=type;oscillator.frequency.value=43*ratio;gain.gain.value=level;
     oscillator.connect(gain);gain.connect(this.filter);oscillator.start();return{oscillator,gain,ratio};
    });
    // One deterministic noise loop feeds separate, restrained road and wind
    // bands. No random gain modulation: engine load supplies the motion cues.
    if(a.createBuffer&&a.createBufferSource){
     const length=Math.max(1,Math.floor(a.sampleRate*2)),buffer=a.createBuffer(1,length,a.sampleRate),data=buffer.getChannelData(0);
     let seed=92617;for(let i=0;i<length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.68;}
     const noise=(type,frequency,q)=>{const source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();this.noiseSources.push(source);return{source,filter,gain};};
     this.wind=noise('lowpass',850,.55);this.tyres=noise('bandpass',620,.8);this.road=noise('lowpass',230,.6);
    }
   }
   if(this.enabled&&this.context.state==='suspended'){
    const pending=this.context.resume();if(pending&&pending.catch)pending.catch(()=>{});
   }
   return this.enabled;
  }catch(e){this.enabled=false;return false;}
 }
 toggle(){this.enabled=!this.enabled;if(this.enabled)this.start();this._volume();return this.enabled;}
 _volume(){
  if(!this.context)return;
  const active=this.enabled&&this.playing&&!(this.document&&this.document.hidden),p=this.master.gain,t=this.context.currentTime;
  p.cancelScheduledValues(t);
  // Silence immediately on pause/hidden; resume with a short de-click fade.
  if(active)p.setTargetAtTime(.48,t,.04);else p.setValueAtTime(0,t);
 }
 update(options={}){
  const {playing=false,turnAhead=false}=options,c=options.car||options;
  this.playing=!!playing;
  if(!this.context)return;
  const a=this.context,t=a.currentTime,dt=clamp(t-this.lastTime,1/240,.15);
  const v=Math.abs(Number.isFinite(c.speedKmh)?c.speedKmh:(Number(c.speed)||0)*.36);
  const acceleration=clamp((v-this.lastSpeed)/dt/12,0,1),velocity=clamp(v/120,0,1.25);
  const bus=(options.vehicleType||c.kind)==='bus';
  const load=clamp(Number.isFinite(c.engineLoad)?c.engineLoad:options.throttle?1:acceleration*.85+.12,0,1);
  const gear=Number.isFinite(c.gear)?c.gear:Math.min(6,1+Math.floor(v/23));
  if(gear!==this.lastGear){this.shiftUntil=t+.14;this.lastGear=gear;}
  const rpm=Number.isFinite(c.engineRpm)?c.engineRpm:(bus?650:780)+v*(bus?85:145)/(Math.abs(gear)*.8+.2)+load*300;
  const shift=t<this.shiftUntil?.76:1,pitch=clamp(rpm*(bus?3:2)/60,bus?30:26,bus?185:210);
  this.voices.forEach(({oscillator,ratio})=>oscillator.frequency.setTargetAtTime(pitch*ratio,t,.065));
  this.filter.frequency.setTargetAtTime((bus?210:300)+pitch*3.7+load*390,t,.095);
  this.engine.gain.setTargetAtTime((.13+load*.095+velocity*.033)*shift,t,.065);
  const lateral=Math.abs(Number(c.lateralAccelerationMps2)||0),slip=clamp(Number(c.tireSlip)||0,0,1);
  if(this.wind){
   this.wind.gain.gain.setTargetAtTime(Math.pow(clamp(v/120,0,1.3),2)*.068,t,.2);
   this.wind.filter.frequency.setTargetAtTime(420+velocity*1050,t,.22);
   this.road.gain.gain.setTargetAtTime(clamp(v/65,0,1)*.042,t,.13);
   this.road.filter.frequency.setTargetAtTime(130+velocity*230,t,.13);
   const scrub=clamp((lateral-2.0)/5,0,1)*.065+slip*.10;
   this.tyres.gain.gain.setTargetAtTime(clamp(v/22,0,1)*scrub,t,.10);
   this.tyres.filter.frequency.setTargetAtTime(550+slip*1450+lateral*48,t,.12);
  }
  this.lastSpeed=v;this.lastTime=t;this._volume();
  const active=this.enabled&&this.playing&&!(this.document&&this.document.hidden);
  const turn=turnAhead&&typeof turnAhead==='object'?turnAhead:null;
  const near=turn&&(turn.direction==='left'||turn.direction==='right')&&Number.isFinite(turn.distance)&&turn.distance>=18&&turn.distance<=240;
  if(!active||!near){this.turnKey=null;this.tickCount=0;this.nextTick=t;return;}
  const key=String(turn.id==null?'next':turn.id)+':'+turn.direction;
  if(key!==this.turnKey){this.turnKey=key;this.tickCount=0;this.nextTick=t;}
  // A bounded, six-second approach cue cannot tick endlessly at a standstill.
  if(t>=this.nextTick&&this.tickCount<12){this._tick(this.tickCount%2===0);this.tickCount++;this.nextTick=t+.48;}
 }
 _tick(high){
  const a=this.context,t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='triangle';
  o.frequency.setValueAtTime(high?1150:850,t);o.frequency.exponentialRampToValueAtTime(high?620:440,t+.045);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.05);
  o.connect(g);g.connect(this.master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.06);
 }
 horn(){
  if(!this.context||!this.enabled||!this.playing||(this.document&&this.document.hidden))return false;
  const a=this.context,t=a.currentTime;if(t<this.nextHorn)return false;this.nextHorn=t+.42;
  const filter=a.createBiquadFilter(),g=a.createGain();filter.type='lowpass';filter.frequency.value=1300;filter.Q.value=.4;filter.connect(g);g.connect(this.master);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.014);g.gain.setValueAtTime(.12,t+.19);g.gain.exponentialRampToValueAtTime(.001,t+.28);
  let remaining=2;
  for(const frequency of [349,440]){const o=a.createOscillator();o.type='square';o.frequency.value=frequency;o.connect(filter);o.onended=()=>{o.disconnect();if(--remaining===0){filter.disconnect();g.disconnect();}};o.start(t);o.stop(t+.29);}
  return true;
 }
 destroy(){
  if(this.document&&this.document.removeEventListener)this.document.removeEventListener('visibilitychange',this._hidden);
  if(this.context){this.playing=false;this._volume();this.voices.forEach(v=>v.oscillator.stop());this.noiseSources.forEach(source=>source.stop());this.noiseSources=[];const pending=this.context.close();if(pending&&pending.catch)pending.catch(()=>{});this.context=null;}
 }
}
root.TaxiAudio=TaxiAudio;if(typeof module!=='undefined'&&module.exports)module.exports=TaxiAudio;
})(typeof window!=='undefined'?window:globalThis);
