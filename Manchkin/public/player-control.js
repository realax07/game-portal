import {BOT_PROFILES} from './ai.js';
export function setPlayerController(g,actor,bot,rng=Math.random){
 const p=g.players[actor];if(!p||typeof bot!=='boolean')return{ok:false};
 if(p.bot===bot)return{ok:true,changed:false};
 if(bot&&!p.aiProfile){const used=new Set(g.players.filter(p=>p.bot).map(p=>p.aiProfile)),pool=BOT_PROFILES.filter(p=>!used.has(p.id));p.aiProfile=(pool.length?pool:BOT_PROFILES)[Math.floor(rng()*(pool.length||BOT_PROFILES.length))].id}
 p.bot=bot;p.aiMemory??={};g.controlRevision=(g.controlRevision||0)+1;
 return{ok:true,changed:true,text:`${p.name}: управление передано ${bot?'боту':'игроку'}.`};
}
// A render may happen while an older bot loop is still unwinding. Re-evaluate
// after it exits; a resolved reaction promise must not swallow the next turn.
export const shouldDriveBot=g=>!!g&&g.winner===null&&!!g.players[g.turn]?.bot&&!g.reaction&&!g.pendingCurse&&!(g.pendingAxe||g.pendingMap)&&!g.pendingEncounter&&!g.pendingDivine;
export function createBotScheduler({getGame,run,onError=()=>{}}){
 let task=null,queued=false,generation=0;
 function request(){if(queued)return;queued=true;const stamp=generation;queueMicrotask(()=>{if(stamp!==generation)return;queued=false;if(task||!shouldDriveBot(getGame()))return;let failed=false;const current=Promise.resolve().then(run);task=current;current.catch(e=>{failed=true;onError(e)}).finally(()=>{if(task===current){task=null;if(!failed)request()}})})}
 return{request,reset(){generation++;task=null;queued=false},get running(){return!!task}};
}
