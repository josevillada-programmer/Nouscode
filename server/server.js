import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ensureAdminAccount } from './admin-bootstrap.js';
import { createAuthRouter } from './auth-routes.js';
import { createCartRouter } from './cart-routes.js';
import { jsonDatabase } from './json-database.js';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:8100,capacitor://localhost')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cart-Id'],
  optionsSuccessStatus: 204
}));
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://unpkg.com', 'https://accounts.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://accounts.google.com'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '16kb', strict: true }));
app.use('/api', apiLimiter);
app.use(createAuthRouter());
app.use(createCartRouter());

app.get('/', (request, response) => response.sendFile(path.join(rootDirectory, 'index.html')));
app.get('/index.html', (request, response) => response.sendFile(path.join(rootDirectory, 'index.html')));
for (const page of ['cart', 'checkout', 'login', 'perfil', 'product-detail']) {
  app.get(`/${page}.html`, (request, response) => response.sendFile(path.join(rootDirectory, 'pages', `${page}.html`)));
}
app.use('/pages', express.static(path.join(rootDirectory, 'pages'), { dotfiles: 'deny' }));
app.use('/scripts', express.static(path.join(rootDirectory, 'scripts'), { dotfiles: 'deny' }));
app.use('/styles', express.static(path.join(rootDirectory, 'styles'), { dotfiles: 'deny' }));
app.use('/assets', express.static(path.join(rootDirectory, 'assets'), { dotfiles: 'deny' }));
app.use('/api', (request, response) => response.status(404).json({ success: false, message: 'Ruta API no encontrada.' }));

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ success: false, message: 'El JSON enviado no es válido.' });
    return;
  }
  console.error('Request failed:', error.message);
  response.status(500).json({ success: false, message: 'No se pudo completar la solicitud.' });
});

async function startServer() {
  try {
    await jsonDatabase.initialize();
    await ensureAdminAccount();
    app.listen(port, () => {
      console.info(`NoûsCode server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exitCode = 1;
  }
}

startServer();