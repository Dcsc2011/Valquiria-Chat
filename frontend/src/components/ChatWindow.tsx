import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Users, Lock, LockOpen } from 'lucide-react';
import Avatar from './Avatar';
import Logo from './Logo';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { BadgeList } from './Badge';
import ProfileViewModal from './ProfileViewModal';
import { useCatalog } from '../context/CatalogContext';
import { formatDay, formatLastSeen } from '../utils/format';
import type { ChatSummary, Message, User } from '../types';

interface ChatWindowProps {
  chat: ChatSummary | null;
  messages: Message[];
  currentUser: User;
  isOtherTyping: boolean;
  typingNames?: string[];
  onSendText: (content: string) => void;
  onSendFile: (payload: { type: 'image' | 'document' | 'audio'; fileUrl: string; fileName: string; viewOnce?: boolean }) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onBack: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onOpenViewOnce: (messageId: string) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
  onOpenGroupInfo?: () => void;
}

export default function ChatWindow({
  chat,
  messages,
  currentUser,
  isOtherTyping,
  typingNames,
  onSendText,
  onSendFile,
  onTyping,
  onStopTyping,
  onBack,
  onReact,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onOpenViewOnce,
  replyingTo,
  onCancelReply,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  onOpenGroupInfo,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { getEquipped } = useCatalog();
  const [viewingProfile, setViewingProfile] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOtherTyping]);

  const isGroup = chat?.type === 'group';

  const getSender = useMemo(() => {
    return (senderId: string): User | undefined => {
      if (senderId === currentUser.id) return currentUser;
      if (isGroup) return chat?.participants?.find((p) => p.id === senderId);
      return chat?.otherUser || undefined;
    };
  }, [chat, currentUser, isGroup]);

  const findMessage = (id: string | null) => (id ? messages.find((m) => m.id === id) || null : null);

  if (!chat || (!isGroup && !chat.otherUser)) {
    return (
      <div className="hidden h-full flex-1 flex-col items-center justify-center bg-bgChat chat-bg text-textMuted md:flex">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-panelLight">
          <Logo size={44} />
        </div>
        <p className="mt-4 text-lg text-textPrimary">Valquíria Chat</p>
        <p className="mt-1 text-sm">Selecciona uma conversa para começar a falar</p>
      </div>
    );
  }

  const headerName = isGroup ? chat.name || 'Grupo' : chat.otherUser?.name || '';
  const headerAvatar = isGroup ? chat.avatar : chat.otherUser?.avatar;

  let lastDay = '';

  return (
    <div className="flex h-full flex-1 flex-col bg-bgChat chat-bg">
      <button
        onClick={isGroup ? onOpenGroupInfo : () => setViewingProfile(true)}
        className="flex items-center gap-3 bg-panelHeader px-4 py-2.5 text-left"
      >
        <span onClick={(e) => { e.stopPropagation(); onBack(); }} className="rounded-full p-1.5 hover:bg-panel/60 md:hidden">
          <ArrowLeft className="h-5 w-5 text-textMuted" />
        </span>
        {isGroup ? (
          headerAvatar ? (
            <Avatar src={headerAvatar} name={headerName} size={38} />
          ) : (
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-panel">
              <Users className="h-5 w-5 text-textMuted" />
            </div>
          )
        ) : (
          <Avatar
            src={chat.otherUser?.avatar}
            name={headerName}
            size={38}
            online={chat.otherUser?.isOnline}
            statusMode={chat.otherUser?.statusMode}
            frame={chat.otherUser ? getEquipped(chat.otherUser).frame : undefined}
            aura={chat.otherUser ? getEquipped(chat.otherUser).aura : undefined}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-medium text-textPrimary">
            {headerName}
            {!isGroup && chat.otherUser && <BadgeList badges={chat.otherUser.badges} />}
            {chat.myEncryptedKey ? (
              <span title="Mensagens encriptadas ponta-a-ponta">
                <Lock className="h-3 w-3 shrink-0 text-accent" />
              </span>
            ) : (
              <span title="Ainda sem encriptação ponta-a-ponta">
                <LockOpen className="h-3 w-3 shrink-0 text-textMuted" />
              </span>
            )}
          </p>
          <p className="truncate text-xs text-textMuted">
            {isOtherTyping ? (
              <span className="italic text-accent">
                {typingNames && typingNames.length > 0 ? `${typingNames.join(', ')} a escrever...` : 'a escrever...'}
              </span>
            ) : isGroup ? (
              `${chat.participants?.length || 0} membros`
            ) : chat.otherUser?.isOnline ? (
              chat.otherUser.statusMode === 'away'
                ? 'ausente'
                : chat.otherUser.statusMode === 'busy'
                ? 'ocupado'
                : 'online'
            ) : (
              formatLastSeen(chat.otherUser?.lastSeen)
            )}
            {!isOtherTyping && !isGroup && chat.otherUser?.customStatus && (
              <span> · {chat.otherUser.customStatus}</span>
            )}
          </p>
        </div>
      </button>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col">
          {messages.map((m, idx) => {
            const day = formatDay(m.createdAt);
            const showDaySeparator = day !== lastDay;
            lastDay = day;
            const prev = messages[idx - 1];
            const sender = getSender(m.senderId);
            const withinGroupWindow =
              !!prev && prev.senderId === m.senderId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
            const showHeader = showDaySeparator || !withinGroupWindow;
            const quotedMessage = findMessage(m.replyTo);
            const quotedSender = quotedMessage ? getSender(quotedMessage.senderId) : undefined;

            return (
              <React.Fragment key={m.id}>
                {showDaySeparator && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-md bg-panelLight px-3 py-1 text-xs text-textMuted shadow">{day}</span>
                  </div>
                )}
                <MessageBubble
                  message={m}
                  mine={m.senderId === currentUser.id}
                  currentUserId={currentUser.id}
                  sender={sender}
                  showHeader={showHeader}
                  quotedMessage={quotedMessage}
                  quotedSenderName={quotedSender?.name}
                  onReact={(emoji) => onReact(m.id, emoji)}
                  onReply={() => onReply(m)}
                  onEdit={() => onEditMessage(m)}
                  onDelete={() => onDeleteMessage(m.id)}
                  onOpenViewOnce={() => onOpenViewOnce(m.id)}
                />
              </React.Fragment>
            );
          })}

          {isOtherTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-lg bg-bubbleIn px-3 py-2.5">
                <span className="typing-dot h-2 w-2 rounded-full bg-textMuted" />
                <span className="typing-dot h-2 w-2 rounded-full bg-textMuted" />
                <span className="typing-dot h-2 w-2 rounded-full bg-textMuted" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <MessageInput
        onSendText={onSendText}
        onSendFile={onSendFile}
        onTyping={onTyping}
        onStopTyping={onStopTyping}
        replyingTo={replyingTo}
        replyingToSenderName={replyingTo ? getSender(replyingTo.senderId)?.name : undefined}
        onCancelReply={onCancelReply}
        editingMessage={editingMessage}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
      />

      {viewingProfile && !isGroup && chat.otherUser && (
        <ProfileViewModal userId={chat.otherUser.id} onClose={() => setViewingProfile(false)} />
      )}
    </div>
  );
}
