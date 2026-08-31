import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isDoiXe, isAdmin } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/tz";
import { parseRange, getDriverTrips } from "@/lib/stats";
import { PrintButton } from "../../_components/PrintButton";

const n = (x: number) => x.toLocaleString("vi-VN");

export default async function DriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const s = await requireSession();
  if (!(isDoiXe(s) || s.role === "ban_tgd" || isAdmin(s))) {
    return <p className="text-sm text-muted">Không có quyền.</p>;
  }

  const { username } = await params;
  const spRaw = await searchParams;
  const sp: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(spRaw)) sp[k] = Array.isArray(v) ? v[0] : v;
  const range = parseRange(sp);
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][],
  ).toString();

  const { fullName, trips } = await getDriverTrips(username, range);
  const totalKm = trips.reduce((a, t) => a + t.soKm, 0);
  const totalHours = trips.reduce((a, t) => a + t.hours, 0);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/thong-ke?${qs}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Thống kê
        </Link>
        <h1 className="text-lg font-semibold">
          {fullName} — {range.label}
        </h1>
        <div className="no-print ml-auto">
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Box label="Số chuyến" value={n(trips.length)} />
        <Box label="Tổng km" value={n(totalKm)} />
        <Box label="Giờ chạy" value={totalHours.toFixed(1)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="px-3 py-2">Xuất bến</th>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Xe</th>
              <th className="px-3 py-2">Hành trình</th>
              <th className="px-3 py-2">Nội dung</th>
              <th className="px-3 py-2 text-right">Km</th>
              <th className="px-3 py-2 text-right">Giờ</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted">
                  Không có chuyến trong kỳ.
                </td>
              </tr>
            ) : (
              trips.map((t) => (
                <tr key={t.bookingId} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fmtDateTime(t.at)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/don/${t.bookingId}`}
                      className="font-mono text-xs hover:text-accent"
                    >
                      {t.code}
                    </Link>
                    {t.isPhatSinh ? (
                      <span className="ml-1 text-[10px] text-amber-700">PS</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{t.plateNo}</td>
                  <td className="px-3 py-2">{t.route}</td>
                  <td className="px-3 py-2">{t.noiDung}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{n(t.soKm)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.hours.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
