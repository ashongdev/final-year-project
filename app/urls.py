from django.urls import path

from .views import generate, upload

urlpatterns = [
    path("upload", upload, name="upload"),
    path("generate", generate, name="generate"),
]
