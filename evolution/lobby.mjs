import {randomBytes,randomInt,scryptSync,timingSafeEqual} from 'node:crypto';
import {newGame,publicState,startGame} from './engine.mjs';

export const sessionToken=()=>randomBytes(24).toString('hex');
export const cleanName=n=>String(n||'Исследователь').trim().slice(0,24)||'Исследователь';
const loginKey=s=>String(s||'').trim().toLowerCase();
const makePlayer=(name,bot=false)=>{const p=newGame([cleanName(name)]).players[0];p.bot=bot;return p;};
const botNames=['Дарвин','Линней','Уоллес','Ламарк','Мендель','Геккель','Вернадский','Натуралист'];
function passwordRecord(password){
 if(typeof password!=='string'||!password.length||password.length>128)throw Error('Укажите пароль лобби длиной от 1 до 128 символов.');
 const salt=randomBytes(16).toString('hex');return {salt,hash:scryptSync(password,salt,32).toString('hex')};
}
export function authenticateRoom(room,password){
 if(room.visibility!=='private')return;
 if(typeof password!=='string'||password.length>128||!room.password)throw Error('Неверный пароль лобби.');
 const actual=scryptSync(password,room.password.salt,32),expected=Buffer.from(room.password.hash,'hex');
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw Error('Неверный пароль лобби.');
}
export function migrateRoom(room){
 if(room.members)return room;
 room.mode='online';room.visibility='private';room.title='Экспедиция '+room.code;room.login=room.code;
 // Old unlisted rooms remain accessible by ID without introducing a new password.
 room.visibility='unlisted';room.members=room.game.players.filter(p=>p.token).map(p=>({id:p.id,playerId:p.id,token:p.token}));
 for(const p of room.game.players)delete p.token;
 room.slots=room.game.players.map(p=>({id:sessionToken().slice(0,12),kind:p.bot?'bot':'human',playerId:p.id}));
 if(room.game.phase==='lobby')while(room.slots.length<8)room.slots.push({id:sessionToken().slice(0,12),kind:'human',playerId:null});
 room.requireFull=false;return room;
}
export function createRoom(rooms,data){
 const mode=data.mode==='hotseat'?'hotseat':'online',visibility=mode==='hotseat'?'local':data.visibility==='private'?'private':'open';
 let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(findRoom(rooms,code));
 const login=visibility==='private'?String(data.login||code).trim().slice(0,32):null;
 if(login&&findRoom(rooms,login))throw Error('Этот логин лобби уже занят.');
 const password=visibility==='private'?passwordRecord(data.password):null;
 const options=data.options||{},g=newGame([cleanName(data.name)],options),p=g.players[0];
 const member={id:p.id,playerId:p.id,token:sessionToken()};
 let spec=data.slots;
 if(data.demo)spec=[{kind:'human'},{kind:'bot'},{kind:'bot'}];
 if(spec===undefined)spec=[{kind:'human'},{kind:'human'}];
 if(!Array.isArray(spec)||spec.length<2||spec.length>8)throw Error('Настройте от 2 до 8 слотов.');
 if(spec.some(s=>!s||!['human','bot','closed'].includes(s.kind)))throw Error('Недопустимый тип слота.');
 if(spec.filter(s=>s.kind!=='closed').length<2)throw Error('Нужны хотя бы два открытых игровых слота.');
 if(spec[0].kind!=='human')throw Error('Первый слот при создании принадлежит человеку.');
 const room={code,title:cleanName(data.title||'Новая экспедиция'),host:member.id,created:Date.now(),mode,visibility,login,password,members:[member],slots:[],requireFull:true,game:g};
 for(let i=0;i<spec.length;i++){
  const s=spec[i],slot={id:sessionToken().slice(0,12),kind:s.kind,playerId:i===0?p.id:null};
  if(i>0&&(s.kind==='bot'||(mode==='hotseat'&&s.kind==='human'))){const player=makePlayer(s.name||(s.kind==='bot'?botNames[i-1]:'Игрок '+(i+1)),s.kind==='bot');g.players.push(player);slot.playerId=player.id;}
  room.slots.push(slot);
 }
 g.code=code;g.host=room.host;
 if(data.demo)startRoom(room);
 rooms.set(code,room);return {room,credential:{code,token:member.token,player:p.id}};
}
export function findRoom(rooms,query){const key=loginKey(query);if(!key)return null;return [...rooms.values()].find(r=>loginKey(r.code)===key||(r.login&&loginKey(r.login)===key))||null;}
export function lobbyInfo(room){
 const vacant=room.slots.filter(s=>s.kind==='human'&&!s.playerId).length;
 return {code:room.code,title:room.title,visibility:room.visibility,login:room.login||null,mode:room.mode,phase:room.game.phase,created:room.created,capacity:room.slots.filter(s=>s.kind!=='closed').length,humans:room.slots.filter(s=>s.kind==='human'&&s.playerId).length,bots:room.slots.filter(s=>s.kind==='bot').length,vacant,requiresPassword:room.visibility==='private',packs:room.game.options.packs};
}
export function listLobbies(rooms,query=''){
 const key=loginKey(query);return [...rooms.values()].filter(r=>r.mode==='online'&&r.visibility==='open'&&r.game.phase==='lobby'&&(!key||loginKey(r.title).includes(key)||loginKey(r.code).includes(key))).map(lobbyInfo).sort((a,b)=>b.created-a.created);
}
export function joinRoom(room,data){
 if(room.mode==='hotseat')throw Error('За одним столом играют на устройстве создателя.');
 if(room.game.phase!=='lobby')throw Error('Партия уже началась.');
 authenticateRoom(room,data.password);
 const slot=data.slotId?room.slots.find(s=>s.id===data.slotId):room.slots.find(s=>s.kind==='human'&&!s.playerId);
 if(!slot||slot.kind!=='human'||slot.playerId)throw Error('Свободных слотов для человека нет.');
 const p=makePlayer(data.name),member={id:p.id,playerId:p.id,token:sessionToken()};
 slot.playerId=p.id;room.game.players.push(p);room.members.push(member);room.game.version++;
 return {code:room.code,token:member.token,player:p.id};
}
export function randomLobby(rooms,data){
 const eligible=[...rooms.values()].filter(r=>r.mode==='online'&&r.visibility==='open'&&r.game.phase==='lobby'&&r.slots.some(s=>s.kind==='human'&&!s.playerId));
 if(!eligible.length)throw Error('Сейчас нет открытых лобби со свободным местом. Создайте своё.');
 const room=eligible[randomInt(eligible.length)];return {room,credential:joinRoom(room,data)};
}
export function startRoom(room){
 const g=room.game;
 if(g.phase!=='lobby')throw Error('Партия уже началась.');
 if(room.requireFull&&room.slots.some(s=>s.kind==='human'&&!s.playerId))throw Error('Дождитесь людей или замените свободные слоты ботами / закройте их.');
 const ordered=room.slots.filter(s=>s.playerId).map(s=>g.players.find(p=>p.id===s.playerId));
 // Validate on a copy so a failed start cannot reorder or partially deal the real game.
 const copy=structuredClone(g);copy.players=structuredClone(ordered);startGame(copy);copy.version++;room.game=copy;
}
export function changeSlot(room,member,data){
 if(member.id!==room.host)throw Error('Слоты настраивает создатель лобби.');
 const g=room.game,slot=room.slots.find(s=>s.id===data.slotId);
 if(!slot||!['human','bot','closed'].includes(data.kind))throw Error('Неизвестный слот или тип участника.');
 if(g.phase!=='lobby'&&room.mode!=='hotseat')throw Error('В сетевой партии типы слотов меняются до старта.');
 if(g.phase==='finished')throw Error('Партия уже завершена.');
 if(g.phase!=='lobby'&&data.kind==='closed')throw Error('Во время партии можно только заменять человека ботом и обратно.');
 const p=g.players.find(p=>p.id===slot.playerId),occupant=room.members.find(m=>m.playerId===slot.playerId);
 if(room.mode==='online'&&occupant?.id===room.host&&(data.kind!=='human'||!p))throw Error('Слот создателя сетевого лобби остаётся за человеком.');
 if(slot.kind===data.kind){if(p&&data.name!==undefined)p.name=cleanName(data.name);g.version++;return;}
 if(g.phase!=='lobby'){
  if(!p)throw Error('Игрок не найден.');p.bot=data.kind==='bot';if(data.name!==undefined)p.name=cleanName(data.name);slot.kind=data.kind;
 }else{
  if(occupant&&room.mode==='online'){room.members=room.members.filter(m=>m.id!==occupant.id);}
  if(data.kind==='closed'||(data.kind==='human'&&room.mode==='online')){
   if(p)g.players=g.players.filter(x=>x.id!==p.id);slot.playerId=null;
  }else if(p){p.bot=data.kind==='bot';if(data.name!==undefined)p.name=cleanName(data.name);}
  else{const created=makePlayer(data.name||(data.kind==='bot'?botNames[room.slots.indexOf(slot)%8]:'Игрок '+(room.slots.indexOf(slot)+1)),data.kind==='bot');g.players.push(created);slot.playerId=created.id;}
  slot.kind=data.kind;
 }
 g.version++;
}
export function addBot(room,member){
 if(member.id!==room.host||room.game.phase!=='lobby')throw Error('Добавление бота недоступно.');
 let slot=room.slots.find(s=>s.kind==='human'&&!s.playerId)||room.slots.find(s=>s.kind==='closed');
 if(!slot){if(room.slots.length>=8)throw Error('В лобби уже 8 слотов.');slot={id:sessionToken().slice(0,12),kind:'closed',playerId:null};room.slots.push(slot);}
 changeSlot(room,member,{slotId:slot.id,kind:'bot'});
}
export const actorId=g=>g.pending?.player||g.turn?.controller||g.players[g.current]?.id;
export function viewPlayer(room,member){
 if(room.mode!=='hotseat')return member.playerId;
 const id=actorId(room.game),p=room.game.players.find(p=>p.id===id);return p&&!p.bot?id:null;
}
export function roomState(room,member){
 const state=publicState(room.game,viewPlayer(room,member));
 Object.assign(state,{viewer:member.id,canManage:member.id===room.host,mode:room.mode,readyToStart:room.game.phase==='lobby'&&room.game.players.length>=2&&(!room.requireFull||!room.slots.some(s=>s.kind==='human'&&!s.playerId)),lobby:lobbyInfo(room),slots:room.slots.map(s=>({...s,name:room.game.players.find(p=>p.id===s.playerId)?.name||null}))});
 return state;
}
