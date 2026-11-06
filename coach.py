"""Present — Coach IA : suivi, chat, sermons audio, autonomie (stdlib + edge-tts / pywebpush en option).

Tout est côté serveur : la clé API ne quitte jamais le disque (data/coach.secret.json), le coach lit db.json
(la même base que l'app) et peut agir sans que l'app soit ouverte (planificateur + notifications Web Push).
"""
import asyncio, base64, copy, hashlib, json, os, re, tempfile, threading, time, uuid
from datetime import date, datetime, timedelta
from urllib import error as urlerror, request as urlrequest

LOCK = threading.RLock()
P = {}            # chemins (init)
S = {}            # réglages
ST = {"messages": [], "seq": 0, "epoch": 1, "push": [], "runs": {}, "lang": "fr", "verses": [], "last_sermon": ""}
UA = "present-coach/1.0"

# ---------------------------------------------------------------- voix (5 EN dont Ava & Andrew, 5 FR)
VOICES = [
    {"id": "en-US-AvaMultilingualNeural", "label": "Ava", "lang": "en", "gender": "F", "multi": True, "note": "US · chaleureuse, expressive"},
    {"id": "en-US-AndrewMultilingualNeural", "label": "Andrew", "lang": "en", "gender": "M", "multi": True, "note": "US · posé, autoritaire"},
    {"id": "en-US-EmmaMultilingualNeural", "label": "Emma", "lang": "en", "gender": "F", "multi": True, "note": "US · douce, claire"},
    {"id": "en-US-BrianMultilingualNeural", "label": "Brian", "lang": "en", "gender": "M", "multi": True, "note": "US · naturel, direct"},
    {"id": "en-GB-SoniaNeural", "label": "Sonia (UK)", "lang": "en", "gender": "F", "multi": False, "note": "UK · élégante"},
    {"id": "fr-FR-VivienneMultilingualNeural", "label": "Vivienne", "lang": "fr", "gender": "F", "multi": True, "note": "FR · chaleureuse"},
    {"id": "fr-FR-RemyMultilingualNeural", "label": "Rémy", "lang": "fr", "gender": "M", "multi": True, "note": "FR · grave, posé"},
    {"id": "fr-FR-DeniseNeural", "label": "Denise", "lang": "fr", "gender": "F", "multi": False, "note": "FR · classique"},
    {"id": "fr-FR-HenriNeural", "label": "Henri", "lang": "fr", "gender": "M", "multi": False, "note": "FR · classique"},
    {"id": "fr-CA-SylvieNeural", "label": "Sylvie (CA)", "lang": "fr", "gender": "F", "multi": False, "note": "Québec · douce"},
]
VOICE_BY_ID = {v["id"]: v for v in VOICES}

DEFAULTS = {
    "llm": {"base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini", "temperature": 0.8},
    "tts": {"provider": "edge", "voice": "en-US-AndrewMultilingualNeural", "rate": 0, "fallback": True,
            "base_url": "", "openai_model": "gpt-4o-mini-tts", "openai_voice": "onyx",
            "eleven_voice": "21m00Tcm4TlvDq8ikWAM", "eleven_model": "eleven_multilingual_v2", "eleven_base": "https://api.elevenlabs.io"},
    "coach": {"style": "sermon", "length": "medium", "lang": "auto", "name": ""},
    "auto": {"enabled": True, "audio": True, "max_per_day": 5,
             "morning": {"on": True, "time": "06:30"}, "evening": {"on": True, "time": "21:00"},
             "weekly": {"on": True, "day": 6, "time": "19:00"}, "examen": {"on": True, "time": ""}, "nudges": {"on": True, "grace": 45},
             "quiet": {"from": "22:30", "to": "05:00"}},
}
WORDS = {"short": 140, "medium": 350, "long": 700}
STYLES = ("sermon", "coach", "gentle", "strict")


class CoachError(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code, self.msg = code, msg


# ---------------------------------------------------------------- stockage
def _atomic(path, obj, mode=None):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".c-", suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.flush(); os.fsync(f.fileno())
    if mode:
        os.chmod(tmp, mode)
    os.replace(tmp, path)


def _merge(base, patch):
    for k, v in patch.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _merge(base[k], v)
        else:
            base[k] = v
    return base


def init(root, db_path, start_scheduler=True):
    P.update(root=root, db=db_path, data=os.path.join(root, "data"))
    P["audio"] = os.path.join(P["data"], "audio")
    P["file"] = os.path.join(P["data"], "coach.json")
    P["secret"] = os.path.join(P["data"], "coach.secret.json")
    P["vapid"] = os.path.join(P["data"], "vapid.pem")
    os.makedirs(P["audio"], exist_ok=True)
    try:
        os.chmod(P["data"], 0o700)
    except OSError:
        pass
    raw = {}
    try:
        with open(P["file"], encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError):
        pass
    S.clear(); S.update(_merge(copy.deepcopy(DEFAULTS), raw.get("settings", {})))
    for k in ST:
        if k in raw:
            ST[k] = raw[k]
    for m in ST["messages"]:                      # un redémarrage interrompt les générations en cours
        if m.get("status") in ("generating", "tts"):
            m["status"], m["error"] = "error", "Interrompu (serveur redémarré)"
    if start_scheduler:
        threading.Thread(target=_loop, name="coach-scheduler", daemon=True).start()


def _save():
    with LOCK:
        _atomic(P["file"], {"settings": S, **ST})


def _secret():
    try:
        with open(P["secret"], encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _set_secret(**kw):
    s = _secret(); s.update({k: v for k, v in kw.items() if v is not None})
    _atomic(P["secret"], s, 0o600)


def tts_available():
    try:
        import edge_tts  # noqa: F401
        return True
    except Exception:
        return False


def push_available():
    try:
        import pywebpush  # noqa: F401
        import cryptography  # noqa: F401
        return True
    except Exception:
        return False


def configured():
    return bool(_secret().get("api_key"))


def public_settings():
    sec = _secret(); key = sec.get("api_key", "")
    hint = lambda k: ("…" + sec[k][-4:]) if sec.get(k) else ""
    return {"settings": S, "configured": bool(key), "key_hint": ("…" + key[-4:]) if key else "",
            "tts_key_hint": hint("tts_api_key"), "eleven_key_hint": hint("eleven_api_key"),
            "tts_available": tts_available(), "voices": VOICES, "push_available": push_available(),
            "push_subs": len(ST["push"])}


def update_settings(patch):
    """Fusionne un patch validé ; la clé API va dans le fichier secret (jamais renvoyée)."""
    with LOCK:
        sec = {k: patch.pop(k, None) for k in ("api_key", "tts_api_key", "eleven_api_key")}
        _set_secret(**{k: v.strip() for k, v in sec.items() if isinstance(v, str) and v.strip()})
        t = lambda v: isinstance(v, str) and re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", v)
        clean = {}
        l = patch.get("llm") or {}
        if str(l.get("base_url", "")).startswith(("http://", "https://")):
            clean.setdefault("llm", {})["base_url"] = l["base_url"].strip().rstrip("/")
        if isinstance(l.get("model"), str) and l["model"].strip():
            clean.setdefault("llm", {})["model"] = l["model"].strip()
        tt = patch.get("tts") or {}
        if tt.get("provider") in ("edge", "openai", "eleven", "off"):
            clean.setdefault("tts", {})["provider"] = tt["provider"]
        if tt.get("voice") in VOICE_BY_ID:
            clean.setdefault("tts", {})["voice"] = tt["voice"]
        if isinstance(tt.get("rate"), (int, float)):
            clean.setdefault("tts", {})["rate"] = int(max(-30, min(30, tt["rate"])))
        for k in ("openai_model", "openai_voice", "eleven_voice", "eleven_model"):
            if isinstance(tt.get(k), str) and tt[k].strip():
                clean.setdefault("tts", {})[k] = tt[k].strip()[:80]
        for k in ("base_url", "eleven_base"):
            if isinstance(tt.get(k), str) and (not tt[k].strip() or tt[k].startswith(("http://", "https://"))):
                clean.setdefault("tts", {})[k] = tt[k].strip().rstrip("/")
        if isinstance(tt.get("fallback"), bool):
            clean.setdefault("tts", {})["fallback"] = tt["fallback"]
        c = patch.get("coach") or {}
        if c.get("style") in STYLES:
            clean.setdefault("coach", {})["style"] = c["style"]
        if c.get("length") in WORDS:
            clean.setdefault("coach", {})["length"] = c["length"]
        if c.get("lang") in ("auto", "fr", "en"):
            clean.setdefault("coach", {})["lang"] = c["lang"]
        if isinstance(c.get("name"), str):
            clean.setdefault("coach", {})["name"] = c["name"].strip()[:24]
        a = patch.get("auto") or {}
        ca = clean.setdefault("auto", {})
        for k in ("enabled", "audio"):
            if isinstance(a.get(k), bool):
                ca[k] = a[k]
        if isinstance(a.get("max_per_day"), int):
            ca["max_per_day"] = max(1, min(12, a["max_per_day"]))
        for k in ("morning", "evening", "weekly"):
            v = a.get(k)
            if isinstance(v, dict):
                d = ca.setdefault(k, {})
                if isinstance(v.get("on"), bool):
                    d["on"] = v["on"]
                if t(v.get("time")):
                    d["time"] = v["time"]
                if k == "weekly" and isinstance(v.get("day"), int) and 0 <= v["day"] <= 6:
                    d["day"] = v["day"]
        v = a.get("examen")
        if isinstance(v, dict):
            d = ca.setdefault("examen", {})
            if isinstance(v.get("on"), bool):
                d["on"] = v["on"]
            if v.get("time") == "" or t(v.get("time")):
                d["time"] = v["time"]
        v = a.get("nudges")
        if isinstance(v, dict):
            d = ca.setdefault("nudges", {})
            if isinstance(v.get("on"), bool):
                d["on"] = v["on"]
            if isinstance(v.get("grace"), int):
                d["grace"] = max(10, min(240, v["grace"]))
        v = a.get("quiet")
        if isinstance(v, dict):
            d = ca.setdefault("quiet", {})
            for k in ("from", "to"):
                if t(v.get(k)):
                    d[k] = v[k]
        _merge(S, clean)
        _save()
    return public_settings()


# ---------------------------------------------------------------- messages
def _touch(m):
    ST["seq"] += 1
    m["seq"] = ST["seq"]


def add_message(**kw):
    with LOCK:
        m = {"id": "m_" + uuid.uuid4().hex[:10], "ts": int(time.time() * 1000), "role": "coach", "type": "chat", "kind": "",
             "title": "", "text": "", "script": "", "status": "ready", "error": "", "audio": None, "steps": [], "proposals": [], "auto": False, "read": False}
        m.update(kw)
        _touch(m)
        ST["messages"].append(m)
        if len(ST["messages"]) > 300:
            for old in ST["messages"][:-300]:
                _drop_audio(old)
            ST["messages"] = ST["messages"][-300:]
        _save()
        return m


def update_message(mid, **kw):
    with LOCK:
        for m in ST["messages"]:
            if m["id"] == mid:
                m.update(kw)
                _touch(m)
                _save()
                return m
    return None


def _drop_audio(m):
    for a in [m.get("audio")] + [st.get("audio") for st in (m.get("steps") or [])]:
        if a and a.get("file"):
            try:
                os.remove(os.path.join(P["audio"], a["file"]))
            except OSError:
                pass


def get_messages(after=0):
    with LOCK:
        ms = [m for m in ST["messages"] if m["seq"] > after]
        return {"messages": copy.deepcopy(ms), "seq": ST["seq"], "epoch": ST["epoch"]}


def state_info():
    with LOCK:
        unread = sum(1 for m in ST["messages"] if m["role"] == "coach" and not m["read"] and m["status"] != "generating")
        busy = any(m["status"] in ("generating", "tts") for m in ST["messages"])
        last = next((m for m in reversed(ST["messages"]) if m["role"] == "coach" and m["status"] != "generating"), None)
        info = public_settings()
        vd = _vdue(ST["verses"], date.today().isoformat())
        info.update(verse_due=({"id": vd["id"], "ref": vd["ref"]} if vd else None), available=True, unread=unread, busy=busy, seq=ST["seq"], epoch=ST["epoch"],
                    last=({"id": last["id"], "title": last["title"], "text": last["text"][:160], "type": last["type"], "ts": last["ts"],
                           "audio": bool(last.get("audio"))} if last else None))
        return info


def mark_read():
    with LOCK:
        for m in ST["messages"]:
            if m["role"] == "coach" and not m["read"]:
                m["read"] = True
                _touch(m)
        _save()


def clear_history():
    with LOCK:
        for m in ST["messages"]:
            _drop_audio(m)
        ST["messages"], ST["epoch"] = [], ST["epoch"] + 1
        _save()


# ---------------------------------------------------------------- lecture de db.json + instantané de suivi
class Db:
    def __init__(self, raw):
        self.habits = raw.get("habits") or []
        self.done = {}
        for c in raw.get("completions") or []:
            self.done.setdefault(c.get("date"), set()).add(c.get("habitId"))
        self.vals, self.notes = {}, {}               # valeurs partielles et notes (champ « entries » de db.json)
        for e in raw.get("entries") or []:
            d, hid = e.get("date"), e.get("habitId")
            if e.get("value") is not None:
                try:
                    self.vals.setdefault(d, {})[hid] = float(e["value"])
                except (TypeError, ValueError):
                    pass
            if e.get("note"):
                self.notes.setdefault(d, {})[hid] = str(e["note"])
        self.spent = {}                              # minutes réellement passées (minuteur) : {date: {'task:id'|'habit:id': minutes}}
        for e in raw.get("spent") or []:
            try:
                self.spent.setdefault(e["date"], {})["%s:%s" % (e["kind"], e["id"])] = float(e["minutes"])
            except (KeyError, TypeError, ValueError):
                pass
        self.tasks = raw.get("tasks") or []
        self.tdone = {k: set(v) for k, v in (raw.get("taskDone") or {}).items()}
        self.skip = raw.get("skip") or {}

    @staticmethod
    def meas(h):
        return h.get("type") in ("count", "time") and (h.get("target") or 0) > 0

    def prog(self, h, d):
        """Progression du jour : 1.0 = objectif atteint (sans valeur saisie : coché = 1)."""
        ds = d.isoformat()
        if self.meas(h) and h["id"] in self.vals.get(ds, {}):
            return self.vals[ds][h["id"]] / h["target"]
        return 1.0 if h["id"] in self.done.get(ds, ()) else 0.0

    def ok(self, h, d):
        p = self.prog(h, d)
        return p >= (h.get("threshold") or 100) / 100 - 1e-9 if self.meas(h) else p >= 1

    def sched(self, h, d):
        days, ds = h.get("days") or [], d.isoformat()
        if days and d.weekday() not in days:
            return False
        if ds < (h.get("start") or "0000"):
            return False
        return not (h.get("archived") and ds > (h.get("archivedAt") or "9999"))

    def on(self, d):
        ds = d.isoformat()
        return [h for h in self.habits if self.sched(h, d) or h["id"] in self.done.get(ds, ())]

    def day(self, d):
        """-> (faites, total, score pondéré, ok pour la série)"""
        hs = self.on(d)
        return (sum(1 for h in hs if self.prog(h, d) >= 1 - 1e-9), len(hs),
                sum(min(1.0, self.prog(h, d)) for h in hs), sum(1 for h in hs if self.ok(h, d)))

    def first(self, today):
        ds = [h.get("start") for h in self.habits if h.get("start")] + [k for k in self.done if k]
        try:
            return date.fromisoformat(min(ds)) if ds else today
        except ValueError:
            return today

    def streak(self, today):
        n, d, first = 0, today, self.first(today)
        while d >= first:
            _, total, _, ok = self.day(d)
            if total:
                if ok == total:
                    n += 1
                elif d != today:
                    break
            d -= timedelta(1)
        return n

    def rate(self, frm, to):
        sc = tt = 0; d = frm
        while d <= to:
            _, b, s_, _ = self.day(d); sc += s_; tt += b; d += timedelta(1)
        return round(100 * sc / tt) if tt else 0

    def habit(self, h, today):
        streak = 0; d = today
        while d >= date.fromisoformat(h.get("start") or today.isoformat()):
            if self.ok(h, d):
                streak += 1
            elif self.sched(h, d) and d != today:
                break
            d -= timedelta(1)
        sch = sc = 0.0
        for i in range(30):
            d = today - timedelta(i); p = self.prog(h, d)
            if self.sched(h, d) or p > 0:
                sch += 1; sc += min(1.0, p)
        return streak, (round(100 * sc / sch) if sch else 0)

    def occurs(self, t, d):
        ds = d.isoformat(); r = t.get("repeat") or {"type": "none"}
        if not t.get("date") or ds < t["date"] or ds in (self.skip.get(t["id"]) or []):
            return False
        if r.get("until") and ds > r["until"]:
            return False
        ty = r.get("type", "none"); a = date.fromisoformat(t["date"])
        return {"none": ds == t["date"], "daily": True, "weekdays": d.weekday() < 5, "weekly": d.weekday() == a.weekday(),
                "custom": d.weekday() in (r.get("days") or [])}.get(ty, False)


def _hm(minutes):
    return "%02d:%02d" % (minutes // 60 % 24, minutes % 60)


def _free_slots(db, today, now):
    busy = []
    for t in db.tasks:
        if db.occurs(t, today) and t.get("start") is not None and (t.get("dur") or 0) > 0:
            busy.append((t["start"], t["start"] + t["dur"]))
    for h in db.on(today):
        if h.get("time") and (h.get("dur") or 0) > 0:
            m = _mins(h["time"]); busy.append((m, m + h["dur"]))
    cur, free = max(6 * 60, ((now.hour * 60 + now.minute + 14) // 15) * 15), []
    for a, b in sorted(busy):
        if b <= cur:
            continue
        if a - cur >= 30:
            free.append((cur, a))
        cur = max(cur, b)
    if 22 * 60 - cur >= 30:
        free.append((cur, 22 * 60))
    return ["%s-%s" % (_hm(a), _hm(b)) for a, b in free[:4]]


def snapshot(now=None):
    now = now or datetime.now(); today = now.date()
    try:
        with open(P["db"], encoding="utf-8") as f:
            db = Db(json.load(f))
    except (OSError, ValueError):
        return None
    if not db.habits and not db.tasks:
        return None
    ds = today.isoformat(); items = []
    for h in db.on(today):
        hs, hr = db.habit(h, today)
        it = {"id": h["id"], "name": h["name"], "time": h.get("time") or "", "minutes": h.get("dur") or 0, "goal": h.get("goal") or "",
              "done": db.prog(h, today) >= 1 - 1e-9, "streak": hs, "rate30": hr}
        if db.meas(h):                                # habitude mesurée : on donne le concret (5 sur 10 pages, 45 sur 120 min)
            vals = [db.vals.get((today - timedelta(i)).isoformat(), {}).get(h["id"], 0) for i in range(6, -1, -1)]
            it.update(type=h["type"], unit="min" if h["type"] == "time" else (h.get("unit") or ""), target=h["target"], value=round(db.vals.get(ds, {}).get(h["id"], 0), 2),
                      progress_pct=round(100 * db.prog(h, today)), streak_threshold_pct=h.get("threshold") or 100, last7_values=[round(v, 2) for v in vals])
        sp = db.spent.get(ds, {}).get("habit:" + h["id"])
        if sp:
            it["spent_minutes"] = round(sp)
        if h.get("why"):
            it["why"] = str(h["why"])[:200]
        if h.get("share", True):                      # notes = mots de l'utilisateur ; omises si « ne pas partager »
            ns = [{"date": (today - timedelta(i)).isoformat(), "note": db.notes[(today - timedelta(i)).isoformat()][h["id"]][:300]}
                  for i in range(14) if h["id"] in db.notes.get((today - timedelta(i)).isoformat(), {})][:5]
            if ns:
                it["recent_notes"] = ns
        items.append(it)
    tasks = []
    for t in db.tasks:
        if db.occurs(t, today):
            sp_t = db.spent.get(ds, {}).get("task:" + t["id"])
            tasks.append({"id": t["id"], "title": t["title"], **({"spent_minutes": round(sp_t)} if sp_t else {}), "time": _hm(t["start"]) if t.get("start") is not None else "", "minutes": t.get("dur") or 0,
                          "done": t["id"] in db.tdone.get(ds, set())})
    done, total, score, _ok = db.day(today)
    y = today - timedelta(1); yd, yt, _ys, _yo = db.day(y)
    missed_y = [h["name"] for h in db.on(y) if not db.ok(h, y)]
    zero, d = 0, y                                  # jours consécutifs (avant aujourd'hui) sans aucune habitude faite
    while d >= db.first(today):
        _a, b, sc_, _o = db.day(d)
        if b and sc_ == 0:
            zero += 1
        elif b:
            break
        d -= timedelta(1)
    r7, p7 = db.rate(today - timedelta(6), today), db.rate(today - timedelta(13), today - timedelta(7))
    hab = sorted([i for i in items], key=lambda x: x["rate30"])
    streak = db.streak(today)
    MIL = (3, 7, 14, 21, 30, 60, 100, 180, 365)
    return {"now": now.strftime("%A %Y-%m-%d %H:%M"), "hour": now.hour, "weekday": now.strftime("%A"),
            "today": {"done": done, "total": total, "pct": round(100 * score / total) if total else 0, "habits": [dict(i) for i in items], "tasks": tasks,
                      "free_slots": _free_slots(db, today, now)},
            "all_habits": [{"id": h["id"], "name": h["name"], "time": h.get("time") or "", "minutes": h.get("dur") or 0} for h in db.habits if not h.get("archived")],
            "verse": _verse_ctx(),
            "yesterday": {"done": yd, "total": yt, "missed": missed_y},
            "streak": streak, "milestone_today": streak in MIL and done == total and total > 0, "zero_days_in_a_row": zero, "note_to_coach": "recent_notes are the user's own words",
            "rate7": r7, "rate7_previous_week": p7, "rate30": db.rate(today - timedelta(29), today),
            "weakest": [h["name"] for h in hab[:3] if h["rate30"] < 100], "strongest": [h["name"] for h in hab[::-1][:3]],
            "_items": items}


# ---------------------------------------------------------------- LLM (protocole OpenAI /chat/completions)
def _http(url, body, headers, timeout=60, raw=False):
    req = urlrequest.Request(url, data=json.dumps(body).encode("utf-8"), method="POST", headers={"Content-Type": "application/json", "User-Agent": UA, **headers})
    try:
        with urlrequest.urlopen(req, timeout=timeout) as r:
            data = r.read()
            return data if raw else json.loads(data.decode("utf-8"))
    except urlerror.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")[:500]
        raise CoachError("http_%d" % e.code, {401: "Clé API refusée (401)", 403: "Accès refusé (403)", 404: "URL ou modèle introuvable (404)", 429: "Limite ou quota atteint (429)"}.get(e.code, "Erreur du fournisseur (%d)" % e.code) + " — " + txt[:200])
    except urlerror.URLError as e:
        raise CoachError("net", "Fournisseur injoignable : %s" % getattr(e, "reason", e))
    except (TimeoutError, OSError) as e:
        raise CoachError("net", "Délai dépassé / réseau : %s" % e)
    except ValueError:
        raise CoachError("bad_json", "Réponse du fournisseur illisible")


def llm(messages, max_tokens=900, timeout=60):
    key = _secret().get("api_key")
    if not key:
        raise CoachError("no_key", "Aucune clé API configurée")
    url = S["llm"]["base_url"].rstrip("/") + "/chat/completions"
    hdr = {"Authorization": "Bearer " + key}
    body = {"model": S["llm"]["model"], "messages": messages, "temperature": S["llm"].get("temperature", 0.8), "max_tokens": max_tokens}
    try:
        data = _http(url, body, hdr, timeout)
    except CoachError as e:                      # modèles récents : max_completion_tokens, pas de temperature
        if e.code != "http_400":
            raise
        changed = False
        if "max_completion_tokens" in e.msg and "max_tokens" in body:
            body["max_completion_tokens"] = body.pop("max_tokens"); changed = True
        if "temperature" in e.msg and "temperature" in body:
            body.pop("temperature"); changed = True
        if not changed:
            raise
        data = _http(url, body, hdr, timeout)
    try:
        out = data["choices"][0]["message"]["content"]
        if isinstance(out, list):
            out = "".join(p.get("text", "") for p in out if isinstance(p, dict))
        out = (out or "").strip()
    except (KeyError, IndexError, TypeError):
        raise CoachError("bad_json", "Réponse du fournisseur inattendue")
    if not out:
        raise CoachError("empty", "Réponse vide du modèle")
    return out


def _json_from(text):
    t = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    a, b = t.find("{"), t.rfind("}")
    if a >= 0 and b > a:
        try:
            return json.loads(t[a:b + 1])
        except ValueError:
            return None
    return None


# ---------------------------------------------------------------- prompts
STYLE_TXT = {
    "sermon": "a warm, grounded pastoral preacher: speak with conviction and tenderness, structure the message in three movements (see where I am, hear the truth, act today). When the user's habits are faith-related (prayer, Bible reading, scripture memorization) you may quote Scripture: only verses you are certain of, short, with the reference, otherwise paraphrase and never invent a quotation. If the habits are not faith-related, keep a strong motivational tone without religious content.",
    "coach": "a direct, energetic performance coach: concrete, no fluff, celebrate wins, call out gaps clearly and assign one precise action.",
    "gentle": "a gentle, compassionate mentor: patient, affirming, small steps, never pressuring.",
    "strict": "a firm, disciplined mentor: high standards, honest and unsparing about gaps, but always respectful and aiming at the person's good.",
}
KIND_TXT = {
    "morning": "MORNING message: greet, name today's plan (timed items first), pick ONE priority and one concrete challenge, mention the streak and what is at stake.",
    "evening": "EVENING review: celebrate what was done (by name), correct what was missed with grace and truth, give one adjustment for tomorrow. If streak_at_risk or zero_days_in_a_row>=2 treat it as a gentle but serious wake-up and a comeback plan. If milestone_today is true, celebrate the milestone.",
    "weekly": "WEEKLY sermon: compare this week to the previous week (rate7 vs rate7_previous_week), name the strongest and weakest habits, give a commitment for the coming week.",
    "daily": "A general sermon for today, adapted to where the user stands right now.",
    "review": "An honest progress review of right now, using the numbers.",
    "encourage": "Pure encouragement: the user needs courage today. Be specific about real progress in the data.",
    "correct": "Loving correction: name precisely what is slipping (use the data), without shame, and give a clear way back.",
    "topic": "A sermon on the topic requested by the user, tied to their real situation in the data.",
    "nudge": "A very short nudge (max 35 words) about a planned habit that has not been done yet. Warm, firm, specific.",
}


def _lang_name(lang):
    return "French" if lang == "fr" else "English"


def _resolve_lang(lang):
    c = S["coach"]["lang"]
    lang = c if c in ("fr", "en") else (lang if lang in ("fr", "en") else "fr")
    v = VOICE_BY_ID.get(S["tts"]["voice"])
    if S["tts"]["provider"] == "edge" and v and not v["multi"]:
        lang = v["lang"]                        # voix non multilingue : le texte suit sa langue
    return lang


PROPOSALS_TXT = (
    ' Optionally include a "proposals" array (max 2) of concrete schedule changes, ONLY when clearly useful and grounded in DATA '
    '(a habit missed repeatedly -> move it to a free slot; a free slot + a stated goal -> create a task). Each item is one of: '
    '{"type":"create_task","title":str,"date":"YYYY-MM-DD","time":"HH:MM","dur":minutes,"why":short reason} | '
    '{"type":"move_task","task_id":<id from DATA>,"time":"HH:MM","date":"YYYY-MM-DD" (optional),"why":...} | '
    '{"type":"move_habit","habit_id":<id from DATA>,"time":"HH:MM","why":...}. '
    'Use only ids that exist in DATA, prefer times inside today.free_slots, never invent ids. Use [] when nothing is needed.')
KIND_TXT["examen"] = ("GUIDED EVENING EXAMEN (a prayerful/reflective review of the day, read aloud with silences). Five steps in this order: "
                      "1 Settle (breathing, presence), 2 Gratitude (name concrete good things found in DATA), 3 Review of the day (walk through what was done and missed, factual, no shame), "
                      "4 Grace and correction (own failings honestly and receive grace; invite prayer if the habits are faith-related), 5 Tomorrow (one concrete resolution tied to DATA).")
KIND_TXT["morning"] += " If DATA.verse.due exists, invite the user to review that verse today (you may quote its text exactly as given in DATA)."


def _system(lang, kind, extra=""):
    c = S["coach"]; name = c.get("name") or ""
    n = WORDS[c["length"]]
    head = ("You are the personal habit coach inside the app \"Present\" (habit tracker + time blocker). You can see the user's tracking data in the DATA block; "
            "use only facts from it, never invent numbers or events. Persona: " + STYLE_TXT[c["style"]] + "\n"
            "Language: write in " + _lang_name(lang) + ". " + (("Address the user as " + name + ".") if name else "") + "\n"
            "Quote Scripture only from DATA.verse text or verses you are certain of, always with the reference. "
            "For measured habits (type count/time) DATA gives value, target, unit (time is in minutes), progress_pct and last7_values: be concrete (e.g. 5 of 10 pages, 45 of 120 minutes) and notice trends. "
            "spent_minutes is the real time measured by the user's timer: compare it with the planned minutes and encourage honest tracking. "
            "recent_notes are the user's own words about a habit: use them to personalize and show you listened, never expose them elsewhere, and do not repeat sensitive details unless they help. "
            "Never shame or insult. Correct with truth and grace. You are not a doctor or therapist: for health or mental-health topics give only general encouragement; "
            "if the user expresses despair or thoughts of self-harm, drop coaching, respond with compassion, and encourage reaching out to a trusted person or local emergency/crisis service.\n" +
            (KIND_TXT.get(kind, "") + "\n" if kind else ""))
    if kind == "chat":
        tail = ('Return ONLY a JSON object: {"reply": conversational answer in at most 120 words, plain text (light **bold** allowed), "proposals": []}.' + PROPOSALS_TXT)
    elif kind == "nudge":
        tail = 'Return ONLY a JSON object: {"notification": max 110 chars, "message": the nudge text}.'
    elif kind == "examen":
        tail = ('Return ONLY a JSON object: {"title": short title, "notification": push text max 110 chars, "message": 2 sentence chat intro, '
                '"steps": [{"title": max 5 words, "script": spoken text of this step (about ' + str(max(50, n // 5)) + ' words), "pause": seconds of silence after the step (10-60)}] (exactly 5 steps), "proposals": []}. '
                'Each script is read aloud by a text-to-speech voice: plain sentences, no markdown, no emojis, no lists, no URLs, second person, gentle pacing, invite silence ("take a moment...").' + PROPOSALS_TXT)
    else:
        tail = ('Return ONLY a JSON object: {"title": short title (max 6 words), "notification": push text max 110 chars, "message": 2-3 sentence chat summary, '
                '"script": the full spoken text (about ' + str(n) + ' words), "proposals": []}. '
                'The script is read aloud by a text-to-speech voice: plain sentences, no markdown, no emojis, no lists, no stage directions, no URLs, natural spoken rhythm with occasional short pauses ("..."), '
                'start by greeting, end with a clear closing line.' + PROPOSALS_TXT)
    return head + tail + extra


def _data_block(snap):
    d = {k: v for k, v in snap.items() if not k.startswith("_")}
    d["streak_at_risk"] = bool(d["streak"] and d["today"]["done"] < d["today"]["total"])
    return "DATA (JSON):\n" + json.dumps(d, ensure_ascii=False)


# ---------------------------------------------------------------- propositions d'ajustements (acceptées côté app)
TIME_RE = re.compile(r"([01]\d|2[0-3]):[0-5]\d")


def _day_word(d, lang):
    t = date.today().isoformat()
    if d == t:
        return "aujourd'hui" if lang == "fr" else "today"
    if d == (date.today() + timedelta(1)).isoformat():
        return "demain" if lang == "fr" else "tomorrow"
    return d


def _clean_proposals(raw, lang):
    if not isinstance(raw, list):
        return []
    try:
        with open(P["db"], encoding="utf-8") as f:
            db = Db(json.load(f))
    except (OSError, ValueError):
        return []
    hab, tsk, today, out = {h["id"]: h for h in db.habits}, {t["id"]: t for t in db.tasks}, date.today(), []

    def vdate(v):
        try:
            d = date.fromisoformat(str(v))
            return d.isoformat() if today <= d <= today + timedelta(60) else None
        except ValueError:
            return None
    fr = lang == "fr"
    for p in raw[:2]:
        if not isinstance(p, dict):
            continue
        ty, tm, why = p.get("type"), str(p.get("time") or ""), str(p.get("why") or "")[:140]
        if not TIME_RE.fullmatch(tm):
            continue
        if ty == "create_task":
            title = re.sub(r"\s+", " ", str(p.get("title") or "")).strip()[:80]
            if not title:
                continue
            d = vdate(p.get("date")) or today.isoformat()
            dur = max(5, min(720, int(p["dur"]) if isinstance(p.get("dur"), (int, float)) else 30))
            args = {"title": title, "date": d, "time": tm, "dur": dur}
            label = ("Créer « %s » %s à %s (%s min)" if fr else "Create “%s” %s at %s (%s min)") % (title, _day_word(d, lang), tm, dur)
        elif ty == "move_task" and p.get("task_id") in tsk:
            t = tsk[p["task_id"]]; args = {"task_id": t["id"], "time": tm}
            d = vdate(p.get("date"))
            if d and (t.get("repeat") or {}).get("type", "none") == "none":
                args["date"] = d
            label = ("Déplacer « %s » à %s" if fr else "Move “%s” to %s") % (t["title"], tm) + ((" (" + _day_word(args["date"], lang) + ")") if "date" in args else "")
        elif ty == "move_habit" and p.get("habit_id") in hab:
            h = hab[p["habit_id"]]; args = {"habit_id": h["id"], "time": tm}
            label = ("Déplacer l'habitude « %s » à %s" if fr else "Move habit “%s” to %s") % (h["name"], tm)
        else:
            continue
        out.append({"id": "p_" + uuid.uuid4().hex[:6], "type": ty, "args": args, "label": label, "why": why, "status": "pending"})
    return out


def set_proposal(mid, pid, status):
    if status not in ("pending", "accepted", "dismissed"):
        raise CoachError("bad_status", "Statut invalide")
    with LOCK:
        m = next((x for x in ST["messages"] if x["id"] == mid), None)
        p = next((x for x in (m or {}).get("proposals", []) if x["id"] == pid), None)
        if not p:
            raise CoachError("nodata", "Proposition introuvable")
        p["status"] = status; _touch(m); _save()
        return copy.deepcopy(m)


def _clean_steps(raw):
    out = []
    for s_ in (raw if isinstance(raw, list) else [])[:7]:
        if not isinstance(s_, dict) or not str(s_.get("script") or "").strip():
            continue
        try:
            pause = int(s_.get("pause", 20))
        except (TypeError, ValueError):
            pause = 20
        out.append({"title": str(s_.get("title") or "")[:60], "script": str(s_["script"]).strip()[:3000], "pause": max(0, min(90, pause)), "audio": None})
    return out


# ---------------------------------------------------------------- chat
def chat(text, lang="fr"):
    text = (text or "").strip()[:2000]
    if not text:
        raise CoachError("empty", "Message vide")
    if not configured():
        raise CoachError("no_key", "Aucune clé API configurée")
    user = add_message(role="user", type="chat", text=text, read=True)
    lang = _resolve_lang(lang)
    snap = snapshot() or {"note": "no tracking data yet"}
    msgs = [{"role": "system", "content": _system(lang, "chat") + "\n" + (_data_block(snap) if "today" in snap else "DATA: no tracking data yet")}]
    with LOCK:
        hist = [m for m in ST["messages"] if m["type"] in ("chat", "sermon") and m["id"] != user["id"] and m["status"] == "ready"][-12:]
    for m in hist:
        msgs.append({"role": "user" if m["role"] == "user" else "assistant", "content": (m["text"] or m["title"])[:1200]})
    msgs.append({"role": "user", "content": text})
    try:
        out = llm(msgs, max_tokens=700)
    except CoachError as e:
        update_message(user["id"], error=e.msg)
        raise
    j = _json_from(out)
    if j and isinstance(j.get("reply"), str):
        return add_message(role="coach", type="chat", text=j["reply"].strip(), proposals=_clean_proposals(j.get("proposals"), lang))
    return add_message(role="coach", type="chat", text=out)


# ---------------------------------------------------------------- TTS
def _clean_tts(t):
    t = re.sub(r"https?://\S+", "", t or "")
    t = re.sub(r"[*_#`>~|]+", "", t)
    t = re.sub("[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200d]", "", t)
    t = re.sub(r"\s*\n\s*", "\n", t)
    return re.sub(r"[ \t]+", " ", t).strip()[:7000]


def _chunks(text, n=3500):
    """Découpe aux fins de phrase (les API TTS limitent à ~4000 caractères par requête)."""
    out, cur = [], ""
    for sent in re.split(r"(?<=[.!?…])\s+|\n+", text):
        if cur and len(cur) + len(sent) + 1 > n:
            out.append(cur); cur = ""
        while len(sent) > n:
            out.append(sent[:n]); sent = sent[n:]
        cur = (cur + " " + sent).strip()
    return out + ([cur] if cur else [])


def _synth(text, voice, out_path, provider=None, lang="en", rate=None):
    provider = provider or S["tts"]["provider"]
    text = _clean_tts(text)
    tmp = out_path + ".part"
    t, sec = S["tts"], _secret()
    if provider in ("openai", "eleven"):
        data = b""
        for part in _chunks(text):                 # des MP3 mono bout à bout se lisent sans coupure
            if provider == "openai":
                key = sec.get("tts_api_key") or sec.get("api_key")
                body = {"model": t["openai_model"], "voice": t["openai_voice"], "input": part, "response_format": "mp3"}
                if "gpt-4o" in body["model"]:
                    body["instructions"] = "Speak as a warm, authoritative and caring coach, with natural pacing."
                data += _http((t.get("base_url") or S["llm"]["base_url"]).rstrip("/") + "/audio/speech", body, {"Authorization": "Bearer " + (key or "")}, 120, raw=True)
            else:
                key = sec.get("eleven_api_key")
                if not key:
                    raise CoachError("no_key", "Clé ElevenLabs manquante")
                url = "%s/v1/text-to-speech/%s?output_format=mp3_44100_64" % (t["eleven_base"].rstrip("/"), t["eleven_voice"])
                body = {"text": part, "model_id": t["eleven_model"], "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.3}}
                data += _http(url, body, {"xi-api-key": key, "Accept": "audio/mpeg"}, 120, raw=True)
        with open(tmp, "wb") as f:
            f.write(data)
    else:
        try:
            import edge_tts
        except Exception:
            raise CoachError("no_edge", "edge-tts n'est pas installé (pip install edge-tts)")
        rate = t["rate"] if rate is None else rate; r = ("+%d%%" % rate) if rate >= 0 else ("%d%%" % rate)
        last = None
        for attempt in range(3):
            try:
                asyncio.run(edge_tts.Communicate(text, voice, rate=r).save(tmp))
                last = None
                break
            except Exception as e:  # réseau / service Microsoft
                last = e; time.sleep(1.5 * (attempt + 1))
        if last:
            raise CoachError("tts_fail", "Synthèse vocale indisponible : %s" % last)
    if not os.path.exists(tmp) or os.path.getsize(tmp) < 200:
        raise CoachError("tts_fail", "Audio vide")
    os.replace(tmp, out_path)
    return os.path.getsize(out_path)


def _make_audio(base, script, lang, rate=None):
    """Génère <base>.mp3 avec le moteur choisi ; repli sur Edge si le moteur payant échoue."""
    prov = S["tts"]["provider"]
    if prov == "off" or not script:
        return None
    voice, fname = S["tts"]["voice"], base + ".mp3"; path = os.path.join(P["audio"], fname); used = prov
    try:
        size = _synth(script, voice, path, prov, lang, rate)
    except CoachError as e:
        if prov == "edge" or not S["tts"].get("fallback") or not tts_available():
            raise
        print("[coach] voix %s indisponible (%s) → repli Edge" % (prov, e.msg))
        size = _synth(script, voice, path, "edge", lang, rate); used = "edge"
    dur = round(size * 8 / (48000 if used == "edge" else 64000))     # estimation ; le lecteur affine avec la durée réelle
    label = voice if used == "edge" else ("openai:" + S["tts"]["openai_voice"] if used == "openai" else "eleven:" + S["tts"]["eleven_voice"])
    return {"file": fname, "voice": label, "dur": dur}


def preview(voice, lang="fr"):
    if voice not in VOICE_BY_ID:
        raise CoachError("bad_voice", "Voix inconnue")
    v = VOICE_BY_ID[voice]; l = v["lang"] if not v["multi"] else (lang if lang in ("fr", "en") else v["lang"])
    fname = "preview-%s-%s.mp3" % (voice, l); path = os.path.join(P["audio"], fname)
    if not os.path.exists(path):
        txt = {"fr": "Bonjour. Je suis ton coach. Ensemble, nous allons rester fidèles, un jour à la fois.",
               "en": "Hello. I am your coach. Together, we will stay faithful, one day at a time."}[l]
        saved = dict(S["tts"]); S["tts"]["rate"] = 0
        try:
            _synth(txt, voice, path, "edge", l)
        finally:
            S["tts"].update(saved)
    return fname


def preview_provider(lang="fr"):
    """Aperçu avec le moteur courant (OpenAI / ElevenLabs) : voix et modèle réellement utilisés."""
    t = S["tts"]; prov = t["provider"]
    if prov not in ("openai", "eleven"):
        raise CoachError("bad_voice", "Aperçu réservé aux moteurs OpenAI / ElevenLabs")
    l = lang if lang in ("fr", "en") else "fr"
    tag = hashlib.sha1(("%s|%s|%s|%s|%s" % (prov, t["openai_voice"], t["openai_model"], t["eleven_voice"], l)).encode()).hexdigest()[:10]
    fname = "preview-%s-%s.mp3" % (prov, tag); path = os.path.join(P["audio"], fname)
    if not os.path.exists(path):
        txt = {"fr": "Bonjour. Je suis ton coach. Ensemble, nous allons rester fidèles, un jour à la fois.", "en": "Hello. I am your coach. Together, we will stay faithful, one day at a time."}[l]
        _synth(txt, t["voice"], path, prov, l)
    return fname


# ---------------------------------------------------------------- sermons / messages autonomes
def create_sermon(kind="daily", lang="fr", topic="", auto=False, audio=True):
    if not configured():
        raise CoachError("no_key", "Aucune clé API configurée")
    m = add_message(type="sermon", kind=kind, status="generating", auto=auto, title="", text="")
    threading.Thread(target=_run_sermon, args=(m["id"], kind, lang, topic, auto, audio), daemon=True).start()
    return m


def _run_sermon(mid, kind, lang, topic, auto, audio=True):
    try:
        lang = _resolve_lang(lang)
        snap = snapshot()
        if not snap:
            raise CoachError("nodata", "Pas encore de données de suivi (db.json vide)")
        extra = ("\nTopic requested by the user: " + topic[:200]) if topic else ""
        out = llm([{"role": "system", "content": _system(lang, kind, extra)}, {"role": "user", "content": _data_block(snap)}], max_tokens=2800 if kind == "examen" else 1800, timeout=120)
        j = _json_from(out) or {"script": out, "message": out[:240], "title": ""}
        props = _clean_proposals(j.get("proposals"), lang)
        steps = _clean_steps(j.get("steps")) if kind == "examen" else []
        if kind == "examen" and not steps:
            steps = _clean_steps([{"title": "Examen", "script": j.get("script") or out, "pause": 20}])
        script = "\n\n".join(x["script"] for x in steps) if steps else (j.get("script") or j.get("message") or out).strip()
        update_message(mid, title=str(j.get("title") or "")[:60], text=str(j.get("message") or script[:240]).strip(), script=script, steps=steps, proposals=props,
                       notification=str(j.get("notification") or "")[:140], status="tts" if audio else "ready")
        if audio and S["tts"]["provider"] != "off":
            try:
                if steps:
                    for i, st in enumerate(steps):
                        st["audio"] = _make_audio("%s-%d" % (mid, i), st["script"], lang)
                        update_message(mid, steps=copy.deepcopy(steps))
                    update_message(mid, status="ready")
                else:
                    update_message(mid, audio=_make_audio(mid, script, lang), status="ready")
            except CoachError as e:
                update_message(mid, status="ready", error="Audio indisponible : " + e.msg, steps=copy.deepcopy(steps))
        else:
            update_message(mid, status="ready")
        if auto:
            m = next((x for x in ST["messages"] if x["id"] == mid), None)
            if m:
                notify(m.get("title") or "Coach", m.get("notification") or m.get("text", "")[:110], tag="coach-" + kind)
    except CoachError as e:
        update_message(mid, status="error", error=e.msg)
    except Exception as e:  # ne jamais tuer le thread en silence
        update_message(mid, status="error", error="Erreur interne : %s" % e)


def regen_audio(mid):
    with LOCK:
        m = next((x for x in ST["messages"] if x["id"] == mid), None)
    if not m or not m.get("script"):
        raise CoachError("nodata", "Rien à lire pour ce message")
    update_message(mid, status="tts", error="")

    def run():
        lang = _resolve_lang("fr" if re.search(r"[éèàç]", m["script"]) else "en")
        try:
            steps = copy.deepcopy(m.get("steps") or [])
            if steps:
                for i, st in enumerate(steps):
                    if not st.get("audio") or not os.path.exists(os.path.join(P["audio"], st["audio"]["file"])):   # métadonnée sans fichier = à refaire
                        st["audio"] = _make_audio("%s-%d" % (mid, i), st["script"], lang)
                        update_message(mid, steps=copy.deepcopy(steps))
                update_message(mid, status="ready", error="")
            else:
                update_message(mid, audio=_make_audio(mid, m["script"], lang), status="ready", error="")
        except CoachError as e:
            update_message(mid, status="ready", error="Audio indisponible : " + e.msg)
    threading.Thread(target=run, daemon=True).start()


def run_nudge(lang, names):
    snap = snapshot()
    try:
        out = llm([{"role": "system", "content": _system(_resolve_lang(lang), "nudge")},
                   {"role": "user", "content": _data_block(snap) + "\nPending timed habits now: " + ", ".join(names)}], max_tokens=200, timeout=45)
        j = _json_from(out) or {"message": out, "notification": out[:110]}
    except CoachError:
        j = {"message": ("Il est temps : " + ", ".join(names)) if lang == "fr" else ("Time for: " + ", ".join(names))}
    msg = add_message(type="nudge", kind="nudge", text=str(j.get("message", ""))[:300], auto=True)
    notify("Coach", str(j.get("notification") or j.get("message", ""))[:110], tag="coach-nudge")
    return msg


# ---------------------------------------------------------------- versets à mémoriser (répétition espacée)
# Textes : Louis Segond 1910 et King James (domaine public). À vérifier dans ta Bible ; tu peux saisir tes propres versets.
def _b(i, rf, re_, fr, en):
    return {"id": i, "ref": {"fr": rf, "en": re_}, "fr": fr, "en": en}


VERSE_BANK = [
    _b("jn3-16", "Jean 3:16", "John 3:16", "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.", "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."),
    _b("ps23-1", "Psaume 23:1", "Psalm 23:1", "L'Éternel est mon berger: je ne manquerai de rien.", "The LORD is my shepherd; I shall not want."),
    _b("php4-13", "Philippiens 4:13", "Philippians 4:13", "Je puis tout par celui qui me fortifie.", "I can do all things through Christ which strengtheneth me."),
    _b("pr3-5", "Proverbes 3:5-6", "Proverbs 3:5-6", "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse; reconnais-le dans toutes tes voies, et il aplanira tes sentiers.", "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."),
    _b("jos1-9", "Josué 1:9", "Joshua 1:9", "Ne t'ai-je pas donné cet ordre: Fortifie-toi et prends courage? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.", "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest."),
    _b("is41-10", "Ésaïe 41:10", "Isaiah 41:10", "Ne crains rien, car je suis avec toi; ne promène pas des regards inquiets, car je suis ton Dieu; je te fortifie, je viens à ton secours, je te soutiens de ma droite triomphante.", "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."),
    _b("rm8-28", "Romains 8:28", "Romans 8:28", "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.", "And we know that all things work together for good to them that love God, to them who are the called according to his purpose."),
    _b("mt6-33", "Matthieu 6:33", "Matthew 6:33", "Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.", "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you."),
    _b("ga6-9", "Galates 6:9", "Galatians 6:9", "Ne nous lassons pas de faire le bien; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas.", "And let us not be weary in well doing: for in due season we shall reap, if we faint not."),
    _b("2ti1-7", "2 Timothée 1:7", "2 Timothy 1:7", "Car ce n'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d'amour et de sagesse.", "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind."),
    _b("ps46-1", "Psaume 46:2", "Psalm 46:1", "Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans les détresses.", "God is our refuge and strength, a very present help in trouble."),
    _b("ps119-105", "Psaume 119:105", "Psalm 119:105", "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.", "Thy word is a lamp unto my feet, and a light unto my path."),
    _b("heb11-1", "Hébreux 11:1", "Hebrews 11:1", "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.", "Now faith is the substance of things hoped for, the evidence of things not seen."),
    _b("1co15-58", "1 Corinthiens 15:58", "1 Corinthians 15:58", "Ainsi, mes frères bien-aimés, soyez fermes, inébranlables, travaillez de mieux en mieux à l'œuvre du Seigneur, sachant que votre travail ne sera pas vain dans le Seigneur.", "Therefore, my beloved brethren, be ye stedfast, unmoveable, always abounding in the work of the Lord, forasmuch as ye know that your labour is not in vain in the Lord."),
]
LEITNER = (1, 2, 4, 7, 14, 30)


def _vdue(vs, today):
    due = [v for v in vs if not v["mastered"] and v["due"] <= today]
    return sorted(due, key=lambda v: (v["due"], v["added"]))[0] if due else None


def _verse_ctx():
    with LOCK:
        d = _vdue(ST["verses"], date.today().isoformat())
        return {"due": {"ref": d["ref"], "text": d["text"]} if d else None, "learning": sum(1 for v in ST["verses"] if not v["mastered"])}


def verses_info():
    with LOCK:
        vs, today = copy.deepcopy(ST["verses"]), date.today().isoformat()
        have = {v["bank"] for v in vs if v.get("bank")}
        return {"verses": vs, "due": _vdue(vs, today), "today": today, "intervals": list(LEITNER),
                "bank": [dict(b, added=b["id"] in have) for b in VERSE_BANK]}


def verse_add(ref=None, text=None, lang="fr", bank_id=None):
    lang = lang if lang in ("fr", "en") else "fr"
    if bank_id:
        b = next((x for x in VERSE_BANK if x["id"] == bank_id), None)
        if not b:
            raise CoachError("nodata", "Verset inconnu")
        ref, text = b["ref"][lang], b[lang]
    ref, text = str(ref or "").strip()[:60], re.sub(r"\s+", " ", str(text or "")).strip()[:1200]
    if not ref or len(text) < 5:
        raise CoachError("bad_verse", "Référence et texte requis")
    with LOCK:
        ex = next((v for v in ST["verses"] if v["ref"] == ref and v["lang"] == lang), None)
        if ex:
            return ex
        today = date.today().isoformat()
        v = {"id": "v_" + uuid.uuid4().hex[:8], "ref": ref, "text": text, "lang": lang, "bank": bank_id, "added": today, "box": 0, "due": today, "reviews": 0, "last": "", "mastered": False}
        ST["verses"].append(v); _save()
        return v


def verse_review(vid, result):
    if result not in ("ok", "hard", "fail"):
        raise CoachError("bad_status", "Résultat invalide")
    with LOCK:
        v = next((x for x in ST["verses"] if x["id"] == vid), None)
        if not v:
            raise CoachError("nodata", "Verset introuvable")
        today = date.today()
        v["box"] = min(5, v["box"] + 1) if result == "ok" else (v["box"] if result == "hard" else 0)
        v["due"] = (today + timedelta(1 if result == "fail" else LEITNER[v["box"]])).isoformat()
        v["reviews"] += 1; v["last"] = today.isoformat()
        v["mastered"] = v["box"] >= 5 and result == "ok" and v["reviews"] >= 6
        _save()
        return copy.deepcopy(v)


def verse_delete(vid):
    with LOCK:
        ST["verses"] = [v for v in ST["verses"] if v["id"] != vid]; _save()
    for f in os.listdir(P["audio"]):
        if f.startswith("verse-%s-" % vid):
            try:
                os.remove(os.path.join(P["audio"], f))
            except OSError:
                pass


def verse_audio(vid):
    """MP3 du verset (réf + texte), voix du coach ; une voix non multilingue d'une autre langue est remplacée."""
    with LOCK:
        v = next((x for x in ST["verses"] if x["id"] == vid), None)
    if not v:
        raise CoachError("nodata", "Verset introuvable")
    if S["tts"]["provider"] == "off":
        raise CoachError("tts_fail", "Audio désactivé")
    vo = VOICE_BY_ID.get(S["tts"]["voice"], VOICES[1]); voice = vo["id"]
    if S["tts"]["provider"] == "edge" and not vo["multi"] and vo["lang"] != v["lang"]:
        voice = "fr-FR-RemyMultilingualNeural" if v["lang"] == "fr" else "en-US-AndrewMultilingualNeural"
    tag = hashlib.sha1(("%s|%s|%s|%s" % (S["tts"]["provider"], voice, S["tts"]["openai_voice"], v["text"])).encode()).hexdigest()[:8]
    fname = "verse-%s-%s.mp3" % (vid, tag); path = os.path.join(P["audio"], fname)
    if not os.path.exists(path):
        text = "%s. ... %s" % (v["ref"], v["text"])
        try:
            _synth(text, voice, path, None, v["lang"], rate=-10)
        except CoachError:
            if S["tts"]["provider"] == "edge" or not S["tts"].get("fallback") or not tts_available():
                raise
            _synth(text, voice, path, "edge", v["lang"], rate=-10)
    return fname


# ---------------------------------------------------------------- planificateur autonome
def _mins(hm):
    return int(hm[:2]) * 60 + int(hm[3:])


def _in_quiet(now):
    q = S["auto"]["quiet"]; a, b, n = _mins(q["from"]), _mins(q["to"]), now.hour * 60 + now.minute
    return (a <= n < b) if a <= b else (n >= a or n < b)


def _examen_time():
    """Heure de l'examen guidé : réglage explicite, sinon celle de l'habitude « Examen du soir » ; None si aucun des deux."""
    t = S["auto"]["examen"]["time"]
    if t:
        return t
    try:
        with open(P["db"], encoding="utf-8") as f:
            hs = json.load(f).get("habits") or []
    except (OSError, ValueError):
        return None
    h = next((h for h in hs if not h.get("archived") and (h.get("pillar") == "examen_obedient" or re.search(r"exam", h.get("name", ""), re.I))), None)
    return (h.get("time") or "21:30") if h else None


def set_lang(lang):
    if lang in ("fr", "en") and ST.get("lang") != lang:
        ST["lang"] = lang


def tick(now=None, lang=None):
    """Une passe du planificateur ; retourne ce qui a été déclenché (utile pour les tests)."""
    now = now or datetime.now(); lang = lang or ST.get("lang", "fr")
    a = S["auto"]
    if not a["enabled"] or not configured() or _in_quiet(now):
        return None
    today, n = now.date().isoformat(), now.hour * 60 + now.minute
    with LOCK:
        runs = ST["runs"].setdefault(today, [])
        for k in [k for k in ST["runs"] if k < (now.date() - timedelta(3)).isoformat()]:
            del ST["runs"][k]
        if len([r for r in runs if not r.startswith("nudge:")]) >= a["max_per_day"]:
            return None
        todo = None
        try:
            recent = bool(ST.get("last_sermon")) and (now - datetime.fromisoformat(ST["last_sermon"])) < timedelta(minutes=45)
        except ValueError:
            recent = False
        sched = [("morning", a["morning"]["on"], a["morning"]["time"]), ("evening", a["evening"]["on"], a["evening"]["time"]),
                 ("examen", a["examen"]["on"], _examen_time()), ("weekly", a["weekly"]["on"] and now.weekday() == a["weekly"]["day"], a["weekly"]["time"])]
        for kind, on, tm in ([] if recent else sched):         # un sermon automatique à la fois (≥ 45 min d'écart)
            if not on or not tm or kind in runs:
                continue
            t = _mins(tm)
            if t <= n < t + 120:
                todo = kind; break
        if todo:
            runs.append(todo); ST["last_sermon"] = now.isoformat(); _save()
    if todo:
        create_sermon(todo, lang, auto=True, audio=a["audio"])
        return todo
    nd = a["nudges"]
    if nd["on"]:
        snap = snapshot(now)
        if not snap:
            return None
        pending = [i for i in snap["_items"] if i["time"] and not i["done"] and n >= _mins(i["time"]) + nd["grace"] and ("nudge:" + i["name"]) not in ST["runs"].get(today, [])]
        last = max([m["ts"] for m in ST["messages"] if m["type"] == "nudge"] or [0])
        if pending and time.time() * 1000 - last > 90 * 60 * 1000 and n - _mins(pending[0]["time"]) < 360:
            names = [p["name"] for p in pending[:3]]
            with LOCK:
                ST["runs"][today] = ST["runs"].get(today, []) + ["nudge:" + p["name"] for p in pending] + ["nudge"]; _save()
            run_nudge(lang, names)
            return "nudge"
    return None


def _loop():
    time.sleep(8)
    while True:
        try:
            tick()
        except Exception as e:
            print("[coach] planificateur :", e)
        time.sleep(30)


# ---------------------------------------------------------------- Web Push (optionnel : pip install pywebpush)
def _vapid():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    if not os.path.exists(P["vapid"]):
        k = ec.generate_private_key(ec.SECP256R1())
        pem = k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        fd = os.open(P["vapid"], os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(pem)
    with open(P["vapid"], "rb") as f:
        k = serialization.load_pem_private_key(f.read(), None)
    pub = k.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(pub).rstrip(b"=").decode()


def push_key():
    if not push_available():
        return {"available": False}
    return {"available": True, "public_key": _vapid()}


def push_subscribe(sub):
    if not isinstance(sub, dict) or not str(sub.get("endpoint", "")).startswith("https://") or not isinstance(sub.get("keys"), dict):
        raise CoachError("bad_sub", "Abonnement invalide")
    with LOCK:
        ST["push"] = [s for s in ST["push"] if s["endpoint"] != sub["endpoint"]] + [{"endpoint": sub["endpoint"], "keys": sub["keys"]}]
        _save()
    return len(ST["push"])


def push_unsubscribe(endpoint):
    with LOCK:
        ST["push"] = [s for s in ST["push"] if s["endpoint"] != endpoint]
        _save()


def notify(title, body, tag="coach", url="./#/coach"):
    """Envoie une notification Web Push à tous les appareils abonnés (silencieux si indisponible)."""
    if not ST["push"] or not push_available():
        return 0
    from pywebpush import WebPushException, webpush
    _vapid(); sent = 0
    for s in list(ST["push"]):
        try:
            webpush(subscription_info=s, data=json.dumps({"title": title, "body": body, "tag": tag, "url": url}),
                    vapid_private_key=P["vapid"], vapid_claims={"sub": "mailto:coach@present.local"}, ttl=3600)
            sent += 1
        except WebPushException as e:
            code = getattr(getattr(e, "response", None), "status_code", 0)
            if code in (404, 410):
                push_unsubscribe(s["endpoint"])
        except Exception as e:
            print("[coach] push :", e)
    return sent


# ---------------------------------------------------------------- test de connexion
def selftest():
    res = {"llm": {"ok": False, "msg": ""}, "tts": {"ok": False, "msg": ""}}
    try:
        out = llm([{"role": "user", "content": "Reply with the single word: OK"}], max_tokens=10, timeout=30)
        res["llm"] = {"ok": True, "msg": out[:40]}
    except CoachError as e:
        res["llm"]["msg"] = e.msg
    prov = S["tts"]["provider"]
    if prov == "off":
        res["tts"] = {"ok": True, "msg": "audio désactivé"}
    elif prov == "edge" and not tts_available():
        res["tts"] = {"ok": False, "msg": "edge-tts non installé : pip install edge-tts"}
    else:
        probe = os.path.join(P["audio"], "_probe.mp3")
        try:
            _synth("Test.", S["tts"]["voice"], probe, prov, "en")
            res["tts"] = {"ok": True, "msg": {"edge": "edge-tts : voix OK", "openai": "TTS OpenAI : voix OK", "eleven": "ElevenLabs : voix OK"}[prov]}
        except CoachError as e:
            res["tts"]["msg"] = e.msg
        finally:
            try:
                os.remove(probe)
            except OSError:
                pass
    return res
