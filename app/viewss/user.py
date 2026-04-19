from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Collections, Templates
from ..serializer import CollectionSerializer, TemplateSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetchMyTemplates(request):
    user = request.user

    state = request.query_params.get("state", "active")

    templates = Templates.objects.filter(user=user, state=state)

    collections = []
    if state == "active":
        collections = Collections.objects.filter(user=user, state=state)

    templateSerializer = TemplateSerializer(templates, many=True)
    collectionSerializer = CollectionSerializer(collections, many=True)
    return Response(
        {"templates": templateSerializer.data, "collections": collectionSerializer.data}
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

    Collections.objects.create(user=user, name=name)
    collections = Collections.objects.filter(user=user, state="active")

    collectionSerializer = CollectionSerializer(collections, many=True)

    return Response({"collections": collectionSerializer.data})
