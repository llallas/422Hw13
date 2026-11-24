import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import EventsPage from "./pages/EventsPage.jsx";
import EventDetailPage from "./pages/EventDetailPage.jsx";
import ConfirmationPage from "./pages/ConfirmationPage.jsx";
import MyTicketsPage from "./pages/MyTicketsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <header className="navbar">
        <div className="container nav-inner">
          <Link to="/" className="brand">
            Campus Events
          </Link>
          <nav className="nav-links">
            <Link to="/">Events</Link>
            <Link to="/my-tickets">My Tickets</Link>
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
