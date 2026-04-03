require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
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
app.listen(PORT, () => {
  console.log(`✅ PharmaSecours API démarré sur le port ${PORT}`);
  console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`);
});

// ─── CRON ALERTES ─────────────────────────────────────────────────────────────
// Importé après le démarrage du serveur pour ne pas bloquer
require('./services/alerteService');
