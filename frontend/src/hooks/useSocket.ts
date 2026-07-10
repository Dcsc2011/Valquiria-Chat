import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let sharedSocket: Socket | null = null;

export function useSocket(): Socket | null {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      socketRef.current = null;
      return;
    }

    if (!sharedSocket || sharedSocket.disconnected) {
      sharedSocket = io('/', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
    }
    socketRef.current = sharedSocket;
    (window as any).__vqSocket = sharedSocket;

    return () => {
      // Mantém o socket vivo entre navegações; só desliga no logout (token null).
    };
  }, [token]);

  return socketRef.current;
}
