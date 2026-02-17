import logging
from django.db.models import Avg, Count, ExpressionWrapper, F, FloatField, Min, Q
from django.db.models.functions import ExtractDay
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .llm import classify_ticket
from .models import Ticket
from .serializers import ClassifyRequestSerializer, TicketSerializer

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# /api/tickets/   — list & create                                              #
# --------------------------------------------------------------------------- #

class TicketListCreateView(APIView):
    """
    GET  /api/tickets/  — list all tickets (newest first) with optional filters.
    POST /api/tickets/  — create a new ticket.
    """

    def get(self, request):
        queryset = Ticket.objects.all()

        # Exact-match filters
        for field in ("category", "priority", "status"):
            value = request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})

        # Full-text search across title + description
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        serializer = TicketSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TicketSerializer(data=request.data)
        if serializer.is_valid():
            ticket = serializer.save()
            return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# --------------------------------------------------------------------------- #
# /api/tickets/<id>/  — retrieve & partial-update                              #
# --------------------------------------------------------------------------- #

class TicketDetailView(APIView):
    """
    GET   /api/tickets/<id>/  — retrieve a single ticket.
    PATCH /api/tickets/<id>/  — partial update (status, category, priority, etc.).
    """

    def _get_ticket(self, pk):
        try:
            return Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return None

    def get(self, request, pk):
        ticket = self._get_ticket(pk)
        if ticket is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TicketSerializer(ticket).data)

    def patch(self, request, pk):
        ticket = self._get_ticket(pk)
        if ticket is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketSerializer(ticket, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# --------------------------------------------------------------------------- #
# /api/tickets/stats/  — aggregated metrics                                    #
# --------------------------------------------------------------------------- #

@api_view(["GET"])
def stats_view(request):
    """
    Return aggregated ticket statistics using DB-level aggregation only.
    No Python-level loops over querysets.
    """
    total = Ticket.objects.count()
    open_count = Ticket.objects.filter(status=Ticket.Status.OPEN).count()

    # avg_tickets_per_day: total tickets / number of days since first ticket
    # Falls back to 0 when there are no tickets.
    date_range = Ticket.objects.aggregate(earliest=Min("created_at"))
    earliest = date_range["earliest"]
    if earliest and total > 0:
        days_active = max(
            1, (timezone.now() - earliest).days + 1
        )  # +1 so day-0 counts as 1 day
        avg_per_day = round(total / days_active, 1)
    else:
        avg_per_day = 0.0

    # Priority breakdown — one DB query using values/annotate
    priority_rows = (
        Ticket.objects.values("priority")
        .annotate(count=Count("id"))
    )
    priority_breakdown = {p[0]: 0 for p in Ticket.Priority.choices}
    for row in priority_rows:
        priority_breakdown[row["priority"]] = row["count"]

    # Category breakdown — one DB query
    category_rows = (
        Ticket.objects.values("category")
        .annotate(count=Count("id"))
    )
    category_breakdown = {c[0]: 0 for c in Ticket.Category.choices}
    for row in category_rows:
        category_breakdown[row["category"]] = row["count"]

    return Response(
        {
            "total_tickets": total,
            "open_tickets": open_count,
            "avg_tickets_per_day": avg_per_day,
            "priority_breakdown": priority_breakdown,
            "category_breakdown": category_breakdown,
        }
    )


# --------------------------------------------------------------------------- #
# /api/tickets/classify/  — LLM classification                                #
# --------------------------------------------------------------------------- #

@api_view(["POST"])
def classify_view(request):
    """
    Accept a ticket description and return LLM-suggested category + priority.
    Always returns 200 — failures are surfaced as null values so the frontend
    can degrade gracefully without blocking ticket submission.
    """
    serializer = ClassifyRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    description = serializer.validated_data["description"]
    result = classify_ticket(description)
    return Response(result)
