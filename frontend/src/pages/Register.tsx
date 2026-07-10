import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { client } from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    bio: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registrationClosed, setRegistrationClosed] = useState(false);

  useEffect(() => {
    client
      .get('/config/public')
      .then((res) => setRegistrationClosed(res.data.openRegistration === false))
      .catch(() => {});
  }, []);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bgChat chat-bg px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-panelLight p-8 shadow-2xl animate-fade-in">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panel">
            <Logo size={36} />
          </div>
          <h1 className="text-xl font-semibold text-textPrimary">Criar conta</h1>
          <p className="text-sm text-textMuted">Junta-te ao Valquíria Chat</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {registrationClosed && (
            <p className="rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
              O registo está temporariamente fechado pelo administrador. Podes tentar mais tarde.
            </p>
          )}
          <input
            className="rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Nome completo"
            value={form.name}
            onChange={update('name')}
            required
          />
          <input
            className="rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Username"
            value={form.username}
            onChange={update('username')}
            required
          />
          <input
            type="password"
            className="rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Senha (mín. 6 caracteres)"
            value={form.password}
            onChange={update('password')}
            required
          />
          <input
            type="password"
            className="rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Confirmar senha"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            required
          />
          <textarea
            className="resize-none rounded-lg bg-panel px-3 py-2.5 text-sm text-textPrimary outline-none placeholder:text-textMuted"
            placeholder="Bio (opcional)"
            rows={2}
            value={form.bio}
            onChange={update('bio')}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || registrationClosed}
            className="mt-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-panel transition hover:bg-accentDark disabled:opacity-60"
          >
            {submitting ? 'A criar conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-textMuted">
          Já tens conta?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
