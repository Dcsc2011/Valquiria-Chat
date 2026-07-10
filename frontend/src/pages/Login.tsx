import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User as UserIcon } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
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
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao iniciar sessão.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bgChat chat-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-panelLight p-8 shadow-2xl animate-fade-in">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panel">
            <Logo size={36} />
          </div>
          <h1 className="text-xl font-semibold text-textPrimary">Valquíria Chat</h1>
          <p className="text-sm text-textMuted">Entra na tua conta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2.5">
            <UserIcon className="h-4 w-4 text-textMuted" />
            <input
              className="w-full bg-transparent text-sm text-textPrimary outline-none placeholder:text-textMuted"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2.5">
            <Lock className="h-4 w-4 text-textMuted" />
            <input
              type="password"
              className="w-full bg-transparent text-sm text-textPrimary outline-none placeholder:text-textMuted"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-panel transition hover:bg-accentDark disabled:opacity-60"
          >
            {submitting ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-textMuted">
          Ainda não tens conta?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Cria uma agora
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-textMuted">
          <Link to="/admin/login" className="hover:underline">
            Acesso administrativo
          </Link>
        </p>
      </div>
    </div>
  );
}
