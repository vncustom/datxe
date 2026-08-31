"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveUserAction, type AdminState } from "@/app/(app)/_actions/admin";

const field =
  "rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent";
const lbl = "flex flex-col gap-1 text-sm";

const ROLE_OPTS: [string, string][] = [
  ["nhan_vien", "Nhân viên"],
  ["truong_ban", "Trưởng ban"],
  ["pho_ban", "Phó ban"],
  ["truong_phong", "Trưởng phòng"],
  ["pho_phong", "Phó phòng"],
  ["to_truong", "Tổ trưởng Đội xe"],
  ["to_pho", "Tổ phó Đội xe"],
  ["ban_tgd", "Ban Tổng Giám đốc"],
  ["admin", "Quản trị"],
  ["admin_datxe", "Quản trị (datxe)"],
];

type U = {
  username: string;
  fullName: string;
  role: string;
  dsBan: string | null;
  dsPhong: string | null;
  dsTo: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  isDriver: boolean;
  isActive: boolean;
};

export default function UserForm({
  mode,
  user,
  bans,
}: {
  mode: "new" | "edit";
  user?: U;
  bans: string[];
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    saveUserAction,
    {},
  );
  const u = user;

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      <h1 className="text-lg font-semibold">
        {mode === "new" ? "Thêm người dùng" : `Sửa: ${u?.fullName}`}
      </h1>

      <label className={lbl}>
        <span className="font-medium">Tên đăng nhập *</span>
        <input
          name="username"
          defaultValue={u?.username}
          readOnly={mode === "edit"}
          required
          className={`${field} ${mode === "edit" ? "bg-surface-2 text-muted" : ""}`}
        />
      </label>

      <label className={lbl}>
        <span className="font-medium">Họ tên *</span>
        <input name="fullName" defaultValue={u?.fullName} required className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          <span className="font-medium">Vai trò *</span>
          <select name="role" defaultValue={u?.role ?? "nhan_vien"} className={field}>
            {ROLE_OPTS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className={lbl}>
          <span className="font-medium">Chức danh</span>
          <input name="jobTitle" defaultValue={u?.jobTitle ?? ""} className={field} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={lbl}>
          <span className="font-medium">Đơn vị (ban)</span>
          <input
            name="dsBan"
            defaultValue={u?.dsBan ?? ""}
            list="bans"
            className={field}
          />
          <datalist id="bans">
            {bans.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>
        <label className={lbl}>
          <span className="font-medium">Phòng</span>
          <input name="dsPhong" defaultValue={u?.dsPhong ?? ""} className={field} />
        </label>
        <label className={lbl}>
          <span className="font-medium">Tổ</span>
          <input name="dsTo" defaultValue={u?.dsTo ?? ""} className={field} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={lbl}>
          <span className="font-medium">Điện thoại</span>
          <input name="phone" defaultValue={u?.phone ?? ""} className={field} />
        </label>
        <label className={lbl}>
          <span className="font-medium">Email</span>
          <input name="email" defaultValue={u?.email ?? ""} className={field} />
        </label>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            name="isDriver"
            type="checkbox"
            defaultChecked={u?.isDriver ?? false}
            className="h-4 w-4"
          />
          Là lái xe
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={u?.isActive ?? true}
            className="h-4 w-4"
          />
          Đang hoạt động
        </label>
      </div>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {mode === "new" ? (
        <p className="text-xs text-muted">Mật khẩu khởi tạo: 123456</p>
      ) : null}

      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <Link
          href="/quan-tri"
          className="rounded-md border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
        >
          Quay lại
        </Link>
      </div>
    </form>
  );
}
