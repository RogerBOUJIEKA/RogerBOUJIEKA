"""Cœur du système d'affiliation : stockage SQLite et règles métier."""

import hashlib
import secrets
import sqlite3
import time

COOKIE_DAYS = 30
STATUSES = ("pending", "approved", "rejected", "paid")

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    commission_type TEXT NOT NULL CHECK (commission_type IN ('percent', 'fixed')),
    commission_value REAL NOT NULL CHECK (commission_value >= 0),
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS affiliates (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    api_key_hash TEXT NOT NULL,
    parent_id INTEGER REFERENCES affiliates(id),
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    visitor_id TEXT NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    referer TEXT,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS conversions (
    id INTEGER PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    click_id INTEGER REFERENCES clicks(id),
    amount REAL NOT NULL CHECK (amount >= 0),
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY,
    conversion_id INTEGER NOT NULL REFERENCES conversions(id),
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    level INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_clicks_visitor ON clicks(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_commissions_aff ON commissions(affiliate_id, status);
"""


class AffiliationError(ValueError):
    """Erreur métier (données invalides, ressource introuvable...)."""


def _hash(value):
    return hashlib.sha256(value.encode()).hexdigest()


class Affiliation:
    """Façade sur la base de données.

    `tier2_rate` : part (0..1) de la commission reversée au parrain de l'affilié
    (affiliation à 2 niveaux). 0 désactive le second niveau.
    """

    def __init__(self, path=":memory:", tier2_rate=0.10, cookie_days=COOKIE_DAYS):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)
        self.tier2_rate = tier2_rate
        self.cookie_seconds = cookie_days * 86400

    # --- Produits -------------------------------------------------------

    def add_product(self, name, url, commission_type, commission_value):
        if commission_type not in ("percent", "fixed"):
            raise AffiliationError("commission_type doit être 'percent' ou 'fixed'")
        if not str(url).startswith(("http://", "https://")):
            raise AffiliationError("url doit commencer par http:// ou https://")
        value = float(commission_value)
        if value < 0 or (commission_type == "percent" and value > 100):
            raise AffiliationError("commission_value invalide")
        cur = self.db.execute(
            "INSERT INTO products (name, url, commission_type, commission_value, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (name, url, commission_type, value, int(time.time())),
        )
        self.db.commit()
        return self.get_product(cur.lastrowid)

    def get_product(self, product_id):
        row = self.db.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if row is None:
            raise AffiliationError("produit introuvable")
        return dict(row)

    def list_products(self):
        return [dict(r) for r in self.db.execute("SELECT * FROM products ORDER BY id")]

    # --- Affiliés -------------------------------------------------------

    def register_affiliate(self, name, email, parent_code=None):
        """Inscrit un affilié. Retourne l'affilié et sa clé API (affichée une seule fois)."""
        if not name or "@" not in (email or ""):
            raise AffiliationError("nom et email valides requis")
        parent_id = None
        if parent_code:
            parent_id = self.get_affiliate_by_code(parent_code)["id"]
        code = secrets.token_urlsafe(6).replace("-", "x").replace("_", "y")
        api_key = secrets.token_urlsafe(24)
        try:
            cur = self.db.execute(
                "INSERT INTO affiliates (name, email, code, api_key_hash, parent_id, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (name, email.lower(), code, _hash(api_key), parent_id, int(time.time())),
            )
        except sqlite3.IntegrityError:
            raise AffiliationError("email déjà inscrit") from None
        self.db.commit()
        return self._affiliate(cur.lastrowid), api_key

    def _affiliate(self, affiliate_id):
        row = self.db.execute(
            "SELECT id, name, email, code, parent_id, created_at FROM affiliates WHERE id = ?",
            (affiliate_id,),
        ).fetchone()
        if row is None:
            raise AffiliationError("affilié introuvable")
        return dict(row)

    def get_affiliate_by_code(self, code):
        row = self.db.execute("SELECT id FROM affiliates WHERE code = ?", (code,)).fetchone()
        if row is None:
            raise AffiliationError("code affilié inconnu")
        return self._affiliate(row["id"])

    def authenticate(self, api_key):
        row = self.db.execute(
            "SELECT id FROM affiliates WHERE api_key_hash = ?", (_hash(api_key or ""),)
        ).fetchone()
        return self._affiliate(row["id"]) if row else None

    def list_affiliates(self):
        return [
            dict(r)
            for r in self.db.execute(
                "SELECT id, name, email, code, parent_id, created_at FROM affiliates ORDER BY id"
            )
        ]

    # --- Suivi ----------------------------------------------------------

    def record_click(self, code, product_id, visitor_id=None, ip=None, user_agent=None,
                     referer=None):
        """Enregistre un clic et retourne (click_id, visitor_id, url de destination)."""
        affiliate = self.get_affiliate_by_code(code)
        product = self.get_product(product_id)
        visitor_id = visitor_id or secrets.token_hex(16)
        cur = self.db.execute(
            "INSERT INTO clicks (affiliate_id, product_id, visitor_id, ip_hash, user_agent,"
            " referer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (affiliate["id"], product["id"], visitor_id, _hash(ip) if ip else None,
             user_agent, referer, int(time.time())),
        )
        self.db.commit()
        return cur.lastrowid, visitor_id, product["url"]

    def record_conversion(self, order_id, product_id, amount, visitor_id=None,
                          affiliate_code=None):
        """Enregistre une vente et calcule les commissions.

        L'attribution se fait au dernier clic du visiteur dans la fenêtre du
        cookie ; à défaut, sur `affiliate_code` (coupon, lien direct...).
        Retourne None si la vente n'est attribuable à aucun affilié.
        """
        amount = float(amount)
        if amount < 0:
            raise AffiliationError("montant invalide")
        product = self.get_product(product_id)
        if self.db.execute("SELECT 1 FROM conversions WHERE order_id = ?",
                           (str(order_id),)).fetchone():
            raise AffiliationError("commande déjà enregistrée")

        click = None
        if visitor_id:
            click = self.db.execute(
                "SELECT id, affiliate_id FROM clicks WHERE visitor_id = ? AND created_at >= ?"
                " ORDER BY created_at DESC, id DESC LIMIT 1",
                (visitor_id, int(time.time()) - self.cookie_seconds),
            ).fetchone()
        if click:
            affiliate_id, click_id = click["affiliate_id"], click["id"]
        elif affiliate_code:
            affiliate_id, click_id = self.get_affiliate_by_code(affiliate_code)["id"], None
        else:
            return None

        now = int(time.time())
        cur = self.db.execute(
            "INSERT INTO conversions (order_id, affiliate_id, product_id, click_id, amount,"
            " created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(order_id), affiliate_id, product["id"], click_id, amount, now),
        )
        conversion_id = cur.lastrowid

        base = (amount * product["commission_value"] / 100
                if product["commission_type"] == "percent" else product["commission_value"])
        base = round(base, 2)
        self.db.execute(
            "INSERT INTO commissions (conversion_id, affiliate_id, level, amount, created_at)"
            " VALUES (?, ?, 1, ?, ?)", (conversion_id, affiliate_id, base, now))
        parent_id = self._affiliate(affiliate_id)["parent_id"]
        if parent_id and self.tier2_rate > 0:
            self.db.execute(
                "INSERT INTO commissions (conversion_id, affiliate_id, level, amount, created_at)"
                " VALUES (?, ?, 2, ?, ?)",
                (conversion_id, parent_id, round(base * self.tier2_rate, 2), now))
        self.db.commit()
        return {"conversion_id": conversion_id, "affiliate_id": affiliate_id,
                "commission": base}

    # --- Commissions et paiements --------------------------------------

    def set_commission_status(self, commission_id, status):
        if status not in STATUSES:
            raise AffiliationError(f"statut invalide (valeurs : {', '.join(STATUSES)})")
        row = self.db.execute("SELECT status FROM commissions WHERE id = ?",
                              (commission_id,)).fetchone()
        if row is None:
            raise AffiliationError("commission introuvable")
        if row["status"] == "paid":
            raise AffiliationError("une commission payée ne peut plus être modifiée")
        if status == "paid" and row["status"] != "approved":
            raise AffiliationError("seule une commission approuvée peut être payée")
        self.db.execute(
            "UPDATE commissions SET status = ?, paid_at = ? WHERE id = ?",
            (status, int(time.time()) if status == "paid" else None, commission_id))
        self.db.commit()

    def pay_affiliate(self, affiliate_id):
        """Marque toutes les commissions approuvées comme payées ; retourne le total versé."""
        total = self.db.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM commissions"
            " WHERE affiliate_id = ? AND status = 'approved'", (affiliate_id,)).fetchone()[0]
        self.db.execute(
            "UPDATE commissions SET status = 'paid', paid_at = ?"
            " WHERE affiliate_id = ? AND status = 'approved'", (int(time.time()), affiliate_id))
        self.db.commit()
        return round(total, 2)

    def list_commissions(self, affiliate_id=None, status=None):
        sql = ("SELECT c.*, v.order_id, v.amount AS sale_amount, p.name AS product_name"
               " FROM commissions c JOIN conversions v ON v.id = c.conversion_id"
               " JOIN products p ON p.id = v.product_id WHERE 1=1")
        args = []
        if affiliate_id is not None:
            sql += " AND c.affiliate_id = ?"
            args.append(affiliate_id)
        if status:
            sql += " AND c.status = ?"
            args.append(status)
        return [dict(r) for r in self.db.execute(sql + " ORDER BY c.id DESC", args)]

    # --- Statistiques ---------------------------------------------------

    def stats(self, affiliate_id):
        q = self.db.execute
        clicks = q("SELECT COUNT(*) FROM clicks WHERE affiliate_id = ?", (affiliate_id,)).fetchone()[0]
        conv = q("SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM conversions WHERE affiliate_id = ?",
                 (affiliate_id,)).fetchone()
        by_status = {s: 0.0 for s in STATUSES}
        for row in q("SELECT status, SUM(amount) AS total FROM commissions"
                     " WHERE affiliate_id = ? GROUP BY status", (affiliate_id,)):
            by_status[row["status"]] = round(row["total"], 2)
        referrals = q("SELECT COUNT(*) FROM affiliates WHERE parent_id = ?",
                      (affiliate_id,)).fetchone()[0]
        return {
            "clicks": clicks,
            "conversions": conv[0],
            "conversion_rate": round(100 * conv[0] / clicks, 2) if clicks else 0.0,
            "revenue": round(conv[1], 2),
            "commissions": by_status,
            "balance_due": by_status["approved"],
            "referrals": referrals,
        }

    def leaderboard(self):
        rows = []
        for aff in self.list_affiliates():
            rows.append({**aff, **self.stats(aff["id"])})
        rows.sort(key=lambda r: r["revenue"], reverse=True)
        return rows
