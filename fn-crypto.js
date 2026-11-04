/**
 * fn-crypto.js — Web 7.0 Cryptographic Foundation v2
 *
 * DOPPIO STRATO AVANZATO:
 *
 * STRATO 1 — FN8Lang (linguaggio finto avanzato)
 *   • Ogni carattere → sequenza di 2–3 simboli da alfabeti reali ma rari
 *     (Tifinagh, Vai, Bamum, Lisu, Old Italic, Cham, Mende Kikakui…)
 *   • Separatori visivi casuali ogni N caratteri (sembrano punteggiatura)
 *   • I numeri diventano sequenze di glifi numerici Vai
 *   • Il risultato sembra una lingua scritta vera ma incomprensibile
 *
 * STRATO 2 — RSA-2048 + AES-GCM-256 (cifratura ibrida)
 *   • RSA-OAEP SHA-256 (2048 bit): cifra la chiave AES di sessione
 *   • AES-GCM-256: cifra il messaggio reale (con IV casuale)
 *   • RSA-PSS SHA-256 (2048 bit): firma digitale dell'identità
 *   • PBKDF2 + AES-GCM: protegge la chiave privata in localStorage
 *
 * IDENTITÀ:
 *   Ogni utente ha solo una coppia RSA-2048.
 *   Nessuna email, nessun nome — l'identità è solo la chiave pubblica.
 *   Il fingerprint (SHA-256 della chiave pubblica) è l'unico identificativo.
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// STRATO 1 — FN8Lang: linguaggio finto avanzato
//
// Ogni carattere ASCII viene mappato a una sequenza di 2 simboli
// scelti da alfabeti Unicode rari e visivamente coerenti.
// I separatori imitano la punteggiatura di una lingua reale.
// ═══════════════════════════════════════════════════════════════════

// Simboli base da alfabeti rari (Tifinagh, Vai, Bamum, Lisu, Old Italic, Cham)
const _SYM = [
  'ⴰ','ⴱ','ⴲ','ⴳ','ⴴ','ⴵ','ⴶ','ⴷ','ⴸ','ⴹ','ⴺ','ⴻ','ⴼ','ⴽ','ⴾ','ⴿ',
  'ꔀ','ꔁ','ꔂ','ꔃ','ꔄ','ꔅ','ꔆ','ꔇ','ꔈ','ꔉ','ꔊ','ꔋ','ꔌ','ꔍ','ꔎ','ꔏ',
  'ꚠ','ꚡ','ꚢ','ꚣ','ꚤ','ꚥ','ꚦ','ꚧ','ꚨ','ꚩ','ꚪ','ꚫ','ꚬ','ꚭ','ꚮ','ꚯ',
  'ꓐ','ꓑ','ꓒ','ꓓ','ꓔ','ꓕ','ꓖ','ꓗ','ꓘ','ꓙ','ꓚ','ꓛ','ꓜ','ꓝ','ꓞ','ꓟ',
  'ꩠ','ꩡ','ꩢ','ꩣ','ꩤ','ꩥ','ꩦ','ꩧ','ꩨ','ꩩ','ꩪ','ꩫ','ꩬ','ꩭ','ꩮ','ꩯ',
  'ꧠ','ꧡ','ꧢ','ꧣ','ꧤ','ꧥ','ꧦ','ꧧ','ꧨ','ꧩ','ꧪ','ꧫ','ꧬ','ꧭ','ꧮ','ꧯ',
];

// Separatori visivi (sembrano punteggiatura naturale di una lingua)
const _SEP = ['꩟','᪪','᪫','᪬','꩞','᪭','꩝','᪣','᪤','᪥'];

// Glifi numerici Vai (per i numeri 0–9)
const _NUMS = ['꘠','꘡','꘢','꘣','꘤','꘥','꘦','꘧','꘨','꘩'];

// Mappa ogni codice ASCII (32–126) a una coppia di indici in _SYM
// Deterministica: seed dal codice del carattere
function _charToGlyphs(code) {
  const i = (code * 31 + 7) % _SYM.length;
  const j = (code * 53 + 17) % _SYM.length;
  return _SYM[i] + _SYM[j];
}

// Build decode map (glyph-pair → char)
const _ENCODE_MAP = new Map();
const _DECODE_MAP = new Map();
for (let c = 32; c <= 126; c++) {
  const g = _charToGlyphs(c);
  _ENCODE_MAP.set(String.fromCharCode(c), g);
  _DECODE_MAP.set(g, String.fromCharCode(c));
}
// Newline e tab
_ENCODE_MAP.set('\n', _SYM[0]+_SYM[1]); _DECODE_MAP.set(_SYM[0]+_SYM[1], '\n');
_ENCODE_MAP.set('\t', _SYM[2]+_SYM[3]); _DECODE_MAP.set(_SYM[2]+_SYM[3], '\t');

/** Strato 1: codifica testo → FN8Lang */
export function obfuscate(text) {
  let out = '';
  let count = 0;
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      // I numeri diventano glifi numerici Vai + un simbolo
      out += _NUMS[+ch] + _SYM[(+ch * 7 + 3) % _SYM.length];
    } else {
      out += _ENCODE_MAP.get(ch) ?? (ch + ch);
    }
    count++;
    // Inserisci separatore visivo ogni 4–7 caratteri (pseudo-casuale ma deterministico)
    if (count % (4 + (ch.charCodeAt(0) % 4)) === 0) {
      out += _SEP[count % _SEP.length];
    }
  }
  return out;
}

/** Strato 1: decodifica FN8Lang → testo normale */
export function deobfuscate(encoded) {
  // Rimuovi separatori
  let clean = encoded;
  for (const s of _SEP) clean = clean.split(s).join('');

  // Leggi a coppie di glifi
  const chars = [...clean];
  let result = '';
  let i = 0;
  while (i < chars.length) {
    // Prova numero Vai
    const numIdx = _NUMS.indexOf(chars[i]);
    if (numIdx !== -1) {
      result += String(numIdx);
      i += 2; // skip numero + simbolo decorativo
      continue;
    }
    // Prova coppia normale
    if (i + 1 < chars.length) {
      const pair = chars[i] + chars[i+1];
      const ch = _DECODE_MAP.get(pair);
      if (ch !== undefined) {
        result += ch;
        i += 2;
        continue;
      }
    }
    i++;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// STRATO 2 — RSA-2048 + AES-GCM-256 (cifratura ibrida)
// ═══════════════════════════════════════════════════════════════════

const subtle = globalThis.crypto?.subtle;

const RSA_PARAMS = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256'
};
const PSS_PARAMS = {
  name: 'RSA-PSS',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256'
};

/**
 * Genera identità anonima RSA-2048:
 * - rsaEncrypt: coppia RSA-OAEP (cifra messaggi)
 * - rsaSign:    coppia RSA-PSS  (firma)
 */
export async function generateIdentity() {
  const [encPair, sigPair] = await Promise.all([
    subtle.generateKey(RSA_PARAMS, true, ['encrypt','decrypt']),
    subtle.generateKey(PSS_PARAMS, true, ['sign','verify'])
  ]);
  const [encPub, encPriv, sigPub, sigPriv] = await Promise.all([
    subtle.exportKey('jwk', encPair.publicKey),
    subtle.exportKey('jwk', encPair.privateKey),
    subtle.exportKey('jwk', sigPair.publicKey),
    subtle.exportKey('jwk', sigPair.privateKey)
  ]);
  const fp = await _fingerprint(encPub);
  return {
    encPublic:  encPub,
    encPrivate: encPriv,
    sigPublic:  sigPub,
    sigPrivate: sigPriv,
    fingerprint: fp   // es: "a3f2·7b1c·9e04·d85a"
  };
}

/**
 * Cifratura ibrida a doppio strato:
 *   plaintext → FN8Lang → AES-GCM(chiave random) → RSA-OAEP(chiave AES)
 *
 * @param {string} plaintext
 * @param {object} recipientEncPublicJwk — chiave pubblica RSA-OAEP del destinatario
 * @returns {{ ekey, iv, ct }} tutto in base64
 */
export async function encryptFull(plaintext, recipientEncPublicJwk) {
  // Strato 1
  const obfuscated = obfuscate(plaintext);

  // Genera chiave AES-256 di sessione
  const aesKey = await subtle.generateKey({ name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
  const aesRaw = await subtle.exportKey('raw', aesKey);

  // Strato 2a: cifra il testo con AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(obfuscated);
  const ct = await subtle.encrypt({ name:'AES-GCM', iv }, aesKey, encoded);

  // Strato 2b: cifra la chiave AES con RSA-OAEP del destinatario
  const recvPub = await subtle.importKey('jwk', recipientEncPublicJwk, RSA_PARAMS, false, ['encrypt']);
  const ekey = await subtle.encrypt({ name:'RSA-OAEP' }, recvPub, aesRaw);

  return {
    ekey: _b64(new Uint8Array(ekey)),
    iv:   _b64(iv),
    ct:   _b64(new Uint8Array(ct))
  };
}

/**
 * Decifratura ibrida a doppio strato:
 *   RSA-OAEP(chiave AES) → AES-GCM → FN8Lang → plaintext
 *
 * @param {{ ekey, iv, ct }} packet
 * @param {object} myEncPrivateJwk — chiave privata RSA-OAEP del destinatario
 */
export async function decryptFull(packet, myEncPrivateJwk) {
  const myPriv = await subtle.importKey('jwk', myEncPrivateJwk, RSA_PARAMS, false, ['decrypt']);

  // Decifra chiave AES con RSA privata
  const aesRaw = await subtle.decrypt({ name:'RSA-OAEP' }, myPriv, _unb64(packet.ekey));
  const aesKey = await subtle.importKey('raw', aesRaw, { name:'AES-GCM' }, false, ['decrypt']);

  // Decifra messaggio con AES-GCM
  const dec = await subtle.decrypt({ name:'AES-GCM', iv: _unb64(packet.iv) }, aesKey, _unb64(packet.ct));
  const obfuscated = new TextDecoder().decode(dec);

  // Rimuovi strato 1
  return deobfuscate(obfuscated);
}

/** Firma RSA-PSS */
export async function signMessage(data, sigPrivateJwk) {
  const key = await subtle.importKey('jwk', sigPrivateJwk, PSS_PARAMS, false, ['sign']);
  const sig = await subtle.sign(
    { name:'RSA-PSS', saltLength: 32 }, key,
    new TextEncoder().encode(data)
  );
  return _b64(new Uint8Array(sig));
}

/** Verifica firma RSA-PSS */
export async function verifySignature(data, signatureB64, sigPublicJwk) {
  const key = await subtle.importKey('jwk', sigPublicJwk, PSS_PARAMS, false, ['verify']);
  return subtle.verify(
    { name:'RSA-PSS', saltLength: 32 }, key,
    _unb64(signatureB64),
    new TextEncoder().encode(data)
  );
}

/**
 * Salva identità in localStorage — cifrata con password utente (PBKDF2 + AES-GCM)
 * La chiave privata RSA non lascia mai il dispositivo in chiaro.
 */
export async function saveIdentity(identity, password) {
  const k = await _pwdKey(password);
  const enc = await _aesEncrypt(k, JSON.stringify(identity));
  localStorage.setItem('fn8_id', JSON.stringify(enc));
}

/** Carica e decifra identità da localStorage */
export async function loadIdentity(password) {
  const raw = localStorage.getItem('fn8_id');
  if (!raw) return null;
  try {
    const k = await _pwdKey(password);
    const json = await _aesDecrypt(k, JSON.parse(raw));
    return JSON.parse(json);
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// UTILITÀ
// ═══════════════════════════════════════════════════════════════════

function _b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function _unb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function _fingerprint(rsaPublicJwk) {
  const data = new TextEncoder().encode(rsaPublicJwk.n);
  const hash = new Uint8Array(await subtle.digest('SHA-256', data));
  const hex = [...hash].map(b => b.toString(16).padStart(2,'0')).join('');
  return [0,4,8,12].map(i => hex.slice(i, i+4)).join('·');
}

async function _pwdKey(password) {
  const raw = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const salt = new TextEncoder().encode('fn8salt_v2_web70');
  return subtle.deriveKey(
    { name:'PBKDF2', salt, iterations:200000, hash:'SHA-256' },
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
