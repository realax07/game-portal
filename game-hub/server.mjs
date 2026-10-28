import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, realpath } from 'node:fs/promises';
import { services } from './services-config.mjs';

const base = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const games = [
  { id:'evolution', title:'Эволюция', category:'Настольные', subtitle:'Создавайте виды. Приспосабливайтесь. Выживайте.', description:'Эволюция: Происхождение видов. Комнаты для 2–8 игроков, боты, свойства животных и дополнения. Evolution.', folder:'evolution/public', preview:'evolution/research/preview.png', tags:['2–8 игроков','С ботами'], controls:'Создайте комнату или войдите по коду. Выбирайте карты и животных мышью. Комнаты и прогресс сохраняет сервер.', backend:true },
  { id:'munchkin', title:'Манчкин', category:'Карточные', subtitle:'Убей монстра. Забери сокровища. Подставь друга.', description:'Подземная таверна: фэнтезийный Манчкин для 1–5 игроков, с ботами или за одним экраном. Монстры, сокровища и снаряжение. Munchkin Manchkin.', folder:'Manchkin/public', preview:'Manchkin/preview.png', tags:['1–5 игроков','Фэнтези'], controls:'Мышь — карты и действия · Выберите игроков и наборы в лобби. Правила — по кнопке «Как играть». Партия сохраняется автоматически.', backend:true },
  { id:'vice', title:'Vice Drive', category:'Экшен', subtitle:'Неоновый город. Полный бак. Никаких планов.', description:'Прибрежный город, погони и свобода за рулём. Прокатитесь навстречу закату.', folder:'GTA/dist', preview:'GTA/preview.png', tags:['3D','Открытый мир'], controls:'WASD / стрелки — движение · Shift — нитро · Пробел — ручник · E — выйти / сесть · Esc — пауза' },
  { id:'poker', title:'Velvet Poker', category:'Карточные', subtitle:'Ваше место за зелёным сукном.', description:'Техасский холдем с четырьмя соперниками и пошаговым обучением. Игра на виртуальные фишки.', folder:'Poker/velvet-poker/dist', preview:'Poker/velvet-poker-preview.png', tags:['Холдем','Обучение'], controls:'Мышь — действия · F — пас · C — чек / колл · R — рейз' },
  { id:'tanks', title:'Танки vs динозавры', category:'Аркады', subtitle:'Броня против юрского периода.', description:'Защитите штаб от динозавров. Разрушайте преграды, собирайте бонусы и побейте свой рекорд.', folder:'Tanks/tanki/dist', preview:'Tanks/tanki/preview.png', tags:['Аркада','Рекорды'], controls:'WASD / стрелки — движение · Пробел — огонь · Enter — старт · P / Esc — пауза' },
  { id:'durak', title:'Дурак', category:'Карточные', subtitle:'Старая добрая партия. Только вы и карты.', description:'Подкидной дурак на 36 карт против компьютера. Берегите козыри и оставьте соперника с картами.', folder:'Durak', preview:'Durak/preview.png', tags:['36 карт','Против компьютера'], controls:'Нажимайте на подсвеченные карты. Правила доступны по кнопке «Как играть».' }
];
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname);
    if(pathname==='/api/games'){
      const data=await Promise.all(games.map(async({folder,preview,backend,...game})=>{
        const service=services.find(s=>s.id===game.id);
        const separate=process.env.GAME_HUB_SERVICES==='1'||backend;
        let available=await readFile(path.join(base,folder,'index.html')).then(()=>true,()=>false);
        if(separate&&available){try{available=(await fetch(`http://127.0.0.1:${service.port}${service.health||'/'}`,{signal:AbortSignal.timeout(800)})).ok}catch{available=false}}
        return {...game,url:separate?`http://localhost:${service.port}/`:`/games/${game.id}/`,image:`/previews/${game.id}.png`,available};
      }));
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify(data));
    }
    let root=publicRoot, relative=pathname==='/'?'index.html':pathname.slice(1);
    const match=pathname.match(/^\/games\/([^/]+)(\/.*)?$/);
    if(match){
      const game=games.find(g=>g.id===match[1]);
      if(!game)throw Error('missing');
      if(game.backend){res.writeHead(302,{Location:`http://localhost:${services.find(s=>s.id===game.id).port}/`});return res.end();}
      if(!match[2]){res.writeHead(302,{Location:`/games/${game.id}/`});return res.end();}
      root=path.join(base,game.folder);relative=match[2]==='/'?'index.html':match[2].slice(1);
    } else if(pathname.startsWith('/previews/')){
      const game=games.find(g=>pathname===`/previews/${g.id}.png`);
      if(!game)throw Error('missing');
      root=path.dirname(path.join(base,game.preview));relative=path.basename(game.preview);
    }
    const file=await realpath(path.resolve(root,relative));
    const resolvedRoot=await realpath(root);
    if(!file.startsWith(resolvedRoot+path.sep)||!types[path.extname(file)])throw Error('missing');
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(content);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Не найдено');}
});
server.on('error',e=>{console.error(e.message);process.exit(1)});
server.listen(Number(process.env.PORT||8080),'127.0.0.1',()=>console.log(`Game Hub: http://localhost:${process.env.PORT||8080}`));
