import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { adminClient } from '../api/client';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await adminClient.post('/login', { username, password });
      localStorage.setItem('vq_admin_token', res.data.token);
      navigate('/admin');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bgChat chat-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-panelLight p-8 shadow-2xl animate-fade-in">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <ShieldCheck className="h-7 w-7 text-panel" />
          </div>
          <h1 className="text-xl font-semibold text-textPrimary">Painel Admin</h1>
          <p className="text-sm text-textMuted">Valquíria Chat</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Utilizador admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Senha admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent py-2.5 text-sm font-medium text-panel hover:bg-accentDark disabled:opacity-60"
          >
            {submitting ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
