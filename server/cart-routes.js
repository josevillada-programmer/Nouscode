import express from 'express';
import { validateCartUpdate } from './cart-validation.js';
import { getServiceLevel, products } from './catalog.js';
import { jsonDatabase } from './json-database.js';

function readCartId(request) {
  const cartId = request.get('x-cart-id') || '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cartId) ? cartId : null;
}

function presentCart(cart, dynamicProducts = []) {
  const items = cart.items.flatMap((cartItem) => {
    const product = products[cartItem.productId];
    const quantity = Number(cartItem.quantity);
    if (product) {
      const level = getServiceLevel(cartItem.productId, cartItem.nivelServicioId);
      if (!level) return [];
      return [{
        id: cartItem.productId,
        productId: cartItem.productId,
        name: product.name,
        image: product.image,
        nivelServicioId: level.id,
        tier: level.label,
        price: level.price,
        quantity,
        lineTotal: level.price * quantity
      }];
    }
    const dynamicProduct = dynamicProducts.find((entry) => entry.id === cartItem.productId && entry.active !== false);
    if (!dynamicProduct) return [];
    return [{
      id: cartItem.productId,
      productId: cartItem.productId,
      name: dynamicProduct.title,
      image: dynamicProduct.imageUrl,
      productUrl: dynamicProduct.productUrl,
      nivelServicioId: 0,
      tier: 'Digital',
      price: Number(dynamicProduct.price),
      quantity,
      lineTotal: Number(dynamicProduct.price) * quantity
    }];
  });
  return { items, subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0) };
}

export function createCartRouter({ store = jsonDatabase } = {}) {
  const router = express.Router();

  router.get('/api/service-levels/:productId', async (request, response, next) => {
    const product = products[request.params.productId];
    if (product) {
      response.json({
        success: true,
        levels: product.serviceLevels.map((level) => ({ id: level.id, label: level.label, price: level.price }))
      });
      return;
    }
    try {
      const data = await store.read();
      const dynamicProduct = data.products.find((entry) => entry.id === request.params.productId && entry.active !== false);
      if (!dynamicProduct) {
        response.status(404).json({ success: false, message: 'El artículo seleccionado no existe.' });
        return;
      }
      response.json({ success: true, levels: [{ id: 0, label: 'Digital', price: Number(dynamicProduct.price) }] });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/cart', async (request, response, next) => {
    const cartId = readCartId(request);
    if (!cartId) {
      response.status(400).json({ success: false, message: 'Falta un identificador válido del carrito.' });
      return;
    }
    try {
      const state = await store.update((data) => {
        if (!Array.isArray(data.carts)) data.carts = [];
        if (!Array.isArray(data.products)) data.products = [];
        let currentCart = data.carts.find((entry) => entry.cartId === cartId);
        if (!currentCart) {
          currentCart = { cartId, items: [] };
          data.carts.push(currentCart);
        }
        return { cart: currentCart, products: data.products };
      });
      response.json({ success: true, ...presentCart(state.cart, state.products) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/api/cart/items/:productId', async (request, response, next) => {
    const cartId = readCartId(request);
    const { productId } = request.params;
    if (!cartId) {
      response.status(400).json({ success: false, message: 'Falta un identificador válido del carrito.' });
      return;
    }
    const staticProduct = products[productId];
    let dynamicProduct;
    if (!staticProduct) {
      try {
        dynamicProduct = (await store.read()).products.find((entry) => entry.id === productId && entry.active !== false);
      } catch (error) {
        next(error);
        return;
      }
    }
    if (!staticProduct && !dynamicProduct) {
      response.status(404).json({ success: false, message: 'El artículo seleccionado no existe.' });
      return;
    }
    let quantity;
    let level;
    if (staticProduct) {
      const validation = validateCartUpdate(request.body);
      if (!validation.valid) {
        response.status(400).json({ success: false, message: validation.message });
        return;
      }
      quantity = validation.quantity;
      level = getServiceLevel(productId, validation.nivelServicioId);
      if (!level) {
        response.status(422).json({ success: false, message: 'Ese nivel de servicio no está disponible para este artículo.' });
        return;
      }
    } else {
      quantity = request.body?.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        response.status(400).json({ success: false, message: 'La cantidad debe ser un entero entre 1 y 10.' });
        return;
      }
      level = { id: 0, label: 'Digital', price: Number(dynamicProduct.price) };
    }

    try {
      const state = await store.update((data) => {
        if (!Array.isArray(data.carts)) data.carts = [];
        if (!Array.isArray(data.products)) data.products = [];
        let currentCart = data.carts.find((entry) => entry.cartId === cartId);
        if (!currentCart) {
          currentCart = { cartId, items: [] };
          data.carts.push(currentCart);
        }
        const existingItem = currentCart.items.find((item) => item.productId === productId);
        if (existingItem) {
          existingItem.nivelServicioId = level.id;
          existingItem.quantity = quantity;
        } else {
          currentCart.items.push({ productId, nivelServicioId: level.id, quantity });
        }
        return { cart: currentCart, products: data.products };
      });
      const result = presentCart(state.cart, state.products);
      response.json({ success: true, item: result.items.find((item) => item.productId === productId), ...result });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/api/cart/items/:productId', async (request, response, next) => {
    const cartId = readCartId(request);
    if (!cartId) {
      response.status(400).json({ success: false, message: 'Falta un identificador válido del carrito.' });
      return;
    }
    const staticProduct = products[request.params.productId];
    let dynamicProduct;
    if (!staticProduct) {
      try {
        dynamicProduct = (await store.read()).products.find((entry) => entry.id === request.params.productId && entry.active !== false);
      } catch (error) {
        next(error);
        return;
      }
    }
    if (!staticProduct && !dynamicProduct) {
      response.status(404).json({ success: false, message: 'El artículo seleccionado no existe.' });
      return;
    }
    try {
      const state = await store.update((data) => {
        if (!Array.isArray(data.carts)) data.carts = [];
        if (!Array.isArray(data.products)) data.products = [];
        const currentCart = data.carts.find((entry) => entry.cartId === cartId);
        if (currentCart) currentCart.items = currentCart.items.filter((item) => item.productId !== request.params.productId);
        return { cart: currentCart || { cartId, items: [] }, products: data.products };
      });
      response.json({ success: true, ...presentCart(state.cart, state.products) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}