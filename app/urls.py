from django.urls import path

from .views import check_public_id, generate, get_preset, upload

urlpatterns = [
    path("upload/", upload, name="upload"),
    path("generate/", generate, name="generate"),
    path("check_public_id/", check_public_id, name="check_public_id"),
    path("get_preset/<str:public_id>/", get_preset, name="get_preset"),
]
