import React, { useEffect, useState } from 'react';
import { Search, MessageCirclePlus } from 'lucide-react';
import { client } from '../api/client';
import Avatar from './Avatar';
import ProfileViewModal from './ProfileViewModal';
import type { User } from '../types';

interface SearchBarProps {
  onStartChat: (user: User) => void;
}

export default function SearchBar({ onStartChat }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await client.get('/users/search', { params: { q: query.trim() } });
        setResults(res.data.users);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative border-b border-panelHeader/60 p-2">
      <div className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2">
        <Search className="h-4 w-4 text-textMuted" />
        <input
          className="w-full bg-transparent text-sm text-textPrimary outline-none placeholder:text-textMuted"
          placeholder="Pesquisar por username ou nome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-2 right-2 top-14 z-20 max-h-80 overflow-y-auto rounded-lg bg-panelLight shadow-xl animate-fade-in">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-textMuted">Nenhum utilizador encontrado.</p>
          ) : (
            results.map((u) => (
              <div key={u.id} className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-panelHeader">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setViewingUserId(u.id);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Avatar src={u.avatar} name={u.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-textPrimary">{u.name}</p>
                    <p className="truncate text-xs text-textMuted">@{u.username}</p>
                  </div>
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onStartChat(u);
                    setQuery('');
                    setResults([]);
                    setOpen(false);
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-accent/20 px-2 py-1 text-xs font-medium text-accent"
                >
                  <MessageCirclePlus className="h-3.5 w-3.5" />
                  Conversar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {viewingUserId && (
        <ProfileViewModal
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onMessage={() => {
            const found = results.find((u) => u.id === viewingUserId);
            if (found) {
              onStartChat(found);
              setQuery('');
              setResults([]);
              setOpen(false);
            }
            setViewingUserId(null);
          }}
        />
      )}
    </div>
  );
}
