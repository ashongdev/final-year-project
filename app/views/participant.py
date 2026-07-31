"""
Recipient allow-listing for published templates.

When a template has at least one PublishedRecipient row, its public
participant link requires proving ownership of one of those recipients'
email addresses (via a one-time code) before /generate/ will render a
certificate for it. Templates with no recipients stay fully open.
"""
import logging

import resend
from django.core import signing
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import PublishedRecipient, RecipientVerification, Templates
from ..throttles import VerificationThrottle
from ..util import parse_json_field

logger = logging.getLogger("app")

resend.api_key = settings.RESEND_API_KEY

VERIFICATION_SALT = "recipient-verification"
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24  # 24h — see PublishedRecipient.download_count


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_recipients(request):
    """Replace the recipient allow-list for a template the user owns."""
    public_id = (request.data.get("public_id") or "").strip()
    if not public_id:
        return Response({"error": "public_id is required."}, status=400)

    template = Templates.objects.filter(public_id=public_id, user=request.user).first()
    if not template:
        return Response({"error": "Template not found."}, status=404)

    raw_recipients = parse_json_field(request.data.get("recipients"), [])
    if not isinstance(raw_recipients, list):
        return Response({"error": "recipients must be a list."}, status=400)

    seen_emails = set()
    valid_recipients = []
    for entry in raw_recipients:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name", "")).strip()[:255]
        email = str(entry.get("email", "")).strip().lower()[:254]
        if not name or not email or email in seen_emails:
            continue
        try:
            validate_email(email)
        except ValidationError:
            continue
        seen_emails.add(email)
        valid_recipients.append((name, email))

    with transaction.atomic():
        PublishedRecipient.objects.filter(template=template).delete()
        PublishedRecipient.objects.bulk_create(
            [
                PublishedRecipient(template=template, name=name, email=email)
                for name, email in valid_recipients
            ]
        )

    return Response({"count": len(valid_recipients)})


@api_view(["POST"])
@throttle_classes([VerificationThrottle])
def request_verification_code(request):
    """Email a one-time code to a claimed recipient of a gated template."""
    public_id = (request.data.get("certificateId") or "").strip()
    email = (request.data.get("email") or "").strip().lower()

    if not public_id or not email:
        return Response({"error": "certificateId and email are required."}, status=400)

    template = Templates.objects.filter(public_id=public_id).first()
    if not template:
        return Response({"error": "Certificate not found."}, status=404)

    recipient = PublishedRecipient.objects.filter(
        template=template, email__iexact=email
    ).first()
    if not recipient:
        return Response(
            {"error": "This email is not on the recipient list for this certificate."},
            status=404,
        )

    verification = RecipientVerification.objects.create(template=template, email=email)

    try:
        resend.Emails.send(
            {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": [email],
                "subject": "Your certificate verification code",
                "html": (
                    f"<p>Your verification code is <strong>{verification.code}</strong>."
                    "<br>It expires in 10 minutes.</p>"
                ),
            }
        )
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", email, exc)
        return Response({"error": "Failed to send verification email."}, status=502)

    return Response({"sent": True})


@api_view(["POST"])
@throttle_classes([VerificationThrottle])
def verify_recipient_code(request):
    """Validate a code and issue a signed token proving recipient ownership."""
    public_id = (request.data.get("certificateId") or "").strip()
    email = (request.data.get("email") or "").strip().lower()
    code = (request.data.get("code") or "").strip()

    if not public_id or not email or not code:
        return Response(
            {"error": "certificateId, email, and code are required."}, status=400
        )

    template = Templates.objects.filter(public_id=public_id).first()
    if not template:
        return Response({"error": "Certificate not found."}, status=404)

    verification = (
        RecipientVerification.objects.filter(
            template=template, email__iexact=email, consumed=False
        )
        .order_by("-created_at")
        .first()
    )

    if not verification or not verification.is_valid():
        return Response(
            {"error": "Code expired or invalid. Please request a new one."}, status=400
        )

    if verification.code != code:
        verification.attempts += 1
        verification.save(update_fields=["attempts"])
        return Response({"error": "Incorrect code."}, status=400)

    verification.consumed = True
    verification.save(update_fields=["consumed"])

    recipient = PublishedRecipient.objects.filter(
        template=template, email__iexact=email
    ).first()
    if not recipient:
        return Response({"error": "Recipient no longer on the list."}, status=404)

    token = signing.dumps({"public_id": public_id, "email": email}, salt=VERIFICATION_SALT)

    return Response({"token": token, "name": recipient.name})
