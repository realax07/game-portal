import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dataDir=await mkdtemp(path.join(tmpdir(),'evolution-lobbies-'));
let child,base;
async function start(){
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:'0',DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});
 base=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Server start timed out: '+text)),5000);child.stdout.on('data',chunk=>{text+=chunk;const m=text.match(/http:\/\/localhost:(\d+)/);if(m){clearTimeout(timer);resolve('http://127.0.0.1:'+m[1]);}});child.stderr.on('data',chunk=>text+=chunk);child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+': '+text));});});
}
async function stop(){if(child&&child.exitCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await ended;}}
async function req(route,credential,body){const res=await fetch(base+'/api/'+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:res.status,data:await res.json()};}
async function ok(route,c,body){const r=await req(route,c,body);assert.ok(r.status<300,route+': '+r.data.error);return r.data;}
try{
 await start();
 const open=await ok('rooms',null,{name:'Хозяин',title:'Открытый тест',slots:[{kind:'human'},{kind:'human'},{kind:'closed'}]});
 const secret=await ok('rooms',null,{name:'Хозяин',title:'Закрытый тест',visibility:'private',login:'friends-test',password:'private-pass'});
 const listed=await ok('rooms');assert.deepEqual(listed.rooms.map(r=>r.code),[open.code]);assert.equal((await ok('rooms?search=Открытый')).rooms.length,1);
 const looked=await ok('rooms/lookup?id=friends-test');assert.equal(looked.code,secret.code);assert.ok(looked.requiresPassword);assert.ok(!JSON.stringify(looked).includes('hash'));
 assert.equal((await req('rooms/'+secret.code+'/join',null,{name:'Гость',password:'wrong'})).status,400);
 const guest=await ok('rooms/'+secret.code+'/join',null,{name:'Гость',password:'private-pass'});
 const secretState=await ok('rooms/'+secret.code,secret);assert.ok(!JSON.stringify(secretState).includes('private-pass'));
 assert.equal((await req('rooms/'+secret.code+'/slot',guest,{slotId:secretState.slots[0].id,kind:'bot'})).status,400);
 const random=await ok('rooms/random',null,{name:'Случайный'});assert.equal(random.code,open.code);
 assert.equal((await req('rooms/random',null,{name:'Лишний'})).status,400);
 const openState=await ok('rooms/'+open.code,open);
 // Revoked human sessions must stop receiving private hands when replaced by a bot.
 const abort=new AbortController();const events=await fetch(base+'/api/rooms/'+open.code+'/events?token='+random.token,{signal:abort.signal});const reader=events.body.getReader();await reader.read();
 await ok('rooms/'+open.code+'/slot',open,{slotId:openState.slots[1].id,kind:'bot'});
 const revoked=new TextDecoder().decode((await reader.read()).value);assert.ok(revoked.includes('event: revoked'));await reader.cancel();abort.abort();
 assert.equal((await req('rooms/'+open.code,random)).status,401);
 const table=await ok('rooms',null,{name:'Первый',mode:'hotseat',slots:[{kind:'human'},{kind:'human',name:'Второй'}]});
 await ok('rooms/'+table.code+'/start',table,{});let state=await ok('rooms/'+table.code,table);
 const current=state.me,seat=state.slots.find(s=>s.playerId===current),before=state.players.find(p=>p.id===current);
 assert.equal(before.hand.length,6);assert.ok(state.players.filter(p=>p.id!==current).every(p=>!p.hand.length));
 state=await ok('rooms/'+table.code+'/slot',table,{slotId:seat.id,kind:'bot'});assert.equal(state.me,null);assert.ok(state.players.every(p=>!p.hand.length));
 const version=state.version;const deadline=Date.now()+4000;
 do{await new Promise(resolve=>setTimeout(resolve,100));state=await ok('rooms/'+table.code,table);}while(state.version===version&&Date.now()<deadline);
 assert.ok(state.version>version,'The replacement bot must actually perform a move');
 const botAfter=state.players.find(p=>p.id===current);const counts={hand:botAfter.handCount,animals:botAfter.animals.length};
 state=await ok('rooms/'+table.code+'/slot',table,{slotId:seat.id,kind:'human'});const humanAfter=state.players.find(p=>p.id===current);
 assert.equal(humanAfter.bot,false);assert.equal(humanAfter.handCount,counts.hand);assert.equal(humanAfter.animals.length,counts.animals);assert.ok(state.canManage);
 assert.equal((await req('rooms/'+table.code+'/join',null,{name:'Не местный'})).status,400);
 await stop();await start();
 const restored=await ok('rooms/'+table.code,table);assert.equal(restored.slots.find(s=>s.id===seat.id).kind,'human');assert.ok(restored.canManage);
 assert.equal((await req('rooms/'+secret.code+'/join',null,{name:'Без пароля'})).status,400);
 const disk=await readFile(path.join(dataDir,'rooms.json'),'utf8');assert.ok(!disk.includes('private-pass'));
 console.log('Lobby HTTP passed: discovery, ID/login + password, random join, host permissions, SSE revocation, live human ↔ bot takeover, hotseat hand isolation and restart persistence.');
}finally{await stop();await rm(dataDir,{recursive:true,force:true});}
