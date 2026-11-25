import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  createPaymentIntent,
  formatDate,
  formatPrice,
  getEvent,
} from "../api.js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise =
  publishableKey && !publishableKey.includes("your_test")
    ? loadStripe(publishableKey)
    : null;

function CheckoutForm({ registrationId, totalCents }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/confirmation?registrationId=${registrationId}`,
      },
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="payment-box">
      <h3>Card Details</h3>
      <p className="meta">
        Your seats are held for 15 minutes while you complete payment.
      </p>
      <PaymentElement />
      {error && <p className="error">{error}</p>}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={!stripe || submitting}>
        {submitting ? "Processing..." : `Pay ${formatPrice(totalCents)}`}
      </button>
    </form>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  useEffect(() => {
    getEvent(id)
      .then((data) => setEvent(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStartCheckout(e) {
    e.preventDefault();
    setCreatingIntent(true);
    setError("");

    try {
      const data = await createPaymentIntent(id, {
        attendeeName,
        attendeeEmail,
        quantity,
      });
      setCheckoutData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingIntent(false);
    }
  }

  if (loading) return <p>Loading event...</p>;
  if (!event) return <p className="error">{error || "Event not found"}</p>;

  const soldOut = event.seatsLeft <= 0;
  const maxQty = Math.min(4, event.seatsLeft);

  return (
    <div>
      <Link to="/" className="back-link">
        &larr; Back to events
      </Link>
      <div className="card">
        <div className="card-header">
          <h1>{event.title}</h1>
          <span className="price">
            {formatPrice(event.priceCents)} / ticket
          </span>
        </div>
        <p className="meta">
          {formatDate(event.startsAt)} &bull; {event.location}
        </p>
        <p>{event.description}</p>
        <p>
          {soldOut ? (
            <span className="badge badge-soldout">Sold out</span>
          ) : (
            <strong>{event.seatsLeft} seats left</strong>
          )}
        </p>

        {!soldOut && !checkoutData && (
          <form onSubmit={handleStartCheckout} className="form-stack">
            <h3>Reserve Tickets</h3>
            <label>
              Full Name
              <input
                type="text"
                required
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder="Jordan Taylor"
              />
            </label>
            <label>
              Campus Email
              <input
                type="email"
                required
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="jtaylor@university.edu"
              />
            </label>
            <label>
              Quantity (1–{maxQty})
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}>
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "ticket" : "tickets"} (
                    {formatPrice(event.priceCents * num)})
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="error">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creatingIntent}>
              {creatingIntent ? "Starting checkout..." : "Continue to Payment"}
            </button>
          </form>
        )}

        {checkoutData && (
          stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: checkoutData.clientSecret }}>
              <CheckoutForm
                registrationId={checkoutData.registrationId}
                totalCents={event.priceCents * quantity}
              />
            </Elements>
          ) : (
            <p className="error">
              Stripe is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to the
              client environment and restart the app.
            </p>
          )
        )}
      </div>
    </div>
  );
}
