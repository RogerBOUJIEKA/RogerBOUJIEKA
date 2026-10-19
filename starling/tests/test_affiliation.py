import http.client
import json
import os
import threading
import time
import unittest
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from affiliation.core import Affiliation, AffiliationError
from affiliation.server import make_server

os.environ["AFFILIATION_QUIET"] = "1"


class CoreTest(unittest.TestCase):
    def setUp(self):
        self.a = Affiliation(tier2_rate=0.10)
        self.addCleanup(self.a.db.close)
        self.course = self.a.add_product("Formation", "https://shop.test/formation", "percent", 30)
        self.ebook = self.a.add_product("Ebook", "https://shop.test/ebook", "fixed", 5)
        self.parent, _ = self.a.register_affiliate("Parrain", "parrain@test.fr")
        self.child, self.child_key = self.a.register_affiliate(
            "Filleul", "filleul@test.fr", parent_code=self.parent["code"])

    def test_click_then_sale_pays_both_levels(self):
        _, vid, url = self.a.record_click(self.child["code"], self.course["id"])
        self.assertEqual(url, "https://shop.test/formation")
        result = self.a.record_conversion("CMD-1", self.course["id"], 200, visitor_id=vid)
        self.assertEqual(result["commission"], 60.0)
        comms = {c["level"]: c for c in self.a.list_commissions()}
        self.assertEqual(comms[1]["affiliate_id"], self.child["id"])
        self.assertEqual(comms[2]["affiliate_id"], self.parent["id"])
        self.assertEqual(comms[2]["amount"], 6.0)

    def test_fixed_commission(self):
        _, vid, _ = self.a.record_click(self.child["code"], self.ebook["id"])
        result = self.a.record_conversion("CMD-2", self.ebook["id"], 19.9, visitor_id=vid)
        self.assertEqual(result["commission"], 5.0)

    def test_last_click_wins(self):
        _, vid, _ = self.a.record_click(self.parent["code"], self.course["id"])
        self.a.record_click(self.child["code"], self.course["id"], visitor_id=vid)
        result = self.a.record_conversion("CMD-3", self.course["id"], 100, visitor_id=vid)
        self.assertEqual(result["affiliate_id"], self.child["id"])

    def test_expired_cookie_is_not_attributed(self):
        _, vid, _ = self.a.record_click(self.child["code"], self.course["id"])
        with mock.patch("affiliation.core.time.time", return_value=time.time() + 31 * 86400):
            self.assertIsNone(self.a.record_conversion("CMD-4", self.course["id"], 100,
                                                       visitor_id=vid))

    def test_coupon_code_fallback(self):
        result = self.a.record_conversion("CMD-5", self.course["id"], 50,
                                          affiliate_code=self.parent["code"])
        self.assertEqual(result["affiliate_id"], self.parent["id"])

    def test_duplicate_order_rejected(self):
        self.a.record_conversion("CMD-6", self.course["id"], 50, affiliate_code=self.parent["code"])
        with self.assertRaises(AffiliationError):
            self.a.record_conversion("CMD-6", self.course["id"], 50,
                                     affiliate_code=self.parent["code"])

    def test_payment_workflow(self):
        self.a.record_conversion("CMD-7", self.course["id"], 100, affiliate_code=self.child["code"])
        commission = self.a.list_commissions(self.child["id"])[0]
        with self.assertRaises(AffiliationError):
            self.a.set_commission_status(commission["id"], "paid")  # pas encore approuvée
        self.a.set_commission_status(commission["id"], "approved")
        self.assertEqual(self.a.stats(self.child["id"])["balance_due"], 30.0)
        self.assertEqual(self.a.pay_affiliate(self.child["id"]), 30.0)
        stats = self.a.stats(self.child["id"])
        self.assertEqual(stats["balance_due"], 0.0)
        self.assertEqual(stats["commissions"]["paid"], 30.0)
        with self.assertRaises(AffiliationError):
            self.a.set_commission_status(commission["id"], "rejected")

    def test_stats_and_auth(self):
        self.a.record_click(self.child["code"], self.course["id"])
        _, vid, _ = self.a.record_click(self.child["code"], self.course["id"])
        self.a.record_conversion("CMD-8", self.course["id"], 80, visitor_id=vid)
        stats = self.a.stats(self.child["id"])
        self.assertEqual((stats["clicks"], stats["conversions"], stats["conversion_rate"]),
                         (2, 1, 50.0))
        self.assertEqual(self.a.stats(self.parent["id"])["referrals"], 1)
        self.assertEqual(self.a.authenticate(self.child_key)["id"], self.child["id"])
        self.assertIsNone(self.a.authenticate("mauvaise-cle"))

    def test_validation(self):
        with self.assertRaises(AffiliationError):
            self.a.register_affiliate("X", "parrain@test.fr")
        with self.assertRaises(AffiliationError):
            self.a.add_product("X", "javascript:alert(1)", "fixed", 1)
        with self.assertRaises(AffiliationError):
            self.a.add_product("X", "https://x.test", "percent", 150)


class ServerTest(unittest.TestCase):
    TOKEN = "secret-admin"

    def setUp(self):
        self.server = make_server(port=0, db_path=":memory:", admin_token=self.TOKEN)
        self.port = self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def call(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port)
        conn.request(method, path, json.dumps(body) if body is not None else None, headers or {})
        res = conn.getresponse()
        raw = res.read()
        conn.close()
        return res, (json.loads(raw) if raw and res.getheader("Content-Type", "").startswith(
            "application/json") else raw)

    def admin(self):
        return {"Authorization": f"Bearer {self.TOKEN}"}

    def test_full_flow(self):
        res, _ = self.call("POST", "/api/products", {"name": "P", "url": "https://shop.test/p?x=1",
                                                     "commission_type": "percent",
                                                     "commission_value": 10})
        self.assertEqual(res.status, 401)
        res, product = self.call("POST", "/api/products",
                                 {"name": "P", "url": "https://shop.test/p?x=1",
                                  "commission_type": "percent", "commission_value": 10},
                                 self.admin())
        self.assertEqual(res.status, 201)

        res, signup = self.call("POST", "/api/affiliates", {"name": "Ana", "email": "ana@test.fr"})
        self.assertEqual(res.status, 201)
        link = urlsplit(signup["links"][0]["url"]).path

        res, _ = self.call("GET", link)
        self.assertEqual(res.status, 302)
        location = urlsplit(res.getheader("Location"))
        self.assertEqual(location.netloc, "shop.test")
        params = parse_qs(location.query)
        self.assertEqual(params["x"], ["1"])
        vid = params["aff_vid"][0]
        self.assertIn(f"aff_vid={vid}", res.getheader("Set-Cookie"))

        res, conv = self.call("POST", "/api/conversions",
                              {"order_id": "A1", "product_id": product["id"], "amount": 150,
                               "visitor_id": vid}, self.admin())
        self.assertEqual(res.status, 201)
        self.assertEqual(conv["commission"], 15.0)

        res, me = self.call("GET", "/api/me", headers={"X-Api-Key": signup["api_key"]})
        self.assertEqual(res.status, 200)
        self.assertEqual(me["stats"]["clicks"], 1)
        self.assertEqual(me["stats"]["commissions"]["pending"], 15.0)

        cid = me["commissions"][0]["id"]
        self.call("POST", f"/api/commissions/{cid}/status", {"status": "approved"}, self.admin())
        res, paid = self.call("POST", f"/api/affiliates/{signup['affiliate']['id']}/pay", {},
                              self.admin())
        self.assertEqual(paid["paid"], 15.0)

    def test_errors_and_pages(self):
        self.assertEqual(self.call("GET", "/r/inconnu/1")[0].status, 404)
        self.assertEqual(self.call("GET", "/api/me", headers={"X-Api-Key": "x"})[0].status, 401)
        self.assertEqual(self.call("GET", "/api/admin/overview")[0].status, 401)
        res, body = self.call("POST", "/api/affiliates", {"name": "", "email": "bad"})
        self.assertEqual(res.status, 400)
        for page in ("/", "/dashboard", "/admin"):
            res, html = self.call("GET", page)
            self.assertEqual(res.status, 200)
            self.assertIn(b"<html", html)


if __name__ == "__main__":
    unittest.main()
