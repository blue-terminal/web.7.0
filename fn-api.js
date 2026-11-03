/**
 * fn-api.js — Freenet Web 7.0
 * Compatibilità con:
 *   - Nuovo Freenet (freenet-core, Rust)  → http://127.0.0.1:7509  /v1/contract/web/<key>/
 *   - Vecchio Freenet (Fred/Hyphanet, Java) → http://127.0.0.1:8888  /USK@…/  /CHK@…/
 */

'use strict';

const FN = (() => {

  // ── Configurazione nodi ───────────────────────────────────────────────────
  const NODES = [
    { name: 'Freenet (nuovo, Rust)',  base: 'http://127.0.0.1:7509', type: 'new'  },
    { name: 'Fred/Hyphanet (Java)',   base: 'http://127.0.0.1:8888', type: 'old'  },
    { name: 'Fred/Hyphanet alt',      base: 'http://127.0.0.1:8080', type: 'old'  },
  ];

  let activeNode = null;

  // Chiavi reali app Freenet (nuovo, da freenet-core/home.html)
  const FN_APPS = {
    atlas:     '771DvtPMwt2PumPyrFvsz7fpvU1gogcmb5qtS1yYEEH9',
    river:     'raAqMhMG7KUpXBU2SxgCQ3Vh4PYjttxdSWd9ftV7RLv',
    mail:      '122f6AR7PyF8d8mhczuNQM4xrLtBf5t8g2iB7PEVT7KC',
    delta:     'EqJ5YpEEV3XLqEvKWLQHFhGAac2qXzSUoE6k2zbdnXBr',
    ghostkey:  'DLog47hEsrtuGT4N5XCeMBG45m4n1aWM89tBZXue2E1N',
    freenetorg:'E4m5WbaC4cdbpDjL82WfYUnrM9iMnfaaN8Tsn7UHPMjZ',
  };

  // URL per tipo nodo
  function contractUrl(node, key) {
    if (node.type === 'new') return node.base + '/v1/contract/web/' + key + '/';
    return node.base + '/USK@' + key + ',AAAA,AQACAAE,AAACAAA/0/';
  }
  function homeUrl(node) {
    return node.type === 'new' ? node.base + '/' : node.base + '/';
  }

  // ── Stato nodo ────────────────────────────────────────────────────────────
  async function detectNode() {
    for (const node of NODES) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        await fetch(homeUrl(node), { method: 'HEAD', signal: ctrl.signal, mode: 'no-cors' });
        clearTimeout(t);
        activeNode = node;
        return node;
      } catch { /* prova il prossimo */ }
    }
    activeNode = null;
    return null;
  }

  function getActiveNode() { return activeNode; }

  // ── Risoluzione URL freenet:// ────────────────────────────────────────────
  function resolveUrl(fnUrl) {
    const node = activeNode || NODES[0];
    if (!fnUrl || fnUrl === 'freenet://home') return null;
    if (fnUrl === 'freenet://video') return 'video.html';

    const ROUTE_MAP = {
      'freenet://atlas':    FN_APPS.atlas,
      'freenet://river':    FN_APPS.river,
      'freenet://mail':     FN_APPS.mail,
      'freenet://editor':   FN_APPS.delta,
      'freenet://ghostkey': FN_APPS.ghostkey,
      'freenet://freenetorg': FN_APPS.freenetorg,
      'freenet://impostazioni': node.base + '/config/',
    };
    const key = ROUTE_MAP[fnUrl];
    if (key) return typeof key === 'string' && key.startsWith('http') ? key : contractUrl(node, key);

    // URL raw: http(s):// o /v1/contract o /USK@
    if (fnUrl.startsWith('http')) return fnUrl;

    // Formato vecchio: USK@..., CHK@..., SSK@...
    if (/^(USK|CHK|SSK)@/.test(fnUrl)) return node.base + '/' + fnUrl;

    return node.base + '/v1/contract/web/' + fnUrl.replace('freenet://', '') + '/';
  }

  // ── Archivio siti visitati ────────────────────────────────────────────────
  function getSiteArchive()  { try { return JSON.parse(localStorage.getItem('fn_site_archive')||'[]'); } catch { return []; } }
  function saveSiteArchive(a){ try { localStorage.setItem('fn_site_archive', JSON.stringify(a.slice(-500))); } catch {} }
  function recordVisit(url, title) {
    if (!url || url === 'freenet://home') return;
    const a = getSiteArchive();
    if (a.length && a[a.length-1].url === url) return;
    a.push({ url, title: title||url, time: new Date().toISOString() });
    saveSiteArchive(a);
  }

  // ── Archivio video caricati ───────────────────────────────────────────────
  function getVideoArchive()  { try { return JSON.parse(localStorage.getItem('fn_my_videos')||'[]'); } catch { return []; } }
  function saveVideoArchive(v){ try { localStorage.setItem('fn_my_videos', JSON.stringify(v)); } catch {} }
  function addVideo(video)    { const v=getVideoArchive(); v.push(video); saveVideoArchive(v); return v; }

  // ── Dati video (like / commenti) ──────────────────────────────────────────
  function getVD(id) {
    try {
      const d = JSON.parse(localStorage.getItem('fn_vd')||'{}');
      if (!d[id]) d[id] = { likes:0, liked:false, disliked:false, cmts:[] };
      return d[id];
    } catch { return { likes:0, liked:false, disliked:false, cmts:[] }; }
  }
  function saveVD(id, vd) {
    try { const d=JSON.parse(localStorage.getItem('fn_vd')||'{}'); d[id]=vd; localStorage.setItem('fn_vd',JSON.stringify(d)); } catch {}
  }

  // ── Account locali ────────────────────────────────────────────────────────
  function getAccounts() { try { return JSON.parse(localStorage.getItem('fn_acc')||'{}'); } catch { return {}; } }
  function saveAccounts(a){ try { localStorage.setItem('fn_acc', JSON.stringify(a)); } catch {} }
  function getCurrentUser()  { try { return localStorage.getItem('fn_user')||null; } catch { return null; } }
  function setCurrentUser(u) { try { localStorage.setItem('fn_user', u||''); } catch {} }

  function login(name, pass) {
    const acc = getAccounts();
    if (!name || !acc[name]) return 'not_found';
    if (acc[name] !== btoa(pass))  return 'wrong_pass';
    setCurrentUser(name);
    return 'ok';
  }
  function register(name, pass, pass2) {
    if (!name) return 'name_empty';
    const acc = getAccounts();
    if (acc[name]) return 'name_taken';
    if (pass.length < 6) return 'pass_short';
    if (pass !== pass2)  return 'pass_mismatch';
    acc[name] = btoa(pass);
    saveAccounts(acc);
    setCurrentUser(name);
    return 'ok';
  }
  function logout() { setCurrentUser(null); }

  // ── Chiave contratto (per pubblicare il proprio YouTube) ──────────────────
  function makeContractPreview(username) {
    const seed = [...username].reduce((a,c)=>a^c.charCodeAt(0),0x1337);
    const pseudo = btoa(username+seed+'fresnettv').replace(/[=+/]/g,'').substring(0,44).padEnd(44,'A');
    const node = activeNode || NODES[0];
    return node.base + '/v1/contract/web/' + pseudo + '/';
  }

  // ── Pubblica su Freenet (istruzione) ─────────────────────────────────────
  function publishGuide(username) {
    const name = username.toLowerCase().replace(/[^a-z0-9-]/g,'-');
    return [
      '# Pubblica il tuo YouTube su Freenet',
      '',
      '## Passo 1 — genera la chiave di firma',
      '  fdev website init ' + name + '-tv',
      '',
      '## Passo 2 — copia i file',
      '  mkdir ~/my-fresnettv',
      '  cp video.html ~/my-fresnettv/index.html',
      '  cp fn-theme.css fn-api.js ~/my-fresnettv/',
      '',
      '## Passo 3 — pubblica',
      '  fdev website publish ~/my-fresnettv --key ' + name + '-tv',
      '',
      '## Passo 4 — condividi',
      '  Freenet ti darà una chiave contratto.',
      '  Tutti i nodi accedono a:',
      '  http://127.0.0.1:7509/v1/contract/web/<chiave>/',
      '',
      '## Nota sul vecchio Fred/Hyphanet (Java)',
      '  Usa: fdev freesite publish ~/my-fresnettv',
      '  Accesso: http://127.0.0.1:8888/USK@<chiave>/0/',
    ].join('\n');
  }

  return {
    NODES, FN_APPS,
    detectNode, getActiveNode, resolveUrl,
    getSiteArchive, recordVisit,
    getVideoArchive, saveVideoArchive, addVideo,
    getVD, saveVD,
    getAccounts, getCurrentUser, setCurrentUser,
    login, register, logout,
    makeContractPreview, publishGuide,
  };
})();
