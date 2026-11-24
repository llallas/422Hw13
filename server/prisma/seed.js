import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();

  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  await prisma.event.createMany({
    data: [
      {
        title: "Pottery Wheel Intro Session",
        description:
          "Small-group beginner ceramics workshop in the Fine Arts basement studio. Clay and firing included.",
        location: "Fine Arts Building, Room 014",
        startsAt: new Date(now + 5 * day),
        priceCents: 1500,
        capacity: 3,
      },
      {
        title: "Finals Week Midnight Pancake Feed",
        description:
          "All-you-can-eat pancakes, fruit, and coffee hosted by the Student Union Board.",
        location: "Student Union Ballroom",
        startsAt: new Date(now + 18 * hour),
        priceCents: 500,
        capacity: 50,
      },
      {
        title: "Fall Campus Club Fair",
        description:
          "Meet over 80 student organizations, intramural teams, and volunteer groups.",
        location: "Main Quad",
        startsAt: new Date(now - 3 * day),
        priceCents: 500,
        capacity: 120,
      },
      {
        title: "Acoustic Coffeehouse Open Mic",
        description: "Live student music, spoken word, and espresso drinks.",
        location: "Commons Cafe",
        startsAt: new Date(now + 4 * day),
        priceCents: 800,
        capacity: 35,
      },
      {
        title: "Intramural 3v3 Basketball Tournament",
        description:
          "Single-elimination evening bracket. Register individually or with friends.",
        location: "Rec Center Court 2",
        startsAt: new Date(now + 7 * day),
        priceCents: 1200,
        capacity: 24,
      },
      {
        title: "Campus Hackathon Weekend Pass",
        description: "36 hours of building, workshops, meals, and demo prizes.",
        location: "Engineering Atrium",
        startsAt: new Date(now + 12 * day),
        priceCents: 2000,
        capacity: 60,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
