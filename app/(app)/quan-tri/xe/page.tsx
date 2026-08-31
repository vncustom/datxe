import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { toggleVehicleActiveAction } from "@/app/(app)/_actions/admin";

const km = (n: number) => n.toLocaleString("vi-VN");

export default async function QuanTriXePage() {
  const s = await requireSession();
  if (!isAdmin(s))
    return <p className="text-sm text-muted">Trang này dành cho Quản trị.</p>;

  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Quản trị — xe</h1>
        <Link href="/quan-tri" className="text-sm text-muted hover:text-foreground">
          ← Người dùng
        </Link>
        <Link
          href="/quan-tri/xe/moi"
          className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Thêm xe
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="px-3 py-2">Xe</th>
              <th className="px-3 py-2">Biển số</th>
              <th className="px-3 py-2 text-right">Số chỗ</th>
              <th className="px-3 py-2 text-right">Số km</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr
                key={v.id}
                className={`border-b border-line last:border-0 ${
                  !v.isActive ? "opacity-50" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/quan-tri/xe/${v.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {v.name}
                  </Link>
                  {v.note ? (
                    <span className="ml-1 text-xs text-muted">· {v.note}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{v.plateNo}</td>
                <td className="px-3 py-2 text-right tabular-nums">{v.seats}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {km(v.currentOdometer)}
                </td>
                <td className="px-3 py-2 text-right">
                  <form action={toggleVehicleActiveAction} className="inline">
                    <input type="hidden" name="id" value={v.id} />
                    <button className="text-xs text-muted hover:text-foreground">
                      {v.isActive ? "ngừng dùng" : "dùng lại"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
