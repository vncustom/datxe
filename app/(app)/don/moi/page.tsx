import { requireSession } from "@/lib/auth";
import { isDoiXe } from "@/lib/rbac";
import NewBookingForm from "./NewBookingForm";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const start = typeof sp.start === "string" ? sp.start : "";

  return (
    <NewBookingForm
      defaultStart={start}
      donVi={s.dsBan ?? ""}
      canPhatSinh={s.isDriver || isDoiXe(s)}
    />
  );
}
