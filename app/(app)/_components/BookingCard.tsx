import Link from "next/link";
import { fmtDateTime } from "@/lib/tz";
import { StatusChip } from "./StatusChip";

export type BookingCardData = {
  id: string;
  code: string;
  status: string;
  donViYeuCau: string;
  diemXuatPhat: string;
  diemDen: string;
  startTime: Date;
  endTime: Date | null;
  noiDung: string;
  isPhatSinh: boolean;
  requester?: { fullName: string } | null;
};

export function BookingCard({
  b,
  extra,
}: {
  b: BookingCardData;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={`/don/${b.id}`}
      className="block rounded-lg border border-line bg-surface p-3 transition-colors hover:border-accent/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold">{b.code}</span>
        <StatusChip status={b.status} />
        {b.isPhatSinh ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Phát sinh
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-medium">
        {b.diemXuatPhat} → {b.diemDen}
      </p>
      <p className="text-xs text-muted">
        {fmtDateTime(b.startTime)}
        {b.endTime ? ` – ${fmtDateTime(b.endTime)}` : ""} · {b.donViYeuCau}
        {b.requester ? ` · ${b.requester.fullName}` : ""}
      </p>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">{b.noiDung}</p>
      {extra}
    </Link>
  );
}
