import { statusColor, statusLabel } from "@/lib/status";

export function StatusChip({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${c}1a`, color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {statusLabel(status)}
    </span>
  );
}
