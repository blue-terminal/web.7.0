#!/bin/bash
# pubblica.sh — pubblica Browser Freenet e FreenetTV sulla rete Freenet
# Usa l'infrastruttura freenet.org (freenet-core)
# Richiede: fdev (da freenet-core) installato nel PATH

set -euo pipefail

echo "=== Web 7.0 — Pubblicazione su Freenet ==="
echo ""

# ── Browser Freenet ───────────────────────────────────────────────────────────
echo "[1/4] Inizializzazione chiave Browser Freenet..."
fdev website init browser-fn 2>/dev/null || echo "  (chiave già esistente)"

echo "[2/4] Pubblicazione Browser Freenet..."
fdev website publish browser/ --key browser-fn
echo "  → Accessibile su: http://127.0.0.1:7509/v1/contract/web/<chiave>/"
echo ""

# ── FreenetTV (YouTube personale) ────────────────────────────────────────────
echo "[3/4] Inizializzazione chiave FreenetTV..."
fdev website init fresnettv 2>/dev/null || echo "  (chiave già esistente)"

echo "[4/4] Pubblicazione FreenetTV..."
fdev website publish video/ --key fresnettv
echo "  → Accessibile su: http://127.0.0.1:7509/v1/contract/web/<chiave>/"
echo ""

echo "=== Fatto! ==="
echo "Condividi le chiavi contratto con altri nodi."
echo "Tutti i nodi potranno accedere al tuo YouTube e al browser."
