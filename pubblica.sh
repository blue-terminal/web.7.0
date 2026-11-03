#!/bin/bash
# pubblica.sh — Web 7.0: Browser + App Sociali su Freenet
# Basato su github.com/freenet/freenet-core (fdev website init/publish)
# Richiede: fdev nel PATH (cargo install --path crates/fdev)

set -euo pipefail

echo "=== Web 7.0 — Pubblicazione su Freenet ==="
echo "    github.com/freenet/freenet-core"
echo ""

pub() {
  local name="$1" dir="$2"
  echo "→ Inizializzazione chiave: $name"
  fdev website init "$name" 2>/dev/null || echo "  (chiave già esistente)"
  echo "→ Pubblicazione: $dir"
  fdev website publish "$dir" --key "$name"
  echo "  ✓ http://127.0.0.1:7509/v1/contract/web/<chiave>/"
  echo ""
}

pub "browser-fn"      "browser/"
pub "fresnettv"       "video/"
pub "frenetgram"      "photos/"   2>/dev/null || pub "frenetgram" "."
pub "freenetposts"    "posts/"    2>/dev/null || pub "freenetposts" "."

echo "=== Fatto! ==="
echo "Condividi le chiavi contratto con altri nodi."
echo "Tutti possono accedere a:"
echo "  http://127.0.0.1:7509/v1/contract/web/<chiave>/"
echo ""
echo "WebSocket API (per app avanzate):"
echo "  ws://127.0.0.1:7509/v1/contract/command?encodingProtocol=native"
