import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import GroupInfoModal from '../components/GroupInfoModal';
import type { ChatSummary, Message, User } from '../types';

export default function ChatPage() {
  const { user, setUser } = useAuth();
  const socket = useSocket();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingChatIds, setTypingChatIds] = useState<Set<string>>(new Set());
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  const loadChats = useCallback(async () => {
    const res = await client.get('/chats');
    setChats(res.data.chats);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const openChat = useCallback(async (chat: ChatSummary) => {
    setActiveChat(chat);
    setShowSidebarMobile(false);
    setReplyingTo(null);
    setEditingMessage(null);
    const res = await client.get(`/chats/${chat.id}/messages`);
    setMessages(res.data.messages);
  }, []);

  const startChatWithUser = useCallback(
    async (otherUser: User) => {
      const res = await client.post(`/chats/${otherUser.id}`);
      const chat: ChatSummary = res.data.chat;
      setChats((prev) => {
        const exists = prev.find((c) => c.id === chat.id);
        return exists ? prev : [chat, ...prev];
      });
      openChat(chat);
    },
    [openChat]
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

    const handleEdited = ({ messageId, content, editedAt }: { messageId: string; content: string; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, edited: true, editedAt } : m))
      );
    };

    const handleDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted: true, content: '' } : m)));
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
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
      socket.off('userStatusChanged', handleStatusChanged);
    };
  }, [socket, activeChat, user, setUser]);

  const sendText = useCallback(
    (content: string) => {
      if (!socket || !activeChat) return;
      socket.emit('message', {
        chatId: activeChat.id,
        type: 'text',
        content,
        replyTo: replyingTo?.id || null,
      });
      setReplyingTo(null);
    },
    [socket, activeChat, replyingTo]
  );

  const sendFile = useCallback(
    (payload: { type: 'image' | 'document' | 'audio'; fileUrl: string; fileName: string }) => {
      if (!socket || !activeChat) return;
      socket.emit('message', {
        chatId: activeChat.id,
        type: payload.type,
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        content: '',
        replyTo: replyingTo?.id || null,
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
    (content: string) => {
      if (!socket || !activeChat || !editingMessage) return;
      socket.emit('editMessage', { chatId: activeChat.id, messageId: editingMessage.id, content });
      setEditingMessage(null);
    },
    [socket, activeChat, editingMessage]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!socket || !activeChat) return;
      if (!confirm('Apagar esta mensagem?')) return;
      socket.emit('deleteMessage', { chatId: activeChat.id, messageId });
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
          messages={messages}
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
