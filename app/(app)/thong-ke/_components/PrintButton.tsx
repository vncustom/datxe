"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
    >
      In / Lưu PDF
    </button>
  );
}
