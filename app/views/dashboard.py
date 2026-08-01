"""
Dashboard views: templates and collections CRUD for authenticated users.
"""
import logging
from datetime import timedelta

from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    Collections,
    GenerationEvent,
    PublishedRecipient,
    RecipientVerification,
    Templates,
)
from ..pagination import MAX_PAGE_SIZE, get_pagination_params, paginate_queryset
from ..serializer import CollectionSerializer, TemplateSerializer

logger = logging.getLogger("app")

ANALYTICS_TREND_DAYS = 30
ANALYTICS_TOP_TEMPLATES = 8
ANALYTICS_RECENT_EVENTS = 10


# ─── Templates ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Aggregate usage stats for the dashboard overview."""
    user = request.user
    total_generated = Templates.objects.filter(user=user, state="active").aggregate(
        total=Sum("generation_count")
    )["total"] or 0
    return Response({"total_generated": total_generated})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics(request):
    """
    Full analytics payload for the dashboard analytics page: totals, a daily
    trend, self-serve vs batch split, top templates, recipient/verification
    funnel, and a recent-activity feed. Everything is scoped to the
    requesting user's templates.
    """
    user = request.user
    active_templates = Templates.objects.filter(user=user, state="active")

    # ── Totals ──
    total_generated = active_templates.aggregate(total=Sum("generation_count"))[
        "total"
    ] or 0

    by_kind_rows = (
        GenerationEvent.objects.filter(template__user=user)
        .values("kind")
        .annotate(total=Sum("count"))
    )
    by_kind = {"self_serve": 0, "batch": 0}
    for row in by_kind_rows:
        by_kind[row["kind"]] = row["total"] or 0

    # ── Daily trend (last N days, zero-filled) ──
    start_date = timezone.localdate() - timedelta(days=ANALYTICS_TREND_DAYS - 1)
    daily_rows = (
        GenerationEvent.objects.filter(
            template__user=user, created_at__date__gte=start_date
        )
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Sum("count"))
    )
    totals_by_day = {row["day"]: row["total"] for row in daily_rows}
    daily = [
        {
            "date": (start_date + timedelta(days=i)).isoformat(),
            "count": totals_by_day.get(start_date + timedelta(days=i), 0),
        }
        for i in range(ANALYTICS_TREND_DAYS)
    ]

    # ── Top templates ──
    top_templates = [
        {
            "id": t.id,
            "name": t.name or t.public_id,
            "public_id": t.public_id,
            "url": t.url,
            "generation_count": t.generation_count,
        }
        for t in active_templates.order_by("-generation_count", "-updated_at")[
            :ANALYTICS_TOP_TEMPLATES
        ]
        if t.generation_count > 0
    ]

    # ── Recipients / verification funnel ──
    recipients_invited = PublishedRecipient.objects.filter(
        template__user=user
    ).count()
    gated_templates = (
        PublishedRecipient.objects.filter(template__user=user)
        .values("template_id")
        .distinct()
        .count()
    )
    codes_requested = RecipientVerification.objects.filter(
        template__user=user
    ).count()
    codes_verified = RecipientVerification.objects.filter(
        template__user=user, consumed=True
    ).count()

    # ── Recent activity ──
    recent_events = (
        GenerationEvent.objects.filter(template__user=user)
        .select_related("template")
        .order_by("-created_at")[:ANALYTICS_RECENT_EVENTS]
    )
    recent_activity = [
        {
            "template_name": e.template.name or e.template.public_id,
            "template_id": e.template_id,
            "kind": e.kind,
            "count": e.count,
            "created_at": e.created_at.isoformat(),
        }
        for e in recent_events
    ]

    return Response(
        {
            "total_generated": total_generated,
            "by_kind": by_kind,
            "daily": daily,
            "top_templates": top_templates,
            "recipients_invited": recipients_invited,
            "gated_templates": gated_templates,
            "codes_requested": codes_requested,
            "codes_verified": codes_verified,
            "recent_activity": recent_activity,
        }
    )

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
