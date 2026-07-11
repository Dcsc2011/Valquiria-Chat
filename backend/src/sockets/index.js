const jwt = require('jsonwebtoken');
const { getUsers, saveUsers, getChats } = require('../services/store');
const {
  createMessage,
  markDelivered,
  markRead,
  toggleReaction,
  editMessage,
  deleteMessage,
  openViewOnce,
} = require('../services/messageService');
const { registerMessageActivity } = require('../services/gamification');
const { pushNotification } = require('../services/notificationService');

// Mapa userId -> Set de socket ids (permite múltiplas abas/dispositivos).
const onlineUsers = new Map();

function addOnlineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeOnlineSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(userId);
    return true; // ficou totalmente offline
  }
  return false;
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

function emitToChatParticipants(io, chat, event, payload) {
  for (const participantId of chat.participants) {
    io.to(`user:${participantId}`).emit(event, payload);
  }
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token não fornecido.'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch (err) {
      next(new Error('Token inválido.'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    addOnlineSocket(userId, socket.id);

    const users = getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.isOnline = true;
      user.lastSeen = new Date().toISOString();
      await saveUsers(users);
    }

    io.emit('userOnline', {
      userId,
      lastSeen: new Date().toISOString(),
      statusMode: user?.statusMode || 'online',
    });

    socket.on('message', async (payload, ack) => {
      try {
        const { chatId, type, content, fileUrl, fileName, replyTo, mentions, viewOnce } = payload || {};
        const { message, chat } = await createMessage({
          chatId,
          senderId: userId,
          type,
          content,
          fileUrl,
          fileName,
          replyTo,
          mentions,
          viewOnce,
        });

        emitToChatParticipants(io, chat, 'message', { message });

        const othersOnline = chat.participants.some((id) => id !== userId && isUserOnline(id));
        if (othersOnline) {
          const updatedMsg = await markDelivered(message.id);
          emitToChatParticipants(io, chat, 'messageStatus', {
            messageId: message.id,
            status: updatedMsg?.status || 'delivered',
          });
        }

        // Gamificação: XP, nível e conquistas por actividade de mensagens.
        const activity = await registerMessageActivity(userId);
        if (activity.leveledUp) {
          await pushNotification(userId, {
            type: 'level_up',
            title: 'Subiste de nível!',
            body: `Chegaste ao nível ${activity.newLevel}.`,
          });
          io.to(`user:${userId}`).emit('levelUp', { level: activity.newLevel });
        }
        for (const achievementId of activity.newAchievements) {
          await pushNotification(userId, {
            type: 'achievement',
            title: 'Nova conquista desbloqueada!',
            body: achievementId,
            data: { achievementId },
          });
          io.to(`user:${userId}`).emit('achievementUnlocked', { achievementId });
        }

        // Notificações de menção (@utilizador) em mensagens de grupo.
        if (message.mentions && message.mentions.length > 0) {
          for (const mentionedId of message.mentions) {
            if (mentionedId === userId) continue;
            await pushNotification(mentionedId, {
              type: 'mention',
              title: 'Foste mencionado',
              body: message.content.slice(0, 80),
              data: { chatId: chat.id, messageId: message.id },
            });
            io.to(`user:${mentionedId}`).emit('notification', { type: 'mention', chatId: chat.id });
          }
        }

        if (typeof ack === 'function') ack({ success: true, message });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    socket.on('typing', ({ chatId, toUserId }) => {
      if (!chatId) return;
      const chats = getChats();
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;
      for (const pid of chat.participants) {
        if (pid !== userId) io.to(`user:${pid}`).emit('typing', { chatId, fromUserId: userId });
      }
      void toUserId; // mantido por compatibilidade com clientes antigos
    });

    socket.on('stopTyping', ({ chatId, toUserId }) => {
      if (!chatId) return;
      const chats = getChats();
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;
      for (const pid of chat.participants) {
        if (pid !== userId) io.to(`user:${pid}`).emit('stopTyping', { chatId, fromUserId: userId });
      }
      void toUserId;
    });

    socket.on('readMessage', async ({ chatId }) => {
      if (!chatId) return;
      const updatedIds = await markRead(chatId, userId);
      if (updatedIds.length > 0) {
        const chats = getChats();
        const chat = chats.find((c) => c.id === chatId);
        if (chat) {
          emitToChatParticipants(io, chat, 'readMessage', {
            chatId,
            messageIds: updatedIds,
            readerId: userId,
          });
        }
      }
    });

    socket.on('reactMessage', async ({ chatId, messageId, emoji }) => {
      try {
        if (!chatId || !messageId || !emoji) return;
        const chats = getChats();
        const chat = chats.find((c) => c.id === chatId && c.participants.includes(userId));
        if (!chat) return;
        const message = await toggleReaction(messageId, userId, emoji);
        emitToChatParticipants(io, chat, 'messageReaction', {
          messageId: message.id,
          reactions: message.reactions,
        });

        const reactedNow = (message.reactions[emoji] || []).includes(userId);
        if (reactedNow && message.senderId !== userId) {
          await pushNotification(message.senderId, {
            type: 'reaction',
            title: 'Reagiram à tua mensagem',
            body: emoji,
            data: { chatId, messageId },
          });
          io.to(`user:${message.senderId}`).emit('notification', { type: 'reaction', chatId });
        }
      } catch (err) {
        socket.emit('errorEvent', { error: err.message });
      }
    });

    socket.on('editMessage', async ({ chatId, messageId, content }) => {
      try {
        if (!chatId || !messageId) return;
        const chats = getChats();
        const chat = chats.find((c) => c.id === chatId && c.participants.includes(userId));
        if (!chat) return;
        const message = await editMessage(messageId, userId, content);
        emitToChatParticipants(io, chat, 'messageEdited', {
          messageId: message.id,
          content: message.content,
          editedAt: message.editedAt,
        });
      } catch (err) {
        socket.emit('errorEvent', { error: err.message });
      }
    });

    socket.on('deleteMessage', async ({ chatId, messageId }) => {
      try {
        if (!chatId || !messageId) return;
        const chats = getChats();
        const chat = chats.find((c) => c.id === chatId && c.participants.includes(userId));
        if (!chat) return;
        const isGroupAdmin = chat.type === 'group' && (chat.admins || []).includes(userId);
        await deleteMessage(messageId, userId, isGroupAdmin);
        emitToChatParticipants(io, chat, 'messageDeleted', { messageId });
      } catch (err) {
        socket.emit('errorEvent', { error: err.message });
      }
    });

    socket.on('openViewOnce', async ({ chatId, messageId }, ack) => {
      try {
        if (!chatId || !messageId) return;
        const chats = getChats();
        const chat = chats.find((c) => c.id === chatId && c.participants.includes(userId));
        if (!chat) return;
        const message = await openViewOnce(messageId, userId);
        emitToChatParticipants(io, chat, 'messageViewOnceOpened', {
          messageId: message.id,
          viewOnceOpenedBy: message.viewOnceOpenedBy,
        });
        if (typeof ack === 'function') ack({ success: true, message });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    socket.on('statusChange', async ({ statusMode }) => {
      const validModes = ['online', 'away', 'busy', 'invisible'];
      if (!validModes.includes(statusMode)) return;
      const usersNow = getUsers();
      const u = usersNow.find((x) => x.id === userId);
      if (u) {
        u.statusMode = statusMode;
        await saveUsers(usersNow);
      }
      io.emit('userStatusChanged', { userId, statusMode });
    });

    socket.on('disconnect', async () => {
      const wentOffline = removeOnlineSocket(userId, socket.id);
      if (wentOffline) {
        const usersNow = getUsers();
        const u = usersNow.find((x) => x.id === userId);
        const lastSeen = new Date().toISOString();
        if (u) {
          u.isOnline = false;
          u.lastSeen = lastSeen;
          await saveUsers(usersNow);
        }
        io.emit('userOffline', { userId, lastSeen });
      }
    });
  });
}

module.exports = { registerSocketHandlers, isUserOnline, onlineUsers };
