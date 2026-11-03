# web.7.0 — Browser e YouTube su Freenet

Browser e app video per la rete [Freenet](https://freenet.org) (infrastruttura freenet.org).  
Due app pubblicate come contratti web, accessibili da **tutti i nodi** della rete.

## Struttura

```
web70/
├── browser/                ← App 1: Browser Freenet
│   ├── index.html          ← browser con iframe sul nodo locale
│   ├── fn-api.js           ← API Freenet (compatibilità nuovo + vecchio)
│   ├── fn-theme.css        ← stili comuni
│   └── freenet.toml        ← config pubblicazione
│
├── video/                  ← App 2: FreenetTV (YouTube personale)
│   ├── index.html          ← griglia video, player, like, commenti
│   ├── fn-api.js
│   ├── fn-theme.css
│   └── freenet.toml        ← config pubblicazione
│
├── shared/                 ← Librerie condivise
│   ├── fn-api.js
│   └── fn-theme.css
│
├── fn-api.js               ← API Freenet (compatibilità nuovo Rust + vecchio Fred/Java)
├── fn-theme.css            ← CSS comuni
├── index.html              ← browser (versione radice)
├── video.html              ← FreenetTV (versione radice)
└── pubblica.sh             ← pubblica entrambe le app su Freenet
```

## Pubblicare su Freenet

Richiede [`fdev`](https://github.com/freenet/freenet-core):

```bash
./pubblica.sh
```

Oppure manualmente:

```bash
# Browser Freenet
fdev website init browser-fn
fdev website publish browser/ --key browser-fn

# FreenetTV (YouTube personale)
fdev website init fresnettv
fdev website publish video/ --key fresnettv
```

Freenet ti dà una chiave contratto → tutti i nodi la aprono su:
`http://127.0.0.1:7509/v1/contract/web/<chiave>/`

## Compatibilità nodi

| Versione | Porta | URL |
|---|---|---|
| Nuovo Freenet (Rust, freenet.org) | 7509 | `/v1/contract/web/<chiave>/` |
| Vecchio Fred/Hyphanet (Java) | 8888 | `/USK@<chiave>/0/` |

`fn-api.js` rileva automaticamente quale nodo è attivo.

---

🌐 Web 7.0 — Decentralized Infrastructure Project

FreeWeb 7.0 è un'iniziativa guidata dalla ricerca che esplora un'infrastruttura web decentralizzata di nuova generazione basata sull'architettura peer-to-peer di Freenet (successore di Hyphanet).

Il progetto si concentra sulla decentralizzazione a livello infrastrutturale più che sulle tendenze a livello applicativo, con l'obiettivo di affrontare le debolezze strutturali del web moderno.

🎯 Visione

Il Web 7.0 è progettato per arrivare a quattro principi fondamentali:

🛡️ Sovranità dei dati — Gli utenti mantengono il controllo sui propri dati.

🏗️ Resilienza infrastrutturale — Eliminazione dei singoli punti di guasto.

🔐 Privacy nativa — Crittografia end-to-end e anonimo predefiniti.

🌍 Indipendenza tecnologica — Riduzione della dipendenza dalle piattaforme centralizzate.

🏛️ Architettura di base

Il Web 7.0 è strutturato in livelli concettuali:

🧱 Livello 1 — Infrastruttura di rete

Basato sull'architettura dei nodi distribuiti basata su Hyphanet.

🔑 Livello 2 — Identità e autenticazione (fase di ricerca)

Esplorazione di modelli di identità decentralizzati e meccanismi di fiducia distribuita.

🌐 Livello 3 — Livello di interfaccia dell'applicazione

Servizi accessibili dal Web che operano su infrastrutture resistenti alla censura.

🔍 Modello di minaccia

Il Web 7.0 è progettato per mitigare:

Censura centralizzata

Tentativi di arresto dell'infrastruttura

Architettura di sorveglia di massa

Ecosistemi di monetizzazione basati sul monitoraggio

🛠️ Obiettivi tecnici (2026)

📡 Espandi e ottimizza la distribuzione del nodo Hyphanet

📜 Bozza di specifiche del protocollo di identità decentrato

📖 Pubblicare documentazione tecnica e documenti di architettura

🧪 Sviluppo prototipi di infrastrutture sperimentali

📊 Stato del progetto

Il Web 7.0 è effettivamente in fase di ricerca e produzione architettonica.
Initial documentation and experimental specifications will be published progressively.

🤝 How to Contribute

Developers, researchers, and privacy advocates are welcome.

Fork the repository

Open Issues for architectural discussions

Submit Pull Requests for documentation or prototype contributions

Coding standards and contribution guidelines will be defined in upcoming updates.

🗺️ Roadmap (Draft)

Q1 — Research documentation
Q2 — Node configuration and infrastructure guidelines
Q3 — Identity protocol draft
Q4 — First experimental deployment

📢 Community

Repository: GitHub — blue-terminal/web.7.0

Updates: @the-new-web.bsky.socia
