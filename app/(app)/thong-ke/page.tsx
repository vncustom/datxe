import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isDoiXe, isAdmin } from "@/lib/rbac";
import { fmtDate, fmtDateTime, todayKey, addDaysKey, vnParts } from "@/lib/tz";
import {
  parseRange,
  getDriverStats,
  getVehicleStats,
  getVehicleTimelines,
} from "@/lib/stats";
import { GAP_TOLERANCE_KM } from "@/lib/odometer";
import { PrintButton } from "./_components/PrintButton";

const n = (x: number) => x.toLocaleString("vi-VN");

export default async function ThongKePage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const s = await requireSession();
  if (!(isDoiXe(s) || s.role === "ban_tgd" || isAdmin(s))) {
    return (
      <p className="text-sm text-muted">
        Trang này dành cho Đội xe, Ban TGĐ và Quản trị.
      </p>
    );
  }

  const spRaw = await searchParams;
  const sp: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(spRaw))
    sp[k] = Array.isArray(v) ? v[0] : v;
  const range = parseRange(sp);
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][],
  ).toString();

  const [drivers, vehicles, timelines] = await Promise.all([
    getDriverStats(range),
    getVehicleStats(range),
    getVehicleTimelines(range),
  ]);

  const today = todayKey();
  const p = vnParts(new Date());
  const thisMonth = `${p.year}-${String(p.month).padStart(2, "0")}`;
  const prevMonth =
    p.month === 1
      ? `${p.year - 1}-12`
      : `${p.year}-${String(p.month - 1).padStart(2, "0")}`;

  const presets = [
    { label: "Tháng này", href: `/thong-ke?thang=${thisMonth}` },
    { label: "Tháng trước", href: `/thong-ke?thang=${prevMonth}` },
    { label: "7 ngày qua", href: `/thong-ke?tu=${addDaysKey(today, -6)}&den=${today}` },
    { label: "Hôm nay", href: `/thong-ke?ngay=${today}` },
  ];

  const totalKm = drivers.reduce((a, d) => a + d.km, 0);
  const totalTrips = drivers.reduce((a, d) => a + d.trips, 0);
  const totalUnaccounted = vehicles.reduce((a, v) => a + v.unaccountedKm, 0);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Thống kê — {range.label}</h1>
        <div className="no-print ml-auto flex flex-wrap items-center gap-2">
          <PrintButton />
          <a
            href={`/thong-ke/export?bang=lai-xe&${qs}`}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
          >
            CSV lái xe
          </a>
          <a
            href={`/thong-ke/export?bang=xe&${qs}`}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
          >
            CSV xe
          </a>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        {presets.map((pr) => (
          <Link
            key={pr.label}
            href={pr.href}
            className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs hover:bg-surface-2"
          >
            {pr.label}
          </Link>
        ))}
        <form className="flex items-center gap-1 text-xs">
          <input
            type="date"
            name="tu"
            defaultValue={sp.tu}
            className="rounded border border-line px-1.5 py-1"
          />
          <span>–</span>
          <input
            type="date"
            name="den"
            defaultValue={sp.den}
            className="rounded border border-line px-1.5 py-1"
          />
          <button className="rounded border border-line px-2 py-1 hover:bg-surface-2">
            Xem
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tổng chuyến hoàn thành" value={n(totalTrips)} />
        <Stat label="Tổng km" value={n(totalKm)} />
        <Stat label="Số xe hoạt động" value={n(vehicles.filter((v) => v.trips > 0).length)} />
        <Stat
          label="Km chưa giải trình"
          value={n(totalUnaccounted)}
          danger={totalUnaccounted > 0}
        />
      </div>

      {/* Theo lái xe */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Theo lái xe</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Lái xe</th>
                <th className="px-3 py-2 text-right">Chuyến</th>
                <th className="px-3 py-2 text-right">Phát sinh</th>
                <th className="px-3 py-2 text-right">Tổng km</th>
                <th className="px-3 py-2 text-right">Giờ chạy</th>
                <th className="px-3 py-2 text-right">Km chưa giải trình</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.username} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/thong-ke/lai-xe/${d.username}?${qs}`}
                      className="font-medium hover:text-accent"
                    >
                      {d.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{n(d.trips)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {d.phatSinh ? n(d.phatSinh) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{n(d.km)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {d.hours.toFixed(1)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      d.unaccountedKm > 0 ? "font-semibold text-red-600" : ""
                    }`}
                  >
                    {d.unaccountedKm > 0 ? n(d.unaccountedKm) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Theo xe */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Theo xe</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Xe</th>
                <th className="px-3 py-2 text-right">Chuyến</th>
                <th className="px-3 py-2 text-right">Km theo chuyến</th>
                <th className="px-3 py-2 text-right">Km theo công-tơ-mét</th>
                <th className="px-3 py-2 text-right">Chưa giải trình</th>
                <th className="px-3 py-2 text-right">Số km hiện tại</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted">{v.plateNo}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{n(v.trips)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {n(v.kmByTrips)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {n(v.odoDelta)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      v.unaccountedKm > 0 ? "font-semibold text-red-600" : ""
                    }`}
                  >
                    {v.unaccountedKm > 0 ? n(v.unaccountedKm) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {n(v.currentOdometer)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dòng thời gian công-tơ-mét */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">
          Dòng thời gian công-tơ-mét
        </h2>
        {timelines.map((tl) => (
          <div
            key={tl.id}
            className="rounded-lg border border-line bg-surface p-3"
          >
            <p className="text-sm font-medium">
              {tl.name} · {tl.plateNo}
            </p>
            {tl.trips.length === 0 ? (
              <p className="mt-1 text-xs text-muted">
                Không có chuyến trong kỳ.
              </p>
            ) : (
              <ol className="mt-2 flex flex-col gap-1 text-xs">
                {tl.trips.map((t) => {
                  const bad = t.gap != null && (t.gap > GAP_TOLERANCE_KM || t.gap < 0);
                  return (
                    <li
                      key={t.bookingId}
                      className={bad ? "text-red-600" : "text-foreground"}
                    >
                      {fmtDateTime(t.at)} · {t.code} · {t.driverName} ·{" "}
                      <span className="tabular-nums">
                        {n(t.odoStart)} → {n(t.odoEnd)}
                      </span>{" "}
                      ({n(t.soKm)} km)
                      {bad ? (
                        <span className="font-semibold">
                          {" "}
                          — lệch {n(t.gap as number)} km so với chuyến trước (
                          {n(t.prevOdoEnd as number)})
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        ))}
      </section>

      <p className="text-xs text-muted">
        Thống kê tính trên các chuyến đã đóng, theo giờ xuất bến (múi giờ Việt
        Nam). Xuất lúc {fmtDate(new Date())}.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div
        className={`text-2xl font-semibold tabular-nums ${
          danger ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
