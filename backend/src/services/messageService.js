const { v4: uuidv4 } = require('uuid');
const { getChats, saveChats, getMessages, saveMessages } = require('./store');
const { sanitizeText } = require('../utils/sanitize');

const ALLOWED_TYPES = ['text', 'emoji', 'image', 'document', 'audio'];
const MAX_REACTION_LENGTH = 8; // um emoji cabe confortavelmente aqui

async function createMessage({ chatId, senderId, type, content, fileUrl, fileName, replyTo, mentions, viewOnce }) {
  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error('Tipo de mensagem inválido.');
  }

  const chats = getChats();
  const chat = chats.find((c) => c.id === chatId);
  if (!chat || !chat.participants.includes(senderId)) {
    throw new Error('Conversa não encontrada.');
  }

  let replyToMessage = null;
  if (replyTo) {
    const messages = getMessages();
    replyToMessage = messages.find((m) => m.id === replyTo && m.chatId === chatId) || null;
  }

  const validMentions = Array.isArray(mentions)
    ? mentions.filter((id) => chat.participants.includes(id))
    : [];

  // Visualização única só faz sentido para imagens e áudios (conteúdo visual/sensível).
  const isViewOnceEligible = type === 'image' || type === 'audio';

  const message = {
    id: uuidv4(),
    chatId,
    senderId,
    type,
    content: type === 'text' || type === 'emoji' ? sanitizeText(content || '', 4000) : sanitizeText(content || '', 300),
    fileUrl: fileUrl || null,
    fileName: fileName || null,
    replyTo: replyToMessage ? replyToMessage.id : null,
    mentions: validMentions,
    reactions: {},
    edited: false,
    editedAt: null,
    deleted: false,
    viewOnce: isViewOnceEligible ? !!viewOnce : false,
    viewOnceOpenedBy: [],
    createdAt: new Date().toISOString(),
    status: 'sent',
    readBy: [],
  };

  const messages = getMessages();
  messages.push(message);
  await saveMessages(messages);

  chat.updatedAt = message.createdAt;
  await saveChats(chats);

  return { message, chat };
}

async function markDelivered(messageId) {
  const messages = getMessages();
  const message = messages.find((m) => m.id === messageId);
  if (message && message.status === 'sent') {
    message.status = 'delivered';
    await saveMessages(messages);
  }
  return message;
}

async function markRead(chatId, userId) {
  const messages = getMessages();
  let changed = false;
  const updated = [];
  for (const m of messages) {
    if (m.chatId === chatId && m.senderId !== userId && !(m.readBy || []).includes(userId)) {
      m.readBy = [...(m.readBy || []), userId];
      m.status = 'read';
      changed = true;
      updated.push(m.id);
    }
  }
  if (changed) await saveMessages(messages);
  return updated;
}

// Alterna a reacção de um utilizador a uma mensagem (adiciona se não tinha, remove se já tinha).
async function toggleReaction(messageId, userId, emoji) {
  const cleanEmoji = String(emoji || '').slice(0, MAX_REACTION_LENGTH);
  if (!cleanEmoji) throw new Error('Reacção inválida.');

  const messages = getMessages();
  const message = messages.find((m) => m.id === messageId);
  if (!message) throw new Error('Mensagem não encontrada.');

  message.reactions = message.reactions || {};
  const current = message.reactions[cleanEmoji] || [];

  if (current.includes(userId)) {
    message.reactions[cleanEmoji] = current.filter((id) => id !== userId);
    if (message.reactions[cleanEmoji].length === 0) delete message.reactions[cleanEmoji];
  } else {
    message.reactions[cleanEmoji] = [...current, userId];
  }

  await saveMessages(messages);
  return message;
}

async function editMessage(messageId, userId, newContent) {
  const messages = getMessages();
  const message = messages.find((m) => m.id === messageId);
  if (!message) throw new Error('Mensagem não encontrada.');
  if (message.senderId !== userId) throw new Error('Só podes editar as tuas próprias mensagens.');
  if (message.deleted) throw new Error('Não é possível editar uma mensagem apagada.');
  if (message.type !== 'text' && message.type !== 'emoji') {
    throw new Error('Só é possível editar mensagens de texto.');
  }

  message.content = sanitizeText(newContent || '', 4000);
  message.edited = true;
  message.editedAt = new Date().toISOString();
  await saveMessages(messages);
  return message;
}

async function deleteMessage(messageId, userId, isGroupAdmin) {
  const messages = getMessages();
  const message = messages.find((m) => m.id === messageId);
  if (!message) throw new Error('Mensagem não encontrada.');
  if (message.senderId !== userId && !isGroupAdmin) {
    throw new Error('Não tens permissão para apagar esta mensagem.');
  }

  message.deleted = true;
  message.content = '';
  message.fileUrl = null;
  message.fileName = null;
  message.reactions = {};
  await saveMessages(messages);
  return message;
}

// Marca uma mensagem de visualização única como vista por este utilizador.
// O remetente nunca é bloqueado (é o dono do conteúdo); cada outro destinatário só pode "abrir" uma vez.
async function openViewOnce(messageId, userId) {
  const messages = getMessages();
  const message = messages.find((m) => m.id === messageId);
  if (!message) throw new Error('Mensagem não encontrada.');
  if (!message.viewOnce) throw new Error('Esta mensagem não é de visualização única.');
  if (message.deleted) throw new Error('Esta mensagem foi apagada.');

  if (message.senderId === userId) {
    return message; // o remetente pode sempre rever a própria mensagem
  }

  if (!(message.viewOnceOpenedBy || []).includes(userId)) {
    message.viewOnceOpenedBy = [...(message.viewOnceOpenedBy || []), userId];
    await saveMessages(messages);
  }

  return message;
}

module.exports = {
  createMessage,
  markDelivered,
  markRead,
  toggleReaction,
  editMessage,
  deleteMessage,
  openViewOnce,
  ALLOWED_TYPES,
};
