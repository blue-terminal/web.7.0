#!/usr/bin/env python3
"""Web 7.0 su PC: avvia il nodo Freenet e offre alle pagine le funzioni di rete dell'app Android."""
import base64
import http.client
import http.server
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
import webbrowser
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAGES = HERE if (HERE / 'index.html').is_file() else HERE.parent
PORT = int(os.environ.get('WEB70_PORT', '7070'))
NODE_PORT = 7509
SITE = re.compile(r'[a-z0-9][a-z0-9-]{0,39}\Z')
FILE = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]{0,80}\Z')
TOPIC = re.compile(r'[A-Za-z0-9:_-]{1,120}\Z')
CONTRACT = re.compile(r'[1-9A-HJ-NP-Za-km-z]{32,50}')
SITE_URL = re.compile(r'/v1/contract/web/([1-9A-HJ-NP-Za-km-z]+)/')
ANSI = re.compile(r'\x1b\[[0-9;]*m')
MAX_SITE_FILE = 50 * 1024 * 1024
MAX_BODY = 4 * 1024 * 1024
MAX_MESSAGE = 16 * 1024
HUB_TIMEOUT = 60
PUBLISH_TIMEOUT = 600
TOKEN = secrets.token_hex(24)
INJECT = ('<script>window.__fnToken=%s;window.Android={net(t,m,a,id){fetch("/__net",{method:"POST",'
          'headers:{"X-Web70-Token":t},body:JSON.stringify({m,a})}).then(r=>r.text())'
          '.then(x=>window.__fnReply&&window.__fnReply(id,x))'
          '.catch(e=>window.__fnReply&&window.__fnReply(id,JSON.stringify({ok:false,error:String(e)})))}};</script>'
          % json.dumps(TOKEN))


def data_dir():
    base = os.environ.get('LOCALAPPDATA') or os.environ.get('XDG_DATA_HOME') or str(Path.home() / '.local/share')
    return Path(base) / 'web70'


def program(name):
    for candidate in (HERE / 'bin' / name, HERE / 'bin' / (name + '.exe')):
        if candidate.is_file():
            return str(candidate)
    found = shutil.which(name)
    if not found:
        sys.exit(f'Programma non trovato: {name}. Installa Freenet oppure usa il pacchetto completo.')
    return found


FDEV = None
HUB = next((p for p in (HERE / 'web70_hub.contract', PAGES / 'web70_hub.contract') if p.is_file()), None)
SITES = data_dir() / 'sites'
topic_ids = {}


def fdev(*args, timeout=HUB_TIMEOUT + 10):
    result = subprocess.run([FDEV, *args], capture_output=True, text=True, timeout=timeout,
                            env=dict(os.environ, MODE='network'))
    return ANSI.sub('', result.stdout + result.stderr)


def last_line(text):
    return text.strip().split('\n')[-1]


def checked(pattern, value, what):
    if not isinstance(value, str) or not pattern.match(value) or '..' in value:
        raise ValueError(what + ' non valido')
    return value


def site_dir(site):
    return SITES / checked(SITE, site, 'Sito')


def site_file(site, name):
    return site_dir(site) / checked(FILE, name, 'File')


def topic_id(topic):
    checked(TOPIC, topic, 'Argomento')
    if topic in topic_ids:
        return topic_ids[topic]
    with tempfile.NamedTemporaryFile(delete=False) as parameters:
        parameters.write(topic.encode())
    try:
        found = CONTRACT.findall(fdev('get-contract-id', '--code', str(HUB), '--parameters', parameters.name))
    finally:
        os.unlink(parameters.name)
    if not found:
        raise OSError('Contratto condiviso non disponibile')
    topic_ids[topic] = found[-1]
    return found[-1]


def hub_get(topic):
    with tempfile.NamedTemporaryFile(delete=False) as state:
        path = state.name
    try:
        output = fdev('execute', 'get', topic_id(topic), '-o', path, '--timeout', str(HUB_TIMEOUT))
        if 'missing contract' in output:
            return '{"m":[]}'
        if 'Error:' in output:
            raise OSError(last_line(output))
        return Path(path).read_text(encoding='utf-8')
    finally:
        os.unlink(path)


def hub_post(topic, message):
    if len(message.encode()) > MAX_MESSAGE:
        raise ValueError('Messaggio troppo grande')
    json.loads(message)
    identifier = topic_id(topic)
    with tempfile.NamedTemporaryFile('w', delete=False, encoding='utf-8') as state:
        state.write('{"m":[' + message + ']}')
    with tempfile.NamedTemporaryFile(delete=False) as parameters:
        parameters.write(topic.encode())
    try:
        output = fdev('execute', 'update', identifier, state.name, '--timeout', str(HUB_TIMEOUT))
        if 'Error:' not in output:
            return
        # Il primo messaggio crea il contratto; un PUT su uno esistente si unisce.
        output = fdev('execute', 'put', '--code', str(HUB), '--parameters', parameters.name, '--subscribe',
                      '--timeout', str(HUB_TIMEOUT), 'contract', '--state', state.name)
        if 'Error:' in output:
            raise OSError(last_line(output))
    finally:
        os.unlink(state.name)
        os.unlink(parameters.name)


def site_publish(site):
    folder = site_dir(site)
    if not (folder / 'index.html').is_file():
        raise OSError('index.html mancante')
    fdev('website', 'init', site)
    for _ in range(3):
        output = fdev('website', 'publish', str(folder), '--key', site, '--timeout', str(PUBLISH_TIMEOUT),
                      timeout=PUBLISH_TIMEOUT + 30)
        # La versione del sito è l'ora in secondi: due pubblicazioni nello stesso secondo non passano.
        if 'must be higher' not in output:
            break
        time.sleep(1.2)
    url = SITE_URL.search(output)
    if 'successfully' in output and url:
        return url.group(1)
    raise OSError(last_line(output))


def handle(method, args):
    if method == 'siteWrite':
        target = site_file(args['site'], args['file'])
        data = base64.b64decode(args['b64'])
        append = bool(args.get('append'))
        if (target.stat().st_size if append and target.exists() else 0) + len(data) > MAX_SITE_FILE:
            raise ValueError('File troppo grande')
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, 'ab' if append else 'wb') as out:
            out.write(data)
        return {}
    if method == 'siteRead':
        target = site_file(args['site'], args['file'])
        return {'text': target.read_text(encoding='utf-8') if target.is_file() else ''}
    if method == 'siteDeleteFile':
        site_file(args['site'], args['file']).unlink(missing_ok=True)
        return {}
    if method == 'siteDelete':
        shutil.rmtree(site_dir(args['site']), ignore_errors=True)
        return {}
    if method == 'sitePublish':
        return {'key': site_publish(args['site'])}
    if method == 'hubGet':
        return {'state': hub_get(args['topic'])}
    if method == 'hubPost':
        hub_post(args['topic'], args['message'])
        return {}
    raise ValueError('Richiesta sconosciuta')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PAGES), **kwargs)

    def log_message(self, *args):
        pass

    def trusted_host(self):
        # Blocca il DNS rebinding: un altro sito non può presentarsi come questo server.
        return self.headers.get('Host') in (f'127.0.0.1:{PORT}', f'localhost:{PORT}')

    def reply(self, code, body, content_type='application/json'):
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        origin = self.headers.get('Origin')
        allowed = (f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}')
        length = int(self.headers.get('Content-Length') or 0)
        if (self.path != '/__net' or not self.trusted_host() or origin not in allowed
                or not secrets.compare_digest(self.headers.get('X-Web70-Token', ''), TOKEN) or length > MAX_BODY):
            self.reply(403, b'{"ok":false,"error":"Ricarica la pagina"}')
            return
        try:
            body = json.loads(self.rfile.read(length))
            out = {'ok': True, **handle(body['m'], json.loads(body['a']))}
        except Exception as error:
            out = {'ok': False, 'error': str(error)}
        self.reply(200, json.dumps(out).encode())

    def do_GET(self):
        if not self.trusted_host():
            self.reply(403, b'Vietato', 'text/plain')
            return
        path = self.path.split('?')[0].split('#')[0]
        if path == '/__node/':
            self.proxy_status()
            return
        if path == '/':
            path = '/index.html'
        name = path.lstrip('/')
        if FILE.match(name) and name.endswith('.html') and (PAGES / name).is_file():
            html = (PAGES / name).read_text(encoding='utf-8').replace('<head>', '<head>' + INJECT, 1)
            self.reply(200, html.encode(), 'text/html; charset=utf-8')
            return
        if FILE.match(name) and name.rsplit('.', 1)[-1] in ('js', 'css') and (PAGES / name).is_file():
            super().do_GET()
            return
        self.reply(404, b'Non trovato', 'text/plain')

    def proxy_status(self):
        # La pagina di stato del nodo non è leggibile da un'altra origine: serve per il contatore dei peer.
        try:
            connection = http.client.HTTPConnection('127.0.0.1', NODE_PORT, timeout=5)
            connection.request('GET', '/')
            response = connection.getresponse()
            self.reply(response.status, response.read(), 'text/html; charset=utf-8')
        except OSError:
            self.reply(502, b'', 'text/plain')


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True


def node_running():
    try:
        connection = http.client.HTTPConnection('127.0.0.1', NODE_PORT, timeout=1)
        connection.request('GET', '/v1/version')
        return connection.getresponse().status == 200
    except OSError:
        return False


def start_node():
    if node_running():
        return None
    data_dir().mkdir(parents=True, exist_ok=True)
    log = open(data_dir() / 'nodo.log', 'ab')
    process = subprocess.Popen([program('freenet'), 'network', '--disable-auto-update'], stdout=log, stderr=log)
    for _ in range(60):
        if node_running() or process.poll() is not None:
            break
        time.sleep(1)
    return process


def main():
    global FDEV
    FDEV = program('fdev')
    if HUB is None:
        sys.exit('File web70_hub.contract non trovato.')
    node = start_node()
    server = Server(('127.0.0.1', PORT), Handler)
    url = f'http://127.0.0.1:{PORT}/index.html'
    print(f'Web 7.0 è aperto su {url} — premi Ctrl+C per chiudere')
    if '--no-browser' not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if node:
            node.terminate()


if __name__ == '__main__':
    main()
