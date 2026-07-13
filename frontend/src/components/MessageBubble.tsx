import React, { useState } from 'react';
import { Check, CheckCheck, FileText, Download, SmilePlus, Reply, MoreVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatTime } from '../utils/format';
import QuickReactionBar from './QuickReactionBar';
import Avatar from './Avatar';
import { BadgeList } from './Badge';
import { useCatalog } from '../context/CatalogContext';
import type { Message, User } from '../types';

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  currentUserId: string;
  sender?: User | null;
  showHeader: boolean;
  quotedMessage?: Message | null;
  quotedSenderName?: string;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenViewOnce: () => void;
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-textMuted" />;
  return <Check className="h-3.5 w-3.5 text-textMuted" />;
}

// Estilo "Discord": lista plana de mensagens (sem balões), avatar + nome só na
// primeira mensagem de uma sequência do mesmo remetente, barra de acções
// flutuante ao passar o rato, sem separação esquerda/direita por "minha/dele".
export default function MessageBubble({
  message,
  mine,
  currentUserId,
  sender,
  showHeader,
  quotedMessage,
  quotedSenderName,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onOpenViewOnce,
}: MessageBubbleProps) {
  const { getEquipped } = useCatalog();
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [revealedLocally, setRevealedLocally] = useState(false);

  const reactionEntries = Object.entries(message.reactions || {}).filter(([, users]) => users.length > 0);
  const equipped = sender ? getEquipped(sender) : {};
  const isMentioned = message.mentions?.includes(currentUserId);

  if (message.deleted) {
    return (
      <div className="group flex gap-3 rounded px-2 py-0.5 hover:bg-[color:var(--color-message-hover)]">
        <div className="w-9 shrink-0" />
        <p className="text-sm italic text-textMuted">Mensagem apagada</p>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex gap-3 rounded px-2 py-0.5 transition hover:bg-[color:var(--color-message-hover)] ${
        isMentioned ? 'bg-[color:var(--color-mention-bg)]' : ''
      } ${showHeader ? 'mt-3' : ''}`}
    >
      <div className="w-9 shrink-0 pt-0.5">
        {showHeader && sender && (
          <Avatar src={sender.avatar} name={sender.name} size={36} frame={equipped.frame} aura={equipped.aura} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {showHeader && sender && (
          <p className="flex items-baseline gap-1.5">
            <span className="text-sm font-medium text-textPrimary">{sender.name}</span>
            <BadgeList badges={sender.badges} size={11} />
            <span className="text-[11px] text-textMuted">{formatTime(message.createdAt)}</span>
          </p>
        )}

        {quotedMessage && (
          <div className="mb-1 flex items-center gap-1.5 border-l-2 border-accent pl-2 text-xs text-textMuted">
            <span className="font-medium text-accent">{quotedSenderName || 'Mensagem'}</span>
            <span className="truncate">
              {quotedMessage.deleted ? 'Mensagem apagada' : quotedMessage.content || `[${quotedMessage.type}]`}
            </span>
          </div>
        )}

        {(() => {
          const isViewOnceMedia = message.viewOnce && (message.type === 'image' || message.type === 'audio');
          const alreadyOpened = (message.viewOnceOpenedBy || []).includes(currentUserId);
          const isRevealed = mine || alreadyOpened || revealedLocally;

          if (isViewOnceMedia && !isRevealed) {
            return (
              <button
                onClick={() => {
                  onOpenViewOnce();
                  setRevealedLocally(true);
                }}
                className="mb-1 flex w-48 flex-col items-center gap-1.5 rounded-md bg-panelHeader px-3 py-4 text-center"
              >
                <Eye className="h-6 w-6 text-accent" />
                <span className="text-xs font-medium text-textPrimary">Toca para ver</span>
                <span className="text-[10px] text-textMuted">Visualização única</span>
              </button>
            );
          }

          if (isViewOnceMedia && !mine && alreadyOpened && !revealedLocally) {
            return (
              <div className="mb-1 flex w-48 flex-col items-center gap-1.5 rounded-md bg-panelHeader/60 px-3 py-4 text-center opacity-60">
                <EyeOff className="h-6 w-6 text-textMuted" />
                <span className="text-xs text-textMuted">Já visualizada</span>
              </div>
            );
          }

          return (
            <>
              {message.type === 'image' && message.fileUrl && (
                <div className="relative mb-1 inline-block">
                  <img src={message.fileUrl} alt="imagem" className="max-h-72 rounded-md object-cover" />
                  {isViewOnceMedia && (
                    <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                      <Eye className="h-3 w-3" /> Única
                    </span>
                  )}
                </div>
              )}
              {message.type === 'audio' && message.fileUrl && (
                <audio controls src={message.fileUrl} className="mb-1 max-w-[240px]" />
              )}
            </>
          );
        })()}

        {message.type === 'document' && message.fileUrl && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            download={message.fileName || undefined}
            className="mb-1 flex max-w-xs items-center gap-2 rounded-md bg-panelHeader px-2.5 py-2"
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate text-sm">{message.fileName || 'Documento'}</span>
            <Download className="h-4 w-4 shrink-0 opacity-70" />
          </a>
        )}

        {(message.type === 'text' || message.type === 'emoji') && message.content && (
          <p className="whitespace-pre-wrap break-words text-sm text-textPrimary">
            {message.content}
            {!showHeader && (
              <span className="ml-1.5 align-baseline text-[10px] text-textMuted opacity-0 group-hover:opacity-100">
                {formatTime(message.createdAt)}
              </span>
            )}
          </p>
        )}

        <div className="mt-0.5 flex items-center gap-1.5">
          {message.edited && <span className="text-[10px] italic text-textMuted">(editada)</span>}
          {mine && <StatusIcon status={message.status} />}
        </div>

        {reactionEntries.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                  users.includes(currentUserId)
                    ? 'border-accent/50 bg-accent/20 text-accent'
                    : 'border-transparent bg-panelHeader text-textMuted'
                }`}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute -top-3 right-3 z-20 flex items-center gap-0.5 rounded-lg border border-panelHeader bg-panelLight opacity-0 shadow-lg transition group-hover:opacity-100">
        <button
          onClick={() => setShowReactions((v) => !v)}
          className="rounded-md p-1.5 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
          title="Reagir"
        >
          <SmilePlus className="h-4 w-4" />
        </button>
        <button
          onClick={onReply}
          className="rounded-md p-1.5 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
          title="Responder"
        >
          <Reply className="h-4 w-4" />
        </button>
        {mine && (message.type === 'text' || message.type === 'emoji') && (
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="rounded-md p-1.5 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
            title="Mais opções"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}

        {showReactions && (
          <div className="absolute right-0 top-9 z-20">
            <QuickReactionBar
              onSelect={(emoji) => {
                onReact(emoji);
                setShowReactions(false);
              }}
            />
          </div>
        )}

        {showMenu && (
          <div className="absolute right-0 top-9 z-20 w-32 overflow-hidden rounded-lg bg-panelLight shadow-xl">
            <button
              onClick={() => {
                onEdit();
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-textPrimary hover:bg-panelHeader"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-panelHeader"
            >
              <Trash2 className="h-3.5 w-3.5" /> Apagar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
