from ..models import Templates
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..serializer import TemplateSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fetchMyTemplates(request):
    user = request.user

    state = request.query_params.get("state", "active")

    templates = Templates.objects.filter(user=user, state=state)
    serializer = TemplateSerializer(templates, many=True)
    return Response({"templates": serializer.data})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def updateTemplate(request):
    user = request.user

    name = request.data.get("name")
    template_id = request.data.get("templateId")

    try:
        template = Templates.objects.get(user=user, id=template_id)
        template.name = name
        template.save()
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