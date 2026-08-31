// Sync Engine daemon — đồng bộ 2 chiều SQLite (local) <-> PostgreSQL/Supabase.
// Chạy trên MÁY LOCAL. Last-Write-Wins theo `updatedAt`/`atTime`. Xoá = tombstone.
//
//   node sync/daemon.mjs           # chạy liên tục
//   node sync/daemon.mjs --once    # 1 vòng rồi thoát
//
// Biến môi trường:
//   SUPABASE_DB_URL          bắt buộc — chuỗi Session pooler (cổng 5432)
//   LOCAL_DB_PATH            mặc định prisma/dev.db
//   SYNC_INTERVAL_SECONDS    mặc định 20
//   SYNC_BATCH               mặc định 500
process.env.TZ = "UTC";

import { setTimeout as sleep } from "node:timers/promises";
import { existsSync, readFileSync } from "node:fs";
import { SYNC_TABLES, LOG_TABLES } from "./manifest.mjs";
import * as L from "./lib.mjs";
import { runCycle, makeConflictLogger } from "./engine.mjs";

// Nạp biến môi trường từ .env rồi .env.sync (không ghi đè biến đã có).
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const k = m[1];
    const v = m[2].replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(".env");
loadEnv(".env.sync");

const CLOUD_URL = process.env.SUPABASE_DB_URL;
const LOCAL_DB = process.env.LOCAL_DB_PATH || "prisma/dev.db";
const INTERVAL = Number(process.env.SYNC_INTERVAL_SECONDS || 20) * 1000;
const BATCH = Number(process.env.SYNC_BATCH || 500);
const ONCE = process.argv.includes("--once");

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

if (!CLOUD_URL) {
  console.error("Thiếu SUPABASE_DB_URL (chuỗi Session pooler cổng 5432).");
  process.exit(1);
}

async function main() {
  const local = L.openLocal(LOCAL_DB);
  const state = L.makeState(local);
  const cols = {};
  for (const t of [...SYNC_TABLES.map((x) => x.name), ...LOG_TABLES]) {
    cols[t] = L.tableColumns(local, t);
  }

  console.log(
    now(),
    `Sync daemon: ${LOCAL_DB} <-> Supabase · mỗi ${INTERVAL / 1000}s`,
  );

  let stopping = false;
  process.on("SIGINT", () => (stopping = true));
  process.on("SIGTERM", () => (stopping = true));

  for (;;) {
    let cloud;
    try {
      cloud = await L.openCloud(CLOUD_URL);
      const ctx = { local, cloud, cols, state };
      ctx.logConflict = makeConflictLogger(ctx);
      const r = await runCycle(ctx, BATCH);
      console.log(
        now(),
        `đẩy=${r.pushed} kéo=${r.pulled} xung_đột=${r.conflicts}` +
          (r.errs.length ? ` LỖI(${r.errs.length}): ${r.errs.join(" | ")}` : ""),
      );
    } catch (e) {
      console.error(now(), "Không kết nối được cloud:", e.message || e);
      try {
        L.upsertLocal(local, "sync_run", cols.sync_run, {
          id: crypto.randomUUID(),
          startedAt: Date.now(),
          finishedAt: Date.now(),
          direction: "full",
          tableName: null,
          rowsPushed: 0,
          rowsPulled: 0,
          conflicts: 0,
          error: "cloud unreachable: " + (e.message || e),
        });
      } catch {
        /* ignore */
      }
    } finally {
      if (cloud) await cloud.end().catch(() => {});
    }
    if (ONCE || stopping) break;
    await sleep(INTERVAL);
  }
  local.close();
  console.log(now(), "Sync daemon dừng.");
}

main().catch((e) => {
  console.error("Sync daemon lỗi:", e);
  process.exit(1);
});
