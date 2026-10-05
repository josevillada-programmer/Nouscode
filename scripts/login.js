(() => {
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const authTitle = document.getElementById('authTitle');
const authEyebrow = document.getElementById('authEyebrow');
const authFeedback = document.getElementById('authFeedback');
const authMain = document.querySelector('.auth-main');
const authIntro = document.querySelector('.auth-intro');
const authPanel = document.querySelector('.auth-panel');
const accountDashboard = document.getElementById('accountDashboard');
const accountFeedback = document.getElementById('accountFeedback');
const accountPurchases = document.getElementById('accountPurchases');
const USER_KEY = 'nouscode-user';
const TOKEN_KEY = 'nouscode-auth-token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');
  if (getToken()) headers.set('Authorization', `Bearer ${getToken()}`);
  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    const error = new Error(result.message || 'No se pudo conectar con el servidor.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function setAuthMode(mode) {
  const isSignup = mode === 'signup';

  loginForm.hidden = isSignup;
  signupForm.hidden = !isSignup;
  loginTab.classList.toggle('active', !isSignup);
  signupTab.classList.toggle('active', isSignup);
  loginTab.setAttribute('aria-selected', String(!isSignup));
  signupTab.setAttribute('aria-selected', String(isSignup));
  authTitle.textContent = isSignup ? 'Crear cuenta' : 'Iniciar sesión';
  authEyebrow.textContent = isSignup ? 'Empieza por aquí' : 'Qué bueno tenerte aquí';
  authFeedback.textContent = '';
}

loginTab.addEventListener('click', () => setAuthMode('login'));
signupTab.addEventListener('click', () => setAuthMode('signup'));
document.querySelector('[data-show-signup]').addEventListener('click', () => setAuthMode('signup'));
document.querySelector('[data-show-login]').addEventListener('click', () => setAuthMode('login'));

function renderAccount(user) {
  authIntro.hidden = true;
  authPanel.hidden = true;
  accountDashboard.hidden = false;
  authMain.classList.add('auth-main-account');
  document.getElementById('accountName').textContent = user.username;
  document.getElementById('accountEmail').textContent = user.email;
}

function renderPurchases(purchases) {
  accountPurchases.replaceChildren();
  if (!purchases.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'account-empty';
    emptyMessage.textContent = 'Todavía no tienes compras registradas.';
    accountPurchases.append(emptyMessage);
    return;
  }

  purchases.forEach((purchase) => {
    const article = document.createElement('article');
    article.className = 'account-purchase';
    const summary = document.createElement('div');
    const date = document.createElement('time');
    date.dateTime = purchase.date;
    date.textContent = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(purchase.date));
    const itemNames = document.createElement('p');
    itemNames.textContent = purchase.items.map((item) => `${item.name} · ${item.tier} × ${item.quantity}`).join(', ');
    const total = document.createElement('strong');
    total.textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(purchase.total);
    summary.append(date, itemNames);
    article.append(summary, total);
    accountPurchases.append(article);
  });
}

async function loadPurchases(user) {
  const { purchases } = await apiRequest(`/api/purchases/${encodeURIComponent(user.id)}`);
  renderPurchases(purchases);
}

async function completeAuthentication(form) {
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  authFeedback.textContent = 'Conectando...';
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const data = await apiRequest('/api/login', { method: 'POST', body: JSON.stringify(payload) });
    if (data.success === true && data.user && data.token) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(TOKEN_KEY, data.token);
      window.dispatchEvent(new Event('nouscode:session-changed'));
      window.location.replace('../index.html');
      return;
    }
    throw new Error(data.message || 'El servidor devolvió una respuesta de acceso no válida.');
  } catch (error) {
    authFeedback.textContent = error.message;
    window.alert(error.message);
    submitButton.disabled = false;
    return;
  }

}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  completeAuthentication(loginForm);
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    await apiRequest('/api/logout', { method: 'POST' });
  } catch {
  }
  clearSession();
  window.location.reload();
});

async function restoreSession() {
  const token = getToken();
  const serializedUser = localStorage.getItem(USER_KEY);
  if (!token || !serializedUser) return;
  let user;
  try {
    user = JSON.parse(serializedUser);
    if (new URLSearchParams(window.location.search).get('next') === 'checkout') {
      window.location.replace('checkout.html');
      return;
    }
    await loadPurchases(user);
    renderAccount(user);
  } catch (error) {
    if (error.status === 401 || error instanceof SyntaxError) {
      clearSession();
      window.dispatchEvent(new Event('nouscode:session-changed'));
      return;
    }
    renderAccount(user);
    accountFeedback.textContent = error.message;
  }
}

restoreSession();
})();