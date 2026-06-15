from django.conf import settings
from django.db import models

# class CertificatePreset(models.Model):
#     public_id = models.CharField(max_length=255, unique=True)
#     selected_font = models.CharField(
#         max_length=255, default="Bickham Script Pro Regular"
#     )
#     font_size = models.IntegerField(default=100)
#     font_weight = models.CharField(max_length=50, default="400")
#     text_color = models.CharField(max_length=50, default="#000000")
#     text_x = models.IntegerField(default=0)
#     text_y = models.IntegerField(default=0)
#     anchor_mode = models.CharField(max_length=50, default="center")

#     def __str__(self):
#         return self.public_id


class Templates(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    public_id = models.CharField(max_length=255, unique=True)
    name = models.TextField(default="")
    url = models.CharField(max_length=255)
    collection_id = models.IntegerField(blank=True, null=True)
    trashed = models.BooleanField(default=False)
    state = models.TextField(default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Collections(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.TextField(default="")
    trashed = models.BooleanField(default=False)
    state = models.TextField(default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class TemplateParams(models.Model):
    class AnchorMode(models.TextChoices):
        CENTER = "center"
        LEFT = "left"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    template = models.ForeignKey(Templates, on_delete=models.CASCADE)
    label = models.TextField(default="Participant Name")
    text = models.TextField(default="John Doe")
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    font = models.TextField(default="Bickham Script Pro Regular")
    font_size = models.IntegerField(default=100)
    font_weight = models.IntegerField(default=0)
    color = models.TextField(default="#000000")
    anchor_mode = models.TextField(
        choices=AnchorMode.choices, default=AnchorMode.CENTER
    )
    required = models.BooleanField(default=True)
