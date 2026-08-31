// Nguyên thuỷ đọc/ghi cho Sync Engine. Không dùng Prisma (2 provider khác nhau)
// mà dùng node:sqlite (built-in) + pg.
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

// Prisma lưu DateTime của Postgres ở kiểu `timestamp` (không timezone) theo giờ UTC.
// pg mặc định parse theo giờ local -> ép hiểu là UTC.
pg.types.setTypeParser(1114, (v) => new Date(v.replace(" ", "T") + "Z"));
pg.types.setTypeParser(1184, (v) => new Date(v));
// numeric/int8 -> Number (id là uuid text nên không ảnh hưởng)
pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v)));

export function openLocal(path) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 4000;");
  return db;
}

export async function openCloud(url) {
  const client = new pg.Client({
    connectionString: url,
    // Supabase pooler cần SSL, nhưng chứng chỉ là của pooler -> tắt verify.
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30000,
  });
  await client.connect();
  return client;
}

/** [{name, type}] — type in HOA: DATETIME | BOOLEAN | INTEGER | REAL | TEXT */
export function tableColumns(local, table) {
  return local
    .prepare(`PRAGMA table_info("${table}")`)
    .all()
    .map((c) => ({ name: c.name, type: String(c.type || "TEXT").toUpperCase() }));
}

// ---------- chuẩn hoá giá trị ----------

export function toMs(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  const n = Date.parse(v);
  return Number.isNaN(n) ? null : n;
}

/** so sánh mốc thời gian: về epoch ms, null -> -1 */
export const tsOf = (v) => {
  const m = toMs(v);
  return m == null ? -1 : m;
};

function toSqlite(v, type) {
  if (v == null) return null;
  if (type === "DATETIME") return toMs(v);
  if (type === "BOOLEAN") return v ? 1 : 0;
  if (type === "INTEGER") return typeof v === "bigint" ? Number(v) : v;
  return v;
}

function toPg(v, type) {
  if (v == null) return null;
  if (type === "DATETIME") return new Date(toMs(v));
  if (type === "BOOLEAN") return !!v;
  if (type === "INTEGER") return typeof v === "bigint" ? Number(v) : Number(v);
  return v;
}

// ---------- đọc ----------

export function localRowsSince(local, table, col, wmMs, limit) {
  return local
    .prepare(
      `SELECT * FROM "${table}" WHERE "${col}" > ? ORDER BY "${col}" ASC LIMIT ?`,
    )
    .all(wmMs, limit);
}

export async function cloudRowsSince(cloud, table, col, wmMs, limit) {
  const r = await cloud.query(
    `SELECT * FROM "${table}" WHERE "${col}" > $1 ORDER BY "${col}" ASC LIMIT $2`,
    [new Date(wmMs), limit],
  );
  return r.rows;
}

export function localRow(local, table, id) {
  return local.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(id) ?? null;
}

export async function cloudRow(cloud, table, id) {
  const r = await cloud.query(`SELECT * FROM "${table}" WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

// ---------- ghi (upsert theo id) ----------

export function upsertLocal(local, table, cols, row) {
  const names = cols.map((c) => `"${c.name}"`).join(",");
  const ph = cols.map(() => "?").join(",");
  const set = cols
    .filter((c) => c.name !== "id")
    .map((c) => `"${c.name}"=excluded."${c.name}"`)
    .join(",");
  const sql = `INSERT INTO "${table}" (${names}) VALUES (${ph}) ON CONFLICT(id) DO UPDATE SET ${set}`;
  local.prepare(sql).run(...cols.map((c) => toSqlite(row[c.name], c.type)));
}

export async function upsertCloud(cloud, table, cols, row) {
  const names = cols.map((c) => `"${c.name}"`).join(",");
  const ph = cols.map((_, i) => `$${i + 1}`).join(",");
  const set = cols
    .filter((c) => c.name !== "id")
    .map((c) => `"${c.name}"=EXCLUDED."${c.name}"`)
    .join(",");
  const sql = `INSERT INTO "${table}" (${names}) VALUES (${ph}) ON CONFLICT (id) DO UPDATE SET ${set}`;
  await cloud.query(
    sql,
    cols.map((c) => toPg(row[c.name], c.type)),
  );
}

// ---------- watermark (sync_state, chỉ ở local) ----------

export function makeState(local) {
  const sel = local.prepare(
    `SELECT watermark FROM sync_state WHERE "tableName" = ? AND direction = ?`,
  );
  const ins = local.prepare(
    `INSERT INTO sync_state (id, "tableName", direction, watermark, "updatedAt")
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT("tableName", direction)
     DO UPDATE SET watermark = excluded.watermark, "updatedAt" = excluded."updatedAt"`,
  );
  return {
    get(table, dir) {
      const r = sel.get(table, dir);
      return r && r.watermark != null ? Number(r.watermark) : 0;
    },
    set(table, dir, ms) {
      ins.run(crypto.randomUUID(), table, dir, ms, Date.now());
    },
  };
}
