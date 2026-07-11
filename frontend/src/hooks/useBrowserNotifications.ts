import { useCallback, useEffect, useRef } from 'react';
import { playNotificationSound } from '../utils/notificationSound';

export function useBrowserNotifications() {
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (permissionRequested.current) return;
    permissionRequested.current = true;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Mostra uma notificação do sistema (como o WhatsApp Web) quando a aba não está em foco,
  // e toca sempre um som curto, mesmo com a aba aberta, para nunca perderes uma mensagem.
  const notify = useCallback(
    (title: string, options?: { body?: string; icon?: string; onClick?: () => void }) => {
      playNotificationSound();

      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!document.hidden) return; // a aba já está visível, o som já chega

      try {
        const notification = new Notification(title, {
          body: options?.body,
          icon: options?.icon || '/favicon-192.png',
          silent: true, // já tocámos o nosso próprio som acima
        });
        notification.onclick = () => {
          window.focus();
          options?.onClick?.();
          notification.close();
        };
      } catch {
        // Alguns navegadores/PWAs restringem `new Notification()` fora de um Service Worker; ignora silenciosamente.
      }
    },
    []
  );

  return { notify };
}
