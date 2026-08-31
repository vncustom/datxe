// Các bảng đồng bộ 2 chiều giữa SQLite (local) và PostgreSQL (cloud).
// Thứ tự phải tôn trọng khoá ngoại: cha trước, con sau.
// Mọi bảng đồng bộ theo cột `id` (uuid). users/vehicles có id tất định (xem lib/uuid.ts).
export const SYNC_TABLES = [
  { name: "users", changedAt: "updatedAt", tombstone: true },
  { name: "vehicles", changedAt: "updatedAt", tombstone: true },
  { name: "bookings", changedAt: "updatedAt", tombstone: true },
  { name: "booking_approvals", changedAt: "updatedAt", tombstone: true },
  { name: "booking_dispatch", changedAt: "updatedAt", tombstone: true },
  { name: "trip_logs", changedAt: "updatedAt", tombstone: true },
  { name: "odometer_events", changedAt: "updatedAt", tombstone: true },
  { name: "alert_acks", changedAt: "updatedAt", tombstone: true },
  { name: "audit_log", changedAt: "atTime", tombstone: false, appendOnly: true },
];

// Bảng nhật ký của daemon — ghi thẳng vào cả 2 CSDL, không qua watermark.
export const LOG_TABLES = ["sync_run", "sync_conflict_log"];

// Không đồng bộ: sync_state (watermark riêng của máy local).
