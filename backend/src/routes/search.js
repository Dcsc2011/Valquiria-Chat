const express = require('express');
const { getUsers, getChats, getMessages } = require('../services/store');
const { authRequired } = require('../middleware/auth');
const { toPublicUser } = require('./auth');

const router = express.Router();

// Pesquisa global: utilizadores, grupos a que pertenço, e mensagens dentro das minhas conversas.
router.get('/', authRequired, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [], groups: [], messages: [] });

  const users = getUsers();
  const chats = getChats();
  const messages = getMessages();

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

  const myChatIds = new Set(myChats.map((c) => c.id));
  const matchedMessages = messages
    .filter((m) => myChatIds.has(m.chatId) && !m.deleted && (m.type === 'text' || m.type === 'emoji'))
    .filter((m) => m.content.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map((m) => ({ id: m.id, chatId: m.chatId, content: m.content, createdAt: m.createdAt, senderId: m.senderId }));

  res.json({ users: matchedUsers, groups: matchedGroups, messages: matchedMessages });
});

module.exports = router;
