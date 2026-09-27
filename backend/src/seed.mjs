import { passwordHash, randomToken } from './security.mjs';

export async function seed(db, adminEmail, adminPassword) {
  if (adminEmail && adminPassword) {
    const salt = randomToken();
    await db.prepare('INSERT OR IGNORE INTO users(name,email,password_hash,salt,role_id) VALUES(?,?,?,?,2)')
      .bind('Administrador CitaFácil', adminEmail, await passwordHash(adminPassword, salt), salt).run();
  }
  const count = await db.prepare('SELECT COUNT(*) AS n FROM services').first();
  if (count.n > 0) return;
  for (const row of [[1,'Medicina general','Consulta general'],[2,'Odontología','Atención dental'],[3,'Psicología','Consulta de orientación']]) {
    await db.prepare('INSERT INTO services(id,name,description) VALUES(?,?,?)').bind(...row).run();
  }
  for (const row of [[1,'Dra. Ana Torres',1],[2,'Dr. Luis Ramírez',2],[3,'Lic. Carla Mendoza',3]]) {
    await db.prepare('INSERT INTO professionals(id,name,service_id) VALUES(?,?,?)').bind(...row).run();
  }
  for (let day = 1; day <= 10; day++) {
    const date = new Date(Date.now() + day * 86400000).toISOString().slice(0,10);
    for (let professional = 1; professional <= 3; professional++) {
      for (const time of ['09:00','10:30','15:00']) {
        await db.prepare('INSERT INTO schedules(professional_id,date_label,time_label) VALUES(?,?,?)').bind(professional,date,time).run();
      }
    }
  }
}
