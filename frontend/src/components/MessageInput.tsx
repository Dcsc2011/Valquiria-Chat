import React, { useEffect, useRef, useState } from 'react';
import { Smile, Paperclip, Send, Mic, X, Pencil, Eye, EyeOff } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import { client } from '../api/client';
import type { Message } from '../types';

interface MessageInputProps {
  onSendText: (content: string) => void;
  onSendFile: (payload: { type: 'image' | 'document' | 'audio'; fileUrl: string; fileName: string; viewOnce?: boolean }) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  replyingTo?: Message | null;
  replyingToSenderName?: string;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onSaveEdit?: (content: string) => void;
  onCancelEdit?: () => void;
}

export default function MessageInput({
  onSendText,
  onSendFile,
  onTyping,
  onStopTyping,
  replyingTo,
  replyingToSenderName,
  onCancelReply,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editingMessage) setText(editingMessage.content);
  }, [editingMessage]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(onStopTyping, 1500);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editingMessage && onSaveEdit) {
      onSaveEdit(trimmed);
    } else {
      onSendText(trimmed);
    }
    setText('');
    onStopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && editingMessage && onCancelEdit) {
      onCancelEdit();
      setText('');
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((t) => t + emojiData.emoji);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      onSendFile({
        type: isImage ? 'image' : isAudio ? 'audio' : 'document',
        fileUrl: res.data.url,
        fileName: res.data.fileName,
        viewOnce: viewOnceMode && (isImage || isAudio),
      });
      setViewOnceMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative border-t border-panelHeader/60 bg-panelLight px-3 py-2.5">
      {(replyingTo || editingMessage) && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-panel px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
            <p className="flex items-center gap-1 text-xs font-medium text-accent">
              {editingMessage ? (
                <>
                  <Pencil className="h-3 w-3" /> A editar mensagem
                </>
              ) : (
                `A responder a ${replyingToSenderName || 'mensagem'}`
              )}
            </p>
            <p className="truncate text-xs text-textMuted">
              {(editingMessage || replyingTo)?.content || `[${(editingMessage || replyingTo)?.type}]`}
            </p>
          </div>
          <button
            onClick={() => {
              if (editingMessage && onCancelEdit) {
                onCancelEdit();
                setText('');
              }
              if (replyingTo && onCancelReply) onCancelReply();
            }}
            className="rounded-full p-1 text-textMuted hover:bg-panelHeader"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {viewOnceMode && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-accent/15 px-3 py-2 text-xs text-accent">
          <Eye className="h-3.5 w-3.5" />
          Modo visualização única activo — a próxima imagem ou áudio só poderá ser visto uma vez.
          <button onClick={() => setViewOnceMode(false)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="absolute bottom-16 left-2 z-30">
          <div className="mb-1 flex justify-end">
            <button
              onClick={() => setShowEmoji(false)}
              className="rounded-full bg-panelHeader p-1 text-textMuted hover:text-textPrimary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.NATIVE}
            width={320}
            height={380}
            searchPlaceholder="Pesquisar emoji"
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="rounded-full p-2 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        {!editingMessage && (
          <>
            <button
              onClick={() => setViewOnceMode((v) => !v)}
              title="Enviar próxima imagem/áudio como visualização única"
              className={`rounded-full p-2 hover:bg-panelHeader ${viewOnceMode ? 'text-accent' : 'text-textMuted hover:text-textPrimary'}`}
            >
              {viewOnceMode ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
            <label
              className="cursor-pointer rounded-full p-2 text-textMuted hover:bg-panelHeader hover:text-textPrimary"
              title="Anexar"
            >
              <Paperclip className="h-5 w-5" />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              />
            </label>
          </>
        )}

        <textarea
          className="max-h-32 flex-1 resize-none rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
          placeholder={uploading ? 'A enviar ficheiro...' : 'Escreve uma mensagem'}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={uploading}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-full bg-accent p-2.5 text-panel transition hover:bg-accentDark disabled:opacity-40"
          title="Enviar"
        >
          {text.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
