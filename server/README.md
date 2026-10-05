# API JSON de cuentas, carrito y catálogo

## Inicio

1. Ejecuta `npm install` y `npm start` desde la raíz del proyecto.
2. Abre `http://localhost:3000/` o `http://localhost:3000/index.html`. Las páginas también están disponibles en `/cart.html`, `/checkout.html`, `/login.html`, `/perfil.html` y `/product-detail.html`.
3. Copia `.env.example` a `.env` solo si necesitas cambiar puerto, ubicación de JSON, contraseña inicial del admin u orígenes CORS.

`db/db.json` conserva usuarios, hashes de contraseña, sesiones Bearer, carritos, productos digitales y compras. En cada arranque se asegura el administrador `josevillada2000jp@gmail.com` sin borrar cuentas ni historial. Si falta, se crea con `ADMIN_PASSWORD` (mínimo 12 caracteres); si está vacío, se genera una contraseña aleatoria y se imprime una vez en consola. Las contraseñas usan `scrypt`, los tokens se almacenan como hash y los datos JSON no se publican por `express.static`.

## Endpoints

- `POST /api/register` crea una cuenta normal.
- `POST /api/login` valida credenciales y devuelve `isAdmin` para el correo maestro exacto.
- `GET /api/me` valida la sesión Bearer.
- `POST /api/logout` revoca la sesión Bearer.
- `GET /api/products` devuelve productos digitales publicados.
- `POST /api/products` crea un producto y requiere sesión admin. Recibe `title`, `category`, `price`, `description`, `imageUrl` y/o `productUrl`.
- `DELETE /api/products/:id` elimina un producto y requiere sesión admin.
- `GET /api/admin/overview` devuelve totales de usuarios, compras y productos activos.
- `GET /api/service-levels/:productId`, `GET /api/cart`, `PUT /api/cart/items/:productId` y `DELETE /api/cart/items/:productId` alimentan el carrito JSON. El carrito requiere `X-Cart-Id`.
- `POST /api/purchases` registra artículos, valida precios en el catálogo JSON y requiere Bearer token.
- `GET /api/purchases/:userId` devuelve exclusivamente el historial del usuario autenticado.

Las categorías admitidas son `corporativo`, `aplicacion-movil`, `ecommerce`, `landing-page` y `dashboard`. La tienda conserva las plantillas base y renderiza también productos nuevos desde el endpoint público.

El archivo se escribe de forma atómica y las operaciones se serializan dentro del proceso. Para varias instancias simultáneas se necesita una base compartida transaccional.

## Capacitor

Configura `data-api-base` con la URL HTTPS del backend y añade el origen de la aplicación a `CORS_ORIGINS`. Sustituye `localStorage` para el token por almacenamiento seguro de Capacitor antes de distribuir la aplicación.