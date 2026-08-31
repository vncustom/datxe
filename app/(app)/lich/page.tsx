import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ACTIVE_STATUSES, statusColor, statusLabel } from "@/lib/status";
import {
  addDaysKey,
  fmtTime,
  instantFromVN,
  mondayKeyOf,
  todayKey,
  vnDateKey,
  vnParts,
  weekdayLabel,
  vnWeekday,
} from "@/lib/tz";

const HOUR_START = 5;
const HOUR_END = 22;
const PX_PER_HOUR = 46;

type Item = {
  id: string;
  code: string;
  status: string;
  diemDen: string;
  startFloat: number;
  endFloat: number;
  startTime: Date;
  endTime: Date | null;
  lane: number;
  lanes: number;
};

function packLanes(items: Omit<Item, "lane" | "lanes">[]): Item[] {
  const sorted = [...items].sort((a, b) => a.startFloat - b.startFloat);
  const laneEnds: number[] = [];
  const withLane = sorted.map((it) => {
    let lane = laneEnds.findIndex((end) => end <= it.startFloat + 0.001);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.endFloat);
    } else {
      laneEnds[lane] = it.endFloat;
    }
    return { ...it, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  return withLane.map((it) => ({ ...it, lanes }));
}

export default async function LichPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  await requireSession();
  const sp = await searchParams;
  const anchor = typeof sp.tuan === "string" ? sp.tuan : todayKey();
  const monday = mondayKeyOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
  const rangeStart = instantFromVN(monday, "00:00");
  const rangeEnd = instantFromVN(addDaysKey(monday, 7), "00:00");
  const today = todayKey();

  const bookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: { in: ACTIVE_STATUSES },
      startTime: { gte: rangeStart, lt: rangeEnd },
    },
    select: {
      id: true,
      code: true,
      status: true,
      diemDen: true,
      startTime: true,
      endTime: true,
    },
  });

  const byDay = new Map<string, Item[]>();
  for (const d of days) byDay.set(d, []);
  for (const bk of bookings) {
    const key = vnDateKey(bk.startTime);
    if (!byDay.has(key)) continue;
    const sp0 = vnParts(bk.startTime);
    const startFloat = sp0.hour + sp0.minute / 60;
    let endFloat: number;
    if (bk.endTime && vnDateKey(bk.endTime) === key) {
      const ep = vnParts(bk.endTime);
      endFloat = ep.hour + ep.minute / 60;
    } else {
      endFloat = startFloat + 2;
    }
    byDay.get(key)!.push({
      id: bk.id,
      code: bk.code,
      status: bk.status,
      diemDen: bk.diemDen,
      startFloat,
      endFloat: Math.max(endFloat, startFloat + 0.5),
      startTime: bk.startTime,
      endTime: bk.endTime,
      lane: 0,
      lanes: 1,
    });
  }

  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => HOUR_START + i,
  );
  const gridHeight = (HOUR_END - HOUR_START) * PX_PER_HOUR;

  const prevWeek = addDaysKey(monday, -7);
  const nextWeek = addDaysKey(monday, 7);
  const mondayLabel = `${vnParts(rangeStart).day}/${vnParts(rangeStart).month}`;
  const sundayInstant = instantFromVN(days[6], "00:00");
  const sundayLabel = `${vnParts(sundayInstant).day}/${vnParts(sundayInstant).month}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Lịch xe</h1>
        <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-0.5 text-sm">
          <Link href={`/lich?tuan=${prevWeek}`} className="rounded px-2 py-1 hover:bg-surface-2">
            ‹
          </Link>
          <Link href="/lich" className="rounded px-2 py-1 hover:bg-surface-2">
            Tuần này
          </Link>
          <Link href={`/lich?tuan=${nextWeek}`} className="rounded px-2 py-1 hover:bg-surface-2">
            ›
          </Link>
        </div>
        <span className="text-sm text-muted">
          {mondayLabel} – {sundayLabel}
        </span>
        <Link
          href="/don/moi"
          className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Đặt xe
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <div className="grid min-w-[720px] grid-cols-[3rem_repeat(7,1fr)]">
          {/* header row */}
          <div className="border-b border-line" />
          {days.map((d) => {
            const inst = instantFromVN(d, "12:00");
            const wd = weekdayLabel(vnWeekday(inst));
            const p = vnParts(inst);
            const isToday = d === today;
            return (
              <div
                key={d}
                className={`border-b border-l border-line px-2 py-1.5 text-center text-xs ${
                  isToday ? "bg-accent-weak font-semibold text-accent" : "text-muted"
                }`}
              >
                {wd} · {p.day}/{p.month}
              </div>
            );
          })}

          {/* time gutter */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-muted"
                style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
              >
                {h}h
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((d) => {
            const items = packLanes(byDay.get(d) ?? []);
            return (
              <div
                key={d}
                className="relative border-l border-line"
                style={{ height: gridHeight }}
              >
                {hours.map((h) => (
                  <Link
                    key={h}
                    href={`/don/moi?start=${d}T${String(h).padStart(2, "0")}:00`}
                    className="absolute left-0 right-0 border-t border-line/70 hover:bg-accent-weak/60"
                    style={{ top: (h - HOUR_START) * PX_PER_HOUR, height: PX_PER_HOUR }}
                    aria-label={`Đặt xe ${h}h ngày ${d}`}
                  />
                ))}
                {items.map((it) => {
                  const top = (it.startFloat - HOUR_START) * PX_PER_HOUR;
                  const height = Math.max(
                    22,
                    (it.endFloat - it.startFloat) * PX_PER_HOUR - 2,
                  );
                  const w = 100 / it.lanes;
                  const c = statusColor(it.status);
                  return (
                    <Link
                      key={it.id}
                      href={`/don/${it.id}`}
                      title={`${it.code} · ${statusLabel(it.status)} · ${it.diemDen}`}
                      className="absolute overflow-hidden rounded px-1.5 py-0.5 text-[11px] leading-tight text-white shadow-sm"
                      style={{
                        top,
                        height,
                        left: `${it.lane * w}%`,
                        width: `calc(${w}% - 3px)`,
                        backgroundColor: c,
                      }}
                    >
                      <span className="block font-semibold">
                        {fmtTime(it.startTime)} {it.diemDen}
                      </span>
                      <span className="block opacity-90">{it.code}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {ACTIVE_STATUSES.map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: statusColor(st) }}
            />
            {statusLabel(st)}
          </span>
        ))}
      </div>
    </div>
  );
}
