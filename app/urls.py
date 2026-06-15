from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import GoogleLogin, check_public_id, generate, me, upload
from .viewss.user import (
    addToCollection,
    changeTemplateState,
    createNewCollection,
    fetchMyCollections,
    fetchMyTemplates,
    updateTemplate,
)

urlpatterns = [
    path("me/", me, name="me"),
    path("upload/", upload, name="upload"),
    path("generate/", generate, name="generate"),
    path("check_public_id/", check_public_id, name="check_public_id"),
    path("auto-upload/", upload, name="auto_upload"),
    # path("get_preset/<str:public_id>/", get_preset, name="get_preset"),
    # auth
    path("auth/google/", GoogleLogin.as_view(), name="google_login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="refresh_token"),
    # user
    path("my-templates/", fetchMyTemplates),
    path("my-collections/", fetchMyCollections),
    path("update-template/", updateTemplate),
    path("delete-template/", changeTemplateState),  # delete and restore
    path("delete-template/", changeTemplateState),  # delete and restore
    # collections
    path("create-collection/", createNewCollection),  # delete and restore
    path("add-to-collection/", addToCollection),
]
