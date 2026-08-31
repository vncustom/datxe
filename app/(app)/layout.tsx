import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getBadges } from "@/lib/notifications";
import { roleLabel, isBanLeader, isDoiXe, isAdmin } from "@/lib/rbac";
import NavLink from "./_components/NavLink";
import { logoutAction } from "./_actions/auth";

type Item = { href: string; label: string; badge?: number };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const s = await requireSession();
  const b = await getBadges(s);
  const bellTotal = b.duyet + b.dieuXe + b.chuyenLaiXe;

  const nav: Item[] = [{ href: "/lich", label: "Lịch xe" }];
  if (s.isDriver)
    nav.push({ href: "/chuyen-cua-toi", label: "Chuyến của tôi", badge: b.chuyenLaiXe });
  nav.push({ href: "/cua-toi", label: "Đơn của tôi", badge: b.donCuaToi });
  if (isBanLeader(s)) nav.push({ href: "/duyet", label: "Duyệt đơn", badge: b.duyet });
  if (isDoiXe(s)) nav.push({ href: "/dieu-xe", label: "Điều xe", badge: b.dieuXe });
  if (isDoiXe(s) || s.role === "ban_tgd" || isAdmin(s)) {
    nav.push({ href: "/cong-to-met", label: "Công-tơ-mét" });
    nav.push({ href: "/thong-ke", label: "Thống kê" });
  }

  return (
    <div className="min-h-full md:grid md:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="border-b border-line px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Đài Truyền hình
          </p>
          <p className="text-sm font-semibold">Đặt xe Công tác</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col">
          {nav.map((it) => (
            <NavLink key={it.href} href={it.href} label={it.label} badge={it.badge} />
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-line p-3 text-sm md:block">
          <p className="font-medium">{s.fullName}</p>
          <p className="text-xs text-muted">{roleLabel(s.role)}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur">
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/thong-bao"
              aria-label="Thông báo"
              className="relative rounded-md p-2 hover:bg-surface-2"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {bellTotal > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                  {bellTotal > 99 ? "99+" : bellTotal}
                </span>
              ) : null}
            </Link>
            <div className="text-right text-xs leading-tight">
              <p className="font-medium">{s.fullName}</p>
              <p className="text-muted">{roleLabel(s.role)}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </header>

        {s.isDriver && b.chuyenChuaDong > 0 ? (
          <Link
            href="/chuyen-cua-toi"
            className="no-print block border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
          >
            ⚠ Bạn có {b.chuyenChuaDong} chuyến đang chạy chưa đóng — nhập km về &amp;
            đóng chuyến khi hoàn thành nhiệm vụ →
          </Link>
        ) : null}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
