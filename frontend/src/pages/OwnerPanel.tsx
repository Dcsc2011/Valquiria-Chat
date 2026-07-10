import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Users, MessageSquare, ArrowLeft } from 'lucide-react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { BadgeList, ALL_BADGES, BADGE_LABELS } from '../components/Badge';
import type { User, Badge as BadgeType } from '../types';

interface Summary {
  totalUsers: number;
  onlineUsers: number;
  totalChats: number;
  totalGroups: number;
  totalMessages: number;
  admins: User[];
}

export default function OwnerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [badgeEditorId, setBadgeEditorId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.isOwner) {
      navigate('/');
      return;
    }
    client.get('/owner/summary').then((res) => setSummary(res.data));
    client.get('/owner/users').then((res) => setUsers(res.data.users));
  }, [user, navigate]);

  if (!user || !user.isOwner) return null;

  const toggleBadge = async (target: User, badge: BadgeType) => {
    const newBadges = target.badges.includes(badge)
      ? target.badges.filter((b) => b !== badge)
      : [...target.badges, badge];
    const res = await client.put(`/owner/users/${target.id}/badges`, { badges: newBadges });
    setUsers((prev) => prev.map((u) => (u.id === target.id ? res.data.user : u)));
  };

  return (
    <div className="min-h-screen bg-bgChat chat-bg px-4 py-8 text-textPrimary">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-1.5 text-sm text-textMuted hover:text-textPrimary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao chat
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
            <Crown className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Painel do Dono</h1>
            <p className="text-sm text-textMuted">Visível apenas para {user.name} — estatuto de Fundador Supremo</p>
          </div>
        </div>

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-panelLight p-4">
              <p className="flex items-center gap-1 text-xs text-textMuted"><Users className="h-3.5 w-3.5" /> Utilizadores</p>
              <p className="mt-1 text-2xl font-semibold">{summary.totalUsers}</p>
            </div>
            <div className="rounded-lg bg-panelLight p-4">
              <p className="text-xs text-textMuted">Online agora</p>
              <p className="mt-1 text-2xl font-semibold text-accent">{summary.onlineUsers}</p>
            </div>
            <div className="rounded-lg bg-panelLight p-4">
              <p className="flex items-center gap-1 text-xs text-textMuted"><MessageSquare className="h-3.5 w-3.5" /> Conversas</p>
              <p className="mt-1 text-2xl font-semibold">{summary.totalChats}</p>
            </div>
            <div className="rounded-lg bg-panelLight p-4">
              <p className="text-xs text-textMuted">Mensagens</p>
              <p className="mt-1 text-2xl font-semibold">{summary.totalMessages}</p>
            </div>
          </div>
        )}

        <h2 className="mb-2 text-sm font-medium text-textMuted">Atribuir insígnias de prestígio</h2>
        <p className="mb-3 text-xs text-textMuted">
          Isto concede insígnias directamente, sem precisar de iniciar sessão no painel de administração separado.
        </p>
        <div className="overflow-hidden rounded-lg bg-panelLight">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-b border-panelHeader/40 px-4 py-2.5 last:border-0">
              <Avatar src={u.avatar} name={u.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-textMuted">@{u.username}</p>
              </div>
              <BadgeList badges={u.badges} />
              <div className="relative">
                <button
                  onClick={() => setBadgeEditorId(badgeEditorId === u.id ? null : u.id)}
                  className="rounded-md bg-panel px-2.5 py-1 text-xs hover:bg-panelHeader"
                >
                  Editar insígnias
                </button>
                {badgeEditorId === u.id && (
                  <div className="absolute right-0 top-9 z-20 w-52 rounded-lg bg-panel p-2 shadow-xl">
                    {ALL_BADGES.map((b) => (
                      <label key={b} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-panelHeader">
                        <input type="checkbox" checked={u.badges.includes(b)} onChange={() => toggleBadge(u, b)} />
                        {BADGE_LABELS[b]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
