# Support Ticket System

A full-stack support ticket system with AI-powered categorization and priority suggestion.

## Tech Stack

| Layer      | Technology                      |
|------------|---------------------------------|
| Backend    | Django 4.2 + Django REST Framework |
| Database   | PostgreSQL 16                   |
| Frontend   | React 18                        |
| Serving    | Gunicorn (backend) + Nginx (frontend) |
| LLM        | Anthropic Claude (Haiku)        |
| Container  | Docker + Docker Compose         |

---

## Quick Start

### 1. Provide your API key

```bash
cp .env.example .env
# Edit .env and set LLM_API_KEY=your_anthropic_key_here
```

> The app works fully without an API key — the LLM classification feature will simply return no suggestions, and users can still set category/priority manually.

### 2. Run

```bash
docker-compose up --build
```

The first build takes ~3–5 minutes (npm install + pip install).
Once running, open **http://localhost** in your browser.

### 3. Stop

```bash
docker-compose down          # keeps the database volume
docker-compose down -v       # also removes the database
```

---

## Features

- **Submit tickets** — title, description, category, priority
- **AI classification** — as you type a description, Claude auto-suggests the best category and priority. Suggestions are clearly marked with an `AI` badge and are fully overridable.
- **Ticket list** — newest first, with combined filters (category, priority, status) and full-text search across title + description
- **Ticket detail** — click any ticket to view details and update its status (open → in_progress → resolved → closed)
- **Stats dashboard** — live aggregated metrics: total tickets, open count, average per day, priority and category breakdowns with visual bars

---

## LLM Integration

### Why Anthropic Claude (Haiku)?

- **Speed**: Claude Haiku 4.5 is optimized for low-latency, high-throughput tasks. Classification is called on blur/debounce while the user is typing, so response time is critical.
- **Reliability**: Structured JSON output without markdown wrappers is consistently produced when the prompt instructs it explicitly.
- **Cost**: Haiku is the most economical Claude model — appropriate for a high-frequency classification call.

### Prompt design

See [`backend/tickets/llm.py`](backend/tickets/llm.py). Key decisions:

1. **System/user role separation** — the classification instructions live in the system prompt, and only the user-supplied description goes in the user turn. This prevents prompt injection from ticket descriptions from overriding the classification behavior.

2. **Enumerate valid values explicitly** — the prompt lists every valid category and priority with a short description. This eliminates hallucinated choices (e.g. "urgent" instead of "critical").

3. **JSON-only output instruction** — "Respond ONLY with a valid JSON object — no markdown, no explanation" prevents the model from wrapping the answer in backtick blocks, which would break `json.loads()`.

4. **Concrete output example** — providing the exact expected shape in the prompt reduces format deviations.

5. **Description truncation** — descriptions are capped at 2 000 characters before being sent to the LLM, preventing runaway token costs.

### Graceful degradation

If the LLM call fails for any reason (bad key, network issue, non-JSON response, unknown category value):

- The backend returns `{"suggested_category": null, "suggested_priority": null}`
- The frontend silently ignores null suggestions — the dropdowns remain at their defaults
- Ticket submission is never blocked

---

## API Endpoints

| Method | Endpoint                | Description                              |
|--------|-------------------------|------------------------------------------|
| POST   | `/api/tickets/`         | Create ticket (returns 201)              |
| GET    | `/api/tickets/`         | List tickets, newest first               |
|        | `?category=billing`     | Filter by category                       |
|        | `?priority=high`        | Filter by priority                       |
|        | `?status=open`          | Filter by status                         |
|        | `?search=login`         | Full-text search (title + description)   |
| PATCH  | `/api/tickets/<id>/`    | Partial update (status, category, etc.)  |
| GET    | `/api/tickets/stats/`   | Aggregated metrics                       |
| POST   | `/api/tickets/classify/`| LLM classification for a description     |

---

## Design Decisions

### DB-level aggregation in `/stats/`

The stats endpoint uses Django ORM `Count` with `.values().annotate()` for breakdowns and Python only for the final dict construction from the returned rows. No Python iteration over individual ticket instances.

### URL ordering

`stats/` and `classify/` are declared before `<int:pk>/` in `urls.py` so Django doesn't try to coerce the literal strings "stats" and "classify" into integers.

### Indexes

The `Ticket` model adds database indexes on `category`, `priority`, `status`, and `created_at` — the four most frequently filtered/sorted columns.

### Two-stage Docker build for frontend

The frontend Dockerfile uses a builder stage (`node:20-alpine`) to produce the static bundle, then copies only the build artifacts into a lean Nginx image. This keeps the final image small and avoids shipping Node.js into production.

### CORS

In development (`DEBUG=True`) all origins are allowed. In production (the Docker compose setup, where `DEBUG=False`) only the explicitly listed `CORS_ALLOWED_ORIGINS` are accepted.

---

## Project Structure

```
support-ticket-system/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh        # waits for DB, migrates, starts gunicorn
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── tickets/
│       ├── models.py        # Ticket model with DB constraints
│       ├── serializers.py   # DRF serializers
│       ├── views.py         # API views + stats aggregation
│       ├── llm.py           # LLM classification service
│       ├── urls.py
│       └── admin.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── api/
        │   └── client.js    # Centralised fetch wrapper
        └── components/
            ├── TicketForm.js      # Submit form + LLM UX
            ├── TicketList.js      # Filterable list
            ├── TicketDetail.js    # Detail view + status editor
            ├── StatsDashboard.js  # Metrics bar
            └── Toast.js           # Toast notification system
```
