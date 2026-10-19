"""Starling : membres, formations, communauté, veille IA et abonnements.

Les données sont stockées dans la même base SQLite que le moteur d'affiliation :
chaque membre est automatiquement affilié et touche une commission sur les
abonnements des personnes qu'il parraine.
"""

import hashlib
import hmac
import secrets
import time

from affiliation.core import Affiliation, AffiliationError

PRODUCT_NAME = "Starling Premium"
SESSION_SECONDS = 30 * 86400
PREMIUM_PERIOD = 31 * 86400
CATEGORIES = {
    "discussions": "Discussions",
    "veille": "Veille IA",
    "questions": "Questions",
    "projets": "Projets & réussites",
}
LEVELS = ("Débutant", "Intermédiaire", "Avancé")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    referred_by INTEGER REFERENCES users(id),
    is_admin INTEGER NOT NULL DEFAULT 0,
    premium_until INTEGER NOT NULL DEFAULT 0,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    csrf TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    level TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    video_url TEXT,
    is_free INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER NOT NULL REFERENCES users(id),
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    completed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL REFERENCES users(id),
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
);
CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    last_fetched_at INTEGER,
    last_error TEXT
);
CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY,
    feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    published_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_cat ON posts(category, created_at);
CREATE INDEX IF NOT EXISTS idx_news_date ON news(published_at);
"""


class StarlingError(AffiliationError):
    """Erreur affichable à l'utilisateur."""


def _sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def _check_length(value, label, low, high):
    value = (value or "").strip()
    if not low <= len(value) <= high:
        raise StarlingError(f"{label} : entre {low} et {high} caractères.")
    return value


class Starling:
    password_iterations = 200_000

    def __init__(self, path=":memory:", price=29.0, commission_percent=30.0, tier2_rate=0.10,
                 admin_email=None, base_url="http://127.0.0.1:8000"):
        self.aff = Affiliation(path, tier2_rate=tier2_rate)
        self.db = self.aff.db
        self.db.executescript(SCHEMA)
        self.price = round(float(price), 2)
        self.commission_percent = float(commission_percent)
        self.tier2_rate = tier2_rate
        self.admin_email = (admin_email or "").strip().lower() or None
        self.product_id = self._ensure_product(base_url)
        if self.admin_email:
            self.db.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (self.admin_email,))
            self.db.commit()

    def _ensure_product(self, base_url):
        row = self.db.execute("SELECT id FROM products WHERE name = ?", (PRODUCT_NAME,)).fetchone()
        if row is None:
            return self.aff.add_product(PRODUCT_NAME, f"{base_url}/premium", "percent",
                                        self.commission_percent)["id"]
        self.db.execute("UPDATE products SET commission_type = 'percent', commission_value = ?"
                        " WHERE id = ?", (self.commission_percent, row["id"]))
        self.db.commit()
        return row["id"]

    # --- Membres --------------------------------------------------------

    def _hash_password(self, password):
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(),
                                     self.password_iterations).hex()
        return f"pbkdf2_sha256${self.password_iterations}${salt}${digest}"

    @staticmethod
    def _password_matches(password, stored):
        try:
            _, iterations, salt, digest = stored.split("$")
            candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(),
                                            int(iterations)).hex()
        except ValueError:
            return False
        return hmac.compare_digest(candidate, digest)

    def register(self, name, email, password, referrer_code=None):
        name = _check_length(name, "Nom", 2, 60)
        email = (email or "").strip().lower()
        if "@" not in email or len(email) > 200:
            raise StarlingError("Adresse email invalide.")
        if len(password or "") < 8:
            raise StarlingError("Le mot de passe doit contenir au moins 8 caractères.")
        if self.db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise StarlingError("Un compte existe déjà avec cet email.")
        referrer = self.user_by_affiliate_code(referrer_code) if referrer_code else None
        affiliate, _ = self.aff.register_affiliate(
            name, email, parent_code=referrer["affiliate_code"] if referrer else None)
        cur = self.db.execute(
            "INSERT INTO users (name, email, password_hash, affiliate_id, referred_by, is_admin,"
            " created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name, email, self._hash_password(password), affiliate["id"],
             referrer["id"] if referrer else None, int(email == self.admin_email),
             int(time.time())))
        self.db.commit()
        return self.get_user(cur.lastrowid)

    def authenticate(self, email, password):
        row = self.db.execute("SELECT id, password_hash FROM users WHERE email = ?",
                              ((email or "").strip().lower(),)).fetchone()
        if row is None:
            self._password_matches(password or "", self._hash_password("x"))  # temps constant
            return None
        return self.get_user(row["id"]) if self._password_matches(password or "",
                                                                  row["password_hash"]) else None

    def get_user(self, user_id):
        row = self.db.execute(
            "SELECT u.*, a.code AS affiliate_code FROM users u"
            " JOIN affiliates a ON a.id = u.affiliate_id WHERE u.id = ?", (user_id,)).fetchone()
        if row is None:
            raise StarlingError("Membre introuvable.")
        user = dict(row)
        del user["password_hash"]
        user["is_premium"] = bool(user["is_admin"]) or user["premium_until"] > time.time()
        return user

    def user_by_affiliate_code(self, code):
        row = self.db.execute("SELECT u.id FROM users u JOIN affiliates a ON a.id = u.affiliate_id"
                              " WHERE a.code = ?", (code,)).fetchone()
        return self.get_user(row["id"]) if row else None

    def user_by_stripe_customer(self, customer_id):
        if not customer_id:
            return None
        row = self.db.execute("SELECT id FROM users WHERE stripe_customer_id = ?",
                              (customer_id,)).fetchone()
        return self.get_user(row["id"]) if row else None

    def link_stripe(self, user_id, customer_id, subscription_id=None):
        self.db.execute("UPDATE users SET stripe_customer_id = ?,"
                        " stripe_subscription_id = COALESCE(?, stripe_subscription_id) WHERE id = ?",
                        (customer_id, subscription_id, user_id))
        self.db.commit()

    def list_members(self, limit=50):
        rows = self.db.execute("SELECT id FROM users ORDER BY id DESC LIMIT ?", (limit,))
        return [self.get_user(r["id"]) for r in rows.fetchall()]

    def referrals(self, user_id):
        rows = self.db.execute("SELECT id FROM users WHERE referred_by = ? ORDER BY id DESC",
                               (user_id,))
        return [self.get_user(r["id"]) for r in rows.fetchall()]

    # --- Sessions -------------------------------------------------------

    def create_session(self, user_id):
        token = secrets.token_urlsafe(32)
        self.db.execute("INSERT INTO sessions (token_hash, user_id, csrf, expires_at)"
                        " VALUES (?, ?, ?, ?)",
                        (_sha(token), user_id, secrets.token_urlsafe(24),
                         int(time.time()) + SESSION_SECONDS))
        self.db.commit()
        return token

    def session_user(self, token):
        """Retourne (membre, jeton CSRF) pour un cookie de session, ou (None, None)."""
        if not token:
            return None, None
        row = self.db.execute("SELECT user_id, csrf FROM sessions"
                              " WHERE token_hash = ? AND expires_at > ?",
                              (_sha(token), int(time.time()))).fetchone()
        return (self.get_user(row["user_id"]), row["csrf"]) if row else (None, None)

    def end_session(self, token):
        self.db.execute("DELETE FROM sessions WHERE token_hash = ?", (_sha(token or ""),))
        self.db.commit()

    # --- Abonnements et commissions -------------------------------------

    def record_payment(self, user_id, amount, reference, provider, paid_until=None):
        """Enregistre un paiement d'abonnement, prolonge l'accès Premium et
        crée les commissions du parrain (et de son propre parrain).

        Idempotent : un même `reference` n'est compté qu'une fois.
        """
        reference = str(reference)
        if self.db.execute("SELECT 1 FROM payments WHERE reference = ?", (reference,)).fetchone():
            return False
        user = self.get_user(user_id)
        amount = round(float(amount), 2)
        now = int(time.time())
        until = (int(paid_until) + 86400 if paid_until
                 else max(now, user["premium_until"]) + PREMIUM_PERIOD)
        self.db.execute("INSERT INTO payments (user_id, provider, reference, amount, created_at)"
                        " VALUES (?, ?, ?, ?, ?)", (user_id, provider, reference, amount, now))
        self.db.execute("UPDATE users SET premium_until = MAX(premium_until, ?) WHERE id = ?",
                        (until, user_id))
        self.db.commit()
        if user["referred_by"]:
            referrer = self.get_user(user["referred_by"])
            self.aff.record_conversion(reference, self.product_id, amount,
                                       affiliate_code=referrer["affiliate_code"])
        return True

    def cancel_premium(self, user_id):
        self.db.execute("UPDATE users SET premium_until = MIN(premium_until, ?) WHERE id = ?",
                        (int(time.time()), user_id))
        self.db.commit()

    def record_referral_visit(self, code, visitor_id=None, ip=None, user_agent=None,
                              referer=None):
        """Compte un clic sur un lien de parrainage ; retourne l'identifiant visiteur."""
        _, visitor_id, _ = self.aff.record_click(code, self.product_id, visitor_id=visitor_id,
                                                 ip=ip, user_agent=user_agent, referer=referer)
        return visitor_id

    # --- Formations -----------------------------------------------------

    def add_course(self, title, description, level):
        if level not in LEVELS:
            raise StarlingError("Niveau invalide.")
        position = self.db.execute("SELECT COALESCE(MAX(position), 0) + 1 FROM courses").fetchone()[0]
        cur = self.db.execute(
            "INSERT INTO courses (title, description, level, position, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (_check_length(title, "Titre", 3, 120), _check_length(description, "Description", 3, 600),
             level, position, int(time.time())))
        self.db.commit()
        return cur.lastrowid

    def add_lesson(self, course_id, title, content, is_free=False, video_url=None):
        self.get_course(course_id)
        video_url = (video_url or "").strip() or None
        if video_url and not video_url.startswith("https://"):
            raise StarlingError("L'URL de la vidéo doit commencer par https://.")
        position = self.db.execute("SELECT COALESCE(MAX(position), 0) + 1 FROM lessons"
                                   " WHERE course_id = ?", (course_id,)).fetchone()[0]
        cur = self.db.execute(
            "INSERT INTO lessons (course_id, title, content, video_url, is_free, position)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (course_id, _check_length(title, "Titre", 3, 150),
             _check_length(content, "Contenu", 1, 50_000), video_url, int(bool(is_free)), position))
        self.db.commit()
        return cur.lastrowid

    def list_courses(self, user_id=None):
        rows = self.db.execute(
            "SELECT c.*, COUNT(l.id) AS lesson_count, COALESCE(SUM(l.is_free), 0) AS free_count,"
            " COUNT(p.lesson_id) AS completed FROM courses c"
            " LEFT JOIN lessons l ON l.course_id = c.id"
            " LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?"
            " GROUP BY c.id ORDER BY c.position", (user_id,))
        return [dict(r) for r in rows]

    def get_course(self, course_id, user_id=None):
        row = self.db.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        if row is None:
            raise StarlingError("Formation introuvable.")
        course = dict(row)
        course["lessons"] = [dict(r) for r in self.db.execute(
            "SELECT l.id, l.title, l.is_free, l.position, p.completed_at IS NOT NULL AS completed"
            " FROM lessons l LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?"
            " WHERE l.course_id = ? ORDER BY l.position", (user_id, course_id))]
        return course

    def get_lesson(self, lesson_id, user_id=None):
        row = self.db.execute(
            "SELECT l.*, c.title AS course_title, p.completed_at IS NOT NULL AS completed"
            " FROM lessons l JOIN courses c ON c.id = l.course_id"
            " LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?"
            " WHERE l.id = ?", (user_id, lesson_id)).fetchone()
        if row is None:
            raise StarlingError("Leçon introuvable.")
        lesson = dict(row)
        siblings = [r["id"] for r in self.db.execute(
            "SELECT id FROM lessons WHERE course_id = ? ORDER BY position", (lesson["course_id"],))]
        index = siblings.index(lesson["id"])
        lesson["prev_id"] = siblings[index - 1] if index > 0 else None
        lesson["next_id"] = siblings[index + 1] if index + 1 < len(siblings) else None
        return lesson

    @staticmethod
    def can_access(user, lesson):
        return bool(lesson["is_free"]) or bool(user and user["is_premium"])

    def complete_lesson(self, user, lesson_id):
        if not self.can_access(user, self.get_lesson(lesson_id)):
            raise StarlingError("Cette leçon est réservée aux membres Premium.")
        self.db.execute("INSERT OR IGNORE INTO progress (user_id, lesson_id, completed_at)"
                        " VALUES (?, ?, ?)", (user["id"], lesson_id, int(time.time())))
        self.db.commit()

    # --- Communauté -----------------------------------------------------

    def create_post(self, user_id, category, title, body, pinned=False):
        if category not in CATEGORIES:
            raise StarlingError("Catégorie invalide.")
        cur = self.db.execute(
            "INSERT INTO posts (user_id, category, title, body, pinned, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, category, _check_length(title, "Titre", 3, 150),
             _check_length(body, "Message", 1, 10_000), int(pinned), int(time.time())))
        self.db.commit()
        return cur.lastrowid

    _POST_SQL = (
        "SELECT p.*, u.name AS author, u.premium_until > CAST(strftime('%s','now') AS INTEGER) OR u.is_admin"
        " AS author_premium,"
        " (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,"
        " (SELECT COUNT(*) FROM likes k WHERE k.post_id = p.id) AS like_count,"
        " EXISTS (SELECT 1 FROM likes k WHERE k.post_id = p.id AND k.user_id = ?) AS liked"
        " FROM posts p JOIN users u ON u.id = p.user_id")

    def list_posts(self, category=None, viewer_id=None, limit=50):
        sql, args = self._POST_SQL, [viewer_id]
        if category:
            sql += " WHERE p.category = ?"
            args.append(category)
        sql += " ORDER BY p.pinned DESC, p.created_at DESC, p.id DESC LIMIT ?"
        return [dict(r) for r in self.db.execute(sql, args + [limit])]

    def get_post(self, post_id, viewer_id=None):
        row = self.db.execute(self._POST_SQL + " WHERE p.id = ?", (viewer_id, post_id)).fetchone()
        if row is None:
            raise StarlingError("Publication introuvable.")
        return dict(row)

    def add_comment(self, post_id, user_id, body):
        self.get_post(post_id)
        self.db.execute("INSERT INTO comments (post_id, user_id, body, created_at)"
                        " VALUES (?, ?, ?, ?)",
                        (post_id, user_id, _check_length(body, "Commentaire", 1, 5000),
                         int(time.time())))
        self.db.commit()

    def list_comments(self, post_id):
        return [dict(r) for r in self.db.execute(
            "SELECT c.*, u.name AS author FROM comments c JOIN users u ON u.id = c.user_id"
            " WHERE c.post_id = ? ORDER BY c.created_at, c.id", (post_id,))]

    def toggle_like(self, post_id, user_id):
        self.get_post(post_id)
        if self.db.execute("DELETE FROM likes WHERE post_id = ? AND user_id = ?",
                           (post_id, user_id)).rowcount:
            self.db.commit()
            return False
        self.db.execute("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", (user_id, post_id))
        self.db.commit()
        return True

    def delete_post(self, post_id, user):
        post = self.get_post(post_id)
        if post["user_id"] != user["id"] and not user["is_admin"]:
            raise StarlingError("Vous ne pouvez supprimer que vos propres publications.")
        self.db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        self.db.commit()

    # --- Veille IA ------------------------------------------------------

    def add_feed(self, name, url):
        url = (url or "").strip()
        if not url.startswith(("http://", "https://")):
            raise StarlingError("L'URL du flux doit commencer par http:// ou https://.")
        self.db.execute("INSERT OR IGNORE INTO feeds (name, url) VALUES (?, ?)",
                        (_check_length(name, "Nom", 2, 80), url))
        self.db.commit()

    def list_feeds(self):
        return [dict(r) for r in self.db.execute("SELECT * FROM feeds ORDER BY name")]

    def store_news(self, feed_id, items):
        added = 0
        for item in items:
            added += self.db.execute(
                "INSERT OR IGNORE INTO news (feed_id, title, url, summary, published_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (feed_id, item["title"], item["url"], item.get("summary", ""),
                 item.get("published_at") or int(time.time()))).rowcount
        self.db.commit()
        return added

    def mark_feed(self, feed_id, error=None):
        self.db.execute("UPDATE feeds SET last_fetched_at = ?, last_error = ? WHERE id = ?",
                        (int(time.time()), error, feed_id))
        self.db.commit()

    def list_news(self, limit=60):
        return [dict(r) for r in self.db.execute(
            "SELECT n.*, f.name AS source FROM news n JOIN feeds f ON f.id = n.feed_id"
            " ORDER BY n.published_at DESC LIMIT ?", (limit,))]

    # --- Pilotage -------------------------------------------------------

    def admin_stats(self):
        q = lambda sql, *args: self.db.execute(sql, args).fetchone()[0]  # noqa: E731
        now = int(time.time())
        return {
            "members": q("SELECT COUNT(*) FROM users"),
            "premium": q("SELECT COUNT(*) FROM users WHERE premium_until > ?", now),
            "revenue": round(q("SELECT COALESCE(SUM(amount), 0) FROM payments"), 2),
            "revenue_30d": round(q("SELECT COALESCE(SUM(amount), 0) FROM payments"
                                   " WHERE created_at > ?", now - 30 * 86400), 2),
            "commissions_pending": round(q("SELECT COALESCE(SUM(amount), 0) FROM commissions"
                                           " WHERE status = 'pending'"), 2),
            "commissions_due": round(q("SELECT COALESCE(SUM(amount), 0) FROM commissions"
                                       " WHERE status = 'approved'"), 2),
            "posts": q("SELECT COUNT(*) FROM posts"),
        }
