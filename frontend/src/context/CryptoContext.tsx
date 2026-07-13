import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { client } from '../api/client';
import { useAuth } from './AuthContext';
import {
  generateIdentityKeyPair,
  wrapChatKey,
  unwrapChatKey,
  generateChatKey,
  encryptText,
  decryptText,
  isCryptoSupported,
  type StoredKeyPair,
  type EncryptedPayload,
} from '../utils/crypto';
import type { ChatSummary, User, WrappedKey } from '../types';

const PRIVATE_KEY_STORAGE = 'vq_identity_keypair';

interface CryptoContextValue {
  ready: boolean;
  supported: boolean;
  encryptForChat: (chat: ChatSummary, plaintext: string) => Promise<EncryptedPayload | null>;
  decryptForChat: (chat: ChatSummary, payload: { content: string; iv: string | null }) => Promise<string>;
  buildEncryptedKeysForNewChat: (participants: User[]) => Promise<Record<string, WrappedKey> | null>;
  establishEncryptionIfMissing: (chat: ChatSummary) => Promise<Record<string, WrappedKey> | null>;
  wrapKeyForNewMembers: (chat: ChatSummary, newMembers: User[]) => Promise<Record<string, WrappedKey> | null>;
  exportIdentityBackup: () => void;
  importIdentityBackup: (file: File) => Promise<void>;
}

const CryptoContext = createContext<CryptoContextValue | undefined>(undefined);

function loadStoredKeyPair(): StoredKeyPair | null {
  try {
    const raw = localStorage.getItem(PRIVATE_KEY_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredKeyPair(pair: StoredKeyPair) {
  localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(pair));
}

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [ready, setReady] = useState(false);
  const keyPairRef = useRef<StoredKeyPair | null>(null);
  const chatKeyCache = useRef<Map<string, CryptoKey>>(new Map());
  const supported = isCryptoSupported();

  useEffect(() => {
    if (!token || !user || !supported) {
      setReady(false);
      return;
    }

    let cancelled = false;
    (async () => {
      let pair = loadStoredKeyPair();
      if (!pair) {
        pair = await generateIdentityKeyPair();
        saveStoredKeyPair(pair);
      }
      keyPairRef.current = pair;

      // Garante que o servidor tem a chave pública mais recente deste dispositivo.
      const publicKeyStr = JSON.stringify(pair.publicKeyJwk);
      if (user.publicKey !== publicKeyStr) {
        try {
          await client.put('/users/me/public-key', { publicKey: publicKeyStr });
        } catch {
          // Falha de rede não deve bloquear o uso da app — tenta novamente no próximo arranque.
        }
      }

      if (!cancelled) {
        chatKeyCache.current.clear();
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id, supported]);

  // Recolhe a chave pública de um participante a partir dos dados já carregados do chat.
  const findParticipantPublicKey = useCallback((chat: ChatSummary, userId: string): string | null => {
    if (chat.type === 'group') {
      return chat.participants?.find((p) => p.id === userId)?.publicKey || null;
    }
    return chat.otherUser?.id === userId ? chat.otherUser.publicKey : null;
  }, []);

  const getChatKey = useCallback(
    async (chat: ChatSummary): Promise<CryptoKey | null> => {
      if (!keyPairRef.current || !user) return null;
      const cached = chatKeyCache.current.get(chat.id);
      if (cached) return cached;
      if (!chat.myEncryptedKey) return null;

      const wrapperUserId = chat.myEncryptedKey.wrappedBy;
      const wrapperPublicKeyStr =
        wrapperUserId === user.id ? JSON.stringify(keyPairRef.current.publicKeyJwk) : findParticipantPublicKey(chat, wrapperUserId);
      if (!wrapperPublicKeyStr) return null;

      try {
        const wrapperPublicJwk = JSON.parse(wrapperPublicKeyStr);
        const chatKey = await unwrapChatKey(chat.myEncryptedKey, keyPairRef.current.privateKeyJwk, wrapperPublicJwk);
        chatKeyCache.current.set(chat.id, chatKey);
        return chatKey;
      } catch {
        return null;
      }
    },
    [user, findParticipantPublicKey]
  );

  const encryptForChat = useCallback(
    async (chat: ChatSummary, plaintext: string): Promise<EncryptedPayload | null> => {
      const chatKey = await getChatKey(chat);
      if (!chatKey) return null;
      return encryptText(chatKey, plaintext);
    },
    [getChatKey]
  );

  const decryptForChat = useCallback(
    async (chat: ChatSummary, payload: { content: string; iv: string | null }): Promise<string> => {
      if (!payload.iv) return payload.content;
      const chatKey = await getChatKey(chat);
      if (!chatKey) return '🔒 Não foi possível desencriptar (chave em falta neste dispositivo)';
      try {
        return await decryptText(chatKey, { content: payload.content, iv: payload.iv });
      } catch {
        return '🔒 Não foi possível desencriptar esta mensagem';
      }
    },
    [getChatKey]
  );

  // Gera uma nova chave de conversa e embrulha-a para todos os participantes que já têm chave pública.
  const buildEncryptedKeysForNewChat = useCallback(
    async (participants: User[]): Promise<Record<string, WrappedKey> | null> => {
      if (!keyPairRef.current || !user) return null;
      const allHaveKeys = participants.every((p) => !!p.publicKey);
      if (!allHaveKeys) return null; // fica por encriptar até todos terem chave — evita bloquear o envio

      const chatKey = await generateChatKey();
      const encryptedKeys: Record<string, WrappedKey> = {};
      for (const participant of participants) {
        encryptedKeys[participant.id] = await wrapChatKey(
          chatKey,
          user.id,
          keyPairRef.current.privateKeyJwk,
          JSON.parse(participant.publicKey!)
        );
      }
      return encryptedKeys;
    },
    [user]
  );

  // Migração "preguiçosa": se uma conversa antiga ainda não tem chaves e agora todos os
  // participantes já têm chave pública, estabelece a encriptação a partir de agora.
  const establishEncryptionIfMissing = useCallback(
    async (chat: ChatSummary): Promise<Record<string, WrappedKey> | null> => {
      if (chat.myEncryptedKey) return null;
      if (!user) return null;
      const others: User[] = chat.type === 'group' ? chat.participants || [] : chat.otherUser ? [chat.otherUser] : [];
      if (others.length === 0) return null;
      return buildEncryptedKeysForNewChat([...others.filter((p) => p.id !== user.id), user]);
    },
    [buildEncryptedKeysForNewChat, user]
  );

  // Quando um admin adiciona novos membros a um grupo já encriptado, precisa de embrulhar
  // uma cópia da chave (já existente) da conversa para cada novo membro.
  const wrapKeyForNewMembers = useCallback(
    async (chat: ChatSummary, newMembers: User[]): Promise<Record<string, WrappedKey> | null> => {
      if (!keyPairRef.current || !user) return null;
      const chatKey = await getChatKey(chat);
      if (!chatKey) return null; // conversa ainda não estava encriptada — nada a embrulhar

      const result: Record<string, WrappedKey> = {};
      for (const member of newMembers) {
        if (!member.publicKey) continue; // este membro ainda não tem chave — fica de fora da encriptação
        result[member.id] = await wrapChatKey(chatKey, user.id, keyPairRef.current.privateKeyJwk, JSON.parse(member.publicKey));
      }
      return Object.keys(result).length > 0 ? result : null;
    },
    [user, getChatKey]
  );

  const exportIdentityBackup = useCallback(() => {
    if (!keyPairRef.current) return;
    const blob = new Blob([JSON.stringify(keyPairRef.current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'valquiria-chave-encriptacao.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const importIdentityBackup = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as StoredKeyPair;
    if (!parsed.publicKeyJwk || !parsed.privateKeyJwk) {
      throw new Error('Ficheiro de chave inválido.');
    }
    saveStoredKeyPair(parsed);
    keyPairRef.current = parsed;
    chatKeyCache.current.clear();
    await client.put('/users/me/public-key', { publicKey: JSON.stringify(parsed.publicKeyJwk) });
  }, []);

  return (
    <CryptoContext.Provider
      value={{
        ready,
        supported,
        encryptForChat,
        decryptForChat,
        buildEncryptedKeysForNewChat,
        establishEncryptionIfMissing,
        wrapKeyForNewMembers,
        exportIdentityBackup,
        importIdentityBackup,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto deve ser usado dentro de um CryptoProvider.');
  return ctx;
}
