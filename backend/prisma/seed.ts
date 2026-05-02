import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("agecare-demo-2026", 10);

  // ─── Seed Users ───────────────────────────────────────────────────────────
  const eleanor = await prisma.user.upsert({
    where: { email: "eleanor@agecare.demo" },
    update: {},
    create: {
      email: "eleanor@agecare.demo",
      passwordHash: password,
      role: "elder",
      displayName: "Eleanor Vance",
      phone: "+1-555-0101",
    },
  });

  const david = await prisma.user.upsert({
    where: { email: "david@agecare.demo" },
    update: {},
    create: {
      email: "david@agecare.demo",
      passwordHash: password,
      role: "family_admin",
      displayName: "David Vance",
      phone: "+1-555-0102",
    },
  });

  const sarah = await prisma.user.upsert({
    where: { email: "sarah@agecare.demo" },
    update: {},
    create: {
      email: "sarah@agecare.demo",
      passwordHash: password,
      role: "family_viewer",
      displayName: "Sarah Vance",
      phone: "+1-555-0103",
    },
  });

  const maria = await prisma.user.upsert({
    where: { email: "maria@agecare.demo" },
    update: {},
    create: {
      email: "maria@agecare.demo",
      passwordHash: password,
      role: "caregiver",
      displayName: "Maria Santos",
      phone: "+1-555-0104",
    },
  });

  const drChen = await prisma.user.upsert({
    where: { email: "dr.chen@agecare.demo" },
    update: {},
    create: {
      email: "dr.chen@agecare.demo",
      passwordHash: password,
      role: "healthcare_provider",
      displayName: "Dr. Linda Chen",
      phone: "+1-555-0105",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@agecare.demo" },
    update: {},
    create: {
      email: "admin@agecare.demo",
      passwordHash: password,
      role: "system_admin",
      displayName: "System Admin",
      phone: null,
    },
  });

  console.log("Users seeded:", [eleanor, david, sarah, maria, drChen, admin].map(u => u.email));

  // ─── Seed Elder ────────────────────────────────────────────────────────────
  const elder = await prisma.elder.upsert({
    where: { userId: eleanor.id },
    update: {},
    create: {
      userId: eleanor.id,
      dob: new Date("1945-03-15"),
      conditions: ["hypertension", "type 2 diabetes", "mild arthritis"],
      emergencyContacts: [
        { name: "David Vance", relationship: "son", phone: "+1-555-0102", priority: 1 },
        { name: "Sarah Vance", relationship: "daughter", phone: "+1-555-0103", priority: 2 },
      ],
    },
  });

  console.log("Elder seeded:", elder.id);

  // ─── Seed CareCircle ──────────────────────────────────────────────────────
  await prisma.careCircleMember.upsert({
    where: { elderId_userId: { elderId: elder.id, userId: david.id } },
    update: {},
    create: {
      elderId: elder.id,
      userId: david.id,
      relationship: "child",
      permissionLevel: "admin",
    },
  });

  await prisma.careCircleMember.upsert({
    where: { elderId_userId: { elderId: elder.id, userId: sarah.id } },
    update: {},
    create: {
      elderId: elder.id,
      userId: sarah.id,
      relationship: "child",
      permissionLevel: "viewer",
    },
  });

  await prisma.careCircleMember.upsert({
    where: { elderId_userId: { elderId: elder.id, userId: maria.id } },
    update: {},
    create: {
      elderId: elder.id,
      userId: maria.id,
      relationship: "professional_caregiver",
      permissionLevel: "caregiver",
    },
  });

  await prisma.careCircleMember.upsert({
    where: { elderId_userId: { elderId: elder.id, userId: drChen.id } },
    update: {},
    create: {
      elderId: elder.id,
      userId: drChen.id,
      relationship: "provider",
      permissionLevel: "provider",
    },
  });

  console.log("CareCircle seeded");

  // ─── Seed Devices ─────────────────────────────────────────────────────────
  // Deterministic IDs are required: simulators send these literal strings as
  // `deviceId` in IngestFrame, and ws-ingest validates frame.deviceId === device.id.
  const wearable = await prisma.device.upsert({
    where: { id: "wearable-eleanor" },
    update: {},
    create: {
      id: "wearable-eleanor",
      elderId: elder.id,
      type: "wearable",
      serial: "WEAR-ELEANOR-001",
      lastSeenAt: null,
      batteryPct: 85,
    },
  });

  const hub = await prisma.device.upsert({
    where: { id: "hub-eleanor" },
    update: {},
    create: {
      id: "hub-eleanor",
      elderId: elder.id,
      type: "hub",
      serial: "HUB-ELEANOR-001",
      lastSeenAt: null,
    },
  });

  const motionSensor = await prisma.device.upsert({
    where: { id: "motion-living-eleanor" },
    update: {},
    create: {
      id: "motion-living-eleanor",
      elderId: elder.id,
      type: "motion_sensor",
      serial: "MOTION-ELEANOR-001",
      lastSeenAt: null,
    },
  });

  const doorSensor = await prisma.device.upsert({
    where: { id: "door-front-eleanor" },
    update: {},
    create: {
      id: "door-front-eleanor",
      elderId: elder.id,
      type: "door_sensor",
      serial: "DOOR-ELEANOR-001",
      lastSeenAt: null,
    },
  });

  console.log("Devices seeded:", [wearable, hub, motionSensor, doorSensor].map(d => d.id));

  // ─── Seed DeviceTokens ────────────────────────────────────────────────────
  // Token names match what simulators/src/lib/devices.ts expects.
  await prisma.deviceToken.upsert({
    where: { token: "wearable-token-eleanor" },
    update: {},
    create: {
      deviceId: wearable.id,
      token: "wearable-token-eleanor",
    },
  });

  await prisma.deviceToken.upsert({
    where: { token: "hub-token-eleanor" },
    update: {},
    create: {
      deviceId: hub.id,
      token: "hub-token-eleanor",
    },
  });

  await prisma.deviceToken.upsert({
    where: { token: "motion-living-token-eleanor" },
    update: {},
    create: {
      deviceId: motionSensor.id,
      token: "motion-living-token-eleanor",
    },
  });

  await prisma.deviceToken.upsert({
    where: { token: "door-front-token-eleanor" },
    update: {},
    create: {
      deviceId: doorSensor.id,
      token: "door-front-token-eleanor",
    },
  });

  console.log("DeviceTokens seeded");

  // ─── Seed MedicationSchedule ──────────────────────────────────────────────
  const medSchedule = await prisma.medicationSchedule.upsert({
    where: { id: "med-schedule-eleanor-lisinopril" },
    update: {},
    create: {
      id: "med-schedule-eleanor-lisinopril",
      elderId: elder.id,
      drugName: "Lisinopril",
      dose: "10mg",
      timesOfDay: ["08:00", "20:00"],
      startsOn: new Date("2026-01-01"),
      endsOn: null,
    },
  });

  console.log("MedicationSchedule seeded:", medSchedule.id);

  // Seed 3 pending medication events (today + tomorrow)
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split("T")[0];

  const eventDates = [
    `${todayStr}T08:00:00.000Z`,
    `${todayStr}T20:00:00.000Z`,
    `${tomorrowStr}T08:00:00.000Z`,
  ];

  for (let i = 0; i < eventDates.length; i++) {
    const eventId = `med-event-eleanor-${i + 1}`;
    await prisma.medicationEvent.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        scheduleId: medSchedule.id,
        dueAt: new Date(eventDates[i]!),
        status: "pending",
      },
    });
  }

  console.log("MedicationEvents seeded");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
