'use strict';
// JavaScript sin framework: eventos, fetch y tablas para que sea fácil de explicar.
const $ = id => document.getElementById(id);
const labels = {appointments:'Tu agenda de citas',services:'Servicios del consultorio',professionals:'Equipo de profesionales',schedules:'Horarios de atención',users:'Usuarios y permisos',roles:'Roles del sistema',sessions:'Sesiones activas'};
let page='appointments', records=[], editing=null, catalogs={services:[],professionals:[],roles:[]};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = status => '<span class="badge '+escapeHtml(status)+'">'+escapeHtml(status)+'</span>';
const lookup = (table,id) => catalogs[table]?.find(x=>x.id===Number(id))?.name || '#'+id;

async function api(path,method='GET',data) {
  const response=await fetch('/api/'+path,{method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,credentials:'same-origin'});
  const value=await response.json();
  if(!response.ok) {
    if(response.status===401) showLogin();
    throw new Error(value.error || 'No se pudo completar la operación.');
  }
  return value;
}
function showLogin() {$('loginPage').hidden=false;$('app').hidden=true;}
function message(text,error=false) {$('message').textContent=text;$('message').className='message'+(error?' error':'');}
async function openApp() {
  const user=await api('auth/me');
  if(user.kind!=='ADMIN') {await api('auth/logout','POST',{});throw new Error('Tu cuenta es de paciente. Usa la aplicación Android.');}
  $('currentUser').textContent=user.name;
  $('today').textContent=new Date().toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Lima'});
  $('loginPage').hidden=true;$('app').hidden=false;
  await reload();
}
$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault(); const button=event.submitter;button.disabled=true;$('loginMessage').textContent='';
  try{await api('auth/login','POST',Object.fromEntries(new FormData(event.target)));await openApp();event.target.reset();}
  catch(error){$('loginMessage').textContent=error.message;}finally{button.disabled=false;}
});
$('logout').addEventListener('click',async()=>{try{await api('auth/logout','POST',{});showLogin();}catch(e){message(e.message,true);}});
document.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>{
  page=button.dataset.page;$('search').value='';
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b===button));
  reload();
}));
async function reload() {
  $('reload').disabled=true;message('Cargando información…');
  try{
    const [services,professionals,roles]=await Promise.all(['services','professionals','roles'].map(t=>api('admin/'+t)));
    catalogs={services,professionals,roles};
    const selected=$('serviceFilter').value;
    $('serviceFilter').innerHTML='<option value="">Todos los servicios</option>'+services.map(s=>'<option value="'+s.id+'">'+escapeHtml(s.name)+'</option>').join('');
    $('serviceFilter').value=selected;
    const query=new URLSearchParams();
    if(page==='appointments') for(const [key,id] of [['status','statusFilter'],['service_id','serviceFilter'],['date','dateFilter']]) if($(id).value)query.set(key,$(id).value);
    records=await api('admin/'+page+'?'+query);
    $('pageTitle').textContent=labels[page];
    $('pageDescription').textContent=page==='appointments'?'Organiza cada atención, desde la reserva hasta su cierre.':'Consulta, registra y actualiza la información de '+labels[page].toLowerCase()+'.';
    $('create').hidden=['appointments','sessions'].includes(page);
    $('metrics').hidden=page!=='appointments';
    for(const id of ['statusLabel','serviceLabel','dateLabel'])$(id).hidden=page!=='appointments';
    if(page==='appointments')$('metrics').innerHTML=[['Citas en la vista',records.length],['Por confirmar',records.filter(r=>r.status==='PENDIENTE').length],['Confirmadas',records.filter(r=>r.status==='CONFIRMADA').length],['Atendidas',records.filter(r=>r.status==='ATENDIDA').length]].map(([label,n])=>'<div class="metric"><p>'+label+'</p><strong>'+n+'</strong></div>').join('');
    render();message('Información actualizada.');
  }catch(error){message(error.message,true);}finally{$('reload').disabled=false;}
}
function button(text,action,id,danger=false) {return '<button data-action="'+action+'" data-id="'+id+'"'+(danger?' class="danger"':'')+'>'+text+'</button>';}
function render() {
  const search=$('search').value.toLocaleLowerCase('es');
  const visible=records.filter(r=>Object.values(r).join(' ').toLocaleLowerCase('es').includes(search));
  let headings;
  if(page==='appointments')headings=['Paciente','Servicio / profesional','Fecha y hora','Estado','Acciones'];
  else if(page==='users')headings=['Nombre','Correo','Rol','Estado','Acciones'];
  else if(page==='roles')headings=['Rol','Permisos','Acciones'];
  else if(page==='services')headings=['Servicio','Descripción','Estado','Acciones'];
  else if(page==='professionals')headings=['Profesional','Servicio','Estado','Acciones'];
  else if(page==='schedules')headings=['Profesional','Fecha','Hora (Lima)','Estado','Acciones'];
  else headings=['Usuario','Correo','Sesiones','Acción'];
  $('head').innerHTML='<tr>'+headings.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr>';
  $('rows').innerHTML=visible.map(r=>{
    const e=escapeHtml, active=badge(r.active?'ACTIVO':'INACTIVO');
    let actions=button('Editar','edit',r.id)+button(page==='users'?'Desactivar':'Eliminar','delete',r.id,true), cells=[];
    if(page==='appointments') {
      actions='';
      if(r.status==='PENDIENTE')actions+=button('Confirmar','CONFIRMADA',r.id);
      if(r.status==='CONFIRMADA')actions+=button('Atendida','ATENDIDA',r.id);
      if(['PENDIENTE','CONFIRMADA'].includes(r.status))actions+=button('Cancelar','CANCELADA',r.id,true);
      else actions+=button('Archivar','delete',r.id);
      cells=[e(r.patient_name)+'<small>'+e(r.user_email)+'</small>',e(r.service_name)+'<small>'+e(r.professional_name)+'</small>',e(r.date_label)+'<small>'+e(r.time_label)+'</small>',badge(r.status),actions];
    } else if(page==='users')cells=[e(r.name),e(r.email),e(r.role),active,actions];
    else if(page==='roles')cells=[e(r.name),e(r.kind),actions];
    else if(page==='services')cells=[e(r.name),e(r.description),active,actions];
    else if(page==='professionals')cells=[e(r.name),e(lookup('services',r.service_id)),active,actions];
    else if(page==='schedules')cells=[e(lookup('professionals',r.professional_id)),e(r.date_label),e(r.time_label),active,actions];
    else cells=[e(r.name),e(r.email),e(r.sessions),button('Revocar sesiones','delete',r.id,true)];
    return '<tr>'+cells.map(c=>'<td>'+c+'</td>').join('')+'</tr>';
  }).join('');
  $('empty').hidden=visible.length>0;$('count').textContent=visible.length+' registro(s)';
}
const fields = {
  services:[['name','Nombre','text'],['description','Descripción','text'],['active','Estado','active']],
  professionals:[['name','Nombre','text'],['service_id','Servicio','services'],['active','Estado','active']],
  schedules:[['professional_id','Profesional','professionals'],['date_label','Fecha','date'],['time_label','Hora (Lima)','time'],['active','Estado','active']],
  users:[['name','Nombre','text'],['email','Correo','email'],['password','Contraseña (mínimo 10 caracteres)','password'],['role_id','Rol','roles'],['active','Estado','active']],
  roles:[['name','Nombre del rol','text']]
};
function edit(record=null) {
  editing=record;$('formMessage').textContent='';$('editTitle').textContent=record?'Editar registro':'Nuevo registro';
  $('fields').innerHTML=fields[page].map(([key,label,type])=>{
    const value=record?.[key] ?? (key==='active'?1:'');let input;
    if(['services','professionals','roles','active'].includes(type)) {
      const options=type==='active'?[{id:1,name:'Activo'},{id:0,name:'Inactivo'}]:catalogs[type];
      input='<select name="'+key+'" required>'+options.map(o=>'<option value="'+o.id+'"'+(String(o.id)===String(value)?' selected':'')+'>'+escapeHtml(o.name)+'</option>').join('')+'</select>';
    } else input='<input name="'+key+'" type="'+type+'" value="'+escapeHtml(value)+'" '+((key==='password'&&record)||key==='description'?'':'required')+' maxlength="'+(key==='password'?128:500)+'" '+(key==='password'?'minlength="10" autocomplete="new-password"':'')+'>';
    return '<label>'+label+input+'</label>';
  }).join('')+(record && page==='users'?'<small>Deja la contraseña vacía para conservarla. Cambiar la cuenta revoca sus sesiones.</small>':'');
  $('editor').showModal();
}
$('rows').addEventListener('click',async event=>{
  const target=event.target.closest('button[data-action]');if(!target)return;
  const id=Number(target.dataset.id),action=target.dataset.action,record=records.find(r=>r.id===id);
  if(action==='edit'){edit(record);return;}
  if(!confirm(action==='delete'?'¿Confirmas esta operación sobre el registro seleccionado?':'¿Cambiar el estado a '+action+'?'))return;
  target.disabled=true;
  try{await api('admin/'+page+'/'+id,action==='delete'?'DELETE':'PUT',action==='delete'?undefined:{status:action});await reload();}
  catch(error){message(error.message,true);target.disabled=false;}
});
$('editForm').addEventListener('submit',async event=>{
  event.preventDefault();event.submitter.disabled=true;
  const data=Object.fromEntries(new FormData(event.target));
  for(const key of ['service_id','professional_id','role_id','active'])if(key in data)data[key]=Number(data[key]);
  try{await api('admin/'+page+(editing?'/'+editing.id:''),editing?'PUT':'POST',data);$('editor').close();await reload();}
  catch(error){$('formMessage').textContent=error.message;}finally{event.submitter.disabled=false;}
});
$('create').addEventListener('click',()=>edit());
$('closeEditor').addEventListener('click',()=>$('editor').close());
$('cancelEdit').addEventListener('click',()=>$('editor').close());
$('reload').addEventListener('click',reload);
$('search').addEventListener('input',render);
for(const id of ['statusFilter','serviceFilter','dateFilter'])$(id).addEventListener('change',reload);
openApp().catch(error=>{showLogin();if(!error.message.includes('Inicia sesión'))$('loginMessage').textContent=error.message;});
