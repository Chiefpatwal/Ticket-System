const BASE_URL = process.env.REACT_APP_API_URL || "/api";

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

export const api = {
  // Tickets
  listTickets: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return request("GET", `/tickets/${qs ? `?${qs}` : ""}`);
  },

  createTicket: (data) => request("POST", "/tickets/", data),

  updateTicket: (id, data) => request("PATCH", `/tickets/${id}/`, data),

  // Stats
  getStats: () => request("GET", "/tickets/stats/"),

  // LLM classification
  classifyTicket: (description) =>
    request("POST", "/tickets/classify/", { description }),
};
