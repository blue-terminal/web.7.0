#!/bin/bash
# Crea il pacchetto Debian/Ubuntu di Web 7.0 per PC.
# Uso: pc/build-deb.sh <cartella con libfreenet.so e libfdev.so x86_64> <file web70_hub.contract> <versione>
set -euo pipefail

LIBS="$1"; HUB="$2"; VERSION="$3"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"
PKG="$(mktemp -d)"
trap 'rm -rf "$PKG"' EXIT

mkdir -p "$PKG/DEBIAN" "$PKG/opt/web70/bin" "$PKG/usr/bin" "$PKG/usr/share/applications" "$OUT"
cp "$ROOT"/{index,video,photos,posts,chess,search}.html "$ROOT"/{fn-api,fn-net,social,chess-engine}.js "$ROOT"/{fn-theme,web7}.css "$PKG/opt/web70/"
install -m 755 "$ROOT/pc/web70.py" "$PKG/opt/web70/web70.py"
install -m 755 "$LIBS/libfreenet.so" "$PKG/opt/web70/bin/freenet"
install -m 755 "$LIBS/libfdev.so" "$PKG/opt/web70/bin/fdev"
install -m 644 "$HUB" "$PKG/opt/web70/web70_hub.contract"

cat > "$PKG/usr/bin/web70" <<'EOF'
#!/bin/sh
exec python3 /opt/web70/web70.py "$@"
EOF
chmod 755 "$PKG/usr/bin/web70"

cat > "$PKG/usr/share/applications/web70.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Web 7.0
Comment=Video, foto, post e scacchi sulla rete Freenet
Exec=web70
Terminal=false
Categories=Network;
EOF

cat > "$PKG/DEBIAN/control" <<EOF
Package: web70
Version: $VERSION
Architecture: amd64
Maintainer: blue-terminal
Depends: python3 (>= 3.8)
Section: net
Priority: optional
Description: Web 7.0 sulla rete Freenet
 Video, foto, post, scacchi e ricerca peer to peer, senza server centrali.
EOF

dpkg-deb --root-owner-group -Zxz --build "$PKG" "$OUT/web70_${VERSION}_amd64.deb"
