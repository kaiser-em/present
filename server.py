#!/usr/bin/env python3
"""Present — serveur local : sert l'app ET gère db.json (base de données JSON à la racine).

Usage :  python3 server.py [--port 8765] [--host 127.0.0.1] [--token SECRET] [--db db.json]

API (même origine que l'app) :
  GET /api/db     -> {"exists": bool, "etag": str, "db": {...}|null}
  GET /api/etag   -> {"etag": str}                 (léger, utilisé pour détecter une modif externe)
  PUT /api/db     -> corps {"data": {...}}, en-tête If-Match: <etag connu> ("none" si le fichier n'existe pas)
                     200 {"etag","rev","updatedAt"} | 409 si db.json a changé entre-temps
Coach IA : /api/coach/* (voir coach.py) — chat, sermons audio (edge-tts), planificateur autonome, Web Push.
Sécurité : écoute en loopback par défaut, contrôle Origin/Host, jeton optionnel (--token),
écriture atomique + sauvegardes tournantes dans backups/. Aucune dépendance (stdlib).
"""
import argparse, glob, hashlib, json, os, shutil, tempfile, threading, time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import re

import coach

ROOT = os.path.dirname(os.path.abspath(__file__))
MAX_BYTES = 8 * 1024 * 1024
BACKUP_EVERY = 300      # secondes entre deux sauvegardes
BACKUP_KEEP = 30
LOOPBACK = {"localhost", "127.0.0.1", "::1"}
LOCK = threading.Lock()
CFG = {}


class DbError(Exception):
    pass


def read_db():
    """-> (objet|None, etag). etag == 'none' si le fichier est absent ou vide."""
    try:
        with open(CFG["db"], "rb") as f:
            raw = f.read()
    except FileNotFoundError:
        return None, "none"
    if not raw.strip():
        return None, "none"
    etag = hashlib.sha1(raw).hexdigest()[:16]
    try:
        return json.loads(raw.decode("utf-8")), etag
    except ValueError:
        raise DbError("db.json n'est pas un JSON valide (corrige-le ou renomme-le)")


def backup():
    db = CFG["db"]
    if not os.path.exists(db):
        return
    folder = os.path.join(os.path.dirname(db), "backups")
    os.makedirs(folder, exist_ok=True)
    files = sorted(glob.glob(os.path.join(folder, "db-*.json")))
    if files and time.time() - os.path.getmtime(files[-1]) < BACKUP_EVERY:
        return
    shutil.copy2(db, os.path.join(folder, "db-%s.json" % datetime.now().strftime("%Y%m%d-%H%M%S")))
    for old in files[: max(0, len(files) + 1 - BACKUP_KEEP)]:
        try:
            os.remove(old)
        except OSError:
            pass


def write_db(data, old):
    obj = dict(data)
    obj["rev"] = int((old or {}).get("rev", 0)) + 1
    obj["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    backup()
    folder = os.path.dirname(CFG["db"])
    fd, tmp = tempfile.mkstemp(dir=folder, prefix=".db-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, CFG["db"])  # atomique : jamais de fichier à moitié écrit
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise
    return read_db()[1], obj


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/") or (args and str(args[1]).startswith(("4", "5"))):
            super().log_message(fmt, *args)

    def send_header(self, k, v):
        if k.lower() == "cache-control":
            self._cc = True
        super().send_header(k, v)

    def end_headers(self):
        if not getattr(self, "_cc", False):
            self.send_header("Cache-Control", "no-store" if self.path.startswith("/api/") else "no-cache")
        self._cc = False
        super().end_headers()

    # ---------- helpers ----------
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _guard(self):
        h = self.headers.get("Host") or ""
        host = h[1:h.index("]")] if h.startswith("[") and "]" in h else h.rsplit(":", 1)[0]
        if CFG["host"] in LOOPBACK and host not in LOOPBACK:
            self._json(403, {"error": "host refusé"}); return False
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc != self.headers.get("Host"):
            self._json(403, {"error": "origine refusée"}); return False
        if CFG["token"]:
            sent = self.headers.get("X-Token") or ""
            if not sent and urlparse(self.path).path.startswith("/api/coach/audio/"):
                sent = (parse_qs(urlparse(self.path).query).get("token") or [""])[0]
            if not sent or not hashlib.sha256(sent.encode()).digest() == hashlib.sha256(CFG["token"].encode()).digest():
                self._json(401, {"error": "jeton requis"}); return False
        return True

    def _blocked_static(self):
        p = urlparse(self.path).path
        names = ("/server.py", "/coach.py", "/data", "/backups", "/requirements.txt")
        return p.startswith(names) or (CFG["token"] and p.lstrip("/") == os.path.basename(CFG["db"]))

    # ---------- méthodes ----------
    def do_GET(self):
        p = urlparse(self.path).path
        if p.startswith("/api/"):
            if not self._guard():
                return
            if p.startswith("/api/coach/"):
                return self._coach("GET", p)
            try:
                with LOCK:
                    db, etag = read_db()
            except DbError as e:
                return self._json(422, {"error": str(e)})
            if p == "/api/etag":
                return self._json(200, {"etag": etag})
            if p == "/api/db":
                return self._json(200, {"exists": db is not None, "etag": etag, "db": db})
            return self._json(404, {"error": "inconnu"})
        if self._blocked_static():
            return self.send_error(404)
        super().do_GET()

    def do_HEAD(self):
        if self._blocked_static():
            return self.send_error(404)
        super().do_HEAD()

    def do_PUT(self):
        if urlparse(self.path).path == "/api/coach/settings":
            return self._coach("PUT", "/api/coach/settings") if self._guard() else None
        if urlparse(self.path).path != "/api/db":
            return self._json(404, {"error": "inconnu"})
        if not self._guard():
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BYTES:
            return self._json(413 if length else 400, {"error": "taille invalide"})
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            data = body["data"]
            assert isinstance(data, dict) and isinstance(data.get("habits"), list)
        except Exception:
            return self._json(400, {"error": "corps invalide"})
        with LOCK:
            try:
                old, etag = read_db()
            except DbError as e:
                return self._json(422, {"error": str(e)})
            if (self.headers.get("If-Match") or "none") != etag:
                return self._json(409, {"error": "db.json a changé", "etag": etag, "db": old})
            new_etag, obj = write_db(data, old)
        self._json(200, {"etag": new_etag, "rev": obj["rev"], "updatedAt": obj["updatedAt"]})

    def do_POST(self):
        p = urlparse(self.path).path
        if p.startswith("/api/coach/"):
            return self._coach("POST", p) if self._guard() else None
        self.send_error(405)

    do_DELETE = do_POST

    # ---------- Coach IA ----------
    def _body(self, limit=65536):
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n > limit:
                raise ValueError
            return json.loads(self.rfile.read(n).decode("utf-8")) if n else {}
        except (ValueError, UnicodeDecodeError):
            self._json(400, {"error": "corps invalide"})
            return None

    def _audio(self, name):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+\.mp3", name or ""):
            return self._json(404, {"error": "inconnu"})
        path = os.path.join(coach.P["audio"], name)
        if not os.path.isfile(path):
            return self._json(404, {"error": "audio introuvable"})
        size, start, end, code = os.path.getsize(path), 0, os.path.getsize(path) - 1, 200
        rng = self.headers.get("Range") or ""
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", rng.strip())
        if m and (m.group(1) or m.group(2)):                      # Range indispensable pour pouvoir se déplacer dans l'audio
            if m.group(1):
                start = int(m.group(1)); end = int(m.group(2)) if m.group(2) else end
            else:
                start = max(0, size - int(m.group(2)))
            end = min(end, size - 1)
            if start > end or start >= size:
                self.send_response(416); self.send_header("Content-Range", "bytes */%d" % size); self.end_headers(); return
            code = 206
        self.send_response(code)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "private, max-age=86400")
        self.send_header("Content-Length", str(end - start + 1))
        if code == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.end_headers()
        if self.command == "HEAD":
            return
        with open(path, "rb") as f:
            f.seek(start); left = end - start + 1
            while left > 0:
                chunk = f.read(min(65536, left))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    return
                left -= len(chunk)

    def _coach(self, method, p):
        if not CFG.get("coach"):
            return self._json(404, {"error": "coach désactivé"})
        q = parse_qs(urlparse(self.path).query)
        try:
            coach.set_lang((q.get("lang") or [None])[0])
            if method == "GET":
                if p == "/api/coach/state":
                    return self._json(200, coach.state_info())
                if p == "/api/coach/messages":
                    return self._json(200, coach.get_messages(int((q.get("after") or ["0"])[0] or 0)))
                if p == "/api/coach/push/key":
                    return self._json(200, coach.push_key())
                if p == "/api/coach/verses":
                    return self._json(200, coach.verses_info())
                if p.startswith("/api/coach/audio/"):
                    return self._audio(p.rsplit("/", 1)[1])
                return self._json(404, {"error": "inconnu"})
            b = self._body()
            if b is None:
                return
            if method == "PUT" and p == "/api/coach/settings":
                return self._json(200, coach.update_settings(b))
            if p == "/api/coach/chat":
                return self._json(200, {"message": coach.chat(b.get("text"), b.get("lang"))})
            if p == "/api/coach/sermon":
                kind = b.get("kind") if b.get("kind") in ("daily", "review", "encourage", "correct", "topic", "morning", "evening", "weekly", "examen") else "daily"
                return self._json(200, {"message": coach.create_sermon(kind, b.get("lang") or "fr", str(b.get("topic") or ""), False, True)})
            if p == "/api/coach/read":
                coach.mark_read(); return self._json(200, {"ok": True})
            if p == "/api/coach/preview":
                f = coach.preview(b.get("voice"), b.get("lang") or "fr") if b.get("voice") else coach.preview_provider(b.get("lang") or "fr")
                return self._json(200, {"url": "./api/coach/audio/" + f})
            if p == "/api/coach/proposal":
                return self._json(200, {"message": coach.set_proposal(str(b.get("id")), str(b.get("pid")), str(b.get("status")))})
            if p == "/api/coach/verse":
                act = b.get("action")
                if act == "add":
                    return self._json(200, {"verse": coach.verse_add(b.get("ref"), b.get("text"), b.get("lang") or "fr", b.get("bank"))})
                if act == "review":
                    return self._json(200, {"verse": coach.verse_review(str(b.get("id")), str(b.get("result")))})
                if act == "delete":
                    coach.verse_delete(str(b.get("id"))); return self._json(200, {"ok": True})
                if act == "audio":
                    return self._json(200, {"url": "./api/coach/audio/" + coach.verse_audio(str(b.get("id")))})
                return self._json(400, {"error": "action inconnue"})
            if p == "/api/coach/test":
                return self._json(200, coach.selftest())
            if p == "/api/coach/clear":
                coach.clear_history(); return self._json(200, {"ok": True})
            if p == "/api/coach/regen":
                coach.regen_audio(str(b.get("id"))); return self._json(200, {"ok": True})
            if p == "/api/coach/push/subscribe":
                return self._json(200, {"subs": coach.push_subscribe(b)})
            if p == "/api/coach/push/unsubscribe":
                coach.push_unsubscribe(str(b.get("endpoint"))); return self._json(200, {"ok": True})
            return self._json(404, {"error": "inconnu"})
        except coach.CoachError as e:
            self._json(409 if e.code == "no_key" else 502 if e.code.startswith(("http_", "net", "bad_json", "tts", "no_edge", "empty")) else 400, {"error": e.msg, "code": e.code})
        except Exception as e:  # jamais de trace brute côté client
            print("[coach]", self.path, repr(e))
            self._json(500, {"error": "erreur interne"})


def main():
    ap = argparse.ArgumentParser(description="Serveur Present (app + db.json)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 pour ouvrir au réseau local (utilise alors --token)")
    ap.add_argument("--token", default=os.environ.get("PRESENT_TOKEN", ""))
    ap.add_argument("--db", default=os.path.join(ROOT, "db.json"))
    ap.add_argument("--no-coach", action="store_true", help="désactive le coach IA")
    a = ap.parse_args()
    CFG.update(host=a.host, token=a.token, db=os.path.abspath(a.db), coach=not a.no_coach)
    if CFG["coach"]:
        coach.init(ROOT, CFG["db"])
    if a.host not in LOOPBACK and not a.token:
        print("⚠  Serveur ouvert au réseau SANS jeton : ajoute --token SECRET")
    if CFG["coach"]:
        print("Coach : clé API %s · edge-tts %s · push %s" % ("✓" if coach.configured() else "✗ (à saisir dans l'app)", "✓" if coach.tts_available() else "✗ (pip install edge-tts)", "✓" if coach.push_available() else "✗ (optionnel : pip install pywebpush)"))
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    print("Present → http://%s:%d   |   base : %s%s" % ("127.0.0.1" if a.host == "0.0.0.0" else a.host, a.port, CFG["db"], "   |   jeton actif" if a.token else ""))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt.")


if __name__ == "__main__":
    main()
