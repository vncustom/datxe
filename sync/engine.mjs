// Lõi Sync Engine — thuần logic, không mở kết nối.
// `ctx` = { local (node:sqlite), cloud ({query,end}), cols, state, logConflict }
import { SYNC_TABLES } from "./manifest.mjs";
import * as L from "./lib.mjs";

const iso = () => new Date().toISOString().replace("T", " ").slice(0, 19);

/** Đồng bộ 1 bảng cả 2 chiều. Trả về {pushed, pulled, conflicts}. */
export async function syncTable(ctx, tbl, batch = 500) {
  const { local, cloud, cols, state, logConflict } = ctx;
  const c = cols[tbl.name];
  const col = tbl.changedAt;
  let pushed = 0,
    pulled = 0,
    conflicts = 0;

  const pullWmStart = state.get(tbl.name, "pull");
  const pushWmStart = state.get(tbl.name, "push");

  // ---------- PULL: cloud -> local ----------
  let cursor = pullWmStart;
  for (;;) {
    const rows = await L.cloudRowsSince(cloud, tbl.name, col, cursor, batch);
    if (rows.length === 0) break;
    let maxOk = cursor;
    for (const remote of rows) {
      const cTs = L.tsOf(remote[col]);
      const localCur = L.localRow(local, tbl.name, remote.id);
      const lTs = localCur ? L.tsOf(localCur[col]) : -1;

      if (!localCur || cTs > lTs) {
        // Chỉ tính xung đột khi ĐÃ có mốc đồng bộ trước đó (pushWmStart > 0):
        // lần đồng bộ đầu tiên chỉ hội tụ dữ liệu, không coi là xung đột.
        if (
          localCur &&
          !tbl.appendOnly &&
          pushWmStart > 0 &&
          lTs > pushWmStart &&
          lTs > 0
        ) {
          logConflict(tbl.name, remote.id, lTs, cTs, "remote", localCur);
          conflicts++;
        }
        L.upsertLocal(local, tbl.name, c, remote);
        pulled++;
      }
      maxOk = Math.max(maxOk, cTs);
    }
    cursor = maxOk;
    state.set(tbl.name, "pull", cursor);
    if (rows.length < batch) break;
  }

  // ---------- PUSH: local -> cloud ----------
  cursor = pushWmStart;
  for (;;) {
    const rows = L.localRowsSince(local, tbl.name, col, cursor, batch);
    if (rows.length === 0) break;
    let maxOk = cursor;
    for (const localRow of rows) {
      const lTs = L.tsOf(localRow[col]);
      const remoteCur = await L.cloudRow(cloud, tbl.name, localRow.id);
      const rTs = remoteCur ? L.tsOf(remoteCur[col]) : -1;

      if (!remoteCur || lTs > rTs) {
        if (
          remoteCur &&
          !tbl.appendOnly &&
          pullWmStart > 0 &&
          rTs > pullWmStart &&
          rTs > 0
        ) {
          logConflict(tbl.name, localRow.id, lTs, rTs, "local", remoteCur);
          conflicts++;
        }
        await L.upsertCloud(cloud, tbl.name, c, localRow);
        pushed++;
      }
      maxOk = Math.max(maxOk, lTs);
    }
    cursor = maxOk;
    state.set(tbl.name, "push", cursor);
    if (rows.length < batch) break;
  }

  return { pushed, pulled, conflicts };
}

export function makeConflictLogger(ctx) {
  return (tableName, rowId, localTs, remoteTs, winner, losingRow) => {
    const rec = {
      id: crypto.randomUUID(),
      tableName,
      rowId,
      localUpdatedAt: localTs > 0 ? localTs : null,
      remoteUpdatedAt: remoteTs > 0 ? remoteTs : null,
      winner,
      losingPayload: JSON.stringify(losingRow, (_k, v) =>
        typeof v === "bigint" ? Number(v) : v,
      ),
      resolvedAt: Date.now(),
    };
    const cols = ctx.cols.sync_conflict_log;
    L.upsertLocal(ctx.local, "sync_conflict_log", cols, rec);
    Promise.resolve(
      L.upsertCloud(ctx.cloud, "sync_conflict_log", cols, rec),
    ).catch(() => {});
    console.warn(iso(), `xung đột ${tableName}/${rowId} -> ${winner} thắng`);
  };
}

export async function writeRun(ctx, r) {
  const cols = ctx.cols.sync_run;
  const rec = {
    id: r.id,
    startedAt: r.startedAt ?? Date.now(),
    finishedAt: r.finishedAt ?? null,
    direction: r.direction ?? "full",
    tableName: r.tableName ?? null,
    rowsPushed: r.rowsPushed ?? 0,
    rowsPulled: r.rowsPulled ?? 0,
    conflicts: r.conflicts ?? 0,
    error: r.error ?? null,
  };
  L.upsertLocal(ctx.local, "sync_run", cols, rec);
  try {
    if (ctx.cloud) await L.upsertCloud(ctx.cloud, "sync_run", cols, rec);
  } catch {
    /* cloud tạm thời không ghi nhật ký được — bỏ qua */
  }
}

/** Một vòng đồng bộ đầy đủ. */
export async function runCycle(ctx, batch = 500) {
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  await writeRun(ctx, { id: runId, startedAt, direction: "full" });

  let pushed = 0,
    pulled = 0,
    conflicts = 0;
  const errs = [];
  for (const tbl of SYNC_TABLES) {
    try {
      const r = await syncTable(ctx, tbl, batch);
      pushed += r.pushed;
      pulled += r.pulled;
      conflicts += r.conflicts;
    } catch (e) {
      errs.push(`${tbl.name}: ${e.message || e}`);
      console.error(iso(), "LỖI bảng", tbl.name, e.message || e);
    }
  }

  await writeRun(ctx, {
    id: runId,
    startedAt,
    finishedAt: Date.now(),
    direction: "full",
    rowsPushed: pushed,
    rowsPulled: pulled,
    conflicts,
    error: errs.join(" | ") || null,
  });

  return { runId, pushed, pulled, conflicts, errs };
}
