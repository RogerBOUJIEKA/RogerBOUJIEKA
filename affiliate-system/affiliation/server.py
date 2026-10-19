"""Serveur HTTP : API JSON, liens de suivi et tableaux de bord."""

import hmac
import json
import os
import re
import threading
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .core import Affiliation, AffiliationError

STATIC = Path(__file__).parent / "static"
VISITOR_COOKIE = "aff_vid"


class App:
    def __init__(self, affiliation, admin_token, base_url):
        self.aff = affiliation
        self.admin_token = admin_token
        self.base_url = base_url.rstrip("/")
        self.lock = threading.Lock()

    def links(self, code):
        return [{"product_id": p["id"], "product": p["name"],
                 "url": f"{self.base_url}/r/{code}/{p['id']}"}
                for p in self.aff.list_products()]


class HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


ROUTES = []


def route(method, pattern):
    def decorator(fn):
        ROUTES.append((method, re.compile(f"^{pattern}$"), fn))
        return fn
    return decorator


class Handler(BaseHTTPRequestHandler):
    app: App = None
    server_version = "Affiliation/1.0"

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def _dispatch(self, method):
        path = urlsplit(self.path).path
        for m, regex, fn in ROUTES:
            match = regex.match(path)
            if m == method and match:
                try:
                    with self.app.lock:
                        fn(self, *match.groups())
                except HttpError as e:
                    self.send_json({"error": str(e)}, e.status)
                except AffiliationError as e:
                    self.send_json({"error": str(e)}, 400)
                return
        self.send_json({"error": "introuvable"}, 404)

    # --- Utilitaires ----------------------------------------------------

    @property
    def query(self):
        return dict(parse_qsl(urlsplit(self.path).query))

    def body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 1_000_000:
            raise HttpError(413, "requête trop volumineuse")
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            raise HttpError(400, "JSON invalide") from None
        if not isinstance(data, dict):
            raise HttpError(400, "objet JSON attendu")
        return data

    def cookie(self, name):
        jar = SimpleCookie(self.headers.get("Cookie", ""))
        return jar[name].value if name in jar else None

    def require_admin(self):
        auth = self.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        if not hmac.compare_digest(token, self.app.admin_token):
            raise HttpError(401, "jeton administrateur requis")

    def require_affiliate(self):
        affiliate = self.app.aff.authenticate(self.headers.get("X-Api-Key"))
        if affiliate is None:
            raise HttpError(401, "clé API invalide")
        return affiliate

    def send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_file(self, name):
        payload = (STATIC / name).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        if os.environ.get("AFFILIATION_QUIET") != "1":
            super().log_message(fmt, *args)


# --- Pages ---------------------------------------------------------------

@route("GET", "/")
def index(h):
    h.send_file("index.html")


@route("GET", "/dashboard")
def dashboard(h):
    h.send_file("dashboard.html")


@route("GET", "/admin")
def admin_page(h):
    h.send_file("admin.html")


# --- Suivi des clics -----------------------------------------------------

@route("GET", r"/r/([A-Za-z0-9]+)/(\d+)")
def track_click(h, code, product_id):
    try:
        _, visitor_id, url = h.app.aff.record_click(
            code, int(product_id),
            visitor_id=h.cookie(VISITOR_COOKIE),
            ip=h.client_address[0],
            user_agent=h.headers.get("User-Agent"),
            referer=h.headers.get("Referer"),
        )
    except AffiliationError as e:
        raise HttpError(404, str(e)) from None
    # L'identifiant visiteur est transmis au marchand, qui le renvoie lors de la vente.
    parts = urlsplit(url)
    query = urlencode(parse_qsl(parts.query) + [(VISITOR_COOKIE, visitor_id)])
    h.send_response(302)
    h.send_header("Location", urlunsplit(parts._replace(query=query)))
    h.send_header("Set-Cookie", f"{VISITOR_COOKIE}={visitor_id}; Max-Age="
                  f"{h.app.aff.cookie_seconds}; Path=/; HttpOnly; SameSite=Lax")
    h.send_header("Content-Length", "0")
    h.end_headers()


# --- API publique / affiliés ---------------------------------------------

@route("GET", "/api/products")
def products(h):
    h.send_json(h.app.aff.list_products())


@route("POST", "/api/affiliates")
def signup(h):
    data = h.body()
    affiliate, api_key = h.app.aff.register_affiliate(
        data.get("name", "").strip(), data.get("email", "").strip(), data.get("parent_code"))
    h.send_json({"affiliate": affiliate, "api_key": api_key,
                 "links": h.app.links(affiliate["code"]),
                 "referral_link": f"{h.app.base_url}/?ref={affiliate['code']}"}, 201)


@route("GET", "/api/me")
def me(h):
    affiliate = h.require_affiliate()
    h.send_json({"affiliate": affiliate,
                 "stats": h.app.aff.stats(affiliate["id"]),
                 "links": h.app.links(affiliate["code"]),
                 "referral_link": f"{h.app.base_url}/?ref={affiliate['code']}",
                 "commissions": h.app.aff.list_commissions(affiliate["id"])[:100]})


# --- API marchand / administration ---------------------------------------

@route("POST", "/api/conversions")
def conversion(h):
    h.require_admin()
    data = h.body()
    for key in ("order_id", "product_id", "amount"):
        if key not in data:
            raise HttpError(400, f"champ manquant : {key}")
    result = h.app.aff.record_conversion(
        data["order_id"], int(data["product_id"]), data["amount"],
        visitor_id=data.get("visitor_id"), affiliate_code=data.get("affiliate_code"))
    h.send_json({"attributed": result is not None, **(result or {})},
                201 if result else 200)


@route("POST", "/api/products")
def create_product(h):
    h.require_admin()
    data = h.body()
    h.send_json(h.app.aff.add_product(data.get("name"), data.get("url", ""),
                                      data.get("commission_type"),
                                      data.get("commission_value", -1)), 201)


@route("GET", "/api/admin/overview")
def overview(h):
    h.require_admin()
    h.send_json({"affiliates": h.app.aff.leaderboard(),
                 "products": h.app.aff.list_products(),
                 "commissions": h.app.aff.list_commissions(status=h.query.get("status"))[:200]})


@route("POST", r"/api/commissions/(\d+)/status")
def commission_status(h, commission_id):
    h.require_admin()
    h.app.aff.set_commission_status(int(commission_id), h.body().get("status"))
    h.send_json({"ok": True})


@route("POST", r"/api/affiliates/(\d+)/pay")
def pay(h, affiliate_id):
    h.require_admin()
    h.send_json({"paid": h.app.aff.pay_affiliate(int(affiliate_id))})


def make_server(host="127.0.0.1", port=8000, db_path="affiliation.db", admin_token=None,
                base_url=None, tier2_rate=0.10):
    if not admin_token:
        raise SystemExit("Définissez AFFILIATION_ADMIN_TOKEN (jeton administrateur).")
    app = App(Affiliation(db_path, tier2_rate=tier2_rate), admin_token,
              base_url or f"http://{host}:{port}")
    handler = type("BoundHandler", (Handler,), {"app": app})
    return ThreadingHTTPServer((host, port), handler)


def main():
    env = os.environ.get
    server = make_server(
        host=env("AFFILIATION_HOST", "127.0.0.1"),
        port=int(env("AFFILIATION_PORT", "8000")),
        db_path=env("AFFILIATION_DB", "affiliation.db"),
        admin_token=env("AFFILIATION_ADMIN_TOKEN"),
        base_url=env("AFFILIATION_BASE_URL"),
        tier2_rate=float(env("AFFILIATION_TIER2_RATE", "0.10")),
    )
    host, port = server.server_address[:2]
    print(f"Système d'affiliation démarré sur http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
