import React, { useEffect, useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { client } from '../api/client';
import { useCatalog } from '../context/CatalogContext';
import Avatar from './Avatar';
import { BadgeList } from './Badge';
import { formatLastSeen } from '../utils/format';
import type { User } from '../types';

interface ProfileViewModalProps {
  userId: string;
  onClose: () => void;
}

export default function ProfileViewModal({ userId, onClose }: ProfileViewModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-panelLight shadow-2xl animate-fade-in">
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
            <div className="relative h-28 w-full overflow-hidden rounded-t-2xl bg-panelHeader">
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
              <button onClick={onClose} className="absolute left-2 top-2 rounded-full bg-black/50 p-1.5">
                <X className="h-4 w-4 text-textPrimary" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="-mt-10 mb-3 flex items-end gap-3">
                <Avatar
                  src={user.avatar}
                  name={user.name}
                  size={84}
                  online={user.isOnline}
                  statusMode={user.statusMode}
                  frame={equipped.frame}
                  aura={equipped.aura}
                />
              </div>

              <div className="mb-1 flex items-center gap-1.5">
                <h2 className="text-lg font-semibold text-textPrimary">{user.name}</h2>
                <BadgeList badges={user.badges} size={16} />
              </div>
              <p className="mb-2 text-sm text-textMuted">@{user.username}</p>

              {user.customStatus && (
                <p className="mb-2 rounded-lg bg-panel px-3 py-2 text-sm italic text-textPrimary">
                  {user.customStatus}
                </p>
              )}

              {user.bio && <p className="mb-3 text-sm text-textPrimary">{user.bio}</p>}

              <p className="mb-1 text-xs text-textMuted">
                {user.isOnline ? (
                  <span className="text-accent">online agora</span>
                ) : (
                  `visto pela última vez ${formatLastSeen(user.lastSeen)}`
                )}
              </p>

              <p className="flex items-center gap-1.5 text-xs text-textMuted">
                <Calendar className="h-3.5 w-3.5" />
                Membro desde {new Date(user.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>

              {user.level > 1 && (
                <p className="mt-2 text-xs text-textMuted">Nível {user.level} · {user.xp} XP</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
