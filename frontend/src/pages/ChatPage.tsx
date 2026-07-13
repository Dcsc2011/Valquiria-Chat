import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications';
import { useCrypto } from '../context/CryptoContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import GroupInfoModal from '../components/GroupInfoModal';
import type { ChatSummary, Message, User } from '../types';

export default function ChatPage() {
  const { user, setUser } = useAuth();
  const socket = useSocket();
  const { notify } = useBrowserNotifications();
  const crypto = useCrypto();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [plaintextCache, setPlaintextCache] = useState<Record<string, string>>({});
  const [typingChatIds, setTypingChatIds] = useState<Set<string>>(new Set());
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  const chatsRef = useRef<ChatSummary[]>([]);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Desencripta (no cliente) todas as mensagens de texto/emoji cifradas da conversa activa.
  // O resultado nunca é reenviado ao servidor — só existe em memória para mostrar na UI.
  useEffect(() => {
    if (!activeChat) return;
    let cancelled = false;
    (async () => {
      const toDecrypt = messages.filter(
        (m) => m.encrypted && (m.type === 'text' || m.type === 'emoji') && plaintextCache[m.id] === undefined
      );
      if (toDecrypt.length === 0) return;
      const entries = await Promise.all(
        toDecrypt.map(async (m) => [m.id, await crypto.decryptForChat(activeChat, { content: m.content, iv: m.iv })] as const)
      );
      if (!cancelled) {
        setPlaintextCache((prev) => {
          const next = { ...prev };
          for (const [id, text] of entries) next[id] = text;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, activeChat, crypto]);

  const displayMessages = useMemo(
    () => messages.map((m) => (m.encrypted ? { ...m, content: plaintextCache[m.id] ?? '🔒 A desencriptar...' } : m)),
    [messages, plaintextCache]
  );

  const decryptSingle = useCallback(
    async (chat: ChatSummary, message: Message): Promise<string> => {
      if (!message.encrypted) return message.content;
      return crypto.decryptForChat(chat, { content: message.content, iv: message.iv });
    },
    [crypto]
  );

  const loadChats = useCallback(async () => {
    const res = await client.get('/chats');
    setChats(res.data.chats);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const openChat = useCallback(
    async (chat: ChatSummary) => {
      setActiveChat(chat);
      setShowSidebarMobile(false);
      setReplyingTo(null);
      setEditingMessage(null);

      if (!chat.myEncryptedKey) {
        const encryptedKeys = await crypto.establishEncryptionIfMissing(chat);
        if (encryptedKeys) {
          try {
            await client.put(`/chats/${chat.id}/keys`, { encryptedKeys });
            // Recarrega a conversa para obter a própria entrada de chave a partir do servidor.
            const refreshed = await client.get('/chats');
            const found = refreshed.data.chats.find((c: ChatSummary) => c.id === chat.id);
            if (found) {
              setChats(refreshed.data.chats);
              setActiveChat(found);
              chat = found;
            }
          } catch {
            // Outro dispositivo pode ter estabelecido a chave entretanto — não é grave, ignora.
          }
        }
      }

      const res = await client.get(`/chats/${chat.id}/messages`);
      setMessages(res.data.messages);
    },
    [crypto]
  );

  const startChatWithUser = useCallback(
    async (otherUser: User) => {
      const encryptedKeys = user ? await crypto.buildEncryptedKeysForNewChat([otherUser, user]) : null;
      const res = await client.post(`/chats/${otherUser.id}`, encryptedKeys ? { encryptedKeys } : {});
      const chat: ChatSummary = res.data.chat;
      setChats((prev) => {
        const exists = prev.find((c) => c.id === chat.id);
        return exists ? prev : [chat, ...prev];
      });
      openChat(chat);
    },
    [openChat, crypto, user]
  );

  const onGroupCreated = useCallback(
    (chat: ChatSummary) => {
      setChats((prev) => [chat, ...prev]);
      openChat(chat);
    },
    [openChat]
  );

  const getOtherParticipantIds = useCallback((chat: ChatSummary, selfId: string): string[] => {
    if (chat.type === 'group') return (chat.participants || []).map((p) => p.id).filter((id) => id !== selfId);
    return chat.otherUser ? [chat.otherUser.id] : [];
  }, []);

  // Marca como lidas as mensagens da conversa activa.
  useEffect(() => {
    if (!socket || !activeChat) return;
    socket.emit('readMessage', { chatId: activeChat.id });
  }, [socket, activeChat, messages.length]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = ({ message }: { message: Message }) => {
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === message.chatId
            ? {
                ...c,
                lastMessage: message,
                updatedAt: message.createdAt,
                unreadCount:
                  activeChat?.id === message.chatId || message.senderId === user?.id
                    ? c.unreadCount
                    : c.unreadCount + 1,
              }
            : c
        );
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      setMessages((prev) => (activeChat?.id === message.chatId ? [...prev, message] : prev));

      if (message.senderId !== user?.id) {
        const chat = chatsRef.current.find((c) => c.id === message.chatId);
        const senderName =
          chat?.type === 'group'
            ? chat.participants?.find((p) => p.id === message.senderId)?.name || 'Alguém'
            : chat?.otherUser?.name || 'Nova mensagem';
        const chatLabel = chat?.type === 'group' ? `${chat.name} · ${senderName}` : senderName;

        (async () => {
          let preview: string;
          if (message.type === 'text' || message.type === 'emoji') {
            preview = chat ? await decryptSingle(chat, message) : message.content;
          } else if (message.type === 'image') {
            preview = message.viewOnce ? '👁 Visualização única' : '📷 Imagem';
          } else if (message.type === 'audio') {
            preview = message.viewOnce ? '👁 Visualização única' : '🎤 Áudio';
          } else {
            preview = '📄 Documento';
          }
          notify(chatLabel, { body: preview });
        })();
      }
    };

    const handleMessageStatus = ({ messageId, status }: { messageId: string; status: Message['status'] }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status } : m)));
    };

    const handleReadMessage = ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.chatId === chatId && messageIds.includes(m.id) ? { ...m, status: 'read' } : m))
      );
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)));
    };

    const handleReaction = ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    };

    const handleEdited = ({ messageId, content, iv, editedAt }: { messageId: string; content: string; iv?: string | null; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, iv: iv ?? m.iv, edited: true, editedAt } : m))
      );
      setPlaintextCache((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    };

    const handleDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted: true, content: '' } : m)));
    };

    const handleViewOnceOpened = ({ messageId, viewOnceOpenedBy }: { messageId: string; viewOnceOpenedBy: string[] }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, viewOnceOpenedBy } : m)));
    };

    const handleTyping = ({ chatId }: { chatId: string }) => {
      setTypingChatIds((prev) => new Set(prev).add(chatId));
    };

    const handleStopTyping = ({ chatId }: { chatId: string }) => {
      setTypingChatIds((prev) => {
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });
    };

    const patchUserInChats = (userId: string, patch: Partial<User>) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.type === 'group') {
            return {
              ...c,
              participants: (c.participants || []).map((p) => (p.id === userId ? { ...p, ...patch } : p)),
            };
          }
          return c.otherUser?.id === userId ? { ...c, otherUser: { ...c.otherUser, ...patch } } : c;
        })
      );
      setActiveChat((prev) => {
        if (!prev) return prev;
        if (prev.type === 'group') {
          return {
            ...prev,
            participants: (prev.participants || []).map((p) => (p.id === userId ? { ...p, ...patch } : p)),
          };
        }
        return prev.otherUser?.id === userId ? { ...prev, otherUser: { ...prev.otherUser, ...patch } } : prev;
      });
    };

    const handleUserOnline = ({ userId, lastSeen }: { userId: string; lastSeen: string }) => {
      patchUserInChats(userId, { isOnline: true, lastSeen });
    };

    const handleUserOffline = ({ userId, lastSeen }: { userId: string; lastSeen: string }) => {
      patchUserInChats(userId, { isOnline: false, lastSeen });
    };

    const handleStatusChanged = ({ userId, statusMode }: { userId: string; statusMode: User['statusMode'] }) => {
      patchUserInChats(userId, { statusMode });
      if (userId === user?.id) setUser({ ...(user as User), statusMode });
    };

    socket.on('message', handleIncomingMessage);
    socket.on('messageStatus', handleMessageStatus);
    socket.on('readMessage', handleReadMessage);
    socket.on('messageReaction', handleReaction);
    socket.on('messageEdited', handleEdited);
    socket.on('messageDeleted', handleDeleted);
    socket.on('messageViewOnceOpened', handleViewOnceOpened);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);
    socket.on('userStatusChanged', handleStatusChanged);

    return () => {
      socket.off('message', handleIncomingMessage);
      socket.off('messageStatus', handleMessageStatus);
      socket.off('readMessage', handleReadMessage);
      socket.off('messageReaction', handleReaction);
      socket.off('messageEdited', handleEdited);
      socket.off('messageDeleted', handleDeleted);
      socket.off('messageViewOnceOpened', handleViewOnceOpened);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
      socket.off('userStatusChanged', handleStatusChanged);
    };
  }, [socket, activeChat, user, setUser, notify, decryptSingle]);

  const sendText = useCallback(
    async (content: string) => {
      if (!socket || !activeChat) return;
      const encryptedPayload = await crypto.encryptForChat(activeChat, content);
      socket.emit('message', {
        chatId: activeChat.id,
        type: 'text',
        content: encryptedPayload ? encryptedPayload.content : content,
        iv: encryptedPayload ? encryptedPayload.iv : null,
        encrypted: !!encryptedPayload,
        replyTo: replyingTo?.id || null,
      });
      setReplyingTo(null);
    },
    [socket, activeChat, replyingTo, crypto]
  );

  const sendFile = useCallback(
    (payload: { type: 'image' | 'document' | 'audio'; fileUrl: string; fileName: string; viewOnce?: boolean }) => {
      if (!socket || !activeChat) return;
      socket.emit('message', {
        chatId: activeChat.id,
        type: payload.type,
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        content: '',
        replyTo: replyingTo?.id || null,
        viewOnce: payload.viewOnce || false,
      });
      setReplyingTo(null);
    },
    [socket, activeChat, replyingTo]
  );

  const handleTypingStart = useCallback(() => {
    if (!socket || !activeChat) return;
    socket.emit('typing', { chatId: activeChat.id });
  }, [socket, activeChat]);

  const handleTypingStop = useCallback(() => {
    if (!socket || !activeChat) return;
    socket.emit('stopTyping', { chatId: activeChat.id });
  }, [socket, activeChat]);

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket || !activeChat) return;
      socket.emit('reactMessage', { chatId: activeChat.id, messageId, emoji });
    },
    [socket, activeChat]
  );

  const handleReply = useCallback((message: Message) => {
    setEditingMessage(null);
    setReplyingTo(message);
  }, []);

  const handleEditMessage = useCallback((message: Message) => {
    setReplyingTo(null);
    setEditingMessage(message);
  }, []);

  const handleSaveEdit = useCallback(
    async (content: string) => {
      if (!socket || !activeChat || !editingMessage) return;
      const encryptedPayload = await crypto.encryptForChat(activeChat, content);
      socket.emit('editMessage', {
        chatId: activeChat.id,
        messageId: editingMessage.id,
        content: encryptedPayload ? encryptedPayload.content : content,
        iv: encryptedPayload ? encryptedPayload.iv : null,
      });
      setEditingMessage(null);
    },
    [socket, activeChat, editingMessage, crypto]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!socket || !activeChat) return;
      if (!confirm('Apagar esta mensagem?')) return;
      socket.emit('deleteMessage', { chatId: activeChat.id, messageId });
    },
    [socket, activeChat]
  );

  const handleOpenViewOnce = useCallback(
    (messageId: string) => {
      if (!socket || !activeChat) return;
      socket.emit('openViewOnce', { chatId: activeChat.id, messageId });
    },
    [socket, activeChat]
  );

  const isOtherTyping = useMemo(
    () => (activeChat ? typingChatIds.has(activeChat.id) : false),
    [activeChat, typingChatIds]
  );

  if (!user) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className={`${showSidebarMobile ? 'flex' : 'hidden'} h-full w-full md:flex`}>
        <Sidebar
          chats={chats}
          activeChatId={activeChat?.id || null}
          onSelectChat={openChat}
          onStartChat={startChatWithUser}
          onGroupCreated={onGroupCreated}
          typingChatIds={typingChatIds}
        />
      </div>
      <div className={`${showSidebarMobile ? 'hidden' : 'flex'} h-full w-full md:flex`}>
        <ChatWindow
          chat={activeChat}
          messages={displayMessages}
          currentUser={user}
          isOtherTyping={isOtherTyping}
          onSendText={sendText}
          onSendFile={sendFile}
          onTyping={handleTypingStart}
          onStopTyping={handleTypingStop}
          onBack={() => setShowSidebarMobile(true)}
          onReact={handleReact}
          onReply={handleReply}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onOpenViewOnce={handleOpenViewOnce}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingMessage(null)}
          onOpenGroupInfo={() => setGroupInfoOpen(true)}
        />
      </div>

      {groupInfoOpen && activeChat && activeChat.type === 'group' && (
        <GroupInfoModal
          chat={activeChat}
          currentUserId={user.id}
          onClose={() => setGroupInfoOpen(false)}
          onUpdated={(updated) => {
            setActiveChat(updated);
            setChats((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
          }}
          onLeft={() => {
            setGroupInfoOpen(false);
            setChats((prev) => prev.filter((c) => c.id !== activeChat.id));
            setActiveChat(null);
            setShowSidebarMobile(true);
          }}
        />
      )}
    </div>
  );
}
