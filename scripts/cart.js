const CART_KEY = 'nouscode-cart';
const CART_ID_KEY = 'nouscode-cart-id';
const THEME_KEY = 'nouscode-theme';
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const itemCount = document.getElementById('itemCount');
const cartError = document.getElementById('cartError');
const checkoutButton = document.getElementById('checkoutButton');
const apiBase = document.documentElement.dataset.apiBase.trim().replace(/\/$/, '');
const cartApiUrl = `${apiBase}${cartItems.dataset.apiUrl}`;
const serviceLevelsApiUrl = `${apiBase}${cartItems.dataset.serviceLevelsUrl}`;
const cartId = localStorage.getItem(CART_ID_KEY) || crypto.randomUUID();
const serverServiceLevels = {};
let cartApiAvailable = false;
localStorage.setItem(CART_ID_KEY, cartId);
const serviceTiers = [
  { id: 'basico', label: 'Básico' },
  { id: 'medio', label: 'Medio' },
  { id: 'avanzado', label: 'Avanzado' }
];
const productPrices = {
  'plantilla-1': { basico: 2500, medio: 4000, avanzado: 6500 },
  'plantilla-2': { basico: 2500, medio: 4000, avanzado: 6500 },
  'plantilla-3': { basico: 5000, medio: 7500, avanzado: 11000 },
  'plantilla-4': { basico: 7000, medio: 10500, avanzado: 15000 },
  'plantilla-5': { basico: 1500, medio: 2500, avanzado: 4000 },
  'plantilla-6': { basico: 4000, medio: 6500, avanzado: 10000 }
};

const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
const getProductId = (item) => item.productId || (item.name.match(/Plantilla\s+([1-6])/i)?.[1] ? `plantilla-${item.name.match(/Plantilla\s+([1-6])/i)[1]}` : '');
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const getCartImageSource = (image) => {
  if (!image) return '../assets/images/hero-nouscode.jpg';
  if (/^https?:\/\//i.test(image)) return image;
  return `../assets/images/${String(image).replace(/^\/+/, '').replace(/^assets\/images\//, '')}`;
};
const normalizeLevel = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const validQuantity = (value) => {
  const quantity = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 10 ? quantity : null;
};
const getTierId = (tier) => serviceTiers.find((option) => option.label.toLowerCase() === String(tier || '').toLowerCase())?.id || 'medio';
const getServerLevel = (productId, tier) => serverServiceLevels[productId]?.find((level) => normalizeLevel(level.label) === normalizeLevel(tier));

async function requestCartApi(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      'X-Cart-Id': cartId,
      ...options.headers
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || 'No se pudo actualizar el carrito.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function getUnitPrice(item, tier = item.tier) {
  const serverLevel = getServerLevel(getProductId(item), tier);
  if (cartApiAvailable && serverLevel) return Number(serverLevel.price);
  return productPrices[getProductId(item)]?.[getTierId(tier)] ?? (Number(item.price) || 0);
}

function showCartError(message) {
  cartError.textContent = message;
  cartError.classList.remove('hidden');
}

function fromServerItem(item) {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    image: item.image,
    productUrl: item.productUrl,
    tier: item.tier,
    nivelServicioId: item.nivelServicioId,
    price: Number(item.price),
    quantity: Number(item.quantity)
  };
}

function renderCart() {
  const storedCart = getCart();
  const hasInvalidQuantity = storedCart.some((item) => validQuantity(item.quantity ?? 1) === null);
  const cart = storedCart.map((item) => {
    const productId = getProductId(item);
    const tier = productPrices[productId]
      ? serviceTiers.find((option) => option.id === getTierId(item.tier)).label
      : item.tier;
    return {
      ...item,
      productId,
      tier,
      quantity: validQuantity(item.quantity ?? 1) || 1,
      price: getUnitPrice(item, tier)
    };
  });
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  itemCount.textContent = `${totalQuantity} ${totalQuantity === 1 ? 'artículo' : 'artículos'}`;
  cartTotal.textContent = money(total);
  checkoutButton.disabled = !cart.length || hasInvalidQuantity;
  cartError.classList.toggle('hidden', !hasInvalidQuantity);
  if (hasInvalidQuantity) {
    cartError.textContent = 'La cantidad de cada artículo debe ser un número entero entre 1 y 10.';
  } else if (!cartApiAvailable) {
    cartError.textContent = 'Modo local: el servidor no está conectado y no puede aplicar la validación segura.';
    cartError.classList.remove('hidden');
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } else {
    cartError.classList.add('hidden');
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  if (!cart.length) {
    cartItems.innerHTML = '<div class="commerce-empty-cart"><i data-lucide="shopping-bag"></i><p>Tu carrito todavía está vacío.</p><a href="../index.html">Descubrir plantillas <span aria-hidden="true">→</span></a></div>';
    lucide.createIcons();
    return;
  }

  cartItems.innerHTML = cart.map((item, index) => {
    const productId = getProductId(item);
    const prices = productPrices[productId];
    const availableServerLevels = serverServiceLevels[productId] || [];
    const tierOptions = cartApiAvailable && availableServerLevels.length
      ? availableServerLevels.map((level) => `<option value="${level.id}" ${Number(item.nivelServicioId) === Number(level.id) ? 'selected' : ''}>${level.label} · ${money(level.price)}</option>`).join('')
      : prices
        ? serviceTiers.map((tier) => `<option value="${tier.id}" ${getTierId(item.tier) === tier.id ? 'selected' : ''}>${tier.label} · ${money(prices[tier.id])}</option>`).join('')
        : '';

    return `
      <article class="commerce-cart-item">
        <a href="${productPrices[productId] ? `product-detail.html?product=${encodeURIComponent(productId)}` : item.productUrl ? escapeHTML(item.productUrl) : '../index.html'}" class="commerce-cart-product" aria-label="Ver ${escapeHTML(item.name)}" ${item.productUrl ? 'target="_blank" rel="noopener noreferrer"' : ''}>
          <img src="${escapeHTML(getCartImageSource(item.image))}" alt="${escapeHTML(item.name)}" class="commerce-cart-image" />
          <span class="commerce-cart-copy"><strong class="commerce-cart-name">${escapeHTML(item.name)}</strong><span class="commerce-cart-tier">${escapeHTML(item.tier || 'Servicio seleccionado')}</span></span>
        </a>
        <div class="commerce-cart-controls">
          ${prices ? `<label class="commerce-cart-tier"><span>Nivel</span><select data-tier-index="${index}" aria-label="Nivel de servicio para ${item.name}">${tierOptions}</select></label>` : ''}
          <div class="commerce-quantity-stepper" role="group" aria-label="Cantidad de ${item.name}">
            <button type="button" data-quantity-delta="-1" data-index="${index}" aria-label="Reducir cantidad de ${item.name}"><i data-lucide="minus"></i></button>
            <input type="number" min="1" max="10" step="1" value="${item.quantity}" data-quantity-index="${index}" aria-label="Cantidad de ${item.name}" />
            <button type="button" data-quantity-delta="1" data-index="${index}" aria-label="Aumentar cantidad de ${item.name}" ${item.quantity >= 10 ? 'disabled' : ''}><i data-lucide="plus"></i></button>
          </div>
        </div>
        <div class="commerce-cart-pricing" aria-live="polite">
          <span class="commerce-cart-unit-price">${money(item.price)} / unidad</span>
          <strong class="commerce-cart-price">${money(item.price * item.quantity)}</strong>
          <span class="commerce-cart-line-label">Total del artículo</span>
        </div>
        <button type="button" data-remove="${index}" class="commerce-remove-button" aria-label="Eliminar ${item.name}" title="Eliminar"><i data-lucide="trash-2"></i></button>
      </article>
    `;
  }).join('');

  lucide.createIcons();
}

async function updateCartItem(index, update) {
  const cart = getCart();
  if (!cart[index]) return;
  const previousItem = { ...cart[index] };
  update(cart[index]);
  const quantity = validQuantity(cart[index].quantity);
  if (quantity === null) {
    renderCart();
    showCartError('Ingresa un número entero entre 1 y 10.');
    return;
  }
  cart[index].quantity = quantity;

  if (cartApiAvailable) {
    const productId = getProductId(cart[index]);
    const selectedLevel = getServerLevel(productId, cart[index].tier);
    const nivelServicioId = Number(cart[index].nivelServicioId || selectedLevel?.id);
    try {
      const result = await requestCartApi(`${cartApiUrl}/items/${encodeURIComponent(productId)}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity, nivel_servicio_id: nivelServicioId })
      });
      Object.assign(cart[index], fromServerItem(result.item));
    } catch (error) {
      cart[index] = previousItem;
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      renderCart();
      showCartError(error.message);
      return;
    }
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

cartItems.addEventListener('click', async (event) => {
  const removeButton = event.target.closest('[data-remove]');
  if (removeButton) {
    const cart = getCart();
    const [removed] = cart.splice(Number(removeButton.dataset.remove), 1);
    if (cartApiAvailable) {
      try {
        const result = await requestCartApi(`${cartApiUrl}/items/${encodeURIComponent(getProductId(removed))}`, { method: 'DELETE' });
        localStorage.setItem(CART_KEY, JSON.stringify(result.items.map(fromServerItem)));
      } catch (error) {
        renderCart();
        showCartError(error.message);
        return;
      }
    } else {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
    renderCart();
    return;
  }

  const quantityButton = event.target.closest('[data-quantity-delta]');
  if (!quantityButton) return;
  const index = Number(quantityButton.dataset.index);
  const item = getCart()[index];
  const quantity = validQuantity(item?.quantity ?? 1);
  const nextQuantity = quantity === null ? null : quantity + Number(quantityButton.dataset.quantityDelta);
  if (nextQuantity === null || !validQuantity(nextQuantity)) {
    checkoutButton.disabled = true;
    cartError.textContent = 'Solo puedes agregar entre 1 y 10 piezas por artículo.';
    cartError.classList.remove('hidden');
    return;
  }
  updateCartItem(index, (cartItem) => { cartItem.quantity = nextQuantity; });
});

cartItems.addEventListener('change', (event) => {
  const tierSelect = event.target.closest('[data-tier-index]');
  if (tierSelect) {
    const index = Number(tierSelect.dataset.tierIndex);
    updateCartItem(index, (item) => {
      if (cartApiAvailable) {
        const level = (serverServiceLevels[getProductId(item)] || []).find((option) => Number(option.id) === Number(tierSelect.value));
        if (!level) return;
        item.tier = level.label;
        item.nivelServicioId = Number(level.id);
        item.price = Number(level.price);
        return;
      }
      const selectedTier = serviceTiers.find((tier) => tier.id === tierSelect.value);
      if (selectedTier) {
        item.tier = selectedTier.label;
        item.price = getUnitPrice(item, selectedTier.label);
      }
    });
    return;
  }

  const quantityInput = event.target.closest('[data-quantity-index]');
  if (quantityInput) {
    const quantity = validQuantity(quantityInput.value);
    if (quantity === null) {
      renderCart();
      checkoutButton.disabled = true;
      cartError.textContent = 'Ingresa un número entero entre 1 y 10. No se aceptan cantidades mayores.';
      cartError.classList.remove('hidden');
      return;
    }
    updateCartItem(Number(quantityInput.dataset.quantityIndex), (item) => { item.quantity = quantity; });
  }
});

async function initializeCartApi() {
  renderCart();
  try {
    const localCart = getCart();
    let serverCart = await requestCartApi(cartApiUrl);
    const productIds = new Set([
      ...localCart.map(getProductId),
      ...serverCart.items.map((item) => item.productId)
    ].filter(Boolean));

    await Promise.all([...productIds].map(async (productId) => {
      const result = await requestCartApi(`${serviceLevelsApiUrl}/${encodeURIComponent(productId)}`);
      serverServiceLevels[productId] = result.levels;
    }));
    cartApiAvailable = true;

    if (localCart.length) {
      const itemsByProduct = new Map();
      for (const item of localCart) {
        const productId = getProductId(item);
        const quantity = validQuantity(item.quantity ?? 1);
        const level = getServerLevel(productId, item.tier);
        if (!quantity) throw new Error('La cantidad debe ser un entero entre 1 y 10 antes de sincronizar.');
        if (!level) throw new Error('El nivel de servicio del carrito no está disponible en el servidor.');
        const current = itemsByProduct.get(productId);
        const combinedQuantity = quantity + (current?.quantity || 0);
        if (!validQuantity(combinedQuantity)) throw new Error('No puedes tener más de 10 piezas del mismo artículo.');
        itemsByProduct.set(productId, { productId, quantity: combinedQuantity, level });
      }

      for (const item of itemsByProduct.values()) {
        await requestCartApi(`${cartApiUrl}/items/${encodeURIComponent(item.productId)}`, {
          method: 'PUT',
          body: JSON.stringify({ quantity: item.quantity, nivel_servicio_id: item.level.id })
        });
      }
      serverCart = await requestCartApi(cartApiUrl);
    }

    localStorage.setItem(CART_KEY, JSON.stringify(serverCart.items.map(fromServerItem)));
  } catch (error) {
    cartApiAvailable = false;
    renderCart();
    if (error.status === 400 || error.status === 422 || error.message.includes('más de 10') || error.message.includes('entero')) {
      showCartError(error.message);
    }
    return;
  }

  renderCart();
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark');
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
});
document.getElementById('checkoutButton').addEventListener('click', () => {
  if (!getCart().length) return;
  window.location.href = 'checkout.html';
});
applyTheme();
initializeCartApi();
lucide.createIcons();
