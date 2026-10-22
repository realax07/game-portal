import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,beats} from '../game.js';
test('защита мастью и козырем',()=>{
  assert.equal(beats({suit:'♥',rank:3},{suit:'♥',rank:2},'♠'),true);
  assert.equal(beats({suit:'♥',rank:3},{suit:'♣',rank:2},'♠'),false);
  assert.equal(beats({suit:'♠',rank:0},{suit:'♥',rank:8},'♠'),true);
  assert.equal(beats({suit:'♥',rank:8},{suit:'♠',rank:0},'♠'),false);
});
test('1000 полных партий: сохранность карт, допустимые ходы, завершение',()=>{
  let seed=42;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
  for(let n=0;n<1000;n++){
    const g=new Game(rng);let step=0;
    while(!g.result && step++<10000){
      const cards=[...g.deck,...g.hands.flat(),...g.discard,...g.table.flatMap(p=>p.defense?[p.attack,p.defense]:[p.attack])];
      assert.equal(cards.length,36);assert.equal(new Set(cards.map(c=>c.id)).size,36);
      assert.ok(g.table.length<=g.limit);
      if(g.aiStep())continue;
      if(g.attacker===0){const card=g.hands[0].find(c=>g.legal(0,c));if(card && (!g.covered || rng()>.3))assert.ok(g.play(0,card.id));else assert.ok(g.finish(0));}
      else {const card=g.hands[0].find(c=>g.legal(0,c));if(card && rng()>.07)assert.ok(g.play(0,card.id));else assert.ok(g.take(0));}
    }
    assert.ok(g.result,`Партия ${n} должна завершиться`);
  }
});
test('атака ограничена рукой защитника, чужой ход отклоняется',()=>{
  const g=new Game();g.attacker=0;g.table=[];g.limit=1;
  const c=g.hands[0][0];assert.equal(g.play(0,c.id),true);
  assert.equal(g.legal(0,g.hands[0][0]),false);
  assert.equal(g.finish(1),false);assert.equal(g.take(0),false);
});
test('после взятия можно подкинуть; добор начинает атакующий, козырь берут последним',()=>{
  const g=new Game();
  const c=(suit,rank)=>({suit,rank,label:String(rank+6),id:suit+rank});
  g.attacker=0;g.hands=[[c('♠',0),c('♥',0)],[c('♣',2),c('♦',3)]];g.table=[];g.limit=2;
  g.deck=[c('♥',8),c('♣',8)];
  g.play(0,g.hands[0][0].id);assert.ok(g.take(1));
  assert.ok(g.play(0,g.hands[0][0].id));assert.ok(g.finish(0));
  assert.equal(g.attacker,0);assert.equal(g.hands[1].length,4);
  assert.deepEqual(g.hands[0].map(c=>c.id),['♣8','♥8']);assert.equal(g.deck.length,0);
});
test('последние карты, ушедшие в отбой вместе, дают ничью',()=>{
  const g=new Game();g.deck=[];g.hands=[[],[]];g.attacker=0;
  g.table=[{attack:{suit:'♠',rank:0},defense:{suit:'♠',rank:1}}];
  assert.ok(g.finish(0));assert.equal(g.result,'draw');
});
