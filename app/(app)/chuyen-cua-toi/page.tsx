import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { STATUS } from "@/lib/status";
import { fmtDateTime, toDatetimeLocal } from "@/lib/tz";
import { StatusChip } from "@/app/(app)/_components/StatusChip";
import { StartTripForm, EndTripForm } from "@/app/(app)/_components/TripActions";

export default async function ChuyenCuaToiPage() {
  const s = await requireSession();
  if (!s.isDriver) {
    return <p className="text-sm text-muted">Trang này dành cho lái xe.</p>;
  }

  const trips = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: { in: [STATUS.DA_DIEU_XE, STATUS.DANG_CHAY, STATUS.HOAN_THANH] },
      dispatch: { is: { driverUsername: s.username, deletedAt: null } },
    },
    include: { dispatch: { include: { vehicle: true } }, tripLog: true },
    orderBy: { startTime: "asc" },
  });

  const nowLocal = toDatetimeLocal(new Date());
  const upcoming = trips.filter((t) => t.status !== STATUS.HOAN_THANH);
  const doneTrips = trips.filter((t) => t.status === STATUS.HOAN_THANH);
  const openCount = upcoming.filter((t) => t.status === STATUS.DANG_CHAY).length;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold">Chuyến của tôi</h1>

      {openCount > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">
            Bạn có {openCount} chuyến đang chạy chưa đóng.
          </p>
          <p>
            Khi xong nhiệm vụ, nhập <b>số km lúc về</b> và <b>giờ kết thúc</b> rồi
            bấm “Kết thúc &amp; đóng chuyến” để hoàn tất.
          </p>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">
          Sắp tới / đang chạy ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Chưa được phân chuyến nào.</p>
        ) : (
          upcoming.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg border p-4 ${
                t.status === STATUS.DANG_CHAY
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-line bg-surface"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/don/${t.id}`}
                  className="font-mono text-sm font-semibold hover:text-accent"
                >
                  {t.code}
                </Link>
                <StatusChip status={t.status} />
              </div>
              <p className="mt-1 text-sm font-medium">
                {t.diemXuatPhat} → {t.diemDen}
              </p>
              <p className="text-xs text-muted">
                {fmtDateTime(t.startTime)} · {t.dispatch?.vehicle.name} (
                {t.dispatch?.vehicle.plateNo}) · {t.noiDung}
              </p>
              {t.dispatch?.ghiChuDoiXe ? (
                <p className="mt-0.5 text-xs text-amber-800">
                  Ghi chú Đội xe: {t.dispatch.ghiChuDoiXe}
                </p>
              ) : null}

              <div className="mt-3 border-t border-line pt-3">
                {t.status === STATUS.DA_DIEU_XE ? (
                  <StartTripForm
                    bookingId={t.id}
                    expectedOdo={t.dispatch?.vehicle.currentOdometer ?? 0}
                    defaultGio={toDatetimeLocal(t.startTime)}
                  />
                ) : (
                  <EndTripForm
                    bookingId={t.id}
                    odoStart={t.tripLog?.odoStart ?? 0}
                    defaultGio={nowLocal}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {doneTrips.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Đã hoàn thành</h2>
          {doneTrips.map((t) => (
            <Link
              key={t.id}
              href={`/don/${t.id}`}
              className="block rounded-lg border border-line bg-surface p-3 hover:border-accent/50"
            >
              <span className="font-mono text-sm font-semibold">{t.code}</span>{" "}
              <span className="text-sm">
                {t.diemXuatPhat} → {t.diemDen}
              </span>
              <p className="text-xs text-muted">
                {fmtDateTime(t.startTime)} · {t.dispatch?.vehicle.plateNo}
                {t.tripLog?.soKm != null
                  ? ` · ${t.tripLog.soKm.toLocaleString("vi-VN")} km`
                  : ""}
              </p>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
