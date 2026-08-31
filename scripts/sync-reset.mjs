// Xoá watermark đồng bộ (bảng sync_state) trên SQLite local.
// Vòng sync kế tiếp sẽ quét lại toàn bộ theo updatedAt và hội tụ 2 bên.
//   node scripts/sync-reset.mjs
import { DatabaseSync } from "node:sqlite";

const path = process.env.LOCAL_DB_PATH || "prisma/dev.db";
const db = new DatabaseSync(path);
const n = db.prepare("SELECT COUNT(*) c FROM sync_state").get().c;
db.exec("DELETE FROM sync_state");
db.close();
console.log(`Đã xoá ${n} mốc đồng bộ trong ${path}. Chạy: npm run sync:once`);
