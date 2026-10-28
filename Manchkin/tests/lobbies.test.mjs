import test from 'node:test';
import assert from 'node:assert/strict';
import {LobbyStore} from '../server/lobbies.mjs';
import {makeGame,CARDS,startCombat,win,beginReactions,passReaction} from '../public/engine.js';
import {setPlayerController,createBotScheduler} from '../public/player-control.js';
const slots=['human','human','bot','closed','closed'];
const delay=()=>new Promise(r=>setImmediate(r));
test('public lobby can be listed and joined randomly; private login requires password and is not listed',()=>{
 const store=new LobbyStore(),pub=store.create({name:'Публичная',slots,playerName:'A'});assert.match(pub.room.id,/^[0-9A-F]{6}$/);assert.equal(store.list().length,1);const guest=store.join({random:true,playerName:'B'});assert.equal(guest.you.seat,1);assert.equal(guest.room.id,pub.room.id);assert.equal(store.list().length,0);
 const secret=store.create({name:'Секретная',slots,visibility:'private',password:'abcd'});assert.equal(store.list().length,0);assert.throws(()=>store.join({login:'Секретная',password:'wrong'}),/Неверный пароль/);assert.equal(store.join({login:'Секретная',password:'abcd'}).room.id,secret.room.id);assert.ok(!JSON.stringify(store.read(secret.room.id,secret.token)).includes('abcd'));
});
test('host configures free slots; occupied slots and unfinished seats protect start; at most five players',()=>{
 const store=new LobbyStore(),h=store.create({name:'Test',slots});assert.throws(()=>store.start(h.room.id,h.token),/Не все места/);const j=store.join({id:h.room.id});assert.throws(()=>store.configure(h.room.id,h.token,{slots:['human','bot','bot']}),/занятое/);assert.throws(()=>store.configure(h.room.id,j.token,{slots}),/Только создатель/);assert.equal(store.start(h.room.id,h.token).room.phase,'playing');assert.throws(()=>store.join({id:h.room.id}),/началась/);assert.throws(()=>store.create({name:'Too many',slots:Array(6).fill('human')}),/1 до 5/);
});
test('members only receive their private view; commands need a current capability owned by their seat',()=>{
 const store=new LobbyStore(),h=store.create({name:'Views',slots}),j=store.join({id:h.room.id});store.start(h.room.id,h.token);const publish=(commands=['guest-click','guest-field'])=>store.publish(h.room.id,h.token,{views:{0:{html:'HOST-SECRET',modal:'',commands:['host-click']},1:{html:'GUEST-SECRET',modal:'',commands}},ack:[]});publish();assert.equal(store.read(h.room.id,j.token).view.html,'GUEST-SECRET');assert.ok(!JSON.stringify(store.read(h.room.id,j.token)).includes('HOST-SECRET'));assert.throws(()=>store.read(h.room.id,'wrong'),/снова войти/);assert.throws(()=>store.command(h.room.id,j.token,{id:'command-001',command:'host-click',fields:[]}),/Стол изменился/);
 const c={id:'command-002',command:'guest-click',fields:[{id:'guest-field',value:'x',checked:true}]};store.command(h.room.id,j.token,c);store.command(h.room.id,j.token,c);assert.equal(store.pending(h.room.id,h.token).commands.length,1);assert.throws(()=>store.pending(h.room.id,j.token),/Только создатель/);store.publish(h.room.id,h.token,{views:{0:{html:'',modal:'',commands:[]},1:{html:'',modal:'',commands:[]}},ack:[c.id]});assert.equal(store.pending(h.room.id,h.token).commands.length,0);assert.throws(()=>store.command(h.room.id,j.token,c),/Стол изменился/);
});
test('leaving restores waiting slot or switches live seat to bot; host exit closes the room',()=>{
 const store=new LobbyStore(),h=store.create({name:'Leave',slots}),a=store.join({id:h.room.id});store.leave(h.room.id,a.token);assert.equal(store.list().length,1);const b=store.join({id:h.room.id});store.start(h.room.id,h.token);store.control(h.room.id,h.token,{seat:1,type:'bot'});assert.throws(()=>store.command(h.room.id,b.token,{id:'blocked-001',command:'x',fields:[]}),/ботом/);store.control(h.room.id,h.token,{seat:1,type:'human'});store.leave(h.room.id,b.token);assert.equal(store.read(h.room.id,h.token).room.slots[1].type,'bot');store.leave(h.room.id,h.token);assert.throws(()=>store.read(h.room.id,h.token),/не найдено/);
});
test('controller replacement preserves all player cards and progress, assigning a persisted distinct bot profile',()=>{
 const g=makeGame(['A','B'],['base'],'hotseat'),p=g.players[1],before=structuredClone(p);setPlayerController(g,1,true,()=>0);const profile=p.aiProfile;assert.ok(profile);assert.equal(p.level,before.level);assert.deepEqual(p.hand,before.hand);assert.deepEqual(p.equipment,before.equipment);setPlayerController(g,1,false);assert.equal(p.bot,false);setPlayerController(g,1,true);assert.equal(p.aiProfile,profile);
});
test('bot driver restarts after a human wins a transferred fight and all aftermath passes resolve',async()=>{
 const g=makeGame(['Human','Bot'],['base'],'hotseat');delete g.pendingDivine;g.players[1].bot=true;g.players[0].level=8;g.players[0].hand=[];g.treasures=g.treasures.filter(c=>!c.immediate);startCombat(g,{...CARDS.find(c=>c.en==='Potted Plant'),uid:9999999});g.returnTurn=1;win(g);assert.equal(g.turn,1);assert.equal(g.phase,'loot');let calls=0,release;const scheduler=createBotScheduler({getGame:()=>g,run:async()=>{calls++;await new Promise(r=>release=r);g.turn=0}});beginReactions(g,'aftermath');scheduler.request();await delay();assert.equal(calls,0);passReaction(g);g.reaction=null;scheduler.request();scheduler.request();await delay();assert.equal(calls,1);scheduler.request();await delay();assert.equal(calls,1);release();await delay();assert.equal(scheduler.running,false);
});
test('an old bot driver unwinding into a human turn does not swallow a later returned bot turn',async()=>{
 const g={winner:null,turn:0,players:[{bot:true},{bot:false}]};let calls=0,release;const scheduler=createBotScheduler({getGame:()=>g,run:async()=>{calls++;if(calls===1)await new Promise(r=>release=r);else g.turn=1}});scheduler.request();await delay();g.turn=1;scheduler.request();g.turn=0;scheduler.request();release();await delay();await delay();assert.equal(calls,2);assert.equal(g.turn,1);
});
test('reset cancels a pending old driver without blocking bots in a new session',async()=>{
 const g={winner:null,turn:0,players:[{bot:true},{bot:false}]};let calls=0,release;const scheduler=createBotScheduler({getGame:()=>g,run:async()=>{calls++;if(calls===1)await new Promise(r=>release=r);else g.turn=1}});scheduler.request();await delay();scheduler.reset();scheduler.request();await delay();assert.equal(calls,2);assert.equal(g.turn,1);release();await delay();assert.equal(scheduler.running,false);
});
