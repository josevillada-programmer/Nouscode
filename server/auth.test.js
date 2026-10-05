import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ADMIN_EMAIL, ensureAdminAccount } from './admin-bootstrap.js';
import { createAuthRouter } from './auth-routes.js';
import { createCartRouter } from './cart-routes.js';
import { hashPassword, verifyPassword } from './auth-security.js';
import { createJsonDatabase } from './json-database.js';

test('password hashes are salted and verify without storing plain text', async () => {
  const firstHash = await hashPassword('correct horse battery staple');
  const secondHash = await hashPassword('correct horse battery staple');
  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword('correct horse battery staple', firstHash), true);
  assert.equal(await verifyPassword('wrong password', firstHash), false);
});

test('JSON database serializes concurrent updates and writes valid JSON', async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nouscode-json-db-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'db.json');
  const store = createJsonDatabase(filePath);
  await store.initialize();

  await Promise.all(Array.from({ length: 20 }, (_, index) => store.update((data) => {
    data.users.push({ id: String(index) });
  })));

  const stored = JSON.parse(await readFile(filePath, 'utf8'));
  assert.equal(stored.users.length, 20);
  assert.deepEqual(stored.purchases, []);
  assert.deepEqual(stored.sessions, []);
});

test('admin bootstrap seeds missing accounts and promotes existing accounts without erasing purchases', async () => {
  const newData = { users: [], purchases: [], sessions: [], carts: [], products: [] };
  const newStore = {
    read: async () => structuredClone(newData),
    update: async (mutate) => {
      const result = await mutate(newData);
      return structuredClone(result ?? newData);
    }
  };
  const logger = { warn() {} };
  const created = await ensureAdminAccount({ store: newStore, password: 'configured admin password', logger });
  const newAdmin = newData.users[0];
  assert.equal(created.created, true);
  assert.equal(newAdmin.email, ADMIN_EMAIL);
  assert.equal(newAdmin.isAdmin, true);
  assert.equal(await verifyPassword('configured admin password', newAdmin.passwordHash), true);
  const repeated = await ensureAdminAccount({ store: newStore, password: 'another admin password', logger });
  assert.equal(repeated.created, false);
  assert.equal(newData.users.length, 1);
  assert.equal(await verifyPassword('configured admin password', newAdmin.passwordHash), true);

  const existingHash = 'existing-password-hash';
  const existingData = {
    users: [{ id: 'existing-admin', username: 'Existing', email: ADMIN_EMAIL, passwordHash: existingHash }],
    purchases: [{ id: 'preserved-purchase' }],
    sessions: [],
    carts: [],
    products: []
  };
  const existingStore = {
    read: async () => structuredClone(existingData),
    update: async (mutate) => {
      const result = await mutate(existingData);
      return structuredClone(result ?? existingData);
    }
  };
  const promoted = await ensureAdminAccount({ store: existingStore, logger });
  assert.equal(promoted.created, false);
  assert.equal(existingData.users[0].isAdmin, true);
  assert.equal(existingData.users[0].passwordHash, existingHash);
  assert.equal(existingData.purchases.length, 1);
});

test('account API stores purchases with catalog prices and enforces ownership', async (context) => {
  const data = { users: [], purchases: [], sessions: [], carts: [], products: [] };
  const store = {
    read: async () => structuredClone(data),
    update: async (mutate) => mutate(data)
  };
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter({ store }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const registrationResponse = await fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Ada', email: 'ada@example.com', password: 'secure passphrase' })
  });
  const registration = await registrationResponse.json();
  assert.equal(registrationResponse.status, 201);
  assert.equal(Object.hasOwn(registration.user, 'passwordHash'), false);
  assert.match(data.users[0].passwordHash, /^scrypt\$/);

  const purchaseResponse = await fetch(`${baseUrl}/api/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${registration.token}` },
    body: JSON.stringify({
      userId: 'another-user',
      date: '2000-01-01T00:00:00.000Z',
      items: [{ id: 'plantilla-1', tier: 'Básico', quantity: 2, price: 0.01 }],
      total: 0.02
    })
  });
  const purchaseResult = await purchaseResponse.json();
  assert.equal(purchaseResponse.status, 201);
  assert.equal(purchaseResult.purchase.total, 5000);
  assert.equal(data.purchases[0].userId, registration.user.id);
  assert.notEqual(purchaseResult.purchase.date, '2000-01-01T00:00:00.000Z');

  data.products.push({ id: 'digital-product', title: 'Digital product', price: 375, active: true });
  const dynamicPurchaseResponse = await fetch(`${baseUrl}/api/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${registration.token}` },
    body: JSON.stringify({ items: [{ id: 'digital-product', tier: 'Digital', quantity: 2, price: 0.01 }] })
  });
  const dynamicPurchase = await dynamicPurchaseResponse.json();
  assert.equal(dynamicPurchaseResponse.status, 201);
  assert.equal(dynamicPurchase.purchase.total, 750);
  assert.equal(dynamicPurchase.purchase.items[0].name, 'Digital product');

  const historyResponse = await fetch(`${baseUrl}/api/purchases/${registration.user.id}`, {
    headers: { Authorization: `Bearer ${registration.token}` }
  });
  assert.equal(historyResponse.status, 200);
  assert.equal((await historyResponse.json()).purchases.length, 2);

  const forbiddenResponse = await fetch(`${baseUrl}/api/purchases/someone-else`, {
    headers: { Authorization: `Bearer ${registration.token}` }
  });
  assert.equal(forbiddenResponse.status, 403);
});

test('cart API persists validated items and computes totals from the JSON catalog', async (context) => {
  const data = {
    users: [],
    purchases: [],
    sessions: [],
    carts: [],
    products: [{ id: 'digital-product', title: 'Digital product', price: 875, imageUrl: 'https://example.test/product.png', active: true }]
  };
  const store = {
    read: async () => structuredClone(data),
    update: async (mutate) => structuredClone(await mutate(data))
  };
  const app = express();
  app.use(express.json());
  app.use(createCartRouter({ store }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'X-Cart-Id': 'f6c44165-7b06-47c6-8cb3-88697ca11055', 'Content-Type': 'application/json' };

  const emptyCartResponse = await fetch(`${baseUrl}/api/cart`, { headers });
  assert.equal((await emptyCartResponse.json()).items.length, 0);

  const updateResponse = await fetch(`${baseUrl}/api/cart/items/plantilla-1`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ quantity: 3, nivel_servicio_id: 1, price: 0.01 })
  });
  const updatedCart = await updateResponse.json();
  assert.equal(updatedCart.subtotal, 7500);
  assert.equal(updatedCart.item.price, 2500);
  assert.equal(data.carts[0].items[0].quantity, 3);

  const invalidLevelResponse = await fetch(`${baseUrl}/api/cart/items/plantilla-1`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ quantity: 1, nivel_servicio_id: 9 })
  });
  assert.equal(invalidLevelResponse.status, 422);

  const deleteResponse = await fetch(`${baseUrl}/api/cart/items/plantilla-1`, { method: 'DELETE', headers });
  assert.equal((await deleteResponse.json()).items.length, 0);
  assert.equal(data.carts[0].items.length, 0);

  const dynamicLevelsResponse = await fetch(`${baseUrl}/api/service-levels/digital-product`);
  assert.equal((await dynamicLevelsResponse.json()).levels[0].price, 875);
  const dynamicUpdateResponse = await fetch(`${baseUrl}/api/cart/items/digital-product`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ quantity: 2, nivel_servicio_id: 0 })
  });
  const dynamicCart = await dynamicUpdateResponse.json();
  assert.equal(dynamicCart.subtotal, 1750);
  assert.equal(dynamicCart.item.name, 'Digital product');
  const dynamicDeleteResponse = await fetch(`${baseUrl}/api/cart/items/digital-product`, { method: 'DELETE', headers });
  assert.equal((await dynamicDeleteResponse.json()).items.length, 0);
});

test('admin role requires an exact allowlisted email and protects product management', async (context) => {
  const password = 'admin secure passphrase';
  const data = {
    users: [
      { id: 'admin-one', username: 'Admin One', email: 'josevillada2000jp@gmail.com', passwordHash: await hashPassword(password) },
      { id: 'admin-two', username: 'Admin Two', email: 'jvillada@pasquelhermanos.com.mx', passwordHash: await hashPassword(password) },
      { id: 'regular-user', username: 'Regular User', email: 'josevillada2000jp+fake@gmail.com', passwordHash: await hashPassword(password) }
    ],
    purchases: [],
    sessions: [],
    carts: [],
    products: []
  };
  const store = {
    read: async () => structuredClone(data),
    update: async (mutate) => structuredClone(await mutate(data))
  };
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter({ store }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function login(email) {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return { status: response.status, result: await response.json() };
  }

  const adminLogin = await login('josevillada2000jp@gmail.com');
  const previousAddressLogin = await login('jvillada@pasquelhermanos.com.mx');
  const regularLogin = await login('josevillada2000jp+fake@gmail.com');
  assert.equal(adminLogin.result.user.isAdmin, true);
  assert.equal(previousAddressLogin.result.user.isAdmin, false);
  assert.equal(regularLogin.result.user.isAdmin, false);

  const adminHeaders = { Authorization: `Bearer ${adminLogin.result.token}`, 'Content-Type': 'application/json' };
  const sessionResponse = await fetch(`${baseUrl}/api/me`, { headers: adminHeaders });
  assert.equal((await sessionResponse.json()).user.isAdmin, true);
  const overviewResponse = await fetch(`${baseUrl}/api/admin/overview`, { headers: adminHeaders });
  assert.equal((await overviewResponse.json()).overview.users, 3);
  assert.equal((await (await fetch(`${baseUrl}/api/admin/overview`, { headers: adminHeaders })).json()).overview.products, 6);

  const createResponse = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Panel de analítica',
      category: 'dashboard',
      description: 'Página digital para analizar indicadores comerciales.',
      price: 1250,
      imageUrl: 'https://example.test/dashboard.png',
      productUrl: 'https://example.test/dashboard'
    })
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(data.products.length, 1);
  const publicProducts = await fetch(`${baseUrl}/api/products`);
  assert.equal((await publicProducts.json()).products[0].title, 'Panel de analítica');

  const forbiddenResponse = await fetch(`${baseUrl}/api/products/${created.product.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${regularLogin.result.token}` }
  });
  assert.equal(forbiddenResponse.status, 403);

  const deleteResponse = await fetch(`${baseUrl}/api/products/${created.product.id}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(data.products.length, 0);
});

test('public registration cannot claim the master email', async (context) => {
  const data = { users: [], purchases: [], sessions: [], carts: [], products: [] };
  const store = {
    read: async () => structuredClone(data),
    update: async (mutate) => structuredClone(await mutate(data))
  };
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter({ store }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Attempted Admin', email: 'josevillada2000jp@gmail.com', password: 'secure passphrase' })
  });
  assert.equal(response.status, 403);
  assert.equal(data.users.length, 0);
});