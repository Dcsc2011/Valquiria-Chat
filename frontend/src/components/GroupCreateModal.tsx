import React, { useEffect, useState } from 'react';
import { X, Search, Users, Check } from 'lucide-react';
import { client } from '../api/client';
import Avatar from './Avatar';
import type { ChatSummary, User } from '../types';

interface GroupCreateModalProps {
  onClose: () => void;
  onCreated: (chat: ChatSummary) => void;
}

export default function GroupCreateModal({ onClose, onCreated }: GroupCreateModalProps) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const toggleSelect = (user: User) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
  };

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) {
      setError('Dá um nome ao grupo.');
      return;
    }
    if (selected.length < 1) {
      setError('Selecciona pelo menos mais um membro.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await client.post('/chats/group/create', {
        name: name.trim(),
        memberIds: selected.map((u) => u.id),
      });
      onCreated(res.data.chat);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar grupo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-panelLight p-6 shadow-2xl animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-textPrimary">
            <Users className="h-5 w-5" /> Novo grupo
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-panelHeader">
            <X className="h-5 w-5 text-textMuted" />
          </button>
        </div>

        <input
          className="mb-3 rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
          placeholder="Nome do grupo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selected.map((u) => (
              <span
                key={u.id}
                className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-xs text-accent"
              >
                {u.name}
                <button onClick={() => toggleSelect(u)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mb-2 flex items-center gap-2 rounded-lg bg-panel px-3 py-2">
          <Search className="h-4 w-4 text-textMuted" />
          <input
            className="w-full bg-transparent text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Pesquisar membros"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.map((u) => {
            const isSelected = selected.some((s) => s.id === u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleSelect(u)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-panelHeader"
              >
                <Avatar src={u.avatar} name={u.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-textPrimary">{u.name}</p>
                  <p className="truncate text-xs text-textMuted">@{u.username}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-accent" />}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={submitting}
          className="mt-4 rounded-lg bg-accent py-2.5 text-sm font-medium text-panel hover:bg-accentDark disabled:opacity-60"
        >
          {submitting ? 'A criar...' : 'Criar grupo'}
        </button>
      </div>
    </div>
  );
}
