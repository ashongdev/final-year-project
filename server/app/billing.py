"""
Stripe billing helpers: subscriptions (Pro tier) and one-time credit packs.

Subscription state is only ever written in response to a verified Stripe
webhook event (see app.views.billing.stripe_webhook) — never trusted from
the client directly, and never written synchronously from a checkout
request, since the payment isn't actually confirmed until Stripe says so.
"""
import stripe
from django.conf import settings

from .models import Subscription

stripe.api_key = settings.STRIPE_SECRET_KEY


def get_or_create_subscription(user) -> Subscription:
    subscription, _ = Subscription.objects.get_or_create(user=user)
    return subscription


def user_has_pro_access(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return get_or_create_subscription(user).is_pro


def get_credit_balance(user) -> int:
    if not user or not getattr(user, "is_authenticated", False):
        return 0
    return get_or_create_subscription(user).credit_balance


def batch_recipient_cap(user) -> int:
    """
    How many recipients this user may generate in a single batch: unlimited
    (well, the hard technical ceiling) for Pro, otherwise the free cap plus
    whatever credits they've bought.
    """
    from .views.batch import MAX_RECIPIENTS  # local import avoids a cycle

    if user_has_pro_access(user):
        return MAX_RECIPIENTS
    return settings.FREE_BATCH_RECIPIENT_CAP + get_credit_balance(user)
