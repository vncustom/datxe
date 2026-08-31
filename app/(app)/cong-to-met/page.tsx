import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isDoiXe, isAdmin } from "@/lib/rbac";
import { fmtDate, fmtDateTime } from "@/lib/tz";
import {
  getOdometerAlerts,
  getVehicleOdoSummaries,
  KM_DAILY_WARN,
  GAP_TOLERANCE_KM,
  type OdoAlert,
} from "@/lib/odometer";
import { setVehicleOdometerAction } from "@/app/(app)/_actions/trip";
import {
  ackOdoAlertAction,
  unackOdoAlertAction,
} from "@/app/(app)/_actions/alert";

const km = (n: number) => n.toLocaleString("vi-VN");

function alertText(a: OdoAlert) {
  return a.kind === "gap"
    ? `${km(a.km)} km chạy ngoài đơn`
    : `công-tơ-mét giảm ${km(a.km)} km (nhập sai?)`;
}

export default async function CongToMetPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const s = await requireSession();
  const canEdit = isDoiXe(s);
  if (!(canEdit || s.role === "ban_tgd" || isAdmin(s))) {
    return (
      <p className="text-sm text-muted">
        Trang này dành cho Đội xe, Ban TGĐ và Quản trị.
      </p>
    );
  }

  const sp = await searchParams;
  const showAcked = sp.daxem === "1";

  const [vehicles, allAlerts] = await Promise.all([
    getVehicleOdoSummaries(),
    getOdometerAlerts(),
  ]);
  const alerts = allAlerts.filter((a) => !a.acked);
  const ackedAlerts = allAlerts.filter((a) => a.acked);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">Công-tơ-mét</h1>
        <p className="text-sm text-muted">
          Theo dõi chỉ số từng xe. Sai số cho phép giữa 2 chuyến: {GAP_TOLERANCE_KM}{" "}
          km. Cảnh báo quãng đường 1 chuyến &gt; {km(KM_DAILY_WARN)} km.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">
          Cảnh báo km chạy ngoài đơn ({alerts.length})
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">
            Không có cảnh báo nào cần xử lý.
          </p>
        ) : (
          alerts.map((a) => (
            <div
              key={a.curId}
              className="flex flex-wrap items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-red-800">
                  {a.plateNo} · {a.vehicleName} — {alertText(a)}
                </p>
                <p className="text-red-700">
                  Chuyến trước {a.prevCode} kết thúc ở {km(a.prevOdoEnd)} →{" "}
                  <Link href={`/don/${a.curId}`} className="underline">
                    {a.curCode}
                  </Link>{" "}
                  bắt đầu ở {km(a.curOdoStart)} · {fmtDateTime(a.at)}
                </p>
              </div>
              {canEdit ? (
                <form action={ackOdoAlertAction}>
                  <input type="hidden" name="refId" value={a.curId} />
                  <button className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                    Biết rồi
                  </button>
                </form>
              ) : null}
            </div>
          ))
        )}

        {ackedAlerts.length > 0 ? (
          <div className="text-xs text-muted">
            {ackedAlerts.length} cảnh báo đã bỏ qua ·{" "}
            <Link
              href={showAcked ? "/cong-to-met" : "/cong-to-met?daxem=1"}
              className="underline"
            >
              {showAcked ? "ẩn" : "xem"}
            </Link>
          </div>
        ) : null}

        {showAcked
          ? ackedAlerts.map((a) => (
              <div
                key={a.curId}
                className="flex flex-wrap items-start gap-2 rounded-lg border border-line bg-surface-2 p-3 text-sm text-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {a.plateNo} · {a.vehicleName} — {alertText(a)}
                  </p>
                  <p>
                    {a.prevCode} ({km(a.prevOdoEnd)}) →{" "}
                    <Link href={`/don/${a.curId}`} className="underline">
                      {a.curCode}
                    </Link>{" "}
                    ({km(a.curOdoStart)}) · đã bỏ qua bởi {a.ackedBy}
                  </p>
                </div>
                {canEdit ? (
                  <form action={unackOdoAlertAction}>
                    <input type="hidden" name="refId" value={a.curId} />
                    <button className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium hover:bg-surface-2">
                      Hiện lại
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Xe</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Xe</th>
                <th className="px-3 py-2 text-right">Số km hiện tại</th>
                <th className="px-3 py-2 text-right">Chuyến 30 ngày</th>
                <th className="px-3 py-2 text-right">Km 30 ngày</th>
                <th className="px-3 py-2">Chuyến gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted">
                      {v.plateNo} · {v.seats} chỗ
                    </div>
                    {v.runningCode ? (
                      <div className="text-xs text-[#2563eb]">
                        Đang chạy: {v.runningCode}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {km(v.currentOdometer)}
                    {canEdit ? (
                      <form
                        action={setVehicleOdometerAction}
                        className="mt-1 flex items-center justify-end gap-1"
                      >
                        <input type="hidden" name="vehicleId" value={v.id} />
                        <input
                          name="odoValue"
                          inputMode="numeric"
                          placeholder="sửa"
                          className="w-24 rounded border border-line px-1.5 py-1 text-right text-xs"
                        />
                        <button className="rounded border border-line px-1.5 py-1 text-xs hover:bg-surface-2">
                          Lưu
                        </button>
                      </form>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {v.trips30d}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {km(v.km30d)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {v.lastClosed
                      ? `${v.lastClosed.code} · ${km(v.lastClosed.odoEnd)} · ${fmtDate(v.lastClosed.at)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
