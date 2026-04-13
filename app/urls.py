from django.urls import path

from .views import check_public_id, generate, upload, me
from .viewss.user import addToCollection, createNewCollection, fetchMyTemplates, updateTemplate, changeTemplateState
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("me/", me, name="me"),
    path("upload/", upload, name="upload"),
    path("generate/", generate, name="generate"),
    path("check_public_id/", check_public_id, name="check_public_id"),
    path('auto-upload/', upload, name='auto_upload'),
    # path("get_preset/<str:public_id>/", get_preset, name="get_preset"),
    
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),



    # user
    path("my-templates/", fetchMyTemplates),
    path("update-template/", updateTemplate),
    path("delete-template/", changeTemplateState), # delete and restore
    path("delete-template/", changeTemplateState), # delete and restore

    # collections
    path("create-collection/", createNewCollection), # delete and restore
    path("add-to-collection/", addToCollection),

]
