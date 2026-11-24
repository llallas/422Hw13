import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate, formatPrice, getRegistration } from "../api.js";

export default function ConfirmationPage() {
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get("registrationId");

  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!registrationId) {
      setError("Missing registration ID");
      return;
    }

    let cancelled = false;
    let timer;

    async function checkStatus(attempt) {
      try {
        const data = await getRegistration(registrationId);
        if (cancelled) return;
        setRegistration(data);
        setPollCount(attempt);

        if (data.status === "PENDING" && attempt < 20) {
          timer = setTimeout(() => checkStatus(attempt + 1), 2000);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    checkStatus(1);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [registrationId]);

  async function manualRefresh() {
    if (!registrationId) return;
    try {
      const data = await getRegistration(registrationId);
      setRegistration(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <div className="card">
        <h1>Confirmation Error</h1>
        <p className="error">{error}</p>
        <Link to="/" className="btn">
          Back to Events
        </Link>
      </div>
    );
  }

  if (!registration) {
    return <p>Checking payment status...</p>;
  }

  if (registration.status === "CONFIRMED") {
    return (
      <div className="card">
        <span className="badge badge-confirmed">CONFIRMED</span>
        <h1>You're Registered!</h1>
        <p>
          Confirmation #{registration.id} for{" "}
          <strong>{registration.event.title}</strong>
        </p>
        <p className="meta">
          {formatDate(registration.event.startsAt)} &bull;{" "}
          {registration.event.location}
        </p>
        <p>
          <strong>Attendee:</strong> {registration.attendeeName} (
          {registration.attendeeEmail})
        </p>
        <p>
          <strong>Tickets:</strong> {registration.quantity} &bull;{" "}
          <strong>Total Paid:</strong> {formatPrice(registration.totalCents)}
        </p>
        <div className="card-footer">
          <Link to="/my-tickets" className="btn btn-primary">
            View My Tickets
          </Link>
          <Link to="/" className="btn">
            Browse More Events
          </Link>
        </div>
      </div>
    );
  }

  if (registration.status === "FAILED" || registration.status === "CANCELLED") {
    return (
      <div className="card">
        <span className="badge badge-failed">{registration.status}</span>
        <h1>Payment Did Not Complete</h1>
        <p>Your registration was not confirmed and no seats were charged.</p>
        <Link
          to={`/events/${registration.eventId}`}
          className="btn btn-primary">
          Try Again
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <span className="badge badge-pending">PENDING</span>
      <h1>Still Working on Your Confirmation...</h1>
      <p>
        We are waiting for Stripe webhook confirmation for registration #
        {registration.id}
        {pollCount < 20 ? " (checking automatically)..." : "."}
      </p>
      <button type="button" className="btn" onClick={manualRefresh}>
        Check Status Now
      </button>
    </div>
  );
}
