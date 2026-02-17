import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const CATEGORIES = ["", "billing", "technical", "account", "general"];
const PRIORITIES = ["", "low", "medium", "high", "critical"];
const STATUSES = ["", "open", "in_progress", "resolved", "closed"];

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000; // seconds
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TicketItem({ ticket, selected, onClick }) {
  return (
    <div
      className={`ticket-item ${selected ? "selected" : ""}`}
      onClick={() => onClick(ticket)}
    >
      <div className="ticket-item-header">
        <span className="ticket-item-title">{ticket.title}</span>
      </div>
      <div className="ticket-item-desc">{ticket.description}</div>
      <div className="ticket-item-meta">
        <span className={`badge badge-priority-${ticket.priority}`}>{ticket.priority}</span>
        <span className={`badge badge-cat-${ticket.category}`}>{ticket.category}</span>
        <span className={`badge badge-status-${ticket.status}`}>{ticket.status.replace("_", " ")}</span>
        <span className="ticket-item-time">{formatDate(ticket.created_at)}</span>
      </div>
    </div>
  );
}

export function TicketList({ refreshKey, onSelect, selectedId }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    priority: "",
    status: "",
    search: "",
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listTickets(filters);
      setTickets(data);
    } catch {
      // Silently fail — ticket list will just stay empty
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]); // eslint-disable-line

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleFilter = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      {/* Filters */}
      <div className="ticket-filters">
        <input
          name="search"
          value={filters.search}
          onChange={handleFilter}
          placeholder="Search tickets…"
        />
        <select name="category" value={filters.category} onChange={handleFilter}>
          <option value="">All Categories</option>
          {CATEGORIES.slice(1).map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select name="priority" value={filters.priority} onChange={handleFilter}>
          <option value="">All Priorities</option>
          {PRIORITIES.slice(1).map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select name="status" value={filters.status} onChange={handleFilter}>
          <option value="">All Statuses</option>
          {STATUSES.slice(1).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="ticket-list">
        {loading ? (
          <div className="ticket-empty">
            <div className="loading-bar" style={{ width: "60%", margin: "0 auto" }} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="ticket-empty">
            {Object.values(filters).some(Boolean)
              ? "No tickets match the current filters."
              : "No tickets yet. Submit one to get started."}
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketItem
              key={ticket.id}
              ticket={ticket}
              selected={ticket.id === selectedId}
              onClick={onSelect}
            />
          ))
        )}
      </div>
    </>
  );
}
