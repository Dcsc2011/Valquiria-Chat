import React from 'react';
import { BadgeCheck, Code2, Crown, Star, Languages } from 'lucide-react';
import type { Badge as BadgeType } from '../types';

const BADGE_CONFIG: Record<BadgeType, { icon: React.ReactNode; label: string; color: string }> = {
  verified: { icon: <BadgeCheck className="h-full w-full" />, label: 'Conta verificada', color: '#2563EB' },
  developer: { icon: <Code2 className="h-full w-full" />, label: 'Programador do Valquíria Chat', color: '#7C3AED' },
  founder: { icon: <Crown className="h-full w-full" />, label: 'Fundador', color: '#F59E0B' },
  early_supporter: { icon: <Star className="h-full w-full" />, label: 'Apoiante inicial', color: '#EC4899' },
  translator: { icon: <Languages className="h-full w-full" />, label: 'Tradutor', color: '#10B981' },
};

interface BadgeIconProps {
  badge: BadgeType;
  size?: number;
}

export function BadgeIcon({ badge, size = 14 }: BadgeIconProps) {
  const cfg = BADGE_CONFIG[badge];
  if (!cfg) return null;
  return (
    <span title={cfg.label} style={{ color: cfg.color, width: size, height: size }} className="inline-flex shrink-0">
      {cfg.icon}
    </span>
  );
}

interface BadgeListProps {
  badges: BadgeType[];
  size?: number;
}

export function BadgeList({ badges, size = 14 }: BadgeListProps) {
  if (!badges || badges.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {badges.map((b) => (
        <BadgeIcon key={b} badge={b} size={size} />
      ))}
    </span>
  );
}

export const ALL_BADGES: BadgeType[] = ['verified', 'developer', 'founder', 'early_supporter', 'translator'];
export const BADGE_LABELS: Record<BadgeType, string> = Object.fromEntries(
  Object.entries(BADGE_CONFIG).map(([k, v]) => [k, v.label])
) as Record<BadgeType, string>;
