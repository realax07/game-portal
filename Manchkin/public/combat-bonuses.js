import {hasMirror} from './curses.js';
export function addCombatBonus(g,amount,{actor=g.turn,target=g.turn,kind='ability',tag=null,fire=false}={}){g.boost=(g.boost||0)+amount;g.bonusEntries??=[];g.bonusEntries.push({amount,actor,target,kind,tag,fire});return amount}
export function combatBoost(g,{levelsOnly=false}={}){const entries=g.bonusEntries||[];let n=g.boost||0;for(const e of entries){if(e.kind==='monster'){n-=e.amount;continue}if(e.amount>0&&(levelsOnly||e.fire&&(g.monsters||[g.monster]).some(m=>m?.immuneFire)||e.kind==='item'&&hasMirror(g.players[e.target])))n-=e.amount}if(levelsOnly){const unknown=(g.boost||0)-entries.reduce((n,e)=>n+e.amount,0);if(unknown>0)n-=unknown}return n}
export function dropIllusion(g){g.boost-=(g.illusionBonus||0);g.illusionBonus=0;g.bonusEntries=(g.bonusEntries||[]).filter(e=>e.tag!=='illusion')}

export function monsterSideBoost(g){return -(g.bonusEntries||[]).filter(e=>e.kind==='monster'&&!(e.fire&&(g.monsters||[g.monster]).some(m=>m?.immuneFire))).reduce((n,e)=>n+e.amount,0)}
