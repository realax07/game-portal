import {draw,discard} from './decks.js';
export function beginMap(g,actor,uid){
 const p=g.players[actor],card=p?.hand.find(c=>c.uid===uid&&c.effect==='peekDoors');
 if(!card||g.forcedEscapeReason||g.pendingAxe||g.pendingMap||g.pendingCurse||g.pendingDivine||g.pendingEncounter||g.winner!==null||p.dead)return{ok:false};
 p.hand=p.hand.filter(c=>c.uid!==uid);
 // Do not recycle the map being played into its own preview.
 const top=[];for(let i=0;i<3;i++){const c=draw(g,'doors');if(c)top.push(c)}
 g.doors.push(...[...top].reverse());discard(g,card);
 if(top.length)g.pendingMap={actor,cardUid:uid,uids:top.map(c=>c.uid)};
 return{ok:true,text:`${p.name} разыгрывает «${card.name}» и смотрит верхние двери (${top.length}).`,card};
}
function permutations(a){return a.length?a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(rest=>[x,...rest])):[[]]}
export function mapChoices(g){
 if(!g.pendingMap)return null;const {actor,uids}=g.pendingMap,cards=uids.map(uid=>g.doors.find(c=>c.uid===uid));
 if(cards.some(c=>!c))throw Error('Нарушен сохранённый просмотр дверей.');
 return{actor,cards,orders:permutations(uids)};
}
export function resolveMap(g,actor,order){
 const e=g.pendingMap;if(!e||actor!==e.actor||!Array.isArray(order)||order.length!==e.uids.length||new Set(order).size!==e.uids.length||order.some(uid=>!e.uids.includes(uid)))return{ok:false,reason:'Выбери порядок всех показанных дверей.'};
 const current=g.doors.slice(-e.uids.length).map(c=>c.uid);if(current.some(uid=>!e.uids.includes(uid)))return{ok:false,reason:'Состав просмотренных дверей изменился.'};
 const cards=g.doors.splice(-e.uids.length),byId=new Map(cards.map(c=>[c.uid,c]));g.doors.push(...[...order].reverse().map(uid=>byId.get(uid)));delete g.pendingMap;
 return{ok:true,text:`${g.players[actor].name} возвращает просмотренные двери в выбранном порядке.`};
}
