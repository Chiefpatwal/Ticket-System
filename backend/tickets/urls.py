from django.urls import path
from .views import TicketListCreateView, TicketDetailView, stats_view, classify_view

urlpatterns = [
    # Note: 'stats' and 'classify' must come before '<int:pk>/' so Django
    # doesn't try to match the literal strings as integers.
    path("tickets/stats/", stats_view, name="ticket-stats"),
    path("tickets/classify/", classify_view, name="ticket-classify"),
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
]
