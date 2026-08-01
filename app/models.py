import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class Templates(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
    )
    public_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255, default="", blank=True)
    url = models.CharField(max_length=500)
    collection_id = models.IntegerField(blank=True, null=True, db_index=True)
    trashed = models.BooleanField(default=False)
    state = models.CharField(
        max_length=20,
        default="active",
        db_index=True,
    )
    # Incremented each time a certificate is actually generated against this
    # published template — self-service downloads via the public link and
    # organizer-driven batch generation. Editor-only preview/test downloads
    # (which upload a raw file rather than referencing a published template)
    # are not counted, since those aren't real certificate issuances.
    generation_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "state"], name="template_user_state_idx"),
            models.Index(fields=["user", "state", "collection_id"], name="template_user_state_col_idx"),
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name or self.public_id} (user={self.user_id})"


class Collections(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
    )
    name = models.CharField(max_length=255, default="", blank=True)
    trashed = models.BooleanField(default=False)
    state = models.CharField(max_length=20, default="active", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "state"], name="collection_user_state_idx"),
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.name} (user={self.user_id})"


class TemplateParams(models.Model):
    """
    Stores the field configuration for a published template.
    This is the server-side source of truth for participant links.
    """

    class AnchorMode(models.TextChoices):
        CENTER = "center", "Center"
        LEFT = "left", "Left"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
    )
    template = models.ForeignKey(
        Templates,
        on_delete=models.CASCADE,
        related_name="params",
        db_index=True,
    )
    label = models.CharField(max_length=255, default="Participant Name")
    text = models.CharField(max_length=500, default="John Doe")
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    font = models.CharField(max_length=255, default="Bickham Script Pro Regular")
    font_size = models.IntegerField(default=100)
    font_weight = models.CharField(max_length=10, default="400")
    color = models.CharField(max_length=20, default="#000000")
    anchor_mode = models.CharField(
        max_length=10,
        choices=AnchorMode.choices,
        default=AnchorMode.CENTER,
    )
    required = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.label} on template {self.template_id}"


class PublishedRecipient(models.Model):
    """
    The allow-list of recipients for a published template. Once a template
    has at least one row here, the public participant link for it requires
    email verification against this list before a certificate can be
    generated. Templates with no recipients stay open to anyone, as before.
    """

    template = models.ForeignKey(
        Templates,
        on_delete=models.CASCADE,
        related_name="recipients",
        db_index=True,
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(db_index=True)
    # Not yet enforced as a limit anywhere — reserved for a future
    # "N free downloads, then paid" feature. See RecipientVerification.
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["template", "email"], name="unique_recipient_per_template"
            ),
        ]
        indexes = [
            models.Index(
                fields=["template", "email"], name="recipient_template_email_idx"
            ),
        ]

    def __str__(self):
        return f"{self.email} for template {self.template_id}"


class GenerationEvent(models.Model):
    """
    One row per certificate-generation request against a published template,
    logged alongside the running Templates.generation_count so the dashboard
    can show trends over time (daily volume, self-serve vs batch split,
    recent activity) rather than just a single running total.
    """

    class Kind(models.TextChoices):
        EDITOR = "editor", "Editor"
        SELF_SERVE = "self_serve", "Self-Serve"
        BATCH = "batch", "Batch"

    template = models.ForeignKey(
        Templates,
        on_delete=models.CASCADE,
        related_name="events",
        db_index=True,
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    # Batch events represent multiple certificates issued in one request.
    count = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["template", "created_at"], name="genevent_template_created_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} x{self.count} on template {self.template_id}"


class UserActivityEvent(models.Model):
    """
    Lightweight log of user actions that aren't certificate generations but
    are still worth tracking for the analytics dashboard — e.g. sharing a
    link, or loading an existing template by id. Kept separate from
    GenerationEvent since these aren't always attributable to a template
    the user owns (Load by ID can load any public template).
    """

    class Kind(models.TextChoices):
        LINK_SHARED = "link_shared", "Link Shared"
        TEMPLATE_LOADED = "template_loaded", "Template Loaded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
        related_name="activity_events",
    )
    kind = models.CharField(max_length=30, choices=Kind.choices, db_index=True)
    # Optional free-form context, e.g. the public_id involved.
    label = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "kind", "created_at"], name="useract_user_kind_created_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} by user {self.user_id}"


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _default_expiry() -> "timezone.datetime":
    return timezone.now() + timedelta(minutes=10)


class RecipientVerification(models.Model):
    """A short-lived, single-use email verification code for a recipient."""

    MAX_ATTEMPTS = 5

    template = models.ForeignKey(Templates, on_delete=models.CASCADE, db_index=True)
    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6, default=_generate_verification_code)
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_expiry)

    def is_valid(self) -> bool:
        return (
            not self.consumed
            and self.attempts < self.MAX_ATTEMPTS
            and timezone.now() < self.expires_at
        )

    def __str__(self):
        return f"Verification for {self.email} on template {self.template_id}"
