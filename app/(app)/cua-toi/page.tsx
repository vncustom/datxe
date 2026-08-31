import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { STATUS } from "@/lib/status";
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
} as const;

const DONE = [STATUS.HOAN_THANH, STATUS.HUY, STATUS.BAN_TU_CHOI, STATUS.DOI_XE_TU_CHOI];

export default async function CuaToiPage() {
  const s = await requireSession();

  const rows = await prisma.booking.findMany({
    where: { deletedAt: null, requesterUsername: s.username },
    select: selectCard,
    orderBy: { startTime: "desc" },
    take: 100,
  });

  const active = rows.filter((b) => !DONE.includes(b.status as (typeof DONE)[number]));
  const done = rows.filter((b) => DONE.includes(b.status as (typeof DONE)[number]));

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Đơn của tôi</h1>
        <Link
          href="/don/moi"
          className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Đặt xe
        </Link>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">
          Đang xử lý ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted">Chưa có đơn nào đang xử lý.</p>
        ) : (
          active.map((b) => <BookingCard key={b.id} b={b} />)
        )}
      </section>

      {done.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Đã kết thúc</h2>
          {done.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
