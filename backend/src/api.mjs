import {check, textField, validEmail, validPassword, positiveId, futureSchedule,
  randomToken, digest, passwordHash, sameHash} from './security.mjs';

const appointmentSelect = `SELECT a.*, u.name AS user_name, u.email AS user_email,
 s.name AS service_name, s.id AS service_id, p.name AS professional_name,
 p.id AS professional_id, h.date_label, h.time_label
 FROM appointments a JOIN users u ON u.id=a.user_id JOIN schedules h ON h.id=a.schedule_id
 JOIN professionals p ON p.id=h.professional_id JOIN services s ON s.id=p.service_id`;
const all = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
const first = (db, sql, ...args) => db.prepare(sql).bind(...args).first();
const run = (db, sql, ...args) => db.prepare(sql).bind(...args).run();
const json = (data, status = 200, headers = {}) => Response.json(data, {status, headers:{'Cache-Control':'no-store', ...headers}});

async function body(request) {
  check((request.headers.get('content-type') || '').includes('application/json'), 'Envía JSON.', 415);
  const reader = request.body?.getReader();
  check(reader, 'Falta el cuerpo JSON.');
  let length = 0, parts = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.length;
    if (length > 16384) { await reader.cancel(); check(false, 'Petición demasiado grande.', 413); }
    parts.push(chunk.value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { const value = JSON.parse(new TextDecoder().decode(bytes)); check(value && typeof value==='object' && !Array.isArray(value), 'JSON inválido.'); return value; }
  catch { check(false, 'JSON inválido.'); }
}

function tokenFrom(request) {
  return request.headers.get('authorization')?.replace(/^Bearer /, '') ||
    (request.headers.get('cookie') || '').match(/(?:^|;\s*)cf_session=([a-f0-9]+)/)?.[1] || '';
}
function cookie(request, token, age) {
  return 'cf_session=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age +
    (new URL(request.url).protocol === 'https:' ? '; Secure' : '');
}
async function session(db, request) {
  const token = tokenFrom(request);
  check(/^[a-f0-9]{64}$/.test(token), 'Inicia sesión para continuar.', 401);
  const user = await first(db, `SELECT u.id,u.name,u.email,u.role_id,r.name AS role,r.kind
    FROM sessions t JOIN users u ON u.id=t.user_id JOIN roles r ON r.id=u.role_id
    WHERE t.token_hash=? AND t.expires_at>? AND u.active=1`, await digest(token), Date.now());
  check(user, 'Tu sesión venció. Ingresa nuevamente.', 401);
  return user;
}
async function loginLimit(db, request, email) {
  const bucket = await digest((request.headers.get('cf-connecting-ip') || 'local') + ':' + email);
  const now = Date.now();
  await run(db, 'DELETE FROM login_limits WHERE expires_at<?', now);
  await run(db, `INSERT INTO login_limits(bucket,hits,expires_at) VALUES(?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET hits=hits+1`, bucket, now+900000);
  const rate = await first(db, 'SELECT hits FROM login_limits WHERE bucket=?', bucket);
  check(rate.hits<=12, 'Demasiados intentos. Espera 15 minutos.', 429);
}
async function newSession(db, request, user) {
  const token = randomToken();
  await run(db, 'DELETE FROM sessions WHERE expires_at<?', Date.now());
  await run(db, 'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', await digest(token), user.id, Date.now()+604800000);
  return json({token, user}, 200, {'Set-Cookie':cookie(request, token,604800)});
}

export async function handleApi(request, env) {
  const db = env.DB, url = new URL(request.url), path = url.pathname, method=request.method;
  try {
    if (!['GET','HEAD','OPTIONS'].includes(method)) {
      const origin = request.headers.get('origin');
      check(!origin || origin === url.origin, 'Origen no permitido.',403);
    }
    if (method==='GET' && path==='/api/health') return json({ok:true, service:'CitaFácil', version:'2.0', timezone:'America/Lima'});
    if (method==='POST' && ['/api/auth/register','/api/auth/login'].includes(path)) {
      const data = await body(request), email=validEmail(data.email);
      await loginLimit(db,request,email);
      const password=validPassword(data.password);
      if(path.endsWith('register')) {
        const name=textField(data.name,'Nombre'), salt=randomToken();
        check(!await first(db,'SELECT id FROM users WHERE email=?',email),'El correo ya está registrado.',409);
        // El rol de registro siempre es paciente, aunque el cliente intente enviar otro.
        await run(db,'INSERT INTO users(name,email,password_hash,salt,role_id) VALUES(?,?,?,?,1)',name,email,await passwordHash(password,salt),salt);
      }
      const user=await first(db,`SELECT u.*,r.name AS role,r.kind FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?`,email);
      const candidate=await passwordHash(password,user?.salt || 'missing-account');
      check(user && user.active===1 && sameHash(user.password_hash,candidate),'Correo o contraseña incorrectos.',401);
      return newSession(db,request,{id:user.id,name:user.name,email:user.email,role_id:user.role_id,role:user.role,kind:user.kind});
    }
    const user=await session(db,request);
    if(method==='GET' && path==='/api/auth/me') return json(user);
    if(method==='POST' && path==='/api/auth/logout') {
      await run(db,'DELETE FROM sessions WHERE token_hash=?',await digest(tokenFrom(request)));
      return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
    }
    if(method==='GET' && path==='/api/catalog') {
      const services=await all(db,'SELECT * FROM services WHERE active=1 ORDER BY name');
      const professionals=await all(db,`SELECT p.* FROM professionals p JOIN services s ON s.id=p.service_id WHERE p.active=1 AND s.active=1 ORDER BY p.name`);
      const schedules=await all(db,`SELECT h.* FROM schedules h JOIN professionals p ON p.id=h.professional_id JOIN services s ON s.id=p.service_id
        WHERE h.active=1 AND p.active=1 AND s.active=1 AND datetime(h.date_label||'T'||h.time_label||':00-05:00')>datetime('now')
        AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.schedule_id=h.id AND a.status!='CANCELADA') ORDER BY h.date_label,h.time_label LIMIT 500`);
      return json({services,professionals,schedules});
    }
    if(path==='/api/appointments' && method==='GET') {
      return json(await all(db,appointmentSelect+' WHERE a.user_id=? AND a.archived=0 ORDER BY h.date_label,h.time_label',user.id));
    }
    if(path==='/api/appointments' && method==='POST') {
      const data=await body(request), clientId=textField(data.client_id,'Código de reserva',80);
      const scheduleId=positiveId(data.schedule_id), patient=textField(data.patient_name,'Paciente');
      const existing=await first(db,appointmentSelect+' WHERE a.user_id=? AND a.client_id=?',user.id,clientId);
      if(existing) return json(existing); // Reintento tras perder la respuesta: no duplica la cita.
      const slot=await first(db,'SELECT * FROM schedules WHERE id=?',scheduleId);
      check(slot,'Horario inexistente.',404);
      futureSchedule(slot.date_label,slot.time_label);
      const result=await run(db,`INSERT INTO appointments(client_id,user_id,patient_name,schedule_id)
        SELECT ?,?,?,h.id FROM schedules h JOIN professionals p ON p.id=h.professional_id JOIN services s ON s.id=p.service_id
        WHERE h.id=? AND h.active=1 AND p.active=1 AND s.active=1`,clientId,user.id,patient,scheduleId);
      check(result.meta.changes===1,'El horario ya no está disponible.',409);
      return json(await first(db,appointmentSelect+' WHERE a.user_id=? AND a.client_id=?',user.id,clientId),201);
    }
    const cancel=path.match(/^\/api\/appointments\/(\d+)\/cancel$/);
    if(cancel && method==='POST') {
      const id=positiveId(cancel[1]);
      const item=await first(db,'SELECT * FROM appointments WHERE id=? AND user_id=?',id,user.id);
      check(item,'Cita no encontrada.',404);
      check(item.status!=='ATENDIDA','Una cita atendida no se puede cancelar.',409);
      const changed=await run(db,"UPDATE appointments SET status='CANCELADA' WHERE id=? AND user_id=? AND status!='ATENDIDA'",id,user.id);
      check(changed.meta.changes===1,'El estado cambió. Actualiza tus citas.',409);
      return json(await first(db,appointmentSelect+' WHERE a.id=?',id));
    }
    if(path.startsWith('/api/admin/')) {
      check(user.kind==='ADMIN','Esta función requiere un administrador.',403);
      return await admin(request,db,user,url);
    }
    return json({error:'Ruta no encontrada.'},404);
  } catch(error) {
    let status=error.status || 500, message=error.status ? error.message : 'No se pudo completar la operación.';
    if(/UNIQUE constraint/.test(error.message)) {status=409; message='El registro ya existe o el horario fue reservado. Actualiza e intenta con otro.';}
    if(/FOREIGN KEY/.test(error.message)) {status=409; message='El registro tiene datos relacionados. Desactívalo para conservar el historial.';}
    if(status===500) console.error(JSON.stringify({path,status,error:error.message}));
    return json({error:message},status);
  }
}

async function admin(request,db,user,url) {
  const method=request.method;
  const match=url.pathname.match(/^\/api\/admin\/(roles|users|services|professionals|schedules|appointments|sessions)(?:\/(\d+))?$/);
  check(match,'Ruta administrativa no encontrada.',404);
  const table=match[1], id=match[2]?positiveId(match[2]):null;
  if(method==='GET') {
    if(table==='appointments') {
      let sql=appointmentSelect+' WHERE a.archived=0', params=[];
      for(const [key,column] of [['service_id','s.id'],['status','a.status'],['date','h.date_label']]) {
        if(url.searchParams.get(key)) {sql+=' AND '+column+'=?'; params.push(url.searchParams.get(key));}
      }
      return json(await all(db,sql+' ORDER BY h.date_label,h.time_label LIMIT 1000',...params));
    }
    if(table==='users') return json(await all(db,'SELECT u.id,u.name,u.email,u.role_id,u.active,r.name AS role,r.kind FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.name'));
    if(table==='sessions') return json(await all(db,'SELECT u.id,u.name,u.email,COUNT(*) AS sessions FROM sessions t JOIN users u ON u.id=t.user_id WHERE expires_at>? GROUP BY u.id',Date.now()));
    // table viene de una lista permitida, nunca de texto SQL del usuario.
    return json(await all(db,'SELECT * FROM '+table+' ORDER BY id'));
  }
  if(method==='DELETE') {
    check(id,'Falta el identificador.');
    if(table==='sessions') { await run(db,'DELETE FROM sessions WHERE user_id=?',id); return json({ok:true}); }
    const record=await first(db,'SELECT * FROM '+table+' WHERE id=?',id);
    check(record,'Registro no encontrado.',404);
    if(table==='roles') check(![1,2].includes(id),'Los dos roles del sistema son permanentes.',409);
    if(table==='users') check(id!==user.id,'No puedes eliminar tu propia cuenta.',409);
    if(table==='appointments') {
      check(['CANCELADA','ATENDIDA'].includes(record.status),'Primero cancela o atiende la cita.',409);
      await run(db,'UPDATE appointments SET archived=1 WHERE id=?',id);
    } else if(table==='users') {
      await run(db,'UPDATE users SET active=0 WHERE id=?',id);
      await run(db,'DELETE FROM sessions WHERE user_id=?',id);
    } else { await run(db,'DELETE FROM '+table+' WHERE id=?',id); }
    return json({ok:true});
  }
  check(['POST','PUT'].includes(method),'Método no permitido.',405);
  check(method!=='PUT' || id,'Falta el identificador.');
  const data=await body(request);
  if(id) check(await first(db,'SELECT id FROM '+table+' WHERE id=?',id),'Registro no encontrado.',404);
  if(table==='appointments') {
    check(id,'Las reservas se crean desde la app.');
    const allowed={PENDIENTE:['CONFIRMADA','CANCELADA'], CONFIRMADA:['ATENDIDA','CANCELADA'],ATENDIDA:[],CANCELADA:[]};
    const current=await first(db,'SELECT status FROM appointments WHERE id=?',id);
    check(allowed[current.status].includes(data.status),'Transición de estado no permitida.',409);
    const r=await run(db,'UPDATE appointments SET status=? WHERE id=? AND status=?',data.status,id,current.status);
    check(r.meta.changes===1,'Otra operación cambió la cita. Actualiza.',409);
    return json({ok:true});
  }
  check(table!=='sessions','Las sesiones se crean al iniciar sesión.',405);
  let values={};
  const active=data.active===0?0:1;
  if(table==='roles') {
    values={name:textField(data.name,'Rol')};
    // Los roles adicionales tienen permisos de paciente. ADMIN solo se asigna con rol 2.
    if(!id) values.kind='PACIENTE';
  }
  if(table==='services') values={name:textField(data.name,'Servicio'),description:String(data.description||'').slice(0,500),active};
  if(table==='professionals') {
    values={name:textField(data.name,'Profesional'),service_id:positiveId(data.service_id),active};
    if(id) {
      const old=await first(db,'SELECT service_id FROM professionals WHERE id=?',id);
      if(old.service_id!==values.service_id) check(!await first(db,'SELECT a.id FROM appointments a JOIN schedules h ON h.id=a.schedule_id WHERE h.professional_id=? LIMIT 1',id),'No cambies el servicio de un profesional con historial. Crea otro registro.',409);
    }
  }
  if(table==='schedules') {
    futureSchedule(data.date_label,data.time_label);
    values={professional_id:positiveId(data.professional_id),date_label:data.date_label,time_label:data.time_label,active};
    if(id) {
      const previous=await first(db,'SELECT * FROM schedules WHERE id=?',id);
      const moved=previous.professional_id!==values.professional_id || previous.date_label!==values.date_label || previous.time_label!==values.time_label;
      if(moved) check(!await first(db,'SELECT id FROM appointments WHERE schedule_id=? LIMIT 1',id),'Un horario con historial no se puede mover. Crea un horario nuevo.',409);
    }
  }
  if(table==='users') {
    const role=positiveId(data.role_id);
    check(id!==user.id || (role===user.role_id && active===1),'No puedes quitarte el acceso administrativo.',409);
    values={name:textField(data.name,'Nombre'),email:validEmail(data.email),role_id:role,active};
    if(!id || data.password) {values.salt=randomToken(); values.password_hash=await passwordHash(validPassword(data.password),values.salt);}
  }
  const keys=Object.keys(values), params=Object.values(values);
  if(id) await run(db,'UPDATE '+table+' SET '+keys.map(k=>k+'=?').join(',')+' WHERE id=?',...params,id);
  else await run(db,'INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')',...params);
  if(table==='users' && id) await run(db,'DELETE FROM sessions WHERE user_id=?',id);
  return json({ok:true},id?200:201);
}
