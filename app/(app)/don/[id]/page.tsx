import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canApproveFor, canCancelBooking, isDoiXe } from "@/lib/rbac";
import { STATUS } from "@/lib/status";
import { bookingInclude, findBusyInWindow } from "@/lib/bookings";
import { fmtDateTime, toDatetimeLocal } from "@/lib/tz";
import { StatusChip } from "@/app/(app)/_components/StatusChip";
import { StartTripForm, EndTripForm } from "@/app/(app)/_components/TripActions";
import {
  approveBookingAction,
  cancelBookingAction,
  dispatchBookingAction,
} from "@/app/(app)/_actions/booking";
import { adjustTripAction } from "@/app/(app)/_actions/trip";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

const inputCls =
  "rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = await requireSession();
  const { id } = await params;

  const bk = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
  if (!bk || bk.deletedAt) notFound();

  const canApprove =
    canApproveFor(s, bk.donViYeuCau) && bk.status === STATUS.CHO_BAN_DUYET;
  const canDispatch = isDoiXe(s) && bk.status === STATUS.CHO_DOI_XE;
  const canCancel = canCancelBooking(s, bk);

  const isAssignedDriver = bk.dispatch?.driverUsername === s.username;
  const canLogTrip = isAssignedDriver || isDoiXe(s);
  const showStartTrip = canLogTrip && bk.status === STATUS.DA_DIEU_XE;
  const showEndTrip =
    canLogTrip &&
    bk.status === STATUS.DANG_CHAY &&
    bk.tripLog?.odoStart != null;
  const canAdjust = isDoiXe(s) && !!bk.tripLog?.daDongChuyen;

  const audits = bk.tripLog
    ? await prisma.auditLog.findMany({
        where: { entity: "trip_log", entityId: bk.id },
        orderBy: { atTime: "desc" },
      })
    : [];

  const [vehicles, drivers, busy] = await Promise.all([
    canDispatch
      ? prisma.vehicle.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canDispatch
      ? prisma.user.findMany({
          where: { isDriver: true, isActive: true, deletedAt: null },
          orderBy: { fullName: "asc" },
          select: { username: true, fullName: true },
        })
      : Promise.resolve([]),
    canDispatch
      ? findBusyInWindow(bk.startTime, bk.endTime, bk.id)
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/lich" className="text-sm text-muted hover:text-foreground">
          ← Lịch
        </Link>
        <h1 className="font-mono text-lg font-semibold">{bk.code}</h1>
        <StatusChip status={bk.status} />
        {bk.isPhatSinh ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Phát sinh
          </span>
        ) : null}
      </div>

      <section className="rounded-lg border border-line bg-surface p-4">
        <Row label="Đơn vị">{bk.donViYeuCau}</Row>
        <Row label="Người yêu cầu">
          {bk.requester.fullName}
          {bk.requester.phone ? (
            <span className="text-muted"> · {bk.requester.phone}</span>
          ) : null}
        </Row>
        <Row label="Bắt đầu">{fmtDateTime(bk.startTime)}</Row>
        <Row label="Kết thúc">{bk.endTime ? fmtDateTime(bk.endTime) : "—"}</Row>
        <Row label="Hành trình">
          {bk.diemXuatPhat} → {bk.diemDen}
        </Row>
        <Row label="Nội dung">{bk.noiDung}</Row>
        <Row label="Biên tập">{bk.bienTap ?? "—"}</Row>
        <Row label="Quay phim">{bk.quayPhim ?? "—"}</Row>
        <Row label="Số người">{bk.soNguoi ?? "—"}</Row>
      </section>

      {/* Timeline */}
      <section className="rounded-lg border border-line bg-surface p-4 text-sm">
        <h2 className="mb-2 font-semibold">Tiến trình</h2>
        <ol className="flex flex-col gap-2">
          <li>
            <span className="font-medium">Tạo đơn</span> — {bk.requester.fullName},{" "}
            {fmtDateTime(bk.createdAt)}
          </li>
          {bk.approval ? (
            <li>
              <span className="font-medium">
                Ban {bk.approval.quyetDinh === "duyet" ? "duyệt" : "từ chối"}
              </span>{" "}
              — {bk.approval.approver.fullName}, {fmtDateTime(bk.approval.decidedAt)}
              {bk.approval.ghiChu ? (
                <span className="text-muted"> · “{bk.approval.ghiChu}”</span>
              ) : null}
            </li>
          ) : null}
          {bk.dispatch ? (
            <li>
              <span className="font-medium">Điều xe</span> —{" "}
              {bk.dispatch.vehicle.name} ({bk.dispatch.vehicle.plateNo}),{" "}
              lái xe {bk.dispatch.driver.fullName}
              {bk.dispatch.driver.phone ? ` · ${bk.dispatch.driver.phone}` : ""}
              {" "}· {bk.dispatch.dispatcher.fullName},{" "}
              {fmtDateTime(bk.dispatch.dispatchedAt)}
              {bk.dispatch.ghiChuDoiXe ? (
                <span className="text-muted"> · “{bk.dispatch.ghiChuDoiXe}”</span>
              ) : null}
            </li>
          ) : null}
          {bk.tripLog?.gioXuatBen ? (
            <li>
              <span className="font-medium">Xuất bến</span> — công-tơ-mét{" "}
              {bk.tripLog.odoStart?.toLocaleString("vi-VN")},{" "}
              {fmtDateTime(bk.tripLog.gioXuatBen)}
            </li>
          ) : null}
          {bk.tripLog?.daDongChuyen ? (
            <li>
              <span className="font-medium">Về bến</span> — công-tơ-mét{" "}
              {bk.tripLog.odoEnd?.toLocaleString("vi-VN")},{" "}
              {fmtDateTime(bk.tripLog.gioKetThuc)} ·{" "}
              <b>{bk.tripLog.soKm?.toLocaleString("vi-VN")} km</b>
              {bk.tripLog.ghiChuLaiXe ? (
                <span className="text-muted"> · “{bk.tripLog.ghiChuLaiXe}”</span>
              ) : null}
            </li>
          ) : null}
        </ol>
      </section>

      {/* Nhật ký chuyến / công-tơ-mét */}
      {showStartTrip || showEndTrip || bk.tripLog ? (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-3 font-semibold">Nhật ký chuyến</h2>

          {showStartTrip ? (
            <StartTripForm
              bookingId={bk.id}
              expectedOdo={bk.dispatch?.vehicle.currentOdometer ?? 0}
              defaultGio={toDatetimeLocal(bk.startTime)}
            />
          ) : showEndTrip ? (
            <EndTripForm
              bookingId={bk.id}
              odoStart={bk.tripLog?.odoStart ?? 0}
              defaultGio={toDatetimeLocal(new Date())}
            />
          ) : bk.tripLog ? (
            <div className="text-sm">
              <Row label="Km lúc đi">
                {bk.tripLog.odoStart?.toLocaleString("vi-VN") ?? "—"}
              </Row>
              <Row label="Km lúc về">
                {bk.tripLog.odoEnd?.toLocaleString("vi-VN") ?? "—"}
              </Row>
              <Row label="Quãng đường">
                {bk.tripLog.soKm != null
                  ? `${bk.tripLog.soKm.toLocaleString("vi-VN")} km`
                  : "—"}
              </Row>
              <Row label="Xuất bến">{fmtDateTime(bk.tripLog.gioXuatBen)}</Row>
              <Row label="Kết thúc">{fmtDateTime(bk.tripLog.gioKetThuc)}</Row>
            </div>
          ) : null}

          {canAdjust ? (
            <form
              action={adjustTripAction}
              className="mt-4 flex flex-col gap-2 border-t border-line pt-3"
            >
              <p className="text-sm font-medium">Điều chỉnh số km (Đội xe)</p>
              <input type="hidden" name="bookingId" value={bk.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  name="odoStart"
                  inputMode="numeric"
                  placeholder={`Km đi (${bk.tripLog?.odoStart ?? ""})`}
                  className={inputCls}
                />
                <input
                  name="odoEnd"
                  inputMode="numeric"
                  placeholder={`Km về (${bk.tripLog?.odoEnd ?? ""})`}
                  className={inputCls}
                />
              </div>
              <input name="lyDo" placeholder="Lý do điều chỉnh" className={inputCls} />
              <button className="w-fit rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-surface-2">
                Lưu điều chỉnh
              </button>
            </form>
          ) : null}

          {audits.length > 0 ? (
            <div className="mt-3 border-t border-line pt-3 text-xs text-muted">
              <p className="font-medium text-foreground">Lịch sử điều chỉnh</p>
              <ul className="mt-1 flex flex-col gap-1">
                {audits.map((a) => (
                  <li key={a.id}>
                    {fmtDateTime(a.atTime)} · {a.byUsername} · {a.diff}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Panel duyệt Ban */}
      {canApprove ? (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-3 font-semibold">Duyệt đơn (Ban {bk.donViYeuCau})</h2>
          <form action={approveBookingAction} className="flex flex-col gap-3">
            <input type="hidden" name="bookingId" value={bk.id} />
            <textarea
              name="ghiChu"
              rows={2}
              placeholder="Ghi chú (nếu có)"
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                name="decision"
                value="duyet"
                className="rounded-md bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Duyệt
              </button>
              <button
                name="decision"
                value="tu_choi"
                className="rounded-md bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Từ chối
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Panel điều xe */}
      {canDispatch ? (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-3 font-semibold">Điều xe</h2>

          {busy.length > 0 ? (
            <div className="mb-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">
                Cảnh báo: đang bận trong khung giờ này
              </p>
              <ul className="mt-1 list-disc pl-4">
                {busy.map((r) => (
                  <li key={r.code}>
                    {r.plateNo} · {r.driverName} — {r.code} ({r.diemDen})
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                Vẫn có thể điều xe/lái xe trùng giờ nếu cần.
              </p>
            </div>
          ) : null}

          <form action={dispatchBookingAction} className="flex flex-col gap-3">
            <input type="hidden" name="bookingId" value={bk.id} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Xe</span>
              <select name="vehicleId" className={inputCls} defaultValue="">
                <option value="" disabled>
                  — chọn xe —
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.plateNo} · {v.seats} chỗ
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Lái xe</span>
              <select name="driverUsername" className={inputCls} defaultValue="">
                <option value="" disabled>
                  — chọn lái xe —
                </option>
                {drivers.map((d) => (
                  <option key={d.username} value={d.username}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              name="ghiChuDoiXe"
              rows={2}
              placeholder="Ghi chú của Đội xe (nếu có)"
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                name="decision"
                value="dieu"
                className="rounded-md bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Điều xe
              </button>
              <button
                name="decision"
                value="tu_choi"
                className="rounded-md bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Từ chối
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {canCancel ? (
        <form action={cancelBookingAction}>
          <input type="hidden" name="bookingId" value={bk.id} />
          <button className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Hủy đơn
          </button>
        </form>
      ) : null}
    </div>
  );
}
