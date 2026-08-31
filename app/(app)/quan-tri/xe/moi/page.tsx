import { requireSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import VehicleForm from "../../_components/VehicleForm";

export default async function NewVehiclePage() {
  const s = await requireSession();
  if (!isAdmin(s))
    return <p className="text-sm text-muted">Trang này dành cho Quản trị.</p>;

  return <VehicleForm mode="new" />;
}
