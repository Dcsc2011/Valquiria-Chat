const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { getChats, saveChats, getMessages, getUsers } = require('../services/store');
const { authRequired } = require('../middleware/auth');
const { toPublicUser } = require('./auth');
const { sanitizeText, isNonEmptyString } = require('../utils/sanitize');
const { pushNotification } = require('../services/notificationService');

const router = express.Router();

function chatWithMeta(chat, userId, users, messages) {
  const chatMessages = messages
    .filter((m) => m.chatId === chat.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const lastMessage = chatMessages[chatMessages.length - 1] || null;
  const unreadCount = chatMessages.filter(
    (m) => m.senderId !== userId && !(m.readBy || []).includes(userId) && !m.deleted
  ).length;

  const base = {
    id: chat.id,
    type: chat.type || 'direct',
    lastMessage,
    unreadCount,
    updatedAt: chat.updatedAt || chat.createdAt,
  };

  if (base.type === 'group') {
    return {
      ...base,
      name: chat.name,
      avatar: chat.avatar || null,
      participants: chat.participants
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean)
        .map(toPublicUser),
      admins: chat.admins || [],
      createdBy: chat.createdBy,
    };
  }

  const otherUserId = chat.participants.find((id) => id !== userId);
  const otherUser = users.find((u) => u.id === otherUserId);
  return { ...base, otherUser: otherUser ? toPublicUser(otherUser) : null };
}

// Lista todas as conversas (directas e de grupo) do utilizador autenticado.
router.get('/', authRequired, (req, res) => {
  const chats = getChats();
  const users = getUsers();
  const messages = getMessages();

  const mine = chats
    .filter((c) => c.participants.includes(req.user.id))
    .map((c) => chatWithMeta(c, req.user.id, users, messages))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({ chats: mine });
});

// Cria (ou devolve, caso já exista) uma conversa directa entre dois utilizadores.
router.post('/:userId', authRequired, async (req, res) => {
  const otherUserId = req.params.userId;
  if (otherUserId === req.user.id) {
    return res.status(400).json({ error: 'Não podes conversar contigo mesmo.' });
  }

  const users = getUsers();
  const otherUser = users.find((u) => u.id === otherUserId);
  if (!otherUser) return res.status(404).json({ error: 'Utilizador não encontrado.' });

  const chats = getChats();
  const existingChat = chats.find(
    (c) =>
      (c.type || 'direct') === 'direct' &&
      c.participants.includes(req.user.id) &&
      c.participants.includes(otherUserId)
  );

  if (!existingChat && otherUser.privacy?.allowMessagesFrom === 'nobody') {
    return res.status(403).json({ error: 'Este utilizador não está a aceitar novas conversas.' });
  }

  let chat = existingChat;

  if (!chat) {
    chat = {
      id: uuidv4(),
      type: 'direct',
      participants: [req.user.id, otherUserId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    chats.push(chat);
    await saveChats(chats);
  }

  const messages = getMessages();
  res.json({ chat: chatWithMeta(chat, req.user.id, users, messages) });
});

// ---------- Grupos ----------

// Cria um grupo com um nome e uma lista de membros (o criador é automaticamente admin).
router.post('/group/create', authRequired, async (req, res) => {
  const { name, memberIds, avatar } = req.body || {};
  if (!isNonEmptyString(name, 60)) {
    return res.status(400).json({ error: 'Dá um nome ao grupo.' });
  }
  if (!Array.isArray(memberIds) || memberIds.length < 1) {
    return res.status(400).json({ error: 'Selecciona pelo menos mais um membro para o grupo.' });
  }

  const users = getUsers();
  const validMemberIds = memberIds.filter((id) => users.some((u) => u.id === id) && id !== req.user.id);
  const participants = [...new Set([req.user.id, ...validMemberIds])];

  if (participants.length < 2) {
    return res.status(400).json({ error: 'Um grupo precisa de pelo menos 2 membros.' });
  }

  const chats = getChats();
  const chat = {
    id: uuidv4(),
    type: 'group',
    name: sanitizeText(name, 60),
    avatar: typeof avatar === 'string' ? avatar : null,
    participants,
    admins: [req.user.id],
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  chats.push(chat);
  await saveChats(chats);

  for (const memberId of validMemberIds) {
    await pushNotification(memberId, {
      type: 'group_invite',
      title: 'Adicionado a um grupo',
      body: `Foste adicionado ao grupo "${chat.name}".`,
      data: { chatId: chat.id },
    });
  }

  const messages = getMessages();
  res.status(201).json({ chat: chatWithMeta(chat, req.user.id, users, messages) });
});

function requireGroupAdmin(chat, userId) {
  return chat.type === 'group' && (chat.admins || []).includes(userId);
}

// Actualiza nome/avatar do grupo (apenas admins do grupo).
router.put('/:chatId/group', authRequired, async (req, res) => {
  const chats = getChats();
  const chat = chats.find((c) => c.id === req.params.chatId && c.type === 'group');
  if (!chat || !chat.participants.includes(req.user.id)) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }
  if (!requireGroupAdmin(chat, req.user.id)) {
    return res.status(403).json({ error: 'Apenas administradores do grupo podem editar.' });
  }

  const { name, avatar } = req.body || {};
  if (name !== undefined) {
    if (!isNonEmptyString(name, 60)) return res.status(400).json({ error: 'Nome inválido.' });
    chat.name = sanitizeText(name, 60);
  }
  if (avatar !== undefined) chat.avatar = avatar;
  chat.updatedAt = new Date().toISOString();
  await saveChats(chats);

  const users = getUsers();
  const messages = getMessages();
  res.json({ chat: chatWithMeta(chat, req.user.id, users, messages) });
});

// Adiciona membros ao grupo (apenas admins do grupo).
router.post('/:chatId/members', authRequired, async (req, res) => {
  const chats = getChats();
  const chat = chats.find((c) => c.id === req.params.chatId && c.type === 'group');
  if (!chat || !chat.participants.includes(req.user.id)) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }
  if (!requireGroupAdmin(chat, req.user.id)) {
    return res.status(403).json({ error: 'Apenas administradores do grupo podem adicionar membros.' });
  }

  const { memberIds } = req.body || {};
  const users = getUsers();
  const validIds = (memberIds || []).filter((id) => users.some((u) => u.id === id) && !chat.participants.includes(id));
  chat.participants = [...new Set([...chat.participants, ...validIds])];
  chat.updatedAt = new Date().toISOString();
  await saveChats(chats);

  for (const memberId of validIds) {
    await pushNotification(memberId, {
      type: 'group_invite',
      title: 'Adicionado a um grupo',
      body: `Foste adicionado ao grupo "${chat.name}".`,
      data: { chatId: chat.id },
    });
  }

  const messages = getMessages();
  res.json({ chat: chatWithMeta(chat, req.user.id, users, messages) });
});

// Remove um membro do grupo (admin remove outro, ou o próprio utilizador sai).
router.delete('/:chatId/members/:userId', authRequired, async (req, res) => {
  const chats = getChats();
  const chat = chats.find((c) => c.id === req.params.chatId && c.type === 'group');
  if (!chat || !chat.participants.includes(req.user.id)) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }

  const isSelf = req.params.userId === req.user.id;
  if (!isSelf && !requireGroupAdmin(chat, req.user.id)) {
    return res.status(403).json({ error: 'Apenas administradores do grupo podem remover membros.' });
  }

  chat.participants = chat.participants.filter((id) => id !== req.params.userId);
  chat.admins = (chat.admins || []).filter((id) => id !== req.params.userId);
  chat.updatedAt = new Date().toISOString();
  await saveChats(chats);

  res.json({ success: true });
});

// Promove/despromove um membro a administrador do grupo.
router.post('/:chatId/admins/:userId', authRequired, async (req, res) => {
  const chats = getChats();
  const chat = chats.find((c) => c.id === req.params.chatId && c.type === 'group');
  if (!chat || !chat.participants.includes(req.user.id)) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }
  if (!requireGroupAdmin(chat, req.user.id)) {
    return res.status(403).json({ error: 'Apenas administradores do grupo podem promover membros.' });
  }
  if (!chat.participants.includes(req.params.userId)) {
    return res.status(404).json({ error: 'Este utilizador não pertence ao grupo.' });
  }

  chat.admins = chat.admins || [];
  if (chat.admins.includes(req.params.userId)) {
    chat.admins = chat.admins.filter((id) => id !== req.params.userId);
  } else {
    chat.admins.push(req.params.userId);
  }
  await saveChats(chats);
  res.json({ admins: chat.admins });
});

// Lista as mensagens de uma conversa (directa ou de grupo), garantindo que o utilizador pertence a ela.
router.get('/:chatId/messages', authRequired, (req, res) => {
  const chats = getChats();
  const chat = chats.find((c) => c.id === req.params.chatId);
  if (!chat || !chat.participants.includes(req.user.id)) {
    return res.status(404).json({ error: 'Conversa não encontrada.' });
  }

  const messages = getMessages()
    .filter((m) => m.chatId === chat.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ messages });
});

module.exports = router;
