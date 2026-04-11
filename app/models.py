from django.db import models
from django.conf import settings



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
    collection_id = models.UUIDField(blank=True, null=True)
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
