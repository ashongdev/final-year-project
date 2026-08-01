from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Collections, Templates
from ..pagination import MAX_PAGE_SIZE, get_pagination_params, paginate_queryset
from ..serializer import CollectionSerializer, TemplateSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetchMyTemplates(request):
    user = request.user
    state = request.query_params.get("state", "active")
    collection_id = request.query_params.get("collection_id")
    page, page_size = get_pagination_params(request)

    templates_qs = Templates.objects.filter(user=user, state=state).order_by(
        "-updated_at"
    )

    if collection_id is not None:
        try:
            templates_qs = templates_qs.filter(collection_id=int(collection_id))
        except (TypeError, ValueError):
            return Response({"error": "Invalid collection_id"}, status=400)

    paginated_templates, pagination = paginate_queryset(
        templates_qs, page, page_size
    )

    template_serializer = TemplateSerializer(paginated_templates, many=True)
    return Response(
        {
            "templates": template_serializer.data,
            "pagination": pagination,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetchMyCollections(request):
    user = request.user
    page, page_size = get_pagination_params(request)
    list_all = request.query_params.get("all", "").lower() == "true"

    collections_qs = Collections.objects.filter(user=user, state="active").order_by(
        "-updated_at"
    )

    if list_all:
        total = collections_qs.count()
        page = 1
        page_size = min(total if total > 0 else 1, MAX_PAGE_SIZE)

    paginated_collections, pagination = paginate_queryset(
        collections_qs, page, page_size
    )

    collection_serializer = CollectionSerializer(paginated_collections, many=True)
    return Response(
        {
            "collections": collection_serializer.data,
            "pagination": pagination,
        }
    )


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def updateTemplate(request):
    user = request.user
    is_template = request.data.get("isTemplate")

    name = request.data.get("name", "New Collection")
    template_id = request.data.get("templateId")
    collection_id = request.data.get("collectionId")

    if not is_template:
        try:
            template = Templates.objects.get(user=user, id=template_id)
            template.name = name
            template.save()
        except Templates.DoesNotExist:
            pass
    else:
        try:
            collection = Collections.objects.get(user=user, id=collection_id)
            collection.name = name
            collection.save()
        except Templates.DoesNotExist:
            pass

    return Response({"ok": True})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def changeTemplateState(request):
    user = request.user

    template_id = request.data.get("templateId")
    state = request.query_params.get("state", "delete")

    try:
        template = Templates.objects.get(user=user, id=template_id)
        template.trashed = True if state == "delete" else False
        template.state = "deleted" if state == "delete" else "active"
        template.save()
    except Templates.DoesNotExist:
        pass

    return Response({"ok": True})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def addToCollection(request):
    user = request.user
    collection_id = request.data.get("collectionId")
    template_id = request.data.get("templateId")

    temp = Templates.objects.get(user=user, id=template_id)
    temp.collection_id = collection_id
    temp.save()

    return Response({"ok": True})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def createNewCollection(request):
    user = request.user
    name = request.data.get("name")

    collection = Collections.objects.create(user=user, name=name)
    collection_serializer = CollectionSerializer(collection)

    return Response({"collection": collection_serializer.data})
