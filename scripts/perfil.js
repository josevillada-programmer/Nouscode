const USER_KEY = 'nouscode-user';
const TOKEN_KEY = 'nouscode-auth-token';
const apiBase = document.documentElement.dataset.apiBase.trim().replace(/\/$/, '');
const profileStatus = document.getElementById('profileStatus');
const profilePurchases = document.getElementById('profilePurchases');
const profileUser = document.getElementById('profileUser');

function formatMoney(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
}

function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function renderPurchase(purchase) {
  const article = document.createElement('article');
  article.className = 'profile-purchase';

  const heading = document.createElement('div');
  heading.className = 'profile-purchase-heading';

  const date = document.createElement('time');
  date.dateTime = purchase.date;
  date.textContent = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(purchase.date));

  const purchaseId = document.createElement('span');
  purchaseId.textContent = `Pedido ${purchase.id.slice(0, 8)}`;
  heading.append(date, purchaseId);

  const items = document.createElement('ul');
  items.className = 'profile-purchase-items';
  purchase.items.forEach((item) => {
    const row = document.createElement('li');
    const description = document.createElement('span');
    description.textContent = `${item.name} · ${item.tier} × ${item.quantity}`;
    const lineTotal = document.createElement('strong');
    lineTotal.textContent = formatMoney(item.lineTotal ?? item.price * item.quantity);
    row.append(description, lineTotal);
    items.append(row);
  });

  const total = document.createElement('div');
  total.className = 'profile-purchase-total';
  const totalLabel = document.createElement('span');
  totalLabel.textContent = 'Total';
  const totalAmount = document.createElement('strong');
  totalAmount.textContent = formatMoney(purchase.total);
  total.append(totalLabel, totalAmount);
  article.append(heading, items, total);
  return article;
}

async function loadProfile() {
  const token = localStorage.getItem(TOKEN_KEY);
  let user;
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    clearSession();
  }

  if (!token || !user?.id) {
    window.location.replace('login.html');
    return;
  }

  profileUser.textContent = `${user.username} · ${user.email}`;
  try {
    const response = await fetch(`${apiBase}/api/purchases/${encodeURIComponent(user.id)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      if (response.status === 401 || response.status === 403) clearSession();
      throw new Error(result.message || 'No se pudo cargar el historial.');
    }

    profilePurchases.replaceChildren();
    if (!result.purchases.length) {
      profileStatus.textContent = 'Todavía no tienes compras registradas.';
      return;
    }

    result.purchases.forEach((purchase) => profilePurchases.append(renderPurchase(purchase)));
    profileStatus.textContent = `${result.purchases.length} ${result.purchases.length === 1 ? 'compra registrada' : 'compras registradas'}`;
  } catch (error) {
    profileStatus.textContent = error.message;
  }
}

document.getElementById('profileLogout').addEventListener('click', async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    await fetch(`${apiBase}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch {
  }
  clearSession();
  window.location.replace('login.html');
});

loadProfile();