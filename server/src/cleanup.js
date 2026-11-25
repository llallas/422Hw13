import { prisma } from "./db.js";

const HOLD_DURATION_MS = 15 * 60 * 1000;

export async function releaseExpiredPending(stripe) {
  const cutoff = new Date(Date.now() - HOLD_DURATION_MS);

  const expired = await prisma.registration.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
  });

  for (const reg of expired) {
    try {
      await stripe.paymentIntents.cancel(reg.paymentIntentId);
      await prisma.registration.update({
        where: { id: reg.id },
        data: { status: "CANCELLED" },
      });
    } catch (err) {
      try {
        const pi = await stripe.paymentIntents.retrieve(reg.paymentIntentId);
        if (pi.status === "succeeded") {
          await prisma.registration.update({
            where: { id: reg.id },
            data: { status: "CONFIRMED" },
          });
        } else if (pi.status === "canceled") {
          await prisma.registration.update({
            where: { id: reg.id },
            data: { status: "CANCELLED" },
          });
        }
      } catch (retrieveErr) {
        console.error(
          `Could not reconcile pending registration ${reg.id}:`,
          retrieveErr.message,
        );
      }
    }
  }
}

export async function getSeatsLeft(eventId, capacity, stripe) {
  await releaseExpiredPending(stripe);
  const cutoff = new Date(Date.now() - HOLD_DURATION_MS);

  const result = await prisma.registration.aggregate({
    _sum: { quantity: true },
    where: {
      eventId,
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", createdAt: { gte: cutoff } },
      ],
    },
  });

  const reserved = result._sum.quantity || 0;
  return Math.max(0, capacity - reserved);
}
