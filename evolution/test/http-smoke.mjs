import assert from 'node:assert/strict';
const base='http://127.0.0.1:'+(process.env.PORT||3000);
async function req(route,key,body){const res=await fetch(base+'/api/'+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:res.status,body:await res.json()};}
const created=await req('rooms',null,{name:'Проверка HTTP A',options:{packs:[],shortDeck:true}});assert.equal(created.status,201);
const {code,token}=created.body;
const joined=await req(`rooms/${code}/join`,null,{name:'Проверка HTTP Б'});assert.equal(joined.status,200);const guest=joined.body.token;
assert.equal((await req(`rooms/${code}`)).status,401);
assert.equal((await req(`rooms/${code}/start`,guest,{})).status,400);
assert.equal((await req(`rooms/${code}/start`,token,{})).status,200);
let stateA=(await req(`rooms/${code}`,token)).body,stateB=(await req(`rooms/${code}`,guest)).body;
assert.equal(stateA.players.find(p=>p.id===stateA.me).hand.length,6);
assert.equal(stateA.players.find(p=>p.id!==stateA.me).hand.length,0);
assert.ok(!('deck' in stateA));
const active=stateA.actions.length?{key:token,state:stateA}:{key:guest,state:stateB};
const first=active.state.actions.findIndex(a=>a.type==='animal');assert.ok(first>=0);
assert.equal((await req(`rooms/${code}/action`,active.key,{index:first,version:active.state.version})).status,200);
assert.equal((await req(`rooms/${code}/action`,active.key,{index:first,version:active.state.version})).status,409);
assert.equal((await fetch(base+'/.data/rooms.json')).status,404);
let steps=0,finished=false;
while(steps<1000){
 const states=await Promise.all([req(`rooms/${code}`,token),req(`rooms/${code}`,guest)]);const data=states.map(x=>x.body);
 if(data[0].phase==='finished'){finished=true;break;}
 const ix=data.findIndex(s=>s.actions.length);assert.ok(ix>=0,'At least one participant must have actions');const s=data[ix];
 let index=s.actions.findIndex(a=>a.type==='animal'&&s.players.find(p=>p.id===s.me).animals.length<2);
 if(index<0)index=s.actions.findIndex(a=>['feed','fat','resources','extinction','effect','defend','mutation'].includes(a.type));
 if(index<0)index=s.actions.findIndex(a=>['end','pass'].includes(a.type));if(index<0)index=0;
 const result=await req(`rooms/${code}/action`,ix===0?token:guest,{index,version:s.version});assert.equal(result.status,200,result.body.error);steps++;
}
assert.ok(finished,'HTTP game should reach results');
const controller=new AbortController(),sse=await fetch(`${base}/api/rooms/${code}/events?token=${token}`,{signal:controller.signal});assert.equal(sse.status,200);const reader=sse.body.getReader();const event=await reader.read();assert.ok(new TextDecoder().decode(event.value).startsWith('data: '));await reader.cancel();controller.abort();
console.log(`HTTP integration passed: 2 independent players, authorization, hidden hands, stale actions, file isolation, SSE, full game (${steps} transitions).`);
