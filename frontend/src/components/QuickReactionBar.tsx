import React from 'react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface QuickReactionBarProps {
  onSelect: (emoji: string) => void;
}

export default function QuickReactionBar({ onSelect }: QuickReactionBarProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-panelLight px-2 py-1 shadow-xl">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="rounded-full p-1 text-lg transition hover:scale-125 hover:bg-panelHeader"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
