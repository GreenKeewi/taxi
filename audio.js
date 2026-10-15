/* Self-contained cabin sound. All synthesis starts from a user gesture. */
(function(root){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
class TaxiAudio {
 constructor(options={}){
  this.enabled=true;this.context=null;this.playing=false;this.lastSpeed=0;this.lastTime=0;
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
    this.engine=a.createGain();this.engine.gain.value=.12;this.engine.connect(this.master);
    this.filter=a.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=310;this.filter.Q.value=.6;this.filter.connect(this.engine);
    this.voices=[['sawtooth',1,.48],['triangle',.5,.26],['triangle',2.01,.13]].map(([type,ratio,level])=>{
     const oscillator=a.createOscillator(),gain=a.createGain();oscillator.type=type;oscillator.frequency.value=43*ratio;gain.gain.value=level;
     oscillator.connect(gain);gain.connect(this.filter);oscillator.start();return{oscillator,gain,ratio};
    });
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
  if(active)p.setTargetAtTime(.4,t,.025);else p.setValueAtTime(0,t);
 }
 update({speed=0,playing=false,turnAhead=false}={}){
  this.playing=!!playing;
  if(!this.context)return;
  const a=this.context,t=a.currentTime,dt=clamp(t-this.lastTime,.016,.15),v=Math.abs(Number(speed)||0);
  const acceleration=clamp((v-this.lastSpeed)/dt/80,0,1),load=clamp(v/115,0,1);
  // Smooth motor harmonics and a small acceleration lift give a warm vroom.
  const pitch=43+load*109+acceleration*19;
  this.voices.forEach(({oscillator,ratio})=>oscillator.frequency.setTargetAtTime(pitch*ratio,t,.10));
  this.filter.frequency.setTargetAtTime(270+load*630+acceleration*190,t,.12);
  this.engine.gain.setTargetAtTime(.105+load*.07+acceleration*.025,t,.08);
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
  if(this.context){this.playing=false;this._volume();this.voices.forEach(v=>v.oscillator.stop());const pending=this.context.close();if(pending&&pending.catch)pending.catch(()=>{});this.context=null;}
 }
}
root.TaxiAudio=TaxiAudio;if(typeof module!=='undefined'&&module.exports)module.exports=TaxiAudio;
})(typeof window!=='undefined'?window:globalThis);
