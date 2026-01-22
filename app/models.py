# from django.db import models


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
