# ╔══════════════════════════════════════════════════════════════════╗
# ║          Web 7.0 — Installazione Windows (PowerShell)           ║
# ║   github.com/blue-terminal/web70-core                           ║
# ╚══════════════════════════════════════════════════════════════════╝
# Installa: Rust, freenet-core, fdev, avvia il nodo, pubblica le app
#
# USO (PowerShell come Amministratore):
#   iwr -useb https://raw.githubusercontent.com/blue-terminal/web70-core/main/install.ps1 | iex
#   oppure:
#   .\install.ps1

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function info($msg) { Write-Host "[Web 7.0] $msg" -ForegroundColor Cyan }
function ok($msg)   { Write-Host "[  OK  ] $msg" -ForegroundColor Green }
function warn($msg) { Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║        Web 7.0 — Installazione          ║" -ForegroundColor White
Write-Host "║  Browser · FreenetTV · FreenetGram       ║" -ForegroundColor White
Write-Host "║  FreenetPosts · River · Mail · Atlas     ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor White
Write-Host ""

$REPO_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$WEB70_DIR = Join-Path $REPO_DIR "web70"
$CARGO_HOME = "$env:USERPROFILE\.cargo"
$RUSTUP_HOME = "$env:USERPROFILE\.rustup"

# ── 1. Installa Rust se mancante ──────────────────────────────────
info "Verifica Rust..."
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    info "Rust non trovato — download rustup-init.exe..."
    $rustupUrl = "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe"
    $rustupExe = "$env:TEMP\rustup-init.exe"
    Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupExe
    info "Installazione Rust (stabile)..."
    & $rustupExe -y --default-toolchain stable --profile minimal 2>&1
    Remove-Item $rustupExe -Force
    $env:PATH = "$CARGO_HOME\bin;$env:PATH"
    ok "Rust installato: $(cargo --version)"
} else {
    ok "Rust già presente: $(cargo --version)"
    $env:PATH = "$CARGO_HOME\bin;$env:PATH"
}

# ── 2. Installa Visual C++ Build Tools se mancanti ────────────────
info "Verifica Visual C++ Build Tools..."
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vsWhere)) {
    warn "Visual C++ Build Tools non trovati."
    warn "Scarica da: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    warn "Installa 'Desktop development with C++' poi riesegui questo script."
    $cont = Read-Host "Continuare comunque? (s/N)"
    if ($cont -notmatch "^[sSyY]") { exit 1 }
}

# ── 3. Clona repo se non siamo già dentro ─────────────────────────
if (-not (Test-Path (Join-Path $REPO_DIR "Cargo.toml"))) {
    info "Clono web70-core..."
    $installDir = "$env:USERPROFILE\web70-core"
    git clone "https://github.com/blue-terminal/web70-core.git" $installDir
    $REPO_DIR = $installDir
    $WEB70_DIR = Join-Path $REPO_DIR "web70"
    Set-Location $REPO_DIR
}

# ── 4. Compila freenet ────────────────────────────────────────────
info "Compilazione freenet-core (5–15 minuti la prima volta)..."
Set-Location $REPO_DIR
cargo build --release --bin freenet
ok "freenet compilato: $REPO_DIR\target\release\freenet.exe"

# ── 5. Compila fdev ───────────────────────────────────────────────
info "Compilazione fdev..."
cargo build --release --bin fdev
$fdevDest = "$CARGO_HOME\bin\fdev.exe"
Copy-Item "$REPO_DIR\target\release\fdev.exe" $fdevDest -Force
ok "fdev installato: $fdevDest"

# ── 6. Avvia nodo Freenet in background ───────────────────────────
info "Avvio nodo Freenet su http://127.0.0.1:7509 ..."
$freenetExe = "$REPO_DIR\target\release\freenet.exe"
$freenetLog = "$env:USERPROFILE\.freenet\freenet.log"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.freenet" | Out-Null
$proc = Start-Process -FilePath $freenetExe -ArgumentList "network" `
    -RedirectStandardError $freenetLog -PassThru -WindowStyle Hidden
$proc.Id | Out-File "$env:USERPROFILE\.freenet\freenet.pid"

# attendi nodo
info "Attendo che il nodo sia pronto..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 2
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:7509/v1/version" -UseBasicParsing -TimeoutSec 2
        ok "Nodo online: $($r.Content)"
        $ready = $true; break
    } catch {}
}
if (-not $ready) { warn "Nodo non ancora pronto — controlla $freenetLog" }

# ── 7. Pubblica app Web 7.0 ───────────────────────────────────────
info "Pubblicazione app Web 7.0..."
Set-Location $WEB70_DIR
bash pubblica.sh   # richiede Git Bash / WSL
ok "Tutte le app pubblicate!"

# ── 8. Collegamento Desktop ───────────────────────────────────────
$desktopShortcut = [System.IO.Path]::Combine([Environment]::GetFolderPath("Desktop"), "Web 7.0.url")
@"
[InternetShortcut]
URL=http://127.0.0.1:7509/v1/contract/web/browser-fn/
IconFile=%SystemRoot%\system32\shell32.dll
IconIndex=14
"@ | Out-File -FilePath $desktopShortcut -Encoding ASCII
ok "Collegamento desktop creato: $desktopShortcut"

# ── 9. Aggiungi PATH permanente ───────────────────────────────────
$userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$CARGO_HOME\bin*") {
    [System.Environment]::SetEnvironmentVariable("PATH", "$CARGO_HOME\bin;$userPath", "User")
    ok "PATH aggiornato (riavvia il terminale)"
}

# ── RIEPILOGO ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      Installazione completata! ✓         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Nodo Freenet:  http://127.0.0.1:7509" -ForegroundColor White
Write-Host "  Browser:       http://127.0.0.1:7509/v1/contract/web/browser-fn/" -ForegroundColor Cyan
Write-Host "  FreenetTV:     http://127.0.0.1:7509/v1/contract/web/fresnettv/" -ForegroundColor Cyan
Write-Host "  FreenetGram:   http://127.0.0.1:7509/v1/contract/web/frenetgram/" -ForegroundColor Cyan
Write-Host "  FreenetPosts:  http://127.0.0.1:7509/v1/contract/web/freenetposts/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Log nodo:      $env:USERPROFILE\.freenet\freenet.log" -ForegroundColor Gray
Write-Host "  Sorgente:      https://github.com/blue-terminal/web70-core" -ForegroundColor Gray
Write-Host ""

# Apri browser
Start-Process "http://127.0.0.1:7509/v1/contract/web/browser-fn/"
