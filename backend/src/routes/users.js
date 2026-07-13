const express = require('express');
const bcrypt = require('bcryptjs');

const { getUsers, saveUsers } = require('../services/store');
const { sanitizeText, sanitizeUsername, isNonEmptyString } = require('../utils/sanitize');
const { authRequired } = require('../middleware/auth');
const { toPublicUser } = require('./auth');

const router = express.Router();

// Pesquisa instantânea por username ou nome (exclui o próprio utilizador).
router.get('/search', authRequired, (req, res) => {
  const q = sanitizeUsername(req.query.q || '') || (req.query.q || '').toString().trim().toLowerCase();
  if (!q) return res.json({ users: [] });

  const users = getUsers();
  const results = users
    .filter((u) => u.id !== req.user.id)
    .filter((u) => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    .slice(0, 20)
    .map(toPublicUser);

  res.json({ users: results });
});

router.get('/:id', authRequired, (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  const publicUser = toPublicUser(user);
  if (user.id !== req.user.id && user.privacy?.showOnlineStatus === false) {
    publicUser.isOnline = false;
    publicUser.lastSeen = user.lastSeen; // mantém a data de criação/última actividade real oculta seria excessivo; ocultamos apenas o estado ao vivo
  }
  res.json({ user: publicUser });
});

// Recebe a chave pública ECDH gerada no dispositivo do utilizador (para criptografia ponta-a-ponta).
// A chave privada correspondente NUNCA sai do dispositivo — isto é só a metade pública.
router.put('/me/public-key', authRequired, async (req, res) => {
  const { publicKey } = req.body || {};
  if (!publicKey || typeof publicKey !== 'string') {
    return res.status(400).json({ error: 'Chave pública inválida.' });
  }
  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.publicKey = publicKey;
  await saveUsers(users);
  res.json({ success: true });
});

router.put('/me', authRequired, async (req, res) => {
  try {
    const { name, username, bio, avatar, banner, customStatus, password, newPassword } = req.body || {};
    const users = getUsers();
    const user = users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

    if (name !== undefined) {
      if (!isNonEmptyString(name, 60)) return res.status(400).json({ error: 'Nome inválido.' });
      user.name = sanitizeText(name, 60);
    }

    if (username !== undefined) {
      const cleanUsername = sanitizeUsername(username);
      if (!cleanUsername || cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username inválido.' });
      }
      if (cleanUsername !== user.username && users.some((u) => u.username === cleanUsername)) {
        return res.status(409).json({ error: 'Esse username já está em uso.' });
      }
      user.username = cleanUsername;
    }

    if (bio !== undefined) {
      user.bio = sanitizeText(bio, 160);
    }

    if (avatar !== undefined) {
      user.avatar = typeof avatar === 'string' ? avatar : null;
    }

    if (banner !== undefined) {
      user.banner = typeof banner === 'string' ? banner : null;
    }

    if (customStatus !== undefined) {
      user.customStatus = sanitizeText(customStatus, 80);
    }

    if (req.body.privacy !== undefined && typeof req.body.privacy === 'object') {
      const { showOnlineStatus, showReadReceipts, allowMessagesFrom } = req.body.privacy;
      user.privacy = {
        showOnlineStatus: showOnlineStatus !== undefined ? !!showOnlineStatus : user.privacy?.showOnlineStatus ?? true,
        showReadReceipts: showReadReceipts !== undefined ? !!showReadReceipts : user.privacy?.showReadReceipts ?? true,
        allowMessagesFrom: ['everyone', 'nobody'].includes(allowMessagesFrom)
          ? allowMessagesFrom
          : user.privacy?.allowMessagesFrom || 'everyone',
      };
    }

    if (newPassword) {
      if (!password) {
        return res.status(400).json({ error: 'Confirma a tua senha actual para a alterar.' });
      }
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return res.status(401).json({ error: 'Senha actual incorrecta.' });
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await saveUsers(users);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao actualizar perfil.' });
  }
});

module.exports = router;
