require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./config/database');
const { seed } = require('./config/seed');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────────
// El límite es por IP: la API se consume desde el navegador a través de
// la IP del cliente, así que dos personas en máquinas distintas no
// comparten cupo. Si algún día se publica detrás de un proxy inverso,
// hay que activar `trust proxy` para que `req.ip` sea la IP real.
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

// Presupuesto general de la API. Amplio a propósito: cargar la aplicación
// dispara varias peticiones a la vez (factores, documentos, proyectos,
// docentes...) y navegar entre módulos las suma muy rápido, así que un
// tope corto devolvía 429 en pantalla casi de inmediato. Este límite
// protege contra scripts abusivos, no contra el uso normal del SPA.
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes, intente más tarde' },
});
app.use('/api', limiter);

// El login sí lleva un tope estricto, y solo cuenta los intentos
// fallidos: un usuario que entra bien no debe gastar cupo, mientras que
// un ataque de fuerza bruta se agota en pocos intentos.
const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos de acceso. Espere unos minutos e intente de nuevo.' },
});
app.use('/api/auth/login', loginLimiter);

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SISACRE API' });
});

// ── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Archivo demasiado grande. Máximo 50MB.' });
  }
  if (err.message && err.message.includes('Tipo de archivo')) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ── Start ─────────────────────────────────────────────────────────
const waitForDB = async (retries = 10, delayMs = 3000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await connectDB();
      return;
    } catch (err) {
      console.log(`⏳ Esperando base de datos... intento ${i}/${retries}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
};

const start = async () => {
  await waitForDB();

  // Ejecutar seed (crea admin si no existe)
  await seed();

  app.listen(PORT, () => {
    console.log(`🚀 SISACRE API corriendo en http://localhost:${PORT}`);
  });
};

start();
