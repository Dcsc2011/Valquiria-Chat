import React, { useState } from 'react';
import { X, Users, Crown, UserMinus, LogOut, Pencil, Check } from 'lucide-react';
import { client } from '../api/client';
import Avatar from './Avatar';
import { BadgeList } from './Badge';
import ProfileViewModal from './ProfileViewModal';
import type { ChatSummary } from '../types';

interface GroupInfoModalProps {
  chat: ChatSummary;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (chat: ChatSummary) => void;
  onLeft: () => void;
}

export default function GroupInfoModal({ chat, currentUserId, onClose, onUpdated, onLeft }: GroupInfoModalProps) {
  const [name, setName] = useState(chat.name || '');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = (chat.admins || []).includes(currentUserId);

  const saveName = async () => {
    setError('');
    try {
      const res = await client.put(`/chats/${chat.id}/group`, { name });
      onUpdated(res.data.chat);
      setEditingName(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao renomear grupo.');
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm('Remover este membro do grupo?')) return;
    try {
      await client.delete(`/chats/${chat.id}/members/${userId}`);
      const updatedParticipants = (chat.participants || []).filter((p) => p.id !== userId);
      onUpdated({ ...chat, participants: updatedParticipants });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao remover membro.');
    }
  };

  const toggleAdmin = async (userId: string) => {
    try {
      const res = await client.post(`/chats/${chat.id}/admins/${userId}`);
      onUpdated({ ...chat, admins: res.data.admins });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao alterar administrador.');
    }
  };

  const leaveGroup = async () => {
    if (!confirm('Sair deste grupo?')) return;
    try {
      await client.delete(`/chats/${chat.id}/members/${currentUserId}`);
      onLeft();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao sair do grupo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-panelLight p-6 shadow-2xl animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-textPrimary">
            <Users className="h-5 w-5" /> Informações do grupo
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-panelHeader">
            <X className="h-5 w-5 text-textMuted" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Avatar src={chat.avatar} name={chat.name || 'Grupo'} size={56} />
          {editingName ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                className="flex-1 rounded-lg bg-panel px-3 py-2 text-sm text-textPrimary outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button onClick={saveName} className="rounded-full bg-accent p-2 text-panel">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-between">
              <p className="text-base font-medium text-textPrimary">{chat.name}</p>
              {isAdmin && (
                <button onClick={() => setEditingName(true)} className="rounded-full p-1.5 hover:bg-panelHeader">
                  <Pencil className="h-4 w-4 text-textMuted" />
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        <p className="mb-2 text-xs text-textMuted">{(chat.participants || []).length} membros</p>
        <div className="flex-1 overflow-y-auto">
          {(chat.participants || []).map((p) => {
            const memberIsAdmin = (chat.admins || []).includes(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-panelHeader/60">
                <button onClick={() => setViewingUserId(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Avatar src={p.avatar} name={p.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm text-textPrimary">
                      {p.name}
                      <BadgeList badges={p.badges} size={12} />
                      {memberIsAdmin && <Crown className="h-3.5 w-3.5 text-badgeAdmin" />}
                    </p>
                    <p className="truncate text-xs text-textMuted">@{p.username}</p>
                  </div>
                </button>
                {isAdmin && p.id !== currentUserId && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleAdmin(p.id)}
                      title="Alternar administrador"
                      className="rounded-full p-1.5 hover:bg-panelHeader"
                    >
                      <Crown className="h-4 w-4 text-textMuted" />
                    </button>
                    <button
                      onClick={() => removeMember(p.id)}
                      title="Remover"
                      className="rounded-full p-1.5 text-red-400 hover:bg-panelHeader"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={leaveGroup}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-500/20 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/30"
        >
          <LogOut className="h-4 w-4" /> Sair do grupo
        </button>
      </div>

      {viewingUserId && <ProfileViewModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}
    </div>
  );
}
