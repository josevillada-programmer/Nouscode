import { randomUUID } from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { getServiceLevel, products } from './catalog.js';
import { ADMIN_EMAIL } from './admin-bootstrap.js';
import { hashAccessToken, createAccessToken, hashPassword, verifyPassword } from './auth-security.js';
import { jsonDatabase } from './json-database.js';

const accessTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const productCategories = new Set(['corporativo', 'aplicacion-movil', 'ecommerce', 'landing-page', 'dashboard']);

function isSafeUrl(value, allowAssetPath = false) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return allowAssetPath && value.startsWith('/assets/') && !value.includes('..');
  }
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    isAdmin: user.email.toLowerCase() === ADMIN_EMAIL
  };
}

function readBearerToken(request) {
  const match = request.get('authorization')?.match(/^Bearer\s+([A-Za-z0-9_-]{40,})$/i);
  return match?.[1] || null;
}

export function createAuthRouter({ store = jsonDatabase } = {}) {
  const router = express.Router();
  const authAttemptLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (request, response) => response.status(429).json({ success: false, message: 'Demasiados intentos. Espera unos minutos antes de volver a probar.' })
  });

  async function authenticate(request, response, next) {
    const token = readBearerToken(request);
    if (!token) {
      response.status(401).json({ success: false, message: 'Inicia sesión para continuar.' });
      return;
    }

    try {
      const tokenHash = hashAccessToken(token);
      const data = await store.read();
      const session = data.sessions.find((entry) => entry.tokenHash === tokenHash && Date.parse(entry.expiresAt) > Date.now());
      const user = session && data.users.find((entry) => entry.id === session.userId);
      if (!user) {
        response.status(401).json({ success: false, message: 'La sesión no es válida o ha caducado.' });
        return;
      }
      request.authUser = user;
      request.authTokenHash = tokenHash;
      next();
    } catch (error) {
      next(error);
    }
  }

  async function issueSession(user) {
    const token = createAccessToken();
    const expiresAt = new Date(Date.now() + accessTokenLifetimeMs).toISOString();
    await store.update((data) => {
      data.sessions = data.sessions.filter((entry) => Date.parse(entry.expiresAt) > Date.now());
      data.sessions.push({ tokenHash: hashAccessToken(token), userId: user.id, expiresAt });
    });
    return token;
  }

  function requireAdmin(request, response, next) {
    if (request.authUser.email.toLowerCase() !== ADMIN_EMAIL) {
      response.status(403).json({ success: false, message: 'No tienes permisos de administrador.' });
      return;
    }
    next();
  }

  router.post('/api/register', authAttemptLimiter, async (request, response, next) => {
    const username = String(request.body?.username ?? request.body?.name ?? '').trim();
    const email = String(request.body?.email ?? '').trim().toLowerCase();
    const password = request.body?.password;
    if (username.length < 2 || username.length > 80 || !emailPattern.test(email) || email.length > 254 ||
        typeof password !== 'string' || password.length < 8 || password.length > 128) {
      response.status(400).json({ success: false, message: 'Revisa el nombre, el correo y la contraseña (8 a 128 caracteres).' });
      return;
    }
    if (email === ADMIN_EMAIL && !(await store.read()).users.some((entry) => entry.email.toLowerCase() === email)) {
      response.status(403).json({ success: false, message: 'La cuenta de administrador debe habilitarse previamente.' });
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      const user = {
        id: randomUUID(),
        username,
        email,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      const duplicate = await store.update((data) => {
        const exists = data.users.some((entry) => entry.email.toLowerCase() === email || entry.username.toLowerCase() === username.toLowerCase());
        if (!exists) data.users.push(user);
        return exists;
      });
      if (duplicate) {
        response.status(409).json({ success: false, message: 'Ya existe una cuenta con ese correo o nombre de usuario.' });
        return;
      }

      response.status(201).json({ success: true, user: publicUser(user), token: await issueSession(user) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/login', authAttemptLimiter, async (request, response, next) => {
    const identifier = String(request.body?.email ?? request.body?.username ?? '').trim().toLowerCase();
    const password = request.body?.password;
    if (!identifier || typeof password !== 'string' || password.length > 128) {
      response.status(400).json({ success: false, message: 'Indica tu correo o usuario y contraseña.' });
      return;
    }

    try {
      const data = await store.read();
      const user = data.users.find((entry) => entry.email.toLowerCase() === identifier || entry.username.toLowerCase() === identifier);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        response.status(401).json({ success: false, message: 'El correo/usuario o la contraseña no son correctos.' });
        return;
      }
      response.json({ success: true, user: publicUser(user), token: await issueSession(user) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/me', authenticate, (request, response) => {
    response.json({ success: true, user: publicUser(request.authUser) });
  });

  router.post('/api/logout', authenticate, async (request, response, next) => {
    try {
      await store.update((data) => {
        data.sessions = data.sessions.filter((entry) => entry.tokenHash !== request.authTokenHash);
      });
      response.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/admin/overview', authenticate, requireAdmin, async (request, response, next) => {
    try {
      const data = await store.read();
      response.json({
        success: true,
        overview: {
          users: data.users.length,
          purchases: data.purchases.length,
          products: Object.keys(products).length + data.products.filter((product) => product.active !== false).length
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/products', async (request, response, next) => {
    try {
      const data = await store.read();
      response.json({ success: true, products: data.products.filter((product) => product.active !== false) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/products', authenticate, requireAdmin, async (request, response, next) => {
    const title = String(request.body?.title ?? request.body?.name ?? '').trim();
    const category = String(request.body?.category ?? '').trim();
    const description = String(request.body?.description ?? '').trim();
    const price = Number(request.body?.price);
    const imageUrl = String(request.body?.imageUrl ?? '').trim();
    const productUrl = String(request.body?.productUrl ?? request.body?.url ?? '').trim();
    if (title.length < 3 || title.length > 100 || !productCategories.has(category) ||
        description.length < 10 || description.length > 1200 || !Number.isFinite(price) || price <= 0 ||
        Math.round(price * 100) !== price * 100 || (!imageUrl && !productUrl) ||
        !isSafeUrl(imageUrl, true) || !isSafeUrl(productUrl)) {
      response.status(400).json({ success: false, message: 'Revisa nombre, categoría, descripción, precio e imagen o enlace.' });
      return;
    }
    try {
      const product = {
        id: randomUUID(),
        title,
        category,
        description,
        price,
        imageUrl,
        productUrl,
        active: true,
        createdAt: new Date().toISOString()
      };
      await store.update((data) => data.products.push(product));
      response.status(201).json({ success: true, product });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/api/products/:id', authenticate, requireAdmin, async (request, response, next) => {
    try {
      let removed = false;
      await store.update((data) => {
        const count = data.products.length;
        data.products = data.products.filter((product) => product.id !== request.params.id);
        removed = data.products.length !== count;
      });
      if (!removed) {
        response.status(404).json({ success: false, message: 'El producto ya no existe.' });
        return;
      }
      response.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/purchases/:userId', authenticate, async (request, response, next) => {
    if (request.params.userId !== request.authUser.id) {
      response.status(403).json({ success: false, message: 'No tienes permiso para consultar este historial.' });
      return;
    }
    try {
      const data = await store.read();
      const purchases = data.purchases
        .filter((purchase) => purchase.userId === request.authUser.id)
        .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
      response.json({ success: true, purchases });
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/purchases', authenticate, async (request, response, next) => {
    const requestedItems = request.body?.items;
    if (!Array.isArray(requestedItems) || requestedItems.length < 1 || requestedItems.length > 50) {
      response.status(400).json({ success: false, message: 'La compra debe incluir entre 1 y 50 artículos.' });
      return;
    }

    try {
      const databaseSnapshot = await store.read();
      const items = [];
      for (const requestedItem of requestedItems) {
        const productId = String(requestedItem?.productId ?? requestedItem?.id ?? '');
        const tier = String(requestedItem?.tier ?? '').trim();
        const quantity = requestedItem?.quantity;
        const staticProduct = products[productId];
        const dynamicProduct = databaseSnapshot.products.find((entry) => entry.id === productId && entry.active !== false);
        if ((!staticProduct && !dynamicProduct) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
          response.status(400).json({ success: false, message: 'Uno o más artículos tienen datos no válidos.' });
          return;
        }

        const level = staticProduct ? getServiceLevel(productId, tier) : null;
        if (staticProduct && !level) {
          response.status(422).json({ success: false, message: 'Un nivel de servicio ya no está disponible.' });
          return;
        }

        const unitPrice = Number(dynamicProduct?.price ?? level.price);
        const product = dynamicProduct || staticProduct;
        items.push({
          id: productId,
          productId,
          name: product.title || product.name,
          tier: level?.label || 'Digital',
          nivelServicioId: level?.id || 0,
          price: unitPrice,
          quantity,
          lineTotal: unitPrice * quantity
        });
      }

      const purchase = {
        id: randomUUID(),
        userId: request.authUser.id,
        date: new Date().toISOString(),
        items,
        total: items.reduce((sum, item) => sum + item.lineTotal, 0)
      };
      await store.update((data) => {
        data.purchases.push(purchase);
        if (!Array.isArray(data.carts)) data.carts = [];
        const cartId = request.get('x-cart-id');
        const cart = data.carts.find((entry) => entry.cartId === cartId);
        if (cart) cart.items = [];
      });
      response.status(201).json({ success: true, purchase });
    } catch (error) {
      next(error);
    }
  });

  return router;
}