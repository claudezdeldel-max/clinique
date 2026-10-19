import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const FEATURE_KEYS = ['reports', 'prescriptions', 'images', 'ready_files', 'queue_calls'];
export const EXAM_TYPES = ['IRM', 'Scanner', 'Echo', 'Radio', 'Mammo', 'Other'];
export function examCategory(value = '') {
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (text.includes('echo') || text.includes('doppler')) return 'Echo';
  if (text.includes('irm')) return 'IRM';
  if (text.includes('scanner') || /\bct\b/.test(text)) return 'Scanner';
  if (text.includes('mammo')) return 'Mammo';
  if (text.includes('radio')) return 'Radio';
  return 'Other';
}
export function defaultFeatures(role) {
  return Object.fromEntries(FEATURE_KEYS.map(key => [key, role !== 'secretary' || ['ready_files', 'queue_calls'].includes(key)]));
}
export function publicUser(user) {
  return { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email, phone: user.phone || '',
    active: Boolean(user.active), is_super_admin: Boolean(user.is_super_admin), features: { ...defaultFeatures(user.role), ...JSON.parse(user.features_json || '{}') },
    call_exam_types: JSON.parse(user.call_exam_types_json || JSON.stringify(EXAM_TYPES)) };
}
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  if (!stored.startsWith('scrypt:')) return stored === password;
  const [, salt, digest] = stored.split(':');
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function canCall(user, ticket, echoDoctorId) {
  if (!user?.active || !user.features.queue_calls || !user.call_exam_types.includes(examCategory(ticket.modality_name))) return false;
  return examCategory(ticket.modality_name) !== 'Echo' || !echoDoctorId || (user.role === 'radiologist' && user.id === Number(echoDoctorId));
}
