import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Paragraph,
  Packer,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType
} from 'docx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'docs');
const outputPath = path.join(outputDirectory, 'NoUsCode-Documentacion-Tecnica-Capitulo-IV.docx');
const colors = { ink: '121212', muted: '666666', border: 'D9D9D9', soft: 'F5F5F5', white: 'FFFFFF' };

function paragraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 300 },
    children: [new TextRun({ text, font: 'Aptos', size: 21, color: colors.ink, ...options.run })],
    ...options
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 380 : 220, after: 150 },
    children: [new TextRun({ text, font: 'Aptos Display', bold: true, color: colors.ink })]
  });
}

function bullet(text) {
  return new Paragraph({
    indent: { left: 360, hanging: 180 },
    spacing: { after: 90, line: 280 },
    children: [
      new TextRun({ text: '• ', font: 'Aptos', size: 20, color: colors.ink }),
      new TextRun({ text, font: 'Aptos', size: 20, color: colors.ink })
    ]
  });
}

function field(label, value) {
  return new Paragraph({
    spacing: { after: 80, line: 280 },
    children: [
      new TextRun({ text: label, font: 'Aptos', size: 19, bold: true, color: colors.ink }),
      new TextRun({ text: value, font: 'Aptos', size: 19, color: colors.ink })
    ]
  });
}

function cell(text, header = false, width) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: { type: ShadingType.CLEAR, fill: header ? colors.ink : colors.white },
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    children: [new Paragraph({
      spacing: { after: 0, line: 250 },
      children: [new TextRun({
        text: String(text),
        font: 'Aptos',
        size: header ? 18 : 17,
        bold: header,
        color: header ? colors.white : colors.ink
      })]
    })]
  });
}

function table(headers, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: colors.border };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((value, index) => cell(value, true, widths?.[index])) }),
      ...rows.map((row) => new TableRow({ children: row.map((value, index) => cell(value, false, widths?.[index])) }))
    ]
  });
}

function flowBox(title, description, fill = 'F5F5F5') {
  const border = { style: BorderStyle.SINGLE, size: 8, color: colors.border };
  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 7200, type: WidthType.DXA },
    columnWidths: [7200],
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 7200, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill },
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [new TextRun({ text: title, font: 'Aptos', size: 20, bold: true, color: colors.ink })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: description, font: 'Aptos', size: 18, color: colors.ink })] })
      ]
    })] })]
  });
}

function flowArrow() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: '↓', font: 'Aptos', size: 22, bold: true, color: colors.muted })]
  });
}

function flowBranch(leftTitle, leftDescription, rightTitle, rightDescription) {
  const border = { style: BorderStyle.SINGLE, size: 8, color: colors.border };
  const branchCell = (title, description, fill) => new TableCell({
    width: { size: 3600, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [new TextRun({ text: title, font: 'Aptos', size: 19, bold: true, color: colors.ink })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: description, font: 'Aptos', size: 17, color: colors.ink })] })
    ]
  });
  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 7200, type: WidthType.DXA },
    columnWidths: [3600, 3600],
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [new TableRow({ children: [branchCell(leftTitle, leftDescription, 'FCEEEE'), branchCell(rightTitle, rightDescription, 'EEF6EE')] })]
  });
}

const content = [];

content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1500, after: 250 },
    children: [new TextRun({ text: 'NoûsCode', font: 'Aptos Display', size: 44, bold: true, color: colors.ink })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [new TextRun({ text: 'DOCUMENTACIÓN TÉCNICA DEL SISTEMA', font: 'Aptos', size: 25, bold: true, color: colors.muted })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: 'Plataforma de distribución de páginas y productos digitales', font: 'Aptos', size: 22, color: colors.muted })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 500, after: 160 },
    children: [new TextRun({ text: 'Versión 1.0 · 4 de octubre de 2026', font: 'Aptos', size: 19, color: colors.muted })]
  })
);

content.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));
content.push(new Paragraph({
  spacing: { after: 220 },
  children: [new TextRun({ text: 'Índice', font: 'Aptos Display', size: 32, bold: true, color: colors.ink })]
}));
content.push(new TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-3' }));
content.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));

content.push(heading('1. Resumen Ejecutivo y Descripción del Proyecto'));
content.push(heading('1.1 Propósito', HeadingLevel.HEADING_2));
content.push(paragraph('NoûsCode es una plataforma web para presentar, administrar y distribuir plantillas, páginas y activos digitales. El sistema integra un catálogo público, selección de productos, carrito persistente, autenticación de usuarios, registro de pedidos y un panel administrativo para publicar o retirar productos.'));
content.push(heading('1.2 Objetivos', HeadingLevel.HEADING_2));
[
  'Exponer productos digitales en una tienda navegable por categorías.',
  'Permitir al administrador publicar productos con descripción, precio, categoría, imagen y enlace digital.',
  'Persistir cuentas, sesiones, carritos y compras en un archivo JSON local.',
  'Validar en el servidor la identidad del comprador, el producto y el precio antes de guardar una orden.',
  'Mantener la interfaz desacoplada del almacenamiento para facilitar su adaptación a Capacitor.'
].forEach((item) => content.push(bullet(item)));
content.push(heading('1.3 Propuesta de valor', HeadingLevel.HEADING_2));
content.push(paragraph('La propuesta combina una vitrina lista para explorar con un mecanismo ligero para que el responsable del catálogo administre páginas y productos desde el navegador. La persistencia JSON permite una puesta en marcha sencilla y una migración posterior a una base transaccional cuando aumenten el tráfico o las instancias del servidor.'));
content.push(heading('1.4 Alcance y limitaciones actuales', HeadingLevel.HEADING_2));
[
  'El catálogo inicial contiene seis plantillas estáticas con tres niveles de servicio cada una. El panel permite agregar productos dinámicos persistidos en db.json.',
  'Las categorías disponibles para productos dinámicos son corporativo, aplicacion-movil, ecommerce, landing-page y dashboard.',
  'El checkout registra la orden; no existe integración con un proveedor de pagos ni procesamiento real de tarjeta.',
  'La interfaz usa CSS propio en styles/style.css y JavaScript vainilla. No usa Tailwind CSS.',
  'El archivo JSON serializa operaciones dentro de un proceso; no es adecuado como almacenamiento transaccional multiinstancia.'
].forEach((item) => content.push(bullet(item)));

content.push(heading('1.5 Giro', HeadingLevel.HEADING_2));
content.push(paragraph('El desarrollo, licenciamiento, distribución y comercialización de plataformas tecnológicas bajo el modelo de Software como Servicio (SaaS) y sistemas de automatización; así como la prestación de consultoría informática, soporte técnico y la realización de cualquier actividad administrativa, publicitaria, de compraventa o mercantil necesaria para la consecución del fin de la sociedad.'));
content.push(heading('1.6 Misión', HeadingLevel.HEADING_2));
content.push(paragraph('Acelerar y simplificar la creación de software mediante lógica automatizada, liberando a los usuarios de tareas manuales para que se enfoquen al cien por ciento en la innovación y el diseño de sus ideas.'));
content.push(heading('1.7 Visión', HeadingLevel.HEADING_2));
content.push(paragraph('Convertirnos en el motor principal del desarrollo tecnológico, siendo la plataforma inteligente que construya y escale el software del mañana con absoluta autonomía.'));
content.push(heading('1.8 Valores', HeadingLevel.HEADING_2));
[
  'Autonomía: Creamos sistemas que operan de manera independiente y resuelven problemas sin necesidad de microgestión.',
  'Eficiencia: Maximizamos el impacto reduciendo drásticamente los tiempos de programación y los costos operativos.',
  'Simplicidad: Transformamos lógicas y procesos complejos en herramientas limpias, minimalistas y fáciles de implementar.',
  'Evolución: Mantenemos nuestra tecnología en constante aprendizaje para ofrecer soluciones que se adapten al futuro.',
  'Escalabilidad: Construimos bases sólidas que permiten a nuestros clientes crecer sin límites técnicos.'
].forEach((item) => content.push(bullet(item)));
content.push(heading('2. Arquitectura Tecnológica'));
content.push(table(
  ['Capa', 'Tecnología', 'Responsabilidad'],
  [
    ['Cliente', 'HTML5, CSS propio, JavaScript vainilla', 'Vistas de tienda, detalle, carrito, login, perfil y panel admin.'],
    ['Servidor', 'Node.js, Express 5', 'API JSON, autenticación, autorización, catálogo y archivos estáticos.'],
    ['Middleware', 'cors, helmet, express-rate-limit', 'CORS por allowlist, cabeceras de seguridad y límites de solicitudes.'],
    ['Persistencia', 'db/db.json', 'Usuarios, sesiones, carritos, productos dinámicos e historial de compras.'],
    ['Contraseñas', 'scrypt', 'Almacena hashes salados; nunca conserva contraseñas en texto plano.'],
    ['Sesión API', 'Bearer token + SHA-256', 'El navegador conserva token; el JSON conserva únicamente su hash y vencimiento.']
  ],
  [1800, 2500, 5000]
));
content.push(heading('2.1 Organización principal', HeadingLevel.HEADING_2));
content.push(table(
  ['Ruta', 'Contenido'],
  [
    ['index.html', 'Inicio, categorías, plantillas base, panel admin y catálogo dinámico.'],
    ['pages/', 'Carrito, checkout, login, perfil y detalle de producto.'],
    ['scripts/', 'Scripts de tienda, sesión, login/registro, carrito, checkout y perfil.'],
    ['styles/style.css', 'Tokens visuales, componentes, layout y responsive.'],
    ['server/server.js', 'Configuración Express, CORS, seguridad, routers y aliases estáticos.'],
    ['server/auth-routes.js', 'Registro, login, sesión, compras y administración de productos.'],
    ['server/cart-routes.js', 'Niveles de servicio y persistencia JSON del carrito.'],
    ['server/catalog.js', 'Catálogo estático de seis plantillas y precios base.'],
    ['server/json-database.js', 'Lectura, normalización, serialización y escritura segura del JSON.'],
    ['db/db.json', 'Archivo local con las colecciones persistentes.']
  ],
  [2800, 6500]
));
content.push(heading('2.2 Inicio y archivos estáticos', HeadingLevel.HEADING_2));
content.push(paragraph('El servidor inicializa db.json, asegura la cuenta administradora y escucha por defecto en el puerto 3000. Express publica las carpetas pages, scripts, styles y assets; además define aliases como /index.html, /cart.html, /checkout.html, /login.html, /perfil.html y /product-detail.html para evitar respuestas Cannot GET. db.json permanece fuera de los directorios estáticos.'));
content.push(heading('2.3 Seguridad y configuración', HeadingLevel.HEADING_2));
[
  'CORS se limita a CORS_ORIGINS, incluyendo los orígenes locales y capacitor://localhost.',
  'El body JSON tiene límite de 16 KB; la API general limita 120 solicitudes por ventana de 15 minutos y login/registro 10 intentos.',
  'Las operaciones de productos requieren Bearer token válido y correo administrador autorizado.',
  'ADMIN_PASSWORD puede definir la clave inicial del administrador cuando se crea la cuenta; debe tener al menos 12 caracteres. Si queda vacía, se genera una contraseña aleatoria y se comunica una sola vez por consola.'
].forEach((item) => content.push(bullet(item)));

content.push(heading('3. Estructura de la Base de Datos'));
content.push(paragraph('El almacenamiento es un documento JSON con colecciones de objetos. No utiliza tablas SQL ni relaciones gestionadas por un motor externo. Los identificadores son UUID; las fechas se guardan en ISO 8601.'));
content.push(table(
  ['Colección', 'Campos', 'Descripción'],
  [
    ['users', 'id, username, email, passwordHash, isAdmin, createdAt', 'Cuentas de usuario. isAdmin se calcula por correo maestro y se asegura al iniciar el servidor.'],
    ['purchases', 'id, userId, date, items[], total', 'Historial de órdenes. Cada item incluye producto, nivel, precio, cantidad y lineTotal.'],
    ['products', 'id, title, category, description, price, imageUrl, productUrl, active, createdAt', 'Catálogo creado por administración. El API no publica productos inactivos.'],
    ['carts', 'cartId, items[]', 'Carritos JSON identificados por X-Cart-Id. Cada item incluye productId, nivel y cantidad.'],
    ['sessions', 'tokenHash, userId, expiresAt', 'Sesiones Bearer con hash del token y expiración de siete días.']
  ],
  [1500, 3600, 4200]
));
content.push(heading('3.1 Esquema lógico de producto', HeadingLevel.HEADING_2));
content.push(table(
  ['Variable', 'Tipo', 'Regla'],
  [
    ['id', 'string UUID', 'Generado por el servidor.'],
    ['title', 'string', 'Entre 3 y 100 caracteres.'],
    ['category', 'string enum', 'corporativo, aplicacion-movil, ecommerce, landing-page o dashboard.'],
    ['description', 'string', 'Entre 10 y 1200 caracteres.'],
    ['price', 'number', 'Mayor que cero y con precisión máxima de dos decimales.'],
    ['imageUrl', 'string URL', 'Opcional si existe productUrl; HTTP/HTTPS o ruta permitida bajo /assets/.'],
    ['productUrl', 'string URL', 'Opcional si existe imageUrl; solo HTTP/HTTPS.'],
    ['active', 'boolean', 'true al crear; GET público excluye false.'],
    ['createdAt', 'string ISO', 'Fecha de creación del registro.']
  ],
  [1700, 1700, 5900]
));
content.push(paragraph('El catálogo estático de plantillas vive en server/catalog.js, no en db.json. Incluye Plantilla 1–6 y niveles Básico, Medio y Avanzado. Sus precios se expresan en MXN y el servidor vuelve a calcularlos al confirmar la compra.'));

content.push(heading('4. Especificación de Endpoints REST'));
content.push(table(
  ['Método y ruta', 'Acceso', 'Comportamiento'],
  [
    ['POST /api/register', 'Público', 'Valida campos y duplicados, deriva la contraseña con scrypt, guarda el usuario y crea sesión. El correo admin no puede reclamarse mediante registro público.'],
    ['POST /api/login', 'Público', 'Valida correo/username y contraseña; responde JSON con usuario público, token e isAdmin.'],
    ['GET /api/me', 'Bearer', 'Valida el token y devuelve la sesión de usuario actual.'],
    ['POST /api/logout', 'Bearer', 'Revoca la sesión y elimina el tokenHash del JSON.'],
    ['GET /api/products', 'Público', 'Devuelve productos dinámicos activos.'],
    ['POST /api/products', 'Admin Bearer', 'Valida nombre, categoría, descripción, precio e imagen o enlace; persiste el producto. Responde 201.'],
    ['DELETE /api/products/:id', 'Admin Bearer', 'Elimina el producto solicitado; responde 404 si no existe.'],
    ['GET /api/admin/overview', 'Admin Bearer', 'Devuelve usuarios, compras y productos activos, incluyendo las seis plantillas estáticas.'],
    ['GET /api/service-levels/:productId', 'Público', 'Devuelve los niveles/precios del catálogo estático o un nivel Digital para producto dinámico.'],
    ['GET /api/cart', 'X-Cart-Id', 'Lee o crea el carrito persistente correspondiente al UUID.'],
    ['PUT /api/cart/items/:productId', 'X-Cart-Id', 'Valida cantidad/nivel, calcula el precio del catálogo y guarda el item.'],
    ['DELETE /api/cart/items/:productId', 'X-Cart-Id', 'Elimina un item del carrito y devuelve su nuevo contenido.'],
    ['POST /api/purchases', 'Bearer; X-Cart-Id opcional', 'Valida artículos, deriva usuario y fecha del servidor, recalcula precios/total, guarda la compra y vacía el carrito indicado. Responde 201.'],
    ['GET /api/purchases/:userId', 'Bearer', 'Devuelve solo compras del usuario autenticado; otro userId recibe 403.']
  ],
  [2400, 1800, 5100]
));
content.push(heading('4.1 Respuestas y códigos', HeadingLevel.HEADING_2));
content.push(paragraph('Las respuestas API utilizan JSON con la forma general { success, ... }. Los errores de validación devuelven 400; credenciales o sesión inválidas, 401; usuario sin permisos, 403; recurso inexistente, 404; producto no disponible, 422; y exceso de intentos, 429.'));

content.push(heading('5. Panel de Administración y Gestión de Productos'));
content.push(paragraph('El panel se encuentra embebido en index.html y se mantiene oculto por defecto. scripts/session-ui.js lee de inmediato localStorage para actualizar el navbar y consulta GET /api/me. Solo desoculta el panel cuando el backend valida el Bearer token y devuelve isAdmin=true para josevillada2000jp@gmail.com. La decisión de autorización real se aplica también en las rutas del servidor; no depende de una bandera local manipulable.'));
content.push(heading('5.1 Métricas y operaciones', HeadingLevel.HEADING_2));
[
  'Métricas: total de usuarios, compras registradas y productos activos (incluye seis plantillas base).',
  'Formulario: nombre, categoría, precio, descripción, URL de imagen y enlace digital.',
  'Publicación: POST /api/products valida los datos y guarda el producto en db.json.',
  'Listado: GET /api/products rellena el panel de administración y la tienda.',
  'Eliminación: DELETE /api/products/:id actualiza el panel y el catálogo.'
].forEach((item) => content.push(bullet(item)));
content.push(heading('5.2 Renderizado de la tienda', HeadingLevel.HEADING_2));
content.push(paragraph('scripts/script.js conserva las seis plantillas estáticas y solicita el catálogo dinámico al endpoint GET /api/products. Para cada producto construye nodos DOM, muestra categoría, precio, descripción e imagen, y agrega un botón de carrito. El click actualiza nouscode-cart en localStorage; las rutas de carrito sincronizan después los datos de precio e identidad del producto con el servidor.'));
content.push(heading('5.3 Checkout y límites del pago', HeadingLevel.HEADING_2));
content.push(paragraph('scripts/checkout.js requiere sesión y carrito válido. Envía las líneas seleccionadas a POST /api/purchases; el cliente no es la autoridad sobre usuario, fecha ni precio. Si el servidor responde éxito, elimina el carrito local y redirige a pages/perfil.html. La interfaz presenta métodos de pago ilustrativos, pero no hay integración con Stripe, PayPal, Mercado Pago ni banco: la operación final es un pedido persistido, no un cargo real.'));
content.push(heading('5.4 Flujo operativo resumido', HeadingLevel.HEADING_2));
content.push(paragraph('Administrador inicia sesión → la sesión Bearer se valida → se habilita el panel → se crea producto → el producto se persiste en db.json → GET /api/products lo expone → la tienda lo presenta → usuario lo agrega al carrito → checkout exige sesión → POST /api/purchases recalcula el total y registra la orden → carrito se limpia → perfil consulta historial.'));

content.push(heading('6. Complemento de Requisitos Funcionales'));
content.push(paragraph('Esta sección incorpora los criterios complementarios solicitados para la entrega académica y documenta exclusivamente las seis plantillas que existen actualmente en la página.'));
content.push(heading('6.1 Identidad de marca', HeadingLevel.HEADING_2));
content.push(table(
  ['Elemento', 'Definición para el documento'],
  [
    ['Nombre comercial', 'NoûsCode: estudio de páginas, software e interfaces digitales.'],
    ['Nicho', 'Pequeñas y medianas empresas, emprendimientos y profesionales que necesitan presencia digital o herramientas web listas para adaptar.'],
    ['Logotipo', 'Espacio reservado para el logotipo oficial que proporcionará el propietario del proyecto. La cabecera actual presenta el nombre NoûsCode como wordmark tipográfico.'],
    ['Paleta actual', 'Fondo #FFFFFF, superficie #F9F9F9, texto #121212, acento #000000, texto secundario #666666 y bordes #E6E6E6.'],
    ['Tipografía actual', 'Inter para interfaz y Playfair Display para marca y encabezados editoriales.']
  ],
  [2100, 7200]
));
content.push(heading('6.2 Catálogo disponible: seis plantillas en tres categorías', HeadingLevel.HEADING_2));
content.push(paragraph('Las siguientes fichas corresponden únicamente a las seis plantillas que están publicadas actualmente en la página. Cada producto se presenta por separado con categoría, características, precio base e imagen real incorporada desde assets/images/.'));

const inventoryRows = [
  ['01', 'Corporativo', 'Plantilla 1 · Sitio corporativo', 'Diseño responsive; inicio, servicios y contacto; niveles Básico, Medio y Avanzado.', '2500.00', 'assets/images/plantilla1.jpeg'],
  ['02', 'Corporativo', 'Plantilla 2 · Sitio corporativo', 'Presentación de empresa; secciones de servicios, equipo y contacto; tres niveles.', '2500.00', 'assets/images/plantilla2.jpeg'],
  ['03', 'Comercio electrónico', 'Plantilla 3 · Tienda online', 'Catálogo digital; fichas de producto; carrito visual; niveles de servicio.', '5000.00', 'assets/images/plantilla3.jpeg'],
  ['04', 'Aplicaciones móviles', 'Plantilla 4 · Interfaz móvil', 'Dashboard fintech; transacciones; diseño móvil; tres niveles.', '7000.00', 'assets/images/plantilla4.jpeg'],
  ['05', 'Corporativo', 'Plantilla 5 · Landing comercial', 'Página de conversión; CTA; formulario y diseño adaptable.', '1500.00', 'assets/images/plantilla5.jpeg'],
  ['06', 'Corporativo', 'Plantilla 6 · Dashboard', 'Indicadores; tablas; filtros; reportes y gestión por nivel.', '4000.00', 'assets/images/plantilla6.jpeg']
];

for (const [number, category, name, features, price, imageReference] of inventoryRows) {
  content.push(heading(`${number}. ${name}`, HeadingLevel.HEADING_3));
  const imageData = await readFile(path.join(root, imageReference));
  content.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new ImageRun({ data: imageData, type: 'jpg', transformation: { width: 330, height: 175 } })]
  }));
  content.push(paragraph(`Imagen incorporada: ${imageReference}`, { alignment: AlignmentType.CENTER, run: { size: 16, color: colors.muted } }));
  content.push(field('Categoría: ', category));
  content.push(field('Características: ', features));
  content.push(field('Precio unitario MXN: ', `$${price}`));
  content.push(field('Imagen: ', imageReference));
}
content.push(heading('6.3 Diccionario ampliado de producto', HeadingLevel.HEADING_2));
content.push(table(
  ['Campo', 'Tipo lógico', 'Regla y uso'],
  [
    ['id', 'string', 'UUID o SKU único para identificar producto y relacionarlo con carrito/compra.'],
    ['name', 'string', 'Nombre comercial único y visible en la ficha.'],
    ['category', 'enum', 'Una de tres categorías: corporativo, aplicaciones-moviles o comercio-electronico.'],
    ['imageUrl', 'string URL', 'Imagen referencial HTTPS o ruta local autorizada.'],
    ['features', 'array<string>', 'Lista de especificaciones técnicas principales mostradas en el detalle.'],
    ['description', 'string', 'Descripción comercial y técnica del producto digital.'],
    ['unitPrice', 'decimal', 'Precio unitario MXN con dos decimales; fuente para subtotal.'],
    ['active', 'boolean', 'Indica disponibilidad en la tienda pública.']
  ],
  [1600, 1800, 5900]
));
content.push(paragraph('Ejemplo lógico del objeto extendido: { id: "plantilla-1", name: "Plantilla 1 · Sitio corporativo", category: "corporativo", imageUrl: "assets/images/plantilla1.jpeg", features: ["Diseño responsive", "Secciones de inicio y servicios", "Formulario de contacto"], description: "Plantilla corporativa configurable", unitPrice: 2500.00, active: true }. Este diccionario amplía el esquema actualmente implementado, que utiliza title y price y aún no almacena features como arreglo independiente.'));

content.push(heading('6.4 Carrito, impuestos y totales', HeadingLevel.HEADING_2));
content.push(paragraph('El carrito debe permitir agregar producto, cambiar cantidad entre 1 y 10, eliminar líneas y recalcular importes automáticamente. La interfaz puede conservar temporalmente la selección en localStorage y sincronizarla con el servidor mediante X-Cart-Id. El servidor valida producto, cantidad y precio para impedir que el cliente altere el importe final.'));
content.push(table(
  ['Cálculo', 'Fórmula'],
  [
    ['Subtotal de línea', 'precioUnitario × cantidad'],
    ['Subtotal de orden', 'Σ subtotales de línea'],
    ['Impuesto propuesto', 'subtotal × tasaIVA'],
    ['Total general', 'subtotal + impuesto']
  ],
  [3000, 6300]
));
content.push(paragraph('Para los ejemplos se propone IVA del 16% como supuesto de México; la tasa debe confirmarse según el régimen fiscal y la jurisdicción del negocio. La versión actual calcula precio y total, pero todavía no persiste subtotal, tasa ni impuesto como campos independientes.'));

content.push(heading('6.5 Pago simulado con dos métodos', HeadingLevel.HEADING_2));
content.push(table(
  ['Método', 'Interfaz y validación', 'Persistencia y alcance'],
  [
    ['Tarjeta crédito/débito', 'Campos de titular, número, vencimiento y CVV; validación de formato y campos requeridos en modo demostración.', 'No almacenar ni registrar número/CVV. Sin proveedor no se autoriza ni cobra la tarjeta; solo se simula el paso.'],
    ['Transferencia o pasarela digital', 'Pantalla de instrucciones o selección de proveedor; captura opcional de referencia de operación.', 'Guardar método y estado de pedido, nunca credenciales bancarias. La conciliación requiere integración con proveedor real.']
  ],
  [1900, 3900, 3500]
));
content.push(paragraph('El checkout actual ofrece opciones ilustrativas, pero no procesa pagos ni captura los datos de tarjeta. Este requisito define una ampliación de interfaz simulada. Para pagos reales se debe integrar un proveedor certificado y no enviar datos de tarjeta al backend propio.'));

content.push(heading('6.6 Estado de cumplimiento', HeadingLevel.HEADING_2));
content.push(table(
  ['Requisito complementario', 'Estado observado en el repositorio'],
  [
    ['Logotipo oficial', 'Pendiente de incorporar por el propietario; la interfaz usa wordmark de texto.'],
    ['Inventario del documento', 'Se documentan solo las seis plantillas reales de la página, con su imagen correspondiente. No se incluyen productos propuestos que aún no existen.'],
    ['Características como arreglo', 'Pendiente; el formulario y el JSON actuales guardan description como texto.'],
    ['Subtotal, impuesto y total', 'Subtotal y total se calculan; el impuesto no está implementado como campo ni cálculo independiente.'],
    ['Dos métodos de pago simulados', 'La UI tiene métodos ilustrativos, pero falta captura validada de tarjeta/transferencia. No existe proveedor real.']
  ],
  [3300, 6000]
));

content.push(heading('Capítulo IV. Lógica del Algoritmo y Diagramas de Flujo'));
content.push(heading('IV.1 Interacción del carrito', HeadingLevel.HEADING_2));
content.push(paragraph('El flujo comienza cuando el visitante selecciona una plantilla o un producto digital. Para plantillas base se selecciona además un nivel de servicio; para productos administrados se usa el nivel Digital. Al agregarlo, scripts/script.js guarda la selección en localStorage y pages/cart.html sincroniza los artículos con el servidor usando un UUID en el header X-Cart-Id.'));
content.push(paragraph('El usuario puede modificar cantidades de 1 a 10 o retirar líneas. scripts/cart.js solicita los niveles y precios al API; server/cart-routes.js vuelve a validarlos y presenta precios calculados desde server/catalog.js o desde products en db.json.'));
content.push(heading('IV.2 Algoritmo de confirmación', HeadingLevel.HEADING_2));
[
  'El usuario revisa el carrito y selecciona Continuar al pago.',
  'checkout.js comprueba que localStorage contenga un usuario y un Bearer token. Si falta la sesión, redirige a login.html?next=checkout.',
  'Con sesión válida, el navegador envía POST /api/purchases con los identificadores de producto, nivel y cantidad. userId, fecha y total incluidos por el cliente no son confiables ni determinan el resultado.',
  'auth-routes.js verifica la sesión, la existencia y vigencia del producto y que la cantidad sea un entero entre 1 y 10.',
  'El servidor obtiene el precio autoritativo del catálogo, calcula los totales, asigna UUID y fecha actual y guarda la compra mediante la escritura JSON serializada.',
  'Si existe X-Cart-Id, la misma actualización vacía los artículos de ese carrito. El servidor responde HTTP 201.',
  'Al recibir 201, checkout.js limpia nouscode-cart y redirige a perfil.html; el perfil consulta GET /api/purchases/:userId con Bearer token.'
].forEach((item) => content.push(bullet(item)));
content.push(heading('IV.3 Cálculo de importes', HeadingLevel.HEADING_2));
content.push(paragraph('Para cada línea el servidor calcula subtotalLinea = precioUnitario × cantidad. El totalPedido es la suma de los subtotales de línea. En la implementación actual no se añade IVA ni se cobra un pago; la confirmación exitosa significa que la orden quedó registrada, no que se haya liquidado una transacción.'));
content.push(paragraph('El frontend presenta alternativas ilustrativas de tarjeta, transferencia y billetera digital, pero no solicita credenciales de tarjeta ni se conecta a una pasarela. Para habilitar cargos reales se requiere integrar un proveedor certificado; los datos sensibles de pago no deben persistirse en db.json.'));
content.push(heading('IV.4 Diagrama de flujo del carrito al pedido', HeadingLevel.HEADING_2));
content.push(paragraph('Figura IV-1. Flujo de selección, validación y registro del pedido.'));
content.push(flowBox('INICIO', 'Explorar el catálogo y seleccionar producto'));
content.push(flowArrow());
content.push(flowBox('SELECCIÓN', 'Elegir nivel/cantidad y agregar al carrito'));
content.push(flowArrow());
content.push(flowBox('CARRITO', 'Guardar localmente y sincronizar por X-Cart-Id'));
content.push(flowArrow());
content.push(flowBox('CHECKOUT', 'Revisar artículos y confirmar pedido'));
content.push(flowArrow());
content.push(flowBox('DECISIÓN 1', '¿Hay sesión Bearer válida?'));
content.push(flowBranch('NO', 'Ir a login y volver al checkout', 'SÍ', 'Enviar POST /api/purchases'));
content.push(flowArrow());
content.push(flowBox('VALIDACIÓN', 'Comprobar producto activo, nivel y cantidad 1–10'));
content.push(flowBranch('INVÁLIDO', 'Responder error; conservar el carrito', 'VÁLIDO', 'Leer el precio confiable del catálogo'));
content.push(flowArrow());
content.push(flowBox('PERSISTENCIA', 'Calcular total y guardar compra en db.json'));
content.push(flowArrow());
content.push(flowBox('ÉXITO HTTP 201', 'Vaciar carrito, limpiar copia local y abrir perfil'));
content.push(flowArrow());
content.push(flowBox('FIN', 'Consultar historial del usuario', 'EEF2FA'));

const document = new Document({
  creator: 'NoûsCode',
  title: 'Documentación técnica NoûsCode',
  subject: 'Arquitectura, persistencia JSON, API REST y panel de productos digitales',
  keywords: 'NoûsCode, Express, JSON, catálogo, productos digitales, API',
  styles: {
    default: {
      document: { run: { font: 'Aptos', size: 21, color: colors.ink }, paragraph: { spacing: { after: 140, line: 300 } } },
      heading1: { run: { font: 'Aptos Display', size: 32, bold: true, color: colors.ink }, paragraph: { spacing: { before: 380, after: 150 } } },
      heading2: { run: { font: 'Aptos Display', size: 25, bold: true, color: colors.ink }, paragraph: { spacing: { before: 220, after: 120 } } }
    }
  },
  sections: [{
    properties: { page: { margin: { top: 1100, right: 1000, bottom: 1000, left: 1000 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'NoûsCode · Documentación técnica · Página ', font: 'Aptos', size: 16, color: colors.muted }), new TextRun({ children: [PageNumber.CURRENT], font: 'Aptos', size: 16, color: colors.muted })]
      })] })
    },
    children: content
  }]
});

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, await Packer.toBuffer(document));
console.log(outputPath);