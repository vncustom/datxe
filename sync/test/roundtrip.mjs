// Kiểm thử tích hợp Sync Engine: SQLite (node:sqlite) <-> Postgres (pglite, in-process).
// Không cần Supabase. Chạy: node sync/test/roundtrip.mjs
process.env.TZ = "UTC";

import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PGlite } from "@electric-sql/pglite";
import * as L from "../lib.mjs";
import { runCycle, makeConflictLogger } from "../engine.mjs";
import { SYNC_TABLES, LOG_TABLES } from "../manifest.mjs";

// id cố định cho fixture (thực tế lib/uuid.ts sinh id tất định theo username/biển số)
const UID = "11111111-1111-5111-8111-111111111111";
const VID = "22222222-2222-5222-8222-222222222222";
const A = "aaaaaaaa-0000-5000-8000-00000000000a";
const B = "bbbbbbbb-0000-5000-8000-00000000000b";

const HERE = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sqlitePath = join(tmpdir(), `datxe-sync-test-${Date.now()}.db`);

let pass = 0;
const ok = (name) => {
  pass++;
  console.log("  ✓", name);
};

async function main() {
  // ---- dựng 2 CSDL trống ----
  const local = new DatabaseSync(sqlitePath);
  local.exec("PRAGMA foreign_keys = ON;");
  local.exec(readFileSync(join(HERE, "schema.sqlite.sql"), "utf8"));

  const pg = new PGlite();
  await pg.exec(readFileSync(join(HERE, "schema.pg.sql"), "utf8"));
  const cloud = {
    query: (sql, params) => pg.query(sql, params),
    end: () => pg.close(),
  };

  const cols = {};
  for (const t of [...SYNC_TABLES.map((x) => x.name), ...LOG_TABLES]) {
    cols[t] = L.tableColumns(local, t);
  }
  const state = L.makeState(local);
  const ctx = { local, cloud, cols, state };
  ctx.logConflict = makeConflictLogger(ctx);

  // ---- seed giống nhau 2 bên (id trùng) ----
  const T = Date.now() - 600_000;
  const uid = UID;
  const vid = VID;
  const seedUser = [
    uid, "laixe1", "Lái Xe 1", null, null, null, "nhan_vien", "Lái xe",
    null, null, "hash", 1, 1, T, T, "seed", "local", null,
  ];
  const seedVeh = [vid, "Toyota Zace", "50A-030.36", 7, 0, null, 1, T, T, "seed", "local", null];

  local.prepare(
    `INSERT INTO users (id,username,fullName,dsBan,dsPhong,dsTo,role,jobTitle,email,phone,passwordHash,isDriver,isActive,createdAt,updatedAt,updatedBy,originNode,deletedAt)
     VALUES (${seedUser.map(() => "?").join(",")})`,
  ).run(...seedUser);
  local.prepare(
    `INSERT INTO vehicles (id,name,plateNo,seats,currentOdometer,note,isActive,createdAt,updatedAt,updatedBy,originNode,deletedAt)
     VALUES (${seedVeh.map(() => "?").join(",")})`,
  ).run(...seedVeh);

  await pg.query(
    `INSERT INTO users (id,username,"fullName","dsBan","dsPhong","dsTo",role,"jobTitle",email,phone,"passwordHash","isDriver","isActive","createdAt","updatedAt","updatedBy","originNode","deletedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [uid, "laixe1", "Lái Xe 1", null, null, null, "nhan_vien", "Lái xe", null, null, "hash", true, true, new Date(T), new Date(T), "seed", "local", null],
  );
  await pg.query(
    `INSERT INTO vehicles (id,name,"plateNo",seats,"currentOdometer",note,"isActive","createdAt","updatedAt","updatedBy","originNode","deletedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [vid, "Toyota Zace", "50A-030.36", 7, 0, null, true, new Date(T), new Date(T), "seed", "local", null],
  );

  const mkBooking = (id, code, ts, extra = {}) => ({
    id, code, requesterUsername: "laixe1", donViYeuCau: "VP",
    startTime: ts, endTime: null, diemXuatPhat: "HTV", diemDen: "A",
    noiDung: "x", bienTap: null, quayPhim: null, soNguoi: null,
    isPhatSinh: 0, status: "cho_ban_duyet",
    createdAt: ts, createdBy: "laixe1", updatedAt: ts, updatedBy: "laixe1",
    originNode: "local", deletedAt: null, ...extra,
  });
  const bCols = cols.bookings;

  // ================= A. Dòng mới ở cloud -> về local =================
  await L.upsertCloud(cloud, "bookings", bCols, mkBooking(A, "C-A", T + 1000, { originNode: "cloud", diemDen: "Sân bay" }));
  await runCycle(ctx);
  assert.equal(L.localRow(local, "bookings", A)?.diemDen, "Sân bay");
  ok("A: dòng tạo ở cloud xuất hiện ở local");

  // ================= B. Dòng mới ở local -> lên cloud =================
  L.upsertLocal(local, "bookings", bCols, mkBooking(B, "L-B", T + 2000, { diemDen: "Quận 7" }));
  await runCycle(ctx);
  assert.equal((await L.cloudRow(cloud, "bookings", B))?.diemDen, "Quận 7");
  ok("B: dòng tạo ở local xuất hiện ở cloud");

  // ================= C. Xung đột — cloud mới hơn thì cloud thắng =================
  L.upsertLocal(local, "bookings", bCols, mkBooking(B, "L-B", T + 3000, { diemDen: "Quận 7", noiDung: "sửa ở local" }));
  await L.upsertCloud(cloud, "bookings", bCols, mkBooking(B, "L-B", T + 4000, { diemDen: "Bến Thành", noiDung: "sửa ở cloud" }));
  const before = await runCycle(ctx);
  const lb = L.localRow(local, "bookings", B);
  assert.equal(lb.diemDen, "Bến Thành", "local phải lấy giá trị của cloud");
  assert.equal(L.tsOf(lb.updatedAt), T + 4000);
  const confs = local.prepare(`SELECT * FROM sync_conflict_log WHERE "rowId" = ?`).all(B);
  assert.equal(confs.length, 1, "phải ghi đúng 1 xung đột");
  assert.equal(confs[0].winner, "remote");
  assert.ok(before.conflicts >= 1);
  ok("C: xung đột 2 bên -> LWW cloud thắng + ghi sync_conflict_log");

  // ================= D. Tombstone lan truyền =================
  L.upsertLocal(local, "bookings", bCols, mkBooking(A, "C-A", T + 5000, { originNode: "cloud", diemDen: "Sân bay", deletedAt: T + 5000 }));
  await runCycle(ctx);
  const ca = await L.cloudRow(cloud, "bookings", A);
  assert.ok(ca.deletedAt != null, "cloud phải nhận tombstone");
  ok("D: xoá mềm (deletedAt) đồng bộ sang cloud");

  // ================= E. Chạy lại không có thay đổi -> 0 =================
  const idle = await runCycle(ctx);
  assert.equal(idle.pushed, 0);
  assert.equal(idle.pulled, 0);
  assert.equal(idle.conflicts, 0);
  ok("E: vòng đồng bộ không có thay đổi -> đẩy=0 kéo=0");

  // ================= F. Hội tụ: dữ liệu 2 bên khớp =================
  for (const id of [A, B]) {
    const l = L.localRow(local, "bookings", id);
    const c = await L.cloudRow(cloud, "bookings", id);
    assert.equal(l.diemDen, c.diemDen);
    assert.equal(L.tsOf(l.updatedAt), L.tsOf(c.updatedAt));
    assert.equal(l.deletedAt == null, c.deletedAt == null);
  }
  ok("F: local và cloud hội tụ (diemDen, updatedAt, tombstone khớp)");

  await pg.close();
  local.close();
  console.log(`\n${pass}/6 nhóm kiểm thử PASS`);
}

main()
  .catch((e) => {
    console.error("\nFAIL:", e);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      rmSync(sqlitePath, { force: true });
    } catch {}
  });
