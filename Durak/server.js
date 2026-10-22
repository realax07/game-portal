import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer(async (req,res) => {
  try {
    const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root) || !['.html','.css','.js'].includes(path.extname(file))) { res.writeHead(404); return res.end(); }
    const content = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store'});
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(3000,'127.0.0.1',()=>console.log('Дурак — http://localhost:3000'));
