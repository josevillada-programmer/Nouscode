(() => {
const registerForm = document.getElementById('signupForm');
const registerFeedback = document.getElementById('authFeedback');
const registerSubmitButton = registerForm.querySelector('[type="submit"]');
const apiBase = document.documentElement.dataset.apiBase.trim().replace(/\/$/, '');
const USER_KEY = 'nouscode-user';
const TOKEN_KEY = 'nouscode-auth-token';

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerSubmitButton.disabled = true;
  registerFeedback.textContent = 'Creando cuenta...';
  const formData = new FormData(registerForm);
  const payload = {
    username: String(formData.get('name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || '')
  };

  try {
    const response = await fetch(`${apiBase}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.user || !result.token) {
      throw new Error(result.message || 'No se pudo crear la cuenta.');
    }

    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    localStorage.setItem(TOKEN_KEY, result.token);
    window.dispatchEvent(new Event('nouscode:session-changed'));
    const nextPage = new URLSearchParams(window.location.search).get('next');
    window.location.replace(nextPage === 'checkout' ? 'checkout.html' : 'perfil.html');
  } catch (error) {
    registerFeedback.textContent = error.message || 'No se pudo conectar con el servidor.';
    registerSubmitButton.disabled = false;
  }
});
})();