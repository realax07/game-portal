import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const clean=(s,n=40)=>String(s??'').trim().slice(0,n);
const token=()=>randomBytes(24).toString('hex');
const passwordHash=(password,salt)=>scryptSync(password,salt,32);
export class LobbyStore{
 constructor({now=()=>Date.now()}={}){this.rooms=new Map();this.now=now}
 prune(){for(const [id,r] of this.rooms)if(this.now()-r.touched>6*60*60*1000)this.rooms.delete(id)}
 get(id){this.prune();return this.rooms.get(String(id).toUpperCase())||fail(404,'Лобби не найдено или уже закрыто.')}
 member(r,key){const m=r.members.get(key);if(!m)fail(401,'Нужно снова войти в лобби.');m.seen=this.now();r.touched=this.now();return m}
 host(r,key){const m=this.member(r,key);if(!m.host)fail(403,'Только создатель может менять лобби.');return m}
 slots(input){if(!Array.isArray(input)||input.length<1||input.length>5||input[0]!=='human'||input.some(t=>!['human','bot','closed'].includes(t)))fail(400,'Нужно от 1 до 5 мест; первое место — создатель.');return [...input]}
 public(r){return{id:r.id,name:r.name,visibility:r.visibility,phase:r.phase,version:r.version,hostOnline:[...r.members.values()].some(m=>m.host&&this.now()-m.seen<15000),slots:r.slots.map((type,i)=>{const m=[...r.members.values()].find(m=>m.seat===i);return{index:i,type,name:m?.name||(type==='bot'?`Бот ${i+1}`:null),occupied:!!m,online:!!m&&this.now()-m.seen<15000,host:!!m?.host}}),created:r.created}}
 snapshot(r,m){return{room:this.public(r),you:{seat:m.seat,host:m.host,name:m.name},view:r.views?.[m.seat]||null}}
 create(body){this.prune();if(this.rooms.size>=100)fail(429,'Слишком много лобби на сервере.');const name=clean(body.name)||'Подземная таверна',login=name.toLowerCase();if([...this.rooms.values()].some(r=>r.login===login))fail(409,'Такое название / логин уже занято.');const visibility=body.visibility==='private'?'private':'public',password=String(body.password||'');if(visibility==='private'&&(password.length<4||password.length>128))fail(400,'Для закрытого лобби нужен пароль от 4 до 128 символов.');const slots=this.slots(body.slots);let id;do{id=randomBytes(4).toString('hex').slice(0,6).toUpperCase()}while(this.rooms.has(id));const key=token(),salt=randomBytes(16);const r={id,name,login,visibility,salt,password:visibility==='private'?passwordHash(password,salt):null,slots,members:new Map(),phase:'waiting',version:1,created:this.now(),touched:this.now(),views:null,commands:[],processed:new Set()};const m={seat:0,host:true,name:clean(body.playerName,22)||'Создатель',seen:this.now()};r.members.set(key,m);this.rooms.set(id,r);return{token:key,...this.snapshot(r,m)}}
 list(){this.prune();return[...this.rooms.values()].filter(r=>r.visibility==='public'&&r.phase==='waiting'&&r.slots.some((t,i)=>t==='human'&&![...r.members.values()].some(m=>m.seat===i))).map(r=>this.public(r))}
 join(body){let r;if(body.random){const rooms=this.list();if(!rooms.length)fail(404,'Свободных открытых лобби пока нет.');r=this.get(rooms[Math.floor(Math.random()*rooms.length)].id)}else{const id=clean(body.id||body.login).toUpperCase();r=this.rooms.get(id)||[...this.rooms.values()].find(r=>r.login===clean(body.id||body.login).toLowerCase());if(!r)fail(404,'Лобби не найдено.')}if(r.phase!=='waiting')fail(409,'Партия уже началась.');if(r.password){const input=String(body.password||'');if(input.length>128||!timingSafeEqual(passwordHash(input,r.salt),r.password))fail(403,'Неверный пароль.')}const seat=r.slots.findIndex((t,i)=>t==='human'&&![...r.members.values()].some(m=>m.seat===i));if(seat<0)fail(409,'Свободных мест для людей нет.');const key=token(),m={seat,host:false,name:clean(body.playerName,22)||`Игрок ${seat+1}`,seen:this.now()};r.members.set(key,m);r.version++;return{token:key,...this.snapshot(r,m)}}
 read(id,key){const r=this.get(id),m=this.member(r,key);return this.snapshot(r,m)}
 configure(id,key,body){const r=this.get(id);this.host(r,key);if(r.phase!=='waiting')fail(409,'Партия уже началась.');const slots=this.slots(body.slots);for(const m of r.members.values())if(slots[m.seat]!=='human')fail(409,'Сначала освободите занятое место игрока.');r.slots=slots;r.version++;return this.snapshot(r,r.members.get(key))}
 start(id,key){const r=this.get(id),m=this.host(r,key);if(r.phase!=='waiting')fail(409,'Партия уже началась.');if(r.slots.some((t,i)=>t==='human'&&![...r.members.values()].some(m=>m.seat===i)))fail(409,'Не все места для людей заняты. Замените свободные места ботами или закройте.');r.phase='playing';r.version++;return this.snapshot(r,m)}
 control(id,key,body){const r=this.get(id),m=this.host(r,key),seat=Number(body.seat);if(r.phase!=='playing'||!Number.isInteger(seat)||seat<=0||seat>=r.slots.length||r.slots[seat]==='closed'||!['human','bot'].includes(body.type))fail(400,'Это место сейчас нельзя изменить.');if(body.type==='human'&&![...r.members.values()].some(m=>m.seat===seat))fail(409,'Для этого места нет подключённого игрока.');r.slots[seat]=body.type;r.version++;return this.snapshot(r,m)}
 publish(id,key,body){const r=this.get(id);this.host(r,key);if(r.phase!=='playing')fail(409,'Партия ещё не началась.');if(!body.views||typeof body.views!=='object')fail(400,'Нет состояния стола.');const views={};for(const m of r.members.values()){const v=body.views[m.seat];if(!v||typeof v.html!=='string'||typeof v.modal!=='string'||!Array.isArray(v.commands)||v.commands.some(c=>typeof c!=='string'))fail(400,'Неполное состояние стола.');views[m.seat]={html:v.html,modal:v.modal,commands:v.commands,waiting:typeof v.waiting==='string'?v.waiting.slice(0,80):'',inspections:v.inspections||{}}}r.views=views;for(const id of body.ack||[]){r.processed.add(id);r.commands=r.commands.filter(c=>c.id!==id)}if(r.processed.size>1000)r.processed=new Set([...r.processed].slice(-500));r.version++;return{version:r.version}}
 command(id,key,body){const r=this.get(id),m=this.member(r,key);if(r.phase!=='playing'||r.slots[m.seat]!=='human')fail(403,'Это место сейчас управляется ботом.');const view=r.views?.[m.seat];if(!view?.commands.includes(body.command))fail(409,'Стол изменился. Дождитесь обновления и повторите действие.');if(!/^[\w-]{8,80}$/.test(String(body.id||'')))fail(400,'Некорректное действие.');if(r.processed.has(body.id)||r.commands.some(c=>c.id===body.id))return{queued:true};if(r.commands.length>=100)fail(429,'Дождитесь обработки предыдущего действия.');if(!Array.isArray(body.fields)||body.fields.length>100||body.fields.some(f=>!view.commands.includes(f.id)||typeof f.value!=='string'||f.value.length>300||typeof f.checked!=='boolean'))fail(400,'Некорректные поля действия.');r.commands.push({id:body.id,seat:m.seat,command:body.command,fields:body.fields});return{queued:true}}
 pending(id,key){const r=this.get(id);this.host(r,key);return{commands:r.commands}}
 leave(id,key){const r=this.get(id),m=this.member(r,key);if(m.host){this.rooms.delete(r.id);return{closed:true}}r.members.delete(key);if(r.phase==='playing')r.slots[m.seat]='bot';r.version++;return{left:true}}
}
export function createLobbyHandler(store=new LobbyStore()){
 return async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/lobbies'))return false;
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
  try{
   const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)fail(403,'Запрос должен идти с сервера игры.');
   let body={};if(req.method==='POST'){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2500000)fail(413,'Слишком большой запрос.');chunks.push(chunk)}try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{fail(400,'Некорректный JSON.')}}
   const parts=url.pathname.split('/').filter(Boolean),id=parts[2],action=parts[3],key=req.headers.authorization?.replace(/^Bearer /,'');let result;
   if(!id&&req.method==='GET')result={lobbies:store.list()};
   else if(!id&&req.method==='POST')result=store.create(body);
   else if(id==='join'&&req.method==='POST')result=store.join(body);
   else if(!action&&req.method==='GET')result=store.read(id,key);
   else if(action==='commands'&&req.method==='GET')result=store.pending(id,key);
   else if(req.method==='POST'&&['configure','start','control','publish','command','leave'].includes(action))result=store[action](id,key,body);
   else fail(404,'Неизвестный запрос лобби.');reply(200,result);
  }catch(e){reply(e.status||500,{error:e.status?e.message:'Ошибка сервера лобби.'})}return true;
 };
}
