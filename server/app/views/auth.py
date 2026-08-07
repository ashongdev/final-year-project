"""
Email/password account registration, login, and password reset.

Coexists with Google OAuth2 (see GoogleLogin in views/__init__.py) — both
land on the same Django session-cookie mechanism, so the frontend's
existing refreshAuth()/me endpoint work unchanged regardless of which
method was used to sign in.

Follows the same verification-code pattern already established for
recipient email verification (views/participant.py): a 6-digit code,
10-minute expiry, capped attempts, sent via a raw resend.Emails.send(...)
call.
"""
import logging

import resend
from django.conf import settings
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response

from ..models import AccountVerification
from ..throttles import AuthThrottle, VerificationThrottle

logger = logging.getLogger("app")

resend.api_key = settings.RESEND_API_KEY


def _send_code_email(email: str, code: str, subject: str) -> bool:
    try:
        resend.Emails.send(
            {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": [email],
                "subject": subject,
                "html": (
                    f"<p>Your verification code is <strong>{code}</strong>."
                    "<br>It expires in 10 minutes.</p>"
                ),
            }
        )
        return True
    except Exception as exc:
        logger.error("Failed to send account email to %s: %s", email, exc)
        return False


def _latest_valid_code(email: str, purpose: str, code: str):
    """Look up the latest non-consumed AccountVerification for email/purpose,
    validate it, and increment attempts on a wrong code. Returns
    (verification, error_response)."""
    verification = (
        AccountVerification.objects.filter(
            email__iexact=email, purpose=purpose, consumed=False
        )
        .order_by("-created_at")
        .first()
    )

    if not verification or not verification.is_valid():
        return None, Response(
            {"error": "Code expired or invalid. Please request a new one."}, status=400
        )

    if verification.code != code:
        verification.attempts += 1
        verification.save(update_fields=["attempts"])
        return None, Response({"error": "Incorrect code."}, status=400)

    return verification, None


@api_view(["POST"])
@throttle_classes([AuthThrottle])
def register(request):
    name = (request.data.get("name") or "").strip()
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    if not name or not email or not password:
        return Response({"error": "name, email, and password are required."}, status=400)

    if len(email) > 150:
        return Response({"error": "Email is too long."}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return Response({"error": "Enter a valid email address."}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"error": "An account with this email already exists. Try logging in instead."},
            status=400,
        )

    try:
        validate_password(password)
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)

    first_name, _, last_name = name.partition(" ")
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name[:150],
        last_name=last_name[:150],
        is_active=False,
    )

    verification = AccountVerification.objects.create(
        email=email, purpose=AccountVerification.Purpose.SIGNUP
    )
    if not _send_code_email(email, verification.code, "Verify your email"):
        user.delete()
        return Response({"error": "Failed to send verification email."}, status=502)

    return Response({"sent": True}, status=201)


@api_view(["POST"])
@throttle_classes([VerificationThrottle])
def verify_email(request):
    email = (request.data.get("email") or "").strip().lower()
    code = (request.data.get("code") or "").strip()

    if not email or not code:
        return Response({"error": "email and code are required."}, status=400)

    verification, err = _latest_valid_code(
        email, AccountVerification.Purpose.SIGNUP, code
    )
    if err:
        return err

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response({"error": "Account not found."}, status=404)

    verification.consumed = True
    verification.save(update_fields=["consumed"])

    user.is_active = True
    user.save(update_fields=["is_active"])

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return Response({"verified": True})


@api_view(["POST"])
@throttle_classes([AuthThrottle])
def resend_verification(request):
    email = (request.data.get("email") or "").strip().lower()
    if not email:
        return Response({"error": "email is required."}, status=400)

    user = User.objects.filter(email__iexact=email, is_active=False).first()
    if not user:
        return Response({"sent": True})

    verification = AccountVerification.objects.create(
        email=email, purpose=AccountVerification.Purpose.SIGNUP
    )
    if not _send_code_email(email, verification.code, "Verify your email"):
        return Response({"error": "Failed to send verification email."}, status=502)

    return Response({"sent": True})


@api_view(["POST"])
@throttle_classes([AuthThrottle])
def login_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    if not email or not password:
        return Response({"error": "email and password are required."}, status=400)

    user = authenticate(request, username=email, password=password)
    if not user:
        return Response({"error": "Invalid email or password."}, status=400)

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return Response({"ok": True})


@api_view(["POST"])
@throttle_classes([AuthThrottle])
def password_reset_request(request):
    email = (request.data.get("email") or "").strip().lower()
    if not email:
        return Response({"error": "email is required."}, status=400)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user:
        verification = AccountVerification.objects.create(
            email=email, purpose=AccountVerification.Purpose.PASSWORD_RESET
        )
        _send_code_email(email, verification.code, "Reset your password")

    # Always the same response, whether or not the email matched an account,
    # so this endpoint can't be used to enumerate registered emails.
    return Response({"sent": True})


@api_view(["POST"])
@throttle_classes([VerificationThrottle])
def password_reset_confirm(request):
    email = (request.data.get("email") or "").strip().lower()
    code = (request.data.get("code") or "").strip()
    new_password = request.data.get("new_password") or ""

    if not email or not code or not new_password:
        return Response({"error": "email, code, and new_password are required."}, status=400)

    verification, err = _latest_valid_code(
        email, AccountVerification.Purpose.PASSWORD_RESET, code
    )
    if err:
        return err

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return Response({"error": "Account not found."}, status=404)

    try:
        validate_password(new_password, user)
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)

    verification.consumed = True
    verification.save(update_fields=["consumed"])

    user.set_password(new_password)
    user.save(update_fields=["password"])

    return Response({"reset": True})
