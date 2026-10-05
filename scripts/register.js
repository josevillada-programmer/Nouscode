(() => {
const registerForm = document.getElementById('signupForm');
const registerFeedback = document.getElementById('authFeedback');
const registerSubmitButton = registerForm.querySelector('[type="submit"]');
const USER_KEY = 'nouscode-user';
const TOKEN_KEY = 'nouscode-auth-token';

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerSubmitButton.disabled = true;
  registerFeedback.textContent = 'Creando cuenta...';
  const formData = new FormData(registerForm);
  const payload = {
    name: String(formData.get('name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || '')
  };

  try {
    let response;
    try {
      response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    }
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.success === true && data.user && data.token) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(TOKEN_KEY, data.token);
      window.dispatchEvent(new Event('nouscode:session-changed'));
      window.location.replace('../index.html');
      return;
    }
    throw new Error(data.message || 'No se pudo crear la cuenta.');
  } catch (error) {
    registerFeedback.textContent = error.message || 'No se pudo conectar con el servidor.';
    window.alert(error.message || 'No se pudo crear la cuenta.');
    registerSubmitButton.disabled = false;
  }
});
})();