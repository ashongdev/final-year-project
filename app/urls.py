from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import GoogleLogin, check_public_id, generate, me, upload
from .views.batch import generate_batch
from .views.dashboard import (
    assign_collection,
    create_collection,
    delete_collection,
    list_collections,
    list_templates,
    rename_collection,
    rename_template,
    set_template_state,
)


def health(request):
    from django.http import JsonResponse

    return JsonResponse({"status": "ok"})


urlpatterns = [
    # Health
    path("health/", health, name="health"),
    # Auth
    path("me/", me, name="me"),
    path("auth/google/", GoogleLogin.as_view(), name="google_login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Certificate
    path("upload/", upload, name="upload"),
    path("generate/", generate, name="generate"),
    path("generate-batch/", generate_batch, name="generate_batch"),
    path("check-public-id/", check_public_id, name="check_public_id"),
    # Templates
    path("templates/", list_templates, name="list_templates"),
    path("templates/rename/", rename_template, name="rename_template"),
    path("templates/state/", set_template_state, name="set_template_state"),
    path("templates/assign-collection/", assign_collection, name="assign_collection"),
    # Collections
    path("collections/", list_collections, name="list_collections"),
    path("collections/create/", create_collection, name="create_collection"),
    path("collections/rename/", rename_collection, name="rename_collection"),
    path("collections/delete/", delete_collection, name="delete_collection"),
]
