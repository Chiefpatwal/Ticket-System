import { useState, useCallback } from "react";
import { TicketForm } from "./components/TicketForm";
import { TicketList } from "./components/TicketList";
import { TicketDetail } from "./components/TicketDetail";
import { StatsDashboard } from "./components/StatsDashboard";
import { ToastContainer, useToast } from "./components/Toast";

export default function App() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toasts, addToast } = useToast();

  // Bump refreshKey to trigger re-fetches in child components
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleTicketCreated = useCallback(
    (ticket) => {
      refresh();
      setSelectedTicket(ticket);
    },
    [refresh]
  );

  const handleTicketUpdated = useCallback((updated) => {
    setSelectedTicket(updated);
    // Refresh the list so the badge in the list updates too
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>⬡ Support Tickets</h1>
        <span className="header-meta">SYSTEM / v1.0</span>
      </header>

      <div className="app-body">
        {/* Left panel — form */}
        <aside className="panel">
          <div className="panel-header">
            <span className="dot" />
            New Ticket
          </div>
          <TicketForm onCreated={handleTicketCreated} addToast={addToast} />
        </aside>

        {/* Right — stats bar + list + detail */}
        <main className="main-content">
          {/* Stats */}
          <StatsDashboard refreshKey={refreshKey} />

          {/* Ticket list + detail side-by-side */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* List */}
            <div
              style={{
                width: "380px",
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div className="panel-header">
                <span className="dot" style={{ background: "var(--blue)" }} />
                Tickets
              </div>
              <TicketList
                refreshKey={refreshKey}
                onSelect={setSelectedTicket}
                selectedId={selectedTicket?.id}
              />
            </div>

            {/* Detail */}
            <TicketDetail
              ticket={selectedTicket}
              onUpdated={handleTicketUpdated}
              addToast={addToast}
            />
          </div>
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
