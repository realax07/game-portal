const assert=require('node:assert/strict');const {Game,evaluate,compare}=require('./dist/engine.js');
const hand=s=>s.split(' ').map(v=>({r:({A:14,K:13,Q:12,J:11,T:10}[v[0]]||+v[0]),s:v[1]}));
assert.deepEqual(evaluate(hand('A♠ 2♣ 3♦ 4♥ 5♠ K♠ Q♠')),[4,5]);
assert.deepEqual(evaluate(hand('A♠ K♠ Q♠ J♠ T♠ 2♦ 3♥')),[8,14]);
assert.deepEqual(evaluate(hand('A♠ A♥ A♦ K♣ K♠ K♥ 2♥')),[6,14,13]);
assert(compare(evaluate(hand('A♠ A♥ K♦ J♣ 9♠ 3♥ 2♥')),evaluate(hand('A♣ A♦ Q♥ J♥ 9♦ 3♣ 2♣')))>0);
let g=new Game();g.start();assert.equal(g.turn,3);assert.equal(g.pot,30);assert.equal(g.players[1].bet,10);assert.equal(g.players[2].bet,20);
// Different all-in stacks create main and side pots; excess comes back to its owner.
g=new Game();g.done=false;g.pot=600;g.board=hand('2♠ 3♥ 7♦ 9♣ J♠');g.players.forEach((p,i)=>{p.folded=i>2;p.total=[100,200,300,0,0][i];p.stack=2000-p.total;p.cards=hand(['A♣ A♦','K♣ K♦','Q♣ Q♦','4♣ 5♣','6♣ 8♣'][i]);});g.finish(true);assert.deepEqual(g.players.map(p=>p.stack),[2200,2000,1800,2000,2000]);
let count=0;for(let session=0;session<100;session++){g=new Game();for(let h=0;h<25&&g.players.filter(p=>p.stack>0).length>1;h++){g.start();let n=0;while(!g.done){assert(++n<200,'hand terminates');let l=g.legal();let r=Math.random();let move=r<.15?['fold']:r<.4&&l.canRaise?['raise',r<.2?l.max:l.min]:['call'];assert(g.act(...move));assert(g.players.every(p=>p.stack>=0&&Number.isInteger(p.stack)));if(!g.done)assert.equal(g.players.reduce((a,p)=>a+p.stack,0)+g.pot,10000);}assert.equal(g.players.reduce((a,p)=>a+p.stack,0),10000);count++;}}
console.log('PASS: hand rankings, wheel straight, kickers, initial action order, side pots, and '+count+' random hands with chip conservation.');
