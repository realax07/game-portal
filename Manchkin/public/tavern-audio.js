// Original procedural score and sound design. No external audio or network requests.
import {eventStyle} from './table-state.js';

export const AUDIO_KEY='tavern-audio-v1';
export const AUDIO_DEFAULTS=Object.freeze({enabled:false,master:.65,music:.36,ambient:.3,effects:.7});
export function audioSettings(value={}){
 const out={...AUDIO_DEFAULTS};
 if(typeof value?.enabled==='boolean')out.enabled=value.enabled;
 for(const key of ['master','music','ambient','effects'])if(typeof value?.[key]==='number'&&Number.isFinite(value[key]))out[key]=Math.max(0,Math.min(1,value[key]));
 return out;
}
export function eventCue(entry){
 const text=entry.text||'',card=entry.card;
 if(/кубик|брос[а-яё]*|выбросил/i.test(text))return 'dice';
 if(/смыва|смывка|убег|сбега/i.test(text))return 'escape';
 if(/побежда|побед|Божественн/i.test(text))return 'victory';
 if(card?.type==='curse'||entry.type==='curse'||/прокля|потер[яял]|теряет|−\d+ ур/i.test(text))return 'curse';
 if(/уровень|ур\.|уровня/i.test(text)&&!(/начинает ход/.test(text)))return 'level';
 if(/начинает ход|завершает ход/.test(text))return 'turn';
 if(['potion','escape','special','die'].includes(card?.type))return 'magic';
 if(card?.type==='monster'&&/подки|добав|бой|встреч|двер/i.test(text))return 'monster';
 return ({trade:'coins',curse:'curse',victory:'victory',sabotage:'clash',escape:'escape',gear:'equip',help:'card',door:'door',loot:'coins'})[entry.type||eventStyle(text,entry.kind).type]||'card';
}
// Observe only fresh public log entries. Restores, polling and rerenders stay silent.
export function createAudioEvents(){
 let scope=null,seen=new Set(),sequence=0,winner=null;
 const key=e=>`${e.sequence??''}|${e.round??''}|${e.actor??''}|${e.text}`;
 return (state,id=state)=>{
  if(!state)return [];
  const log=state.log||[],next=Math.max(0,...log.map(e=>e.sequence||0));
  if(scope!==id||(next&&next<sequence)){
   scope=id;seen=new Set(log.map(key));sequence=next;winner=state.winner??null;return [];
  }
  const fresh=log.filter(e=>!seen.has(key(e))).reverse();
  for(const e of log)seen.add(key(e));
  if(seen.size>500)seen=new Set(log.map(key));
  sequence=Math.max(sequence,next);
  const cues=fresh.map(eventCue);
  if(state.winner!=null&&winner!==state.winner)cues.push('win');
  winner=state.winner??null;
  return cues;
 };
}

const hz=n=>440*2**((n-69)/12);
const CHORDS=[[50,57,62,65],[48,55,60,64],[55,62,67,71],[50,57,62,65],[53,60,65,69],[48,55,60,64],[45,52,57,61],[50,57,62,65]];
const MELODIES=[
 [74,77,76,74,69,72],[74,76,77,81,77,76],
 [72,76,79,77,76,72],[71,74,79,78,74,71],
 [77,81,79,77,76,74],[76,79,77,76,72,69],
 [73,76,81,79,76,73],[74,77,81,77,76,74]
];

export function createTavernAudio({storage,contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)()}={}){
 let settings;try{storage??=globalThis.localStorage;settings=audioSettings(JSON.parse(storage?.getItem(AUDIO_KEY)||'null'))}catch{settings=audioSettings()}
 let ctx,buses,master,noiseBuffer,ambientNodes=[],timer,next=0,step=0,unlocked=false,hidden=false,starting=null,status='idle';
 const listeners=new Set(),events=createAudioEvents(),lastCue=new Map();
 const report=()=>listeners.forEach(fn=>fn({...settings,status}));
 const active=()=>settings.enabled&&settings.master>0&&!hidden;
 function gain(node,value){node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setTargetAtTime(value,ctx.currentTime,.07)}
 function apply(){if(!ctx)return;gain(master,active()?settings.master:0);for(const channel of ['music','ambient','effects'])gain(buses[channel],settings[channel])}
 function tone(freq,time,duration,volume,bus='effects',instrument='sine',pan=0){
  if(!ctx||ctx.state!=='running')return;
  const output=ctx.createGain(),stereo=ctx.createStereoPanner();stereo.pan.value=pan;
  output.gain.setValueAtTime(.0001,time);output.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.009);
  output.gain.exponentialRampToValueAtTime(.0001,time+duration);
  output.connect(stereo);stereo.connect(buses[bus]);
  const partials=instrument==='lute'?[[1,1],[2,.28],[3,.1]]:instrument==='flute'?[[1,1],[2,.12],[3,.05]]:[[1,1]];
  let remaining=partials.length;
  for(const [multiple,level]of partials){const oscillator=ctx.createOscillator(),weight=ctx.createGain();oscillator.type=instrument==='triangle'?'triangle':'sine';oscillator.frequency.setValueAtTime(freq*multiple,time);if(instrument==='flute')oscillator.frequency.linearRampToValueAtTime(freq*multiple*1.002,time+duration);weight.gain.value=level;oscillator.connect(weight);weight.connect(output);oscillator.start(time);oscillator.stop(time+duration+.02);oscillator.onended=()=>{oscillator.disconnect();weight.disconnect();if(!--remaining){output.disconnect();stereo.disconnect()}}}
 }
 function noise(time,duration,volume,frequency=1800,q=.5,bus='effects'){
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();src.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=q;
  env.gain.setValueAtTime(.0001,time);env.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.008);env.gain.exponentialRampToValueAtTime(.0001,time+duration);
  src.connect(filter);filter.connect(env);env.connect(buses[bus]);src.start(time,Math.random());src.stop(time+duration+.02);src.onended=()=>{src.disconnect();filter.disconnect();env.disconnect()};
 }
 function ambient(){
  // Soft hearth, distant wind and indistinct room murmur; no recorded speech.
  for(const [frequency,level,rate]of [[340,.075,.7],[115,.035,.43],[710,.016,.83]]){
   const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();src.buffer=noiseBuffer;src.loop=true;src.playbackRate.value=rate;filter.type='lowpass';filter.frequency.value=frequency;env.gain.value=level;src.connect(filter);filter.connect(env);env.connect(buses.ambient);src.start();ambientNodes.push(src,filter,env);
  }
 }
 function schedule(){
  if(!ctx||ctx.state!=='running'||!active())return;
  if(next<ctx.currentTime-.1)next=ctx.currentTime+.04;
  while(next<ctx.currentTime+.18){
   const bar=Math.floor(step/6)%64,beat=step%6,chord=CHORDS[bar%8],time=next;
   if(settings.music>0){
    tone(hz(chord[[0,1,2,1,3,2][beat]]),time,.46,.075,'music','lute',-.32);
    if(beat===0||beat===3)tone(hz(chord[0]-12),time,.44,.045,'music','lute',.1);
    // Alternating recorder phrases and quieter instrumental interludes.
    if(bar%16<12&&!(bar%4===3&&beat>3))tone(hz(MELODIES[(bar+Math.floor(bar/16))%8][beat]),time+.012,.21,bar%16<8?.033:.023,'music','flute',.3);
    if(beat===0||beat===3){tone(beat===0?92:145,time,.1,.032,'music','sine');noise(time,.045,.018,beat===0?420:1900,.7,'music')}
   }
   if(settings.ambient>0&&step%9===0)noise(time,.035,.025,900+Math.random()*1800,1.4,'ambient');
   if(settings.ambient>0&&step%67===26){tone(930,time,.12,.007,'ambient');tone(1370,time+.025,.09,.005,'ambient')}
   step++;next+=.245;
  }
 }
 function setup(){
  ctx=contextFactory();master=ctx.createGain();const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=12;limiter.ratio.value=5;master.connect(limiter);limiter.connect(ctx.destination);
  buses={};for(const key of ['music','ambient','effects']){buses[key]=ctx.createGain();buses[key].connect(master)}
  noiseBuffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*2),ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  apply();ambient();timer=setInterval(schedule,50);
 }
 async function sync(){
  if(!ctx)return;
  apply();
  try{if(active()&&unlocked){await ctx.resume();next=Math.max(next,ctx.currentTime+.03);status=ctx.state==='running'?'playing':'gesture';schedule()}else{await ctx.suspend();status=settings.enabled?'paused':'muted'}}catch{status='unavailable'}report();
 }
 async function unlock(){
  if(!active())return false;
  if(starting)return starting;
  starting=(async()=>{try{if(!ctx)setup();unlocked=true;await sync();return ctx.state==='running'}catch{status='unavailable';report();return false}finally{starting=null}})();return starting;
 }
 function set(values){settings=audioSettings({...settings,...values});try{storage?.setItem(AUDIO_KEY,JSON.stringify(settings))}catch{}if(ctx)void sync();report();return {...settings}}
 function effect(name='card',delay=0){
  if(!ctx||ctx.state!=='running'||!active()||!settings.effects)return;
  const now=ctx.currentTime;if(now-(lastCue.get(name)??-100)<.08)return;lastCue.set(name,now);
  const t=now+delay,notes=(values,gap=.09,duration=.2,volume=.075)=>values.forEach((n,i)=>tone(hz(n),t+i*gap,duration,volume,'effects','lute'));
  switch(name){
   case 'click':tone(430,t,.035,.025);break;
   case 'card':noise(t,.12,.11,2300,.7);noise(t+.045,.07,.06,3500,.6);break;
   case 'door':noise(t,.35,.13,260,2);tone(110,t,.18,.1,'effects','triangle');noise(t+.22,.12,.13,520,.7);break;
   case 'coins':notes([88,93,100,95],.045,.24,.05);break;
   case 'dice':for(let i=0;i<6;i++)noise(t+i*.045,.035,.095*(1-i*.1),1300+i*280,1.5);break;
   case 'equip':noise(t,.09,.08,2800,2);notes([69,76],.065,.18,.05);break;
   case 'magic':notes([74,81,86,89],.065,.32,.06);break;
   case 'curse':notes([65,61,54],.1,.34,.075);noise(t,.38,.035,620,1);break;
   case 'monster':notes([42,43,38],.09,.3,.09);noise(t,.25,.08,240,1.2);break;
   case 'clash':noise(t,.12,.17,3300,1.3);notes([63,66],.035,.18,.06);break;
   case 'escape':notes([76,74,71,69],.055,.11,.05);break;
   case 'level':notes([74,78,81,86],.09,.3,.07);break;
   case 'victory':notes([62,66,69,74],.1,.4,.075);break;
   case 'win':notes([62,66,69,74,69,74,78,81,86],.13,.55,.09);break;
   case 'turn':tone(hz(74),t,.18,.045,'effects','lute');break;
  }
 }
 const priority={card:0,turn:1,equip:2,coins:3,door:4,magic:5,escape:6,dice:7,monster:8,clash:9,curse:10,level:11,victory:12,win:13};
 function observeGame(state,id=state){
  const cues=events(state,id);if(!cues.length)return;
  // One meaningful cue per update prevents loud piles of bot/loot sounds.
  const cue=cues.reduce((best,c)=>(priority[c]??0)>(priority[best]??0)?c:best,'card');effect(cue);
 }
 return {get settings(){return {...settings}},get status(){return status},set,unlock,effect,observeGame,
  subscribe(fn){listeners.add(fn);fn({...settings,status});return()=>listeners.delete(fn)},
  setHidden(value){hidden=value;void sync()},
  async dispose(){clearInterval(timer);ambientNodes.forEach(n=>{try{n.stop?.();n.disconnect()}catch{}});await ctx?.close();listeners.clear()}
 };
}
