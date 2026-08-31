"use client";

import { useActionState } from "react";
import { createBookingAction, type FormState } from "@/app/(app)/_actions/booking";

const field = "rounded-md border border-line px-3 py-2 text-base outline-none focus:border-accent";
const labelCls = "flex flex-col gap-1.5 text-sm";
const labelText = "font-medium text-foreground";

export default function NewBookingForm({
  defaultStart,
  donVi,
  canPhatSinh,
}: {
  defaultStart: string;
  donVi: string;
  canPhatSinh: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createBookingAction,
    {},
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <h1 className="text-lg font-semibold">Đơn yêu cầu công tác</h1>

      <label className={labelCls}>
        <span className={labelText}>Đơn vị yêu cầu</span>
        <input name="donViYeuCau" defaultValue={donVi} className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className={labelText}>Thời gian bắt đầu *</span>
          <input
            name="startTime"
            type="datetime-local"
            defaultValue={defaultStart}
            required
            className={field}
          />
        </label>
        <label className={labelCls}>
          <span className={labelText}>Thời gian kết thúc</span>
          <input name="endTime" type="datetime-local" className={field} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className={labelText}>Địa điểm xuất phát</span>
          <input name="diemXuatPhat" defaultValue="HTV" className={field} />
        </label>
        <label className={labelCls}>
          <span className={labelText}>Địa điểm đến *</span>
          <input name="diemDen" required className={field} placeholder="VD: UBND TP" />
        </label>
      </div>

      <label className={labelCls}>
        <span className={labelText}>Nội dung công tác *</span>
        <textarea name="noiDung" required rows={2} className={field} placeholder="VD: quay tin tức" />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelCls}>
          <span className={labelText}>Biên tập</span>
          <input name="bienTap" className={field} />
        </label>
        <label className={labelCls}>
          <span className={labelText}>Quay phim</span>
          <input name="quayPhim" className={field} />
        </label>
        <label className={labelCls}>
          <span className={labelText}>Số người</span>
          <input name="soNguoi" type="number" min={1} className={field} />
        </label>
      </div>

      {canPhatSinh ? (
        <label className="flex items-center gap-2 text-sm">
          <input name="isPhatSinh" type="checkbox" className="h-4 w-4" />
          <span>Đơn phát sinh — bỏ qua bước Ban duyệt, chuyển thẳng cho Đội xe</span>
        </label>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Đang gửi…" : "Gửi đơn"}
        </button>
        <a
          href="/lich"
          className="rounded-md border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
        >
          Hủy
        </a>
      </div>
    </form>
  );
}
