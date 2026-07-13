// Criptografia ponta-a-ponta do Valquíria Chat.
//
// Esquema: cada utilizador tem um par de chaves ECDH (P-256) gerado no próprio
// dispositivo — a chave privada NUNCA sai do browser. Cada conversa tem uma
// chave simétrica aleatória (AES-256-GCM) que é "embrulhada" (encriptada)
// individualmente para cada participante, usando um segredo partilhado
// derivado por ECDH entre quem embrulha e o dono de cada chave pública.
//
// O servidor apenas guarda: chaves públicas, chaves de conversa já embrulhadas
// (que só quem tiver a chave privada certa consegue abrir), e o texto das
// mensagens já cifrado. Em nenhum momento o servidor consegue ler o conteúdo.

const EC_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };

export interface StoredKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Gera um novo par de chaves de identidade ECDH para este dispositivo.
export async function generateIdentityKeyPair(): Promise<StoredKeyPair> {
  const keyPair = await crypto.subtle.generateKey(EC_PARAMS, true, ['deriveKey', 'deriveBits']);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKeyJwk, privateKeyJwk };
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, EC_PARAMS, false, ['deriveKey']);
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, EC_PARAMS, false, []);
}

// Deriva a chave AES-GCM partilhada entre a minha chave privada e a chave pública de outra pessoa.
// Por propriedade do ECDH, isto dá a MESMA chave quer seja calculado de "A para B" ou "B para A".
async function deriveSharedAesKey(myPrivateJwk: JsonWebKey, theirPublicJwk: JsonWebKey): Promise<CryptoKey> {
  const privateKey = await importPrivateKey(myPrivateJwk);
  const publicKey = await importPublicKey(theirPublicJwk);
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Gera uma nova chave simétrica aleatória para uma conversa.
export async function generateChatKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export interface WrappedKey {
  wrappedKey: string;
  iv: string;
  wrappedBy: string;
}

// Embrulha (cifra) a chave da conversa para um participante específico.
export async function wrapChatKey(
  chatKey: CryptoKey,
  myUserId: string,
  myPrivateJwk: JsonWebKey,
  recipientPublicJwk: JsonWebKey
): Promise<WrappedKey> {
  const sharedKey = await deriveSharedAesKey(myPrivateJwk, recipientPublicJwk);
  const rawChatKey = await crypto.subtle.exportKey('raw', chatKey);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes.buffer }, sharedKey, rawChatKey);
  return { wrappedKey: bufferToBase64(wrapped), iv: bufferToBase64(ivBytes), wrappedBy: myUserId };
}

// Desembrulha (decifra) a chave da conversa usando a minha chave privada e a chave pública
// de quem a embrulhou originalmente (chat.myEncryptedKey.wrappedBy).
export async function unwrapChatKey(
  wrapped: WrappedKey,
  myPrivateJwk: JsonWebKey,
  wrapperPublicJwk: JsonWebKey
): Promise<CryptoKey> {
  const sharedKey = await deriveSharedAesKey(myPrivateJwk, wrapperPublicJwk);
  const rawChatKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(wrapped.iv) },
    sharedKey,
    base64ToBuffer(wrapped.wrappedKey)
  );
  return crypto.subtle.importKey('raw', rawChatKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export interface EncryptedPayload {
  content: string;
  iv: string;
}

export async function encryptText(chatKey: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes.buffer }, chatKey, encoded);
  return { content: bufferToBase64(ciphertext), iv: bufferToBase64(ivBytes) };
}

export async function decryptText(chatKey: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
    chatKey,
    base64ToBuffer(payload.content)
  );
  return new TextDecoder().decode(plaintextBuffer);
}

export function isCryptoSupported(): boolean {
  return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
}
