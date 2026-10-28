import {physicalCards} from '../public/immediate-cards.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,SETS,DEFAULT_SETS,makeGame,draw,upgradeSave,startCombat,wanderingOptions,addWanderingMonster,combatMonsters} from '../public/engine.js';
import {BOT_PROFILES,chooseBotAction} from '../public/ai.js';
import {GENERATED_CARD_ART as art} from '../public/generated-card-art.js';

function withArt(entries,run){
  const previous=Object.entries(art);
  try{
    for(const en of Object.keys(art))delete art[en];
    Object.assign(art,Object.fromEntries(entries));
    return run();
  }finally{
    for(const en of Object.keys(art))delete art[en];
    Object.assign(art,Object.fromEntries(previous));
  }
}
function seeded(run){
  const previous=Math.random;let seed=72139;
  try{Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);return run();}
  finally{Math.random=previous;}
}
const allSets=SETS.map(s=>s.id);
const newGame=sets=>makeGame(['Игрок','Бот 1','Бот 2','Бот 3','Бот 4'],sets,'bots');
const gameCards=physicalCards;

test('every playable card in the selected sets enters the deck or starting hands regardless of illustration',()=>{
  for(const sets of [DEFAULT_SETS,allSets]){
    const g=seeded(()=>newGame(sets));
    const expected=CARDS.filter(c=>g.sets.includes(c.set));
    const dealt=gameCards(g);
    assert.deepEqual(new Set(dealt.map(c=>c.id)),new Set(expected.map(c=>c.id)));
    for(const c of dealt)assert.ok(g.sets.includes(c.set));
    // Cards already drawn into a starting hand are part of the same game pool.
    for(const p of g.players)assert.deepEqual(p.lastDeal,{doors:4,treasures:4});
  }
});

test('adding or removing every generated illustration cannot change dealing, draw order or restored saves',()=>{
  const coverage=CARDS.map(c=>[c.en,{file:'assets/illustrations/test-only.jpg',alt:'Test coverage only'}]);
  function scenario(){return seeded(()=>{
    const g=newGame(allSets),initial=structuredClone(g);
    const doors=[],treasures=[];
    while(g.doors.length)doors.push(draw(g,'doors').id);
    while(g.treasures.length)treasures.push(draw(g,'treasures').id);
    return{initial,doors,treasures,restored:upgradeSave(structuredClone(initial))};
  });}
  const noGeneratedArt=withArt([],scenario);
  const allGeneratedArt=withArt(coverage,scenario);
  assert.deepEqual(allGeneratedArt,noGeneratedArt);
});

test('players and all ten AI profiles can add painted and SVG monsters, independent of the art registry',()=>{
  let uid=700000;
  const card=en=>{
    const definition=CARDS.find(c=>c.en===en);
    assert.ok(definition,en);
    return{...definition,uid:uid++};
  };
  const coverage=[['Plutonium Dragon',{file:'assets/illustrations/test-only.jpg',alt:'Test coverage only'}]];
  withArt(coverage,()=>{
    for(const profile of BOT_PROFILES)for(const en of ['Plutonium Dragon','Hairy Potter']){
      const g=seeded(()=>newGame(allSets));
      g.players[0].level=9;
      startCombat(g,card('Potted Plant'));
      const monster=card(en),enabler=card('Wandering Monster');
      g.players[1].hand=[enabler,monster];
      g.players[1].aiProfile=profile.id;
      assert.deepEqual(wanderingOptions(g,1).map(c=>c.uid),[monster.uid]);
      const action=chooseBotAction(g,1,'react',()=>.999);
      assert.equal(action.type,'wander',`${profile.id}: ${en}`);
      assert.equal(action.uid,monster.uid);
      assert.equal(addWanderingMonster(g,1,action.uid).ok,true);
      assert.equal(g.players[1].hand.length,0);
      assert.ok(combatMonsters(g).some(c=>c.uid===monster.uid));
    }
  });
});
