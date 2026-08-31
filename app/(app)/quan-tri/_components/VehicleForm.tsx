"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveVehicleAction, type AdminState } from "@/app/(app)/_actions/admin";

const field =
  "rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent";
const lbl = "flex flex-col gap-1 text-sm";

type V = {
  id: string;
  name: string;
  plateNo: string;
  seats: number;
  currentOdometer: number;
  note: string | null;
  isActive: boolean;
};

export default function VehicleForm({
  mode,
  vehicle,
}: {
  mode: "new" | "edit";
  vehicle?: V;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    saveVehicleAction,
    {},
  );
  const v = vehicle;

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      {v ? <input type="hidden" name="id" value={v.id} /> : null}
      <h1 className="text-lg font-semibold">
        {mode === "new" ? "Thêm xe" : `Sửa: ${v?.name}`}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          <span className="font-medium">Nhãn hiệu *</span>
          <input name="name" defaultValue={v?.name} required className={field} />
        </label>
        <label className={lbl}>
          <span className="font-medium">Biển số *</span>
          <input
            name="plateNo"
            defaultValue={v?.plateNo}
            required
            className={field}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          <span className="font-medium">Số chỗ *</span>
          <input
            name="seats"
            type="number"
            min={1}
            defaultValue={v?.seats ?? 5}
            required
            className={field}
          />
        </label>
        <label className={lbl}>
          <span className="font-medium">Số km hiện tại</span>
          <input
            name="currentOdometer"
            inputMode="numeric"
            defaultValue={v?.currentOdometer ?? 0}
            className={field}
          />
        </label>
      </div>

      <label className={lbl}>
        <span className="font-medium">Ghi chú</span>
        <input name="note" defaultValue={v?.note ?? ""} className={field} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={v?.isActive ?? true}
          className="h-4 w-4"
        />
        Đang sử dụng
      </label>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <Link
          href="/quan-tri/xe"
          className="rounded-md border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
        >
          Quay lại
        </Link>
      </div>
    </form>
  );
}
