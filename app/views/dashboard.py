"""
Dashboard views: templates and collections CRUD for authenticated users.
"""
import logging
from datetime import timedelta

from django.db.models import Count, Sum
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
    UserActivityEvent,
)
from ..pagination import MAX_PAGE_SIZE, get_pagination_params, paginate_queryset
from ..serializer import CollectionSerializer, TemplateSerializer

logger = logging.getLogger("app")

# Widest window the frontend's timeframe selector offers (7 / 30 / 90 days);
# the full 90-day trend is fetched once and sliced client-side, so switching
# timeframes doesn't require a refetch.
ANALYTICS_TREND_DAYS = 90
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def log_activity(request):
    """
    Records a lightweight user action for analytics that doesn't otherwise
    touch the backend — currently "loaded a template by id" (a pure
    Cloudinary lookup client-side) and "shared a link" (the moment a
    publish actually produces a shareable link).
    """
    kind = request.data.get("kind", "")
    if kind not in UserActivityEvent.Kind.values:
        return Response({"error": "Invalid kind."}, status=400)

    label = (request.data.get("label") or "").strip()[:255]
    UserActivityEvent.objects.create(user=request.user, kind=kind, label=label)
    return Response({"ok": True}, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics(request):
    """
    Full analytics payload for the dashboard analytics page: totals, a daily
    trend, self-serve vs batch split, template-activity trend (uploads,
    shares, loads), top templates, recipient/verification funnel, and a
    recent-activity feed. Everything is scoped to the requesting user.
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
    by_kind = {"editor": 0, "self_serve": 0, "batch": 0}
    for row in by_kind_rows:
        by_kind[row["kind"]] = row["total"] or 0

    # ── Daily trend (last N days, zero-filled, broken down by kind so the
    #    chart can be filtered to Editor / Self-Serve / Batch / All) ──
    start_date = timezone.localdate() - timedelta(days=ANALYTICS_TREND_DAYS - 1)
    daily_rows = (
        GenerationEvent.objects.filter(
            template__user=user, created_at__date__gte=start_date
        )
        .annotate(day=TruncDate("created_at"))
        .values("day", "kind")
        .annotate(total=Sum("count"))
    )
    by_day: dict = {}
    for row in daily_rows:
        bucket = by_day.setdefault(
            row["day"], {"editor": 0, "self_serve": 0, "batch": 0}
        )
        bucket[row["kind"]] = row["total"] or 0

    daily = []
    for i in range(ANALYTICS_TREND_DAYS):
        day = start_date + timedelta(days=i)
        bucket = by_day.get(day, {"editor": 0, "self_serve": 0, "batch": 0})
        daily.append(
            {
                "date": day.isoformat(),
                "editor": bucket["editor"],
                "self_serve": bucket["self_serve"],
                "batch": bucket["batch"],
                "total": bucket["editor"] + bucket["self_serve"] + bucket["batch"],
            }
        )

    # ── Template activity totals (not certificate generation) ──
    templates_created_total = Templates.objects.filter(user=user).count()
    links_shared_total = UserActivityEvent.objects.filter(
        user=user, kind=UserActivityEvent.Kind.LINK_SHARED
    ).count()
    templates_loaded_total = UserActivityEvent.objects.filter(
        user=user, kind=UserActivityEvent.Kind.TEMPLATE_LOADED
    ).count()

    # ── Template activity trend (last N days, zero-filled) — templates
    #    created is derived straight from Templates.created_at; shares and
    #    loads come from UserActivityEvent. ──
    templates_by_day_rows = (
        Templates.objects.filter(user=user, created_at__date__gte=start_date)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Count("id"))
    )
    templates_created_by_day = {r["day"]: r["total"] for r in templates_by_day_rows}

    activity_rows = (
        UserActivityEvent.objects.filter(user=user, created_at__date__gte=start_date)
        .annotate(day=TruncDate("created_at"))
        .values("day", "kind")
        .annotate(total=Count("id"))
    )
    activity_by_day: dict = {}
    for row in activity_rows:
        bucket = activity_by_day.setdefault(
            row["day"], {"link_shared": 0, "template_loaded": 0}
        )
        bucket[row["kind"]] = row["total"]

    activity_daily = []
    for i in range(ANALYTICS_TREND_DAYS):
        day = start_date + timedelta(days=i)
        a_bucket = activity_by_day.get(day, {"link_shared": 0, "template_loaded": 0})
        activity_daily.append(
            {
                "date": day.isoformat(),
                "templates_created": templates_created_by_day.get(day, 0),
                "links_shared": a_bucket["link_shared"],
                "templates_loaded": a_bucket["template_loaded"],
            }
        )

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

    # ── Recent activity — merges certificate generations with the lighter
    #    template-activity events into a single chronological feed ──
    recent_generation_events = (
        GenerationEvent.objects.filter(template__user=user)
        .select_related("template")
        .order_by("-created_at")[:ANALYTICS_RECENT_EVENTS]
    )
    recent_activity_events = UserActivityEvent.objects.filter(user=user).order_by(
        "-created_at"
    )[:ANALYTICS_RECENT_EVENTS]

    combined = [
        {
            "type": "generation",
            "kind": e.kind,
            "template_name": e.template.name or e.template.public_id,
            "label": "",
            "count": e.count,
            "created_at": e.created_at,
        }
        for e in recent_generation_events
    ] + [
        {
            "type": "activity",
            "kind": a.kind,
            "template_name": None,
            "label": a.label,
            "count": 1,
            "created_at": a.created_at,
        }
        for a in recent_activity_events
    ]
    combined.sort(key=lambda item: item["created_at"], reverse=True)
    recent_activity = [
        {**item, "created_at": item["created_at"].isoformat()}
        for item in combined[:ANALYTICS_RECENT_EVENTS]
    ]

    return Response(
        {
            "total_generated": total_generated,
            "by_kind": by_kind,
            "daily": daily,
            "templates_created_total": templates_created_total,
            "links_shared_total": links_shared_total,
            "templates_loaded_total": templates_loaded_total,
            "activity_daily": activity_daily,
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
