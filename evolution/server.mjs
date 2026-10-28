import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {migrateRoom,createRoom,findRoom,listLobbies,lobbyInfo,joinRoom,randomLobby,startRoom,changeSlot,addBot,roomState,viewPlayer,actorId} from './lobby.mjs';
import {act,legalActions,botAction} from './engine.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const rooms=new Map(),streams=new Map();let saving=Promise.resolve();
const dataDir=process.env.DATA_DIR||path.join(root,'.data');
await mkdir(dataDir,{recursive:true});
try{for(const room of JSON.parse(await readFile(path.join(dataDir,'rooms.json'),'utf8')))rooms.set(room.code,migrateRoom(room));}catch(e){if(e.code!=='ENOENT')console.error('Could not restore rooms:',e.message);}
function persist(){const data=JSON.stringify([...rooms.values()]);saving=saving.then(async()=>{await writeFile(path.join(dataDir,'rooms.tmp'),data);await rename(path.join(dataDir,'rooms.tmp'),path.join(dataDir,'rooms.json'));}).catch(e=>console.error('Save failed:',e.message));}
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function findMember(room,req){const key=req.headers.authorization?.replace('Bearer ','')||new URL(req.url,'http://localhost').searchParams.get('token');return room.members.find(m=>m.token===key);}
function broadcast(room){
 for(const s of streams.get(room.code)||[]){try{
  const member=room.members.find(m=>m.id===s.member);
  if(!member){s.res.write('event: revoked\ndata: '+JSON.stringify({error:'Ваш слот заменён или закрыт создателем лобби.'})+'\n\n');s.res.end();}
  else s.res.write('data: '+JSON.stringify(roomState(room,member))+'\n\n');
 }catch{}}
 persist();
}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>2e6)throw Error('Слишком большой запрос.');}return text?JSON.parse(text):{};}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'Недопустимый источник запроса.'});
  if(url.pathname==='/api/health')return send(res,200,{ok:true,rooms:rooms.size});
  if(url.pathname==='/api/rooms'&&req.method==='GET')return send(res,200,{rooms:listLobbies(rooms,url.searchParams.get('search')||'')});
  if(url.pathname==='/api/rooms/lookup'&&req.method==='GET'){
   const room=findRoom(rooms,url.searchParams.get('id'));if(!room)return send(res,404,{error:'Лобби не найдено. Проверьте ID или логин.'});
   return send(res,200,lobbyInfo(room));
  }
  if(url.pathname==='/api/rooms/random'&&req.method==='POST'){
   const result=randomLobby(rooms,await body(req));broadcast(result.room);return send(res,200,result.credential);
  }
  if(url.pathname==='/api/rooms'&&req.method==='POST'){
   if(rooms.size>=100)return send(res,429,{error:'Достигнут лимит локальных комнат.'});
   const result=createRoom(rooms,await body(req));persist();return send(res,201,result.credential);
  }
  const match=url.pathname.match(/^\/api\/rooms\/([^/]+)(?:\/(\w+))?$/);
  if(match){
   const room=findRoom(rooms,decodeURIComponent(match[1]));if(!room)return send(res,404,{error:'Комната не найдена. Проверьте ID или логин.'});const op=match[2];
   if(op==='join'&&req.method==='POST'){
    const credential=joinRoom(room,await body(req));broadcast(room);return send(res,200,credential);
   }
   const member=findMember(room,req);if(!member)return send(res,401,{error:'Нужно присоединиться к комнате.'});
   if(op==='events'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write('data: '+JSON.stringify(roomState(room,member))+'\n\n');
    const entry={res,member:member.id};if(!streams.has(room.code))streams.set(room.code,new Set());streams.get(room.code).add(entry);
    const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),20000);req.on('close',()=>{clearInterval(heartbeat);streams.get(room.code)?.delete(entry);});return;
   }
   if(!op&&req.method==='GET')return send(res,200,roomState(room,member));
   if(req.method!=='POST')return send(res,405,{error:'Метод не поддерживается.'});
   const data=await body(req);
   if(!room.members.some(m=>m.id===member.id&&m.token===member.token))return send(res,401,{error:'Ваш слот больше недоступен.'});
   if(op==='start'){
    if(member.id!==room.host)throw Error('Начать партию может создатель комнаты.');startRoom(room);
   }else if(op==='bot')addBot(room,member);
   else if(op==='slot')changeSlot(room,member,data);
   else if(op==='action'){
    const g=room.game,id=viewPlayer(room,member),actor=g.players.find(p=>p.id===id);
    if(!actor||actor.bot)throw Error('Сейчас ожидается ход другого участника.');
    if(data.version!==g.version)return send(res,409,{error:'Другой игрок уже сделал ход. Состояние обновлено.',state:roomState(room,member)});
    const action=legalActions(g,id)[data.index];if(!action)throw Error('Действие недоступно.');
    const before=structuredClone(g);try{act(g,id,action);}catch(e){room.game=before;throw e;}
   }else if(op==='leave'){
    const g=room.game;if(g.phase!=='lobby')throw Error('В активной партии место сохраняется для переподключения.');
    const slot=room.slots.find(s=>s.playerId===member.playerId);if(slot)slot.playerId=null;
    g.players=g.players.filter(p=>p.id!==member.playerId);room.members=room.members.filter(m=>m.id!==member.id);
    if(member.id===room.host){room.host=room.members[0]?.id;g.host=room.host;}g.version++;
    if(!room.members.length)rooms.delete(room.code);broadcast(room);return send(res,200,{ok:true});
   }else throw Error('Неизвестное действие.');
   broadcast(room);return send(res,200,roomState(room,member));
  }
  if(url.pathname==='/api/plan'){const text=await readFile(path.join(root,'PLAN.md'),'utf8');res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end(text);}
  let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';
  const file=path.resolve(root,'public','.'+pathname);if(!file.startsWith(path.join(root,'public')+path.sep))return send(res,403,{error:'Нет доступа.'});
  try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);}catch{return send(res,404,{error:'Файл не найден.'});}
 }catch(e){send(res,400,{error:e.message||'Не удалось выполнить действие.'});}
});
let ticking=false;
const botTimer=setInterval(()=>{
 if(ticking)return;ticking=true;
 try{for(const room of rooms.values()){
  const g=room.game;if(['lobby','finished'].includes(g.phase))continue;
  const id=actorId(g),p=g.players.find(p=>p.id===id);if(!p?.bot)continue;
  const action=botAction(g,id);if(action){const before=structuredClone(g);try{act(g,id,action);broadcast(room);}catch(e){room.game=before;console.error('Bot transition:',e.message);}}
 }}finally{ticking=false;}
},850);
server.listen(port,host,()=>console.log(`Эволюция · http://localhost:${server.address().port}\nServer bound to ${host}:${server.address().port}. Ctrl+C to stop.`));
function stop(){clearInterval(botTimer);for(const set of streams.values())for(const s of set)s.res.end();server.close();saving.finally(()=>process.exit(0));}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
