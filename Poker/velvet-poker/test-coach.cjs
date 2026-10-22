const assert=require('node:assert/strict');const Poker=require('./dist/engine.js');const Coach=require('./dist/coach.js');
const cards=s=>s.split(' ').map(v=>({r:({A:14,K:13,Q:12,J:11,T:10}[v[0]]||+v[0]),s:v[1]}));
const seven=cards('A♠ K♠ Q♠ J♠ T♠ 2♦ 3♥');assert.deepEqual(Poker.evaluate(Coach.bestFive(seven)),[8,14]);assert.equal(Coach.bestFive(cards('A♠ K♠')).length,0);
let g=new Poker.Game();g.start();while(g.turn!==0)g.act('call');g.players[0].cards=cards('2♠ 7♥');assert.equal(Coach.advice(g).type,'fold');let advice=Coach.advice(g);g.players[1].cards=cards('A♥ A♦');assert.deepEqual(Coach.advice(g),advice,'advice must not use opponents’ private cards');g.players[0].cards=cards('A♠ A♣');assert.equal(Coach.advice(g).type,'call');g.currentBet=g.players[0].bet;assert.equal(Coach.advice(g).type,'call');assert.match(Coach.advice(g).title,/чек/);
assert.match(Coach.describe(cards('A♠ 2♣ 3♦ 4♥ 5♠ K♠ Q♠')),/Стрит/);assert.match(Coach.describe(cards('Q♠ Q♦')),/дамы/);
while(!g.done)g.act('call');assert.match(Coach.outcome(g),/Ваш итог за раздачу/);assert.match(Coach.outcome(g),/кикеры/);
console.log('PASS: beginner advice, no hidden-card access, free check, best five, card explanations, and showdown recap.');
