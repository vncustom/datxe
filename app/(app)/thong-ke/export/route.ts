import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDoiXe, isAdmin } from "@/lib/rbac";
import { parseRange, getDriverStats, getVehicleStats } from "@/lib/stats";

export const runtime = "nodejs";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number)[][]): string {
  // BOM để Excel nhận UTF-8; phân tách bằng ';' (chuẩn Excel VI)
  return "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  if (!(isDoiXe(s) || s.role === "ban_tgd" || isAdmin(s)))
    return new Response("Forbidden", { status: 403 });

  const range = parseRange(req.nextUrl.searchParams);
  const bang = req.nextUrl.searchParams.get("bang") ?? "lai-xe";

  let rows: (string | number)[][];
  let name: string;

  if (bang === "xe") {
    const v = await getVehicleStats(range);
    rows = [
      ["Xe", "Biển số", "Số chuyến", "Km theo chuyến", "Km theo công-tơ-mét", "Km chưa giải trình", "Số km hiện tại"],
      ...v.map((x) => [
        x.name,
        x.plateNo,
        x.trips,
        x.kmByTrips,
        x.odoDelta,
        x.unaccountedKm,
        x.currentOdometer,
      ]),
    ];
    name = `thong-ke-xe-${range.key}.csv`;
  } else {
    const d = await getDriverStats(range);
    rows = [
      ["Lái xe", "Số chuyến", "Chuyến phát sinh", "Tổng km", "Giờ chạy", "Km chưa giải trình"],
      ...d.map((x) => [
        x.fullName,
        x.trips,
        x.phatSinh,
        x.km,
        Number(x.hours.toFixed(1)),
        x.unaccountedKm,
      ]),
    ];
    name = `thong-ke-lai-xe-${range.key}.csv`;
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
