import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { client } from '../api/client';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    client.get('/config/public').then((res) => {
      const text = res.data.announcement;
      if (text && localStorage.getItem('vq_dismissed_announcement') !== text) {
        setAnnouncement(text);
      }
    });
  }, []);

  if (!announcement || dismissed) return null;

  return (
    <div className="flex items-center gap-2 bg-accent px-4 py-2 text-sm text-panel">
      <Megaphone className="h-4 w-4 shrink-0" />
      <p className="flex-1">{announcement}</p>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem('vq_dismissed_announcement', announcement);
        }}
        className="shrink-0 rounded-full p-1 hover:bg-black/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
