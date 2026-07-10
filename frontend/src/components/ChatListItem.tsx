import React from 'react';
import Avatar from './Avatar';
import { formatTime } from '../utils/format';
import { useCatalog } from '../context/CatalogContext';
import type { ChatSummary } from '../types';
import { Image as ImageIcon, FileText, Mic, Check, CheckCheck, Users } from 'lucide-react';

interface ChatListItemProps {
  chat: ChatSummary;
  active: boolean;
  onClick: () => void;
  isTyping?: boolean;
  currentUserId: string;
}

function lastMessagePreview(chat: ChatSummary) {
  const m = chat.lastMessage;
  if (!m) return chat.type === 'group' ? 'Grupo criado' : 'Diz olá 👋';
  if (m.deleted) return <span className="italic">Mensagem apagada</span>;
  switch (m.type) {
    case 'image':
      return (
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" /> Imagem
        </span>
      );
    case 'document':
      return (
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" /> Documento
        </span>
      );
    case 'audio':
      return (
        <span className="flex items-center gap-1">
          <Mic className="h-3.5 w-3.5" /> Áudio
        </span>
      );
    default:
      return m.content;
  }
}

export default function ChatListItem({ chat, active, onClick, isTyping, currentUserId }: ChatListItemProps) {
  const { getEquipped } = useCatalog();
  const isGroup = chat.type === 'group';
  const displayName = isGroup ? chat.name || 'Grupo' : chat.otherUser?.name;
  const displayAvatar = isGroup ? chat.avatar : chat.otherUser?.avatar;
  const equipped = !isGroup && chat.otherUser ? getEquipped(chat.otherUser) : {};

  if (!isGroup && !chat.otherUser) return null;

  const lastMine = chat.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
        active ? 'bg-panelHeader' : 'hover:bg-panelHeader/60'
      }`}
    >
      {isGroup ? (
        displayAvatar ? (
          <Avatar src={displayAvatar} name={displayName || 'Grupo'} />
        ) : (
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-panelHeader">
            <Users className="h-5 w-5 text-textMuted" />
          </div>
        )
      ) : (
        <Avatar
          src={chat.otherUser!.avatar}
          name={chat.otherUser!.name}
          online={chat.otherUser!.isOnline}
          statusMode={chat.otherUser!.statusMode}
          frame={equipped.frame}
          aura={equipped.aura}
        />
      )}
      <div className="min-w-0 flex-1 border-b border-panelHeader/40 pb-3">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-textPrimary">{displayName}</p>
          {chat.lastMessage && (
            <span className="shrink-0 text-xs text-textMuted">{formatTime(chat.lastMessage.createdAt)}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          {isTyping ? (
            <span className="text-xs italic text-accent">a escrever...</span>
          ) : (
            <span className="flex items-center gap-1 truncate text-xs text-textMuted">
              {lastMine && chat.lastMessage && !chat.lastMessage.deleted && (
                chat.lastMessage.status === 'read' ? (
                  <CheckCheck className="h-3.5 w-3.5 text-accent" />
                ) : chat.lastMessage.status === 'delivered' ? (
                  <CheckCheck className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )
              )}
              {lastMessagePreview(chat)}
            </span>
          )}
          {chat.unreadCount > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-panel">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
