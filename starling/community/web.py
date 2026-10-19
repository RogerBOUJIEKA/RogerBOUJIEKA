"""Application web Starling : pages HTML rendues côté serveur."""

import hmac
import html
import json
import os
import re
import secrets
import threading
import time
import traceback
from http.cookies import CookieError, SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit

from affiliation.core import AffiliationError

from . import markdown, news, payments, seed
from .models import CATEGORIES, LEVELS, Starling

e = html.escape
STATIC = Path(__file__).parent / "static"
SESSION_COOKIE = "starling_session"
REF_COOKIE = "starling_ref"
VISITOR_COOKIE = "aff_vid"
FLASH_COOKIE = "starling_flash"
COOKIE_DAYS = 30
YOUTUBE = re.compile(r"https://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]{11})")

FLASH = {
    "welcome": "Bienvenue dans Starling ! Commencez par une leçon gratuite ou présentez-vous à la communauté.",
    "login": "Bon retour parmi nous !",
    "logout": "Vous êtes déconnecté. À bientôt !",
    "post_created": "Votre publication est en ligne.",
    "post_deleted": "Publication supprimée.",
    "comment_added": "Commentaire publié.",
    "lesson_done": "Leçon terminée, bravo !",
    "premium": "Bienvenue dans Starling Premium ! Toutes les formations sont débloquées.",
    "course_created": "Formation créée.",
    "lesson_created": "Leçon ajoutée.",
    "feed_added": "Flux ajouté.",
    "news_refresh": "Actualisation de la veille lancée : rechargez la page dans quelques secondes.",
    "commission_updated": "Commission mise à jour.",
    "paid": "Paiement enregistré.",
}

LOGO = ('<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="sg" x1="0" x2="1">'
        '<stop offset="0" stop-color="#5b45d6"/><stop offset="1" stop-color="#0b8f80"/>'
        '</linearGradient></defs><g fill="url(#sg)"><circle cx="5" cy="21" r="2"/>'
        '<circle cx="10" cy="15.5" r="2.5"/><circle cx="16.5" cy="11.5" r="3"/>'
        '<circle cx="23" cy="12" r="2.5"/><circle cx="27.5" cy="16" r="1.8"/>'
        '<circle cx="13" cy="22" r="1.6"/><circle cx="19.5" cy="19" r="1.4"/>'
        '<circle cx="25" cy="22.5" r="1.1"/></g></svg>')


class HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


# --- Mise en forme -----------------------------------------------------------

def eur(amount):
    return f"{amount:,.2f}".replace(",", " ").replace(".", ",") + " €"


def date_fr(ts):
    return time.strftime("%d/%m/%Y", time.localtime(ts))


def ago(ts):
    delta = int(time.time() - ts)
    if delta < 60:
        return "à l'instant"
    if delta < 3600:
        return f"il y a {delta // 60} min"
    if delta < 86400:
        return f"il y a {delta // 3600} h"
    if delta < 30 * 86400:
        return f"il y a {delta // 86400} j"
    return date_fr(ts)


def excerpt(text, limit=200):
    text = re.sub(r"[#*`>\[\]]", "", re.sub(r"\s+", " ", text)).strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def pct(part, total):
    return round(100 * part / total) if total else 0


def video_html(url):
    m = YOUTUBE.match(url or "")
    if m:
        return (f'<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/{m.group(1)}"'
                ' title="Vidéo de la leçon" allow="encrypted-media; picture-in-picture"'
                ' allowfullscreen loading="lazy"></iframe></div>')
    return (f'<p><a class="btn secondary" href="{e(url)}" target="_blank" rel="noopener">'
            "▶ Voir la vidéo</a></p>")


def stat(label, value):
    return f'<div class="stat"><b>{e(str(value))}</b><span>{e(label)}</span></div>'


def table(headers, rows, numeric=()):
    head = "".join(f'<th class="{"num" if i in numeric else ""}">{h}</th>'
                   for i, h in enumerate(headers))
    body = "".join("<tr>" + "".join(f'<td class="{"num" if i in numeric else ""}">{c}</td>'
                                    for i, c in enumerate(row)) + "</tr>" for row in rows)
    if not rows:
        body = f'<tr><td colspan="{len(headers)}" class="muted">Rien pour le moment.</td></tr>'
    return f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


# --- Application et routage --------------------------------------------------

class App:
    def __init__(self, starling, base_url, stripe=None):
        self.s = starling
        self.base_url = base_url.rstrip("/")
        self.stripe = stripe
        self.lock = threading.Lock()
        self.secure_cookies = self.base_url.startswith("https://")


ROUTES = []


def route(method, pattern, auth=None, csrf=True):
    """auth : None (public), "member" ou "admin". Les POST vérifient le jeton CSRF."""
    def decorator(fn):
        ROUTES.append((method, re.compile(f"^{pattern}$"), auth, csrf, fn))
        return fn
    return decorator


class Handler(BaseHTTPRequestHandler):
    app: App = None
    server_version = "Starling/1.0"

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def _dispatch(self, method):
        url = urlsplit(self.path)
        path = url.path.rstrip("/") or "/"
        self.query = {k: v[0] for k, v in parse_qs(url.query).items()}
        self.cookies_out, self._raw, self._form = [], None, None
        self.user, self.csrf = None, None
        for m, regex, auth, csrf, fn in ROUTES:
            match = regex.match(path)
            if not match or m != method:
                continue
            with self.app.lock:
                try:
                    self.user, self.csrf = self.app.s.session_user(self.cookie(SESSION_COOKIE))
                    if auth and not self.user:
                        return self.redirect("/connexion?next=" + quote(self.path, safe=""))
                    if auth == "admin" and not self.user["is_admin"]:
                        return self.not_found()
                    if method == "POST" and csrf and not (
                            self.csrf and hmac.compare_digest(self.form().get("csrf", ""), self.csrf)):
                        return self.render("Session expirée", '<div class="card"><h1>Session expirée'
                                           "</h1><p>Rechargez la page puis réessayez.</p></div>",
                                           status=403)
                    fn(self, *match.groups())
                except HttpError as exc:
                    self.render("Erreur", f'<div class="card"><p>{e(str(exc))}</p></div>',
                                status=exc.status)
                except AffiliationError as exc:
                    self.render("Erreur", f'<div class="card"><p>{e(str(exc))}</p></div>', status=404)
                except Exception:
                    traceback.print_exc()
                    self.render("Erreur", '<div class="card"><p>Une erreur inattendue est survenue.'
                                "</p></div>", status=500)
            return
        with self.app.lock:
            self.user, self.csrf = self.app.s.session_user(self.cookie(SESSION_COOKIE))
            self.not_found()

    # --- Requête --------------------------------------------------------

    def raw_body(self):
        if self._raw is None:
            length = int(self.headers.get("Content-Length") or 0)
            if length > 2_000_000:
                raise HttpError(413, "Requête trop volumineuse.")
            self._raw = self.rfile.read(length)
        return self._raw

    def form(self):
        if self._form is None:
            parsed = parse_qs(self.raw_body().decode("utf-8", "replace"), keep_blank_values=True)
            self._form = {k: v[0] for k, v in parsed.items()}
        return self._form

    def cookie(self, name):
        try:
            jar = SimpleCookie(self.headers.get("Cookie", ""))
        except CookieError:
            return None
        return jar[name].value if name in jar else None

    @property
    def is_premium(self):
        return bool(self.user and self.user["is_premium"])

    # --- Réponse --------------------------------------------------------

    def set_cookie(self, name, value, max_age):
        secure = "; Secure" if self.app.secure_cookies else ""
        self.cookies_out.append(f"{name}={value}; Max-Age={max_age}; Path=/; HttpOnly;"
                                f" SameSite=Lax{secure}")

    def send(self, status, body=b"", content_type="text/html; charset=utf-8", headers=()):
        self.send_response(status)
        for key, value in headers:
            self.send_header(key, value)
        for cookie in self.cookies_out:
            self.send_header("Set-Cookie", cookie)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; img-src 'self' data: https:; style-src 'self'"
                         " 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
                         " frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def redirect(self, location, flash=None):
        if flash:
            self.set_cookie(FLASH_COOKIE, flash, 60)
        self.send(303, headers=[("Location", location)])

    def render(self, title, content, active=None, status=200, error=None):
        self.send(status, layout(self, title, content, active, error).encode())

    def send_json(self, data, status=200):
        self.send(status, json.dumps(data).encode(), "application/json")

    def not_found(self):
        self.render("Page introuvable", '<div class="card"><h1>Page introuvable</h1>'
                    '<p><a href="/">Retour à l\'accueil</a></p></div>', status=404)

    def log_message(self, fmt, *args):
        if os.environ.get("STARLING_QUIET") != "1":
            super().log_message(fmt, *args)


def csrf_field(h):
    return f'<input type="hidden" name="csrf" value="{e(h.csrf or "")}">'


def post_button(h, action, label, cls="btn ghost small", extra=""):
    return (f'<form method="post" action="{action}" class="inline">{csrf_field(h)}{extra}'
            f'<button class="{cls}">{label}</button></form>')


def layout(h, title, content, active=None, error=None):
    links = [("/communaute", "Communauté", "communaute"), ("/formations", "Formations", "formations"),
             ("/veille", "Veille IA", "veille")]
    if h.user:
        links.append(("/affiliation", "Affiliation", "affiliation"))
        if h.user["is_admin"]:
            links.append(("/admin", "Admin", "admin"))
    else:
        links.append(("/premium", "Tarifs", "premium"))
    nav = "".join(f'<a href="{href}" class="{"active" if key == active else ""}">{label}</a>'
                  for href, label, key in links)
    if h.user:
        badge = ('<span class="tag teal">Premium</span>' if h.user["is_premium"]
                 else '<a class="tag" href="/premium">Passer Premium</a>')
        account = (f'<span class="small">{e(h.user["name"])}</span>{badge}'
                   + post_button(h, "/deconnexion", "Déconnexion"))
    else:
        account = ('<a href="/connexion" class="btn ghost small">Connexion</a>'
                   '<a href="/inscription" class="btn small">Rejoindre</a>')
    flash = ""
    key = h.cookie(FLASH_COOKIE)
    if key:
        h.set_cookie(FLASH_COOKIE, "", 0)
        if key in FLASH:
            flash = f'<div class="flash">{e(FLASH[key])}</div>'
    if error:
        flash += f'<div class="flash error">{e(error)}</div>'
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} · Starling</title>
<meta name="description" content="Starling : la communauté francophone pour apprendre l'IA, partager sa veille et en faire un revenu.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/starling.css">
</head>
<body>
<header class="topbar"><div class="container">
  <a class="brand" href="/">{LOGO}Starling</a>
  <nav class="nav">{nav}</nav>
  <div class="account">{account}</div>
</div></header>
<main><div class="container">{flash}{content}</div></main>
<footer><div class="container row spread">
  <span>© Starling, la communauté qui apprend l'IA ensemble</span>
  <span><a href="/premium">Tarifs</a> · <a href="/affiliation">Programme d'affiliation</a> · <a href="/veille">Veille IA</a></span>
</div></footer>
</body>
</html>"""


def safe_next(target):
    if target and target.startswith("/") and not target.startswith("//") and "\\" not in target:
        return target
    return "/communaute"


# --- Fichiers statiques --------------------------------------------------------

@route("GET", "/static/starling.css")
def stylesheet(h):
    h.send(200, (STATIC / "starling.css").read_bytes(), "text/css; charset=utf-8",
           [("Cache-Control", "public, max-age=3600")])


@route("GET", "/favicon.svg")
def favicon(h):
    svg = LOGO.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
    h.send(200, svg.encode(), "image/svg+xml", [("Cache-Control", "public, max-age=86400")])


# --- Accueil -------------------------------------------------------------------

@route("GET", "/")
def home(h):
    s = h.app.s
    referrer = None
    code = h.query.get("ref", "")
    if re.fullmatch(r"[A-Za-z0-9]{1,32}", code):
        referrer = s.user_by_affiliate_code(code)
        if referrer and not (h.user and h.user["id"] == referrer["id"]):
            visitor = h.cookie(VISITOR_COOKIE)
            visitor = visitor if visitor and re.fullmatch(r"[0-9a-f]{32}", visitor) else None
            visitor = s.record_referral_visit(code, visitor_id=visitor, ip=h.client_address[0],
                                              user_agent=h.headers.get("User-Agent"),
                                              referer=h.headers.get("Referer"))
            h.set_cookie(REF_COOKIE, code, COOKIE_DAYS * 86400)
            h.set_cookie(VISITOR_COOKIE, visitor, COOKIE_DAYS * 86400)
    commission = s.commission_percent
    example = 20 * s.price * commission / 100
    # Le code est aussi transmis dans l'URL : le parrainage survit aux cookies bloqués.
    signup_href = f"/inscription?ref={code}" if referrer else "/inscription"
    cta = ('<a class="btn large" href="/communaute">Accéder à la communauté</a>' if h.user
           else f'<a class="btn large" href="{signup_href}">Rejoindre gratuitement</a>')
    invite = (f'<div class="notice invite">🎉 <strong>{e(referrer["name"])}</strong> vous invite'
              " à rejoindre Starling.</div>" if referrer and not h.user else "")
    courses = "".join(
        f'<a class="card" href="/formations/{c["id"]}" style="color:inherit;text-decoration:none">'
        f'<span class="tag plain">{e(c["level"])}</span><h3 style="margin-top:10px">{e(c["title"])}</h3>'
        f'<p class="muted small">{e(c["description"])}</p>'
        f'<span class="small muted">{c["lesson_count"]} leçons · {c["free_count"]} gratuites</span></a>'
        for c in s.list_courses()[:6])
    features = [
        ("🎓", "Des formations IA concrètes",
         "Du premier prompt à l'automatisation de votre activité : des leçons courtes, pratiques, en français."),
        ("💬", "Une communauté qui s'entraide",
         "Posez vos questions, partagez vos projets et vos réussites avec des membres qui avancent comme vous."),
        ("📡", "La veille IA, triée pour vous",
         "Les annonces des grands acteurs de l'IA réunies en un seul fil, mis à jour automatiquement."),
        ("💸", "Gagnez en recommandant",
         f"Chaque membre a son lien : {commission:g} % de chaque abonnement de vos filleuls, tous les mois."),
    ]
    feature_html = "".join(f'<div class="card feature"><div class="icon">{icon}</div><h3>{title}</h3>'
                           f'<p class="muted small">{text}</p></div>' for icon, title, text in features)
    content = f"""
{invite}
<section class="hero">
  <span class="tag eyebrow">Communauté francophone · Intelligence artificielle</span>
  <h1>Apprenez l'IA <span class="gradient-text">ensemble</span>, et faites-en un revenu.</h1>
  <p class="lead">Formations pratiques, veille quotidienne et entraide entre membres.
  Comme une nuée d'étourneaux, on va plus loin quand on avance ensemble.</p>
  <div class="row">{cta}<a class="btn secondary large" href="/formations">Voir les formations</a></div>
</section>
<section class="section"><div class="grid cols-4">{feature_html}</div></section>
<section class="section"><h2>Les formations</h2><div class="grid cols-3">{courses}</div></section>
<section class="section" id="tarifs"><h2>Tarifs</h2>{pricing(h, signup_href)}</section>
<section class="section"><h2>Le programme d'affiliation</h2>
  <div class="grid cols-3 steps">
    <div class="card"><h3>Rejoignez Starling</h3><p class="muted small">L'inscription est gratuite et votre lien de parrainage est créé automatiquement.</p></div>
    <div class="card"><h3>Partagez votre lien</h3><p class="muted small">Réseaux sociaux, newsletter, YouTube, bouche-à-oreille : chaque visite est suivie pendant {COOKIE_DAYS} jours.</p></div>
    <div class="card"><h3>Touchez vos commissions</h3><p class="muted small">{commission:g} % de chaque paiement de vos filleuls, chaque mois, plus {s.tier2_rate * 100:g} % des commissions de leurs propres filleuls.</p></div>
  </div>
  <p class="muted" style="text-align:center;margin-top:20px">Exemple : 20 filleuls Premium = <strong>{eur(example)} par mois</strong> pour vous.</p>
</section>
<section class="section" style="text-align:center"><h2>Prêt à rejoindre la nuée ?</h2>{cta}</section>"""
    h.render("Apprendre l'IA ensemble", content)


def pricing(h, signup_href="/inscription"):
    s = h.app.s
    separator = "&" if "?" in signup_href else "?"
    if h.user and h.user["is_premium"]:
        premium_cta = '<span class="tag teal">Votre formule actuelle</span>'
    elif h.user:
        premium_cta = post_button(h, "/premium/checkout", "Passer Premium", "btn")
    else:
        premium_cta = f'<a class="btn" href="{signup_href}{separator}next=/premium">Commencer</a>'
    return f"""<div class="grid cols-2" style="max-width:760px;margin:0 auto">
  <div class="card plan"><h3>Gratuit</h3><div class="price">0 €</div>
    <ul><li>Accès à la communauté</li><li>Veille IA quotidienne</li><li>Leçons d'introduction</li><li>Programme d'affiliation</li></ul>
    {f'<a class="btn secondary" href="{signup_href}">Créer mon compte</a>' if not h.user else ''}</div>
  <div class="card plan featured"><h3>Premium</h3><div class="price">{eur(s.price)} <small>/ mois</small></div>
    <ul><li>Toutes les formations et leçons</li><li>Les nouvelles formations dès leur sortie</li><li>Badge Premium dans la communauté</li><li>Programme d'affiliation</li></ul>
    {premium_cta}</div>
</div>"""


# --- Comptes -------------------------------------------------------------------

def signup_page(h, error=None, values=None):
    values = values or {}
    code = values.get("ref") or h.query.get("ref") or h.cookie(REF_COOKIE) or ""
    referrer = h.app.s.user_by_affiliate_code(code) if re.fullmatch(r"[A-Za-z0-9]{1,32}", code) else None
    invite = (f'<p class="notice">Invité par <strong>{e(referrer["name"])}</strong></p>'
              if referrer else "")
    content = f"""<div class="form-narrow">
<div class="card"><h1>Rejoindre Starling</h1><p class="muted">Gratuit, sans carte bancaire.</p>{invite}
<form method="post" action="/inscription">
  <input type="hidden" name="ref" value="{e(code if referrer else '')}">
  <input type="hidden" name="next" value="{e(values.get('next') or h.query.get('next', ''))}">
  <label for="name">Prénom ou pseudo</label><input type="text" id="name" name="name" required maxlength="60" value="{e(values.get('name', ''))}">
  <label for="email">Email</label><input type="email" id="email" name="email" required value="{e(values.get('email', ''))}">
  <label for="password">Mot de passe (8 caractères minimum)</label><input type="password" id="password" name="password" required minlength="8">
  <p style="margin-top:20px"><button class="btn" style="width:100%">Créer mon compte</button></p>
</form>
<p class="small muted">Déjà membre ? <a href="/connexion">Connectez-vous</a></p></div></div>"""
    h.render("Inscription", content, error=error)


@route("GET", "/inscription")
def signup(h):
    if h.user:
        return h.redirect("/communaute")
    signup_page(h)


@route("POST", "/inscription", csrf=False)
def signup_post(h):
    form = h.form()
    try:
        user = h.app.s.register(form.get("name"), form.get("email"), form.get("password"),
                                referrer_code=form.get("ref") or None)
    except AffiliationError as exc:
        return signup_page(h, str(exc), form)
    h.set_cookie(SESSION_COOKIE, h.app.s.create_session(user["id"]), COOKIE_DAYS * 86400)
    h.set_cookie(REF_COOKIE, "", 0)
    h.redirect(safe_next(form.get("next")) if form.get("next") else "/communaute", "welcome")


def login_page(h, error=None, email=""):
    next_value = h.form().get("next", "") if h.command == "POST" else h.query.get("next", "")
    content = f"""<div class="form-narrow"><div class="card"><h1>Connexion</h1>
<form method="post" action="/connexion">
  <input type="hidden" name="next" value="{e(next_value)}">
  <label for="email">Email</label><input type="email" id="email" name="email" required value="{e(email)}">
  <label for="password">Mot de passe</label><input type="password" id="password" name="password" required>
  <p style="margin-top:20px"><button class="btn" style="width:100%">Se connecter</button></p>
</form>
<p class="small muted">Pas encore membre ? <a href="/inscription">Rejoignez Starling gratuitement</a></p></div></div>"""
    h.render("Connexion", content, error=error)


@route("GET", "/connexion")
def login(h):
    if h.user:
        return h.redirect(safe_next(h.query.get("next")))
    login_page(h)


@route("POST", "/connexion", csrf=False)
def login_post(h):
    form = h.form()
    user = h.app.s.authenticate(form.get("email"), form.get("password"))
    if user is None:
        return login_page(h, "Email ou mot de passe incorrect.", form.get("email", ""))
    h.set_cookie(SESSION_COOKIE, h.app.s.create_session(user["id"]), COOKIE_DAYS * 86400)
    h.redirect(safe_next(form.get("next")), "login")


@route("POST", "/deconnexion", auth="member")
def logout(h):
    h.app.s.end_session(h.cookie(SESSION_COOKIE))
    h.set_cookie(SESSION_COOKIE, "", 0)
    h.redirect("/", "logout")


# --- Communauté ----------------------------------------------------------------

def community_page(h, error=None, values=None):
    values = values or {}
    category = h.query.get("cat") if h.query.get("cat") in CATEGORIES else None
    posts = h.app.s.list_posts(category, h.user["id"])
    side = [f'<a href="/communaute" class="{"" if category else "active"}">Tout</a>']
    side += [f'<a href="/communaute?cat={key}" class="{"active" if key == category else ""}">'
             f"{e(label)}</a>" for key, label in CATEGORIES.items()]
    selected = values.get("category") or category or "discussions"
    options = "".join(f'<option value="{k}" {"selected" if k == selected else ""}>{e(v)}</option>'
                      for k, v in CATEGORIES.items())
    cards = "".join(f"""<article class="card post-card {'pinned' if p['pinned'] else ''}">
  <div class="meta"><span class="tag {'teal' if p['pinned'] else 'plain'}">{'📌 ' if p['pinned'] else ''}{e(CATEGORIES[p['category']])}</span>
  <span>{e(p['author'])}{' <span class="tag teal">Premium</span>' if p['author_premium'] else ''}</span><span>{ago(p['created_at'])}</span></div>
  <h3><a href="/communaute/{p['id']}">{e(p['title'])}</a></h3>
  <p class="muted small">{e(excerpt(p['body']))}</p>
  <div class="meta"><span>{'♥' if p['liked'] else '♡'} {p['like_count']}</span><span>💬 {p['comment_count']}</span></div>
</article>""" for p in posts) or '<div class="card muted">Aucune publication ici pour le moment. Lancez la discussion !</div>'
    content = f"""<div class="page-head"><h1>Communauté</h1>
<p>Questions, découvertes, projets : partagez avec les autres membres et apprenez ensemble.</p></div>
<div class="layout-side">
  <nav class="side-nav">{''.join(side)}</nav>
  <div class="stack">
    <details class="card composer" {'open' if error else ''}><summary>✏️ Nouvelle publication</summary>
      <form method="post" action="/communaute">{csrf_field(h)}
        <label for="category">Catégorie</label><select id="category" name="category">{options}</select>
        <label for="title">Titre</label><input type="text" id="title" name="title" required maxlength="150" value="{e(values.get('title', ''))}">
        <label for="body">Message <span class="muted small">(Markdown simple accepté)</span></label>
        <textarea id="body" name="body" required>{e(values.get('body', ''))}</textarea>
        <p style="margin-top:12px"><button class="btn">Publier</button></p>
      </form>
    </details>
    {cards}
  </div>
</div>"""
    h.render("Communauté", content, "communaute", error=error)


@route("GET", "/communaute", auth="member")
def community(h):
    community_page(h)


@route("POST", "/communaute", auth="member")
def community_post(h):
    form = h.form()
    try:
        post_id = h.app.s.create_post(h.user["id"], form.get("category"), form.get("title"),
                                      form.get("body"))
    except AffiliationError as exc:
        return community_page(h, str(exc), form)
    h.redirect(f"/communaute/{post_id}", "post_created")


def post_page(h, post_id, error=None):
    s = h.app.s
    post = s.get_post(int(post_id), h.user["id"])
    comments = "".join(
        f'<div class="comment"><div class="meta"><strong>{e(c["author"])}</strong>'
        f'<span>{ago(c["created_at"])}</span></div><div class="prose">{markdown.render(c["body"])}</div></div>'
        for c in s.list_comments(post["id"]))
    can_delete = post["user_id"] == h.user["id"] or h.user["is_admin"]
    like_label = f'{"♥" if post["liked"] else "♡"} {post["like_count"]} J\'aime'
    content = f"""<p class="small"><a href="/communaute?cat={post['category']}">← {e(CATEGORIES[post['category']])}</a></p>
<article class="card">
  <div class="meta"><span class="tag plain">{e(CATEGORIES[post['category']])}</span><span>{e(post['author'])}</span><span>{ago(post['created_at'])}</span></div>
  <h1 style="margin-top:10px">{e(post['title'])}</h1>
  <div class="prose">{markdown.render(post['body'])}</div>
  <div class="row" style="margin-top:12px">{post_button(h, f"/communaute/{post['id']}/jaime", like_label)}
  {post_button(h, f"/communaute/{post['id']}/supprimer", "Supprimer", "btn danger small") if can_delete else ''}</div>
</article>
<div class="card" id="commentaires"><h2>Commentaires ({post['comment_count']})</h2>{comments or '<p class="muted">Soyez le premier à répondre.</p>'}
  <form method="post" action="/communaute/{post['id']}/commentaires" style="margin-top:16px">{csrf_field(h)}
    <label for="body">Votre réponse</label><textarea id="body" name="body" required></textarea>
    <p style="margin-top:12px"><button class="btn">Répondre</button></p>
  </form>
</div>"""
    h.render(post["title"], content, "communaute", error=error)


@route("GET", r"/communaute/(\d+)", auth="member")
def post_detail(h, post_id):
    post_page(h, post_id)


@route("POST", r"/communaute/(\d+)/commentaires", auth="member")
def comment_post(h, post_id):
    try:
        h.app.s.add_comment(int(post_id), h.user["id"], h.form().get("body"))
    except AffiliationError as exc:
        return post_page(h, post_id, str(exc))
    h.redirect(f"/communaute/{post_id}#commentaires", "comment_added")


@route("POST", r"/communaute/(\d+)/jaime", auth="member")
def like_post(h, post_id):
    h.app.s.toggle_like(int(post_id), h.user["id"])
    h.redirect(f"/communaute/{post_id}")


@route("POST", r"/communaute/(\d+)/supprimer", auth="member")
def delete_post(h, post_id):
    h.app.s.delete_post(int(post_id), h.user)
    h.redirect("/communaute", "post_deleted")


# --- Formations ----------------------------------------------------------------

@route("GET", "/formations")
def courses(h):
    user_id = h.user["id"] if h.user else None
    cards = []
    for c in h.app.s.list_courses(user_id):
        progress = (f'<div class="progress" style="margin-top:12px"><span style="width:{pct(c["completed"], c["lesson_count"])}%"></span></div>'
                    f'<p class="small muted" style="margin:6px 0 0">{c["completed"]}/{c["lesson_count"]} leçons terminées</p>'
                    if h.user else f'<p class="small muted">{c["lesson_count"]} leçons · {c["free_count"]} gratuites</p>')
        cards.append(f'<a class="card" href="/formations/{c["id"]}" style="color:inherit;text-decoration:none">'
                     f'<span class="tag plain">{e(c["level"])}</span>'
                     f'<h3 style="margin-top:10px">{e(c["title"])}</h3>'
                     f'<p class="muted small">{e(c["description"])}</p>{progress}</a>')
    upsell = ("" if h.is_premium else
              '<div class="notice" style="margin-bottom:16px">Les leçons d\'introduction sont gratuites. '
              '<a href="/premium">Passez Premium</a> pour débloquer toutes les formations.</div>')
    content = f"""<div class="page-head"><h1>Formations</h1>
<p>Des parcours courts et pratiques pour utiliser l'IA dans votre quotidien et votre activité.</p></div>
{upsell}<div class="grid cols-3">{''.join(cards) or '<p class="muted">Aucune formation pour le moment.</p>'}</div>"""
    h.render("Formations", content, "formations")


@route("GET", r"/formations/(\d+)")
def course_detail(h, course_id):
    course = h.app.s.get_course(int(course_id), h.user["id"] if h.user else None)
    items, locked = [], 0
    for lesson in course["lessons"]:
        accessible = lesson["is_free"] or h.is_premium
        locked += not accessible
        icon = "✅" if lesson["completed"] else ("▶️" if accessible else "🔒")
        free = ' <span class="tag teal">Gratuit</span>' if lesson["is_free"] else ""
        items.append(f'<li><span class="status">{icon}</span><a href="/lecons/{lesson["id"]}">'
                     f'{lesson["position"]}. {e(lesson["title"])}</a>{free}</li>')
    done = sum(l["completed"] for l in course["lessons"])
    progress = (f'<div class="progress"><span style="width:{pct(done, len(course["lessons"]))}%"></span></div>'
                f'<p class="small muted">{done}/{len(course["lessons"])} leçons terminées</p>' if h.user else "")
    upsell = (f'<div class="card paywall"><h3>🔒 {locked} leçon{"s" if locked > 1 else ""} réservée{"s" if locked > 1 else ""} aux membres Premium</h3>'
              f'<p class="muted">Débloquez toutes les formations pour {eur(h.app.s.price)} par mois.</p>'
              '<a class="btn" href="/premium">Passer Premium</a></div>' if locked else "")
    content = f"""<p class="small"><a href="/formations">← Toutes les formations</a></p>
<div class="page-head"><span class="tag plain">{e(course['level'])}</span><h1 style="margin-top:10px">{e(course['title'])}</h1>
<p>{e(course['description'])}</p>{progress}</div>
<div class="card"><ul class="lesson-list">{''.join(items) or '<li class="muted">Leçons à venir.</li>'}</ul></div>
{upsell}"""
    h.render(course["title"], content, "formations")


@route("GET", r"/lecons/(\d+)", auth="member")
def lesson_detail(h, lesson_id):
    s = h.app.s
    lesson = s.get_lesson(int(lesson_id), h.user["id"])
    crumbs = (f'<p class="small"><a href="/formations">Formations</a> › '
              f'<a href="/formations/{lesson["course_id"]}">{e(lesson["course_title"])}</a></p>')
    if not s.can_access(h.user, lesson):
        body = (f'<div class="card paywall"><h2>🔒 Leçon réservée aux membres Premium</h2>'
                f'<p class="muted">Passez Premium pour {eur(s.price)} par mois et débloquez toutes '
                'les formations Starling.</p>' + pricing(h) + "</div>")
        return h.render(lesson["title"], f'{crumbs}<h1>{e(lesson["title"])}</h1>{body}', "formations")
    nav = []
    if lesson["prev_id"]:
        nav.append(f'<a class="btn secondary" href="/lecons/{lesson["prev_id"]}">← Précédente</a>')
    if lesson["completed"]:
        nav.append('<span class="tag teal">✓ Leçon terminée</span>')
    else:
        nav.append(post_button(h, f"/lecons/{lesson['id']}/terminer", "Marquer comme terminée", "btn"))
    if lesson["next_id"]:
        nav.append(f'<a class="btn secondary" href="/lecons/{lesson["next_id"]}">Suivante →</a>')
    content = f"""{crumbs}<article class="card">
<h1>{e(lesson['title'])}</h1>
{video_html(lesson['video_url']) if lesson['video_url'] else ''}
<div class="prose">{markdown.render(lesson['content'])}</div>
<div class="row" style="margin-top:24px">{''.join(nav)}</div></article>
<p class="muted small" style="margin-top:16px">Une question sur cette leçon ? <a href="/communaute?cat=questions">Posez-la à la communauté</a>.</p>"""
    h.render(lesson["title"], content, "formations")


@route("POST", r"/lecons/(\d+)/terminer", auth="member")
def lesson_complete(h, lesson_id):
    s = h.app.s
    s.complete_lesson(h.user, int(lesson_id))
    lesson = s.get_lesson(int(lesson_id))
    h.redirect(f"/lecons/{lesson['next_id']}" if lesson["next_id"]
               else f"/formations/{lesson['course_id']}", "lesson_done")


# --- Veille IA -----------------------------------------------------------------

@route("GET", "/veille")
def watch(h):
    items = "".join(
        f'<article class="card news-item"><div class="meta"><span class="tag plain">{e(n["source"])}</span>'
        f'<span>{date_fr(n["published_at"])}</span></div>'
        f'<h3><a href="{e(n["url"])}" target="_blank" rel="noopener nofollow">{e(n["title"])}</a></h3>'
        f'<p class="muted small">{e(n["summary"])}</p></article>'
        for n in h.app.s.list_news())
    if not items:
        items = ('<div class="card muted">La veille se remplit automatiquement toutes les heures '
                 "à partir des sources suivies. Revenez bientôt !</div>")
    share = ('<a class="btn secondary" href="/communaute?cat=veille">Partager une actu</a>' if h.user
             else '<a class="btn secondary" href="/inscription">Rejoindre pour en discuter</a>')
    content = f"""<div class="page-head row spread"><div><h1>Veille IA</h1>
<p>Les dernières annonces des acteurs de l'intelligence artificielle, réunies au même endroit.</p></div>{share}</div>
<div class="stack">{items}</div>"""
    h.render("Veille IA", content, "veille")


# --- Premium et paiements ------------------------------------------------------

def premium_page(h, error=None):
    s = h.app.s
    status = ""
    if h.user and h.user["is_admin"]:
        status = '<p class="notice">Compte administrateur : accès complet.</p>'
    elif h.is_premium:
        status = (f'<p class="notice">Votre accès Premium est actif jusqu\'au '
                  f'{date_fr(h.user["premium_until"])} (renouvelé automatiquement).</p>')
    demo = ("" if h.app.stripe else
            '<p class="notice" style="margin-top:16px">Mode démo : aucun paiement réel n\'est '
            "effectué. Configurez Stripe pour encaisser de vrais abonnements.</p>")
    content = f"""<div class="page-head" style="text-align:center"><h1>Starling Premium</h1>
<p style="margin:0 auto">Toutes les formations, les nouvelles dès leur sortie, et la communauté en illimité.</p></div>
{status}{pricing(h)}{demo}"""
    h.render("Premium", content, "premium", error=error)


@route("GET", "/premium")
def premium(h):
    premium_page(h)


@route("POST", "/premium/checkout", auth="member")
def checkout(h):
    s, app = h.app.s, h.app
    if h.is_premium:
        return h.redirect("/formations")
    if app.stripe:
        try:
            url = app.stripe.create_checkout(h.user, f"{app.base_url}/premium/merci",
                                             f"{app.base_url}/premium")
        except payments.PaymentError as exc:
            return premium_page(h, f"Le paiement n'a pas pu démarrer : {exc}")
        return h.send(303, headers=[("Location", url)])
    s.record_payment(h.user["id"], s.price, f"demo-{secrets.token_hex(8)}", "demo")
    h.redirect("/formations", "premium")


@route("GET", "/premium/merci", auth="member")
def premium_thanks(h):
    if h.is_premium:
        return h.redirect("/formations", "premium")
    h.render("Merci", '<div class="card form-narrow" style="text-align:center"><h1>Merci !</h1>'
             '<p>Votre paiement est en cours de validation, votre accès Premium sera actif dans '
             'quelques secondes.</p><a class="btn" href="/premium/merci">Actualiser</a></div>')


@route("POST", "/webhooks/stripe", csrf=False)
def stripe_webhook(h):
    if not h.app.stripe:
        return h.send_json({"error": "Stripe non configuré"}, 404)
    try:
        event = h.app.stripe.parse_event(h.raw_body(), h.headers.get("Stripe-Signature"))
    except (payments.PaymentError, ValueError) as exc:
        return h.send_json({"error": str(exc)}, 400)
    payments.apply_event(h.app.s, event)
    h.send_json({"received": True})


# --- Affiliation ---------------------------------------------------------------

@route("GET", "/affiliation", auth="member")
def affiliation(h):
    s, user = h.app.s, h.user
    stats = s.aff.stats(user["affiliate_id"])
    referrals = s.referrals(user["id"])
    link = f"{h.app.base_url}/?ref={user['affiliate_code']}"
    status_fr = {"pending": "En attente", "approved": "Validée", "rejected": "Refusée", "paid": "Versée"}
    commissions = [[date_fr(c["created_at"]), "Direct" if c["level"] == 1 else "2e niveau",
                    eur(c["sale_amount"]), eur(c["amount"]), status_fr[c["status"]]]
                   for c in s.aff.list_commissions(user["affiliate_id"])[:100]]
    refs = [[e(r["name"]), date_fr(r["created_at"]),
             '<span class="tag teal">Premium</span>' if r["is_premium"] else '<span class="tag plain">Gratuit</span>']
            for r in referrals]
    message = (f"Je me forme à l'intelligence artificielle avec Starling : formations pratiques, "
               f"veille IA et une communauté qui s'entraide. Rejoignez-moi gratuitement : {link}")
    tiles = "".join([
        stat("Visites de votre lien", stats["clicks"]), stat("Filleuls inscrits", len(referrals)),
        stat("Paiements générés", stats["conversions"]), stat("Chiffre d'affaires généré", eur(stats["revenue"])),
        stat("En attente de validation", eur(stats["commissions"]["pending"])),
        stat("À percevoir", eur(stats["balance_due"])), stat("Déjà versé", eur(stats["commissions"]["paid"])),
    ])
    content = f"""<div class="page-head"><h1>Programme d'affiliation</h1>
<p>Recommandez Starling et touchez <strong>{s.commission_percent:g} %</strong> de chaque paiement de vos filleuls,
chaque mois tant qu'ils restent abonnés, plus <strong>{s.tier2_rate * 100:g} %</strong> des commissions gagnées par leurs propres filleuls.</p></div>
<div class="card"><h2>Votre lien de parrainage</h2>
  <div class="copy-field"><input type="text" id="ref-link" value="{e(link)}" readonly><button class="btn" data-copy="ref-link">Copier</button></div>
  <label for="ref-message">Message prêt à partager</label>
  <textarea id="ref-message" readonly style="min-height:90px">{e(message)}</textarea>
  <p style="margin-top:8px"><button class="btn secondary small" data-copy="ref-message">Copier le message</button></p>
</div>
<div class="grid cols-4" style="margin:16px 0">{tiles}</div>
<div class="card"><h2>Vos filleuls</h2>{table(["Membre", "Inscrit le", "Formule"], refs)}</div>
<div class="card"><h2>Vos commissions</h2>{table(["Date", "Niveau", "Paiement", "Commission", "Statut"], commissions, numeric=(2, 3))}
<p class="small muted" style="margin-top:12px">Les commissions sont validées après le délai de rétractation, puis versées par virement.</p></div>
<script>
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {{
  const field = document.getElementById(button.dataset.copy);
  try {{ await navigator.clipboard.writeText(field.value); }} catch {{ field.select(); document.execCommand("copy"); }}
  const label = button.textContent; button.textContent = "Copié ✓"; setTimeout(() => button.textContent = label, 1500);
}}));
</script>"""
    h.render("Affiliation", content, "affiliation")


# --- Administration ------------------------------------------------------------

def admin_page(h, error=None):
    s = h.app.s
    st = s.admin_stats()
    affiliates = {a["id"]: a for a in s.aff.leaderboard()}
    tiles = "".join([stat("Membres", st["members"]), stat("Premium actifs", st["premium"]),
                     stat("Revenus totaux", eur(st["revenue"])), stat("Revenus 30 jours", eur(st["revenue_30d"])),
                     stat("Commissions à valider", eur(st["commissions_pending"])),
                     stat("Commissions à verser", eur(st["commissions_due"])), stat("Publications", st["posts"])])
    pending = [[str(c["id"]), e(affiliates[c["affiliate_id"]]["name"]), "Direct" if c["level"] == 1 else "2e niveau",
                eur(c["sale_amount"]), eur(c["amount"]),
                post_button(h, f"/admin/commissions/{c['id']}", "Valider", "btn small",
                            '<input type="hidden" name="status" value="approved">') + " " +
                post_button(h, f"/admin/commissions/{c['id']}", "Refuser", "btn danger small",
                            '<input type="hidden" name="status" value="rejected">')]
               for c in s.aff.list_commissions(status="pending")[:100]]
    payouts = [[e(a["name"]), e(a["email"]), eur(a["balance_due"]),
                post_button(h, f"/admin/affilies/{a['id']}/payer", "Marquer comme versé", "btn small")]
               for a in affiliates.values() if a["balance_due"] > 0]
    members = [[e(m["name"]), e(m["email"]), date_fr(m["created_at"]),
                '<span class="tag teal">Premium</span>' if m["is_premium"] else '<span class="tag plain">Gratuit</span>',
                str(affiliates.get(m["affiliate_id"], {}).get("referrals", 0))]
               for m in s.list_members(30)]
    feeds = [[e(f["name"]), f'<span class="small">{e(f["url"])}</span>',
              date_fr(f["last_fetched_at"]) if f["last_fetched_at"] else "Jamais",
              f'<span class="small" style="color:var(--danger)">{e(f["last_error"])}</span>' if f["last_error"] else "OK"]
             for f in s.list_feeds()]
    course_options = "".join(f'<option value="{c["id"]}">{e(c["title"])}</option>' for c in s.list_courses())
    level_options = "".join(f"<option>{lvl}</option>" for lvl in LEVELS)
    content = f"""<div class="page-head"><h1>Administration</h1></div>
<div class="grid cols-4" style="margin-bottom:16px">{tiles}</div>
<div class="card"><h2>Commissions à valider</h2>{table(["#", "Affilié", "Niveau", "Paiement", "Commission", ""], pending, numeric=(3, 4))}</div>
<div class="card"><h2>Commissions à verser</h2><p class="small muted">Effectuez le virement, puis marquez-le comme versé.</p>
{table(["Affilié", "Email", "Montant", ""], payouts, numeric=(2,))}</div>
<div class="card"><h2>Derniers membres</h2>{table(["Nom", "Email", "Inscription", "Formule", "Filleuls"], members, numeric=(4,))}</div>
<div class="grid cols-2" style="margin-top:16px">
  <div class="card"><h2>Nouvelle formation</h2>
    <form method="post" action="/admin/formations">{csrf_field(h)}
      <label for="c-title">Titre</label><input type="text" id="c-title" name="title" required>
      <label for="c-level">Niveau</label><select id="c-level" name="level">{level_options}</select>
      <label for="c-desc">Description</label><textarea id="c-desc" name="description" required style="min-height:80px"></textarea>
      <p style="margin-top:12px"><button class="btn">Créer la formation</button></p>
    </form></div>
  <div class="card"><h2>Nouvelle leçon</h2>
    <form method="post" action="/admin/lecons">{csrf_field(h)}
      <label for="l-course">Formation</label><select id="l-course" name="course_id">{course_options}</select>
      <label for="l-title">Titre</label><input type="text" id="l-title" name="title" required>
      <label for="l-video">Vidéo (lien YouTube ou https, facultatif)</label><input type="url" id="l-video" name="video_url">
      <label for="l-content">Contenu (Markdown)</label><textarea id="l-content" name="content" required></textarea>
      <label class="checkbox"><input type="checkbox" name="is_free" value="1"> Leçon gratuite (visible par tous les membres)</label>
      <p style="margin-top:12px"><button class="btn">Ajouter la leçon</button></p>
    </form></div>
</div>
<div class="card" style="margin-top:16px"><div class="row spread"><h2>Sources de la veille IA</h2>{post_button(h, "/admin/flux/actualiser", "Actualiser maintenant", "btn secondary small")}</div>
{table(["Source", "URL", "Dernière lecture", "État"], feeds)}
  <form method="post" action="/admin/flux" class="row" style="margin-top:12px">{csrf_field(h)}
    <input type="text" name="name" placeholder="Nom de la source" required style="max-width:220px">
    <input type="url" name="url" placeholder="https://exemple.com/feed.xml" required style="flex:1;min-width:200px">
    <button class="btn">Ajouter le flux</button>
  </form></div>"""
    h.render("Administration", content, "admin", error=error)


@route("GET", "/admin", auth="admin")
def admin(h):
    admin_page(h)


def admin_action(fn):
    """Exécute une action d'administration et réaffiche la page en cas d'erreur."""
    def wrapper(h, *args):
        try:
            flash = fn(h, *args)
        except AffiliationError as exc:
            return admin_page(h, str(exc))
        h.redirect("/admin", flash)
    return wrapper


@route("POST", "/admin/formations", auth="admin")
@admin_action
def admin_course(h):
    form = h.form()
    h.app.s.add_course(form.get("title"), form.get("description"), form.get("level"))
    return "course_created"


@route("POST", "/admin/lecons", auth="admin")
@admin_action
def admin_lesson(h):
    form = h.form()
    course_id = form.get("course_id", "")
    if not course_id.isdigit():
        raise AffiliationError("Choisissez une formation.")
    h.app.s.add_lesson(int(course_id), form.get("title"), form.get("content"),
                       is_free=form.get("is_free") == "1", video_url=form.get("video_url"))
    return "lesson_created"


@route("POST", "/admin/flux", auth="admin")
@admin_action
def admin_feed(h):
    h.app.s.add_feed(h.form().get("name"), h.form().get("url"))
    return "feed_added"


@route("POST", "/admin/flux/actualiser", auth="admin")
@admin_action
def admin_refresh(h):
    threading.Thread(target=news.refresh_all, args=(h.app.s, h.app.lock), daemon=True).start()
    return "news_refresh"


@route("POST", r"/admin/commissions/(\d+)", auth="admin")
@admin_action
def admin_commission(h, commission_id):
    h.app.s.aff.set_commission_status(int(commission_id), h.form().get("status"))
    return "commission_updated"


@route("POST", r"/admin/affilies/(\d+)/payer", auth="admin")
@admin_action
def admin_pay(h, affiliate_id):
    h.app.s.aff.pay_affiliate(int(affiliate_id))
    return "paid"


# --- Démarrage -----------------------------------------------------------------

def build_app(db_path=":memory:", base_url="http://127.0.0.1:8000", admin_email=None, price=29.0,
              commission_percent=30.0, tier2_rate=0.10, stripe=None, with_seed=True):
    starling = Starling(db_path, price=price, commission_percent=commission_percent,
                        tier2_rate=tier2_rate, admin_email=admin_email, base_url=base_url)
    if with_seed:
        seed.seed(starling)
    return App(starling, base_url, stripe)


def make_server(app, host="127.0.0.1", port=8000):
    handler = type("BoundHandler", (Handler,), {"app": app})
    return ThreadingHTTPServer((host, port), handler)


def _refresh_loop(app, interval):
    while True:
        news.refresh_all(app.s, app.lock)
        time.sleep(interval)


def main():
    env = os.environ.get
    host, port = env("STARLING_HOST", "127.0.0.1"), int(env("STARLING_PORT", "8000"))
    stripe = None
    if env("STRIPE_SECRET_KEY"):
        if not (env("STRIPE_PRICE_ID") and env("STRIPE_WEBHOOK_SECRET")):
            raise SystemExit("Avec STRIPE_SECRET_KEY, définissez aussi STRIPE_PRICE_ID et STRIPE_WEBHOOK_SECRET.")
        stripe = payments.StripeGateway(env("STRIPE_SECRET_KEY"), env("STRIPE_PRICE_ID"),
                                        env("STRIPE_WEBHOOK_SECRET"))
    app = build_app(
        db_path=env("STARLING_DB", "starling.db"),
        base_url=env("STARLING_BASE_URL", f"http://{host}:{port}"),
        admin_email=env("STARLING_ADMIN_EMAIL"),
        price=float(env("STARLING_PRICE", "29")),
        commission_percent=float(env("STARLING_COMMISSION", "30")),
        tier2_rate=float(env("STARLING_TIER2_RATE", "0.10")),
        stripe=stripe,
        with_seed=env("STARLING_SEED", "1") != "0",
    )
    server = make_server(app, host, port)
    interval = int(env("STARLING_NEWS_INTERVAL", "3600"))
    if interval > 0:
        threading.Thread(target=_refresh_loop, args=(app, interval), daemon=True).start()
    mode = "Stripe" if stripe else "démo (paiements simulés)"
    print(f"Starling démarré sur {app.base_url} — paiements : {mode}")
    server.serve_forever()
