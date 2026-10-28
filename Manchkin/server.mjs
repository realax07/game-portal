import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {createLobbyHandler} from './server/lobbies.mjs';
const root=resolve('public');
const port=Number(process.env.PORT||4387),host=process.env.HOST||'127.0.0.1';
const lobbyHandler=createLobbyHandler();
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(await lobbyHandler(req,res,url))return;try{const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+sep)){res.writeHead(403).end();return}const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data)}catch{res.writeHead(404).end('Not found')}}).listen(port,host,()=>console.log(`Подземная таверна → http://${host==='127.0.0.1'?'localhost':host}:${port}`));
