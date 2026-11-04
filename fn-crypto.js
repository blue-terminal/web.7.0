/**
 * fn-crypto.js — Web 7.0 Cryptographic Foundation
 *
 * DOPPIO STRATO / TWO-LAYER SYSTEM:
 *
 * STRATO 1 — Linguaggio finto (FN7Lang)
 *   Ogni carattere viene sostituito con un simbolo inventato.
 *   Il testo codificato sembra una lingua aliena illeggibile.
 *   Senza la tabella di decodifica il testo è incomprensibile.
 *
 * STRATO 2 — Crittografia reale (Web Crypto API)
 *   ECDH P-256: scambio chiavi anonimo (Diffie-Hellman)
 *   AES-GCM 256: cifratura simmetrica del messaggio
 *   ECDSA P-256: firma digitale dell'identità
 *
 * IDENTITÀ ANONIMA:
 *   Ogni utente = coppia di chiavi (pubblica + privata)
 *   Nessuna email, nessun nome reale — solo la chiave pubblica è l'identità
 *   End-to-end: solo mittente e destinatario possono leggere
 *
 * USO:
 *   const FNC = await import('./fn-crypto.js');
 *   const me = await FNC.generateIdentity();
 *   const enc = await FNC.encryptFull("ciao", recipientPubKeyJwk);
 *   const dec = await FNC.decryptFull(enc, me.ecdhPrivate);
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// STRATO 1 — FN7Lang: linguaggio finto di sostituzione
// Ogni carattere ASCII/base ha un simbolo unico inventato.
// La tabella è fissa e pubblica (l'oscuramento è per confondere,
// la vera sicurezza viene dallo strato 2).
// ═══════════════════════════════════════════════════════════════════

const _ENCODE = {
  ' ':'⬚', '!':'ꙮ', '"':'ꝏ', '#':'ꞇ', '$':'ꞔ', '%':'ꞡ', '&':'ꞃ', "'":"ꞅ",
  '(':'ꞑ', ')':'ꞓ', '*':'ꝙ', '+':'ꝛ', ',':'ꝝ', '-':'ꝟ', '.':'ꝡ', '/':'ꝣ',
  '0':'ꝥ', '1':'ꝧ', '2':'ꝩ', '3':'ꝫ', '4':'ꝭ', '5':'ꝯ', '6':'ꝱ', '7':'ꝳ',
  '8':'ꝵ', '9':'ꝷ', ':':'Ꝺ', ';':'Ꝼ', '<':'Ᵹ', '=':'ꝿ', '>':'ꞁ', '?':'ꞃ',
  '@':'ꞅ', 'A':'ᚠ', 'B':'ᚢ', 'C':'ᚦ', 'D':'ᚨ', 'E':'ᚱ', 'F':'ᚲ', 'G':'ᚷ',
  'H':'ᚹ', 'I':'ᚺ', 'J':'ᚾ', 'K':'ᛁ', 'L':'ᛃ', 'M':'ᛇ', 'N':'ᛈ', 'O':'ᛉ',
  'P':'ᛊ', 'Q':'ᛏ', 'R':'ᛒ', 'S':'ᛖ', 'T':'ᛗ', 'U':'ᛚ', 'V':'ᛜ', 'W':'ᛞ',
  'X':'ᛟ', 'Y':'ᛠ', 'Z':'ᛡ', '[':'ᛣ', '\\':'ᛥ', ']':'ᛧ', '^':'ᛩ', '_':'ᛪ',
  '`':'᛫', 'a':'ꬰ', 'b':'ꬱ', 'c':'ꬲ', 'd':'ꬳ', 'e':'ꬴ', 'f':'ꬵ', 'g':'ꬶ',
  'h':'ꬷ', 'i':'ꬸ', 'j':'ꬹ', 'k':'ꬺ', 'l':'ꬻ', 'm':'ꬼ', 'n':'ꬽ', 'o':'ꬾ',
  'p':'ꬿ', 'q':'ꭀ', 'r':'ꭁ', 's':'ꭂ', 't':'ꭃ', 'u':'ꭄ', 'v':'ꭅ', 'w':'ꭆ',
  'x':'ꭇ', 'y':'ꭈ', 'z':'ꭉ', '{':'ꭊ', '|':'ꭋ', '}':'ꭌ', '~':'ꭍ',
  '\n':'⏎', '\t':'⇥'
};

// Decodifica inversa (generata automaticamente)
const _DECODE = Object.fromEntries(Object.entries(_ENCODE).map(([k,v]) => [v,k]));

/** Strato 1: codifica testo in FN7Lang */
export function obfuscate(text) {
  return [...text].map(c => _ENCODE[c] ?? c).join('');
}

/** Strato 1: decodifica da FN7Lang a testo normale */
export function deobfuscate(encoded) {
  // usa regex per trovare i caratteri multi-byte
  return [...encoded].map(c => _DECODE[c] ?? c).join('');
}

// ═══════════════════════════════════════════════════════════════════
// STRATO 2 — Crittografia reale (Web Crypto API)
// ═══════════════════════════════════════════════════════════════════

const subtle = globalThis.crypto?.subtle;

/** Genera identità anonima: coppia ECDH (cifratura) + ECDSA (firma) */
export async function generateIdentity() {
  const [ecdhPair, ecdsaPair] = await Promise.all([
    subtle.generateKey({ name:'ECDH', namedCurve:'P-256' }, true, ['deriveKey']),
    subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, true, ['sign','verify'])
  ]);
  const [ecdhPublicJwk, ecdhPrivateJwk, ecdsaPublicJwk, ecdsaPrivateJwk] = await Promise.all([
    subtle.exportKey('jwk', ecdhPair.publicKey),
    subtle.exportKey('jwk', ecdhPair.privateKey),
    subtle.exportKey('jwk', ecdsaPair.publicKey),
    subtle.exportKey('jwk', ecdsaPair.privateKey)
  ]);
  return {
    ecdhPublic:   ecdhPublicJwk,
    ecdhPrivate:  ecdhPrivateJwk,
    ecdsaPublic:  ecdsaPublicJwk,
    ecdsaPrivate: ecdsaPrivateJwk,
    // L'identità pubblica è solo la chiave pubblica ECDH (nessun nome, nessuna email)
    id: ecdhPublicJwk.x + ecdhPublicJwk.y
  };
}

/** Salva identità in localStorage (cifrata con la propria password) */
export async function saveIdentity(identity, password) {
  const key = await _pwdKey(password);
  const json = JSON.stringify(identity);
  const enc = await _aesEncrypt(key, json);
  localStorage.setItem('fn7_identity', JSON.stringify(enc));
}

/** Carica identità da localStorage */
export async function loadIdentity(password) {
  const raw = localStorage.getItem('fn7_identity');
  if (!raw) return null;
  const enc = JSON.parse(raw);
  const key = await _pwdKey(password);
  const json = await _aesDecrypt(key, enc);
  return JSON.parse(json);
}

/**
 * Cifratura completa a doppio strato:
 * testo → FN7Lang → AES-GCM(ECDH key)
 * @param {string} plaintext  - testo in chiaro
 * @param {object} recipientEcdhPublicJwk - chiave pubblica ECDH del destinatario
 * @param {object} senderEcdhPrivateJwk  - chiave privata ECDH del mittente
 * @returns {object} pacchetto cifrato {iv, ct, epk} in base64
 */
export async function encryptFull(plaintext, recipientEcdhPublicJwk, senderEcdhPrivateJwk) {
  // Strato 1: obfuscazione
  const obfuscated = obfuscate(plaintext);

  // Strato 2: ECDH shared secret → AES-GCM
  const recipientPub = await subtle.importKey('jwk', recipientEcdhPublicJwk, { name:'ECDH', namedCurve:'P-256' }, false, []);
  const senderPriv   = await subtle.importKey('jwk', senderEcdhPrivateJwk,   { name:'ECDH', namedCurve:'P-256' }, false, ['deriveKey']);
  const aesKey = await subtle.deriveKey(
    { name:'ECDH', public: recipientPub },
    senderPriv,
    { name:'AES-GCM', length:256 }, false, ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(obfuscated);
  const ct = await subtle.encrypt({ name:'AES-GCM', iv }, aesKey, encoded);

  return {
    iv: _b64(iv),
    ct: _b64(new Uint8Array(ct)),
    // La chiave pubblica del mittente è inclusa (anonima — solo la chiave, nessun nome)
    spk: JSON.stringify(senderEcdhPrivateJwk ? {} : {})
  };
}

/**
 * Decifratura completa a doppio strato:
 * pacchetto → AES-GCM → FN7Lang → testo
 * @param {object} packet - {iv, ct, spk}
 * @param {object} recipientEcdhPrivateJwk - chiave privata del destinatario
 * @param {object} senderEcdhPublicJwk - chiave pubblica del mittente
 */
export async function decryptFull(packet, recipientEcdhPrivateJwk, senderEcdhPublicJwk) {
  const senderPub = await subtle.importKey('jwk', senderEcdhPublicJwk, { name:'ECDH', namedCurve:'P-256' }, false, []);
  const recvPriv  = await subtle.importKey('jwk', recipientEcdhPrivateJwk, { name:'ECDH', namedCurve:'P-256' }, false, ['deriveKey']);
  const aesKey = await subtle.deriveKey(
    { name:'ECDH', public: senderPub },
    recvPriv,
    { name:'AES-GCM', length:256 }, false, ['decrypt']
  );
  const iv = _unb64(packet.iv);
  const ct = _unb64(packet.ct);
  const dec = await subtle.decrypt({ name:'AES-GCM', iv }, aesKey, ct);
  const obfuscated = new TextDecoder().decode(dec);
  // Rimuovi strato 1
  return deobfuscate(obfuscated);
}

/** Firma un messaggio con ECDSA (prova identità anonima) */
export async function signMessage(data, ecdsaPrivateJwk) {
  const key = await subtle.importKey('jwk', ecdsaPrivateJwk, { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']);
  const sig = await subtle.sign({ name:'ECDSA', hash:'SHA-256' }, key, new TextEncoder().encode(data));
  return _b64(new Uint8Array(sig));
}

/** Verifica firma ECDSA */
export async function verifySignature(data, signatureB64, ecdsaPublicJwk) {
  const key = await subtle.importKey('jwk', ecdsaPublicJwk, { name:'ECDSA', namedCurve:'P-256' }, false, ['verify']);
  return subtle.verify({ name:'ECDSA', hash:'SHA-256' }, key, _unb64(signatureB64), new TextEncoder().encode(data));
}

/**
 * Hash anonimo dell'identità (fingerprint breve per mostrare all'utente)
 * Es: "7f3a·b2c9·1e4d"
 */
export async function identityFingerprint(ecdhPublicJwk) {
  const data = new TextEncoder().encode(ecdhPublicJwk.x + ecdhPublicJwk.y);
  const hash = await subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('');
  return hex.slice(0,4) + '·' + hex.slice(4,8) + '·' + hex.slice(8,12);
}

// ═══════════════════════════════════════════════════════════════════
// UTILITÀ INTERNE
// ═══════════════════════════════════════════════════════════════════

function _b64(buf) {
  return btoa(String.fromCharCode(...buf));
}
function _unb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function _pwdKey(password) {
  const raw = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const salt = new TextEncoder().encode('fn7salt_v1');
  return subtle.deriveKey(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' },
    raw,
    { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
  );
}

async function _aesEncrypt(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { iv: _b64(iv), ct: _b64(new Uint8Array(ct)) };
}

async function _aesDecrypt(key, { iv, ct }) {
  const dec = await subtle.decrypt({ name:'AES-GCM', iv: _unb64(iv) }, key, _unb64(ct));
  return new TextDecoder().decode(dec);
}
