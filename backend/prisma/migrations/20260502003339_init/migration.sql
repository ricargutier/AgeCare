-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Elder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "conditions" TEXT[],
    "emergencyContacts" JSONB NOT NULL,

    CONSTRAINT "Elder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareCircleMember" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "permissionLevel" TEXT NOT NULL,

    CONSTRAINT "CareCircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "batteryPct" DOUBLE PRECISION,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalsSample" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "heartRate" DOUBLE PRECISION,
    "spo2" DOUBLE PRECISION,
    "steps" DOUBLE PRECISION,
    "batteryPct" DOUBLE PRECISION,

    CONSTRAINT "VitalsSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationSchedule" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "timesOfDay" TEXT[],
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),

    CONSTRAINT "MedicationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationEvent" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "takenAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "MedicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "expirationTime" BIGINT,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Elder_userId_key" ON "Elder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CareCircleMember_elderId_userId_key" ON "CareCircleMember"("elderId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serial_key" ON "Device"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "VitalsSample_elderId_ts_idx" ON "VitalsSample"("elderId", "ts");

-- CreateIndex
CREATE INDEX "Alert_elderId_createdAt_idx" ON "Alert"("elderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "Elder" ADD CONSTRAINT "Elder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircleMember" ADD CONSTRAINT "CareCircleMember_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircleMember" ADD CONSTRAINT "CareCircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsSample" ADD CONSTRAINT "VitalsSample_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsSample" ADD CONSTRAINT "VitalsSample_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSchedule" ADD CONSTRAINT "MedicationSchedule_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationEvent" ADD CONSTRAINT "MedicationEvent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MedicationSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
