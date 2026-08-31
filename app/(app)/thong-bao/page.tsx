import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isBanLeader, isDoiXe } from "@/lib/rbac";
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

export default async function ThongBaoPage() {
  const s = await requireSession();

  const [duyet, dieuXe, laiXe, chuaDong, cuaToi] = await Promise.all([
    isBanLeader(s) && s.dsBan
      ? prisma.booking.findMany({
          where: {
            deletedAt: null,
            status: STATUS.CHO_BAN_DUYET,
            donViYeuCau: s.dsBan,
          },
          select: selectCard,
          orderBy: { startTime: "asc" },
        })
      : Promise.resolve([]),
    isDoiXe(s)
      ? prisma.booking.findMany({
          where: { deletedAt: null, status: STATUS.CHO_DOI_XE },
          select: selectCard,
          orderBy: { startTime: "asc" },
        })
      : Promise.resolve([]),
    s.isDriver
      ? prisma.booking.findMany({
          where: {
            deletedAt: null,
            status: STATUS.DA_DIEU_XE,
            dispatch: { is: { driverUsername: s.username, deletedAt: null } },
          },
          select: selectCard,
          orderBy: { startTime: "asc" },
        })
      : Promise.resolve([]),
    s.isDriver
      ? prisma.booking.findMany({
          where: {
            deletedAt: null,
            status: STATUS.DANG_CHAY,
            dispatch: { is: { driverUsername: s.username, deletedAt: null } },
          },
          select: selectCard,
          orderBy: { startTime: "asc" },
        })
      : Promise.resolve([]),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        requesterUsername: s.username,
        status: {
          in: [STATUS.BAN_TU_CHOI, STATUS.DOI_XE_TU_CHOI, STATUS.DA_DIEU_XE],
        },
      },
      select: selectCard,
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const sections: { title: string; hint: string; rows: typeof duyet }[] = [];
  if (s.isDriver && chuaDong.length > 0)
    sections.push({
      title: `Chuyến đang chạy chưa đóng (${chuaDong.length})`,
      hint: "Nhập số km lúc về và giờ kết thúc rồi đóng chuyến khi xong nhiệm vụ.",
      rows: chuaDong,
    });
  if (isBanLeader(s))
    sections.push({
      title: `Đơn chờ bạn duyệt (${duyet.length})`,
      hint: "Bạn là Trưởng/Phó ban của đơn vị này.",
      rows: duyet,
    });
  if (isDoiXe(s))
    sections.push({
      title: `Đơn chờ điều xe (${dieuXe.length})`,
      hint: "Ban đã duyệt, chờ Đội xe gán xe + lái xe.",
      rows: dieuXe,
    });
  if (s.isDriver)
    sections.push({
      title: `Chuyến được phân cho bạn (${laiXe.length})`,
      hint: "Đội xe đã điều xe cho bạn.",
      rows: laiXe,
    });
  sections.push({
    title: `Cập nhật đơn của tôi (${cuaToi.length})`,
    hint: "Đơn bạn tạo vừa được duyệt / điều xe / từ chối.",
    rows: cuaToi,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <h1 className="text-lg font-semibold">Thông báo</h1>
      {sections.map((sec) => (
        <section key={sec.title} className="flex flex-col gap-2">
          <div>
            <h2 className="text-sm font-semibold">{sec.title}</h2>
            <p className="text-xs text-muted">{sec.hint}</p>
          </div>
          {sec.rows.length === 0 ? (
            <p className="text-sm text-muted">Không có.</p>
          ) : (
            sec.rows.map((b) => <BookingCard key={b.id} b={b} />)
          )}
        </section>
      ))}
    </div>
  );
}
