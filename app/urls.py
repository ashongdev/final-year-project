from django.urls import path

from .views import check_public_id, generate, upload, wake, GoogleLogin

urlpatterns = [
    path("wake/", wake, name="wake"),
    path("upload/", upload, name="upload"),
    path("generate/", generate, name="generate"),
    path("check_public_id/", check_public_id, name="check_public_id"),
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    # path('refresh/', GoogleLogin.as_view(), name='google_login'),
    # path("get_preset/<str:public_id>/", get_preset, name="get_preset"),
]
