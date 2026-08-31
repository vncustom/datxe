-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dsBan" TEXT,
    "dsPhong" TEXT,
    "dsTo" TEXT,
    "role" TEXT NOT NULL DEFAULT 'nhan_vien',
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isDriver" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "currentOdometer" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "requesterUsername" TEXT NOT NULL,
    "donViYeuCau" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "diemXuatPhat" TEXT NOT NULL DEFAULT 'HTV',
    "diemDen" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "bienTap" TEXT,
    "quayPhim" TEXT,
    "soNguoi" INTEGER,
    "isPhatSinh" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'cho_ban_duyet',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_approvals" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "approverUsername" TEXT NOT NULL,
    "quyetDinh" TEXT NOT NULL,
    "ghiChu" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "booking_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_dispatch" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverUsername" TEXT NOT NULL,
    "ghiChuDoiXe" TEXT,
    "dispatchedBy" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "booking_dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_logs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "driverUsername" TEXT NOT NULL,
    "odoStart" INTEGER,
    "gioXuatBen" TIMESTAMP(3),
    "odoEnd" INTEGER,
    "gioKetThuc" TIMESTAMP(3),
    "soKm" INTEGER,
    "ghiChuLaiXe" TEXT,
    "daDongChuyen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "trip_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odometer_events" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "bookingId" TEXT,
    "loai" TEXT NOT NULL,
    "odoValue" INTEGER NOT NULL,
    "atTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "odometer_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "byUsername" TEXT,
    "atTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diff" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_acks" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "ackedBy" TEXT NOT NULL,
    "note" TEXT,
    "ackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "alert_acks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_run" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "direction" TEXT NOT NULL,
    "tableName" TEXT,
    "rowsPushed" INTEGER NOT NULL DEFAULT 0,
    "rowsPulled" INTEGER NOT NULL DEFAULT 0,
    "conflicts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "sync_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflict_log" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "localUpdatedAt" TIMESTAMP(3),
    "remoteUpdatedAt" TIMESTAMP(3),
    "winner" TEXT NOT NULL,
    "losingPayload" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_conflict_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_state" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "watermark" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_dsBan_idx" ON "users"("dsBan");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plateNo_key" ON "vehicles"("plateNo");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_code_key" ON "bookings"("code");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_startTime_idx" ON "bookings"("startTime");

-- CreateIndex
CREATE INDEX "bookings_donViYeuCau_idx" ON "bookings"("donViYeuCau");

-- CreateIndex
CREATE UNIQUE INDEX "booking_approvals_bookingId_key" ON "booking_approvals"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_dispatch_bookingId_key" ON "booking_dispatch"("bookingId");

-- CreateIndex
CREATE INDEX "booking_dispatch_vehicleId_idx" ON "booking_dispatch"("vehicleId");

-- CreateIndex
CREATE INDEX "booking_dispatch_driverUsername_idx" ON "booking_dispatch"("driverUsername");

-- CreateIndex
CREATE UNIQUE INDEX "trip_logs_bookingId_key" ON "trip_logs"("bookingId");

-- CreateIndex
CREATE INDEX "odometer_events_vehicleId_atTime_idx" ON "odometer_events"("vehicleId", "atTime");

-- CreateIndex
CREATE INDEX "audit_log_entity_entityId_idx" ON "audit_log"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "alert_acks_kind_refId_key" ON "alert_acks"("kind", "refId");

-- CreateIndex
CREATE INDEX "sync_conflict_log_tableName_rowId_idx" ON "sync_conflict_log"("tableName", "rowId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_state_tableName_direction_key" ON "sync_state"("tableName", "direction");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_requesterUsername_fkey" FOREIGN KEY ("requesterUsername") REFERENCES "users"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_approvals" ADD CONSTRAINT "booking_approvals_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_approvals" ADD CONSTRAINT "booking_approvals_approverUsername_fkey" FOREIGN KEY ("approverUsername") REFERENCES "users"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_dispatch" ADD CONSTRAINT "booking_dispatch_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_dispatch" ADD CONSTRAINT "booking_dispatch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_dispatch" ADD CONSTRAINT "booking_dispatch_driverUsername_fkey" FOREIGN KEY ("driverUsername") REFERENCES "users"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_dispatch" ADD CONSTRAINT "booking_dispatch_dispatchedBy_fkey" FOREIGN KEY ("dispatchedBy") REFERENCES "users"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_logs" ADD CONSTRAINT "trip_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_logs" ADD CONSTRAINT "trip_logs_driverUsername_fkey" FOREIGN KEY ("driverUsername") REFERENCES "users"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_events" ADD CONSTRAINT "odometer_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

