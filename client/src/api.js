const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4242";

async function handleResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function getEvents() {
  const res = await fetch(`${API_URL}/api/events`);
  return handleResponse(res);
}

export async function getEvent(id) {
  const res = await fetch(`${API_URL}/api/events/${id}`);
  return handleResponse(res);
}

export async function createPaymentIntent(eventId, payload) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/payment-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function getRegistration(id) {
  const res = await fetch(`${API_URL}/api/registrations/${id}`);
  return handleResponse(res);
}

export async function getRegistrationsByEmail(email) {
  const res = await fetch(
    `${API_URL}/api/registrations?email=${encodeURIComponent(email)}`,
  );
  return handleResponse(res);
}

export async function cancelRegistration(id) {
  const res = await fetch(`${API_URL}/api/registrations/${id}/cancel`, {
    method: "POST",
  });
  return handleResponse(res);
}

export function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
