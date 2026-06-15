from rest_framework import serializers
from .models import Collections, Templates

class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Templates
        fields = "__all__"

class CollectionSerializer(serializers.ModelSerializer):
    template_count = serializers.SerializerMethodField()

    class Meta:
        model = Collections
        fields = "__all__"

    def get_template_count(self, obj):
        return Templates.objects.filter(
            user=obj.user,
            collection_id=obj.id,
            state="active",
        ).count()