const express = require('express');
const { getUsers, getChats } = require('../services/store');
const { authRequired } = require('../middleware/auth');
const { toPublicUser } = require('./auth');

const router = express.Router();

// Pesquisa global: utilizadores e grupos a que pertenço.
// Nota: as mensagens de texto são cifradas ponta-a-ponta — o servidor nunca vê o
// conteúdo em claro, por isso não é (nem pode ser) possível pesquisar dentro de mensagens aqui.
router.get('/', authRequired, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [], groups: [], messages: [], messagesSearchDisabled: true });

  const users = getUsers();
  const chats = getChats();

  const matchedUsers = users
    .filter((u) => u.id !== req.user.id)
    .filter((u) => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    .slice(0, 10)
    .map(toPublicUser);

  const myChats = chats.filter((c) => c.participants.includes(req.user.id));

  const matchedGroups = myChats
    .filter((c) => c.type === 'group' && c.name && c.name.toLowerCase().includes(q))
    .slice(0, 10)
    .map((c) => ({ id: c.id, name: c.name, avatar: c.avatar || null }));

  res.json({ users: matchedUsers, groups: matchedGroups, messages: [], messagesSearchDisabled: true });
});

module.exports = router;
