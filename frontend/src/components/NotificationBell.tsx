import React, { useEffect, useState } from 'react';
import { Bell, Star, Heart, AtSign, Gift, Trophy, TrendingUp, Megaphone, Check } from 'lucide-react';
import { client } from '../api/client';
import { useSocket } from '../hooks/useSocket';
import type { AppNotification } from '../types';

const ICONS: Record<AppNotification['type'], React.ReactNode> = {
  reaction: <Heart className="h-4 w-4 text-pink-400" />,
  mention: <AtSign className="h-4 w-4 text-sky-400" />,
  group_invite: <Star className="h-4 w-4 text-accent" />,
  gift: <Gift className="h-4 w-4 text-purple-400" />,
  achievement: <Trophy className="h-4 w-4 text-yellow-400" />,
  level_up: <TrendingUp className="h-4 w-4 text-green-400" />,
  system: <Megaphone className="h-4 w-4 text-accent" />,
};

function timeAgo(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

export default function NotificationBell() {
  const socket = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const res = await client.get('/notifications');
    setNotifications(res.data.notifications);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('notification', refresh);
    socket.on('levelUp', refresh);
    socket.on('achievementUnlocked', refresh);
    return () => {
      socket.off('notification', refresh);
      socket.off('levelUp', refresh);
      socket.off('achievementUnlocked', refresh);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await client.post('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await client.post(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 hover:bg-panel/60"
        title="Notificações"
      >
        <Bell className="h-5 w-5 text-textMuted" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-lg bg-panelLight shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-panelHeader/60 px-3 py-2.5">
            <p className="text-sm font-medium text-textPrimary">Notificações</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-accent hover:underline">
                <Check className="h-3.5 w-3.5" /> Marcar tudo como lido
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-textMuted">Sem notificações por agora.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex w-full items-start gap-2 border-b border-panelHeader/30 px-3 py-2.5 text-left hover:bg-panelHeader/60 ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="mt-0.5">{ICONS[n.type] || <Bell className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-textPrimary">{n.title}</p>
                    <p className="truncate text-xs text-textMuted">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-textMuted">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
