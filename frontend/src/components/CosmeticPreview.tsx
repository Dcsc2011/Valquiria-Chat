import React from 'react';
import type { CosmeticItem } from '../types';

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
  mythic: 'Mítico',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#8696a0',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
  mythic: '#ec4899',
};

export function RarityTag({ rarity }: { rarity: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: RARITY_COLORS[rarity], backgroundColor: `${RARITY_COLORS[rarity]}22` }}
    >
      {RARITY_LABELS[rarity] || rarity}
    </span>
  );
}

interface CosmeticSwatchProps {
  item: CosmeticItem;
  size?: number;
}

// Miniatura de pré-visualização usada nos cartões da loja e inventário.
export function CosmeticSwatch({ item, size = 64 }: CosmeticSwatchProps) {
  const p = item.preview || {};

  if (item.type === 'badge' || item.type === 'profileEffect') {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-panel text-2xl"
        style={{ width: size, height: size, color: p.color }}
      >
        {p.emoji || '🏅'}
      </div>
    );
  }

  if (item.type === 'emoji') {
    return (
      <div
        className="flex flex-wrap items-center justify-center gap-0.5 rounded-lg bg-panel p-1 text-sm"
        style={{ width: size, height: size }}
      >
        {(p.emojis || []).slice(0, 4).join(' ')}
      </div>
    );
  }

  if (item.type === 'cursor') {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-panel"
        style={{ width: size, height: size, color: p.cursorColor }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 2l16 6-6 2-2 6z" />
        </svg>
      </div>
    );
  }

  if (item.type === 'frame' || item.type === 'aura') {
    const ringPadding = p.ringGradient ? Math.max(5, size * 0.14) : 0;
    const outer = size + ringPadding * 2;
    return (
      <div className="relative flex items-center justify-center" style={{ width: outer, height: outer }}>
        {p.ringGradient && (
          <div
            className="absolute inset-0 rounded-full vq-spin-ring"
            style={{
              background: p.ringGradient,
              animationDuration: p.spinDuration || '3s',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
            }}
          />
        )}
        <div
          className="rounded-full bg-panelHeader"
          style={{
            width: size,
            height: size,
            border: p.border,
            boxShadow: p.boxShadow,
            animation: p.animation,
          }}
        />
      </div>
    );
  }

  // banner / background
  return (
    <div
      className={`rounded-lg ${p.shimmer ? 'vq-shimmer' : ''}`}
      style={{ width: size, height: size * 0.6, background: p.background }}
    />
  );
}
