const CART_KEY = 'nouscode-cart';
const THEME_KEY = 'nouscode-theme';
const USER_KEY = 'nouscode-user';
const TOKEN_KEY = 'nouscode-auth-token';
const CART_ID_KEY = 'nouscode-cart-id';
const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
const getValidQuantity = (value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10 ? Number(value) : null;
const cartHasInvalidQuantity = cart.some((item) => getValidQuantity(item.quantity ?? 1) === null);
const total = cart.reduce((sum, item) => sum + Number(item.price) * (getValidQuantity(item.quantity ?? 1) || 0), 0);
const paymentFields = document.getElementById('paymentFields');
const checkoutContent = document.getElementById('checkoutContent');
const emptyCheckout = document.getElementById('emptyCheckout');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutSubmitButton = checkoutForm.querySelector('[type="submit"]');
const selectedPaymentMethodInput = document.getElementById('selectedPaymentMethod');
const checkoutError = document.getElementById('checkoutError');
const paymentButtons = document.querySelectorAll('[data-method]');
let selectedPaymentMethod = selectedPaymentMethodInput.value;

let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
} catch {
  localStorage.removeItem(USER_KEY);
}

if (currentUser) {
  checkoutForm.elements.name.value = currentUser.username || '';
  checkoutForm.elements.email.value = currentUser.email || '';
}

function renderOrder() {
  if (!cart.length) {
    checkoutContent.classList.add('hidden');
    emptyCheckout.classList.remove('hidden');
    return;
  }
  if (cartHasInvalidQuantity) {
    checkoutError.textContent = 'No se puede continuar: cada artículo debe tener entre 1 y 10 piezas.';
    checkoutError.classList.remove('hidden');
    checkoutSubmitButton.disabled = true;
  }
  const orderItems = document.getElementById('orderItems');
  orderItems.replaceChildren();
  cart.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'commerce-order-item';
    const details = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const tier = document.createElement('small');
    tier.textContent = `${item.tier || 'Servicio seleccionado'} · Cantidad: ${getValidQuantity(item.quantity ?? 1) || 'inválida'}`;
    details.append(name, tier);
    const lineTotal = document.createElement('strong');
    lineTotal.textContent = money(Number(item.price) * (getValidQuantity(item.quantity ?? 1) || 0));
    row.append(details, lineTotal);
    orderItems.append(row);
  });
  document.getElementById('orderTotal').textContent = money(total);
}

function renderPaymentFields(method = selectedPaymentMethod) {
  const fields = {
    card: '<div class="commerce-payment-note"><i data-lucide="info"></i><p>La pasarela de cobro no está configurada. El pedido se guardará sin procesar un pago.</p></div>',
    transfer: '<div class="commerce-payment-note"><i data-lucide="landmark"></i><p>Al confirmar te compartiremos los datos para realizar tu transferencia SPEI. El pedido quedará pendiente de verificación.</p></div>',
    wallet: '<div class="commerce-payment-note"><i data-lucide="wallet"></i><p>Te enviaremos a una ventana segura de PayPal o Mercado Pago para autorizar el pago.</p></div>',
    'family-card': '<div class="commerce-payment-note"><i data-lucide="heart-handshake"></i><p>Este método requiere la autorización de quien te presta su tarjeta. La confirmación final queda sujeta a que esa persona diga que sí.</p></div>',
    'bestie-photo': '<div class="commerce-payment-note"><i data-lucide="camera"></i><p>Una opción creativa para compartir tu pedido. Las fotografías no se aceptan como moneda de pago real.</p></div>',
    'good-vibes': '<div class="commerce-payment-note"><i data-lucide="sparkles"></i><p>Las buenas vibras acompañan el pedido, pero no sustituyen un pago real. Elige un método tradicional para completar la compra.</p></div>',
    'pay-tomorrow': '<label class="commerce-promise"><input required type="checkbox" name="payTomorrowPromise" /><span>Confirmo que pagaré mañana. El pedido quedará pendiente hasta verificar el pago.</span></label>',
    'trust-god': '<label class="commerce-promise"><input required type="checkbox" name="trustGod" /><span>Entiendo que esta opción es simbólica y no representa un pago real.</span></label>'
  };
  paymentFields.innerHTML = fields[method];
  lucide.createIcons();
}

paymentButtons.forEach((button) => button.addEventListener('click', () => {
  selectedPaymentMethod = button.dataset.method;
  selectedPaymentMethodInput.value = selectedPaymentMethod;
  paymentButtons.forEach((item) => {
    item.classList.remove('active');
    item.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  checkoutError.classList.add('hidden');
  renderPaymentFields(selectedPaymentMethod);
}));

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = localStorage.getItem(TOKEN_KEY);
  if (!currentUser?.id || !token) {
    window.location.assign('login.html?next=checkout');
    return;
  }
  if (cartHasInvalidQuantity) {
    checkoutError.textContent = 'No se puede continuar: cada artículo debe tener entre 1 y 10 piezas.';
    checkoutError.classList.remove('hidden');
    return;
  }
  const orderPayload = {
    userId: currentUser.id,
    date: new Date().toISOString(),
    items: cart.map((item) => ({
      id: item.productId || item.id,
      tier: item.tier,
      quantity: getValidQuantity(item.quantity ?? 1)
    })),
    total
  };
  checkoutError.classList.add('hidden');
  checkoutSubmitButton.disabled = true;
  try {
    const response = await fetch('/api/purchases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Cart-Id': localStorage.getItem(CART_ID_KEY) || ''
      },
      body: JSON.stringify(orderPayload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true || !result.purchase?.id) {
      throw new Error(result.message || 'No se pudo guardar la compra.');
    }
    localStorage.removeItem(CART_KEY);
    window.location.assign('perfil.html');
  } catch (error) {
    checkoutError.textContent = error.message || 'No se pudo conectar con el servidor.';
    checkoutError.classList.remove('hidden');
    window.alert(error.message || 'No se pudo confirmar el pedido. Inténtalo de nuevo.');
    checkoutSubmitButton.disabled = false;
  }
});

document.documentElement.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark');
document.getElementById('themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
});
renderOrder();
renderPaymentFields();
lucide.createIcons();
