import {spawn, execFileSync} from 'node:child_process';
import {openSync, closeSync} from 'node:fs';
import {readFile, writeFile, mkdir, rm, access, realpath} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {services} from './services-config.mjs';

const script=fileURLToPath(import.meta.url);
const base=fileURLToPath(new URL('../',import.meta.url));
const runtime=fileURLToPath(new URL('./.runtime/',import.meta.url));
const stateFile=path.join(runtime,'processes.json');
const lock=path.join(runtime,'control.lock');
const action=process.argv[2];
const alive=pid=>{try{process.kill(pid,0);return true}catch{return false}};
function stamp(pid){try{return execFileSync('/bin/ps',['-p',String(pid),'-o','lstart=','-o','command='],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{return ''}}
function owned(record){return !!record&&record.pid>1&&record.stamp&&stamp(record.pid)===record.stamp&&record.stamp.includes(`${script} serve ${record.id}`)}
async function load(){try{return JSON.parse(await readFile(stateFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}}
async function save(state){await writeFile(stateFile,JSON.stringify(state,null,2)+'\n',{mode:0o600})}
async function healthy(service){try{const res=await fetch(`http://127.0.0.1:${service.port}${service.health||'/'}`,{signal:AbortSignal.timeout(800)});return res.ok}catch{return false}}
async function freePort(service){await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(Error(`Порт ${service.port} занят другим процессом (${service.title}). Освободите его и повторите запуск.`)));probe.listen(service.port,'127.0.0.1',()=>probe.close(resolve))})}
async function terminate(record){
  if(!owned(record))return;
  process.kill(record.pid,'SIGTERM');
  for(let i=0;i<60;i++){if(!owned(record))return;await delay(100)}
  if(owned(record)){process.kill(record.pid,'SIGKILL');for(let i=0;i<20&&owned(record);i++)await delay(100)}
  if(owned(record))throw Error(`Не удалось остановить ${record.id} (PID ${record.pid}).`);
}
async function serve(service){
  process.chdir(path.join(base,service.folder));
  process.env.PORT=String(service.port);process.env.HOST='127.0.0.1';process.env.GAME_HUB_SERVICES='1';
  if(!service.static){await import(pathToFileURL(path.join(base,service.folder,service.entry)));return}
  const root=await realpath(path.join(base,service.folder));
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
  const server=http.createServer(async(req,res)=>{
    try{
      const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const file=await realpath(path.resolve(root,'.'+(name==='/'?'/index.html':name)));
      if(!file.startsWith(root+path.sep)||!types[path.extname(file)])throw Error('missing');
      const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);
    }catch{res.writeHead(404);res.end('Not found')}
  });
  server.listen(service.port,'127.0.0.1',()=>console.log(`${service.title}: http://localhost:${service.port}`));
  const stop=()=>{server.close();server.closeAllConnections()};process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
async function control(){
  const selected=process.argv[3];
  const managed=selected?services.filter(service=>service.id===selected):services;
  if(!managed.length)throw Error(`Неизвестный сервис: ${selected}`);
  await mkdir(runtime,{recursive:true,mode:0o700});
  try{await mkdir(lock)}catch(e){
    if(e.code!=='EEXIST')throw e;
    let pid;try{pid=Number(await readFile(path.join(lock,'pid'),'utf8'))}catch{}
    if(!pid||alive(pid))throw Error('Управление играми уже выполняется. Повторите после завершения предыдущего запуска.');
    await rm(lock,{recursive:true});await mkdir(lock);
  }
  await writeFile(path.join(lock,'pid'),String(process.pid));
  try{
    const state=await load();
    if(action==='stop'){
      let failures=0;
      for(const service of [...managed].reverse()){
        const record=state[service.id];
        try{const running=owned(record);await terminate(record);delete state[service.id];await save(state);console.log(`${running?'Остановлен':'Уже выключен'}: ${service.title}`)}catch(e){failures++;console.error(e.message)}
      }
      if(failures)throw Error('Некоторые сервисы не удалось остановить. Повторите остановку.');
      return;
    }
    const major=Number(process.versions.node.split('.')[0]);if(major<22)throw Error('Для Эволюции нужен Node.js 22 или новее.');
    for(const service of managed){
      await access(path.join(base,service.folder,service.static?'index.html':service.entry));
      if(owned(state[service.id])){if(!await healthy(service))throw Error(`${service.title} запущен, но не отвечает. Сначала остановите сервисы и повторите запуск.`)}
      else await freePort(service);
    }
    const launched=[];
    try{
      for(const service of managed){
        if(owned(state[service.id])){console.log(`Уже работает: ${service.title} — http://localhost:${service.port}`);continue}
        const log=path.join(runtime,service.id+'.log'),fd=openSync(log,'a',0o600);
        let child;
        try{child=spawn(process.execPath,[script,'serve',service.id],{detached:true,stdio:['ignore',fd,fd],cwd:base});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)})}finally{closeSync(fd)}
        child.unref();
        const record={id:service.id,pid:child.pid,stamp:stamp(child.pid)};
        if(!record.stamp)throw Error(`${service.title}: процесс не запустился. Журнал: ${log}`);
        state[service.id]=record;launched.push(record);await save(state);
        let ready=false;
        for(let i=0;i<40;i++){if(!owned(record))break;if(await healthy(service)){ready=true;break}await delay(150)}
        if(!ready)throw Error(`${service.title}: не удалось дождаться запуска. Журнал: ${log}`);
        console.log(`Запущен: ${service.title} — http://localhost:${service.port}`);
      }
      console.log(`\n${selected?'Сервис готов.':'Хаб готов: http://localhost:8080'}\nЖурналы: ${runtime}`);
    }catch(e){
      for(const record of launched.reverse()){await terminate(record);delete state[record.id];await save(state)}
      throw e;
    }
  }finally{await rm(lock,{recursive:true,force:true})}
}
try{
  if(action==='serve'){
    const service=services.find(s=>s.id===process.argv[3]);if(!service)throw Error('Неизвестный сервис.');await serve(service);
  }else if(['start','stop'].includes(action))await control();
  else throw Error('Использование: node services.mjs start|stop [сервис]');
}catch(e){console.error(e.message);process.exitCode=1}
