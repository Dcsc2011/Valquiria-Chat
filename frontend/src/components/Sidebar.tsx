import React, { useState } from 'react';
import { MoreVertical, LogOut, UserCog, ShieldCheck, Users, MessageSquarePlus, Store, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import SearchBar from './SearchBar';
import ChatListItem from './ChatListItem';
import ProfileModal from './ProfileModal';
import GroupCreateModal from './GroupCreateModal';
import Shop from './Shop';
import AnnouncementBanner from './AnnouncementBanner';
import { BadgeList } from './Badge';
import NotificationBell from './NotificationBell';
import { useCatalog } from '../context/CatalogContext';
import type { ChatSummary, User } from '../types';
import { Link } from 'react-router-dom';

interface SidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chat: ChatSummary) => void;
  onStartChat: (user: User) => void;
  onGroupCreated: (chat: ChatSummary) => void;
  typingChatIds: Set<string>;
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onStartChat,
  onGroupCreated,
  typingChatIds,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { getEquipped } = useCatalog();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  if (!user) return null;
  const equipped = getEquipped(user);

  return (
    <div className="flex h-full w-full flex-col border-r border-panelHeader/60 bg-panelLight md:w-[380px]">
      <div className="flex items-center justify-between bg-panelHeader px-4 py-3">
        <button onClick={() => setProfileOpen(true)} className="flex items-center gap-2">
          <Avatar src={user.avatar} name={user.name} size={38} frame={equipped.frame} aura={equipped.aura} />
          <BadgeList badges={user.badges} />
        </button>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setGroupModalOpen(true)}
            title="Novo grupo"
            className="rounded-full p-2 hover:bg-panel/60"
          >
            <MessageSquarePlus className="h-5 w-5 text-textMuted" />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full p-2 hover:bg-panel/60">
              <MoreVertical className="h-5 w-5 text-textMuted" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-lg bg-panelLight shadow-xl animate-fade-in">
                <button
                  onClick={() => {
                    setProfileOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-textPrimary hover:bg-panelHeader"
                >
                  <UserCog className="h-4 w-4" /> Editar perfil
                </button>
                <button
                  onClick={() => {
                    setShopOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-textPrimary hover:bg-panelHeader"
                >
                  <Store className="h-4 w-4" /> Loja
                  <span className="ml-auto text-xs text-accent">{user.currency} 🪙</span>
                </button>
                <button
                  onClick={() => {
                    setGroupModalOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-textPrimary hover:bg-panelHeader"
                >
                  <Users className="h-4 w-4" /> Novo grupo
                </button>
                {user.isAdmin && (
                  <Link
                    to="/admin/login"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-textPrimary hover:bg-panelHeader"
                  >
                    <ShieldCheck className="h-4 w-4" /> Painel admin
                  </Link>
                )}
                {user.isOwner && (
                  <Link
                    to="/owner"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-yellow-400 hover:bg-panelHeader"
                  >
                    <Crown className="h-4 w-4" /> Painel do Dono
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-panelHeader"
                >
                  <LogOut className="h-4 w-4" /> Terminar sessão
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnnouncementBanner />
      <SearchBar onStartChat={onStartChat} />

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="p-6 text-center text-sm text-textMuted">
            Ainda não tens conversas. Pesquisa por alguém acima para começar, ou cria um grupo.
          </p>
        ) : (
          chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onClick={() => onSelectChat(chat)}
              isTyping={typingChatIds.has(chat.id)}
              currentUserId={user.id}
            />
          ))
        )}
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {shopOpen && <Shop onClose={() => setShopOpen(false)} />}
      {groupModalOpen && (
        <GroupCreateModal
          onClose={() => setGroupModalOpen(false)}
          onCreated={onGroupCreated}
        />
      )}
    </div>
  );
}
