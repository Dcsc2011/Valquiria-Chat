import React from 'react';
import { initials } from '../utils/format';
import type { StatusMode, CosmeticItem } from '../types';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  statusMode?: StatusMode;
  frame?: CosmeticItem | null;
  aura?: CosmeticItem | null;
}

const STATUS_COLOR: Record<StatusMode, string> = {
  online: '#00a884',
  away: '#F0B429',
  busy: '#E5484D',
  invisible: '#8696a0',
};

export default function Avatar({ src, name, size = 42, online, statusMode, frame, aura }: AvatarProps) {
  const ringColor = online === undefined ? undefined : online ? STATUS_COLOR[statusMode || 'online'] : STATUS_COLOR.invisible;

  const auraStyle: React.CSSProperties = aura
    ? { boxShadow: aura.preview.boxShadow, animation: aura.preview.animation }
    : {};
  const frameStyle: React.CSSProperties = frame
    ? { border: frame.preview.border, boxShadow: frame.preview.boxShadow, animation: frame.preview.animation }
    : {};

  return (
    <div className="relative shrink-0 rounded-full" style={{ width: size, height: size, ...auraStyle }}>
      <div className="h-full w-full rounded-full" style={frameStyle}>
        {src ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full rounded-full object-cover"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-panelHeader text-sm font-medium text-textMuted"
            style={{ width: size, height: size }}
          >
            {initials(name) || '?'}
          </div>
        )}
      </div>
      {ringColor && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-panelLight"
          style={{ width: size * 0.32, height: size * 0.32, backgroundColor: ringColor }}
        />
      )}
    </div>
  );
}
