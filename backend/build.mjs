import { readFileSync, writeFileSync } from 'node:fs';
const files = {'/':'index.html','/admin.html':'admin.html','/app.css':'app.css','/admin.js':'admin.js'};
const types = {html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
const assets = {};
for (const [route,file] of Object.entries(files)) assets[route]={body:readFileSync(new URL('./public/'+file,import.meta.url),'utf8'),type:types[file.split('.').pop()]};
writeFileSync(new URL('./src/assets.mjs',import.meta.url),'// Generado por node build.mjs\nexport const assets = '+JSON.stringify(assets)+';\n');
console.log('Portal preparado para Cloudflare.');
