# Web 7.0 — Social Decentralizzato su Freenet
## Decentralized Social on Freenet

**IT:** Rete sociale completamente decentralizzata basata su [Freenet](https://freenet.org) (peer-to-peer). Nessun server centrale, nessuna email, nessun tracciamento. Solo nome utente e password.

**EN:** Fully decentralized social network built on [Freenet](https://freenet.org) (peer-to-peer). No central server, no email, no tracking. Username and password only.

---

## Screenshot

<table>
<tr>
<td align="center"><img src="screenshots/browser.jpg" width="320"/><br><b>Browser Freenet</b></td>
<td align="center"><img src="screenshots/fresnettv.jpg" width="320"/><br><b>FreenetTV</b></td>
</tr>
<tr>
<td align="center"><img src="screenshots/fresnettv_player.jpg" width="320"/><br><b>FreenetTV — Player + Iscrivi</b></td>
<td align="center"><img src="screenshots/freenetposts.jpg" width="320"/><br><b>FreenetPosts</b></td>
</tr>
<tr>
<td align="center" colspan="2"><img src="screenshots/freenetgram.jpg" width="320"/><br><b>FreenetGram</b></td>
</tr>
</table>

---

## App / Apps

Tutte le pagine sono scritte a mano solo per Web 7.0 e girano sulla rete Freenet, senza server centrali.

| App | Cosa fa |
|-----|---------|
| 📺 **FreenetTV** | Video educativi: canali, commenti, voti, Studio, impostazioni, diretta |
| 📷 **FreenetGram** | Foto e storie con commenti e profili |
| 📝 **FreenetPosts** | Post brevi con risposte e rilanci |
| ♞ **Scacchi** | Contro il computer o persone della rete |
| 🔍 **Cerca** | Motore di ricerca sui contenuti di Web 7.0 e sui siti aggiunti all'indice |

**Come funziona:** video e foto stanno in contratti Freenet (massimo 50 MiB ciascuno, i video lunghi sono divisi in parti). Commenti, voti, elenchi e partite stanno in `web70_hub.contract`, una bacheca condivisa dove ogni messaggio è firmato e richiede un piccolo calcolo contro lo spam.

**Limiti:** sul telefono il collegamento fra pagina e nodo resta HTTP locale su `127.0.0.1`, i nodi comunicano fra loro con il protocollo Freenet su UDP, e all'avvio la lista dei gateway si scarica da `freenet.org`.

---

## Installazione / Installation

### Linux (un click / one click)
```bash
curl -sSL https://raw.githubusercontent.com/blue-terminal/web70-core/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/blue-terminal/web70-core/main/install.ps1 | iex
```

### Debian / Ubuntu
```bash
sudo dpkg -i web70_2.0.0_amd64.deb
web70
```

### Android
Scarica l'APK da / Download APK from:
[github.com/blue-terminal/freenet-android/releases/latest](https://github.com/blue-terminal/freenet-android/releases/latest)

---

## Protocollo Freenet / Freenet Protocol

| Endpoint | IT | EN |
|----------|----|----|
| `GET /v1/version` | Versione nodo | Node version |
| `GET /v1/contract/web/{key}/` | Serve l'app web | Serves the web app |
| `WS /v1/contract/command?encodingProtocol=native` | WebSocket contratti | Contract WebSocket |

Nodo locale / Local node: `http://127.0.0.1:7509`

---

## Ecosistema Freenet / Freenet Ecosystem

Basato sull'ecosistema reale di [github.com/freenet](https://github.com/freenet).  
Built on the real ecosystem at [github.com/freenet](https://github.com/freenet).

| Chiave contratto / Contract Key | App |
|--------------------------------|-----|
| `771DvtPMwt2PumPyrFvsz7fpvU1gogcmb5qtS1yYEEH9` | Atlas (search) |
| `raAqMhMG7KUpXBU2SxgCQ3Vh4PYjttxdSWd9ftV7RLv` | River Chat |
| `122f6AR7PyF8d8mhczuNQM4xrLtBf5t8g2iB7PEVT7KC` | Freenet Mail |
| `EqJ5YpEEV3XLqEvKWLQHFhGAac2qXzSUoE6k2zbdnXBr` | Delta (site builder) |

---

## Repository / Repositories

| Repo | Descrizione / Description |
|------|---------------------------|
| [blue-terminal/web.7.0](https://github.com/blue-terminal/web.7.0) | App Web 7.0 (questo repo / this repo) |
| [blue-terminal/web70-core](https://github.com/blue-terminal/web70-core) | Fork freenet-core + Web 7.0 integrato |
| [blue-terminal/freenet-android](https://github.com/blue-terminal/freenet-android) | App Android con pulsante Web 7.0 |

---

## Licenza / License

**MIT License** © 2026 blue-terminal

Libero per tutti / Free for everyone — open source, nessun tracciamento, nessuna email.  
No tracking, no email, no central server. Peer-to-peer only.


## ⚠️ Avviso / Disclaimer

**Italiano** — Questo progetto è realizzato esclusivamente a scopo educativo e di studio. Il software è fornito "così com'è", senza garanzie di alcun tipo. L'autore non si assume alcuna responsabilità per l'uso che ne viene fatto, né per i contenuti pubblicati dagli utenti sulla rete, né per eventuali danni diretti o indiretti. Chi lo usa se ne assume la piena responsabilità e deve rispettare le leggi del proprio paese.

**English** — This project is made for educational and study purposes only. The software is provided "as is", without warranty of any kind. The author takes no responsibility for how it is used, for content published by users on the network, or for any direct or indirect damage. Anyone who uses it does so at their own risk and must follow the laws of their own country.
