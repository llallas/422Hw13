import { useState } from "react";
import {
  cancelRegistration,
  formatDate,
  formatPrice,
  getRegistrationsByEmail,
} from "../api.js";

export default function MyTicketsPage() {
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTickets(targetEmail) {
    setLoading(true);
    setError("");
    try {
      const data = await getRegistrationsByEmail(targetEmail);
      setTickets(data);
      setSearchedEmail(targetEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setMessage("");
    if (!email.trim()) return;
    await loadTickets(email.trim());
  }

  async function handleCancel(ticket, eligibleForRefund) {
    const confirmText = eligibleForRefund
      ? "Cancel this registration for a full refund? Your seats will be released."
      : "This event starts in 48 hours or less, so no refund will be issued. Cancel anyway?";

    if (!window.confirm(confirmText)) return;

    setCancellingId(ticket.id);
    setError("");
    setMessage("");

    try {
      const res = await cancelRegistration(ticket.id);
      setMessage(
        res.refunded
          ? `Registration #${ticket.id} cancelled and full refund issued.`
          : `Registration #${ticket.id} cancelled (no refund within 48 hours of start).`,
      );
      await loadTickets(searchedEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div>
      <h1>My Tickets</h1>
      <form onSubmit={handleSearch} className="search-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your registration email"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Looking up..." : "Find Tickets"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-msg">{message}</p>}

      {searchedEmail && !loading && tickets.length === 0 && (
        <p>No registrations found for {searchedEmail}.</p>
      )}

      <div className="event-grid">
        {tickets.map((t) => {
          const hoursUntilStart =
            (new Date(t.event.startsAt).getTime() - Date.now()) /
            (1000 * 60 * 60);
          const hasStarted = hoursUntilStart <= 0;
          const eligibleForRefund = hoursUntilStart > 48;
          const canCancel = t.status === "CONFIRMED" && !hasStarted;

          return (
            <div key={t.id} className="card">
              <div className="card-header">
                <h2>{t.event.title}</h2>
                <span className={`badge badge-${t.status.toLowerCase()}`}>
                  {t.status}
                </span>
              </div>
              <p className="meta">
                {formatDate(t.event.startsAt)} &bull; {t.event.location}
              </p>
              <p>
                <strong>Registration #{t.id}</strong> &bull; {t.quantity}{" "}
                {t.quantity === 1 ? "ticket" : "tickets"} &bull;{" "}
                {formatPrice(t.totalCents)}
              </p>

              {canCancel && (
                <div className="cancel-box">
                  <p className="refund-rule">
                    {eligibleForRefund
                      ? "Refund policy: More than 48 hours before start — full refund."
                      : "Refund policy: 48 hours or less before start — no refund."}
                  </p>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={cancellingId === t.id}
                    onClick={() => handleCancel(t, eligibleForRefund)}>
                    {cancellingId === t.id
                      ? "Cancelling..."
                      : eligibleForRefund
                        ? "Cancel & Refund"
                        : "Cancel (No Refund)"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
