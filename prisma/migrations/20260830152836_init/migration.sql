-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "currentOdometer" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "requesterUsername" TEXT NOT NULL,
    "donViYeuCau" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "diemXuatPhat" TEXT NOT NULL DEFAULT 'HTV',
    "diemDen" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "bienTap" TEXT,
    "quayPhim" TEXT,
    "soNguoi" INTEGER,
    "isPhatSinh" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'cho_ban_duyet',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME,
    CONSTRAINT "bookings_requesterUsername_fkey" FOREIGN KEY ("requesterUsername") REFERENCES "users" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "booking_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "approverUsername" TEXT NOT NULL,
    "quyetDinh" TEXT NOT NULL,
    "ghiChu" TEXT,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME,
    CONSTRAINT "booking_approvals_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "booking_approvals_approverUsername_fkey" FOREIGN KEY ("approverUsername") REFERENCES "users" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "booking_dispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverUsername" TEXT NOT NULL,
    "ghiChuDoiXe" TEXT,
    "dispatchedBy" TEXT NOT NULL,
    "dispatchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME,
    CONSTRAINT "booking_dispatch_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "booking_dispatch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "booking_dispatch_driverUsername_fkey" FOREIGN KEY ("driverUsername") REFERENCES "users" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "booking_dispatch_dispatchedBy_fkey" FOREIGN KEY ("dispatchedBy") REFERENCES "users" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trip_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "driverUsername" TEXT NOT NULL,
    "odoStart" INTEGER,
    "gioXuatBen" DATETIME,
    "odoEnd" INTEGER,
    "gioKetThuc" DATETIME,
    "soKm" INTEGER,
    "ghiChuLaiXe" TEXT,
    "daDongChuyen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME,
    CONSTRAINT "trip_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trip_logs_driverUsername_fkey" FOREIGN KEY ("driverUsername") REFERENCES "users" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "odometer_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "bookingId" TEXT,
    "loai" TEXT NOT NULL,
    "odoValue" INTEGER NOT NULL,
    "atTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byUsername" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME,
    CONSTRAINT "odometer_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "byUsername" TEXT,
    "atTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diff" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local'
);

-- CreateTable
CREATE TABLE "sync_run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "direction" TEXT NOT NULL,
    "tableName" TEXT,
    "rowsPushed" INTEGER NOT NULL DEFAULT 0,
    "rowsPulled" INTEGER NOT NULL DEFAULT 0,
    "conflicts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "sync_conflict_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableName" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "localUpdatedAt" DATETIME,
    "remoteUpdatedAt" DATETIME,
    "winner" TEXT NOT NULL,
    "losingPayload" TEXT,
    "resolvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sync_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableName" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "watermark" DATETIME,
    "updatedAt" DATETIME NOT NULL
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
CREATE INDEX "sync_conflict_log_tableName_rowId_idx" ON "sync_conflict_log"("tableName", "rowId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_state_tableName_direction_key" ON "sync_state"("tableName", "direction");
