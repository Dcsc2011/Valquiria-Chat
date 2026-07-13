import React, { useEffect, useState } from 'react';
import { X, Calendar, MessageCircle, Trophy } from 'lucide-react';
import { client } from '../api/client';
import { useCatalog } from '../context/CatalogContext';
import Avatar from './Avatar';
import { BadgeList } from './Badge';
import { formatLastSeen } from '../utils/format';
import type { User } from '../types';

interface ProfileViewModalProps {
  userId: string;
  onClose: () => void;
  onMessage?: () => void;
}

const PARTICLE_COUNT = 8;

export default function ProfileViewModal({ userId, onClose, onMessage }: ProfileViewModalProps) {
  const { getEquipped } = useCatalog();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get(`/users/${userId}`)
      .then((res) => setUser(res.data.user))
      .catch(() => setError('Não foi possível carregar este perfil.'));
  }, [userId]);

  const equipped = user ? getEquipped(user) : {};
  const profileEffect = equipped.profileEffect;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative max-h-[85vh] w-full max-w-sm overflow-hidden rounded-2xl bg-panelLight shadow-2xl vq-profile-enter">
        {error && (
          <div className="p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={onClose} className="mt-3 text-sm text-textMuted hover:underline">
              Fechar
            </button>
          </div>
        )}

        {!error && !user && <p className="p-6 text-sm text-textMuted">A carregar perfil...</p>}

        {!error && user && (
          <>
            {/* Efeito de perfil: partículas animadas a subir, se o utilizador tiver um equipado */}
            {profileEffect && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-40 overflow-hidden">
                {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                  <span
                    key={i}
                    className="vq-sparkle absolute text-lg"
                    style={{
                      left: `${(i * 97) % 100}%`,
                      bottom: `${(i * 37) % 60}px`,
                      color: profileEffect.preview.color,
                      animationDelay: `${(i % 5) * 0.25}s`,
                    }}
                  >
                    {profileEffect.preview.emoji}
                  </span>
                ))}
              </div>
            )}

            <div className={`relative h-28 w-full overflow-hidden bg-panelHeader ${equipped.banner?.preview.shimmer ? 'vq-banner-sweep' : ''}`}>
              {(user.banner || equipped.banner) && (
                <div
                  className="h-full w-full"
                  style={
                    user.banner
                      ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: equipped.banner?.preview.background }
                  }
                />
              )}
              <button onClick={onClose} className="absolute left-2 top-2 z-10 rounded-full bg-black/50 p-1.5">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="px-5 pb-5">
              <div className="-mt-11 mb-2 flex items-end justify-between">
                <Avatar
                  src={user.avatar}
                  name={user.name}
                  size={88}
                  online={user.isOnline}
                  statusMode={user.statusMode}
                  frame={equipped.frame}
                  aura={equipped.aura}
                />
                {onMessage && (
                  <button
                    onClick={onMessage}
                    className="mb-1 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-panel hover:bg-accentDark"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Mensagem
                  </button>
                )}
              </div>

              <div className="rounded-xl bg-panel p-3">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <h2 className="text-base font-semibold text-textPrimary">{user.name}</h2>
                  <BadgeList badges={user.badges} size={15} />
                </div>
                <p className="mb-2 text-xs text-textMuted">@{user.username}</p>

                {user.customStatus && (
                  <p className="mb-2 rounded-md bg-panelHeader px-2.5 py-1.5 text-xs italic text-textPrimary">
                    {user.customStatus}
                  </p>
                )}

                <div className="my-2 h-px bg-panelHeader" />

                {user.bio && (
                  <div className="mb-2">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-textMuted">Sobre mim</p>
                    <p className="text-xs text-textPrimary">{user.bio}</p>
                  </div>
                )}

                <p className="mb-1 flex items-center gap-1.5 text-xs text-textMuted">
                  <Calendar className="h-3.5 w-3.5" />
                  Membro desde {new Date(user.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>

                <p className="text-xs text-textMuted">
                  {user.isOnline ? <span className="text-accent">online agora</span> : `visto ${formatLastSeen(user.lastSeen)}`}
                </p>

                {user.level > 1 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-textMuted">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" /> Nível {user.level} · {user.xp} XP
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
