const products = [
  {
    id: 'plantilla-1',
    name: 'Plantilla 1',
    category: 'Corporativo',
    summary: 'Diseños institucionales con identidad visual sólida para empresas, startups y servicios profesionales.',
    badge: 'Top seller',
    images: ['plantilla1.jpeg'],
    tiers: {
      basico: {
        label: 'Básico',
        price: 2500,
        features: ['Estructura visual estática en HTML/CSS', 'Diseño responsive', 'Secciones principales: Inicio, Servicios, Contacto']
      },
      medio: {
        label: 'Medio',
        price: 4000,
        features: ['Componentes interactivos', 'Animaciones limpias', 'Formularios funcionales', 'SEO básico']
      },
      avanzado: {
        label: 'Avanzado',
        price: 6500,
        features: ['Integración con backend', 'Panel administrativo básico', 'Base de datos persistente', 'Capacidades de gestión']
      }
    }
  },
  {
    id: 'plantilla-2',
    name: 'Plantilla 2',
    category: 'Corporativo',
    summary: 'Una segunda propuesta corporativa para presentar servicios, equipos y soluciones con una imagen profesional.',
    badge: 'Corporativo',
    images: ['plantilla2.jpeg'],
    tiers: {
      basico: {
        label: 'Básico',
        price: 2500,
        features: ['Estructura visual estática en HTML/CSS', 'Diseño responsive', 'Secciones principales: Inicio, Servicios, Contacto']
      },
      medio: {
        label: 'Medio',
        price: 4000,
        features: ['Componentes interactivos', 'Animaciones limpias', 'Formularios funcionales', 'SEO básico']
      },
      avanzado: {
        label: 'Avanzado',
        price: 6500,
        features: ['Integración con backend', 'Panel administrativo básico', 'Base de datos persistente', 'Capacidades de gestión']
      }
    }
  },
  {
    id: 'plantilla-3',
    name: 'Plantilla 3',
    category: 'E-commerce',
    summary: 'Tienda moderna para vender productos con experiencia visual orientada a conversiones y catálogo atractivo.',
    badge: 'Venta online',
    images: ['plantilla3.jpeg'],
    tiers: {
      basico: {
        label: 'Básico',
        price: 5000,
        features: ['Catálogo estático', 'Diseño de tienda', 'Carrito visual', 'Sin pasarela real']
      },
      medio: {
        label: 'Medio',
        price: 7500,
        features: ['Carrito funcional', 'Gestión de stock local', 'Optimización para conversiones', 'UX enfocada en compra']
      },
      avanzado: {
        label: 'Avanzado',
        price: 11000,
        features: ['Pasarela de pagos simulada', 'Panel de órdenes', 'Gestión de base de datos', 'Administración completa']
      }
    }
  },
  {
    id: 'plantilla-4',
    name: 'Plantilla 4',
    category: 'Aplicación Móvil',
    summary: 'Prototipos y apps móviles con interfaces premium y experiencia de usuario enfocada en fintech, gestión y dashboards.',
    badge: 'Mobile first',
    images: ['plantilla4.jpeg'],
    tiers: {
      basico: {
        label: 'Básico',
        price: 7000,
        features: ['Prototipo interactivo', 'Dashboard principal', 'Transacciones y teclado numérico', 'Vista mobile high fidelity']
      },
      medio: {
        label: 'Medio',
        price: 10500,
        features: ['Frontend responsivo', 'Estructura con Capacitor/Tailwind', 'Listo para compilar', 'UX funcional']
      },
      avanzado: {
        label: 'Avanzado',
        price: 15000,
        features: ['Conexión a APIs', 'Autenticación de usuarios', 'Persistencia de estados', 'Aplicación completa']
      }
    }
  },
  {
    id: 'plantilla-5',
    name: 'Plantilla 5',
    category: 'Landing Page',
    summary: 'Páginas enfocadas en conversión con fuerte jerarquía visual y llamados a la acción claros.',
    badge: 'Conversión',
    images: ['plantilla5.jpeg'],
    tiers: {
      basico: {
        label: 'Básico',
        price: 1500,
        features: ['Sección vertical estilizada', 'CTA principal', 'Diseño minimalista', 'Estructura clara']
      },
      medio: {
        label: 'Medio',
        price: 2500,
        features: ['Animaciones al hacer scroll', 'Formulario integrado', 'Captura de leads', 'Diseño más dinámico']
      },
      avanzado: {
        label: 'Avanzado',
        price: 4000,
        features: ['Velocidad optimizada', 'Pruebas A/B', 'Despliegue automatizado', 'Optimización profesional']
      }
    }
  },
  {
    id: 'plantilla-6',
    name: 'Plantilla 6',
    category: 'Dashboard',
    summary: 'Paneles analíticos y administrativos para controlar métricas, reportes y operaciones en tiempo real.',
    badge: 'Analytics',
    images: ['plantilla6.jpeg'],
    tiers: {
      basico: {
        label: 'Básico',
        price: 4000,
        features: ['Panel estático', 'Tablas e indicadores', 'Diseño base de métricas', 'Visualización clara']
      },
      medio: {
        label: 'Medio',
        price: 6500,
        features: ['Gráficas interactivas', 'Filtros de datos', 'Componentes modulares', 'UX de administración']
      },
      avanzado: {
        label: 'Avanzado',
        price: 10000,
        features: ['Gestión de roles', 'Reportes exportables', 'Consumo de APIs', 'Sistema completo']
      }
    }
  }
];

const miniCartCount = document.getElementById('miniCartCount');
const CART_KEY = 'nouscode-cart';
const THEME_KEY = 'nouscode-theme';
const mainImage = document.getElementById('mainImage');
const thumbsContainer = document.getElementById('thumbsContainer');
const productBadge = document.getElementById('productBadge');
const productCategory = document.getElementById('productCategory');
const productName = document.getElementById('productName');
const productSummary = document.getElementById('productSummary');
const productTitle = document.getElementById('productTitle');
const tierButtons = document.getElementById('tierButtons');
const featureList = document.getElementById('featureList');
const priceValue = document.getElementById('priceValue');
const detailToast = document.getElementById('detailToast');
const toastTitle = document.getElementById('toastTitle');
const toastMessage = document.getElementById('toastMessage');
let toastTimer;

const requestedProduct = new URLSearchParams(window.location.search).get('product');
let selectedProductId = products.some((product) => product.id === requestedProduct) ? requestedProduct : 'plantilla-1';
let selectedTier = 'medio';
let cartCount = JSON.parse(localStorage.getItem(CART_KEY) || '[]').reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
miniCartCount.textContent = cartCount;

const formatMoney = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

function showToast(title, message) {
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  detailToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => detailToast.classList.remove('show'), 5000);
}

function renderProductSelector() {
  const product = products.find((item) => item.id === selectedProductId);
  if (!product) return;

  const tierData = product.tiers[selectedTier];

  productBadge.textContent = product.badge;
  productCategory.textContent = product.category;
  productName.textContent = product.name;
  productSummary.textContent = product.summary;
  productTitle.textContent = `${product.name} · ${tierData.label}`;

  mainImage.src = `../assets/images/${product.images[0]}`;

  thumbsContainer.innerHTML = product.images
    .map((image, index) => {
      const isActive = index === 0;
      return `
        <button class="product-thumb ${isActive ? 'active' : ''}" data-image="${image}" aria-label="Vista ${index + 1}" aria-pressed="${isActive}">
          <img src="../assets/images/${image}" alt="Miniatura ${index + 1}" />
        </button>
      `;
    })
    .join('');

  thumbsContainer.querySelectorAll('.thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const selected = thumb.dataset.image;
      mainImage.src = `../assets/images/${selected}`;
      thumbsContainer.querySelectorAll('.product-thumb').forEach((item) => {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
      });
      thumb.classList.add('active');
      thumb.setAttribute('aria-pressed', 'true');
    });
  });

  const tierEntries = Object.entries(product.tiers);
  tierButtons.innerHTML = tierEntries
    .map(([key, item]) => {
      const active = key === selectedTier ? 'active' : '';
      return `
        <button type="button" data-tier="${key}" aria-pressed="${key === selectedTier}" class="tier-btn ${active}">
          <span>${item.label}</span>
          <strong>${formatMoney(item.price)}</strong>
        </button>
      `;
    })
    .join('');

  tierButtons.querySelectorAll('.tier-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectedTier = button.dataset.tier;
      renderProductSelector();
    });
  });

  featureList.innerHTML = tierData.features
    .map((feature) => `
      <li class="product-feature">
        <i data-lucide="check"></i>
        <span>${feature}</span>
      </li>
    `)
    .join('');

  priceValue.textContent = formatMoney(tierData.price);
  lucide.createIcons();
}

const buyNowBtn = document.getElementById('buyNowBtn');
const addCartBtn = document.getElementById('addCartBtn');

buyNowBtn.addEventListener('click', () => {
  const product = products.find((item) => item.id === selectedProductId);
  const tier = product.tiers[selectedTier];
  showToast('Producto listo para comprar', `${product.name} · ${tier.label} · ${formatMoney(tier.price)}`);
});

addCartBtn.addEventListener('click', () => {
  const product = products.find((item) => item.id === selectedProductId);
  const tier = product.tiers[selectedTier];
  const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const matchingItems = cart.filter((item) => item.productId === product.id);
  const currentQuantity = matchingItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);

  if (currentQuantity >= 10) {
    showToast('Límite de unidades alcanzado', 'Puedes agregar hasta 10 piezas del mismo artículo.');
    return;
  }

  const existingItem = matchingItems[0];
  const nextItem = {
    ...existingItem,
    id: existingItem?.id || `${product.id}-${Date.now()}`,
    productId: product.id,
    name: product.name,
    tier: tier.label,
    price: tier.price,
    quantity: currentQuantity + 1,
    image: product.images[0]
  };
  const nextCart = cart.filter((item) => item.productId !== product.id);
  nextCart.push(nextItem);
  cartCount = nextCart.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
  miniCartCount.textContent = cartCount;
  localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
  showToast('Producto agregado al carrito', `${product.name} · ${tier.label} · ${formatMoney(tier.price)}`);
});

document.getElementById('closeToast').addEventListener('click', () => detailToast.classList.remove('show'));

const darkToggle = document.getElementById('darkToggle');
document.documentElement.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark');
darkToggle.addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
});

document.getElementById('cartPageLink').addEventListener('click', () => {
  window.location.href = 'cart.html';
});

renderProductSelector();
lucide.createIcons();
