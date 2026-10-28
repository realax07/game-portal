import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,findRoom,joinRoom,listLobbies,randomLobby,startRoom,changeSlot,roomState,migrateRoom,actorId,addBot} from '../lobby.mjs';
import {newGame} from '../engine.mjs';
const slots=(...kinds)=>kinds.map(kind=>({kind}));
const create=(data={})=>{const rooms=new Map();return {rooms,...createRoom(rooms,{name:'А',options:{packs:[]},...data})};};
test('open listings exclude private, local and started lobbies',()=>{
 const {rooms,room}=create({title:'Открытая'});
 const hidden=createRoom(rooms,{name:'Б',visibility:'private',login:'friends',password:'pass'}).room;
 createRoom(rooms,{name:'В',mode:'hotseat'});
 assert.deepEqual(listLobbies(rooms).map(r=>r.code),[room.code]);
 assert.equal(findRoom(rooms,'FRIENDS'),hidden);assert.equal(findRoom(rooms,room.code.toLowerCase()),room);
 joinRoom(room,{name:'Г'});startRoom(room);assert.equal(listLobbies(rooms).length,0);
});
test('passwords are hashed, required and absent from public payloads',()=>{
 const {room}=create({visibility:'private',login:'Только друзья',password:'secret-321'});
 assert.notEqual(room.password.hash,'secret-321');assert.throws(()=>joinRoom(room,{name:'Б'}),/пароль/);
 assert.throws(()=>joinRoom(room,{name:'Б',password:'wrong'}),/пароль/);
 const state=roomState(room,room.members[0]);assert.ok(!JSON.stringify(state).includes(room.password.hash));assert.ok(!JSON.stringify(state).includes('secret-321'));
 assert.ok(joinRoom(room,{name:'Б',password:'secret-321'}).token);
});
test('private login collisions and empty passwords are rejected',()=>{
 const {rooms}=create({visibility:'private',login:'MyRoom',password:'a'});
 assert.throws(()=>createRoom(rooms,{name:'Б',visibility:'private',login:'myroom',password:'b'}),/занят/);
 assert.throws(()=>createRoom(rooms,{name:'Б',visibility:'private',password:''}),/пароль/);
});
test('random matchmaking only picks open available online lobbies',()=>{
 const {rooms,room}=create();createRoom(rooms,{name:'Б',mode:'hotseat'});createRoom(rooms,{name:'В',visibility:'private',password:'x'});
 const result=randomLobby(rooms,{name:'Г'});assert.equal(result.room.code,room.code);assert.equal(result.room.game.players.length,2);
 assert.throws(()=>randomLobby(rooms,{name:'Д'}),/нет открытых/);
});
test('human slots must fill or be changed before start, failed start is atomic',()=>{
 const {room}=create({slots:slots('human','human','bot')});const before=structuredClone(room.game);
 assert.throws(()=>startRoom(room),/Дождитесь/);assert.deepEqual(room.game,before);
 changeSlot(room,room.members[0],{slotId:room.slots[1].id,kind:'closed'});startRoom(room);assert.equal(room.game.players.length,2);
});
test('only host can configure slots or remove occupied seats',()=>{
 const {room}=create({slots:slots('human','human','closed')});joinRoom(room,{name:'Б'});const guest=room.members[1];
 assert.throws(()=>changeSlot(room,guest,{slotId:room.slots[2].id,kind:'bot'}),/создатель/);
 changeSlot(room,room.members[0],{slotId:room.slots[1].id,kind:'bot'});assert.ok(!room.members.some(m=>m.id===guest.id));
 assert.ok(room.game.players.find(p=>p.id===room.slots[1].playerId).bot);
});
test('online human occupancy is not manufactured from names in setup',()=>{
 const {room}=create({slots:[{kind:'human'},{kind:'human',name:'Б'},{kind:'bot',name:'Чарльз'}]});
 assert.equal(room.game.players.length,2);assert.equal(room.slots[1].playerId,null);assert.equal(room.game.players[1].name,'Чарльз');
 assert.throws(()=>joinRoom(room,{name:'Г',slotId:room.slots[2].id}),/слотов/);
});
test('hotseat creates local humans and never exposes bot hands',()=>{
 const {room}=create({mode:'hotseat',slots:slots('human','human','bot')});assert.equal(room.game.players.length,3);assert.equal(room.members.length,1);
 assert.throws(()=>joinRoom(room,{name:'Б'}),/одним столом/);startRoom(room);
 const bot=room.game.players.findIndex(p=>p.bot);room.game.pending=null;room.game.current=bot;
 const state=roomState(room,room.members[0]);assert.equal(state.me,null);assert.ok(state.players.every(p=>!p.hand.length));assert.equal(state.actions.length,0);assert.ok(state.canManage);
});
test('hotseat can replace the current player mid-turn and restore same state',()=>{
 const {room}=create({mode:'hotseat',slots:slots('human','human')});startRoom(room);
 const id=actorId(room.game),slot=room.slots.find(s=>s.playerId===id),p=room.game.players.find(p=>p.id===id),hand=structuredClone(p.hand),current=room.game.current,year=room.game.year;
 changeSlot(room,room.members[0],{slotId:slot.id,kind:'bot'});assert.ok(p.bot);assert.equal(roomState(room,room.members[0]).me,null);
 changeSlot(room,room.members[0],{slotId:slot.id,kind:'human',name:'Вернулся'});assert.ok(!p.bot);assert.equal(p.name,'Вернулся');
 assert.deepEqual(p.hand,hand);assert.equal(room.game.current,current);assert.equal(room.game.year,year);assert.equal(roomState(room,room.members[0]).me,id);
 assert.throws(()=>changeSlot(room,room.members[0],{slotId:slot.id,kind:'closed'}),/Во время/);
});
test('hotseat host authority survives replacing their own seat with a bot',()=>{
 const {room}=create({mode:'hotseat'}),member=room.members[0],slot=room.slots[0];startRoom(room);
 changeSlot(room,member,{slotId:slot.id,kind:'bot'});assert.ok(roomState(room,member).canManage);
 changeSlot(room,member,{slotId:slot.id,kind:'human'});assert.equal(room.slots[0].kind,'human');
});
test('online host seat and active online participants cannot be replaced',()=>{
 const {room}=create();const host=room.members[0];assert.throws(()=>changeSlot(room,host,{slotId:room.slots[0].id,kind:'bot'}),/создателя/);
 joinRoom(room,{name:'Б'});startRoom(room);assert.throws(()=>changeSlot(room,host,{slotId:room.slots[1].id,kind:'bot'}),/до старта/);
});
test('legacy rooms retain their ID and sessions but remain unlisted',()=>{
 const g=newGame(['А','Б']);g.players[0].token='old-token';g.players[1].bot=true;const room={code:'ABCDEF',host:g.players[0].id,game:g};
 migrateRoom(room);assert.equal(room.members[0].token,'old-token');assert.equal(room.visibility,'unlisted');assert.ok(!g.players[0].token);
 assert.equal(listLobbies(new Map([[room.code,room]])).length,0);assert.equal(roomState(room,room.members[0]).me,g.players[0].id);
});
test('add bot uses an available or closed slot and respects eight-seat limit',()=>{
 const {room}=create();addBot(room,room.members[0]);assert.equal(room.slots[1].kind,'bot');
 for(let i=0;i<6;i++)addBot(room,room.members[0]);assert.equal(room.slots.length,8);assert.throws(()=>addBot(room,room.members[0]),/8 слотов/);
});
