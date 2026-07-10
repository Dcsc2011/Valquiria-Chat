const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');

const {
  getUsers,
  saveUsers,
  getChats,
  saveChats,
  getMessages,
  saveMessages,
  getConfig,
  saveConfig,
  getCatalog,
  saveCatalog,
  getCodes,
  saveCodes,
  getAuditLog,
} = require('../services/store');
const { logAdminAction } = require('../services/auditLog');
const { CATEGORIES, RARITIES } = require('../data/cosmeticsCatalog');
const { DB_DIR } = require('../services/jsonDb');
const { UPLOADS_DIR } = require('../middleware/upload');
const { adminRequired } = require('../middleware/auth');
const { sanitizeText, sanitizeUsername, isNonEmptyString } = require('../utils/sanitize');
const { sanitizeBadges } = require('../utils/badges');
const { toPublicUser } = require('./auth');

const router = express.Router();

const BACKUPS_DIR = path.join(__dirname, '..', '..', '..', 'database', 'backups');
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ---------- Login do admin ----------
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { isAdminSession: true, username },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    return res.json({ token });
  }
  res.status(401).json({ error: 'Credenciais de administrador incorrectas.' });
});

// ---------- Utilizadores ----------
router.get('/users', adminRequired, (req, res) => {
  const users = getUsers().map(toPublicUser);
  res.json({ users });
});

router.post('/users', adminRequired, async (req, res) => {
  try {
    const { name, username, password, bio, isAdmin } = req.body || {};
    if (!isNonEmptyString(name, 60)) return res.status(400).json({ error: 'Nome inválido.' });
    const cleanUsername = sanitizeUsername(username);
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username inválido.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
    }

    const users = getUsers();
    if (users.some((u) => u.username === cleanUsername)) {
      return res.status(409).json({ error: 'Username já existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const newUser = {
      id: uuidv4(),
      name: sanitizeText(name, 60),
      username: cleanUsername,
      passwordHash,
      avatar: null,
      banner: null,
      bio: sanitizeText(bio || '', 160),
      customStatus: '',
      statusMode: 'online',
      badges: [],
      isBanned: false,
      isOwner: false,
      createdAt: now,
      lastSeen: now,
      isOnline: false,
      isAdmin: !!isAdmin,
      currency: 500,
      inventory: [],
      equipped: {},
      favorites: [],
      xp: 0,
      level: 1,
      achievements: [],
      privacy: { showOnlineStatus: true, showReadReceipts: true, allowMessagesFrom: 'everyone' },
    };
    users.push(newUser);
    await saveUsers(users);
    res.status(201).json({ user: toPublicUser(newUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar utilizador.' });
  }
});

router.put('/users/:id', adminRequired, async (req, res) => {
  try {
    const users = getUsers();
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

    const { name, username, bio, avatar, isAdmin } = req.body || {};
    if (name !== undefined) user.name = sanitizeText(name, 60);
    if (bio !== undefined) user.bio = sanitizeText(bio, 160);
    if (avatar !== undefined) user.avatar = avatar;
    if (isAdmin !== undefined) user.isAdmin = !!isAdmin;
    if (username !== undefined) {
      const cleanUsername = sanitizeUsername(username);
      if (cleanUsername && cleanUsername !== user.username) {
        if (users.some((u) => u.username === cleanUsername)) {
          return res.status(409).json({ error: 'Username já existe.' });
        }
        user.username = cleanUsername;
      }
    }

    await saveUsers(users);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao actualizar utilizador.' });
  }
});

router.delete('/users/:id', adminRequired, async (req, res) => {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  const deletedUsername = users[idx].username;
  users.splice(idx, 1);
  await saveUsers(users);
  await logAdminAction('delete_user', { userId: req.params.id, username: deletedUsername });

  // Remove também as conversas e mensagens associadas.
  const chats = getChats();
  const remainingChats = chats.filter((c) => !c.participants.includes(req.params.id));
  const removedChatIds = chats.filter((c) => c.participants.includes(req.params.id)).map((c) => c.id);
  await saveChats(remainingChats);

  if (removedChatIds.length > 0) {
    const messages = getMessages();
    const remainingMessages = messages.filter((m) => !removedChatIds.includes(m.chatId));
    await saveMessages(remainingMessages);
  }

  res.json({ success: true });
});

router.post('/users/:id/reset-password', adminRequired, async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });
  }
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await saveUsers(users);
  res.json({ success: true });
});

router.post('/users/:id/toggle-admin', adminRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.isAdmin = !user.isAdmin;
  await saveUsers(users);
  res.json({ user: toPublicUser(user) });
});

router.put('/users/:id/badges', adminRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.badges = sanitizeBadges(req.body?.badges);
  await saveUsers(users);
  res.json({ user: toPublicUser(user) });
});

router.post('/users/:id/ban', adminRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.isBanned = true;
  await saveUsers(users);
  await logAdminAction('ban_user', { userId: user.id, username: user.username });
  res.json({ user: toPublicUser(user) });
});

router.post('/users/:id/unban', adminRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.isBanned = false;
  await saveUsers(users);
  await logAdminAction('unban_user', { userId: user.id, username: user.username });
  res.json({ user: toPublicUser(user) });
});

router.post('/users/:id/owner', adminRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.isOwner = !user.isOwner;
  await saveUsers(users);
  await logAdminAction('toggle_owner', { userId: user.id, isOwner: user.isOwner });
  res.json({ user: toPublicUser(user) });
});

router.post('/users/:id/currency', adminRequired, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount)) return res.status(400).json({ error: 'Quantia inválida.' });

  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.currency = Math.max(0, (user.currency || 0) + amount);
  await saveUsers(users);
  await logAdminAction('grant_currency', { userId: user.id, amount, newBalance: user.currency });
  res.json({ user: toPublicUser(user) });
});

// ---------- Conversas e mensagens ----------
router.get('/chats', adminRequired, (req, res) => {
  const chats = getChats();
  const users = getUsers();
  const messages = getMessages();

  const enriched = chats.map((c) => {
    const participants = c.participants.map((id) => {
      const u = users.find((x) => x.id === id);
      return u ? toPublicUser(u) : null;
    });
    const messageCount = messages.filter((m) => m.chatId === c.id).length;
    return { ...c, participants, messageCount };
  });

  res.json({ chats: enriched });
});

router.delete('/chats/:id', adminRequired, async (req, res) => {
  const chats = getChats();
  const idx = chats.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Conversa não encontrada.' });

  chats.splice(idx, 1);
  await saveChats(chats);

  const messages = getMessages();
  const remaining = messages.filter((m) => m.chatId !== req.params.id);
  await saveMessages(remaining);

  res.json({ success: true });
});

router.delete('/messages/:id', adminRequired, async (req, res) => {
  const messages = getMessages();
  const idx = messages.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Mensagem não encontrada.' });

  messages.splice(idx, 1);
  await saveMessages(messages);
  res.json({ success: true });
});

// ---------- Estatísticas ----------
router.get('/stats', adminRequired, (req, res) => {
  const users = getUsers();
  const chats = getChats();
  const messages = getMessages();

  const onlineCount = users.filter((u) => u.isOnline).length;
  const messagesByType = messages.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {});

  let uploadsSize = 0;
  let uploadsCount = 0;
  try {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else {
          uploadsCount += 1;
          uploadsSize += fs.statSync(full).size;
        }
      }
    };
    if (fs.existsSync(UPLOADS_DIR)) walk(UPLOADS_DIR);
  } catch (err) {
    console.error('Erro ao calcular tamanho dos uploads:', err.message);
  }

  res.json({
    totalUsers: users.length,
    onlineUsers: onlineCount,
    totalChats: chats.length,
    totalMessages: messages.length,
    messagesByType,
    uploads: { count: uploadsCount, sizeBytes: uploadsSize },
  });
});

// ---------- Configuração ----------
router.get('/config', adminRequired, (req, res) => {
  res.json({ config: getConfig() });
});

router.put('/config', adminRequired, async (req, res) => {
  const current = getConfig();
  const { appName, theme, openRegistration, allowUploads, maxUploadSizeMb, announcement } = req.body || {};

  const updated = {
    ...current,
    ...(appName !== undefined ? { appName: sanitizeText(appName, 60) } : {}),
    ...(theme !== undefined ? { theme } : {}),
    ...(openRegistration !== undefined ? { openRegistration: !!openRegistration } : {}),
    ...(allowUploads !== undefined ? { allowUploads: !!allowUploads } : {}),
    ...(maxUploadSizeMb !== undefined ? { maxUploadSizeMb: Number(maxUploadSizeMb) } : {}),
    ...(announcement !== undefined
      ? { announcement: announcement ? sanitizeText(announcement, 240) : null }
      : {}),
  };

  await saveConfig(updated);
  res.json({ config: updated });
});

// ---------- Exportar / importar / backup / restaurar ----------
router.get('/export', adminRequired, (req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="valquiria-database-export.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => res.status(500).send({ error: err.message }));
  archive.pipe(res);
  archive.glob('*.json', { cwd: DB_DIR });
  archive.finalize();
});

router.post('/backup', adminRequired, async (req, res) => {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUPS_DIR, `backup-${stamp}.zip`);
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.glob('*.json', { cwd: DB_DIR });
      archive.finalize();
    });

    res.json({ success: true, file: path.basename(backupPath) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar backup.' });
  }
});

router.get('/backups', adminRequired, (req, res) => {
  const files = fs.existsSync(BACKUPS_DIR)
    ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.zip'))
    : [];
  res.json({ backups: files });
});

router.post('/restore/:file', adminRequired, async (req, res) => {
  try {
    const filePath = path.join(BACKUPS_DIR, path.basename(req.params.file));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Ficheiro de backup não encontrado.' });
    }
    const zip = new AdmZip(filePath);
    zip.extractAllTo(DB_DIR, true);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao restaurar backup.' });
  }
});

// Importa um ficheiro .zip enviado pelo utilizador contendo os JSON da base de dados.
const multer = require('multer');
const importUpload = multer({ dest: path.join(BACKUPS_DIR, 'tmp') });

router.post('/import', adminRequired, importUpload.single('backup'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(DB_DIR, true);
    fs.unlinkSync(req.file.path);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar backup.' });
  }
});

// ---------- Limpar uploads ----------
router.post('/clear-uploads', adminRequired, async (req, res) => {
  try {
    const folders = ['images', 'documents', 'audio', 'avatars'];
    let removed = 0;
    for (const folder of folders) {
      const dir = path.join(UPLOADS_DIR, folder);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        fs.unlinkSync(path.join(dir, file));
        removed += 1;
      }
    }
    res.json({ success: true, removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao limpar uploads.' });
  }
});

// ---------- Loja: itens e bundles ----------
router.get('/shop/catalog', adminRequired, (req, res) => {
  res.json({ catalog: getCatalog() });
});

router.post('/shop/items', adminRequired, async (req, res) => {
  const { id, type, name, rarity, price, bundleId, preview, ownerOnly, codeOnly } = req.body || {};
  if (!id || !type || !name) return res.status(400).json({ error: 'id, type e name são obrigatórios.' });
  if (!CATEGORIES.includes(type)) return res.status(400).json({ error: 'Categoria inválida.' });
  if (rarity && !RARITIES.includes(rarity)) return res.status(400).json({ error: 'Raridade inválida.' });

  const catalog = getCatalog();
  if (catalog.items.some((i) => i.id === id)) {
    return res.status(409).json({ error: 'Já existe um item com este id.' });
  }

  const item = {
    id,
    type,
    name: sanitizeText(name, 60),
    rarity: rarity || 'common',
    price: price === null || price === undefined ? null : Number(price),
    bundleId: bundleId || null,
    preview: preview || {},
    ownerOnly: !!ownerOnly,
    codeOnly: !!codeOnly,
  };
  catalog.items.push(item);
  if (bundleId) {
    const bundle = catalog.bundles.find((b) => b.id === bundleId);
    if (bundle) bundle.itemIds = [...new Set([...bundle.itemIds, id])];
  }
  await saveCatalog(catalog);
  await logAdminAction('create_shop_item', { itemId: id });
  res.status(201).json({ catalog });
});

router.put('/shop/items/:id', adminRequired, async (req, res) => {
  const catalog = getCatalog();
  const item = catalog.items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

  const { name, rarity, price, bundleId, preview, ownerOnly, codeOnly } = req.body || {};
  if (name !== undefined) item.name = sanitizeText(name, 60);
  if (rarity !== undefined && RARITIES.includes(rarity)) item.rarity = rarity;
  if (price !== undefined) item.price = price === null ? null : Number(price);
  if (bundleId !== undefined) item.bundleId = bundleId;
  if (preview !== undefined) item.preview = preview;
  if (ownerOnly !== undefined) item.ownerOnly = !!ownerOnly;
  if (codeOnly !== undefined) item.codeOnly = !!codeOnly;

  await saveCatalog(catalog);
  await logAdminAction('update_shop_item', { itemId: item.id });
  res.json({ catalog });
});

router.delete('/shop/items/:id', adminRequired, async (req, res) => {
  const catalog = getCatalog();
  catalog.items = catalog.items.filter((i) => i.id !== req.params.id);
  for (const bundle of catalog.bundles) {
    bundle.itemIds = bundle.itemIds.filter((id) => id !== req.params.id);
  }
  await saveCatalog(catalog);
  await logAdminAction('delete_shop_item', { itemId: req.params.id });
  res.json({ catalog });
});

router.post('/shop/bundles', adminRequired, async (req, res) => {
  const { id, name, theme, itemIds } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'id e name são obrigatórios.' });

  const catalog = getCatalog();
  if (catalog.bundles.some((b) => b.id === id)) {
    return res.status(409).json({ error: 'Já existe um bundle com este id.' });
  }
  catalog.bundles.push({ id, name: sanitizeText(name, 60), theme: sanitizeText(theme || '', 120), itemIds: itemIds || [] });
  await saveCatalog(catalog);
  await logAdminAction('create_bundle', { bundleId: id });
  res.status(201).json({ catalog });
});

router.delete('/shop/bundles/:id', adminRequired, async (req, res) => {
  const catalog = getCatalog();
  catalog.bundles = catalog.bundles.filter((b) => b.id !== req.params.id);
  await saveCatalog(catalog);
  await logAdminAction('delete_bundle', { bundleId: req.params.id });
  res.json({ catalog });
});

// ---------- Códigos de oferta ----------
router.get('/codes', adminRequired, (req, res) => {
  res.json({ codes: getCodes() });
});

router.post('/codes', adminRequired, async (req, res) => {
  const { code, itemIds, bundleId, currency, maxUses, expiresAt } = req.body || {};
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Código inválido.' });

  const cleanCode = code.trim().toUpperCase();
  const codes = getCodes();
  if (codes.some((c) => c.code === cleanCode)) {
    return res.status(409).json({ error: 'Já existe um código igual.' });
  }

  const entry = {
    code: cleanCode,
    itemIds: Array.isArray(itemIds) ? itemIds : [],
    bundleId: bundleId || null,
    currency: currency ? Number(currency) : 0,
    maxUses: maxUses ? Number(maxUses) : null,
    expiresAt: expiresAt || null,
    revoked: false,
    usedBy: [],
    createdAt: new Date().toISOString(),
  };
  codes.push(entry);
  await saveCodes(codes);
  await logAdminAction('create_code', { code: cleanCode });
  res.status(201).json({ code: entry });
});

router.post('/codes/:code/revoke', adminRequired, async (req, res) => {
  const codes = getCodes();
  const entry = codes.find((c) => c.code === req.params.code.toUpperCase());
  if (!entry) return res.status(404).json({ error: 'Código não encontrado.' });

  entry.revoked = true;
  await saveCodes(codes);
  await logAdminAction('revoke_code', { code: entry.code });
  res.json({ code: entry });
});

router.delete('/codes/:code', adminRequired, async (req, res) => {
  const codes = getCodes();
  const filtered = codes.filter((c) => c.code !== req.params.code.toUpperCase());
  await saveCodes(filtered);
  await logAdminAction('delete_code', { code: req.params.code.toUpperCase() });
  res.json({ success: true });
});

// ---------- Registo de auditoria ----------
router.get('/audit-log', adminRequired, (req, res) => {
  const log = getAuditLog().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ log });
});

module.exports = router;
