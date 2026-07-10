require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { ensureDbDir, ensureFile } = require('./src/services/jsonDb');
const { DEFAULTS } = require('./src/services/store');
const { registerSocketHandlers } = require('./src/sockets');

const { router: authRouter } = require('./src/routes/auth');
const usersRouter = require('./src/routes/users');
const chatsRouter = require('./src/routes/chats');
const uploadsRouter = require('./src/routes/uploads');
const adminRouter = require('./src/routes/admin');
const ownerRouter = require('./src/routes/owner');
const shopRouter = require('./src/routes/shop');
const notificationsRouter = require('./src/routes/notifications');
const searchRouter = require('./src/routes/search');

// Garante que a estrutura de dados existe antes de arrancar.
ensureDbDir();
ensureFile('users', DEFAULTS.users);
ensureFile('chats', DEFAULTS.chats);
ensureFile('messages', DEFAULTS.messages);
ensureFile('sessions', DEFAULTS.sessions);
ensureFile('config', DEFAULTS.config);
ensureFile('catalog', DEFAULTS.catalog);
ensureFile('codes', DEFAULTS.codes);
ensureFile('notifications', DEFAULTS.notifications);
ensureFile('auditLog', DEFAULTS.auditLog);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
for (const folder of ['images', 'documents', 'audio', 'avatars', 'banners', 'group-avatars']) {
  const dir = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// Rate limit simples para rotas sensíveis (login/registo).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tenta novamente mais tarde.' },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Ficheiros estáticos enviados (imagens, documentos, áudio, avatares).
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Valquíria Chat', time: new Date().toISOString() });
});

app.get('/api/config/public', (req, res) => {
  const { getConfig } = require('./src/services/store');
  const config = getConfig();
  res.json({
    appName: config.appName,
    theme: config.theme,
    openRegistration: config.openRegistration,
    announcement: config.announcement || null,
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/upload', uploadsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/shop', shopRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);

// Em produção, serve o build estático do frontend (gerado em ../frontend/dist),
// permitindo correr backend + frontend num único serviço (ex: Railway).
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Handler de erros genérico.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor.' });
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🗡️  Valquíria Chat backend a correr na porta ${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Socket: ws://localhost:${PORT}\n`);
});
