import { useState } from "react";
import { api } from "../api/client";

const STATUSES = ["open", "in_progress", "resolved", "closed"];

function formatDateFull(iso) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketDetail({ ticket, onUpdated, addToast }) {
  const [updating, setUpdating] = useState(false);

  if (!ticket) {
    return (
      <div className="ticket-detail-empty">
        ← select a ticket to view details
      </div>
    );
  }

  const handleStatusChange = async (newStatus) => {
    if (newStatus === ticket.status || updating) return;
    setUpdating(true);
    try {
      const updated = await api.updateTicket(ticket.id, { status: newStatus });
      onUpdated(updated);
      addToast(`Status updated to "${newStatus.replace("_", " ")}".`, "success");
    } catch {
      addToast("Failed to update status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="ticket-detail">
      <div className="ticket-detail-card">
        {/* ID label */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          TICKET #{String(ticket.id).padStart(5, "0")}
        </div>

        <h2 className="ticket-detail-title">{ticket.title}</h2>

        <div className="ticket-detail-badges">
          <span className={`badge badge-priority-${ticket.priority}`}>{ticket.priority}</span>
          <span className={`badge badge-cat-${ticket.category}`}>{ticket.category}</span>
          <span className={`badge badge-status-${ticket.status}`}>{ticket.status.replace("_", " ")}</span>
        </div>

        <div className="ticket-detail-time">
          Created {formatDateFull(ticket.created_at)}
        </div>

        <div className="ticket-detail-section">
          <div className="ticket-detail-section-title">Description</div>
          <div className="ticket-detail-description">{ticket.description}</div>
        </div>

        <div className="ticket-detail-section">
          <div className="ticket-detail-section-title">Update Status</div>
          <div className="status-selector">
            {STATUSES.map((s) => (
              <button
                key={s}
                className={`status-btn ${ticket.status === s ? `active-${s}` : ""}`}
                onClick={() => handleStatusChange(s)}
                disabled={updating}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
