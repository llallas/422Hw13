-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Registration_paymentIntentId_key" ON "Registration"("paymentIntentId");
