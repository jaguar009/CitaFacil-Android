import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomToken, passwordHash } from '../src/security.mjs';
const privateDir=new URL('../../private/',import.meta.url);
mkdirSync(privateDir,{recursive:true});
const file=new URL('access.json',privateDir);
const access=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{
 admin:{email:'admin@citafacil.local',password:'Cf!'+randomToken().slice(0,21)},
 patient:{email:'demo@citafacil.local',password:'Cf!'+randomToken().slice(0,21)}
};
writeFileSync(file,JSON.stringify(access,null,2));
writeFileSync(new URL('ACCESOS.txt',privateDir),
 'CitaFácil - accesos privados\nNo incluir este archivo en el informe ni en el código compartido.\n\n'+
 'Portal: https://citafacil.jaguar009.workers.dev/admin.html\n'+
 'Administrador: '+access.admin.email+'\nContraseña: '+access.admin.password+'\n\n'+
 'Paciente de demostración: '+access.patient.email+'\nContraseña: '+access.patient.password+'\n');
const schema=readFileSync(new URL('../migrations/0001_citafacil.sql',import.meta.url),'utf8');
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
let sql=schema+'\n';
for(const [key,user] of Object.entries(access)) {
 const salt=randomToken(),hash=await passwordHash(user.password,salt);
 sql+='INSERT OR IGNORE INTO users(name,email,password_hash,salt,role_id) VALUES('+[key==='admin'?'Administrador CitaFácil':'Paciente Demo',user.email,hash,salt,key==='admin'?2:1].map(quote).join(',')+');\n';
}
sql+="INSERT OR IGNORE INTO services(id,name,description) VALUES(1,'Medicina general','Consulta general'),(2,'Odontología','Atención dental'),(3,'Psicología','Consulta de orientación');\n";
sql+="INSERT OR IGNORE INTO professionals(id,name,service_id) VALUES(1,'Dra. Ana Torres',1),(2,'Dr. Luis Ramírez',2),(3,'Lic. Carla Mendoza',3);\n";
for(let day=1;day<=10;day++) {
 const date=new Date(Date.now()+day*86400000).toISOString().slice(0,10);
 for(let id=1;id<=3;id++)for(const time of ['09:00','10:30','15:00'])
 sql+='INSERT OR IGNORE INTO schedules(professional_id,date_label,time_label) VALUES('+id+','+quote(date)+','+quote(time)+');\n';
}
writeFileSync(new URL('bootstrap.sql',privateDir),sql);
console.log('Accesos privados y SQL de instalación preparados.');
