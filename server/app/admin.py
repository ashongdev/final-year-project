from django.contrib import admin

from .models import Collections, TemplateParams, Templates


@admin.register(Templates)
class TemplatesAdmin(admin.ModelAdmin):
    list_display = ("public_id", "name", "user", "state", "collection_id", "updated_at")
    list_filter = ("state", "trashed")
    search_fields = ("public_id", "name", "user__username", "user__email")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Collections)
class CollectionsAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "state", "created_at")
    list_filter = ("state",)
    search_fields = ("name", "user__username", "user__email")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(TemplateParams)
class TemplateParamsAdmin(admin.ModelAdmin):
    list_display = ("label", "template", "user", "font", "font_size", "required")
    list_filter = ("required", "anchor_mode")
    search_fields = ("label", "template__public_id")
    raw_id_fields = ("user", "template")
