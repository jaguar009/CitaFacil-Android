import { timingSafeEqual } from 'node:crypto';

const encoder = new TextEncoder();
export const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:encoder.encode(salt), iterations:100000}, key, 256));
}

export function sameHash(a, b) {
  const left = encoder.encode(a), right = encoder.encode(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function check(condition, message, status = 400) {
  if (!condition) throw Object.assign(new Error(message), {status});
}
export function textField(value, name, max = 120) {
  check(typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= max,
    name + ': escribe entre 2 y ' + max + ' caracteres.');
  return value.trim();
}
export function validEmail(value) {
  const email = textField(value, 'Correo', 160).toLowerCase();
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'El correo no es válido.');
  return email;
}
export function validPassword(value) {
  check(typeof value === 'string' && value.length >= 10 && value.length <= 128,
    'La contraseña debe tener entre 10 y 128 caracteres.');
  return value;
}
export function positiveId(value) {
  const id = Number(value);
  check(Number.isSafeInteger(id) && id > 0, 'Identificador no válido.');
  return id;
}
export function futureSchedule(date, time) {
  check(/^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time), 'Fecha u hora no válida.');
  const timestamp = Date.parse(date + 'T' + time + ':00-05:00');
  check(Number.isFinite(timestamp) && new Date(date + 'T12:00:00Z').toISOString().startsWith(date), 'Fecha inexistente.');
  check(timestamp > Date.now(), 'El horario debe estar en el futuro (hora de Lima).');
}
