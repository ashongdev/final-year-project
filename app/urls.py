from django.urls import path

from .views import check_public_id, generate, upload, wake, GoogleLogin
from .viewss.user import createNewCollection, fetchMyTemplates, updateTemplate, changeTemplateState

urlpatterns = [
    path("wake/", wake, name="wake"),
    path("upload/", upload, name="upload"),
    path("generate/", generate, name="generate"),
    path("check_public_id/", check_public_id, name="check_public_id"),
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('auto-upload/', upload, name='auto_upload'),
    # path("get_preset/<str:public_id>/", get_preset, name="get_preset"),


    # user
    path("my-templates/", fetchMyTemplates),
    path("update-template/", updateTemplate),
    path("delete-template/", changeTemplateState), # delete and restore
    path("delete-template/", changeTemplateState), # delete and restore

    # collections
    path("create-collection/", createNewCollection), # delete and restore

]
