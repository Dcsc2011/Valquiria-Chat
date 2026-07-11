import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

// Evento não tipado nativamente pelo TypeScript/DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('vq_install_dismissed') === 'true');

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIos()) {
      setShowIosHint(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const dismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosHint(false);
    localStorage.setItem('vq_install_dismissed', 'true');
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (dismissed || isStandalone() || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-xl bg-panelLight p-4 shadow-2xl animate-fade-in">
      <button onClick={dismiss} className="absolute right-2 top-2 rounded-full p-1 text-textMuted hover:bg-panelHeader">
        <X className="h-4 w-4" />
      </button>

      {deferredPrompt ? (
        <>
          <p className="mb-1 text-sm font-medium text-textPrimary">Instalar o Valquíria Chat</p>
          <p className="mb-3 text-xs text-textMuted">Adiciona a app ao teu ecrã principal para um acesso mais rápido.</p>
          <button
            onClick={install}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-sm font-medium text-panel hover:bg-accentDark"
          >
            <Download className="h-4 w-4" /> Instalar
          </button>
        </>
      ) : (
        <>
          <p className="mb-1 text-sm font-medium text-textPrimary">Instalar no iPhone/iPad</p>
          <p className="flex items-center gap-1 text-xs text-textMuted">
            Toca em <Share className="mx-0.5 inline h-3.5 w-3.5" /> e depois em "Adicionar ao ecrã principal".
          </p>
        </>
      )}
    </div>
  );
}
