import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, formatPrice, getEvents } from "../api.js";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents()
      .then((data) => setEvents(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading upcoming events...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1>Upcoming Campus Events</h1>
      {events.length === 0 ? (
        <p>No upcoming events right now.</p>
      ) : (
        <div className="event-grid">
          {events.map((ev) => {
            const soldOut = ev.seatsLeft <= 0;
            return (
              <div key={ev.id} className="card">
                <div className="card-header">
                  <h2>{ev.title}</h2>
                  <span className="price">{formatPrice(ev.priceCents)}</span>
                </div>
                <p className="meta">
                  {formatDate(ev.startsAt)} &bull; {ev.location}
                </p>
                <p>{ev.description}</p>
                <div className="card-footer">
                  {soldOut ? (
                    <span className="badge badge-soldout">Sold out</span>
                  ) : (
                    <span className="seats">{ev.seatsLeft} seats left</span>
                  )}
                  <Link to={`/events/${ev.id}`} className="btn">
                    {soldOut ? "View Details" : "Get Tickets"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
