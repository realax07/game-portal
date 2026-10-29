import {exceptionalItem} from './item-links.js';
import {itemUsable} from './card-effects.js';
import {has,handCapacity,normalizeHands} from './traits.js';
// A single representation is used by rules, bots and the equipment UI.
export const GEAR_SLOTS=[
  {slot:'head',name:'Головняк',icon:'helmet'},
  {slot:'body',name:'Броня',icon:'armor'},
  {slot:'hand',name:'Левая рука',icon:'sword',index:0},
  {slot:'hand',name:'Правая рука',icon:'axe',index:1},
  {slot:'feet',name:'Обувка',icon:'boots'},
  {slot:'steed',name:'Скакун',icon:'dragon'},
  {slot:'hireling',name:'Наёмник',icon:'elf'}
];
export const handCost=(c,p=null)=>c.slot==='hand'&&!(p?exceptionalItem(p,c):c.cheatCard||c.hirelingUid)?(c.hands||1):0;
export function identityLimit(p,kind){return p.equipment.find(c=>c.slot===`${kind}-mod`)?.limit||1}
export function identityKey(c){return (c.en||c.id).toLowerCase()}
export function equipPlan(p,c,replaceUid=null){
  if(c.cursedThingy)return{ok:false,reason:'Сначала сними проклятие вещи.'};
  if(!p.hand.some(x=>x.uid===c.uid))return{ok:false,reason:'Карта уже не в руке.'};
  if(c.type==='item'&&!itemUsable(p,c))return{ok:false,reason:'Шмотка недоступна твоему классу, расе или полу.'};
  if(exceptionalItem(p,c))return{ok:true,remove:[]};
  const same=p.equipment.filter(x=>x.slot===c.slot&&!exceptionalItem(p,x));
  if(['class-aura','race-aura'].includes(c.slot)&&!p.equipment.some(x=>x.slot===c.slot.split('-')[0]))return{ok:false,reason:'Для усиления сначала нужен соответствующий класс или раса.'};
  if(c.type==='multiclass'||c.type==='multirace'){
    const kind=c.type==='multiclass'?'class':'race';
    if(!p.equipment.some(x=>x.slot===kind))return{ok:false,reason:`Сначала разыграй ${kind==='class'?'хотя бы один класс':'хотя бы одну расу'}.`};
    const excess=p.equipment.filter(x=>x.slot===kind).slice(c.limit);
    return{ok:true,remove:[...same,...excess]};
  }
  if(c.slot==='class'||c.slot==='race'){
    if(same.some(x=>identityKey(x)===identityKey(c)))return{ok:false,reason:'Две одинаковые расы или два одинаковых класса одновременно нельзя.'};
    if(same.length<identityLimit(p,c.slot))return{ok:true,remove:[]};
    if(same.length===1)return{ok:true,remove:same};
    const replacement=same.find(x=>x.uid===replaceUid&&!x.cursedThingy);
    return replacement?{ok:true,remove:[replacement]}:{ok:false,choices:same,reason:'Все места заняты. Выбери карту, которую заменишь.'};
  }
  if(c.big&&!c.ignoreBigLimit&&c.slot!=='steed'&&!has(p,'Dwarf')&&p.equipment.some(x=>x.big&&!x.ignoreBigLimit&&x.slot!=='steed'&&!exceptionalItem(p,x)&&!same.includes(x)))return{ok:false,reason:'Можно носить только одну большую шмотку. Дварфу можно больше.'};
  if(['head','body'].includes(c.slot)){const remove=same.filter(x=>(!!x.overSlot&&!x.cursedThingy)===!!c.overSlot);if(remove.some(c=>c.cursedThingy))return{ok:false,reason:'Слот занят проклятой вещью.'};return{ok:true,remove}};
  if(c.slot==='none')return{ok:true,remove:[]};
  if(c.slot==='steed'&&!has(p,'Centaur')){const limit=1+p.equipment.reduce((n,x)=>n+(itemUsable(p,x)?x.extraSteeds||0:0),0);if(same.length<limit)return{ok:true,remove:[]};if(same.length>1){const replacement=same.find(x=>x.uid===replaceUid);return replacement?{ok:true,remove:[replacement]}:{ok:false,choices:same,reason:'Выбери скакуна для замены.'}}}
  if(c.slot==='hand'){
    const cost=handCost(c,p),used=same.reduce((n,x)=>n+handCost(x,p),0);
    if(cost>handCapacity(p))return{ok:false,reason:'Нужно больше двух рук.'};
    if(used+cost<=handCapacity(p))return{ok:true,remove:[]};
    if(cost>=handCapacity(p)||same.length===1)return same.some(c=>c.cursedThingy)?{ok:false,reason:'Рука занята проклятой вещью.'}:{ok:true,remove:same};
    const replacement=same.find(x=>x.uid===replaceUid&&!x.cursedThingy);
    return replacement?{ok:true,remove:[replacement]}:{ok:false,choices:same,reason:'Обе руки заняты. Выбери оружие для замены.'};
  }
  if(has(p,'Centaur')&&c.slot==='steed')return{ok:true,remove:[]};
  if(has(p,'Centaur')&&c.slot==='feet'){if(same.length<2)return{ok:true,remove:[]};const replacement=same.find(x=>x.uid===replaceUid);return replacement?{ok:true,remove:[replacement]}:{ok:false,choices:same,reason:'Выбери одну из двух обувок для замены.'}}
  return{ok:true,remove:same};
}
function normalizeGear(p){const overflow=[],feet=p.equipment.filter(c=>c.slot==='feet'&&!exceptionalItem(p,c)),steeds=p.equipment.filter(c=>c.slot==='steed'&&!exceptionalItem(p,c)),big=p.equipment.filter(c=>c.big&&!c.ignoreBigLimit&&c.slot!=='steed'&&!exceptionalItem(p,c));if(!has(p,'Centaur')){overflow.push(...feet.slice(1));const limit=1+p.equipment.reduce((n,c)=>n+(itemUsable(p,c)?c.extraSteeds||0:0),0);overflow.push(...steeds.slice(limit))}if(!has(p,'Dwarf'))overflow.push(...big.slice(1));p.equipment=p.equipment.filter(c=>!overflow.includes(c));return [...new Map(overflow.map(c=>[c.uid,c])).values()]}
export function syncOverlays(p){p.equipment=p.equipment.map(c=>c.overSlot?{...c,overlayBaseUid:p.equipment.find(base=>base.slot===c.slot&&!base.overSlot&&!exceptionalItem(p,base))?.uid??null}:c)}
export function equipCard(p,c,replaceUid=null){
  const plan=equipPlan(p,c,replaceUid);if(!plan.ok)return plan;if(c.hirelingUid&&!exceptionalItem(p,c))delete c.hirelingUid;
  p.equipment=p.equipment.filter(x=>!plan.remove.some(r=>r.uid===x.uid));
  p.hand=p.hand.filter(x=>x.uid!==c.uid);p.hand.push(...plan.remove);p.equipment.push(c);p.hand.push(...normalizeGear(p));normalizeHands(p);syncOverlays(p);
  return plan;
}
export function unequip(p,uid){
  const c=p.equipment.find(x=>x.uid===uid);if(!c||c.cursedThingy)return[];
  const linked=p.equipment.filter(x=>x.hirelingUid===uid);for(const x of linked)delete x.hirelingUid;const removed=[c,...linked];p.equipment=p.equipment.filter(x=>x.uid!==uid&&!linked.includes(x));
  for(const kind of ['class','race']){
    const identities=p.equipment.filter(x=>x.slot===kind);
    const excess=identities.slice(identityLimit(p,kind));
    if(!identities.length)excess.push(...p.equipment.filter(x=>[`${kind}-mod`,`${kind}-aura`].includes(x.slot)));
    p.equipment=p.equipment.filter(x=>!excess.some(r=>r.uid===x.uid));removed.push(...excess);
  }
  removed.push(...normalizeGear(p),...normalizeHands(p));p.hand.push(...removed);syncOverlays(p);return removed;
}
export function gearLayout(p){
  const hands=p.equipment.filter(c=>c.slot==='hand'&&!exceptionalItem(p,c));
  let held=[];for(const c of hands)for(let i=0;i<handCost(c);i++)held.push({card:c,shared:i>0});
  const baseSlots=[...GEAR_SLOTS,...Array.from({length:Math.max(0,handCapacity(p)-2)},(_,i)=>({slot:'hand',name:`Дополнительная рука ${i+1}`,icon:'sword',index:i+2}))];
  const slots=baseSlots.flatMap(s=>has(p,'Centaur')&&s.slot==='feet'?[s,{...s,index:1,name:'Вторая обувка'}]:(has(p,'Centaur')||p.equipment.some(c=>c.extraSteeds))&&s.slot==='steed'?Array.from({length:p.equipment.filter(c=>c.slot==='steed').length+1},(_,i)=>({...s,index:i,name:`Скакун ${i+1}`})):[s]);
  slots.push(...p.equipment.filter(c=>c.slot==='none').map((c,i)=>({slot:'none',name:'Прочая шмотка',icon:c.icon,index:i})));
  slots.push(...p.equipment.filter(c=>c.overSlot&&!exceptionalItem(p,c)).map(c=>({slot:c.slot,name:c.slot==='head'?'Поверх головняка':'Поверх брони',icon:c.icon,overlay:true})));
  const normal=slots.map(s=>({...s,...(s.slot==='hand'?held[s.index]:{card:p.equipment.filter(c=>c.slot===s.slot&&!exceptionalItem(p,c)&&!!c.overSlot===!!s.overlay)[s.index||0]})}));
  return[...normal,...p.equipment.filter(c=>exceptionalItem(p,c)).map(c=>({slot:c.slot,name:c.cheatCard?'Шмотка с читом':'Шмотка наёмника',icon:c.icon,card:c}))];
}
