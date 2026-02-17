from rest_framework import serializers
from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            "id",
            "title",
            "description",
            "category",
            "priority",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_category(self, value):
        valid = {c[0] for c in Ticket.Category.choices}
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid category. Must be one of: {', '.join(sorted(valid))}"
            )
        return value

    def validate_priority(self, value):
        valid = {p[0] for p in Ticket.Priority.choices}
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid priority. Must be one of: {', '.join(sorted(valid))}"
            )
        return value

    def validate_status(self, value):
        valid = {s[0] for s in Ticket.Status.choices}
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(sorted(valid))}"
            )
        return value


class ClassifyRequestSerializer(serializers.Serializer):
    description = serializers.CharField(min_length=10, max_length=10000)
