#!/bin/bash
# Pubblica le pagine di Web 7.0 come sito sulla rete Freenet. Serve il nodo acceso e fdev nel PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SITE="$(mktemp -d)"
trap 'rm -rf "$SITE"' EXIT

cp "$ROOT"/{index,video,photos,posts,chess,search}.html "$ROOT"/{fn-api,fn-ws,fn-net,social,chess-engine}.js "$ROOT"/{fn-theme,web7}.css "$ROOT"/web70_hub.contract "$ROOT"/web70_client.wasm "$SITE/"
fdev website init web70 2>/dev/null || true
fdev website publish "$SITE" --key web70
