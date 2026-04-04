require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const articlesRoutes = require('./routes/articles');
const armoiresRoutes = require('./routes/armoires');
const lotsRoutes = require('./routes/lots');
const controlesRoutes = require('./routes/controles');
const alertesRoutes = require('./routes/alertes');
const uniformesRoutes = require('./routes/uniformes');
const usersRoutes = require('./routes/users');
const logsRoutes  = require('./routes/logs');
const searchRoutes = require('./routes/search');
const dashboardRoutes = require('./routes/dashboard');
const uniteLocaleRoutes = require('./routes/uniteLocale');
const planningControleRoutes = require('./routes/planningControle');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── SECURITY HEADERS ───────────────────────────────────────────────────────
app.use(helmet());

// ─── RATE LIMITING ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes' },
});
app.use(globalLimiter);

// Limiteur strict pour login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
});

// Limiteur pour les routes publiques
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes, réessayez plus tard' },
});

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // En production, bloquer les requêtes sans origin
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Origin requis'));
      }
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Appliquer les limiteurs spécifiques
app.use('/api/auth/login', loginLimiter);
app.use('/api/lots/public', publicLimiter);
app.use('/api/controles/public', publicLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/armoires', armoiresRoutes);
app.use('/api/lots', lotsRoutes);
app.use('/api/controles', controlesRoutes);
app.use('/api/alertes', alertesRoutes);
app.use('/api/uniformes', uniformesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/logs',  logsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/unite-locale', uniteLocaleRoutes);
app.use('/api/planning-controle', planningControleRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PharmaSecours API', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ─── ERREUR GLOBALE ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur interne',
  });
});

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`✅ PharmaSecours API démarré sur le port ${PORT}`);
  console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`);
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
async function shutdown() {
  console.log('Arrêt graceful en cours...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ─── CRON ALERTES ─────────────────────────────────────────────────────────────
require('./services/alerteService');
