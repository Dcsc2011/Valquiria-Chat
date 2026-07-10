export type StatusMode = 'online' | 'away' | 'busy' | 'invisible';
export type Badge = 'verified' | 'developer' | 'founder' | 'early_supporter' | 'translator';
export type CosmeticCategory = 'banner' | 'frame' | 'aura' | 'badge' | 'background' | 'emoji' | 'cursor';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface CosmeticPreview {
  background?: string;
  border?: string;
  boxShadow?: string;
  animation?: string;
  emoji?: string;
  color?: string;
  emojis?: string[];
  cursorColor?: string;
}

export interface CosmeticItem {
  id: string;
  type: CosmeticCategory;
  bundleId: string | null;
  name: string;
  rarity: Rarity;
  price: number | null;
  ownerOnly?: boolean;
  codeOnly?: boolean;
  preview: CosmeticPreview;
}

export interface Bundle {
  id: string;
  name: string;
  theme: string;
  itemIds: string[];
}

export interface Catalog {
  categories: CosmeticCategory[];
  rarities: Rarity[];
  bundles: Bundle[];
  items: CosmeticItem[];
}

export interface GiftCode {
  code: string;
  itemIds: string[];
  bundleId: string | null;
  currency: number;
  maxUses: number | null;
  expiresAt: string | null;
  revoked: boolean;
  usedBy: string[];
  createdAt: string;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
  allowMessagesFrom: 'everyone' | 'nobody';
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  customStatus: string;
  statusMode: StatusMode;
  badges: Badge[];
  isBanned: boolean;
  isOwner: boolean;
  createdAt: string;
  lastSeen: string;
  isOnline: boolean;
  isAdmin: boolean;
  currency: number;
  inventory: string[];
  equipped: Partial<Record<CosmeticCategory, string | null>>;
  favorites: string[];
  xp: number;
  level: number;
  achievements: string[];
  privacy: PrivacySettings;
}

export type MessageType = 'text' | 'emoji' | 'image' | 'document' | 'audio';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  replyTo: string | null;
  mentions: string[];
  reactions: Record<string, string[]>;
  edited: boolean;
  editedAt: string | null;
  deleted: boolean;
  createdAt: string;
  status: MessageStatus;
  readBy: string[];
}

export type ChatType = 'direct' | 'group';

export interface ChatSummary {
  id: string;
  type: ChatType;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
  // directo
  otherUser?: User | null;
  // grupo
  name?: string;
  avatar?: string | null;
  participants?: User[];
  admins?: string[];
  createdBy?: string;
}

export interface AdminChat {
  id: string;
  type: ChatType;
  name?: string;
  avatar?: string | null;
  participants: (User | null)[];
  admins?: string[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface AppConfig {
  appName: string;
  theme: string;
  port: number;
  openRegistration: boolean;
  allowUploads: boolean;
  maxUploadSizeMb: number;
  announcement: string | null;
}

export interface Stats {
  totalUsers: number;
  onlineUsers: number;
  totalChats: number;
  totalMessages: number;
  messagesByType: Record<string, number>;
  uploads: { count: number; sizeBytes: number };
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'reaction' | 'mention' | 'group_invite' | 'gift' | 'achievement' | 'level_up' | 'system';
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
