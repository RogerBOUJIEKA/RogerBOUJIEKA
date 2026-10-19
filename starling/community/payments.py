"""Paiements : abonnements Stripe (Checkout + webhooks).

Sans clés Stripe, Starling fonctionne en mode démo : le passage à Premium est
simulé, ce qui permet de tester tout le parcours (y compris les commissions).
"""

import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request
from urllib.parse import urlencode

from .models import StarlingError


class PaymentError(Exception):
    pass


class StripeGateway:
    api_base = "https://api.stripe.com/v1"

    def __init__(self, secret_key, price_id, webhook_secret):
        self.secret_key = secret_key
        self.price_id = price_id
        self.webhook_secret = webhook_secret

    def _post(self, path, params):
        request = urllib.request.Request(
            self.api_base + path, data=urlencode(params).encode(),
            headers={"Authorization": f"Bearer {self.secret_key}"})
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            try:
                message = json.load(exc).get("error", {}).get("message")
            except ValueError:
                message = None
            raise PaymentError(message or f"Stripe a répondu {exc.code}") from None
        except urllib.error.URLError as exc:
            raise PaymentError(f"Stripe injoignable : {exc.reason}") from None

    def create_checkout(self, user, success_url, cancel_url):
        """Crée une session Stripe Checkout et retourne l'URL de paiement."""
        params = {
            "mode": "subscription",
            "line_items[0][price]": self.price_id,
            "line_items[0][quantity]": "1",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": str(user["id"]),
            "subscription_data[metadata][user_id]": str(user["id"]),
            "allow_promotion_codes": "true",
        }
        if user.get("stripe_customer_id"):
            params["customer"] = user["stripe_customer_id"]
        else:
            params["customer_email"] = user["email"]
        return self._post("/checkout/sessions", params)["url"]

    def parse_event(self, payload, signature_header):
        return verify_webhook(payload, signature_header, self.webhook_secret)


def sign_payload(payload, secret, timestamp=None):
    """Construit un en-tête Stripe-Signature (tests et simulations locales)."""
    timestamp = int(timestamp or time.time())
    digest = hmac.new(secret.encode(), f"{timestamp}.".encode() + payload, hashlib.sha256)
    return f"t={timestamp},v1={digest.hexdigest()}"


def verify_webhook(payload, header, secret, tolerance=300, now=None):
    timestamp, signatures = None, []
    for item in (header or "").split(","):
        key, _, value = item.strip().partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            signatures.append(value)
    if not timestamp or not signatures or not timestamp.isdigit():
        raise PaymentError("signature Stripe absente")
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + payload,
                        hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, s) for s in signatures):
        raise PaymentError("signature Stripe invalide")
    if abs((now or time.time()) - int(timestamp)) > tolerance:
        raise PaymentError("signature Stripe expirée")
    return json.loads(payload)


def _invoice_user(starling, invoice):
    user = starling.user_by_stripe_customer(invoice.get("customer"))
    if user:
        return user
    # Le webhook invoice.paid peut arriver avant checkout.session.completed :
    # on retrouve alors le membre grâce aux métadonnées de l'abonnement.
    for details in ((invoice.get("subscription_details") or {}),
                    ((invoice.get("parent") or {}).get("subscription_details") or {})):
        user_id = str((details.get("metadata") or {}).get("user_id", ""))
        if user_id.isdigit():
            try:
                user = starling.get_user(int(user_id))
            except StarlingError:
                return None
            if invoice.get("customer"):
                starling.link_stripe(user["id"], invoice["customer"])
            return user
    return None


def apply_event(starling, event):
    """Applique un événement Stripe ; retourne True s'il a été pris en compte."""
    kind = event.get("type")
    obj = (event.get("data") or {}).get("object") or {}
    if kind == "checkout.session.completed":
        user_id = str(obj.get("client_reference_id") or "")
        if user_id.isdigit() and obj.get("customer"):
            starling.link_stripe(int(user_id), obj["customer"], obj.get("subscription"))
            return True
    elif kind in ("invoice.paid", "invoice.payment_succeeded"):
        user = _invoice_user(starling, obj)
        amount = (obj.get("amount_paid") or 0) / 100
        if user and amount > 0 and obj.get("id"):
            ends = [line.get("period", {}).get("end")
                    for line in (obj.get("lines") or {}).get("data", [])]
            ends = [e for e in ends if e]
            starling.record_payment(user["id"], amount, obj["id"], "stripe",
                                    paid_until=max(ends) if ends else None)
            return True
    elif kind == "customer.subscription.deleted":
        user = starling.user_by_stripe_customer(obj.get("customer"))
        if user:
            starling.cancel_premium(user["id"])
            return True
    return False
