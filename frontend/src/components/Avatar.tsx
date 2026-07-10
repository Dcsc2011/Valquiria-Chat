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

  const auraGlowStyle: React.CSSProperties = aura
    ? { boxShadow: aura.preview.boxShadow, animation: aura.preview.animation }
    : {};

  const frameStyle: React.CSSProperties = frame
    ? {
        border: frame.preview.border,
        boxShadow: frame.preview.boxShadow ? `inset 0 0 0 1px rgba(255,255,255,0.05), ${frame.preview.boxShadow}` : undefined,
        animation: frame.preview.animation,
      }
    : {};

  // Espaço extra à volta do avatar para o anel giratório (aura mítica) não ficar cortado.
  const ringPadding = aura?.preview.ringGradient ? Math.max(6, size * 0.14) : 0;
  const outerSize = size + ringPadding * 2;

  return (
    <div className="relative shrink-0" style={{ width: outerSize, height: outerSize }}>
      {aura?.preview.ringGradient && (
        <div
          className="absolute inset-0 rounded-full vq-spin-ring"
          style={{
            background: aura.preview.ringGradient,
            animationDuration: aura.preview.spinDuration || '3s',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          }}
        />
      )}
      <div
        className="absolute rounded-full"
        style={{ top: ringPadding, left: ringPadding, width: size, height: size, ...auraGlowStyle }}
      >
        <div
          className="h-full w-full overflow-hidden rounded-full bg-panelHeader"
          style={{ boxSizing: 'border-box', ...frameStyle }}
        >
          {src ? (
            <img src={src} alt={name} className="block h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full text-sm font-medium text-textMuted">
              {initials(name) || '?'}
            </div>
          )}
        </div>
        {ringColor && (
          <span
            className="absolute bottom-0 right-0 rounded-full border-2 border-panelLight"
            style={{ width: Math.max(10, size * 0.3), height: Math.max(10, size * 0.3), backgroundColor: ringColor }}
          />
        )}
      </div>
    </div>
  );
}
