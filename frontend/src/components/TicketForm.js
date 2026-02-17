import { useState, useRef, useCallback } from "react";
import { api } from "../api/client";

const CATEGORIES = ["billing", "technical", "account", "general"];
const PRIORITIES = ["low", "medium", "high", "critical"];

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "general",
  priority: "medium",
};

export function TicketForm({ onCreated, addToast }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [classifying, setClassifying] = useState(false);
  const [classified, setClassified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  // Track which fields were auto-suggested so we can show the badge
  const [suggested, setSuggested] = useState({ category: false, priority: false });

  const classifyTimerRef = useRef(null);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (form.title.length > 200) errs.title = "Max 200 characters.";
    if (!form.description.trim()) errs.description = "Description is required.";
    return errs;
  };

  // Debounced LLM classification — fires 800ms after user stops typing
  const scheduleClassify = useCallback((description) => {
    clearTimeout(classifyTimerRef.current);
    if (description.trim().length < 20) return;

    classifyTimerRef.current = setTimeout(async () => {
      setClassifying(true);
      try {
        const result = await api.classifyTicket(description);
        const updates = {};
        const newSuggested = { ...suggested };

        if (result.suggested_category) {
          updates.category = result.suggested_category;
          newSuggested.category = true;
        }
        if (result.suggested_priority) {
          updates.priority = result.suggested_priority;
          newSuggested.priority = true;
        }

        if (Object.keys(updates).length > 0) {
          setForm((prev) => ({ ...prev, ...updates }));
          setSuggested(newSuggested);
          setClassified(true);
        }
      } catch {
        // Silent — LLM failure never blocks the form
      } finally {
        setClassifying(false);
      }
    }, 800);
  }, []); // eslint-disable-line

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear suggestion badge when user manually overrides
    if (name === "category" || name === "priority") {
      setSuggested((prev) => ({ ...prev, [name]: false }));
    }

    // Trigger classification when description changes
    if (name === "description") {
      setClassified(false);
      setSuggested({ category: false, priority: false });
      scheduleClassify(value);
    }

    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const ticket = await api.createTicket(form);
      setForm(INITIAL_FORM);
      setClassified(false);
      setSuggested({ category: false, priority: false });
      onCreated(ticket);
      addToast("Ticket submitted successfully.", "success");
    } catch (err) {
      const msg = err.data
        ? Object.values(err.data).flat().join(" ")
        : "Failed to create ticket.";
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel-scroll">
      {/* Title */}
      <div className="form-group">
        <label className="form-label">
          Title <span className="required">*</span>
        </label>
        <input
          className={`form-control ${errors.title ? "error" : ""}`}
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Brief summary of the issue"
          maxLength={200}
          disabled={submitting}
        />
        {errors.title && (
          <span style={{ fontSize: "0.7rem", color: "var(--red)", fontFamily: "var(--font-mono)" }}>
            {errors.title}
          </span>
        )}
        <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textAlign: "right" }}>
          {form.title.length}/200
        </span>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">
          Description <span className="required">*</span>
        </label>
        <textarea
          className={`form-control ${errors.description ? "error" : ""}`}
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe the issue in detail (min. 20 characters to auto-classify)"
          rows={5}
          disabled={submitting}
        />
        {errors.description && (
          <span style={{ fontSize: "0.7rem", color: "var(--red)", fontFamily: "var(--font-mono)" }}>
            {errors.description}
          </span>
        )}
      </div>

      {/* LLM classify status */}
      <div className="classify-status">
        {classifying ? (
          <>
            <div className="spinner" />
            ai classifying…
          </>
        ) : classified ? (
          <>
            <span style={{ color: "var(--amber)" }}>⟡</span>
            ai suggestions applied — review &amp; override below
          </>
        ) : (
          <span>type a description to trigger ai classification</span>
        )}
      </div>

      {/* Category */}
      <div className="form-group">
        <label className="form-label">Category</label>
        <div className="select-wrapper">
          <select
            className="form-control"
            name="category"
            value={form.category}
            onChange={handleChange}
            disabled={submitting}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          {suggested.category && (
            <span className="suggestion-badge">AI</span>
          )}
        </div>
      </div>

      {/* Priority */}
      <div className="form-group">
        <label className="form-label">Priority</label>
        <div className="select-wrapper">
          <select
            className="form-control"
            name="priority"
            value={form.priority}
            onChange={handleChange}
            disabled={submitting}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          {suggested.priority && (
            <span className="suggestion-badge">AI</span>
          )}
        </div>
      </div>

      <hr className="divider" />

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={submitting || classifying}
      >
        {submitting ? (
          <>
            <div className="spinner" style={{ borderTopColor: "var(--bg)" }} />
            Submitting…
          </>
        ) : (
          "Submit Ticket"
        )}
      </button>
    </div>
  );
}
