// Múi giờ nghiệp vụ cố định. Việt Nam không có DST nên offset luôn +07:00.
// DB luôn lưu instant (UTC). Mọi hiển thị / nhập liệu quy đổi qua đây.

export const APP_TZ = "Asia/Ho_Chi_Minh";
const TZ_OFFSET = "+07:00";

const pad = (n: number) => String(n).padStart(2, "0");

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type VNParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** Các thành phần giờ VN của một instant. */
export function vnParts(d: Date): VNParts {
  const o: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(d)) {
    if (p.type !== "literal") o[p.type] = Number(p.value);
  }
  if (o.hour === 24) o.hour = 0;
  return o as unknown as VNParts;
}

/** "YYYY-MM-DD" theo giờ VN. */
export function vnDateKey(d: Date): string {
  const p = vnParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Instant từ ngày + giờ VN. dateKey="YYYY-MM-DD", time="HH:mm". */
export function instantFromVN(dateKey: string, time = "00:00"): Date {
  return new Date(`${dateKey}T${time}:00${TZ_OFFSET}`);
}

/** Giá trị cho <input type="datetime-local"> -> instant. */
export function fromDatetimeLocal(v: string): Date {
  return new Date(`${v}:00${TZ_OFFSET}`);
}

/** Instant -> giá trị cho <input type="datetime-local"> (giờ VN). */
export function toDatetimeLocal(d: Date): string {
  const p = vnParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

const dtFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const tFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function fmtDateTime(d: Date | null | undefined): string {
  return d ? dtFmt.format(d).replace(",", "") : "—";
}
export function fmtDate(d: Date | null | undefined): string {
  return d ? dFmt.format(d) : "—";
}
export function fmtTime(d: Date | null | undefined): string {
  return d ? tFmt.format(d) : "—";
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Thứ trong tuần (giờ VN): 0=CN … 6=T7. */
export function vnWeekday(d: Date): number {
  // 'en-US' weekday short -> map
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    weekday: "short",
  }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

export function weekdayLabel(idx: number): string {
  return WEEKDAYS[idx] ?? "";
}

/** dateKey của thứ Hai trong tuần chứa dateKey. */
export function mondayKeyOf(dateKey: string): string {
  const noon = new Date(`${dateKey}T12:00:00Z`);
  const dow = noon.getUTCDay(); // 0=CN
  const diff = dow === 0 ? -6 : 1 - dow;
  noon.setUTCDate(noon.getUTCDate() + diff);
  return noon.toISOString().slice(0, 10);
}

export function addDaysKey(dateKey: string, days: number): string {
  const noon = new Date(`${dateKey}T12:00:00Z`);
  noon.setUTCDate(noon.getUTCDate() + days);
  return noon.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return vnDateKey(new Date());
}
