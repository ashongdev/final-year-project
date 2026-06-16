"""
Dashboard views: templates and collections CRUD for authenticated users.
"""
import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Collections, Templates
from ..pagination import MAX_PAGE_SIZE, get_pagination_params, paginate_queryset
from ..serializer import CollectionSerializer, TemplateSerializer

logger = logging.getLogger("app")


# ─── Templates ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_templates(request):
    user = request.user
    state = request.query_params.get("state", "active")
    collection_id = request.query_params.get("collection_id")
    page, page_size = get_pagination_params(request)

    if state not in ("active", "deleted"):
        return Response({"error": "Invalid state. Use 'active' or 'deleted'."}, status=400)

    qs = Templates.objects.filter(user=user, state=state).order_by("-updated_at")

    if collection_id is not None:
        try:
            qs = qs.filter(collection_id=int(collection_id))
        except (TypeError, ValueError):
            return Response({"error": "Invalid collection_id."}, status=400)

    items, pagination = paginate_queryset(qs, page, page_size)
    serializer = TemplateSerializer(items, many=True)
    return Response({"templates": serializer.data, "pagination": pagination})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def rename_template(request):
    user = request.user
    template_id = request.data.get("templateId")
    name = request.data.get("name", "").strip()

    if not template_id:
        return Response({"error": "templateId is required."}, status=400)
    if not name:
        return Response({"error": "name is required."}, status=400)

    updated = Templates.objects.filter(user=user, id=template_id).update(name=name)
    if not updated:
        return Response({"error": "Template not found."}, status=404)

    return Response({"ok": True})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def set_template_state(request):
    """Soft-delete or restore a template."""
    user = request.user
    template_id = request.data.get("templateId")
    action = request.query_params.get("state", "delete")

    if action not in ("delete", "restore"):
        return Response({"error": "state must be 'delete' or 'restore'."}, status=400)
    if not template_id:
        return Response({"error": "templateId is required."}, status=400)

    new_state = "deleted" if action == "delete" else "active"
    updated = Templates.objects.filter(user=user, id=template_id).update(
        trashed=(action == "delete"),
        state=new_state,
    )
    if not updated:
        return Response({"error": "Template not found."}, status=404)

    return Response({"ok": True})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def assign_collection(request):
    """Assign or unassign a template from a collection."""
    user = request.user
    template_id = request.data.get("templateId")
    collection_id = request.data.get("collectionId")

    if not template_id:
        return Response({"error": "templateId is required."}, status=400)

    # collection_id can be null (to remove from collection)
    if collection_id is not None:
        if not Collections.objects.filter(user=user, id=collection_id).exists():
            return Response({"error": "Collection not found."}, status=404)

    updated = Templates.objects.filter(user=user, id=template_id).update(
        collection_id=collection_id
    )
    if not updated:
        return Response({"error": "Template not found."}, status=404)

    return Response({"ok": True})


# ─── Collections ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_collections(request):
    user = request.user
    page, page_size = get_pagination_params(request)
    list_all = request.query_params.get("all", "").lower() == "true"

    qs = Collections.objects.filter(user=user, state="active").order_by("-updated_at")

    if list_all:
        total = qs.count()
        page = 1
        page_size = min(total if total > 0 else 1, MAX_PAGE_SIZE)

    items, pagination = paginate_queryset(qs, page, page_size)
    serializer = CollectionSerializer(items, many=True)
    return Response({"collections": serializer.data, "pagination": pagination})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_collection(request):
    user = request.user
    name = request.data.get("name", "").strip()
    if not name:
        return Response({"error": "name is required."}, status=400)
    if len(name) > 255:
        return Response({"error": "name is too long."}, status=400)

    collection = Collections.objects.create(user=user, name=name)
    serializer = CollectionSerializer(collection)
    return Response({"collection": serializer.data}, status=201)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def rename_collection(request):
    user = request.user
    collection_id = request.data.get("collectionId")
    name = request.data.get("name", "").strip()

    if not collection_id:
        return Response({"error": "collectionId is required."}, status=400)
    if not name:
        return Response({"error": "name is required."}, status=400)

    updated = Collections.objects.filter(user=user, id=collection_id).update(name=name)
    if not updated:
        return Response({"error": "Collection not found."}, status=404)

    return Response({"ok": True})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_collection(request):
    """
    Soft-delete a collection. Templates inside are unlinked (collection_id set to null)
    but not deleted themselves.
    """
    user = request.user
    collection_id = request.query_params.get("collectionId")

    if not collection_id:
        return Response({"error": "collectionId is required."}, status=400)

    try:
        collection_id = int(collection_id)
    except (TypeError, ValueError):
        return Response({"error": "Invalid collectionId."}, status=400)

    deleted_count, _ = Collections.objects.filter(user=user, id=collection_id).delete()
    if not deleted_count:
        return Response({"error": "Collection not found."}, status=404)

    # Unlink templates that belonged to this collection
    Templates.objects.filter(user=user, collection_id=collection_id).update(
        collection_id=None
    )

    logger.info("Collection %s deleted by user %s", collection_id, user.pk)
    return Response({"ok": True})
