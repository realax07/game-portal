import {has} from './traits.js';
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
export const handCost=c=>c.slot==='hand'?(c.hands||1):0;
export function identityLimit(p,kind){return p.equipment.find(c=>c.slot===`${kind}-mod`)?.limit||1}
export function identityKey(c){return (c.en||c.id).toLowerCase()}
export function equipPlan(p,c,replaceUid=null){
  if(!p.hand.some(x=>x.uid===c.uid))return{ok:false,reason:'Карта уже не в руке.'};
  const same=p.equipment.filter(x=>x.slot===c.slot);
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
    const replacement=same.find(x=>x.uid===replaceUid);
    return replacement?{ok:true,remove:[replacement]}:{ok:false,choices:same,reason:'Все места заняты. Выбери карту, которую заменишь.'};
  }
  if(c.slot==='hand'){
    const cost=handCost(c),used=same.reduce((n,x)=>n+handCost(x),0);
    if(cost>2)return{ok:false,reason:'Нужно больше двух рук.'};
    if(used+cost<=2)return{ok:true,remove:[]};
    if(cost===2||same.length===1)return{ok:true,remove:same};
    const replacement=same.find(x=>x.uid===replaceUid);
    return replacement?{ok:true,remove:[replacement]}:{ok:false,choices:same,reason:'Обе руки заняты. Выбери оружие для замены.'};
  }
  if(has(p,'Centaur')&&c.slot==='steed')return{ok:true,remove:[]};
  if(has(p,'Centaur')&&c.slot==='feet'){if(same.length<2)return{ok:true,remove:[]};const replacement=same.find(x=>x.uid===replaceUid);return replacement?{ok:true,remove:[replacement]}:{ok:false,choices:same,reason:'Выбери одну из двух обувок для замены.'}}
  return{ok:true,remove:same};
}
export function equipCard(p,c,replaceUid=null){
  const plan=equipPlan(p,c,replaceUid);if(!plan.ok)return plan;
  p.equipment=p.equipment.filter(x=>!plan.remove.some(r=>r.uid===x.uid));
  p.hand=p.hand.filter(x=>x.uid!==c.uid);p.hand.push(...plan.remove);p.equipment.push(c);
  return plan;
}
export function unequip(p,uid){
  const c=p.equipment.find(x=>x.uid===uid);if(!c)return[];
  const removed=[c];p.equipment=p.equipment.filter(x=>x.uid!==uid);
  for(const kind of ['class','race']){
    const identities=p.equipment.filter(x=>x.slot===kind);
    const excess=identities.slice(identityLimit(p,kind));
    if(!identities.length)excess.push(...p.equipment.filter(x=>[`${kind}-mod`,`${kind}-aura`].includes(x.slot)));
    p.equipment=p.equipment.filter(x=>!excess.some(r=>r.uid===x.uid));removed.push(...excess);
  }
  p.hand.push(...removed);return removed;
}
export function gearLayout(p){
  const hands=p.equipment.filter(c=>c.slot==='hand');
  let held=[];for(const c of hands)for(let i=0;i<handCost(c);i++)held.push({card:c,shared:i>0});
  const slots=GEAR_SLOTS.flatMap(s=>has(p,'Centaur')&&s.slot==='feet'?[s,{...s,index:1,name:'Вторая обувка'}]:has(p,'Centaur')&&s.slot==='steed'?Array.from({length:p.equipment.filter(c=>c.slot==='steed').length+1},(_,i)=>({...s,index:i,name:`Скакун ${i+1}`})):[s]);
  return slots.map(s=>({...s,...(s.slot==='hand'?held[s.index]:{card:p.equipment.filter(c=>c.slot===s.slot)[s.index||0]})}));
}
