import { randomBytes, randomUUID } from 'node:crypto';
import { hashPassword } from './auth-security.js';
import { jsonDatabase } from './json-database.js';

export const ADMIN_EMAIL = 'josevillada2000jp@gmail.com';

export async function ensureAdminAccount({ store = jsonDatabase, password = process.env.ADMIN_PASSWORD, logger = console } = {}) {
  const currentData = await store.read();
  const currentAdmin = currentData.users.find((user) => user.email.toLowerCase() === ADMIN_EMAIL);
  if (currentAdmin) {
    await store.update((data) => {
      const admin = data.users.find((user) => user.email.toLowerCase() === ADMIN_EMAIL);
      if (admin) admin.isAdmin = true;
      if (!Array.isArray(data.products)) data.products = [];
    });
    return { created: false, userId: currentAdmin.id };
  }

  if (password && password.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  const initialPassword = password || randomBytes(32).toString('base64url');
  const user = {
    id: randomUUID(),
    username: 'Administrador NoûsCode',
    email: ADMIN_EMAIL,
    passwordHash: await hashPassword(initialPassword),
    createdAt: new Date().toISOString(),
    isAdmin: true
  };
  let created = false;
  let userId = user.id;

  await store.update((data) => {
    const existingAdmin = data.users.find((entry) => entry.email.toLowerCase() === ADMIN_EMAIL);
    if (existingAdmin) {
      existingAdmin.isAdmin = true;
      if (!Array.isArray(data.products)) data.products = [];
      userId = existingAdmin.id;
      return;
    }
    data.users.push(user);
    if (!Array.isArray(data.products)) data.products = [];
    created = true;
  });

  if (created && !password) logger.warn(`Contraseña inicial de ${ADMIN_EMAIL}: ${initialPassword}`);
  return { created, userId };
}