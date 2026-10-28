import {randomUUID,randomInt} from 'node:crypto';
import {TRAITS,DECKS,LOCATIONS,FLORA} from './public/catalog.js';

const uid=()=>randomUUID().replaceAll('-','');
const die=()=>randomInt(1,7);
export const allAnimals=g=>g.players.flatMap(p=>p.animals);
export const owner=(g,a)=>g.players.find(p=>p.id===a.owner);
const byId=(g,id)=>allAnimals(g).find(a=>a.id===id)||g.plants.find(p=>p.id===id&&p.isPlant);
const log=(g,text,kind='event')=>{g.log.push({id:uid(),year:g.year,text,kind});if(g.log.length>250)g.log.shift();};
export function traits(g,a,active=true){
 if(active&&(a.paralyzed||a.medicinal||(a.marks||[]).includes('sleep')))return [];
 return [...a.traits,...g.links.filter(l=>l.a===a.id||l.b===a.id)].filter(t=>!active||(!t.disabled&&(!t.a||[t.a,t.b].every(id=>{const b=byId(g,id);return b&&!b.paralyzed&&!b.medicinal&&!(b.marks||[]).includes('sleep');}))));
}
export const has=(g,a,id)=>!!a&&traits(g,a).some(t=>t.trait===id);
export const demand=(g,a)=>1+traits(g,a).reduce((n,t)=>n+(TRAITS[t.trait]?.food||0),0);
export const fed=(g,a)=>a.medicinal||a.bornFed||(a.sleepYear===g.year&&!g.lastRound)||a.food>=demand(g,a);
const fatSlots=(g,a)=>traits(g,a).filter(t=>t.trait==='fat').length;
const symbiont=(g,a)=>g.links.filter(l=>l.trait==='symbiosis'&&l.b===a.id).map(l=>byId(g,l.a)).filter(Boolean);
export const hungry=(g,a)=>!a.ghost&&!a.shelled&&a.sleepYear!==g.year&&(!fed(g,a)||a.fat<fatSlots(g,a))&&symbiont(g,a).every(s=>fed(g,s));
const same=(a,b)=>a.loc===b.loc;
const makeTrait=(trait,card={id:uid(),primary:trait,secondary:null})=>({id:card.id,trait,card,usedYear:0});
export function makeAnimal(player,card,loc='pangaea',year=0){
 const animal={id:uid(),owner:player.id,card,loc,traits:[],food:0,fat:0,used:{},ignored:{},born:year,ghost:false};
 player.animals.push(animal);return animal;
}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
export function makeDeck(packs,short=false,double=false){
 let cards=[];
 for(const pack of ['base',...packs.filter(p=>p!=='base')])for(const [primary,secondary,count] of DECKS[pack]||[]){
  for(let i=0;i<(short?Math.ceil(count/2):count)*(double?2:1);i++)cards.push({id:uid(),primary,secondary,pack});
 }return shuffle(cards);
}
export function newGame(names,options={}){
 const packs=[...new Set(options.packs||[])].filter(p=>p in DECKS||['plants','fungi'].includes(p));
 if(packs.includes('plants')&&packs.includes('fungi'))throw Error('Выберите одну кормовую базу: Растения или Трава и грибы.');
 if(packs.includes('fungi')&&packs.includes('continents'))throw Error('В этом профиле Трава и грибы играются без Континентов.');
 const g={id:uid(),version:0,phase:'lobby',year:1,first:0,current:0,players:names.map((name,i)=>({id:uid(),name,animals:[],hand:[],discard:[],bot:!!options.bots?.[i]})),options:{...options,packs},deck:[],links:[],food:{},log:[],history:[],shells:[],passed:[],pending:null,effects:[],suspended:[],turn:null,lastRound:false,plants:[],plantDeck:[],floraDiscard:[]};
 return g;
}
export function startGame(g){
 if(g.players.length<2||g.players.length>8)throw Error('Нужно от 2 до 8 игроков.');
 const packs=g.options.packs;
 if(g.players.length>4&&!packs.includes('flight')&&!g.options.doubleDeck)throw Error('Для 5–6 игроков добавьте Время летать или второй комплект.');
 if(g.players.length>6&&!g.options.doubleDeck)throw Error('Для 7–8 игроков включите второй комплект.');
 g.deck=makeDeck(packs,g.options.shortDeck,g.options.doubleDeck);
 const count=packs.includes('continents')?10:6;
 for(let i=0;i<count;i++)for(const p of g.players)if(g.deck.length)p.hand.push(g.deck.pop());
 g.first=randomInt(g.players.length);g.current=g.first;g.phase='development';g.passed=[];
 log(g,'Экспедиция начинается. Первый игрок — '+g.players[g.first].name+'.','phase');
 if(packs.includes('plants')||packs.includes('fungi'))initPlants(g);
 resetTurn(g);beginDevelopment(g);
}
const locationList=g=>g.options.packs.includes('continents')?['laurasia','gondwana','ocean']:['pangaea'];
function resetTurn(g){g.turn={main:false,acted:false,loc:null,bonus:[],links:[],migration:false};}
function nextPlayer(g){
 let next=g.current;
 do{next=(next+1)%g.players.length;}while(g.phase==='development'&&g.passed.includes(g.players[next].id)&&g.passed.length<g.players.length);
 g.current=next;resetTurn(g);if(g.phase==='feeding')beginFloraTurn(g);
}
function detach(g,t){
 for(const a of allAnimals(g)){if(t.trait==='neoplasm'&&a.traits.some(x=>x.id===t.id))for(const property of a.traits)property.disabled=false;a.traits=a.traits.filter(x=>x.id!==t.id);a.fat=Math.min(a.fat,fatSlots(g,a));}
 g.links=g.links.filter(x=>x.id!==t.id);
}
function discardTrait(g,a,t){detach(g,t);owner(g,a).discard.push(t.card);}
function breakLinks(g){for(const l of [...g.links]){const a=byId(g,l.a),b=byId(g,l.b);if(!a||!b||!same(a,b)){if(a)owner(g,a).discard.push(l.card);else if(b)owner(g,b).discard.push(l.card);g.links=g.links.filter(t=>t.id!==l.id);}}}
function mushroomDeath(g,animal){
 if(g.options.packs.includes('fungi')){const choices=g.plants.filter(p=>p.type==='mushroom'&&p.food<p.max);if(choices.length)(g.effects??=[]).push({kind:'fungusDeath',player:animal.owner,choices:choices.map(p=>p.id)});}
 else for(const p of g.plants.filter(p=>p.type==='fungus'))p.food=Math.min(p.max,p.food+1);
}
function kill(g,a,eaten=false){
 if(!a||a.ghost)return;
 if(a.isPlant){g.plants=g.plants.filter(p=>p.id!==a.id);return;}
 const p=owner(g,a);log(g,p.name+': животное '+a.id.slice(0,4)+(eaten?' съедено.':' погибает.'),eaten?'attack':'death');
 mushroomDeath(g,a);
 if(eaten&&has(g,a,'regeneration')){p.discard.push(a.card);a.card=null;a.ghost=true;a.food=0;return;}
 for(const t of a.traits){if(t.trait==='shell')g.shells.push(t.card);else p.discard.push(t.card);}
 p.discard.push(a.card);p.animals=p.animals.filter(x=>x.id!==a.id);breakLinks(g);
}
function checkFinal(g){if(!g.deck.length&&!g.lastRound){g.lastRound=true;log(g,'Колода закончилась. Этот ход — последний. Спячка больше не даёт сытость.','phase');}}
function birth(g,a){
 if(has(g,a,'viviparous')&&fed(g,a)&&g.deck.length){
  const b=makeAnimal(owner(g,a),g.deck.pop(),a.loc,g.year);b.bornFed=true;log(g,owner(g,a).name+': рождается накормленное животное.','birth');checkFinal(g);
 }
}
function receive(g,a,n=1,color='blue',source=null,seen=new Set()){
 if(!a||!hungry(g,a))return;
 for(let i=0;i<n&&hungry(g,a);i++){
  const wasFed=fed(g,a);
  if(fed(g,a))a.fat++;else a.food++;
  if(!wasFed&&fed(g,a))birth(g,a);
  (g.effects??=[]).push({kind:'foodEvent',player:a.owner,animal:a.id,color,source,plantDone:!source,mammalDone:!has(g,a,'mammal')});
 }
}
function plantAllowed(g,a,p,ignore=null){
 if(!p||p.food<=0)return false;
 if(g.options.packs.includes('fungi'))return true;
 if(p.loc&&p.loc!==a.loc)return false;
 if(a.specialPlant)return a.specialPlant===p.id;
 const skipped=ignore||(a.plantIgnore?.plant===p.id?a.plantIgnore.trait:null);
 if(has(g,a,'carnivore')&&!p.fruit&&!p.traits.some(t=>t.trait==='nutritious')&&skipped!=='fruit')return false;
 const req={aquatic:'swimming',root:'burrowing',tree:'large'};
 for(const [t,r] of Object.entries(req))if(skipped!==t&&p.traits.some(x=>x.trait===t)&&!has(g,a,r)&&!(t==='tree'&&has(g,a,'flight')))return false;
 return true;
}
function canTakeRed(g,a,source){
 if(!hungry(g,a))return false;
 if(a.loc==='ocean'&&source)return false;
 if((g.plants.length||g.options.packs.some(p=>['plants','fungi'].includes(p)))&&a.loc!=='ocean')return plantAllowed(g,a,g.plants.find(p=>p.id===source));
 return (g.food[a.loc]||0)>0;
}
function takeRed(g,a,source,seen=new Set()){
 if(!canTakeRed(g,a,source))return;
 const p=g.plants.find(p=>p.id===source);
 if(p){p.food--;receive(g,a,1,'red',source,seen);}
 else{g.food[a.loc]--;receive(g,a,1,'red',null,seen);}
}
function canAdd(g,player,a,trait,pair=null){
 const def=TRAITS[trait];if(!def||['angler','cyst'].includes(trait)||a.ghost)return false;
 const negative=['parasite','neoplasm','unstable','trematode'].includes(trait);
 if(negative?(a.owner===player.id):(a.owner!==player.id&&trait!=='rstrategy'))return false;
 if(['parasite','neoplasm','trematode'].includes(trait)&&has(g,a,'immune'))return false;
 const ts=traits(g,a,false);
 if(def.type!=='pair'&&trait!=='fat'&&ts.some(t=>t.trait===trait))return false;
 if((trait==='carnivore'&&has(g,a,'scavenger'))||(trait==='scavenger'&&has(g,a,'carnivore')))return false;
 if((trait==='specialA'&&has(g,a,'specialB'))||(trait==='specialB'&&has(g,a,'specialA')))return false;
 if((trait==='regeneration'&&(ts.length>1||ts.some(t=>TRAITS[t.trait].food>0)))||(has(g,a,'regeneration')&&(ts.length>=2||def.food>0)))return false;
 if(def.type==='pair'){
  if(!pair||pair.id===a.id||pair.ghost||pair.owner!==a.owner||!same(a,pair))return false;
  if(has(g,pair,'regeneration')&&(traits(g,pair,false).length>=2||def.food>0))return false;
  if(trait==='trematode'&&has(g,pair,'immune'))return false;
  if(g.links.some(l=>l.trait===trait&&[l.a,l.b].includes(a.id)&&[l.a,l.b].includes(pair.id)))return false;
 }return true;
}
function attach(g,a,trait,card,pair){
 const t=makeTrait(trait,card);
 if(TRAITS[trait].type==='pair')g.links.push({...t,a:a.id,b:pair.id});else a.traits.push(t);
 if(trait==='immune')for(const t of [...traits(g,a,false)])if(['parasite','trematode','neoplasm'].includes(t.trait))discardTrait(g,a,t);
 if(trait==='swimming'&&g.options.packs.includes('continents')&&a.loc!=='ocean'){a.loc='ocean';a.aquatic=true;a.waterCard=t.card;discardTrait(g,a,t);breakLinks(g);}
 if(['specialA','specialB'].includes(trait)&&g.options.packs.includes('plants'))g.effects.push({kind:'specialize',player:a.owner,animal:a.id});
}
function blocked(g,pred,prey,ignore=null,ambush=false){
 if(pred.id===prey.id||prey.ghost||pred.ghost||!same(pred,prey)||prey.shelter)return true;
 const ignored=new Set([ignore,...(pred.ignored?.[prey.id]||[])]);
 const h=id=>has(g,prey,id)&&!ignored.has(id);
 if(prey.shelled)return true;
 if(h('transparent')&&prey.food===0)return true;
 if(h('shy')&&prey.used.attacked)return true;
 if(h('swimming')&&!has(g,pred,'swimming'))return true;
 if(has(g,pred,'swimming')&&!h('swimming')&&!ignored.has('swimming'))return true;
 if(h('large')&&!has(g,pred,'large'))return true;
 if(h('camouflage')&&!has(g,pred,'vision'))return true;
 if(h('burrowing')&&fed(g,prey)&&!ambush)return true;
 if(h('flight')&&traits(g,pred).length>=traits(g,prey).length)return true;
 if(!ignored.has('symbiosis')&&symbiont(g,prey).length)return true;
 if(h('herding')){
  const nearby=allAnimals(g).filter(a=>same(a,prey)&&!a.ghost);
  if(nearby.filter(a=>has(g,a,'herding')).length>nearby.filter(a=>has(g,a,'carnivore')).length)return true;
 }return false;
}
function canAttack(g,a,b,ignore=null,ambush=false){return has(g,a,'carnivore')&&!a.used.attack&&hungry(g,a)&&!(a.marks||[]).includes('peace')&&!blocked(g,a,b,ignore,ambush);}
function attacks(g,a,ambush=false){
 const result=[];
 for(const b of allAnimals(g)){
  if(canAttack(g,a,b,null,ambush))result.push({type:'attack',animal:a.id,target:b.id,ignore:null});
  if((has(g,a,'intellect')&&!a.used.intellect)||(b.marks||[]).includes('dope'))for(const t of traits(g,b))if(canAttack(g,a,b,t.trait,ambush))result.push({type:'attack',animal:a.id,target:b.id,ignore:t.trait});
 }return result;
}
function beginAttack(g,a,b,ignore=null,ambush=false,continuation=null,angler=false){
 if(ignore){if(!(b.marks||[]).includes('dope'))a.used.intellect=true;a.ignored[b.id]=[...(a.ignored[b.id]||[]),ignore];}
 a.used.attack=true;g.pending={kind:'defense',player:b.owner,pred:a.id,prey:b.id,ignore,ambush,continuation,checked:[],angler,attackerOwner:a.owner};
 log(g,owner(g,a).name+' атакует животное '+b.id.slice(0,4)+(ignore?' (игнорирует «'+TRAITS[ignore].name+'»).':'.'),'attack');
 if(has(g,b,'anxious')&&ignore!=='anxious'){receive(g,b,1);if(g.effects?.length){g.suspended.push(g.pending);g.pending=null;}}
 b.used.attacked=true;
}
function queueScavenger(g,a){
 const first=g.players.findIndex(p=>p.id===a.owner);for(let i=0;i<g.players.length;i++){
  const p=g.players[(first+i)%g.players.length],eligible=p.animals.filter(x=>same(x,a)&&has(g,x,'scavenger')&&hungry(g,x));
  if(eligible.length){g.effects.push({kind:'scavenge',player:p.id,choices:eligible.map(x=>x.id)});break;}
 }
}
function defenseActions(g){
 const q=g.pending,a=byId(g,q.pred),b=byId(g,q.prey);if(!a||!b)return [{type:'defend',mode:'accept'}];
 if(b.isPlant)return [{type:'defend',mode:'accept'}];
 const ignored=new Set([q.ignore,...(a.ignored?.[b.id]||[])]);
 const h=t=>has(g,b,t)&&!ignored.has(t)&&!q.checked.includes(t);
 if(h('burrowing')&&fed(g,b)&&!q.ambush)return [{type:'defend',mode:'burrow'}];
 const result=[];let mandatory=false;
 if(h('fast')){result.push({type:'defend',mode:'fast'});mandatory=true;}
 if(h('horns')){result.push({type:'defend',mode:'horns'});mandatory=true;}
 if(h('mimicry')&&!b.used.mimicry){
  const choices=owner(g,b).animals.filter(x=>x.id!==b.id&&!blocked(g,a,x,q.ignore,q.ambush));
  if(choices.length){mandatory=true;for(const x of choices)result.push({type:'defend',mode:'mimicry',target:x.id});}
 }
 if(h('ink')&&!b.used.ink)result.push({type:'defend',mode:'ink'});
 if(h('shell')&&!q.ambush)result.push({type:'defend',mode:'shell'});
 if(h('tail'))for(const t of traits(g,b,false))if(t.trait!=='trematode')result.push({type:'defend',mode:'tail',traitId:t.id});
 if(!q.angler&&!traits(g,b).length){
  for(const x of owner(g,b).animals.filter(x=>same(x,b)&&!traits(g,x,false).length&&x.card?.primary==='angler')){
   const pseudo={...x,traits:[...x.traits,makeTrait('carnivore')]};for(const ignore of [null,...traits(g,a).map(t=>t.trait)])if(!blocked(g,pseudo,a,ignore))result.push({type:'defend',mode:'angler',animal:x.id,ignore});
   if(x.id===b.id){mandatory=true;if(!result.some(r=>r.mode==='angler'&&r.animal===x.id))result.push({type:'defend',mode:'angler',animal:x.id,ignore:null,failed:true});}
  }
 }
 if(!mandatory)result.push({type:'defend',mode:'accept'});
 return result;
}
function finishAttack(g,outcome){
 const q=g.pending,a=byId(g,q.pred),b=byId(g,q.prey);g.pending=null;
 if(a&&b){
  const ignored=new Set([q.ignore,...(a.ignored?.[b.id]||[])]);
  const sting=has(g,b,'cnidocytes')&&!ignored.has('cnidocytes');
  if(outcome==='eat'&&q.rage){kill(g,b,false);queueScavenger(g,a);}
  else if(outcome==='eat'){
   if(has(g,b,'poison')&&!ignored.has('poison'))a.poisoned=true;
   if(b.card?.primary==='cyst')a.traits.push(makeTrait('cyst',b.card));
   for(const t of b.traits.filter(t=>t.trait==='cyst'))a.traits.push(t);
   b.traits=b.traits.filter(t=>t.trait!=='cyst');
   if(b.card?.primary==='cyst')b.card={id:uid(),primary:'carnivore',secondary:null,virtual:true};
   if(b.marks&&!(a.marks||[]).includes('tryn'))a.marks=[...new Set([...(a.marks||[]),...b.marks])];
   const insect=!a.isPlant&&has(g,a,'insectivore')&&!traits(g,b).length;
   kill(g,b,true);if(a.isPlant)a.food=Math.min(a.max,a.food+2);else receive(g,a,insect?1:2);if(insect)a.used.attack=false;
   queueScavenger(g,a);
  }else if(outcome==='tail'&&!q.rage){if(a.isPlant)a.food=Math.min(a.max,a.food+1);else receive(g,a,1);}
  if(sting){a.paralyzed=true;log(g,'Стрекательные клетки парализуют хищника.');}
 }
 if(q.continuation&&outcome!=='eat'&&byId(g,q.continuation.animal)){
  takeRed(g,byId(g,q.continuation.animal),q.continuation.source);
 }
 if(q.rage||q.forceEnd)g.effects.push({kind:'forcedEnd'});
}
function defense(g,act){
 const q=g.pending,a=byId(g,q.pred),b=byId(g,q.prey);
 if(!a||!b){g.pending=null;return;}
 if(act.mode==='fast'||act.mode==='horns'){
  const d=die();log(g,TRAITS[act.mode].name+': кубик '+d+'.','dice');q.checked.push(act.mode);
  if(act.mode==='fast'&&d>=4)finishAttack(g,'escape');
  else if(act.mode==='horns'&&d>=5){kill(g,a);g.pending=null;if(q.continuation&&byId(g,q.continuation.animal))takeRed(g,byId(g,q.continuation.animal),q.continuation.source);if(q.rage||q.forceEnd)g.effects.push({kind:'forcedEnd'});}
 }else if(act.mode==='mimicry'){
  b.used.mimicry=true;q.prey=act.target;q.checked=[];const target=byId(g,act.target);target.used.attacked=true;log(g,'Мимикрия перенаправляет атаку.');
 }else if(act.mode==='ink'){b.used.ink=true;a.used.attack=false;finishAttack(g,'escape');}
 else if(act.mode==='shell'){b.shelled=true;finishAttack(g,'escape');}
 else if(act.mode==='tail'){const t=traits(g,b,false).find(t=>t.id===act.traitId);discardTrait(g,b,t);finishAttack(g,'tail');}
 else if(act.mode==='angler'){
  const x=byId(g,act.animal);x.traits.push(makeTrait('carnivore'));x.revealed=true;
  if(act.failed)finishAttack(g,'escape');else{beginAttack(g,x,a,act.ignore,false,q.continuation,true);const next=g.pending||g.suspended.at(-1);next.forceEnd=q.rage||q.forceEnd;}
 }else if(act.mode==='burrow')finishAttack(g,'escape');else finishAttack(g,'eat');
}
function beginDevelopment(g){
 // Instability is a choice owned by the affected animal's owner.
 const list=allAnimals(g).filter(a=>has(g,a,'unstable')&&!a.used.unstable);
 if(list.length){const a=list[0],p=owner(g,a);a.used.unstable=true;
  if(p.hand.length){const card=p.hand.splice(randomInt(p.hand.length),1)[0];g.pending={kind:'mutation',player:p.id,animal:a.id,card};}
  else{const ts=traits(g,a,false).filter(t=>t.trait!=='unstable');if(ts.length)g.pending={kind:'mutationDiscard',player:p.id,animal:a.id};else beginDevelopment(g);}
 }
}
function mutateActions(g){
 const q=g.pending,a=byId(g,q.animal);if(q.kind==='mutationDiscard')return traits(g,a,false).filter(t=>t.trait!=='unstable').map(t=>({type:'mutation',traitId:t.id}));
 const result=[];for(const trait of [q.card.primary,q.card.secondary].filter(Boolean)){
  if(TRAITS[trait]?.type==='pair'){for(const b of owner(g,a).animals)if(canAdd(g,owner(g,a),a,trait,b))result.push({type:'mutation',trait,pair:b.id});}
  else if(canAdd(g,owner(g,a),a,trait))result.push({type:'mutation',trait});
 }
 return result.length?result:[{type:'mutation',discard:true}];
}
function resources(g){
 for(const a of [...allAnimals(g)])if(has(g,a,'neoplasm')){
  const target=a.traits.find(t=>t.trait!=='neoplasm'&&!t.disabled);if(target){target.disabled=true;log(g,'Неоплазия отключает «'+TRAITS[target.trait].name+'».');}
  else kill(g,a);
 }
 const n=g.players.length;g.dice=[];const roll=count=>Array.from({length:count},()=>{let d=die();g.dice.push(d);return d;}).reduce((a,b)=>a+b,0);
 if(g.options.packs.includes('continents')){
  const table={2:[[1,0],[1,2]],3:[[1,0],[2,0]],4:[[1,2],[2,0]],5:[[1,3],[2,2]],6:[[1,5],[2,3]],7:[[2,2],[3,2]],8:[[2,2],[3,4]]}[n];
  g.food=g.options.packs.includes('plants')?{ocean:n+1}:{laurasia:roll(table[0][0])+table[0][1],gondwana:roll(table[1][0])+table[1][1],ocean:n+1};
 }else if(!g.options.packs.some(p=>['plants','fungi'].includes(p))){
  const table={2:[1,2],3:[2,0],4:[2,2],5:[3,2],6:[3,4],7:[4,2],8:[4,4]}[n];g.food={pangaea:roll(table[0])+table[1]};
 }
 if(!g.options.packs.includes('plants'))for(const a of allAnimals(g).filter(a=>has(g,a,'edificator')))g.food[a.loc]=(g.food[a.loc]||0)+2;
 if(g.options.packs.includes('fungi'))for(let i=0;i<n&&g.plants.length<8;i++)addFlora(g);
 g.phase='feeding';g.passed=[];g.current=g.first;resetTurn(g);beginFloraTurn(g);log(g,'Начинается питание.','phase');
}
function finishFeeding(g){g.phase='extinction';g.pending=null;log(g,'Питание завершено. Голодные и отравленные животные вымрут.','phase');}
function advanceFeeding(g){
  const p=g.players[g.current];
 if(g.turn.acted)g.passed=[];else if(!g.passed.includes(p.id))g.passed.push(p.id);
 if(g.passed.length===g.players.length)finishFeeding(g);else nextPlayer(g);
}
function extinction(g){
 for(const a of [...allAnimals(g)]){
  if(a.ghost)continue;
  if(((a.poisoned||(a.marks||[]).includes('toxin'))&&!(a.marks||[]).includes('antidote'))||!fed(g,a)){
   if(!a.poisoned&&has(g,a,'spores')&&!g.lastRound){
    const p=owner(g,a),ts=[...a.traits];a.traits=[];kill(g,a);
    for(const t of ts){const b=makeAnimal(p,t.card,a.loc,g.year);b.bornFed=true;b.noDraw=true;}
   }else kill(g,a);
  }
 }
 for(const a of [...allAnimals(g)]){
  const p=owner(g,a);
  for(const t of [...a.traits])if(t.trait==='cyst'){detach(g,t);const b=makeAnimal(p,t.card,a.loc,g.year);b.bornFed=true;b.noDraw=true;}
  if(a.ghost&&(p.hand.length||g.deck.length))g.effects.push({kind:'regenerate',player:p.id,animal:a.id});
 }
 if(g.effects?.length){g.effects.push({kind:'finishExtinction'});return;}
 finishExtinction(g);
}
function finishExtinction(g){
 extinctPlants(g);
 checkFinal(g);
 g.history.push({year:g.year,counts:g.players.map(p=>p.animals.filter(a=>!a.ghost).length)});
 if(g.lastRound){g.phase='finished';log(g,'Экспедиция завершена. Подсчитаны очки выживших видов.','phase');return;}
 const rescues=g.players.map(p=>!p.animals.length&&!p.hand.length);
 const need=g.players.map((p,i)=>rescues[i]?(g.options.packs.includes('continents')?10:6):1+p.animals.filter(a=>!a.ghost&&!a.noDraw&&!has(g,a,'rstrategy')).length);
 while(need.some(n=>n>0)&&g.deck.length)for(let i=0;i<g.players.length;i++){const ix=(g.first+i)%g.players.length;if(need[ix]>0&&g.deck.length){g.players[ix].hand.push(g.deck.pop());need[ix]--;}}
 for(let i=0;i<g.players.length;i++)if(g.options.packs.includes('continents')&&rescues[i]&&g.players[i].hand.length)g.effects.push({kind:'rescue',player:g.players[i].id,remaining:2});
 for(const a of allAnimals(g)){
  a.food=0;a.bornFed=false;a.paralyzed=false;a.medicinal=false;a.poisoned=false;a.shelled=false;a.shelter=false;a.noDraw=false;a.used={};a.ignored={};a.marks=[];delete a.plantIgnore;
 }
 growPlants(g);
 g.year++;g.first=(g.first+1)%g.players.length;g.current=g.first;g.passed=[];g.phase='development';resetTurn(g);
 for(const a of [...allAnimals(g)])if(has(g,a,'rstrategy'))for(let i=0;i<2&&g.deck.length;i++)makeAnimal(owner(g,a),g.deck.pop(),a.loc,g.year);
 checkFinal(g);beginDevelopment(g);log(g,'Ход '+g.year+'. Развитие. Первым ходит '+g.players[g.first].name+'.','phase');
}
export function score(g,p){
 const animals=p.animals.filter(a=>!a.ghost).length;
 const property=p.animals.reduce((n,a)=>n+a.traits.reduce((v,t)=>v+1+(TRAITS[t.trait]?.food||0),0),0)+g.links.filter(l=>p.animals.some(a=>a.id===l.a||a.id===l.b)).reduce((n,l)=>n+1+2*(TRAITS[l.trait]?.food||0),0);
 const ocean=g.options.packs.includes('continents')?p.animals.filter(a=>a.loc==='ocean'&&!a.ghost).length:0;
 return {animals:animals*2,traits:property,ocean,total:animals*2+property+ocean,discard:p.discard.length};
}
function migrationTargets(g,a){
 if(a.used.migration)return [];
 const fly=has(g,a,'flight')&&traits(g,a,false).length<=2;
 if(!has(g,a,'migration')&&!fly)return [];
 if(a.loc==='ocean')return has(g,a,'migration')?['laurasia','gondwana']:[];
 const result=[];if(!has(g,a,'swimming')||fly)result.push(a.loc==='laurasia'?'gondwana':'laurasia');if(has(g,a,'migration')&&has(g,a,'swimming'))result.push('ocean');return result;
}
function doMigration(g,moves){
 const following=[];
 for(const {animal,loc} of moves){
  const a=byId(g,animal),from=a.loc;
  for(const b of allAnimals(g).filter(b=>!moves.some(m=>m.animal===b.id)&&b.loc===from&&has(g,b,'sucker'))){if(loc==='ocean'&&from!=='ocean'&&!has(g,b,'swimming'))continue;following.push({animal:b.id,loc,player:b.owner});}
  a.loc=loc;a.used.migration=true;
  if(from==='ocean'){restoreSwimming(g,a);a.aquatic=true;}
  if(loc==='ocean'){for(const t of a.traits.filter(t=>t.trait==='swimming')){a.waterCard=t.card;discardTrait(g,a,t);}a.aquatic=true;}
 }
 g.turn.acted=true;g.turn.main=true;g.turn.migration=true;g.turn.migrationCommitted=true;
 if(following.length){
  const grouped=[];for(const item of following){let group=grouped.find(g=>g.animal===item.animal);if(!group){group={animal:item.animal,player:item.player,locations:[]};grouped.push(group);}if(!group.locations.includes(item.loc))group.locations.push(item.loc);}
  grouped.sort((a,b)=>(g.players.findIndex(p=>p.id===a.player)-g.current+g.players.length)%g.players.length-(g.players.findIndex(p=>p.id===b.player)-g.current+g.players.length)%g.players.length);
  g.pending={kind:'following',player:grouped[0].player,choices:grouped};
 }else breakLinks(g);
}
function restoreSwimming(g,a){
 let c=a.waterCard;
 if(c){for(const p of g.players)p.discard=p.discard.filter(card=>card.id!==c.id);}
 else for(const p of g.players){const ix=p.discard.findIndex(c=>c.primary==='swimming'||c.secondary==='swimming');if(ix>=0){c=p.discard.splice(ix,1)[0];break;}}
 a.traits.push(makeTrait('swimming',c));
}
export function legalActions(g,playerId){
 if(g.pending){if(g.pending.player!==playerId)return [];if(g.pending.kind==='effect')return g.pending.options;if(g.pending.kind==='defense')return defenseActions(g);if(g.pending.kind.startsWith('mutation'))return mutateActions(g);if(g.pending.kind==='ambush')return [{type:'ambush',skip:true},...g.pending.attacks.map(a=>({...a,type:'ambush'}))];if(g.pending.kind==='following')return [...g.pending.choices[0].locations.map(loc=>({type:'follow',yes:true,loc})),{type:'follow',yes:false}];}
 if(g.phase==='lobby'||g.phase==='finished')return [];
 const p=g.players[g.current];if((g.turn?.controller||p.id)!==playerId)return [];
 if(g.phase==='resources')return [{type:'resources'}];
 if(g.phase==='extinction')return [{type:'extinction'}];
 const actions=[];
 if(g.phase==='development'){
  for(const c of p.hand){
   for(const loc of (g.options.packs.includes('continents')?['laurasia','gondwana']:['pangaea']))actions.push({type:'animal',card:c.id,loc});
   for(const trait of [c.primary,c.secondary].filter(Boolean)){
    if(TRAITS[trait]?.plant){for(const plant of g.plants)if(trait==='mycorrhiza'||!plant.traits.some(t=>t.trait===trait)){
      if(trait==='mycorrhiza'){for(const other of g.plants)if(plant.id!==other.id&&plant.loc===other.loc&&!g.plantLinks?.some(l=>[l.a,l.b].includes(plant.id)&&[l.a,l.b].includes(other.id)))actions.push({type:'plantTrait',card:c.id,trait,plant:plant.id,other:other.id});}
      else actions.push({type:'plantTrait',card:c.id,trait,plant:plant.id});
     }continue;}
    for(const a of allAnimals(g)){
     if(TRAITS[trait]?.type==='pair'){for(const b of allAnimals(g))if(canAdd(g,p,a,trait,b))actions.push({type:'trait',card:c.id,animal:a.id,pair:b.id,trait});}
     else if(canAdd(g,p,a,trait))actions.push({type:'trait',card:c.id,animal:a.id,trait});
    }
   }
  }
  actions.push({type:'pass'});return actions;
 }
 if(g.phase==='feeding'){
  const t=g.turn;
  for(const a of p.animals.filter(a=>!a.ghost)){
   if(t.loc&&t.loc!==a.loc)continue;
   if(!t.main){
    if(g.options.packs.some(p=>['plants','fungi'].includes(p))&&a.loc!=='ocean'){for(const plant of g.plants){
     if(canTakeRed(g,a,plant.id))actions.push({type:'feed',animal:a.id,source:plant.id});
     if(g.options.packs.includes('plants')&&has(g,a,'intellect')&&!a.used.intellect&&hungry(g,a))for(const ignore of ['fruit','counter',...plant.traits.map(t=>t.trait)])if(plantAllowed(g,a,plant,ignore))actions.push({type:'feed',animal:a.id,source:plant.id,ignorePlant:ignore});
     if(!a.shelter&&plant.shelters>0&&plant.loc===a.loc)actions.push({type:'shelter',animal:a.id,source:plant.id});
    }}
    else if(canTakeRed(g,a,null))actions.push({type:'feed',animal:a.id});
    actions.push(...attacks(g,a));
    if(has(g,a,'metamorphosis')&&hungry(g,a))for(const x of traits(g,a,false))if(!TRAITS[x.trait].food&&x.trait!=='trematode')actions.push({type:'metamorphosis',animal:a.id,traitId:x.id});
    const spec=has(g,a,'specialA')?'specialA':has(g,a,'specialB')?'specialB':null;
    if(spec&&!g.options.packs.includes('plants')&&hungry(g,a)&&allAnimals(g).filter(b=>(!g.options.packs.includes('continents')||same(a,b))&&(has(g,b,spec)||(g.options.packs.includes('continents')&&(has(g,b,'specialA')||has(g,b,'specialB'))))).length===1)actions.push({type:'special',animal:a.id});
    if(g.shells.length&&!has(g,a,'shell')&&canAdd(g,p,a,'shell'))actions.push({type:'occupyShell',animal:a.id});
   }
   if(!t.migration){
    if(!t.main&&a.fat>0&&!fed(g,a))for(let amount=1;amount<=Math.min(a.fat,demand(g,a)-a.food);amount++)actions.push({type:'fat',animal:a.id,amount});
    if(has(g,a,'hibernation')&&a.sleepYear!==g.year&&a.sleepYear!==g.year-1&&!g.lastRound)actions.push({type:'sleep',animal:a.id});
    if(has(g,a,'piracy')&&!a.used.piracy&&hungry(g,a)&&!(a.marks||[]).includes('peace'))for(const b of allAnimals(g))if(b.id!==a.id&&same(a,b)&&!fed(g,b)&&b.food>0)actions.push({type:'piracy',animal:a.id,target:b.id});
    if(has(g,a,'grazing')&&!t.bonus.includes('grazing:'+a.id)){
     if(t.lastSource&&g.plants.find(p=>p.id===t.lastSource)?.food>0)actions.push({type:'graze',animal:a.id,source:t.lastSource});
     else if(!g.options.packs.some(p=>['plants','fungi'].includes(p))&&(g.food[a.loc]||0)>0)actions.push({type:'graze',animal:a.id});
    }
    if(has(g,a,'warm')&&!t.bonus.includes('warm:'+a.id)){
     if(g.options.packs.some(p=>['plants','fungi'].includes(p))&&a.loc!=='ocean'){for(const plant of g.plants)if(canTakeRed(g,a,plant.id))actions.push({type:'warm',animal:a.id,source:plant.id});}
     else if(canTakeRed(g,a,null))actions.push({type:'warm',animal:a.id});
    }
    if(!t.main&&!t.acted&&g.options.packs.includes('continents'))for(const loc of migrationTargets(g,a))actions.push({type:'migrate',animal:a.id,loc});
   }else if(!t.migrationCommitted&&!a.used.migration&&!t.moves?.some(m=>m.animal===a.id))for(const loc of migrationTargets(g,a))actions.push({type:'migrate',animal:a.id,loc});
   for(const l of g.links.filter(l=>!t.migration&&l.trait==='recombination'&&l.a===a.id&&l.usedYear!==g.year)){
    const b=byId(g,l.b);for(const x of a.traits)for(const y of b.traits)if(x.trait!=='trematode'&&y.trait!=='trematode')actions.push({type:'recombine',animal:a.id,target:b.id,first:x.id,second:y.id,link:l.id});
   }
  }
  if(!t.main){
   for(const plant of g.plants){
    if(plant.type==='parasitic'&&(!t.loc||t.loc===plant.loc)){const host=g.plants.find(p=>p.id===plant.host);if(host?.food>1&&plant.food<plant.max)actions.push({type:'transferPlant',source:host.id,plant:plant.id});}
    if(plant.type==='carnivorous'&&!plant.attacked&&(!t.loc||t.loc===plant.loc))for(const b of allAnimals(g))if(!blocked(g,plant,b))actions.push({type:'plantAttack',plant:plant.id,target:b.id});
   }
  }
  if(t.migration&&!t.migrationCommitted)actions.push({type:'commitMigration'});
  else if(t.main||!actions.some(a=>a.type==='feed'||(g.options.packs.includes('plants')&&a.type==='shelter')))actions.push({type:'end'});
 }
 return actions;
}
export function act(g,playerId,action){
 const legal=legalActions(g,playerId);if(!legal.some(x=>JSON.stringify(x)===JSON.stringify(action)))throw Error('Этот ход недоступен. Обновите состояние игры.');
 const p=g.players.find(p=>p.id===playerId);const a=action.animal?byId(g,action.animal):null;const b=action.target?byId(g,action.target):null;
 if(action.type==='effect')resolveEffect(g,action);
 else if(action.type==='defend')defense(g,action);
 else if(action.type==='mutation'){
  const q=g.pending,animal=byId(g,q.animal);g.pending=null;
  if(action.trait)attach(g,animal,action.trait,q.card,action.pair?byId(g,action.pair):null);
  else if(action.traitId)discardTrait(g,animal,traits(g,animal,false).find(t=>t.id===action.traitId));
  else p.discard.push(q.card);beginDevelopment(g);
 }else if(action.type==='follow'){
  const q=g.pending,x=q.choices.shift(),animal=byId(g,x.animal);
  if(action.yes&&animal){const old=animal.loc;animal.loc=action.loc;if(old==='ocean')restoreSwimming(g,animal);if(action.loc==='ocean')for(const t of animal.traits.filter(t=>t.trait==='swimming')){animal.waterCard=t.card;discardTrait(g,animal,t);}}
  if(q.choices.length)q.player=q.choices[0].player;else{g.pending=null;breakLinks(g);}
 }else if(action.type==='ambush'){
  const q=g.pending;g.pending=null;
  if(action.skip){q.players.shift();nextAmbush(g,q);}else beginAttack(g,a,b,action.ignore,true,q.feed);
 }else if(action.type==='resources')resources(g);
 else if(action.type==='extinction')extinction(g);
 else if(action.type==='pass'){
  g.passed.push(p.id);log(g,p.name+' завершает развитие.');
  if(g.passed.length===g.players.length){g.phase='resources';g.current=g.first;resetTurn(g);}else nextPlayer(g);
 }else if(action.type==='animal'||action.type==='trait'||action.type==='plantTrait'){
  const card=p.hand.find(c=>c.id===action.card);p.hand=p.hand.filter(c=>c.id!==card.id);
  if(action.type==='animal'){makeAnimal(p,card,action.loc,g.year);log(g,p.name+' создаёт новое животное в '+LOCATIONS[action.loc]+'.','birth');}
  else if(action.type==='plantTrait'){attachPlant(g,action,card);log(g,p.name+' добавляет растению «'+TRAITS[action.trait].name+'».');}
  else{attach(g,a,action.trait,card,action.pair?byId(g,action.pair):null);log(g,p.name+' добавляет «'+TRAITS[action.trait].name+'».');}
  if(!p.hand.length&&!g.passed.includes(p.id))g.passed.push(p.id);
  if(g.passed.length===g.players.length){g.phase='resources';g.current=g.first;resetTurn(g);}else nextPlayer(g);
 }else if(action.type==='end')advanceFeeding(g);
 else{
  g.turn.acted=true;if(a)g.turn.loc=a.loc;
  if(['feed','attack','metamorphosis','special','occupyShell','shelter','fat'].includes(action.type))g.turn.main=true;
  if(action.type==='feed'){
   if(action.ignorePlant){a.used.intellect=true;a.plantIgnore={plant:action.source,trait:action.ignorePlant};}
   g.turn.lastSource=action.source;
   const q={feed:{animal:a.id,source:action.source},players:g.players.map((_,i)=>g.players[(g.current+1+i)%g.players.length].id)};nextAmbush(g,q);
  }else if(action.type==='attack')beginAttack(g,a,b,action.ignore);
  else if(action.type==='metamorphosis'){discardTrait(g,a,traits(g,a,false).find(t=>t.id===action.traitId));receive(g,a,1);}
  else if(action.type==='special')receive(g,a,1);
  else if(action.type==='occupyShell')a.traits.push(makeTrait('shell',g.shells.shift()));
  else if(action.type==='shelter'){g.plants.find(p=>p.id===action.source).shelters--;a.shelter=true;}
  else if(action.type==='fat'){a.fat-=action.amount;a.food+=action.amount;}
  else if(action.type==='sleep'){a.sleepYear=g.year;log(g,p.name+': животное впадает в спячку.');}
  else if(action.type==='piracy'){a.used.piracy=true;b.food--;receive(g,a,1);}
  else if(action.type==='graze'){g.turn.bonus.push('grazing:'+a.id);if(action.source)g.plants.find(p=>p.id===action.source).food--;else g.food[a.loc]--;}
  else if(action.type==='warm'){g.turn.bonus.push('warm:'+a.id);takeRed(g,a,action.source);}
  else if(action.type==='migrate'){g.turn.loc=null;g.turn.main=true;g.turn.migration=true;(g.turn.moves??=[]).push({animal:action.animal,loc:action.loc});}
  else if(action.type==='commitMigration')doMigration(g,g.turn.moves);
  else if(action.type==='transferPlant'){const from=g.plants.find(p=>p.id===action.source),to=g.plants.find(p=>p.id===action.plant);from.food--;to.food++;g.turn.main=true;g.turn.loc=to.loc;}
  else if(action.type==='plantAttack'){const plant=g.plants.find(p=>p.id===action.plant);plant.owner=g.players[g.current].id;plant.attacked=true;g.turn.main=true;g.turn.loc=plant.loc;beginAttack(g,plant,b);}
  else if(action.type==='recombine'){
   const x=a.traits.find(t=>t.id===action.first),y=b.traits.find(t=>t.id===action.second),l=g.links.find(t=>t.id===action.link);l.usedYear=g.year;
   const usage={carnivore:'attack',piracy:'piracy',intellect:'intellect',ink:'ink',mimicry:'mimicry',migration:'migration',shy:'attacked'};
   for(const [from,t] of [[a,x],[b,y]]){
    const key=usage[t.trait];if(key){t.usedYear=from.used[key]?g.year:0;delete from.used[key];}
    if(t.trait==='hibernation'){t.sleepYear=from.sleepYear;delete from.sleepYear;}
    if(t.trait==='neoplasm')for(const t of from.traits)t.disabled=false;
   }
   a.traits=a.traits.filter(t=>t.id!==x.id);b.traits=b.traits.filter(t=>t.id!==y.id);a.traits.push(y);b.traits.push(x);
   for(const [to,t] of [[a,y],[b,x]]){
    const key=usage[t.trait];if(key&&t.usedYear===g.year)to.used[key]=true;
    if(t.trait==='hibernation')to.sleepYear=Math.max(to.sleepYear||0,t.sleepYear||0)||undefined;
    if(t.trait==='immune')for(const prop of [...to.traits])if(['parasite','neoplasm'].includes(prop.trait))discardTrait(g,to,prop);
   }
   for(const animal of [a,b]){const seen=new Set();for(const t of [...animal.traits])if(t.trait!=='fat'&&seen.has(t.trait))discardTrait(g,animal,t);else seen.add(t.trait);}
  }
 }
 processEffects(g);g.version++;
 return g;
}
function nextAmbush(g,q){
 const prey=byId(g,q.feed.animal);if(!prey)return;
 while(q.players.length){const id=q.players[0];const list=g.players.find(p=>p.id===id).animals.filter(a=>has(g,a,'ambush')&&has(g,a,'carnivore')).flatMap(a=>attacks(g,a,true)).filter(x=>x.target===prey.id);
  if(list.length){g.pending={...q,kind:'ambush',player:id,attacks:list};return;}q.players.shift();
 }
 const plant=g.plants.find(p=>p.id===q.feed.source);
 if(plant?.type==='carnivorous'&&!plant.attacked&&!prey.specialPlant&&!(prey.plantIgnore?.plant===plant.id&&prey.plantIgnore.trait==='counter')){
  plant.attacked=true;plant.owner=g.players[(g.players.findIndex(p=>p.id===prey.owner)+g.players.length-1)%g.players.length].id;
  const ignores=[null,...traits(g,prey).map(t=>t.trait)].filter(ignore=>!blocked(g,plant,prey,ignore));
  if(ignores.length){g.effects.push({kind:'plantCounter',player:plant.owner,animal:prey.id,plant:plant.id,choices:ignores,feed:q.feed});return;}
 }
 takeRed(g,prey,q.feed.source);
}
// Plantarium and flora are kept in the same authoritative engine as animal feeding.
const PLANT_TYPES={
 annual:{name:'Однолетник',start:2,max:3,growth:[1,2,3,3],icon:'sprout'},
 perennial:{name:'Многолетник',start:3,max:5,growth:[0,2,3,5,5,5],icon:'fern'},
 legume:{name:'Бобовое',start:2,max:5,growth:[0,3,4,5,5,5],icon:'sprout'},
 grass:{name:'Злак',start:2,max:5,growth:[0,2,3,5,5,5],icon:'wheat'},
 fruit:{name:'Плодовое',start:2,max:5,growth:[0,5,4,3,3,3],fruit:true,icon:'fern'},
 succulent:{name:'Суккулент',start:3,max:4,growth:[0,2,3,4,4],fruit:true,shelters:1,icon:'plant-roots'},
 liana:{name:'Лиана',start:1,max:6,fruit:true,icon:'fern'},
 fungus:{name:'Гриб',start:1,max:4,fruit:true,icon:'mushroom'},
 carnivorous:{name:'Хищное растение',start:2,max:6,fruit:true,icon:'poison-bottle'}
};
function newPlant(g,type){const d=PLANT_TYPES[type];const continents=g.options.packs.includes('continents');const loc=continents?(g.plants.filter(p=>p.loc==='laurasia').length<g.plants.filter(p=>p.loc==='gondwana').length?'laurasia':'gondwana'):'pangaea';g.plants.push({id:uid(),type,...d,food:d.start,shelters:d.shelters||0,traits:[],loc,isPlant:true,owner:g.players[g.first].id,used:{},ignored:{}});}
function initPlants(g){
 if(g.options.packs.includes('plants')){g.plantDeck=shuffle(Object.keys(PLANT_TYPES).flatMap(t=>Array(4).fill(t)));for(let i=0;i<g.players.length+1;i++)newPlant(g,g.plantDeck.pop());}
 if(g.options.packs.includes('fungi')){g.plantDeck=shuffle(Object.keys(FLORA).flatMap(t=>Array(2).fill(t)));for(let i=0;i<2;i++)addFlora(g);}
}
function attachPlant(g,action,card){
 const p=g.plants.find(p=>p.id===action.plant);
 if(action.trait==='plantParasite'){g.plants.push({id:uid(),type:'parasitic',name:'Растение-паразит',food:0,max:6,loc:p.loc,host:p.id,traits:[],shelters:0,icon:'fern',card,isPlant:true,used:{},ignored:{},owner:g.players[g.first].id});return;}
 if(action.trait==='mycorrhiza'){(g.plantLinks??=[]).push({id:card.id,a:p.id,b:action.other,card});return;}
 p.traits.push(makeTrait(action.trait,card));if(action.trait==='spiky')p.shelters+=3;if(action.trait==='tree')p.shelters+=1;
}
function applyPlant(g,a,p){
 if(g.options.packs.includes('fungi')){
  const f=FLORA[p.flora];
  if(f.mark&&!(a.marks||[]).includes('tryn')&&!(a.marks||[]).includes(f.mark)&&allAnimals(g).filter(x=>(x.marks||[]).includes(f.mark)).length<4){
   (a.marks??=[]).push(f.mark);
   if(f.mark==='toxin')for(const t of [...traits(g,a,false)])if(['parasite','trematode'].includes(t.trait))discardTrait(g,a,t);
  }
  if(p.flora==='wing'){for(const t of [...g.links].filter(t=>[t.a,t.b].includes(a.id)))discardTrait(g,a,t);receive(g,a,1);}
  if(p.flora==='purify'){a.food=Math.min(1,a.food);a.marks=[];}
  if(p.flora==='passion')g.effects.push({kind:'passion',player:a.owner,animal:a.id});
  if(p.flora==='insight'){const player=owner(g,a);player.discard.push(...player.hand);player.hand=[];g.effects.push({kind:'insight',player:a.owner});}
  return;
 }
 if(p.traits.some(t=>t.trait==='nutritious'))receive(g,a,1);
 if(p.traits.some(t=>t.trait==='medicinal'))a.medicinal=true;
 if(p.traits.some(t=>t.trait==='honey'))g.effects.push({kind:'honey',player:a.owner});
}
function addFlora(g){
 if(!g.plantDeck.length&&g.floraDiscard.length){g.plantDeck=shuffle(g.floraDiscard);g.floraDiscard=[];}
 const id=g.plantDeck.pop();if(!id)return;const f=FLORA[id];g.plants.push({id:uid(),flora:id,...f,loc:'pangaea',food:f.type==='grass'?3:1,max:4,traits:[],shelters:0,icon:f.type==='grass'?'wheat':'mushroom'});
}
function extinctPlants(g){
 if(g.options.packs.includes('fungi')){
  for(const p of g.plants.filter(p=>p.food===0))g.floraDiscard.push(p.flora);
  g.plants=g.plants.filter(p=>p.food>0);for(const p of g.plants)if(p.type==='grass')p.food=Math.min(4,p.food+1);
  return;
 }
 if(!g.options.packs.includes('plants'))return;
 const alive=new Set(g.plants.filter(p=>p.food>0&&!p.poisoned).map(p=>p.id));
 let change=true;while(change){change=false;for(const link of g.plantLinks||[])if(alive.has(link.a)||alive.has(link.b))for(const id of [link.a,link.b])if(!alive.has(id)){alive.add(id);change=true;}}
 for(const p of g.plants)if(['annual','parasitic'].includes(p.type)&&!p.poisoned)alive.add(p.id);
 let doomed=true;while(doomed){doomed=false;for(const p of g.plants)if(p.host&&!alive.has(p.host)&&alive.has(p.id)){alive.delete(p.id);doomed=true;}}
 g.plants=g.plants.filter(p=>alive.has(p.id)&&!p.poisoned);g.plantLinks=(g.plantLinks||[]).filter(l=>g.plants.some(p=>p.id===l.a)&&g.plants.some(p=>p.id===l.b));
 for(const a of allAnimals(g))if(a.specialPlant&&!g.plants.some(p=>p.id===a.specialPlant)){for(const t of a.traits.filter(t=>['specialA','specialB'].includes(t.trait)))discardTrait(g,a,t);delete a.specialPlant;}
}
function growPlants(g){
 if(!g.options.packs.includes('plants'))return;
 for(const p of g.plants){
  if(p.type==='liana')p.food=Math.min(p.max,p.food+g.plants.filter(x=>x.type!=='liana').length);
  else if(p.growth)p.food=p.growth[Math.min(p.food,p.growth.length-1)];
  p.shelters=(PLANT_TYPES[p.type]?.shelters||0)+3*p.traits.filter(t=>t.trait==='spiky').length+p.traits.filter(t=>t.trait==='tree').length;p.attacked=false;p.used={};p.ignored={};
  for(const a of allAnimals(g).filter(a=>a.loc===p.loc&&has(g,a,'edificator')))p.food=Math.min(p.max,p.food+1);
 }
 const n=g.players.length,add={2:1,3:2,4:3,5:3,6:3,7:4,8:4}[n];for(let i=0;i<add&&g.plantDeck.length&&g.plants.filter(p=>p.type!=='parasitic').length<2*(n+1);i++)newPlant(g,g.plantDeck.pop());
 for(const p of g.plants)if(p.food===0&&(g.plantLinks||[]).some(l=>l.a===p.id||l.b===p.id))p.food=1;
}
function beginFloraTurn(g){if(g.options.packs.includes('fungi'))g.effects.push({kind:'floraTurn',player:g.players[g.current].id});}
function effectOptions(g,e){
 const a=e.animal?byId(g,e.animal):null,p=g.players.find(p=>p.id===e.player);
 const result=[],add=(choice,label,extra={})=>result.push({type:'effect',choice,label,...extra});
 if(['foodLinks','foodEvent'].includes(e.kind)&&a){for(const l of g.links.filter(l=>[l.a,l.b].includes(a.id)&&!g.turn.links.includes(l.id))){
   const b=byId(g,l.a===a.id?l.b:l.a);if(!b||!same(a,b)||!hungry(g,b)||!traits(g,a).some(t=>t.id===l.id))continue;
   if(l.trait==='cooperation'||(l.trait==='communication'&&e.color==='red'&&canTakeRed(g,b,e.source)))add(l.id,TRAITS[l.trait].name+' → вид '+b.id.slice(0,4));
  }
  if(e.kind==='foodEvent'){
   if(!e.mammalDone&&has(g,a,'mammal'))for(const b of p.animals.filter(b=>b.id!==a.id&&same(a,b)&&!traits(g,b,false).length&&hungry(g,b)))add('mammal:'+b.id,'Млекопитающее → детёныш '+b.id.slice(0,4));
   const plant=g.plants.find(p=>p.id===e.source);if(!e.plantDone&&plant&&(plant.flora||plant.traits.some(t=>['medicinal','nutritious','honey'].includes(t.trait))))add('plant','Применить эффект: '+plant.name);
  }
 }
 if(e.kind==='mammalFood'&&a)for(const b of p.animals.filter(b=>b.id!==a.id&&same(a,b)&&!traits(g,b,false).length&&hungry(g,b)))add(b.id,'Накормить детёныша '+b.id.slice(0,4));
 if(e.kind==='scavenge')for(const id of e.choices){const b=byId(g,id);if(b&&hungry(g,b))add(id,'Падальщик '+id.slice(0,4)+' · получить еду');}
 if(e.kind==='specialize'&&a)for(const plant of g.plants.filter(plant=>plant.loc===a.loc))add(plant.id,'Специализироваться на «'+plant.name+'»');
 if(e.kind==='honey')for(const other of g.players.filter(x=>x.hand.length>p.hand.length))add(other.id,'Взять случайную карту у '+other.name);
 if(e.kind==='fungusDeath')for(const plant of g.plants.filter(p=>e.choices.includes(p.id)&&p.food<p.max))add(plant.id,'Добавить еду: '+plant.name);
 if(e.kind==='passion'&&a)for(const t of traits(g,a,false).filter(t=>!['parasite','trematode','cyst'].includes(t.trait)))add(t.id,'Превратить «'+TRAITS[t.trait].name+'» в животное');
 if(e.kind==='insight'){
  for(const other of g.players.filter(x=>x.id!==p.id))add(other.id,'Посмотреть руку '+other.name,{view:'hand'});
  if(g.deck.length)add('deck','Посмотреть верх колоды',{view:'deck'});
  if(g.plantDeck.length)add('plantDeck','Посмотреть верх колоды флоры',{view:'plantDeck'});
  for(const b of allAnimals(g))if(b.card)add(b.id,'Посмотреть карту вида '+b.id.slice(0,4),{view:'animal'});
 }
 if(e.kind==='regenerate'&&a){if(p.hand.length)for(const c of p.hand)add(c.id,'Восстановить животное картой «'+TRAITS[c.primary].name+'»');else if(g.deck.length)add('deck','Восстановить верхней картой колоды');}
 if(e.kind==='rescue')for(const c of p.hand)for(const loc of ['laurasia','gondwana'])add(c.id,'Новое животное из «'+TRAITS[c.primary].name+'» · '+LOCATIONS[loc],{loc});
 if(e.kind==='plantCounter')for(const ignore of e.choices)add(ignore||'none','Хищное растение: '+(ignore?'игнорировать '+TRAITS[ignore].name:'атаковать без игнорирования'));
 if(e.kind==='floraTurn'&&p)for(const b of p.animals){
  if((b.marks||[]).includes('madness'))add(b.id,'Безумие: очередь проводит сосед справа',{mark:'madness'});
  if((b.marks||[]).includes('rage')){
   let count=0;if(!(b.marks||[]).includes('peace'))for(const target of allAnimals(g)){
    const ignores=(target.marks||[]).includes('dope')?[null,...traits(g,target).map(t=>t.trait)]:[null];
    for(const ignore of ignores)if(!blocked(g,b,target,ignore)){add(b.id,'Бешенство: атаковать вид '+target.id.slice(0,4),{mark:'rage',target:target.id,ignore});count++;}
   }if(!count)add(b.id,'Бешенство: нет доступной жертвы',{mark:'rage'});
  }
 }
 return result;
}
function processEffects(g){
 if(g.pending)return;g.effects??=[];g.suspended??=[];let guard=0;
 while(g.effects.length&&guard++<1000){const e=g.effects.shift();
  if(e.kind==='plantEffect'){const a=byId(g,e.animal),p=g.plants.find(p=>p.id===e.plant);if(a&&p)applyPlant(g,a,p);continue;}
  if(e.kind==='finishExtinction'){finishExtinction(g);continue;}
  if(e.kind==='forcedEnd'){advanceFeeding(g);continue;}
  const options=effectOptions(g,e);if(options.length){g.pending={kind:'effect',effect:e,player:e.player,options};return;}
 }
 if(!g.pending&&g.suspended.length)g.pending=g.suspended.pop();
}
function resolveEffect(g,action){
 const e=g.pending.effect,a=e.animal?byId(g,e.animal):null;g.pending=null;
 if(['foodLinks','foodEvent'].includes(e.kind)){
  if(action.choice==='plant'){e.plantDone=true;g.effects.unshift(e);applyPlant(g,a,g.plants.find(p=>p.id===e.source));}
  else if(action.choice.startsWith('mammal:')){e.mammalDone=true;g.effects.unshift(e);receive(g,byId(g,action.choice.slice(7)),1);}
  else{const l=g.links.find(t=>t.id===action.choice),b=byId(g,l.a===a.id?l.b:l.a);g.turn.links.push(l.id);g.effects.unshift(e);if(l.trait==='communication')takeRed(g,b,e.source);else receive(g,b,1);}
 }else if(['mammalFood','scavenge'].includes(e.kind))receive(g,byId(g,action.choice),1);
 else if(e.kind==='specialize')a.specialPlant=action.choice;
 else if(e.kind==='honey'){
  const other=g.players.find(p=>p.id===action.choice);g.players.find(p=>p.id===e.player).hand.push(other.hand.splice(randomInt(other.hand.length),1)[0]);
 }else if(e.kind==='fungusDeath')g.plants.find(p=>p.id===action.choice).food++;
 else if(e.kind==='passion'){
  const t=traits(g,a,false).find(t=>t.id===action.choice);detach(g,t);makeAnimal(owner(g,a),t.card,a.loc,g.year);
 }else if(e.kind==='insight'){
  let cards=[];if(action.view==='hand')cards=g.players.find(p=>p.id===action.choice).hand;
  else if(action.view==='deck')cards=[g.deck.at(-1)];else if(action.view==='plantDeck')cards=[{flora:g.plantDeck.at(-1)}];else cards=[byId(g,action.choice).card];
  (g.privateViews??={})[e.player]={year:g.year,cards:structuredClone(cards)};
 }else if(e.kind==='regenerate'){
  const p=owner(g,a);a.card=action.choice==='deck'?g.deck.pop():p.hand.splice(p.hand.findIndex(c=>c.id===action.choice),1)[0];a.ghost=false;a.noDraw=true;a.bornFed=true;
 }else if(e.kind==='rescue'){
  const p=g.players.find(p=>p.id===e.player);const c=p.hand.splice(p.hand.findIndex(c=>c.id===action.choice),1)[0];makeAnimal(p,c,action.loc,g.year);if(--e.remaining>0&&p.hand.length)g.effects.unshift(e);
 }else if(e.kind==='plantCounter')beginAttack(g,g.plants.find(p=>p.id===e.plant),a,action.choice==='none'?null:action.choice,false,e.feed);
 else if(e.kind==='floraTurn'){
  const b=byId(g,action.choice);b.marks=b.marks.filter(m=>m!==action.mark);
  if(action.mark==='madness'){const ix=g.players.findIndex(p=>p.id===e.player);g.turn.controller=g.players[(ix+g.players.length-1)%g.players.length].id;log(g,'Безумие: '+g.players[(ix+g.players.length-1)%g.players.length].name+' проводит очередь соседа.');}
  else if(action.target){g.turn.acted=true;const attackUsed=b.used.attack;beginAttack(g,b,byId(g,action.target),action.ignore);const q=g.pending||g.suspended.at(-1);q.rage=true;b.used.attack=attackUsed;}
  else g.effects.push({kind:'forcedEnd'});
 }
}
export function publicState(g,playerId){
 const copy=structuredClone(g);
 copy.deckCount=g.deck.length;delete copy.deck;copy.plantDeckCount=g.plantDeck.length;delete copy.plantDeck;
 delete copy.floraDiscard;delete copy.effects;delete copy.suspended;
 copy.privateView=g.privateViews?.[playerId]||null;delete copy.privateViews;
 for(const p of copy.players){p.handCount=p.hand.length;p.discardCount=p.discard.length;delete p.token;
  if(p.id!==playerId)p.hand=[];
  p.discard=[];
  for(const a of p.animals){a.need=demand(g,a);a.isFed=fed(g,a);a.canEat=hungry(g,a);a.properties=traits(g,a,false).map(t=>({...t,card:undefined}));a.traits=a.traits.map(t=>({...t,card:undefined}));if(p.id!==playerId&&!a.revealed)a.card=null;}
  p.score=score(g,g.players.find(x=>x.id===p.id));
 }
 copy.links=copy.links.map(l=>({...l,card:undefined}));
 if(copy.pending?.card&&copy.pending.player!==playerId)delete copy.pending.card;
 if(copy.pending?.effect)delete copy.pending.effect;
 if(copy.pending?.options&&copy.pending.player!==playerId)delete copy.pending.options;
 if(g.options.packs.includes('fungi'))copy.floraScore=g.plants.reduce((n,p)=>n+2+p.food,0);
 copy.me=playerId;copy.actions=legalActions(g,playerId);return copy;
}
export function botAction(g,id){
 const list=legalActions(g,id);if(!list.length)return null;
 const p=g.players.find(p=>p.id===id);let candidates=list;
 if(g.pending){if(g.pending.kind==='defense'){candidates=list.filter(a=>['fast','horns','ink','tail','mimicry','angler'].includes(a.mode));if(!candidates.length)candidates=list;}else if(g.pending.kind==='ambush')candidates=list.filter(a=>!a.skip);}
 else if(g.phase==='development'){
  if(p.animals.length<2)candidates=list.filter(a=>a.type==='animal');
  else{candidates=list.filter(a=>a.type==='trait'&&TRAITS[a.trait].type!=='negative'&&TRAITS[a.trait].food===0);if(!candidates.length)candidates=list.filter(a=>a.type==='animal');if(p.animals.length>=4||p.hand.length<=1)candidates=list.filter(a=>a.type==='pass');}
 }else if(g.phase==='feeding'){
  if(!g.turn.main)candidates=list.filter(a=>['feed','attack','special','fat','sleep'].includes(a.type));
  else candidates=list.filter(a=>['fat','warm','piracy'].includes(a.type));
  if(!candidates.length)candidates=list.filter(a=>a.type==='end');
 }
 return (candidates.length?candidates:list)[randomInt((candidates.length?candidates:list).length)];
}
