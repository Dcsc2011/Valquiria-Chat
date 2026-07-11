import React, { useState } from 'react';
import { Check, CheckCheck, FileText, Download, SmilePlus, Reply, MoreVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatTime } from '../utils/format';
import QuickReactionBar from './QuickReactionBar';
import { BadgeList } from './Badge';
import type { Message, User } from '../types';

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  currentUserId: string;
  sender?: User | null;
  showSenderName?: boolean;
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

export default function MessageBubble({
  message,
  mine,
  currentUserId,
  sender,
  showSenderName,
  quotedMessage,
  quotedSenderName,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onOpenViewOnce,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [revealedLocally, setRevealedLocally] = useState(false);

  const reactionEntries = Object.entries(message.reactions || {}).filter(([, users]) => users.length > 0);

  if (message.deleted) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
        <div className="max-w-[75%] rounded-lg bg-panelHeader/50 px-3 py-2 italic text-textMuted">
          <p className="text-sm">Mensagem apagada</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex max-w-[75%] items-start gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
        <div className="relative">
          <div className={`rounded-lg px-3 py-2 shadow-sm ${mine ? 'bg-bubbleOut' : 'bg-bubbleIn'} text-textPrimary`}>
            {showSenderName && sender && !mine && (
              <p className="mb-0.5 flex items-center gap-1 text-xs font-medium text-accent">
                {sender.name}
                <BadgeList badges={sender.badges} size={11} />
              </p>
            )}

            {quotedMessage && (
              <div className="mb-1.5 rounded-md border-l-2 border-accent bg-black/20 px-2 py-1">
                <p className="text-xs font-medium text-accent">{quotedSenderName || 'Mensagem'}</p>
                <p className="truncate text-xs text-textMuted">
                  {quotedMessage.deleted
                    ? 'Mensagem apagada'
                    : quotedMessage.content || `[${quotedMessage.type}]`}
                </p>
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
                    className="mb-1 flex w-48 flex-col items-center gap-1.5 rounded-md bg-black/25 px-3 py-4 text-center"
                  >
                    <Eye className="h-6 w-6 text-accent" />
                    <span className="text-xs font-medium text-textPrimary">Toca para ver</span>
                    <span className="text-[10px] text-textMuted">Visualização única</span>
                  </button>
                );
              }

              if (isViewOnceMedia && !mine && alreadyOpened && !revealedLocally) {
                return (
                  <div className="mb-1 flex w-48 flex-col items-center gap-1.5 rounded-md bg-black/10 px-3 py-4 text-center opacity-60">
                    <EyeOff className="h-6 w-6 text-textMuted" />
                    <span className="text-xs text-textMuted">Já visualizada</span>
                  </div>
                );
              }

              return (
                <>
                  {message.type === 'image' && message.fileUrl && (
                    <div className="relative mb-1">
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
                className="mb-1 flex items-center gap-2 rounded-md bg-black/20 px-2.5 py-2"
              >
                <FileText className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm">{message.fileName || 'Documento'}</span>
                <Download className="h-4 w-4 shrink-0 opacity-70" />
              </a>
            )}

            {(message.type === 'text' || message.type === 'emoji') && message.content && (
              <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
            )}

            <div className="mt-1 flex items-center justify-end gap-1">
              {message.edited && <span className="text-[10px] italic text-textMuted">editada</span>}
              <span className="text-[11px] text-textMuted">{formatTime(message.createdAt)}</span>
              {mine && <StatusIcon status={message.status} />}
            </div>
          </div>

          {reactionEntries.length > 0 && (
            <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
              {reactionEntries.map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs ${
                    users.includes(currentUserId) ? 'bg-accent/30 text-accent' : 'bg-panelHeader text-textMuted'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={() => setShowReactions((v) => !v)}
            className="rounded-full p-1 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
            title="Reagir"
          >
            <SmilePlus className="h-4 w-4" />
          </button>
          <button
            onClick={onReply}
            className="rounded-full p-1 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
            title="Responder"
          >
            <Reply className="h-4 w-4" />
          </button>
          {mine && (message.type === 'text' || message.type === 'emoji') && (
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="rounded-full p-1 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
              title="Mais opções"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          )}

          {showReactions && (
            <div className="absolute bottom-8 z-20">
              <QuickReactionBar
                onSelect={(emoji) => {
                  onReact(emoji);
                  setShowReactions(false);
                }}
              />
            </div>
          )}

          {showMenu && (
            <div className="absolute bottom-8 right-0 z-20 w-32 overflow-hidden rounded-lg bg-panelLight shadow-xl">
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
    </div>
  );
}
