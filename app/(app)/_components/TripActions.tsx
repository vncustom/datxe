"use client";

import { useActionState } from "react";
import {
  startTripAction,
  endTripAction,
  type TripState,
} from "@/app/(app)/_actions/trip";

const field =
  "rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent";

function Messages({ st }: { st: TripState }) {
  return (
    <>
      {st.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {st.error}
        </p>
      ) : null}
      {st.warn ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ {st.warn}
        </p>
      ) : null}
      {st.ok ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {st.ok}
        </p>
      ) : null}
    </>
  );
}

export function StartTripForm({
  bookingId,
  expectedOdo,
  defaultGio,
}: {
  bookingId: string;
  expectedOdo: number;
  defaultGio: string;
}) {
  const [st, action, pending] = useActionState<TripState, FormData>(
    startTripAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Số km lúc xuất bến *</span>
          <input
            name="odoStart"
            inputMode="numeric"
            defaultValue={expectedOdo > 0 ? String(expectedOdo) : ""}
            required
            className={field}
          />
          <span className="text-xs text-muted">
            Số km hệ thống đang ghi: {expectedOdo.toLocaleString("vi-VN")}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Thời gian xuất bến</span>
          <input
            name="gioXuatBen"
            type="datetime-local"
            defaultValue={defaultGio}
            className={field}
          />
        </label>
      </div>
      <Messages st={st} />
      <button
        disabled={pending}
        className="w-fit rounded-md bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Đang lưu…" : "Bắt đầu chuyến"}
      </button>
    </form>
  );
}

export function EndTripForm({
  bookingId,
  odoStart,
  defaultGio,
}: {
  bookingId: string;
  odoStart: number;
  defaultGio: string;
}) {
  const [st, action, pending] = useActionState<TripState, FormData>(
    endTripAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-sm text-muted">
        Số km lúc đi: <b>{odoStart.toLocaleString("vi-VN")}</b>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Số km lúc về *</span>
          <input
            name="odoEnd"
            inputMode="numeric"
            required
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Thời gian kết thúc</span>
          <input
            name="gioKetThuc"
            type="datetime-local"
            defaultValue={defaultGio}
            className={field}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Ghi chú lái xe</span>
        <input name="ghiChuLaiXe" className={field} />
      </label>
      <Messages st={st} />
      <button
        disabled={pending}
        className="w-fit rounded-md bg-[#475569] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Đang lưu…" : "Kết thúc & đóng chuyến"}
      </button>
    </form>
  );
}
