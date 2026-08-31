import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isBanLeader } from "@/lib/rbac";
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
  requester: { select: { fullName: true } },
} as const;

export default async function DuyetPage() {
  const s = await requireSession();

  if (!isBanLeader(s) || !s.dsBan) {
    return (
      <p className="text-sm text-muted">
        Trang này dành cho Trưởng ban / Phó ban.
      </p>
    );
  }

  const [pending, recent] = await Promise.all([
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: STATUS.CHO_BAN_DUYET,
        donViYeuCau: s.dsBan,
      },
      select: selectCard,
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        donViYeuCau: s.dsBan,
        status: { not: STATUS.CHO_BAN_DUYET },
        approval: { is: { approverUsername: s.username } },
      },
      select: selectCard,
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold">
        Duyệt đơn — Ban {s.dsBan}
      </h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">
          Chờ duyệt ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Không có đơn nào chờ duyệt.</p>
        ) : (
          pending.map((b) => <BookingCard key={b.id} b={b} />)
        )}
      </section>

      {recent.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Đã xử lý gần đây</h2>
          {recent.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
