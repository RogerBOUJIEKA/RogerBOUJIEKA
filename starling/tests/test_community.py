import json
import threading
import time
import unittest

from community import markdown, news, payments
from community.models import Starling, StarlingError

Starling.password_iterations = 1000  # tests rapides


def new_starling(test, **kwargs):
    starling = Starling(**kwargs)
    test.addCleanup(starling.db.close)
    return starling

RSS = b"""<?xml version="1.0"?><rss version="2.0"><channel><title>Blog IA</title>
<item><title>Nouveau mod&#232;le</title><link>https://ia.test/a</link>
<description>&lt;p&gt;Un mod&#232;le &lt;b&gt;plus rapide&lt;/b&gt;.&lt;/p&gt;</description>
<pubDate>Mon, 06 Oct 2025 10:00:00 GMT</pubDate></item>
<item><title>Sans lien</title></item>
<item><title>Lien dangereux</title><link>javascript:alert(1)</link></item>
</channel></rss>"""

ATOM = b"""<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Labo</title>
<entry><title>Recherche</title><link rel="alternate" href="https://labo.test/r"/>
<summary>R\xc3\xa9sum\xc3\xa9</summary><updated>2025-10-07T08:30:00Z</updated></entry></feed>"""


class MembersTest(unittest.TestCase):
    def setUp(self):
        self.s = new_starling(self, price=29, commission_percent=30, tier2_rate=0.10,
                              admin_email="admin@starling.test")

    def test_register_and_login(self):
        user = self.s.register("Awa", "Awa@Test.fr", "motdepasse")
        self.assertEqual(user["email"], "awa@test.fr")
        self.assertNotIn("password_hash", user)
        self.assertFalse(user["is_premium"])
        self.assertEqual(self.s.authenticate("awa@test.fr", "motdepasse")["id"], user["id"])
        self.assertIsNone(self.s.authenticate("awa@test.fr", "mauvais"))
        self.assertIsNone(self.s.authenticate("inconnu@test.fr", "motdepasse"))
        with self.assertRaises(StarlingError):
            self.s.register("Awa", "awa@test.fr", "motdepasse")
        with self.assertRaises(StarlingError):
            self.s.register("Bob", "bob@test.fr", "court")

    def test_admin_email_gets_admin(self):
        admin = self.s.register("Admin", "admin@starling.test", "motdepasse")
        self.assertTrue(admin["is_admin"])
        self.assertTrue(admin["is_premium"])

    def test_sessions(self):
        user = self.s.register("Awa", "awa@test.fr", "motdepasse")
        token = self.s.create_session(user["id"])
        found, csrf = self.s.session_user(token)
        self.assertEqual(found["id"], user["id"])
        self.assertTrue(csrf)
        self.s.end_session(token)
        self.assertEqual(self.s.session_user(token), (None, None))

    def test_recurring_two_level_commissions(self):
        grand = self.s.register("Grand", "grand@test.fr", "motdepasse")
        parent = self.s.register("Parent", "parent@test.fr", "motdepasse",
                                 referrer_code=grand["affiliate_code"])
        child = self.s.register("Enfant", "enfant@test.fr", "motdepasse",
                                referrer_code=parent["affiliate_code"])
        self.assertEqual(child["referred_by"], parent["id"])

        self.assertTrue(self.s.record_payment(child["id"], 29, "inv_1", "test"))
        self.assertFalse(self.s.record_payment(child["id"], 29, "inv_1", "test"))  # idempotent
        self.assertTrue(self.s.record_payment(child["id"], 29, "inv_2", "test"))
        self.assertTrue(self.s.get_user(child["id"])["is_premium"])

        parent_stats = self.s.aff.stats(parent["affiliate_id"])
        self.assertEqual(parent_stats["commissions"]["pending"], 17.4)  # 2 × 30 % de 29 €
        self.assertEqual(parent_stats["conversions"], 2)
        grand_stats = self.s.aff.stats(grand["affiliate_id"])
        self.assertEqual(grand_stats["commissions"]["pending"], 1.74)  # 10 % des commissions
        self.assertEqual([r["id"] for r in self.s.referrals(parent["id"])], [child["id"]])

    def test_payment_without_referrer_has_no_commission(self):
        user = self.s.register("Solo", "solo@test.fr", "motdepasse")
        self.s.record_payment(user["id"], 29, "inv_solo", "test")
        self.assertEqual(self.s.aff.list_commissions(), [])
        self.assertEqual(self.s.admin_stats()["revenue"], 29.0)

    def test_cancel_premium(self):
        user = self.s.register("Awa", "awa@test.fr", "motdepasse")
        self.s.record_payment(user["id"], 29, "inv_1", "test")
        self.s.cancel_premium(user["id"])
        self.assertFalse(self.s.get_user(user["id"])["is_premium"])

    def test_referral_visit_counts_click(self):
        parent = self.s.register("Parent", "parent@test.fr", "motdepasse")
        visitor = self.s.record_referral_visit(parent["affiliate_code"])
        self.s.record_referral_visit(parent["affiliate_code"], visitor_id=visitor)
        self.assertEqual(self.s.aff.stats(parent["affiliate_id"])["clicks"], 2)


class ContentTest(unittest.TestCase):
    def setUp(self):
        self.s = new_starling(self)
        self.free = self.s.register("Libre", "libre@test.fr", "motdepasse")
        self.member = self.s.register("Membre", "membre@test.fr", "motdepasse")
        self.s.record_payment(self.member["id"], 29, "inv", "test")
        self.member = self.s.get_user(self.member["id"])
        self.course = self.s.add_course("Prompting", "Apprendre à écrire des prompts.", "Débutant")
        self.l1 = self.s.add_lesson(self.course, "Introduction", "Bonjour", is_free=True)
        self.l2 = self.s.add_lesson(self.course, "Avancé", "Secret")

    def test_access_and_progress(self):
        lesson2 = self.s.get_lesson(self.l2)
        self.assertEqual(lesson2["prev_id"], self.l1)
        self.assertIsNone(lesson2["next_id"])
        self.assertTrue(self.s.can_access(self.free, self.s.get_lesson(self.l1)))
        self.assertFalse(self.s.can_access(self.free, lesson2))
        self.assertTrue(self.s.can_access(self.member, lesson2))
        with self.assertRaises(StarlingError):
            self.s.complete_lesson(self.free, self.l2)
        self.s.complete_lesson(self.member, self.l1)
        self.s.complete_lesson(self.member, self.l1)
        course = self.s.list_courses(self.member["id"])[0]
        self.assertEqual((course["lesson_count"], course["free_count"], course["completed"]), (2, 1, 1))
        self.assertEqual([l["completed"] for l in self.s.get_course(self.course, self.member["id"])["lessons"]],
                         [1, 0])

    def test_validation(self):
        with self.assertRaises(StarlingError):
            self.s.add_course("Cours", "Description", "Expert")
        with self.assertRaises(StarlingError):
            self.s.add_lesson(self.course, "Vidéo", "Texte", video_url="javascript:alert(1)")

    def test_posts_comments_likes(self):
        post = self.s.create_post(self.free["id"], "questions", "Quel outil choisir ?", "Je débute.")
        self.s.add_comment(post, self.member["id"], "Commence par un assistant conversationnel.")
        self.assertTrue(self.s.toggle_like(post, self.member["id"]))
        loaded = self.s.get_post(post, self.member["id"])
        self.assertEqual((loaded["comment_count"], loaded["like_count"], loaded["liked"]), (1, 1, 1))
        self.assertFalse(self.s.toggle_like(post, self.member["id"]))
        self.assertEqual(len(self.s.list_posts("questions")), 1)
        self.assertEqual(self.s.list_posts("veille"), [])
        with self.assertRaises(StarlingError):
            self.s.delete_post(post, self.member)
        self.s.delete_post(post, self.free)
        self.assertEqual(self.s.list_posts(), [])
        with self.assertRaises(StarlingError):
            self.s.create_post(self.free["id"], "inconnue", "Titre", "Texte")

    def test_pinned_first_and_author_badge(self):
        self.s.create_post(self.member["id"], "discussions", "Ancien épinglé", "x", pinned=True)
        self.s.create_post(self.free["id"], "discussions", "Récent", "x")
        posts = self.s.list_posts()
        self.assertEqual(posts[0]["title"], "Ancien épinglé")
        self.assertEqual(posts[0]["author_premium"], 1)
        self.assertEqual(posts[1]["author_premium"], 0)


class MarkdownTest(unittest.TestCase):
    def test_escapes_html(self):
        out = markdown.render('<script>alert(1)</script> [x](javascript:alert(1)) **gras**')
        self.assertNotIn("<script>", out)
        self.assertNotIn('href="javascript', out)
        self.assertIn("<strong>gras</strong>", out)

    def test_blocks(self):
        out = markdown.render("## Titre\n\n- un\n- deux\n\n1. a\n2. b\n\n> cite\n\n```\n<b>\n```\n"
                              "Voir [doc](https://doc.test/?a=1&b=2) et `x<y`")
        for fragment in ("<h3>Titre</h3>", "<ul><li>un</li><li>deux</li></ul>",
                         "<ol><li>a</li><li>b</li></ol>", "<blockquote>cite</blockquote>",
                         "<pre><code>&lt;b&gt;</code></pre>",
                         '<a href="https://doc.test/?a=1&amp;b=2"', "<code>x&lt;y</code>"):
            self.assertIn(fragment, out)


    def test_backticks(self):
        self.assertEqual(markdown.render("un ` seul"), "<p>un ` seul</p>")
        self.assertEqual(markdown.render("`a` puis `b"), "<p><code>a</code> puis `b</p>")
        self.assertEqual(markdown.render("Prompt : `ligne 1\nligne 2`"),
                         "<p>Prompt : <code>ligne 1<br>ligne 2</code></p>")


class NewsTest(unittest.TestCase):
    def test_parse_rss_and_atom(self):
        items = news.parse_feed(RSS)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Nouveau modèle")
        self.assertEqual(items[0]["summary"], "Un modèle plus rapide .")
        self.assertEqual(items[0]["published_at"], 1759744800)
        atom = news.parse_feed(ATOM)
        self.assertEqual((atom[0]["url"], atom[0]["summary"]), ("https://labo.test/r", "Résumé"))
        self.assertEqual(atom[0]["published_at"], 1759825800)

    def test_refresh_stores_and_reports_errors(self):
        s = new_starling(self)
        s.add_feed("Bon", "https://ok.test/feed")
        s.add_feed("Cassé", "https://ko.test/feed")

        def fake_fetch(url):
            if "ko" in url:
                raise OSError("connexion refusée")
            return news.parse_feed(RSS)

        lock = threading.Lock()
        self.assertEqual(news.refresh_all(s, lock, fake_fetch), 1)
        self.assertEqual(news.refresh_all(s, lock, fake_fetch), 0)  # pas de doublon
        feeds = {f["name"]: f for f in s.list_feeds()}
        self.assertIsNone(feeds["Bon"]["last_error"])
        self.assertIn("refusée", feeds["Cassé"]["last_error"])
        self.assertEqual(s.list_news()[0]["source"], "Bon")


class StripeTest(unittest.TestCase):
    SECRET = "whsec_test"

    def setUp(self):
        self.s = new_starling(self)
        self.parent = self.s.register("Parent", "parent@test.fr", "motdepasse")
        self.user = self.s.register("Client", "client@test.fr", "motdepasse",
                                    referrer_code=self.parent["affiliate_code"])

    def test_signature(self):
        body = b'{"type": "ping"}'
        header = payments.sign_payload(body, self.SECRET)
        self.assertEqual(payments.verify_webhook(body, header, self.SECRET), {"type": "ping"})
        with self.assertRaises(payments.PaymentError):
            payments.verify_webhook(body + b" ", header, self.SECRET)
        with self.assertRaises(payments.PaymentError):
            payments.verify_webhook(body, header, "autre_secret")
        old = payments.sign_payload(body, self.SECRET, timestamp=time.time() - 3600)
        with self.assertRaises(payments.PaymentError):
            payments.verify_webhook(body, old, self.SECRET)
        with self.assertRaises(payments.PaymentError):
            payments.verify_webhook(body, None, self.SECRET)

    def test_subscription_lifecycle(self):
        period_end = int(time.time()) + 30 * 86400
        invoice = {"type": "invoice.paid", "data": {"object": {
            "id": "in_1", "customer": "cus_1", "amount_paid": 2900,
            "parent": {"subscription_details": {"metadata": {"user_id": str(self.user["id"])}}},
            "lines": {"data": [{"period": {"end": period_end}}]}}}}
        # La facture arrive avant la fin du checkout : le membre est retrouvé par les métadonnées.
        self.assertTrue(payments.apply_event(self.s, json.loads(json.dumps(invoice))))
        self.assertTrue(payments.apply_event(self.s, {"type": "checkout.session.completed", "data": {
            "object": {"client_reference_id": str(self.user["id"]), "customer": "cus_1",
                       "subscription": "sub_1"}}}))
        user = self.s.get_user(self.user["id"])
        self.assertTrue(user["is_premium"])
        self.assertEqual(user["stripe_subscription_id"], "sub_1")
        self.assertEqual(user["premium_until"], period_end + 86400)
        payments.apply_event(self.s, invoice)  # webhook rejoué : ignoré
        renewal = {"type": "invoice.paid", "data": {"object": {
            "id": "in_2", "customer": "cus_1", "amount_paid": 2900}}}
        payments.apply_event(self.s, renewal)
        self.assertEqual(self.s.aff.stats(self.parent["affiliate_id"])["commissions"]["pending"], 17.4)
        payments.apply_event(self.s, {"type": "customer.subscription.deleted",
                                      "data": {"object": {"customer": "cus_1"}}})
        self.assertFalse(self.s.get_user(self.user["id"])["is_premium"])

    def test_unknown_events_ignored(self):
        self.assertFalse(payments.apply_event(self.s, {"type": "invoice.paid", "data": {
            "object": {"id": "in_x", "customer": "cus_inconnu", "amount_paid": 2900}}}))
        self.assertFalse(payments.apply_event(self.s, {"type": "charge.refunded"}))


if __name__ == "__main__":
    unittest.main()
