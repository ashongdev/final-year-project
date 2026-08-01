from rest_framework import serializers

from .models import Collections, Signature, TemplateParams, Templates


class TemplateParamsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateParams
        exclude = ["user", "template"]


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Templates
        fields = [
            "id", "public_id", "name", "url",
            "collection_id", "trashed", "state",
            "created_at", "updated_at", "generation_count",
        ]


class CollectionSerializer(serializers.ModelSerializer):
    template_count = serializers.SerializerMethodField()

    class Meta:
        model = Collections
        fields = ["id", "name", "state", "created_at", "updated_at", "template_count"]

    def get_template_count(self, obj) -> int:
        return Templates.objects.filter(
            user=obj.user_id,
            collection_id=obj.id,
            state="active",
        ).count()


class SignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signature
        fields = ["id", "name", "url", "public_id", "created_at"]
