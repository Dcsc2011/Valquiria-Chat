import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, MessageSquare, BarChart3, Settings, Database, LogOut, Trash2, KeyRound,
  ShieldCheck, ShieldOff, Plus, Download, Upload, Save, RotateCcw, Eraser,
  Ban, CheckCircle, Award, Megaphone, Store, Ticket, ScrollText, Crown, Coins,
} from 'lucide-react';
import { adminClient } from '../api/client';
import type { User, AdminChat, Stats, AppConfig, Badge as BadgeType, CosmeticItem, GiftCode } from '../types';
import Avatar from '../components/Avatar';
import { BadgeList, ALL_BADGES, BADGE_LABELS } from '../components/Badge';
import { CosmeticSwatch, RarityTag } from '../components/CosmeticPreview';

type Tab = 'users' | 'chats' | 'stats' | 'config' | 'backups' | 'shop' | 'codes' | 'audit';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('users');
  const [authed, setAuthed] = useState(!!localStorage.getItem('vq_admin_token'));

  useEffect(() => {
    if (!authed) navigate('/admin/login');
  }, [authed, navigate]);

  const logout = () => {
    localStorage.removeItem('vq_admin_token');
    setAuthed(false);
    navigate('/admin/login');
  };

  if (!authed) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Utilizadores', icon: <Users className="h-4 w-4" /> },
    { id: 'chats', label: 'Conversas', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'stats', label: 'Estatísticas', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'config', label: 'Configuração', icon: <Settings className="h-4 w-4" /> },
    { id: 'backups', label: 'Backups', icon: <Database className="h-4 w-4" /> },
    { id: 'shop', label: 'Loja', icon: <Store className="h-4 w-4" /> },
    { id: 'codes', label: 'Códigos', icon: <Ticket className="h-4 w-4" /> },
    { id: 'audit', label: 'Auditoria', icon: <ScrollText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-screen w-full bg-bgChat text-textPrimary">
      <div className="flex w-60 shrink-0 flex-col border-r border-panelHeader/60 bg-panelLight">
        <div className="flex items-center gap-2 px-4 py-4">
          <ShieldCheck className="h-6 w-6 text-accent" />
          <span className="font-semibold">Admin</span>
        </div>
        <nav className="flex-1 px-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                tab === t.id ? 'bg-accent text-panel font-medium' : 'text-textMuted hover:bg-panelHeader'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <button
          onClick={logout}
          className="m-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-panelHeader"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'users' && <UsersTab />}
        {tab === 'chats' && <ChatsTab />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'config' && <ConfigTab />}
        {tab === 'backups' && <BackupsTab />}
        {tab === 'shop' && <ShopTab />}
        {tab === 'codes' && <CodesTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

// ---------------- Users Tab ----------------
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', bio: '', isAdmin: false });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await adminClient.get('/users');
    setUsers(res.data.users);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createUser = async () => {
    setError('');
    try {
      await adminClient.post('/users', newUser);
      setShowCreate(false);
      setNewUser({ name: '', username: '', password: '', bio: '', isAdmin: false });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar utilizador.');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Eliminar este utilizador e todas as suas conversas?')) return;
    await adminClient.delete(`/users/${id}`);
    load();
  };

  const toggleAdmin = async (id: string) => {
    await adminClient.post(`/users/${id}/toggle-admin`);
    load();
  };

  const toggleBan = async (u: User) => {
    if (u.isBanned) {
      await adminClient.post(`/users/${u.id}/unban`);
    } else {
      if (!confirm(`Suspender a conta de ${u.name}? A pessoa deixa de conseguir iniciar sessão.`)) return;
      await adminClient.post(`/users/${u.id}/ban`);
    }
    load();
  };

  const toggleOwner = async (id: string) => {
    await adminClient.post(`/users/${id}/owner`);
    load();
  };

  const grantCurrency = async (id: string) => {
    const amount = prompt('Quantas Runas queres conceder (ou negativo para remover)?', '500');
    if (!amount) return;
    await adminClient.post(`/users/${id}/currency`, { amount: Number(amount) });
    load();
  };

  const [badgeEditorId, setBadgeEditorId] = useState<string | null>(null);

  const toggleBadge = async (u: User, badge: BadgeType) => {
    const newBadges = u.badges.includes(badge) ? u.badges.filter((b) => b !== badge) : [...u.badges, badge];
    await adminClient.put(`/users/${u.id}/badges`, { badges: newBadges });
    load();
  };

  const resetPassword = async (id: string) => {
    const newPassword = prompt('Nova senha para este utilizador (mín. 6 caracteres):');
    if (!newPassword) return;
    try {
      await adminClient.post(`/users/${id}/reset-password`, { newPassword });
      alert('Senha redefinida com sucesso.');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao redefinir senha.');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilizadores ({users.length})</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-panel hover:bg-accentDark"
        >
          <Plus className="h-4 w-4" /> Novo utilizador
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg bg-panelLight p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nome"
              className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newUser.name}
              onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              placeholder="Username"
              className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newUser.username}
              onChange={(e) => setNewUser((s) => ({ ...s, username: e.target.value }))}
            />
            <input
              placeholder="Senha"
              type="password"
              className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newUser.password}
              onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
            />
            <input
              placeholder="Bio (opcional)"
              className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newUser.bio}
              onChange={(e) => setNewUser((s) => ({ ...s, bio: e.target.value }))}
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newUser.isAdmin}
              onChange={(e) => setNewUser((s) => ({ ...s, isAdmin: e.target.checked }))}
            />
            Administrador
          </label>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button
            onClick={createUser}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-panel hover:bg-accentDark"
          >
            Criar
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-panelLight">
        <table className="w-full text-sm">
          <thead className="bg-panelHeader text-left text-textMuted">
            <tr>
              <th className="px-4 py-2.5">Utilizador</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Insígnias</th>
              <th className="px-4 py-2.5">Admin</th>
              <th className="px-4 py-2.5">Criado em</th>
              <th className="px-4 py-2.5 text-right">Acções</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="relative border-t border-panelHeader/40">
                <td className="flex items-center gap-2 px-4 py-2.5">
                  <Avatar src={u.avatar} name={u.name} size={30} />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-textMuted">@{u.username}</p>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {u.isBanned ? (
                    <span className="text-red-400">suspenso</span>
                  ) : (
                    <span className={u.isOnline ? 'text-accent' : 'text-textMuted'}>
                      {u.isOnline ? 'online' : 'offline'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="relative">
                    <button
                      onClick={() => setBadgeEditorId(badgeEditorId === u.id ? null : u.id)}
                      className="flex items-center gap-1 rounded-md bg-panel px-2 py-1 hover:bg-panelHeader"
                    >
                      <BadgeList badges={u.badges} size={14} />
                      <Award className="h-3.5 w-3.5 text-textMuted" />
                    </button>
                    {badgeEditorId === u.id && (
                      <div className="absolute left-0 top-9 z-20 w-48 rounded-lg bg-panel p-2 shadow-xl">
                        {ALL_BADGES.map((b) => (
                          <label key={b} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-panelHeader">
                            <input
                              type="checkbox"
                              checked={u.badges.includes(b)}
                              onChange={() => toggleBadge(u, b)}
                            />
                            {BADGE_LABELS[b]}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">{u.isAdmin ? 'Sim' : 'Não'}</td>
                <td className="px-4 py-2.5 text-textMuted">{new Date(u.createdAt).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button title="Redefinir senha" onClick={() => resetPassword(u.id)} className="rounded p-1.5 hover:bg-panelHeader">
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button title="Alternar admin" onClick={() => toggleAdmin(u.id)} className="rounded p-1.5 hover:bg-panelHeader">
                      {u.isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button
                      title={u.isBanned ? 'Reactivar conta' : 'Suspender conta'}
                      onClick={() => toggleBan(u)}
                      className={`rounded p-1.5 hover:bg-panelHeader ${u.isBanned ? 'text-accent' : 'text-yellow-400'}`}
                    >
                      {u.isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </button>
                    <button
                      title={u.isOwner ? 'Remover estatuto de Dono' : 'Tornar Dono (cosméticos exclusivos)'}
                      onClick={() => toggleOwner(u.id)}
                      className={`rounded p-1.5 hover:bg-panelHeader ${u.isOwner ? 'text-yellow-400' : 'text-textMuted'}`}
                    >
                      <Crown className="h-4 w-4" />
                    </button>
                    <button
                      title="Conceder Runas"
                      onClick={() => grantCurrency(u.id)}
                      className="rounded p-1.5 text-textMuted hover:bg-panelHeader"
                    >
                      <Coins className="h-4 w-4" />
                    </button>
                    <button title="Eliminar" onClick={() => deleteUser(u.id)} className="rounded p-1.5 text-red-400 hover:bg-panelHeader">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Chats Tab ----------------
function ChatsTab() {
  const [chats, setChats] = useState<AdminChat[]>([]);

  const load = useCallback(async () => {
    const res = await adminClient.get('/chats');
    setChats(res.data.chats);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteChat = async (id: string) => {
    if (!confirm('Eliminar esta conversa e todas as mensagens?')) return;
    await adminClient.delete(`/chats/${id}`);
    load();
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Conversas ({chats.length})</h1>
      <div className="overflow-hidden rounded-lg bg-panelLight">
        <table className="w-full text-sm">
          <thead className="bg-panelHeader text-left text-textMuted">
            <tr>
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">Participantes</th>
              <th className="px-4 py-2.5">Mensagens</th>
              <th className="px-4 py-2.5">Actualizada em</th>
              <th className="px-4 py-2.5 text-right">Acções</th>
            </tr>
          </thead>
          <tbody>
            {chats.map((c) => (
              <tr key={c.id} className="border-t border-panelHeader/40">
                <td className="px-4 py-2.5">
                  {c.type === 'group' ? (
                    <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs text-accent">Grupo</span>
                  ) : (
                    <span className="rounded-md bg-panelHeader px-2 py-0.5 text-xs text-textMuted">Directa</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {c.type === 'group' && c.name ? (
                    <span className="font-medium">{c.name}</span>
                  ) : (
                    c.participants.filter(Boolean).map((p) => p?.name).join(' ↔ ') || 'Utilizadores removidos'
                  )}
                </td>
                <td className="px-4 py-2.5">{c.messageCount}</td>
                <td className="px-4 py-2.5 text-textMuted">{new Date(c.updatedAt).toLocaleString('pt-PT')}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => deleteChat(c.id)} className="rounded p-1.5 text-red-400 hover:bg-panelHeader">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Stats Tab ----------------
function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminClient.get('/stats').then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p className="text-textMuted">A carregar estatísticas...</p>;

  const cards = [
    { label: 'Utilizadores totais', value: stats.totalUsers },
    { label: 'Utilizadores online', value: stats.onlineUsers },
    { label: 'Conversas', value: stats.totalChats },
    { label: 'Mensagens', value: stats.totalMessages },
    { label: 'Ficheiros enviados', value: stats.uploads.count },
    { label: 'Espaço usado', value: `${(stats.uploads.sizeBytes / (1024 * 1024)).toFixed(2)} MB` },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Estatísticas</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-panelLight p-4">
            <p className="text-xs text-textMuted">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-medium text-textMuted">Mensagens por tipo</h2>
      <div className="rounded-lg bg-panelLight p-4">
        {Object.entries(stats.messagesByType).length === 0 ? (
          <p className="text-sm text-textMuted">Sem mensagens ainda.</p>
        ) : (
          Object.entries(stats.messagesByType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between border-b border-panelHeader/40 py-2 text-sm last:border-0">
              <span className="capitalize">{type}</span>
              <span>{count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------- Config Tab ----------------
function ConfigTab() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminClient.get('/config').then((res) => setConfig(res.data.config));
  }, []);

  if (!config) return <p className="text-textMuted">A carregar configuração...</p>;

  const save = async () => {
    const res = await adminClient.put('/config', config);
    setConfig(res.data.config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-semibold">Configuração</h1>
      <div className="flex flex-col gap-4 rounded-lg bg-panelLight p-4">
        <div>
          <label className="mb-1 block text-xs text-textMuted">Nome da aplicação</label>
          <input
            className="w-full rounded-lg bg-panel px-3 py-2 text-sm outline-none"
            value={config.appName}
            onChange={(e) => setConfig({ ...config, appName: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-textMuted">Limite de upload (MB)</label>
          <input
            type="number"
            className="w-full rounded-lg bg-panel px-3 py-2 text-sm outline-none"
            value={config.maxUploadSizeMb}
            onChange={(e) => setConfig({ ...config, maxUploadSizeMb: Number(e.target.value) })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.openRegistration}
            onChange={(e) => setConfig({ ...config, openRegistration: e.target.checked })}
          />
          Permitir registo aberto de novos utilizadores
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.allowUploads}
            onChange={(e) => setConfig({ ...config, allowUploads: e.target.checked })}
          />
          Permitir envio de ficheiros
        </label>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs text-textMuted">
            <Megaphone className="h-3.5 w-3.5" /> Anúncio (banner visível para todos os utilizadores)
          </label>
          <textarea
            className="w-full resize-none rounded-lg bg-panel px-3 py-2 text-sm outline-none"
            rows={2}
            placeholder="Ex: Manutenção agendada para sábado às 22h."
            value={config.announcement || ''}
            onChange={(e) => setConfig({ ...config, announcement: e.target.value || null })}
          />
        </div>

        <button
          onClick={save}
          className="flex w-fit items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-panel hover:bg-accentDark"
        >
          <Save className="h-4 w-4" /> {saved ? 'Guardado!' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

// ---------------- Backups Tab ----------------
function BackupsTab() {
  const [backups, setBackups] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await adminClient.get('/backups');
    setBackups(res.data.backups);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createBackup = async () => {
    setBusy(true);
    try {
      await adminClient.post('/backup');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async (file: string) => {
    if (!confirm(`Restaurar o backup "${file}"? Isto substitui os dados actuais.`)) return;
    await adminClient.post(`/restore/${file}`);
    alert('Backup restaurado com sucesso.');
  };

  const exportData = async () => {
    const res = await adminClient.get('/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'valquiria-database-export.zip');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('backup', file);
    await adminClient.post('/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    alert('Backup importado com sucesso.');
  };

  const clearUploads = async () => {
    if (!confirm('Isto elimina todos os ficheiros enviados (imagens, documentos, áudios, avatares). Continuar?')) return;
    const res = await adminClient.post('/clear-uploads');
    alert(`${res.data.removed} ficheiro(s) removido(s).`);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Backups &amp; Manutenção</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={createBackup}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-panel hover:bg-accentDark disabled:opacity-60"
        >
          <Database className="h-4 w-4" /> Criar backup
        </button>
        <button
          onClick={exportData}
          className="flex items-center gap-1.5 rounded-lg bg-panelHeader px-4 py-2 text-sm font-medium text-textPrimary hover:bg-panel"
        >
          <Download className="h-4 w-4" /> Exportar JSON (.zip)
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-panelHeader px-4 py-2 text-sm font-medium text-textPrimary hover:bg-panel">
          <Upload className="h-4 w-4" /> Importar backup
          <input type="file" accept=".zip" className="hidden" onChange={importFile} />
        </label>
        <button
          onClick={clearUploads}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
        >
          <Eraser className="h-4 w-4" /> Limpar uploads
        </button>
      </div>

      <h2 className="mb-2 text-sm font-medium text-textMuted">Backups guardados no servidor</h2>
      <div className="rounded-lg bg-panelLight">
        {backups.length === 0 ? (
          <p className="p-4 text-sm text-textMuted">Nenhum backup criado ainda.</p>
        ) : (
          backups.map((b) => (
            <div key={b} className="flex items-center justify-between border-b border-panelHeader/40 px-4 py-2.5 text-sm last:border-0">
              <span>{b}</span>
              <button
                onClick={() => restoreBackup(b)}
                className="flex items-center gap-1 rounded-md bg-panelHeader px-2.5 py-1 text-xs hover:bg-panel"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------- Shop Tab ----------------
function ShopTab() {
  const [catalog, setCatalog] = useState<{ items: CosmeticItem[]; bundles: { id: string; name: string; theme: string; itemIds: string[] }[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [newItem, setNewItem] = useState({
    id: '', type: 'banner', name: '', rarity: 'common', price: '100', bundleId: '', previewJson: '{"background":"linear-gradient(135deg,#1a0b2e,#7C3AED)"}',
  });

  const load = useCallback(async () => {
    const res = await adminClient.get('/shop/catalog');
    setCatalog(res.data.catalog);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!catalog) return <p className="text-textMuted">A carregar loja...</p>;

  const createItem = async () => {
    setError('');
    let preview;
    try {
      preview = JSON.parse(newItem.previewJson);
    } catch {
      setError('Preview inválido (deve ser JSON válido).');
      return;
    }
    try {
      await adminClient.post('/shop/items', {
        id: newItem.id,
        type: newItem.type,
        name: newItem.name,
        rarity: newItem.rarity,
        price: newItem.price ? Number(newItem.price) : null,
        bundleId: newItem.bundleId || null,
        preview,
      });
      setShowCreate(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar item.');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Eliminar este cosmético da loja?')) return;
    await adminClient.delete(`/shop/items/${id}`);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Loja — {catalog.items.length} itens, {catalog.bundles.length} bundles</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-panel hover:bg-accentDark"
        >
          <Plus className="h-4 w-4" /> Novo cosmético
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg bg-panelLight p-4">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="id único (ex: frame_teste)" className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newItem.id} onChange={(e) => setNewItem((s) => ({ ...s, id: e.target.value }))} />
            <select className="rounded-lg bg-panel px-3 py-2 text-sm outline-none" value={newItem.type}
              onChange={(e) => setNewItem((s) => ({ ...s, type: e.target.value }))}>
              {['banner', 'frame', 'aura', 'badge', 'background', 'emoji', 'cursor'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input placeholder="Nome" className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} />
            <select className="rounded-lg bg-panel px-3 py-2 text-sm outline-none" value={newItem.rarity}
              onChange={(e) => setNewItem((s) => ({ ...s, rarity: e.target.value }))}>
              {['common', 'rare', 'epic', 'legendary', 'mythic'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input placeholder="Preço em Runas (vazio = não vendável)" className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newItem.price} onChange={(e) => setNewItem((s) => ({ ...s, price: e.target.value }))} />
            <select className="rounded-lg bg-panel px-3 py-2 text-sm outline-none" value={newItem.bundleId}
              onChange={(e) => setNewItem((s) => ({ ...s, bundleId: e.target.value }))}>
              <option value="">Sem bundle</option>
              {catalog.bundles.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <textarea
            className="mt-3 w-full resize-none rounded-lg bg-panel px-3 py-2 font-mono text-xs outline-none"
            rows={2}
            placeholder='Preview JSON, ex: {"border":"3px solid #fff","boxShadow":"0 0 10px #fff"}'
            value={newItem.previewJson}
            onChange={(e) => setNewItem((s) => ({ ...s, previewJson: e.target.value }))}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button onClick={createItem} className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-panel hover:bg-accentDark">
            Criar
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {catalog.items.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-2 rounded-lg bg-panelLight p-3">
            <RarityTag rarity={item.rarity} />
            <CosmeticSwatch item={item} size={56} />
            <p className="truncate text-center text-xs font-medium">{item.name}</p>
            <p className="text-xs text-textMuted">{item.price !== null ? `${item.price} 🪙` : item.ownerOnly ? 'Dono' : 'Código'}</p>
            <button onClick={() => deleteItem(item.id)} className="text-xs text-red-400 hover:underline">
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Codes Tab ----------------
function CodesTab() {
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [catalog, setCatalog] = useState<{ bundles: { id: string; name: string }[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [newCode, setNewCode] = useState({ code: '', bundleId: '', currency: '0', maxUses: '', expiresAt: '' });

  const load = useCallback(async () => {
    const res = await adminClient.get('/codes');
    setCodes(res.data.codes);
    const catRes = await adminClient.get('/shop/catalog');
    setCatalog(catRes.data.catalog);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createCode = async () => {
    setError('');
    try {
      await adminClient.post('/codes', {
        code: newCode.code,
        bundleId: newCode.bundleId || null,
        currency: newCode.currency ? Number(newCode.currency) : 0,
        maxUses: newCode.maxUses ? Number(newCode.maxUses) : null,
        expiresAt: newCode.expiresAt || null,
      });
      setShowCreate(false);
      setNewCode({ code: '', bundleId: '', currency: '0', maxUses: '', expiresAt: '' });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar código.');
    }
  };

  const revokeCode = async (code: string) => {
    await adminClient.post(`/codes/${code}/revoke`);
    load();
  };

  const deleteCode = async (code: string) => {
    if (!confirm('Eliminar este código definitivamente?')) return;
    await adminClient.delete(`/codes/${code}`);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Códigos de oferta ({codes.length})</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-panel hover:bg-accentDark"
        >
          <Plus className="h-4 w-4" /> Novo código
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg bg-panelLight p-4">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Código (ex: NATAL2026)" className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newCode.code} onChange={(e) => setNewCode((s) => ({ ...s, code: e.target.value }))} />
            <select className="rounded-lg bg-panel px-3 py-2 text-sm outline-none" value={newCode.bundleId}
              onChange={(e) => setNewCode((s) => ({ ...s, bundleId: e.target.value }))}>
              <option value="">Sem bundle</option>
              {catalog?.bundles.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input placeholder="Runas de bónus" className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newCode.currency} onChange={(e) => setNewCode((s) => ({ ...s, currency: e.target.value }))} />
            <input placeholder="Limite de utilizações (vazio = ilimitado)" className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newCode.maxUses} onChange={(e) => setNewCode((s) => ({ ...s, maxUses: e.target.value }))} />
            <input type="date" className="rounded-lg bg-panel px-3 py-2 text-sm outline-none"
              value={newCode.expiresAt} onChange={(e) => setNewCode((s) => ({ ...s, expiresAt: e.target.value }))} />
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button onClick={createCode} className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-panel hover:bg-accentDark">
            Criar código
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-panelLight">
        <table className="w-full text-sm">
          <thead className="bg-panelHeader text-left text-textMuted">
            <tr>
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">Bundle</th>
              <th className="px-4 py-2.5">Usos</th>
              <th className="px-4 py-2.5">Expira</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5 text-right">Acções</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className="border-t border-panelHeader/40">
                <td className="px-4 py-2.5 font-mono">{c.code}</td>
                <td className="px-4 py-2.5">{c.bundleId || '—'}</td>
                <td className="px-4 py-2.5">{c.usedBy.length}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td className="px-4 py-2.5 text-textMuted">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-PT') : 'Nunca'}</td>
                <td className="px-4 py-2.5">{c.revoked ? <span className="text-red-400">Revogado</span> : <span className="text-accent">Activo</span>}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!c.revoked && (
                      <button onClick={() => revokeCode(c.code)} className="text-xs text-yellow-400 hover:underline">
                        Revogar
                      </button>
                    )}
                    <button onClick={() => deleteCode(c.code)} className="text-xs text-red-400 hover:underline">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Audit Tab ----------------
function AuditTab() {
  const [log, setLog] = useState<{ id: string; action: string; details: Record<string, unknown>; createdAt: string }[]>([]);

  useEffect(() => {
    adminClient.get('/audit-log').then((res) => setLog(res.data.log));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Registo de auditoria</h1>
      <div className="overflow-hidden rounded-lg bg-panelLight">
        {log.length === 0 ? (
          <p className="p-4 text-sm text-textMuted">Sem acções registadas ainda.</p>
        ) : (
          log.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b border-panelHeader/40 px-4 py-2.5 text-sm last:border-0">
              <span className="font-mono text-xs text-accent">{entry.action}</span>
              <span className="text-xs text-textMuted">{JSON.stringify(entry.details)}</span>
              <span className="text-xs text-textMuted">{new Date(entry.createdAt).toLocaleString('pt-PT')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
