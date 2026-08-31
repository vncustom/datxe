// Xoá toàn bộ dữ liệu GIAO DỊCH (đơn, chuyến, nhật ký) — GIỮ NGUYÊN users + vehicles.
// Dùng khi kết thúc chạy thử, chuyển sang dữ liệu thật, mà không muốn set lại
// vai trò / tên / số km xe đã cấu hình.
//
//   node scripts/purge-bookings.mjs           # xoá ở SQLite local (LOCAL_DB_PATH)
//   node scripts/purge-bookings.mjs --cloud   # xoá ở Supabase (cần SUPABASE_DB_URL)
//
// LƯU Ý: xoá cứng KHÔNG tự đồng bộ. Phải chạy ở CẢ 2 bên rồi:
//   npm run sync:reset && npm run sync:once
process.env.TZ = "UTC";
import { existsSync, readFileSync } from "node:fs";
import { openLocal, openCloud } from "../sync/lib.mjs";

// nạp .env / .env.sync để lấy SUPABASE_DB_URL
for (const f of [".env", ".env.sync"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m || /^\s*#/.test(line)) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// child -> parent (FK-safe)
const TABLES = [
  "sync_conflict_log",
  "sync_run",
  "sync_state",
  "audit_log",
  "odometer_events",
  "alert_acks",
  "trip_logs",
  "booking_dispatch",
  "booking_approvals",
  "bookings",
];

const CLOUD = process.argv.includes("--cloud");

async function main() {
  if (CLOUD) {
    const url = process.env.SUPABASE_DB_URL;
    if (!url) throw new Error("Thiếu SUPABASE_DB_URL");
    const c = await openCloud(url);
    for (const t of TABLES) {
      const r = await c.query(`DELETE FROM "${t}"`);
      console.log(`  ${t}: xoá ${r.rowCount}`);
    }
    await c.end();
    console.log("Đã dọn dữ liệu giao dịch trên Supabase (giữ users + vehicles).");
  } else {
    const path = process.env.LOCAL_DB_PATH || "prisma/dev.db";
    const db = openLocal(path);
    db.exec("PRAGMA foreign_keys = OFF;");
    for (const t of TABLES) {
      const before = db.prepare(`SELECT COUNT(*) c FROM "${t}"`).get().c;
      db.exec(`DELETE FROM "${t}"`);
      console.log(`  ${t}: xoá ${before}`);
    }
    db.close();
    console.log(`Đã dọn dữ liệu giao dịch trong ${path} (giữ users + vehicles).`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
