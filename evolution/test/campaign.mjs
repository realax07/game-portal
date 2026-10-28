import assert from 'node:assert/strict';
import {newGame,startGame,act,botAction,legalActions} from '../engine.mjs';
const profiles=[[],['flight','continents','gift','immune','cycle'],['plants','continents','flight','gift','immune','cycle'],['fungi','flight','gift','immune','cycle']];
let maximum=0,total=0;
for(let i=0;i<100;i++){
 const g=newGame(['А','Б','В'],{packs:profiles[i%profiles.length],shortDeck:true,bots:[true,true,true]});startGame(g);let n=0;
 while(g.phase!=='finished'&&n<6000){
  const id=g.pending?.player||g.turn?.controller||g.players[g.current].id;
  const list=legalActions(g,id),a=i<50?botAction(g,id):list[Math.floor(Math.random()*list.length)];
  assert.ok(a,`No action: campaign ${i}, ${g.phase}, ${JSON.stringify(g.pending)}`);act(g,id,a);
  for(const p of g.players)for(const animal of p.animals){assert.ok(animal.food>=0);assert.ok(animal.fat>=0);}
  for(const plant of g.plants){assert.ok(plant.food>=0,JSON.stringify({i,n,a,plant,phase:g.phase}));assert.ok(plant.food<=plant.max,JSON.stringify({i,n,a,plant,phase:g.phase}));}
  n++;
 }
 assert.equal(g.phase,'finished',`Campaign ${i} stalled in ${g.phase}, year ${g.year}`);maximum=Math.max(maximum,n);total+=n;
}
console.log(`100 full campaigns passed (50 bots, 50 randomized legal actions): ${total} transitions, maximum ${maximum} per game.`);
