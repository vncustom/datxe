import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isDoiXe } from "@/lib/rbac";
import { STATUS } from "@/lib/status";
import { getOpenTrips } from "@/lib/bookings";
import { fmtDateTime } from "@/lib/tz";
import { BookingCard } from "@/app/(app)/_components/BookingCard";

const selectCard = {
  id: true,
  code: true,
  status: true,
  donViYeuCau: true,
  diemXuatPhat: true,
  diemDen: true,
  startTime: true,
  endTime: true,
  noiDung: true,
  isPhatSinh: true,
  requester: { select: { fullName: true } },
} as const;

export default async function DieuXePage() {
  const s = await requireSession();
  if (!isDoiXe(s)) {
    return (
      <p className="text-sm text-muted">
        Trang này dành cho Tổ trưởng / Tổ phó Đội xe.
      </p>
    );
  }

  const now = new Date();
  const [openTrips, pending, dispatched] = await Promise.all([
    getOpenTrips(),
    prisma.booking.findMany({
      where: { deletedAt: null, status: STATUS.CHO_DOI_XE },
      select: selectCard,
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: STATUS.DA_DIEU_XE,
        startTime: { gte: new Date(now.getTime() - 12 * 3600_000) },
      },
      select: {
        ...selectCard,
        dispatch: {
          select: {
            vehicle: { select: { plateNo: true } },
            driver: { select: { fullName: true } },
          },
        },
      },
      orderBy: { startTime: "asc" },
      take: 30,
    }),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold">Điều xe</h1>

      {/* Xe đang chạy chưa đóng chuyến */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">
          Đang chạy — chưa đóng chuyến ({openTrips.length})
        </h2>
        {openTrips.length === 0 ? (
          <p className="text-sm text-muted">
            Không có xe nào đang chạy dở.
          </p>
        ) : (
          openTrips.map((t) => (
            <Link
              key={t.id}
              href={`/don/${t.id}`}
              className={`block rounded-lg border p-3 text-sm ${
                t.overdue
                  ? "border-red-300 bg-red-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <p className="font-semibold">
                {t.plateNo} · {t.vehicleName} — {t.driverName}
                {t.overdue ? (
                  <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    QUÁ GIỜ
                  </span>
                ) : null}
              </p>
              <p className={t.overdue ? "text-red-700" : "text-blue-800"}>
                {t.code} · {t.route} · xuất bến {fmtDateTime(t.since)} · đã chạy{" "}
                {t.hours.toFixed(1)} giờ · chưa nhập km về / đóng chuyến
              </p>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">
          Chờ điều xe ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Không có đơn nào chờ điều xe.</p>
        ) : (
          pending.map((b) => <BookingCard key={b.id} b={b} />)
        )}
      </section>

      {dispatched.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">
            Đã điều xe — sắp tới
          </h2>
          {dispatched.map((b) => (
            <BookingCard
              key={b.id}
              b={b}
              extra={
                <p className="mt-1 text-xs font-medium text-accent">
                  {b.dispatch?.vehicle.plateNo} · {b.dispatch?.driver.fullName}
                </p>
              }
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
