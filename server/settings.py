import sys
from os import getenv
from pathlib import Path
from urllib.parse import parse_qsl, urlparse

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Core ────────────────────────────────────────────────────────────────────

SECRET_KEY = getenv("SECRET_KEY")
if not SECRET_KEY:
    if "test" in sys.argv or getenv("CI"):
        SECRET_KEY = "91aaa544d2754898310a7d373b8c0691e741c53089bd3819d10710bf62588ba400be1d6c13ad590f7ce85a63086ba74be62f"
    else:
        raise RuntimeError(
            "SECRET_KEY environment variable is not set. "
            'Generate one with: python -c "import secrets; print(secrets.token_hex(50))"'
        )

DEBUG = getenv("DEBUG", "false").lower() == "true"

ALLOWED_HOSTS = [
    h.strip()
    for h in getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# ─── Application ─────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "django.contrib.sites",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "app",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "server.urls"
WSGI_APPLICATION = "server.wsgi.application"
SITE_ID = 1
APPEND_SLASH = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Templates ───────────────────────────────────────────────────────────────

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ─── Database ─────────────────────────────────────────────────────────────────

_db_url = getenv("DATABASE_URL", "")
if _db_url:
    _parsed = urlparse(_db_url)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _parsed.path.lstrip("/"),
            "USER": _parsed.username,
            "PASSWORD": _parsed.password,
            "HOST": _parsed.hostname,
            "PORT": _parsed.port or 5432,
            "OPTIONS": dict(parse_qsl(_parsed.query)),
            "CONN_MAX_AGE": 60,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ─── Auth ─────────────────────────────────────────────────────────────────────

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": getenv("GOOGLE_CLIENT_ID", ""),
            "secret": getenv("GOOGLE_CLIENT_SECRET", ""),
            "key": "",
        },
        "AUTH_PARAMS": {"access_type": "offline"},
    }
}

# ─── Cookies / CSRF / Sessions ────────────────────────────────────────────────

_is_production = not DEBUG

SESSION_COOKIE_SAMESITE = "None" if _is_production else "Lax"
CSRF_COOKIE_SAMESITE = "None" if _is_production else "Lax"
SESSION_COOKIE_SECURE = _is_production
CSRF_COOKIE_SECURE = _is_production
SESSION_COOKIE_HTTPONLY = True

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in getenv(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:5173,http://localhost:8080,http://localhost:3000",
    ).split(",")
    if o.strip()
]

# ─── CORS ─────────────────────────────────────────────────────────────────────

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:8080,http://localhost:3000",
    ).split(",")
    if o.strip()
]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]
CORS_PREFLIGHT_MAX_AGE = 86400
CORS_EXPOSE_HEADERS = ["Content-Disposition"]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ─── REST Framework ───────────────────────────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": getenv("THROTTLE_RATE_ANON", "60/hour"),
        "user": getenv("THROTTLE_RATE_USER", "300/hour"),
        "generate": getenv("THROTTLE_RATE_GENERATE", "30/hour"),
        "verification": getenv("THROTTLE_RATE_VERIFICATION", "10/hour"),
    },
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "EXCEPTION_HANDLER": "app.exceptions.custom_exception_handler",
}

# ─── Email ──────────────────────────────────────────────────────────────────
# Recipient verification codes (see app.models.RecipientVerification) are
# sent via the Resend API (app.views.participant). RESEND_API_KEY must be
# set for sends to actually go out; with no key, verification requests
# will fail at send time rather than silently no-op.

RESEND_API_KEY = getenv("RESEND_API_KEY", "")
DEFAULT_FROM_EMAIL = getenv("DEFAULT_FROM_EMAIL", "no-reply@genc.app")

# ─── Billing (Stripe) ──────────────────────────────────────────────────────────
# Subscriptions (Pro tier) and one-time credit packs. Price IDs are created
# once via `manage.py create_stripe_products` and then pasted into the
# environment; they aren't looked up dynamically to avoid an API round trip
# on every checkout request.

STRIPE_SECRET_KEY = getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_MONTHLY = getenv("STRIPE_PRICE_MONTHLY", "")
STRIPE_PRICE_ANNUAL = getenv("STRIPE_PRICE_ANNUAL", "")
STRIPE_PRICE_CREDIT_PACK = getenv("STRIPE_PRICE_CREDIT_PACK", "")
CREDIT_PACK_SIZE = 500
FREE_BATCH_RECIPIENT_CAP = 10
FREE_TEMPLATE_CAP = 2
FREE_REDOWNLOAD_CAP = 3
FREE_FIELD_CAP = 1

# Where Checkout/Billing Portal sessions redirect back to after payment.
FRONTEND_URL = getenv("FRONTEND_URL", "http://localhost:8080")

# ─── Security Headers ─────────────────────────────────────────────────────────

if _is_production:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    USE_X_FORWARDED_PORT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"

# ─── File Uploads ─────────────────────────────────────────────────────────────

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB

# ─── Localisation ─────────────────────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ─── Logging ──────────────────────────────────────────────────────────────────

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG" if DEBUG else "INFO",
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "app": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
    },
}
