from django.conf import settings
from django.db import models


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
