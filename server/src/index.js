import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { prisma } from "./db.js";
import { getSeatsLeft, releaseExpiredPending } from "./cleanup.js";

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 4242;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  }),
);

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        const registration = await prisma.registration.findUnique({
          where: { paymentIntentId: pi.id },
        });

        if (registration && registration.status === "PENDING") {
          await prisma.registration.update({
            where: { id: registration.id },
            data: { status: "CONFIRMED" },
          });
        }
      }

      if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object;
        const registration = await prisma.registration.findUnique({
          where: { paymentIntentId: pi.id },
        });

        if (registration && registration.status === "PENDING") {
          await prisma.registration.update({
            where: { id: registration.id },
            data: { status: "FAILED" },
          });
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  },
);

app.use(express.json());

app.get("/api/events", async (req, res) => {
  try {
    await releaseExpiredPending(stripe);
    const events = await prisma.event.findMany({
      where: {
        startsAt: { gt: new Date() },
      },
      orderBy: { startsAt: "asc" },
    });

    const withSeats = await Promise.all(
      events.map(async (ev) => ({
        ...ev,
        seatsLeft: await getSeatsLeft(ev.id, ev.capacity, stripe),
      })),
    );

    res.json(withSeats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

app.get("/api/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const seatsLeft = await getSeatsLeft(event.id, event.capacity, stripe);
    res.json({ ...event, seatsLeft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load event" });
  }
});

app.post("/api/events/:id/payment-intent", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  const { attendeeName, attendeeEmail, quantity } = req.body;
  const cleanName = typeof attendeeName === "string" ? attendeeName.trim() : "";
  const cleanEmail =
    typeof attendeeEmail === "string" ? attendeeEmail.trim().toLowerCase() : "";
  const qty = Number(quantity);

  if (!cleanName) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > 4) {
    return res.status(400).json({ error: "Quantity must be between 1 and 4" });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (new Date(event.startsAt) <= new Date()) {
      return res.status(400).json({ error: "Event has already started" });
    }

    const seatsLeft = await getSeatsLeft(event.id, event.capacity, stripe);
    if (seatsLeft < qty) {
      return res.status(400).json({ error: "Not enough seats remaining" });
    }

    const totalCents = event.priceCents * qty;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: cleanEmail,
      metadata: {
        eventId: String(event.id),
        quantity: String(qty),
      },
    });

    let registration;
    try {
      registration = await prisma.registration.create({
        data: {
          eventId: event.id,
          attendeeName: cleanName,
          attendeeEmail: cleanEmail,
          quantity: qty,
          totalCents,
          status: "PENDING",
          paymentIntentId: paymentIntent.id,
        },
      });

      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: {
          registrationId: String(registration.id),
          eventId: String(event.id),
        },
      });
    } catch (dbErr) {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      throw dbErr;
    }

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      registrationId: registration.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start checkout" });
  }
});

app.get("/api/registrations", async (req, res) => {
  const rawEmail = req.query.email;
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    return res.status(400).json({ error: "Email query parameter is required" });
  }

  try {
    await releaseExpiredPending(stripe);
    const registrations = await prisma.registration.findMany({
      where: { attendeeEmail: email },
      include: { event: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load registrations" });
  }
});

app.get("/api/registrations/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid registration id" });
  }

  try {
    await releaseExpiredPending(stripe);
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json(registration);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load registration" });
  }
});

app.post("/api/registrations/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid registration id" });
  }

  try {
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    if (registration.status !== "CONFIRMED") {
      return res
        .status(400)
        .json({ error: "Only confirmed registrations can be cancelled" });
    }

    const hoursUntilStart =
      (new Date(registration.event.startsAt).getTime() - Date.now()) /
      (1000 * 60 * 60);

    if (hoursUntilStart > 48) {
      await stripe.refunds.create({
        payment_intent: registration.paymentIntentId,
      });

      const updated = await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "REFUNDED" },
        include: { event: true },
      });

      return res.json({ registration: updated, refunded: true });
    }

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: { status: "CANCELLED" },
      include: { event: true },
    });

    return res.json({ registration: updated, refunded: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

setInterval(() => {
  releaseExpiredPending(stripe).catch((err) => console.error(err));
}, 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
