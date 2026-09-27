import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/local-db.mjs';
import { seed } from '../src/seed.mjs';
import { handleApi } from '../src/api.mjs';

async function fixture() {
  const DB=openDatabase(':memory:');
  await seed(DB,'admin@example.com','Admin-Prueba-2026!');
  const call=async(path,method='GET',data,token,headers={})=>{
    const response=await handleApi(new Request('https://test.local/api/'+path,{method,
      headers:{...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},
      body:data?JSON.stringify(data):undefined}),{DB});
    return {status:response.status,body:await response.json(),headers:response.headers};
  };
  const register=async(email)=> (await call('auth/register','POST',{name:'Paciente prueba',email,password:'Paciente-Prueba-2026!',role_id:2})).body;
  const admin=(await call('auth/login','POST',{email:'admin@example.com',password:'Admin-Prueba-2026!'})).body;
  return {DB,call,register,admin};
}
test('autenticación, aislamiento de usuarios y revocación',async()=>{
  const {DB,call,register,admin}=await fixture();
  try {
    assert.equal((await call('appointments')).status,401);
    const alice=await register('alice@example.com'),bob=await register('bob@example.com');
    assert.equal(alice.user.kind,'PACIENTE');
    assert.equal((await call('admin/users','GET',null,alice.token)).status,403);
    assert.equal((await call('auth/login','POST',{email:'alice@example.com',password:'Contraseña-incorrecta'})).status,401);
    const created=await call('appointments','POST',{client_id:'alice-reserva-1',schedule_id:1,patient_name:'Alice'},alice.token);
    assert.equal(created.status,201);
    assert.equal((await call('appointments','GET',null,bob.token)).body.length,0);
    assert.equal((await call('appointments/'+created.body.id+'/cancel','POST',{},bob.token)).status,404);
    assert.equal((await call('admin/users','GET',null,admin.token)).body.length,3);
    assert.equal((await call('auth/logout','POST',{},alice.token)).status,200);
    assert.equal((await call('auth/me','GET',null,alice.token)).status,401);
  } finally{DB.sqlite.close();}
});
test('reintentos idempotentes, conflicto de horario y cancelación remota',async()=>{
  const {DB,call,register}=await fixture();
  try {
    const a=await register('a@example.com'),b=await register('b@example.com');
    const data={client_id:'reserva-unica-123',schedule_id:1,patient_name:'Paciente Uno'};
    const results=await Promise.all([call('appointments','POST',data,a.token),
      call('appointments','POST',{...data,client_id:'otro-cliente'},b.token)]);
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
    const winner=results[0].status===201?a:b;
    const winningData=winner===a?data:{...data,client_id:'otro-cliente'};
    const firstResult=results.find(r=>r.status===201);
    const repeat=await call('appointments','POST',winningData,winner.token);
    assert.equal(repeat.body.id,firstResult.body.id);
    assert.equal((await call('appointments','GET',null,winner.token)).body.length,1);
    assert.equal((await call('appointments/'+repeat.body.id+'/cancel','POST',{},winner.token)).body.status,'CANCELADA');
    assert.equal((await call('appointments/'+repeat.body.id+'/cancel','POST',{},winner.token)).body.status,'CANCELADA');
    assert.equal((await call('appointments','POST',{...data,client_id:'otra-reserva'},a.token)).status,201);
  } finally{DB.sqlite.close();}
});
test('administración completa, filtros y estados',async()=>{
  const {DB,call,register,admin}=await fixture();
  try {
    const token=admin.token,patient=await register('patient@example.com');
    assert.equal((await call('admin/services','POST',{name:'Servicio de prueba',description:'Demo'},token)).status,201);
    const service=(await call('admin/services','GET',null,token)).body.at(-1);
    assert.equal((await call('admin/services/'+service.id,'PUT',{name:'Servicio editado',description:'Editado',active:1},token)).status,200);
    assert.equal((await call('admin/services/'+service.id,'DELETE',null,token)).status,200);
    assert.equal((await call('admin/roles/2','DELETE',null,token)).status,409);
    assert.equal((await call('admin/users/'+admin.user.id,'PUT',{name:'Admin',email:'admin@example.com',role_id:1,active:1},token)).status,409);
    assert.equal((await call('admin/schedules','POST',{professional_id:1,date_label:'2020-01-01',time_label:'09:00'},token)).status,400);
    const created=(await call('appointments','POST',{client_id:'flujo-estado',schedule_id:1,patient_name:'Paciente'},patient.token)).body;
    assert.equal((await call('admin/appointments/'+created.id,'PUT',{status:'ATENDIDA'},token)).status,409);
    assert.equal((await call('admin/appointments/'+created.id,'PUT',{status:'CONFIRMADA'},token)).status,200);
    assert.equal((await call('admin/appointments?status=CONFIRMADA','GET',null,token)).body.length,1);
    assert.equal((await call('admin/appointments/'+created.id,'PUT',{status:'ATENDIDA'},token)).status,200);
    assert.equal((await call('appointments/'+created.id+'/cancel','POST',{},patient.token)).status,409);
    assert.equal((await call('admin/appointments/'+created.id,'DELETE',null,token)).status,200);
    assert.equal((await call('admin/appointments','GET',null,token)).body.length,0);
  } finally{DB.sqlite.close();}
});
test('rechaza JSON inválido y solicitudes de otro origen',async()=>{
  const {DB,call}=await fixture();
  try{
    assert.equal((await call('auth/register','POST',{name:'Pepe',email:'no-es-correo',password:'abcdefghijk'})).status,400);
    assert.equal((await call('auth/login','POST',{email:'a@example.com',password:'abcdefghijk'},null,{Origin:'https://otro.local'})).status,403);
    const response=await handleApi(new Request('https://test.local/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'invalid'}),{DB});
    assert.equal(response.status,400);
  }finally{DB.sqlite.close();}
});
