const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { getUsers, saveUsers, getSessions, saveSessions, getConfig } = require('../services/store');
const { sanitizeUsername, sanitizeText, isNonEmptyString } = require('../utils/sanitize');
const { authRequired } = require('../middleware/auth');
const { grantExclusiveCosmetics } = require('../services/exclusiveCosmetics');

const router = express.Router();

function toPublicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

router.post('/register', async (req, res) => {
  try {
    const config = getConfig();
    if (config.openRegistration === false) {
      return res.status(403).json({ error: 'O registo está fechado no momento.' });
    }

    const { name, username, password, confirmPassword, bio, avatar } = req.body || {};

    if (!isNonEmptyString(name, 60)) {
      return res.status(400).json({ error: 'Nome inválido.' });
    }
    const cleanUsername = sanitizeUsername(username);
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username inválido (mínimo 3 caracteres, apenas letras, números, "." e "_").' });
    }
    if (!isNonEmptyString(password, 200) || password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'As senhas não coincidem.' });
    }

    const users = getUsers();
    if (users.some((u) => u.username === cleanUsername)) {
      return res.status(409).json({ error: 'Esse username já está em uso.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const newUser = {
      id: uuidv4(),
      name: sanitizeText(name, 60),
      username: cleanUsername,
      passwordHash,
      avatar: typeof avatar === 'string' ? avatar : null,
      banner: null,
      bio: sanitizeText(bio || '', 160),
      customStatus: '',
      statusMode: 'online', // online | away | busy | invisible
      badges: users.length === 0 ? ['founder'] : [],
      isBanned: false,
      isOwner: users.length === 0, // primeiro utilizador é o "dono" simbólico da instância
      createdAt: now,
      lastSeen: now,
      isOnline: false,
      isAdmin: users.length === 0, // primeiro utilizador criado vira admin por conveniência
      // Loja / cosméticos / gamificação
      currency: 500, // "Runas" — moeda virtual de boas-vindas
      inventory: [],
      equipped: {},
      favorites: [],
      xp: 0,
      level: 1,
      achievements: [],
      privacy: { showOnlineStatus: true, showReadReceipts: true, allowMessagesFrom: 'everyone' },
    };

    users.push(newUser);
    grantExclusiveCosmetics(newUser);
    await saveUsers(users);

    const token = signToken(newUser);
    res.status(201).json({ token, user: toPublicUser(newUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registar utilizador.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const cleanUsername = sanitizeUsername(username);
    if (!cleanUsername || !isNonEmptyString(password, 200)) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const users = getUsers();
    const user = users.find((u) => u.username === cleanUsername);
    if (!user) {
      return res.status(401).json({ error: 'Username ou senha incorrectos.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Username ou senha incorrectos.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Esta conta foi suspensa pelo administrador.' });
    }

    user.isOnline = true;
    user.lastSeen = new Date().toISOString();
    await saveUsers(users);

    const token = signToken(user);

    const sessions = getSessions();
    sessions.push({ id: uuidv4(), userId: user.id, createdAt: new Date().toISOString() });
    await saveSessions(sessions);

    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao iniciar sessão.' });
  }
});

router.post('/logout', authRequired, async (req, res) => {
  try {
    const users = getUsers();
    const user = users.find((u) => u.id === req.user.id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date().toISOString();
      await saveUsers(users);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao terminar sessão.' });
  }
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

module.exports = { router, toPublicUser };
