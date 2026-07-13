import React, { useState } from 'react';
import { X, Camera, Circle, Moon, CircleDashed, EyeOff, Trophy, ShieldQuestion, KeyRound, Download, Upload } from 'lucide-react';
import { client } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { useCrypto } from '../context/CryptoContext';
import { useTheme, ThemeName } from '../context/ThemeContext';
import Avatar from './Avatar';
import { BadgeList } from './Badge';
import type { StatusMode } from '../types';

interface ProfileModalProps {
  onClose: () => void;
}

const STATUS_OPTIONS: { mode: StatusMode; label: string; icon: React.ReactNode; color: string }[] = [
  { mode: 'online', label: 'Online', icon: <Circle className="h-3.5 w-3.5" />, color: '#00a884' },
  { mode: 'away', label: 'Ausente', icon: <Moon className="h-3.5 w-3.5" />, color: '#F0B429' },
  { mode: 'busy', label: 'Ocupado', icon: <CircleDashed className="h-3.5 w-3.5" />, color: '#E5484D' },
  { mode: 'invisible', label: 'Invisível', icon: <EyeOff className="h-3.5 w-3.5" />, color: '#8696a0' },
];

const THEME_OPTIONS: { id: ThemeName; label: string; swatch: string }[] = [
  { id: 'valquiria', label: 'Valquíria (dourado)', swatch: '#d4af37' },
  { id: 'discord', label: 'Discord', swatch: '#5865f2' },
  { id: 'midnight', label: 'Midnight', swatch: '#2563eb' },
  { id: 'ragnarok', label: 'Ragnarok', swatch: '#f97316' },
  { id: 'aurora', label: 'Aurora', swatch: '#2dd4bf' },
  { id: 'light', label: 'Claro', swatch: '#b8952c' },
];

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { getEquipped } = useCatalog();
  const cryptoCtx = useCrypto();
  const [keyImportMsg, setKeyImportMsg] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [banner, setBanner] = useState(user?.banner || '');
  const [privacy, setPrivacy] = useState(
    user?.privacy || { showOnlineStatus: true, showReadReceipts: true, allowMessagesFrom: 'everyone' as const }
  );
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await client.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatar(res.data.url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao enviar avatar.');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('banner', file);
    try {
      const res = await client.post('/upload/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBanner(res.data.url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao enviar banner.');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name, username, bio, avatar, banner, customStatus, privacy };
      if (newPassword) {
        payload.password = password;
        payload.newPassword = newPassword;
      }
      const res = await client.put('/users/me', payload);
      setUser(res.data.user);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao guardar perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-panelLight shadow-2xl animate-fade-in">
        <div className="relative h-28 w-full overflow-hidden rounded-t-2xl bg-panelHeader">
          {banner && <img src={banner} alt="banner" className="h-full w-full object-cover" />}
          <label className="absolute right-2 top-2 cursor-pointer rounded-full bg-black/50 p-1.5">
            <Camera className="h-4 w-4 text-textPrimary" />
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </label>
          <button onClick={onClose} className="absolute left-2 top-2 rounded-full bg-black/50 p-1.5">
            <X className="h-4 w-4 text-textPrimary" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-10 mb-3 flex items-end gap-3">
            <div className="relative">
              <Avatar src={avatar} name={name} size={84} frame={getEquipped(user).frame} aura={getEquipped(user).aura} />
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-accent p-1.5">
                <Camera className="h-4 w-4 text-panel" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <BadgeList badges={user.badges} size={18} />
          </div>

          <div className="mb-4 rounded-lg bg-panel px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-textPrimary">
                <Trophy className="h-3.5 w-3.5 text-yellow-400" /> Nível {user.level}
              </span>
              <span className="text-textMuted">{user.xp} XP · {user.currency} 🪙 Runas</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-panelHeader">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, (user.xp % (50 * user.level * user.level || 1)) / (50 * (user.level + 1) * (user.level + 1) || 1) * 100 + 10)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-textMuted">Nome</label>
              <input
                className="w-full rounded-lg bg-panel px-3 py-2 text-sm text-textPrimary outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-textMuted">Username</label>
              <input
                className="w-full rounded-lg bg-panel px-3 py-2 text-sm text-textPrimary outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-textMuted">Estado personalizado</label>
              <input
                className="w-full rounded-lg bg-panel px-3 py-2 text-sm text-textPrimary outline-none"
                placeholder="Ex: A programar em Termux 🔥"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-textMuted">Bio</label>
              <textarea
                className="w-full resize-none rounded-lg bg-panel px-3 py-2 text-sm text-textPrimary outline-none"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-textMuted">Estado de presença</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => {
                      const w = window as any;
                      w.__vqSocket?.emit('statusChange', { statusMode: opt.mode });
                    }}
                    className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2 text-xs text-textPrimary hover:bg-panelHeader"
                  >
                    <span style={{ color: opt.color }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-textMuted">Tema</label>
              <div className="grid grid-cols-2 gap-1.5">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                      theme === opt.id ? 'bg-accent text-panel font-medium' : 'bg-panel text-textPrimary hover:bg-panelHeader'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: opt.swatch }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-panel px-3 py-2">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-textMuted">
                <ShieldQuestion className="h-3.5 w-3.5" /> Privacidade
              </p>
              <label className="mb-2 flex items-center justify-between text-xs text-textPrimary">
                Mostrar estado online
                <input
                  type="checkbox"
                  checked={privacy.showOnlineStatus}
                  onChange={(e) => setPrivacy({ ...privacy, showOnlineStatus: e.target.checked })}
                />
              </label>
              <label className="mb-2 flex items-center justify-between text-xs text-textPrimary">
                Mostrar confirmações de leitura
                <input
                  type="checkbox"
                  checked={privacy.showReadReceipts}
                  onChange={(e) => setPrivacy({ ...privacy, showReadReceipts: e.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-textPrimary">
                Aceitar novas conversas de
                <select
                  className="rounded-md bg-panelHeader px-2 py-1 text-xs text-textPrimary outline-none"
                  value={privacy.allowMessagesFrom}
                  onChange={(e) => setPrivacy({ ...privacy, allowMessagesFrom: e.target.value as 'everyone' | 'nobody' })}
                >
                  <option value="everyone">Todos</option>
                  <option value="nobody">Ninguém (só conversas existentes)</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg bg-panel px-3 py-2">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-textMuted">
                <KeyRound className="h-3.5 w-3.5" /> Chave de encriptação ponta-a-ponta
              </p>
              <p className="mb-2 text-[11px] leading-relaxed text-textMuted">
                As tuas mensagens são cifradas neste dispositivo. Se limpares os dados do
                navegador ou mudares de aparelho sem exportar esta chave, perdes o acesso ao
                histórico de mensagens antigas para sempre — ninguém, nem o servidor, consegue
                recuperá-las.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={cryptoCtx.exportIdentityBackup}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-panelHeader py-2 text-xs text-textPrimary hover:bg-panel"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar
                </button>
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-panelHeader py-2 text-xs text-textPrimary hover:bg-panel">
                  <Upload className="h-3.5 w-3.5" /> Importar
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await cryptoCtx.importIdentityBackup(file);
                        setKeyImportMsg('Chave importada com sucesso.');
                      } catch {
                        setKeyImportMsg('Erro ao importar a chave — verifica o ficheiro.');
                      }
                    }}
                  />
                </label>
              </div>
              {keyImportMsg && <p className="mt-2 text-[11px] text-accent">{keyImportMsg}</p>}
            </div>

            <details className="rounded-lg bg-panel px-3 py-2">
              <summary className="cursor-pointer text-xs text-textMuted">Alterar senha</summary>
              <div className="mt-2 flex flex-col gap-2">
                <input
                  type="password"
                  placeholder="Senha actual"
                  className="w-full rounded-lg bg-panelHeader px-3 py-2 text-sm text-textPrimary outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Nova senha"
                  className="w-full rounded-lg bg-panelHeader px-3 py-2 text-sm text-textPrimary outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </details>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-panel hover:bg-accentDark disabled:opacity-60"
            >
              {saving ? 'A guardar...' : 'Guardar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
