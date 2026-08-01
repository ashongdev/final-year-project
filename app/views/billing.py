"""
Stripe checkout, billing portal, and webhook endpoints.

Subscription/credit state is only ever written from stripe_webhook, after
Stripe's signature has been verified — never synchronously from a checkout
request, since payment isn't actually confirmed until Stripe says so.
"""

import logging

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..billing import get_or_create_subscription
from ..models import Subscription

logger = logging.getLogger("app")

stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def billing_status(request):
    subscription = get_or_create_subscription(request.user)
    return Response(
        {
            "tier": subscription.tier,
            "status": subscription.status,
            "interval": subscription.interval,
            "current_period_end": subscription.current_period_end,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "credit_balance": subscription.credit_balance,
            "is_pro": subscription.is_pro,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_subscription_checkout(request):
    interval = request.data.get("interval")
    price_id = {
        "month": settings.STRIPE_PRICE_MONTHLY,
        "year": settings.STRIPE_PRICE_ANNUAL,
    }.get(interval)
    if not price_id:
        return Response({"error": "interval must be 'month' or 'year'."}, status=400)

    subscription = get_or_create_subscription(request.user)
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            client_reference_id=str(request.user.pk),
            customer=subscription.stripe_customer_id or None,
            customer_email=(
                None if subscription.stripe_customer_id else request.user.email
            ),
            success_url=f"{settings.FRONTEND_URL}/dashboard/billing?checkout=success",
            cancel_url=f"{settings.FRONTEND_URL}/pricing?checkout=cancelled",
        )
    except stripe.error.StripeError as exc:
        logger.error(
            "Failed to create subscription checkout for user %s: %s",
            request.user.pk,
            exc,
        )
        return Response({"error": "Failed to start checkout."}, status=502)

    return Response({"url": session.url})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_credit_checkout(request):
    subscription = get_or_create_subscription(request.user)
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"price": settings.STRIPE_PRICE_CREDIT_PACK, "quantity": 1}],
            client_reference_id=str(request.user.pk),
            customer=subscription.stripe_customer_id or None,
            customer_email=(
                None if subscription.stripe_customer_id else request.user.email
            ),
            success_url=f"{settings.FRONTEND_URL}/dashboard/billing?checkout=success",
            cancel_url=f"{settings.FRONTEND_URL}/pricing?checkout=cancelled",
        )
    except stripe.error.StripeError as exc:
        logger.error(
            "Failed to create credit checkout for user %s: %s", request.user.pk, exc
        )
        return Response({"error": "Failed to start checkout."}, status=502)

    return Response({"url": session.url})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_billing_portal_session(request):
    subscription = get_or_create_subscription(request.user)
    if not subscription.stripe_customer_id:
        return Response(
            {"error": "No billing account yet. Subscribe or buy credits first."},
            status=400,
        )

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/dashboard/billing",
        )
    except stripe.error.StripeError as exc:
        logger.error(
            "Failed to create billing portal session for user %s: %s",
            request.user.pk,
            exc,
        )
        return Response({"error": "Failed to open billing portal."}, status=502)

    return Response({"url": portal_session.url})


def _handle_checkout_completed(session: dict) -> None:
    user_id = session.get("client_reference_id")
    if not user_id:
        logger.warning(
            "Checkout session completed with no client_reference_id: %s",
            session.get("id"),
        )
        return

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except (User.DoesNotExist, ValueError):
        logger.warning("Checkout session references unknown user id %s", user_id)
        return

    subscription = get_or_create_subscription(user)
    customer_id = session.get("customer", "") or subscription.stripe_customer_id
    mode = session.get("mode")

    if mode == "subscription":
        subscription.stripe_customer_id = customer_id
        subscription.stripe_subscription_id = session.get("subscription", "")
        subscription.tier = Subscription.Tier.PRO
        subscription.status = Subscription.Status.ACTIVE
        # interval / current_period_end are filled in properly by the
        # customer.subscription.updated event Stripe sends right after this.
        subscription.save()
    elif mode == "payment":
        Subscription.objects.filter(pk=subscription.pk).update(
            credit_balance=models.F("credit_balance") + settings.CREDIT_PACK_SIZE,
            stripe_customer_id=customer_id,
        )
    else:
        subscription.stripe_customer_id = customer_id
        subscription.save(update_fields=["stripe_customer_id", "updated_at"])


def _handle_subscription_updated(sub_obj: dict) -> None:
    customer_id = sub_obj.get("customer", "")
    subscription = Subscription.objects.filter(stripe_customer_id=customer_id).first()
    if not subscription:
        logger.warning("subscription.updated for unknown customer %s", customer_id)
        return

    stripe_status = sub_obj.get("status", "")
    if stripe_status == "active":
        subscription.status = Subscription.Status.ACTIVE
        subscription.tier = Subscription.Tier.PRO
    elif stripe_status == "past_due":
        subscription.status = Subscription.Status.PAST_DUE
        subscription.tier = Subscription.Tier.PRO
    else:
        subscription.status = Subscription.Status.CANCELED
        subscription.tier = Subscription.Tier.FREE

    items = sub_obj.get("items", {}).get("data", [])
    if items:
        subscription.interval = (
            items[0].get("price", {}).get("recurring", {}).get("interval", "")
        )

    subscription.stripe_subscription_id = sub_obj.get("id", "")
    subscription.cancel_at_period_end = bool(sub_obj.get("cancel_at_period_end"))
    period_end = sub_obj.get("current_period_end")
    if period_end:
        subscription.current_period_end = timezone.datetime.fromtimestamp(
            period_end, tz=timezone.utc
        )
    subscription.save()


def _handle_subscription_deleted(sub_obj: dict) -> None:
    customer_id = sub_obj.get("customer", "")
    subscription = Subscription.objects.filter(stripe_customer_id=customer_id).first()
    if not subscription:
        return
    subscription.tier = Subscription.Tier.FREE
    subscription.status = Subscription.Status.CANCELED
    subscription.cancel_at_period_end = False
    subscription.save(
        update_fields=["tier", "status", "cancel_at_period_end", "updated_at"]
    )


def _handle_payment_failed(invoice: dict) -> None:
    customer_id = invoice.get("customer", "")
    subscription = Subscription.objects.filter(stripe_customer_id=customer_id).first()
    if not subscription:
        return
    subscription.status = Subscription.Status.PAST_DUE
    subscription.save(update_fields=["status", "updated_at"])


@csrf_exempt
def stripe_webhook(request):
    if request.method != "POST":
        return HttpResponse(status=405)

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        return HttpResponse(status=400)

    event_type = event["type"]
    # StripeObject only supports item/attribute access, not dict-style
    # .get() with defaults, which the handlers below rely on throughout.
    data = event["data"]["object"].to_dict()

    try:
        if event_type == "checkout.session.completed":
            _handle_checkout_completed(data)
        elif event_type in (
            "customer.subscription.updated",
            "customer.subscription.created",
        ):
            _handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            _handle_subscription_deleted(data)
        elif event_type == "invoice.payment_failed":
            _handle_payment_failed(data)
    except Exception:
        logger.exception("Failed to process Stripe webhook event %s", event_type)
        # Still 200: retrying won't help if our own handler has a bug, and
        # Stripe will keep retrying (and alerting) on non-2xx indefinitely.
        return HttpResponse(status=200)

    return HttpResponse(status=200)
