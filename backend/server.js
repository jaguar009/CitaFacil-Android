import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './src/api.mjs';
import { openDatabase } from './src/local-db.mjs';
import { seed } from './src/seed.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(root, 'data'), {recursive:true});
const db = openDatabase(process.env.DB_FILE || path.join(root,'data','citafacil-v2.db'));
await seed(db, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const files = {'/':'index.html','/admin.html':'admin.html','/app.css':'app.css','/admin.js':'admin.js'};
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const port = Number(process.env.PORT || 3000);
createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost:'+port);
    let response;
    if(url.pathname.startsWith('/api/')) {
      const init={method:req.method,headers:req.headers};
      if(!['GET','HEAD'].includes(req.method)) {init.body=Readable.toWeb(req); init.duplex='half';}
      response=await handleApi(new Request(url,init),{DB:db});
    } else {
      const file=files[url.pathname];
      response=file && existsSync(path.join(root,'public',file))
        ? new Response(readFileSync(path.join(root,'public',file)),{headers:{'Content-Type':types[path.extname(file)]}})
        : new Response('No encontrado',{status:404});
    }
    response.headers.set('X-Content-Type-Options','nosniff');
    response.headers.set('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'");
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error) { console.error(error.message); res.writeHead(500); res.end('Error interno'); }
}).listen(port, '127.0.0.1', () => console.log('CitaFácil local: http://localhost:'+port));
