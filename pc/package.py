#!/usr/bin/env python3
"""Crea il pacchetto di Web 7.0 per il sistema su cui gira: programma autonomo, nodo Freenet e fdev ufficiali, pagine.

Uso: package.py --downloads <cartella con gli archivi ufficiali e SHA256SUMS.txt> --target <es. x86_64-pc-windows-msvc>
                --name <es. windows-x86_64> --version <es. 2.0.0>
"""
import argparse
import hashlib
import http.client
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import time
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'video.html', 'photos.html', 'posts.html', 'chess.html', 'search.html',
         'fn-api.js', 'fn-net.js', 'social.js', 'chess-engine.js', 'web7.css', 'fn-theme.css', 'web70_hub.contract']
TEST_PORT = 7071


def archives_for(downloads, target):
    found = [p for p in downloads.iterdir() if p.name.startswith((f'freenet-{target}.', f'fdev-{target}.'))]
    if len(found) != 2:
        sys.exit(f'Mancano gli archivi di freenet e fdev per {target}')
    return found


def verify(archives, sums):
    expected = {}
    for line in sums.read_text().splitlines():
        digest, _, name = line.strip().partition('  ')
        expected[name] = digest
    for archive in archives:
        if expected.get(archive.name) != hashlib.sha256(archive.read_bytes()).hexdigest():
            sys.exit(f'Somma di controllo sbagliata: {archive.name}')


def extract(archive, into):
    if archive.name.endswith('.zip'):
        with zipfile.ZipFile(archive) as z:
            z.extractall(into)
    else:
        with tarfile.open(archive) as t:
            t.extractall(into, filter='data')


def find_program(folder, name):
    for path in folder.rglob('*'):
        if path.is_file() and path.name in (name, name + '.exe'):
            return path
    sys.exit(f'{name} non trovato in {folder}')


def build(work, downloads, target):
    archives = archives_for(downloads, target)
    verify(archives, downloads / 'SHA256SUMS.txt')
    unpacked = work / 'unpacked'
    for archive in archives:
        extract(archive, unpacked)
    subprocess.run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--onedir', '--console', '--name', 'web70',
                    '--distpath', str(work / 'dist'), '--workpath', str(work / 'build'), '--specpath', str(work),
                    str(ROOT / 'pc' / 'web70.py')], check=True)
    app = work / 'dist' / 'web70'
    for page in PAGES:
        shutil.copy2(ROOT / page, app / page)
    shutil.copy2(ROOT / 'pc' / 'LEGGIMI.txt', app / 'LEGGIMI.txt')
    (app / 'bin').mkdir()
    for name in ('freenet', 'fdev'):
        source = find_program(unpacked, name)
        target_file = app / 'bin' / source.name
        shutil.copy2(source, target_file)
        target_file.chmod(target_file.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return app


# Prima di pubblicarlo il pacchetto deve partire: programmi del nodo eseguibili e pagine servite col token.
def smoke_test(app):
    for name in ('freenet', 'fdev'):
        result = subprocess.run([str(find_program(app / 'bin', name)), '--version'], capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            sys.exit(f'{name} non parte: {result.stderr[-500:]}')
        print(name, result.stdout.strip().splitlines()[0] if result.stdout.strip() else '')
    exe = app / ('web70.exe' if os.name == 'nt' else 'web70')
    process = subprocess.Popen([str(exe), '--no-browser', '--no-node'], env=dict(os.environ, WEB70_PORT=str(TEST_PORT)))
    try:
        for _ in range(60):
            try:
                connection = http.client.HTTPConnection('127.0.0.1', TEST_PORT, timeout=3)
                connection.request('GET', '/index.html')
                body = connection.getresponse().read().decode('utf-8', 'replace')
                if '__fnToken' in body and 'Web 7.0' in body:
                    print('web70 risponde con le pagine')
                    return
            except OSError:
                pass
            time.sleep(1)
        sys.exit('Il programma web70 non risponde')
    finally:
        process.terminate()
        process.wait(timeout=30)


def archive(app, name, version):
    out = ROOT / 'dist'
    out.mkdir(exist_ok=True)
    base = out / f'web70-{version}-{name}'
    if name.startswith('windows'):
        return shutil.make_archive(str(base), 'zip', app.parent, app.name)
    # tar.gz conserva i permessi di esecuzione su Linux e Mac.
    return shutil.make_archive(str(base), 'gztar', app.parent, app.name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--downloads', required=True, type=Path)
    parser.add_argument('--target', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    work = ROOT / 'build-pc'
    shutil.rmtree(work, ignore_errors=True)
    app = build(work, args.downloads.resolve(), args.target)
    smoke_test(app)
    print('Pacchetto:', archive(app, args.name, args.version))


if __name__ == '__main__':
    main()
