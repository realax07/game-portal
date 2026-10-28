import {discard} from './decks.js';
import {has} from './traits.js';

// Named effects; unknown expansion cards retain an explicit sample fallback.
// Data is paraphrased, not the printed card text. See reference/rules/base-progress.md.
export const CURSES={
 'Lose a Level':{effect:'levels',amount:1,desc:'Потеряй 1 уровень.'},
 'Curse! Lose a Level':{effect:'levels',amount:1,desc:'Потеряй 1 уровень.'},
 'Curse! Duck of Doom':{effect:'levels',amount:2,desc:'Потеряй 2 уровня.'},
 'Curse! Lose a Big Item':{effect:'item',big:true,desc:'Сбрось одну большую шмотку из игры на свой выбор.'},
 'Curse! Lose a Small Item':{effect:'item',big:false,desc:'Сбрось одну небольшую шмотку из игры на свой выбор.'},
 'Curse! Lose the Armor You Are Wearing':{effect:'slot',slot:'body',desc:'Потеряй надетую броню.'},
 'Curse! Lose the Footgear You Are Wearing':{effect:'slot',slot:'feet',desc:'Потеряй надетую обувку.'},
 'Curse! Lose the Headgear You Are Wearing':{effect:'slot',slot:'head',desc:'Потеряй надетый головняк. Курица на голове тоже сбрасывается.'},
 'Curse! Lose Your Class':{effect:'identity',kind:'class',desc:'Сбрось все свои классы. Если классов нет — потеряй 1 уровень.'},
 'Curse! Lose Your Race':{effect:'identity',kind:'race',desc:'Сбрось все свои расы и стань человеком.'},
 'Curse! Change Class':{effect:'changeIdentity',kind:'class',desc:'Сбрось все классы и получи верхний класс из сброса дверей, который был там до этого проклятия. Без класса проклятие не действует.'},
 'Curse! Change Race':{effect:'changeIdentity',kind:'race',desc:'Сбрось все расы и получи верхнюю расу из прежнего сброса дверей. На человека не действует.'},
 'Curse! Change Sex':{effect:'persistent',key:'sex',desc:'Смени пол. В текущем или следующем бою получишь −5 к силе.'},
 'Curse! Chicken on Your Head':{effect:'persistent',key:'chicken',desc:'−1 ко всем своим броскам кубика. Потеря головняка от проклятия или непотребства убирает и курицу.'},
 'Curse! Malign Mirror':{effect:'persistent',key:'mirror',desc:'В текущем или следующем бою не работают бонусы шмоток, кроме брони. Снять кольцом можно только до участия в бою.'},
 'Truly Obnoxious Curse!':{effect:'strongest',desc:'Потеряй шмотку с наибольшим действующим боевым бонусом. При равенстве выбери сам.'},
 'Curse! Lose Two Cards':{effect:'neighbors',desc:'Сосед слева берёт случайную карту из твоей руки, затем сосед справа — ещё одну. Если карта одна, её получает сосед слева.'},
 'Curse! Income Tax':{effect:'tax',desc:'Сбрось шмотку. Остальные сбрасывают шмотки на сумму не меньше её цены. Кто не может заплатить — теряет все шмотки и 1 уровень.'}
};
const rule=c=>CURSES[c.en]||{effect:'levels',amount:1};
export const activeCurses=p=>p.curses||[];
export const diePenalty=p=>-activeCurses(p).filter(c=>c.curseKey==='chicken').length;
export const curseCombatPenalty=p=>activeCurses(p).filter(c=>c.curseKey==='sex').length*-5;
export const hasMirror=p=>activeCurses(p).some(c=>c.curseKey==='mirror');
export const itemsInPlay=p=>[...p.equipment,...(p.carried||[])].filter(c=>c.type==='item'||c.isItem);
function removeCards(p,uids){const cards=[...p.hand,...p.equipment,...(p.carried||[]),...activeCurses(p)].filter(c=>uids.includes(c.uid));for(const field of ['hand','equipment','carried','curses'])if(p[field])p[field]=p[field].filter(c=>!uids.includes(c.uid));return cards}
export function loseHeadgearCurse(g,p){const chickens=activeCurses(p).filter(c=>c.curseKey==='chicken');p.curses=activeCurses(p).filter(c=>c.curseKey!=='chicken');discard(g,chickens);return chickens}
export function cleanIdentities(g,p){for(const kind of ['class','race']){if(!p.equipment.some(c=>c.type===kind)){const cards=p.equipment.filter(c=>[`${kind}-mod`,`${kind}-aura`].includes(c.slot));p.equipment=p.equipment.filter(c=>!cards.includes(c));discard(g,cards)}}}
export function finishCombatCurses(g,actors=[g.turn,...(g.helper===null?[]:[g.helper])]){for(const actor of actors){const p=g.players[actor];const cards=activeCurses(p).filter(c=>['mirror','sex'].includes(c.curseKey));p.curses=activeCurses(p).filter(c=>!cards.includes(c));discard(g,cards)}}
export function startCurse(g,card,target,{source=null,faceUp=false}={}){
 if(g.pendingCurse||!g.players[target]||g.players[target].dead)return{ok:false,reason:'Проклятие сейчас нельзя разыграть.'};
 if(source!==null){const p=g.players[source];if(!p?.hand.some(c=>c.uid===card.uid))return{ok:false,reason:'Карты нет в руке.'};p.hand=p.hand.filter(c=>c.uid!==card.uid)}
 const order=g.players.map((_,i)=>(target+i)%g.players.length);
 g.pendingCurse={card:structuredClone(card),target,source,faceUp,stage:'protection',order,index:0};
 return{ok:true};
}
function end(g,text){const pending=g.pendingCurse;discard(g,pending.card);delete g.pendingCurse;g.combatRevision=(g.combatRevision||0)+1;return{done:true,text}}
function lose(g,p,cards){const removed=removeCards(p,cards.map(c=>c.uid));discard(g,removed);if(removed.some(c=>c.slot==='head'))loseHeadgearCurse(g,p);cleanIdentities(g,p)}
const price=c=>c.gold??0;
function bonus(p,c){if(c.requires&&!c.requires.some(en=>has(p,en))||c.forbids?.some(en=>has(p,en))||c.sexOnly&&c.sexOnly!==p.sex)return 0;return(c.bonus||0)+(c.identityBonuses||[]).reduce((n,b)=>n+(has(p,b.identity)?b.bonus:0),0)+(c.sexBonuses||[]).reduce((n,b)=>n+(p.sex===b.sex?b.bonus:0),0)}
function candidates(p,r){if(r.effect==='slot')return p.equipment.filter(c=>c.type==='item'&&c.slot===r.slot);let cards=itemsInPlay(p);if(r.effect==='item')cards=cards.filter(c=>!!c.big===r.big);if(r.effect==='strongest'){const max=Math.max(0,...cards.map(c=>bonus(p,c)));cards=cards.filter(c=>bonus(p,c)===max)}return cards}
// Returns serializable decisions. No hidden hand contents are exposed to a
// neighbour: the UI gets a count and opaque UIDs for random draws only.
export function cursePrompt(g){
 const e=g.pendingCurse;if(!e)return null;const p=g.players[e.target],r=rule(e.card);
 if(e.faceUp&&p.equipment.some(c=>c.protectDoorCurses)){return end(g,`${p.name}: обувка защитила от открытого проклятия.`)}
 if(e.stage==='protection'&&!e.orcOffered&&has(p,'Orc')&&p.level>1)return{kind:'orc',actor:e.target,target:e.target,card:e.card,cards:[],optional:true};
 while(e.stage==='protection'){
  const actor=e.order[e.index];if(actor===undefined){e.stage='effect';break}
  const rings=[...g.players[actor].hand,...(g.players[actor].carried||[])].filter(c=>c.effect==='wishingRing');
  if(rings.length)return{kind:'protection',actor,target:e.target,card:e.card,cards:rings,optional:true};e.index++;
 }
 if(e.stage==='taxOthers'){
  while(e.index<e.order.length){
   const actor=e.order[e.index],payer=g.players[actor],cards=itemsInPlay(payer);const total=cards.reduce((n,c)=>n+price(c),0);
   if(payer.dead||e.tax===0){e.index++;continue}
   if(total<e.tax){lose(g,payer,cards);payer.level=Math.max(1,payer.level-1);e.index++;continue}
   return{kind:'tax',actor,target:e.target,card:e.card,cards,minValue:e.tax};
  }
  return end(g,`${p.name}: налог ${e.tax} золотых взыскан со всех.`);
 }
 if(r.effect==='levels'){p.level=Math.max(1,p.level-r.amount);return end(g,`${p.name}: −${r.amount} ур.`)}
 if(r.effect==='persistent'){
  if(r.key==='sex')p.sex=p.sex==='female'?'male':'female';
  p.curses??=[];p.curses.push({...e.card,curseKey:r.key});delete g.pendingCurse;g.combatRevision=(g.combatRevision||0)+1;return{done:true,text:`${p.name}: ${r.desc}`};
 }
 if(r.effect==='identity'||r.effect==='changeIdentity'){
  const old=p.equipment.filter(c=>c.type===r.kind);
  const replacement=r.effect==='changeIdentity'&&old.length?(g.discards?.doors||[]).findLast(c=>c.type===r.kind):null;
  if(replacement){g.discards.doors=g.discards.doors.filter(c=>c.uid!==replacement.uid)}
  p.equipment=p.equipment.filter(c=>!old.includes(c));discard(g,old);
  if(replacement)p.equipment.push(replacement);
  if(!old.length&&r.effect==='identity'&&r.kind==='class')p.level=Math.max(1,p.level-1);
  cleanIdentities(g,p);return end(g,`${p.name}: ${r.desc}`);
 }
 if(r.effect==='neighbors'){
  if(g.players.length>1)for(const actor of [(e.target+1)%g.players.length,(e.target-1+g.players.length)%g.players.length]){if(!p.hand.length||g.players[actor].dead)continue;const index=Math.floor(Math.random()*p.hand.length);g.players[actor].hand.push(p.hand.splice(index,1)[0])}
  return end(g,`${p.name}: соседи разобрали карты из руки.`);
 }
 const cards=candidates(p,r);
 if(!cards.length){if(r.slot==='head')loseHeadgearCurse(g,p);return end(g,`${p.name}: подходящих карт нет, проклятие не действует.`)}
 return{kind:r.effect==='tax'?'taxInitial':'loseItem',actor:e.target,target:e.target,card:e.card,cards,count:1};
}
export function respondToCurse(g,{uid=null,uids=null,pass=false}={}){
 const prompt=cursePrompt(g);if(!prompt)return{ok:false,reason:'Нет ожидающего проклятия.'};if(prompt.done)return{ok:true,...prompt};
 const e=g.pendingCurse,p=g.players[prompt.actor];
 if(prompt.kind==='orc'){if(pass){e.orcOffered=true;return{ok:true}}if(uid!=='orc')return{ok:false,reason:'Выбери потерю уровня или разрешение проклятия.'};p.level--;return{ok:true,...end(g,`${p.name} игнорирует проклятие как орк и теряет 1 уровень.`)}}
 if(prompt.kind==='protection'){
  if(pass){e.index++;return{ok:true}}
  if(!prompt.cards.some(c=>c.uid===uid))return{ok:false,reason:'Выбери кольцо или пропусти.'};
  discard(g,removeCards(p,[uid]));return{ok:true,...end(g,`${p.name} отменяет проклятие кольцом желания.`)};
 }
 const ids=uids||[uid];if(new Set(ids).size!==ids.length||ids.some(id=>!prompt.cards.some(c=>c.uid===id)))return{ok:false,reason:'Недопустимый выбор карт.'};
 if(prompt.kind==='tax'){
  const chosen=prompt.cards.filter(c=>ids.includes(c.uid));if(chosen.reduce((n,c)=>n+price(c),0)<prompt.minValue)return{ok:false,reason:'Сумма меньше налога.'};lose(g,p,chosen);e.index++;return{ok:true};
 }
 if(ids.length!==1)return{ok:false,reason:'Нужна одна карта.'};const chosen=prompt.cards.find(c=>c.uid===ids[0]);
 if(prompt.kind==='taxInitial'){e.tax=price(chosen);e.order=g.players.map((_,i)=>(e.target+i+1)%g.players.length).filter(i=>i!==e.target);e.index=0;e.stage='taxOthers'}
 lose(g,p,[chosen]);if(prompt.kind==='taxInitial')return{ok:true};return{ok:true,...end(g,`${p.name} теряет «${chosen.name}».`)};
}
export function removePersistentCurse(g,actor,ringUid,target,curseUid){const p=g.players[actor],victim=g.players[target],ring=[...p.hand,...(p.carried||[])].find(c=>c.uid===ringUid&&c.effect==='wishingRing'),curse=activeCurses(victim||{}).find(c=>c.uid===curseUid);if(!ring||!curse||p.dead||g.pendingCurse||curse.curseKey==='mirror'&&g.phase==='combat'&&[g.turn,g.helper].includes(target))return{ok:false,reason:'Это проклятие сейчас нельзя снять.'};discard(g,removeCards(p,[ringUid]));discard(g,removeCards(victim,[curseUid]));g.combatRevision=(g.combatRevision||0)+1;return{ok:true,text:`${p.name} снимает «${curse.name}» с ${victim.name}.`}}
