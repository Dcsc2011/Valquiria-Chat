const express = require('express');
const { getUsers, saveUsers, getChats, getMessages } = require('../services/store');
const { ownerRequired } = require('../middleware/auth');
const { toPublicUser } = require('./auth');
const { sanitizeBadges } = require('../utils/badges');
const { grantExclusiveCosmetics } = require('../services/exclusiveCosmetics');

const router = express.Router();

// Resumo rápido do estado da instância, visível ao dono sem precisar do login de admin.
router.get('/summary', ownerRequired, (req, res) => {
  const users = getUsers();
  const chats = getChats();
  const messages = getMessages();

  res.json({
    totalUsers: users.length,
    onlineUsers: users.filter((u) => u.isOnline).length,
    totalChats: chats.length,
    totalGroups: chats.filter((c) => c.type === 'group').length,
    totalMessages: messages.length,
    admins: users.filter((u) => u.isAdmin).map(toPublicUser),
  });
});

router.get('/users', ownerRequired, (req, res) => {
  res.json({ users: getUsers().map(toPublicUser) });
});

// O dono pode atribuir insígnias de prestígio directamente, sem precisar do login de admin.
router.put('/users/:id/badges', ownerRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  user.badges = sanitizeBadges(req.body?.badges);
  grantExclusiveCosmetics(user);
  await saveUsers(users);
  res.json({ user: toPublicUser(user) });
});

module.exports = router;
