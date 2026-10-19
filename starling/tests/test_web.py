import http.client
import json
import os
import re
import threading
import unittest
from http.cookies import SimpleCookie
from urllib.parse import urlencode

from community import payments, web
from community.models import Starling

os.environ["STARLING_QUIET"] = "1"
Starling.password_iterations = 1000


class Browser:
    """Client HTTP minimal qui conserve les cookies, comme un navigateur."""

    def __init__(self, port):
        self.port, self.cookies = port, {}

    def request(self, method, path, form=None, raw=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port)
        headers = dict(headers or {})
        if self.cookies:
            headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        body = raw
        if form is not None:
            body = urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        conn.request(method, path, body, headers)
        res = conn.getresponse()
        text = res.read().decode()
        for header in res.headers.get_all("Set-Cookie") or []:
            for name, morsel in SimpleCookie(header).items():
                if morsel["max-age"] == "0":
                    self.cookies.pop(name, None)
                else:
                    self.cookies[name] = morsel.value
        conn.close()
        return res, text

    def get(self, path):
        return self.request("GET", path)

    def post(self, path, form=None, csrf_from=None):
        form = dict(form or {})
        if csrf_from is not None:
            form["csrf"] = re.search(r'name="csrf" value="([^"]+)"', csrf_from).group(1)
        return self.request("POST", path, form=form)


class WebTest(unittest.TestCase):
    stripe = None

    def setUp(self):
        self.app = web.build_app(admin_email="admin@starling.test", stripe=self.stripe)
        self.server = web.make_server(self.app, port=0)
        self.port = self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.app.s.db.close()

    def browser(self):
        return Browser(self.port)

    def signup(self, browser, name, email, ref=None):
        if ref:
            browser.get(f"/?ref={ref}")
        res, _ = browser.post("/inscription", {"name": name, "email": email, "password": "motdepasse",
                                               "ref": browser.cookies.get("starling_ref", "")})
        self.assertEqual(res.status, 303)
        return self.app.s.authenticate(email, "motdepasse")


class PublicPagesTest(WebTest):
    def test_public_pages(self):
        b = self.browser()
        for path in ("/", "/formations", "/formations/1", "/veille", "/premium", "/inscription",
                     "/connexion", "/static/starling.css", "/favicon.svg"):
            res, _ = b.get(path)
            self.assertEqual(res.status, 200, path)
        res, text = b.get("/")
        self.assertIn("Les fondamentaux de l&#x27;IA générative", text)
        self.assertEqual(b.get("/inexistant")[0].status, 404)

    def test_member_pages_require_login(self):
        b = self.browser()
        for path in ("/communaute", "/affiliation", "/lecons/1", "/admin"):
            res, _ = b.get(path)
            self.assertEqual(res.status, 303, path)
            self.assertTrue(res.getheader("Location").startswith("/connexion?next="))


class MemberJourneyTest(WebTest):
    def test_referral_signup_premium_and_commission(self):
        parrain_browser = self.browser()
        parrain = self.signup(parrain_browser, "Parrain", "parrain@test.fr")

        visitor = self.browser()
        res, text = visitor.get(f"/?ref={parrain['affiliate_code']}")
        self.assertIn("Parrain</strong> vous invite", text)
        self.assertIn(f'href="/inscription?ref={parrain["affiliate_code"]}"', text)
        filleul = self.signup(visitor, "Filleule", "filleule@test.fr")
        self.assertEqual(filleul["referred_by"], parrain["id"])

        # Sans cookie, le code transmis dans l'URL d'inscription suffit.
        no_cookie = self.browser()
        res, page = no_cookie.get(f"/inscription?ref={parrain['affiliate_code']}")
        self.assertIn("Invité par <strong>Parrain</strong>", page)
        ref = re.search(r'name="ref" value="([^"]*)"', page).group(1)
        no_cookie.post("/inscription", {"name": "Sans cookie", "email": "sc@test.fr",
                                        "password": "motdepasse", "ref": ref})
        self.assertEqual(self.app.s.authenticate("sc@test.fr", "motdepasse")["referred_by"],
                         parrain["id"])

        # Leçon premium bloquée, puis débloquée après paiement (mode démo).
        res, text = visitor.get("/lecons/3")
        self.assertIn("réservée aux membres Premium", text)
        res, _ = visitor.post("/premium/checkout", csrf_from=text)
        self.assertEqual(res.status, 303)
        res, text = visitor.get("/lecons/3")
        self.assertIn("Marquer comme terminée", text)
        res, _ = visitor.post("/lecons/3/terminer", csrf_from=text)
        self.assertEqual(res.getheader("Location"), "/formations/1")

        res, text = parrain_browser.get("/affiliation")
        self.assertIn("Filleule", text)
        self.assertIn("8,70", text)  # 30 % de 29 €
        stats = self.app.s.aff.stats(parrain["affiliate_id"])
        self.assertEqual((stats["clicks"], stats["conversions"]), (1, 1))

    def test_community_flow_and_csrf(self):
        b = self.browser()
        self.signup(b, "Awa", "awa@test.fr")
        res, page = b.get("/communaute")
        self.assertIn("Bienvenue dans Starling", page)
        res, _ = b.post("/communaute", {"category": "veille", "title": "Sans jeton", "body": "x"})
        self.assertEqual(res.status, 403)
        res, _ = b.post("/communaute", {"category": "veille", "title": "<b>Actu</b> IA",
                                        "body": "Un **nouveau** modèle"}, csrf_from=page)
        self.assertEqual(res.status, 303)
        location = res.getheader("Location")
        res, text = b.get(location)
        self.assertIn("&lt;b&gt;Actu&lt;/b&gt; IA", text)
        self.assertIn("<strong>nouveau</strong>", text)
        res, _ = b.post(location + "/commentaires", {"body": "Merci !"}, csrf_from=text)
        res, text = b.get(location)
        self.assertIn("Merci !", text)
        b.post(location + "/jaime", csrf_from=text)
        res, text = b.get(location)
        self.assertIn("♥ 1", text)
        b.post(location + "/supprimer", csrf_from=text)
        self.assertEqual(b.get(location)[0].status, 404)

    def test_login_logout(self):
        b = self.browser()
        self.signup(b, "Awa", "awa@test.fr")
        res, text = b.get("/communaute")
        b.post("/deconnexion", csrf_from=text)
        self.assertEqual(b.get("/communaute")[0].status, 303)
        res, text = b.post("/connexion", {"email": "awa@test.fr", "password": "faux"})
        self.assertIn("incorrect", text)
        res, _ = b.post("/connexion", {"email": "awa@test.fr", "password": "motdepasse",
                                       "next": "//evil.test"})
        self.assertEqual(res.getheader("Location"), "/communaute")


class AdminTest(WebTest):
    def test_admin_only(self):
        b = self.browser()
        self.signup(b, "Awa", "awa@test.fr")
        self.assertEqual(b.get("/admin")[0].status, 404)

    def test_admin_manages_content_and_payouts(self):
        parrain_browser = self.browser()
        parrain = self.signup(parrain_browser, "Parrain", "parrain@test.fr")
        filleul = self.signup(self.browser(), "Filleul", "filleul@test.fr", ref=parrain["affiliate_code"])
        self.app.s.record_payment(filleul["id"], 29, "inv_1", "test")

        admin = self.browser()
        self.signup(admin, "Admin", "admin@starling.test")
        res, page = admin.get("/admin")
        self.assertEqual(res.status, 200)
        self.assertIn("Commissions à valider", page)
        res, _ = admin.post("/admin/formations", {"title": "Agents IA", "level": "Avancé",
                                                  "description": "Construire des agents."},
                            csrf_from=page)
        self.assertEqual(res.status, 303)
        course_id = self.app.s.list_courses()[-1]["id"]
        admin.post("/admin/lecons", {"course_id": course_id, "title": "Premiers pas",
                                     "content": "Texte", "is_free": "1",
                                     "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
                   csrf_from=page)
        lesson_id = self.app.s.get_course(course_id)["lessons"][0]["id"]
        res, text = parrain_browser.get(f"/lecons/{lesson_id}")
        self.assertIn("youtube-nocookie.com/embed/dQw4w9WgXcQ", text)

        commission = self.app.s.aff.list_commissions(parrain["affiliate_id"])[0]
        admin.post(f"/admin/commissions/{commission['id']}", {"status": "approved"}, csrf_from=page)
        admin.post(f"/admin/affilies/{parrain['affiliate_id']}/payer", csrf_from=page)
        self.assertEqual(self.app.s.aff.stats(parrain["affiliate_id"])["commissions"]["paid"], 8.7)

        res, text = admin.post("/admin/flux", {"name": "X", "url": "ftp://x"}, csrf_from=page)
        self.assertIn("http:// ou https://", text)


class StripeWebhookTest(WebTest):
    stripe = payments.StripeGateway("sk_test", "price_test", "whsec_test")

    def test_webhook(self):
        user = self.signup(self.browser(), "Client", "client@test.fr")
        body = json.dumps({"type": "invoice.paid", "data": {"object": {
            "id": "in_1", "customer": "cus_9", "amount_paid": 2900,
            "subscription_details": {"metadata": {"user_id": str(user["id"])}}}}}).encode()
        b = self.browser()
        res, _ = b.request("POST", "/webhooks/stripe", raw=body,
                           headers={"Stripe-Signature": "t=1,v1=faux"})
        self.assertEqual(res.status, 400)
        res, _ = b.request("POST", "/webhooks/stripe", raw=body,
                           headers={"Stripe-Signature": payments.sign_payload(body, "whsec_test")})
        self.assertEqual(res.status, 200)
        self.assertTrue(self.app.s.get_user(user["id"])["is_premium"])


if __name__ == "__main__":
    unittest.main()
