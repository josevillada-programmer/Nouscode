const CART_KEY = 'nouscode-cart';
const THEME_KEY = 'nouscode-theme';
const apiBase = document.documentElement.dataset.apiBase.trim().replace(/\/$/, '');
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartOverlay = document.getElementById('cartOverlay');
const cartDrawer = document.getElementById('cartDrawer');
const cartItemsList = document.getElementById('cartItemsList');
const cartPageCount = document.getElementById('cartPageCount');
const cartCount = document.getElementById('cartCount') || cartPageCount;
const cartCountDrawer = document.getElementById('cartCountDrawer');
const subtotalVal = document.getElementById('subtotalVal');
const storeSummary = document.getElementById('storeSummary');
const productGrid = document.getElementById('productGrid');

function toggleCart(open = true) {
  if (!cartOverlay || !cartDrawer) return;

  if (open) {
    cartOverlay.classList.add('active');
    cartDrawer.classList.add('active');
  } else {
    cartOverlay.classList.remove('active');
    cartDrawer.classList.remove('active');
  }
}

if (openCartBtn && closeCartBtn && cartOverlay) {
  openCartBtn.addEventListener('click', () => toggleCart(true));
  closeCartBtn.addEventListener('click', () => toggleCart(false));
  cartOverlay.addEventListener('click', () => toggleCart(false));
}

function updateStoreSummary() {
  if (!storeSummary) return;

  const visibleCount = Array.from(productCards).filter(card => card.style.display !== 'none').length;
  storeSummary.textContent = `Showing ${visibleCount} pieces`;
}

function updateCartUI() {
  if (cartCount) cartCount.textContent = cart.length;
  if (cartCountDrawer) cartCountDrawer.textContent = cart.length;
  if (cartPageCount) cartPageCount.textContent = cart.length;

  const total = cart.reduce((acc, item) => acc + item.price, 0);
  if (subtotalVal) subtotalVal.textContent = `$${total.toLocaleString()}`;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateStoreSummary();

  if (!cartItemsList) return;

  if (cart.length === 0) {
    cartItemsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; margin-top: 40px;">Your bag is currently empty.</p>';
    return;
  }

  cartItemsList.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <img src="assets/images/${item.image}" alt="${item.name}" class="cart-item-img" />
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${item.price}</div>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${idx})" aria-label="Remove item">
        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
      </button>
    </div>
  `).join('');

  lucide.createIcons();
}

function addToCart(name, price, image, productId = null, tier = null, productUrl = null) {
  cart.push({
    id: productId || Date.now(),
    productId: productId || undefined,
    name,
    price,
    image,
    productUrl: productUrl || undefined,
    tier: tier || undefined,
    quantity: 1
  });
  updateCartUI();
  toggleCart(true);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

const themeToggle = document.getElementById('themeToggle');
const searchToggle = document.getElementById('searchToggle');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchClose = document.getElementById('searchClose');
document.documentElement.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  });
}

function filterProductsBySearch() {
  const query = searchInput.value.trim().toLowerCase();

  productCards.forEach(card => {
    const searchableText = card.textContent.toLowerCase();
    card.style.display = !query || searchableText.includes(query) ? 'flex' : 'none';
  });

  updateStoreSummary();
}

searchToggle.addEventListener('click', () => {
  const isOpen = searchForm.classList.toggle('active');
  searchToggle.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) searchInput.focus();
});

searchInput.addEventListener('input', filterProductsBySearch);
searchForm.addEventListener('submit', event => event.preventDefault());
searchClose.addEventListener('click', () => {
  searchInput.value = '';
  filterProductsBySearch();
  searchForm.classList.remove('active');
  searchToggle.setAttribute('aria-expanded', 'false');
});

const filterButtons = document.querySelectorAll('.filter-btn, .nav-menu a');
let productCards = [...document.querySelectorAll('.product-card')];

filterButtons.forEach(btn => {
  btn.addEventListener('click', event => {
    event.preventDefault();

    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    productCards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    updateStoreSummary();
    document.getElementById('store')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function renderDynamicProduct(product) {
  const card = document.createElement('article');
  card.className = 'product-card dynamic-product-card';
  card.dataset.category = product.category;
  card.dataset.productId = product.id;
  card.dataset.productUrl = product.productUrl || '';

  const media = document.createElement('div');
  media.className = 'product-media';
  const badge = document.createElement('span');
  badge.className = 'product-badge';
  badge.textContent = 'Página digital';
  const image = document.createElement('img');
  image.src = product.imageUrl || 'assets/images/hero-nouscode.jpg';
  image.alt = product.title;
  image.addEventListener('error', () => {
    image.src = 'assets/images/hero-nouscode.jpg';
  }, { once: true });
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'quick-add-btn';
  addButton.dataset.dynamicProduct = 'true';
  addButton.dataset.productId = product.id;
  addButton.dataset.name = product.title;
  addButton.dataset.price = String(product.price);
  addButton.dataset.image = product.imageUrl || '';
  addButton.dataset.productUrl = product.productUrl || '';
  addButton.dataset.tier = 'Digital';
  addButton.textContent = 'Agregar';
  media.append(badge, image, addButton);

  const info = document.createElement('div');
  info.className = 'product-info';
  const category = document.createElement('span');
  category.className = 'product-category';
  category.textContent = product.category.replaceAll('-', ' ');
  const title = document.createElement('h3');
  title.className = 'product-title';
  title.textContent = product.title;
  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = `$${Number(product.price).toLocaleString('es-MX')} MXN`;
  const description = document.createElement('p');
  description.className = 'product-description';
  description.textContent = product.description;
  info.append(category, title, price, description);
  card.append(media, info);
  return card;
}

function applyCurrentProductFilters() {
  const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const query = searchInput.value.trim().toLowerCase();
  productCards.forEach((card) => {
    const matchesCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
    const matchesSearch = !query || card.textContent.toLowerCase().includes(query);
    card.style.display = matchesCategory && matchesSearch ? 'flex' : 'none';
  });
  updateStoreSummary();
}

async function loadDynamicProducts() {
  try {
    const response = await fetch(`${apiBase}/api/products`);
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.products)) return;
    result.products.forEach((product) => productGrid.append(renderDynamicProduct(product)));
    productCards = [...productGrid.querySelectorAll('.product-card')];
    applyCurrentProductFilters();
  } catch {
  }
}

productGrid.addEventListener('click', (event) => {
  const quickAddButton = event.target.closest('.quick-add-btn');
  if (quickAddButton) {
    if (quickAddButton.dataset.dynamicProduct === 'true') {
      addToCart(
        quickAddButton.dataset.name,
        Number(quickAddButton.dataset.price),
        quickAddButton.dataset.image,
        quickAddButton.dataset.productId,
        quickAddButton.dataset.tier,
        quickAddButton.dataset.productUrl
      );
      return;
    }
    const productId = quickAddButton.dataset.productId;
    if (productId) window.location.href = `pages/product-detail.html?product=${productId}`;
    return;
  }

  const card = event.target.closest('.product-card');
  if (!card) return;
  if (card.classList.contains('dynamic-product-card')) {
    if (card.dataset.productUrl) window.open(card.dataset.productUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (card.dataset.productId) window.location.href = `pages/product-detail.html?product=${card.dataset.productId}`;
});

const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', event => {
    event.preventDefault();
    const input = newsletterForm.querySelector('.newsletter-input');
    if (input) {
      input.value = '';
      input.placeholder = 'Thanks for joining';
    }
  });
}

updateStoreSummary();
updateCartUI();
loadDynamicProducts();
lucide.createIcons();
