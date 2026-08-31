import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isAdmin, roleLabel } from "@/lib/rbac";
import { getDataQuality } from "@/lib/data-quality";
import {
  resetPasswordAction,
  toggleUserActiveAction,
} from "@/app/(app)/_actions/admin";

export default async function QuanTriPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const s = await requireSession();
  if (!isAdmin(s)) {
    return <p className="text-sm text-muted">Trang này dành cho Quản trị.</p>;
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const ban = typeof sp.ban === "string" ? sp.ban : "";
  const flag = typeof sp.flag === "string" ? sp.flag : "";

  const dq = await getDataQuality();

  const where: Record<string, unknown> = { deletedAt: null };
  if (ban) where.dsBan = ban;
  if (q)
    where.OR = [
      { username: { contains: q } },
      { fullName: { contains: q } },
    ];

  let users = await prisma.user.findMany({
    where,
    orderBy: [{ dsBan: "asc" }, { fullName: "asc" }],
    take: 500,
  });

  if (flag === "ten-trung-username") {
    const n = (x: string) => x.trim().toLowerCase();
    users = users.filter((u) => n(u.fullName) === n(u.username));
  }

  const allBans = (
    await prisma.user.findMany({
      where: { deletedAt: null, dsBan: { not: null } },
      select: { dsBan: true },
      distinct: ["dsBan"],
      orderBy: { dsBan: "asc" },
    })
  ).map((r) => r.dsBan as string);

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Quản trị — người dùng</h1>
        <Link
          href="/quan-tri/xe"
          className="text-sm text-muted hover:text-foreground"
        >
          Quản lý xe →
        </Link>
        <Link
          href="/quan-tri/user/moi"
          className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Thêm người dùng
        </Link>
      </div>

      {/* Chất lượng dữ liệu */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/quan-tri?flag=ten-trung-username"
          className="rounded-lg border border-line bg-surface p-3 hover:border-accent/50"
        >
          <div className="text-2xl font-semibold text-amber-600">
            {dq.nameEqualsUsername}
          </div>
          <div className="text-xs text-muted">
            User có họ tên trùng tên đăng nhập — cần điền tên thật
          </div>
        </Link>
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="text-2xl font-semibold text-amber-600">
            {dq.bansWithoutLeader.length}
          </div>
          <div className="text-xs text-muted">
            Đơn vị chưa có Trưởng/Phó ban:{" "}
            {dq.bansWithoutLeader.slice(0, 4).join(", ")}
            {dq.bansWithoutLeader.length > 4 ? "…" : ""}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="text-2xl font-semibold">{dq.totalActive}</div>
          <div className="text-xs text-muted">
            User đang hoạt động ({dq.usersNoPhone} chưa có SĐT)
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <form className="flex flex-wrap items-center gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm tên / tên đăng nhập"
          className="rounded-md border border-line px-3 py-1.5"
        />
        <select
          name="ban"
          defaultValue={ban}
          className="rounded-md border border-line px-2 py-1.5"
        >
          <option value="">— tất cả đơn vị —</option>
          {allBans.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-line px-3 py-1.5 hover:bg-surface-2">
          Lọc
        </button>
        {(q || ban || flag) && (
          <Link href="/quan-tri" className="text-xs text-muted underline">
            xoá lọc
          </Link>
        )}
      </form>

      <p className="text-xs text-muted">{users.length} người dùng</p>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="px-3 py-2">Họ tên</th>
              <th className="px-3 py-2">Tên đăng nhập</th>
              <th className="px-3 py-2">Vai trò</th>
              <th className="px-3 py-2">Đơn vị</th>
              <th className="px-3 py-2">SĐT</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const bad =
                u.fullName.trim().toLowerCase() ===
                u.username.trim().toLowerCase();
              return (
                <tr
                  key={u.username}
                  className={`border-b border-line last:border-0 ${
                    !u.isActive ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/quan-tri/user/${u.username}`}
                      className="font-medium hover:text-accent"
                    >
                      {u.fullName}
                    </Link>
                    {bad ? (
                      <span className="ml-1 text-[10px] text-amber-700">
                        (chưa có tên thật)
                      </span>
                    ) : null}
                    {u.isDriver ? (
                      <span className="ml-1 text-[10px] text-accent">lái xe</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                  <td className="px-3 py-2 text-xs">{roleLabel(u.role)}</td>
                  <td className="px-3 py-2 text-xs">
                    {u.dsBan}
                    {u.dsPhong ? ` / ${u.dsPhong}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">{u.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <form
                      action={resetPasswordAction}
                      className="inline"
                    >
                      <input type="hidden" name="username" value={u.username} />
                      <button
                        className="text-xs text-muted hover:text-foreground"
                        title="Đặt lại mật khẩu về 123456"
                      >
                        reset MK
                      </button>
                    </form>
                    {" · "}
                    <form action={toggleUserActiveAction} className="inline">
                      <input type="hidden" name="username" value={u.username} />
                      <button className="text-xs text-muted hover:text-foreground">
                        {u.isActive ? "khoá" : "mở"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
