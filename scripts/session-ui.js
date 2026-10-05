(() => {
const USER_KEY = 'nouscode-user';
const TOKEN_KEY = 'nouscode-auth-token';
const apiBase = document.documentElement.dataset.apiBase.trim().replace(/\/$/, '');
const adminPanel = document.getElementById('adminPanel');
const adminFeedback = document.getElementById('adminFeedback');
const adminProductList = document.getElementById('adminProductList');

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function getAccountLink() {
  let link = document.querySelector('.account-action');
  if (link) return link;

  const parent = document.querySelector('.nav-actions, .commerce-header-actions, .profile-header-actions, .auth-header');
  if (!parent) return null;

  link = document.createElement('a');
  link.className = 'account-action session-account-action';
  parent.append(link);
  return link;
}

function updateAccountLink(user) {
  const link = getAccountLink();
  if (!link) return;

  let label = link.querySelector('.account-label');
  if (!label) {
    link.replaceChildren();
    label = document.createElement('span');
    label.className = 'account-label';
    link.append(label);
  }

  const inPagesDirectory = window.location.pathname.split('/').includes('pages');
  label.textContent = user?.email || 'Log in / Sign in';
  link.href = user
    ? `${inPagesDirectory ? '' : 'pages/'}perfil.html`
    : `${inPagesDirectory ? '' : 'pages/'}login.html`;
  link.title = user?.email || 'Iniciar sesión';
  link.setAttribute('aria-label', user ? `Cuenta de ${user.email}` : 'Iniciar sesión');
}

async function adminRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`);
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.message || 'No se pudo completar la operación.');
  return result;
}

function renderProducts(products) {
  adminProductList.replaceChildren();
  if (!products.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'admin-empty-state';
    emptyMessage.textContent = 'Todavía no hay productos publicados.';
    adminProductList.append(emptyMessage);
    return;
  }

  products.forEach((product) => {
    const article = document.createElement('article');
    article.className = 'admin-product';
    const details = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = product.title;
    const category = document.createElement('span');
    category.textContent = product.category;
    const price = document.createElement('strong');
    price.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.price);
    const description = document.createElement('p');
    description.textContent = product.description;
    details.append(title, category, price, description);
    if (product.productUrl) {
      const productLink = document.createElement('a');
      productLink.href = product.productUrl;
      productLink.target = '_blank';
      productLink.rel = 'noopener noreferrer';
      productLink.textContent = 'Abrir enlace';
      details.append(productLink);
    }
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'admin-remove-product';
    removeButton.dataset.productId = product.id;
    removeButton.textContent = 'Eliminar';
    article.append(details, removeButton);
    adminProductList.append(article);
  });
}

async function loadAdminPanel() {
  if (!adminPanel) return;
  adminPanel.hidden = false;
  try {
    const [overviewResult, productsResult] = await Promise.all([
      adminRequest('/api/admin/overview'),
      adminRequest('/api/products')
    ]);
    document.getElementById('adminUserCount').textContent = overviewResult.overview.users;
    document.getElementById('adminPurchaseCount').textContent = overviewResult.overview.purchases;
    document.getElementById('adminProductCount').textContent = overviewResult.overview.products;
    renderProducts(productsResult.products);
  } catch (error) {
    adminFeedback.textContent = error.message;
  }
}

async function syncSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const savedUser = getSavedUser();
  updateAccountLink(token ? savedUser : null);
  if (adminPanel) adminPanel.hidden = true;
  if (!token) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  try {
    const response = await fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.user) {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      updateAccountLink(null);
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    updateAccountLink(result.user);
    if (result.user.isAdmin) await loadAdminPanel();
  } catch {
    if (adminPanel) adminPanel.hidden = true;
  }
}

if (adminPanel) {
  document.getElementById('adminProductForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    adminFeedback.textContent = 'Guardando...';
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      await adminRequest('/api/products', { method: 'POST', body: JSON.stringify(body) });
      form.reset();
      adminFeedback.textContent = 'Producto publicado.';
      await loadAdminPanel();
    } catch (error) {
      adminFeedback.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  adminProductList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-product-id]');
    if (!button) return;
    button.disabled = true;
    try {
      await adminRequest(`/api/products/${encodeURIComponent(button.dataset.productId)}`, { method: 'DELETE' });
      adminFeedback.textContent = 'Producto eliminado.';
      await loadAdminPanel();
    } catch (error) {
      button.disabled = false;
      adminFeedback.textContent = error.message;
    }
  });
}

window.addEventListener('nouscode:session-changed', syncSession);
syncSession();
})();