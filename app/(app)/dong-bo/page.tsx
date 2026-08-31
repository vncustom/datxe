import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isDoiXe, isAdmin } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/tz";
import { getSyncStatus, agoText } from "@/lib/sync-status";

const ORIGIN = process.env.ORIGIN_NODE === "cloud" ? "cloud" : "local";

export default async function DongBoPage() {
  const s = await requireSession();
  if (!(isDoiXe(s) || isAdmin(s))) {
    return (
      <p className="text-sm text-muted">
        Trang này dành cho Đội xe và Quản trị.
      </p>
    );
  }

  const { runs, conflicts, states, lastDone, lastError, healthy } =
    await getSyncStatus();

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">Đồng bộ dữ liệu</h1>
        <p className="text-sm text-muted">
          Bản này: <b>{ORIGIN === "cloud" ? "Cloud (Supabase)" : "Nội bộ (SQLite)"}</b>.
          Daemon đồng bộ 2 chiều chạy trên máy nội bộ (Last-Write-Wins).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Trạng thái"
          value={healthy ? "Bình thường" : "Cần kiểm tra"}
          tone={healthy ? "ok" : "warn"}
        />
        <Stat label="Đồng bộ lần cuối" value={agoText(lastDone?.finishedAt)} />
        <Stat
          label="Xung đột (đã ghi)"
          value={String(conflicts.length)}
          tone={conflicts.length ? "warn" : undefined}
        />
      </div>

      {lastError?.error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Lỗi gần nhất ({fmtDateTime(lastError.startedAt)}): {lastError.error}
        </div>
      ) : null}

      {runs.length === 0 ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Chưa có lần đồng bộ nào. Trên máy nội bộ chạy <code>npm run sync</code>{" "}
          (cần <code>SUPABASE_DB_URL</code>).
        </p>
      ) : null}

      {/* Watermark theo bảng (chỉ có trên máy nội bộ) */}
      {states.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Mốc đồng bộ theo bảng</h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-muted">
                  <th className="px-3 py-2">Bảng</th>
                  <th className="px-3 py-2">Hướng</th>
                  <th className="px-3 py-2">Đã xử lý tới</th>
                </tr>
              </thead>
              <tbody>
                {states.map((st) => (
                  <tr key={st.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{st.tableName}</td>
                    <td className="px-3 py-2">{st.direction === "pull" ? "kéo về" : "đẩy lên"}</td>
                    <td className="px-3 py-2">
                      {st.watermark ? fmtDateTime(st.watermark) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Lần chạy gần đây */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">
          Lần chạy gần đây ({runs.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Bắt đầu</th>
                <th className="px-3 py-2 text-right">Đẩy</th>
                <th className="px-3 py-2 text-right">Kéo</th>
                <th className="px-3 py-2 text-right">Xung đột</th>
                <th className="px-3 py-2">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fmtDateTime(r.startedAt)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.rowsPushed}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.rowsPulled}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.conflicts}</td>
                  <td className="px-3 py-2">
                    {r.error ? (
                      <span className="text-red-700">{r.error}</span>
                    ) : r.finishedAt ? (
                      <span className="text-emerald-700">xong</span>
                    ) : (
                      <span className="text-muted">đang chạy…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Xung đột */}
      {conflicts.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">
            Xung đột đã giải quyết ({conflicts.length})
          </h2>
          <div className="flex flex-col gap-2">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                <p className="font-medium text-amber-900">
                  <span className="font-mono text-xs">{c.tableName}</span> ·{" "}
                  {c.winner === "local" ? "bản nội bộ" : "bản cloud"} thắng ·{" "}
                  {fmtDateTime(c.resolvedAt)}
                </p>
                <p className="text-amber-800">
                  {c.tableName === "bookings" ? (
                    <Link href={`/don/${c.rowId}`} className="underline">
                      {c.rowId}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs">{c.rowId}</span>
                  )}
                  {" — bản thua đã lưu để đối chiếu."}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
